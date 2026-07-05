// ============================================
// council-runtime.ts - Hilfsfunktionen fuer Council-Orchestrierung
//
// Zweck: Kapselt Prompt-Aufbau, Modell-Aufloesung,
//        anonymisierte Review-Daten und API-Aufrufe fuer
//        den Council-Deliberation-Flow.
// Verwendet von: store.ts
// ============================================

import type { LLMProvider } from '@/lib/llm/types';
import { normalizeOpenRouterModelId } from '@/lib/llm/model-catalog';
import type {
  AttachedFile,
  AttachedImage,
  ChatMessageData,
  CouncilSeatMemberData,
} from './types';
import { resolveActiveSkillIds } from './skills-catalog';

// --------------------------------------------
// API-Nachricht fuer die Agent-Route
// Reduziert auf das Format das /api/agent erwartet
// --------------------------------------------

export interface CouncilApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

// --------------------------------------------
// Finale Council-Praefixzeile
// Die Eldest-Antwort beginnt konsistent mit dieser
// sichtbaren Einleitung im Main-Feed.
// --------------------------------------------

export const COUNCIL_FINAL_RESPONSE_PREFIX = 'The council has decided:';

function getCouncilLanguageInstruction(): string {
  return 'Write in English by default. If the user clearly writes in another language, respond in that language instead.';
}

// --------------------------------------------
// Antwort-Zuordnung fuer anonymisierte Reviews
// --------------------------------------------

export interface CouncilAnonymizedOpinion {
  label: string;
  seatId: string;
  memberName: string;
  content: string;
}

// --------------------------------------------
// Modell -> Provider aufloesen
// Council-Seats speichern aktuell nur das Modell,
// nicht explizit den Provider.
// --------------------------------------------

export function resolveCouncilProvider(modelId: string): LLMProvider {
  const normalizedModel = normalizeOpenRouterModelId(modelId);
  return normalizedModel.includes('/') ? 'openai' : 'anthropic';
}

// --------------------------------------------
// Anhaenge fuer den Prompt serialisieren
// Gleiche Idee wie im normalen Agents-Chat, aber
// deutlich kompakter fuer Council-Runs.
// --------------------------------------------

export function serializeCouncilPrompt(
  prompt: string,
  images?: AttachedImage[],
  files?: AttachedFile[],
): string {
  const imageLines = (images || []).map(
    (image) => `- Image: ${image.name} (${image.type}, ${image.size} bytes)`
  );

  const fileLines = (files || []).map((file) => {
    const extractedContent = file.content?.trim();
    if (extractedContent) {
      return `- File: ${file.name}\n  Content: ${extractedContent.slice(0, 1200)}`;
    }

    return `- File: ${file.name} (${file.type}, ${file.size} bytes)`;
  });

  if (imageLines.length === 0 && fileLines.length === 0) {
    return prompt.trim();
  }

  return [
    prompt.trim(),
    '',
    '[Council attachments]',
    ...imageLines,
    ...fileLines,
  ].join('\n');
}

// --------------------------------------------
// Oeffentliche Council-Nachrichten fuer API mappen
// Nur User- und Assistant-Nachrichten sind relevant.
// System-Notizen werden ausgefiltert.
// --------------------------------------------

export function mapCouncilMessagesForApi(
  messages: ChatMessageData[],
): CouncilApiMessage[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }));
}

// --------------------------------------------
// First-Opinion-Systemprompt
// Jeder Seat antwortet zuerst unabhaengig und nur
// aus seiner Persona / Rolle heraus.
// --------------------------------------------

export function buildCouncilFirstOpinionSystemPrompt(
  member: CouncilSeatMemberData,
  councilName: string,
  otherMembers: CouncilSeatMemberData[],
): string {
  const otherMembersBlock = otherMembers.length > 0
    ? otherMembers
        .map((entry) => `- ${entry.name} (${entry.role || 'Council Member'})`)
        .join('\n')
    : '- no other members';

  const skillsNote = resolveActiveSkillIds(member.skills).length > 0
    ? '\n- You can use the web_search tool if you need current or factual information you don\'t already know. Decide yourself whether a search is necessary.'
    : '';

  return `# COUNCIL STAGE 1 — FIRST OPINION
You are "${member.name}" in the council "${councilName}".
Your role: ${member.role || 'Council Member'}

YOUR MANDATE:
${member.rolePrompt?.trim() || 'Answer from your role, tone, and point of view.'}

OTHER COUNCIL MEMBERS:
${otherMembersBlock}

RULES:
- Give your first independent take on the user's prompt.
- Do not answer as a neutral assistant; stay in character.
- Do not mention a review phase or the "council process".
- Do not judge the other members yet.
- ${getCouncilLanguageInstruction()}
- Provide a clear stance, reasoning, and a recommendation when appropriate.${skillsNote}`;
}

// --------------------------------------------
// Review-Systemprompt
// Hier reviewt ein Member anonymisierte First Opinions
// der anderen Council-Mitglieder.
// --------------------------------------------

export function buildCouncilReviewSystemPrompt(
  reviewer: CouncilSeatMemberData,
  councilName: string,
): string {
  return `# COUNCIL STAGE 2 — REVIEW
You are "${reviewer.name}" in the council "${councilName}".
Your role: ${reviewer.role || 'Council Member'}

YOUR REVIEW MANDATE:
${reviewer.rolePrompt?.trim() || 'Critically evaluate the answers from your perspective.'}

RULES:
- You receive anonymized first opinions from other council members.
- Score them on accuracy, depth, nuance, and practical usefulness.
- Do not favor any persona and do not guess identities.
- ${getCouncilLanguageInstruction()}
- End with a clear ranking and name the strongest option.
- Do NOT write the final answer to the user.`;
}

// --------------------------------------------
// Final-Synthesis-Systemprompt fuer den Eldest
// Er bekommt First Opinions + Reviews und baut daraus
// die Council-Endantwort.
// --------------------------------------------

export function buildCouncilFinalSystemPrompt(
  eldest: CouncilSeatMemberData,
  councilName: string,
  otherMembers: CouncilSeatMemberData[],
): string {
  const membersBlock = otherMembers.length > 0
    ? otherMembers
        .map((entry) => `- ${entry.name} (${entry.role || 'Council Member'})`)
        .join('\n')
    : '- no other members';

  return `# COUNCIL STAGE 3 — FINAL SYNTHESIS
You are "${eldest.name}" and act as chair / eldest of the council "${councilName}".
Your role: ${eldest.role || 'Council Eldest'}

YOUR SYNTHESIS MANDATE:
${eldest.rolePrompt?.trim() || 'Merge perspectives and deliver a clear, high-quality final answer.'}

COUNCIL MEMBERS:
${membersBlock}

RULES:
- You receive first opinions and reviews from the council.
- Extract the strongest insights and drop weak, redundant, or incorrect points.
- If positions conflict in a meaningful way, name that tension briefly.
- Answer as the final council voice to the user.
- ${getCouncilLanguageInstruction()}
- Start your answer exactly with: "${COUNCIL_FINAL_RESPONSE_PREFIX}"
- Deliver a high-quality, clear, well-structured final reply.
- Mention the council process only briefly if it helps clarity.`;
}

// --------------------------------------------
// Finale Council-Antwort normalisieren
// Stellt sicher, dass der Eldest-Prefix immer vorhanden
// ist, selbst wenn das Modell ihn einmal vergisst.
// --------------------------------------------

export function ensureCouncilFinalResponsePrefix(content: string): string {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return COUNCIL_FINAL_RESPONSE_PREFIX;
  }

  if (trimmedContent.startsWith(COUNCIL_FINAL_RESPONSE_PREFIX)) {
    return trimmedContent;
  }

  return `${COUNCIL_FINAL_RESPONSE_PREFIX}\n\n${trimmedContent}`;
}

// --------------------------------------------
// First Opinions fuer die Review-Phase anonymisieren
// Der Reviewer sieht Labels statt Namen/Seat-IDs.
// --------------------------------------------

export function buildAnonymizedCouncilOpinions(
  opinions: Array<{
    seatId: string;
    memberName: string;
    content: string;
  }>,
): CouncilAnonymizedOpinion[] {
  return opinions.map((opinion, index) => ({
    label: `Response ${String.fromCharCode(65 + index)}`,
    seatId: opinion.seatId,
    memberName: opinion.memberName,
    content: opinion.content,
  }));
}

// --------------------------------------------
// Review-Userprompt
// Enthält Originalfrage plus anonymisierte Antworten.
// --------------------------------------------

export function buildCouncilReviewUserPrompt(
  originalPrompt: string,
  opinions: CouncilAnonymizedOpinion[],
): string {
  const opinionsBlock = opinions
    .map((opinion) => `${opinion.label}\n${opinion.content}`)
    .join('\n\n');

  return [
    "User's original question:",
    originalPrompt,
    '',
    'Anonymized first opinions:',
    opinionsBlock,
    '',
    'Please provide:',
    '1. A ranking of the responses',
    '2. A short rationale for each response',
    '3. Which response you consider strongest overall',
    '4. The main weakness you see in the weakest response',
  ].join('\n');
}

// --------------------------------------------
// Final-Synthesis-Userprompt
// Kombiniert First Opinions und Reviews fuer den Eldest.
// --------------------------------------------

export function buildCouncilFinalUserPrompt(
  originalPrompt: string,
  firstOpinions: Array<{
    memberName: string;
    role: string;
    content: string;
  }>,
  reviews: Array<{
    memberName: string;
    role: string;
    content: string;
  }>,
): string {
  const firstOpinionsBlock = firstOpinions
    .map((entry) => `${entry.memberName} (${entry.role || 'Council Member'})\n${entry.content}`)
    .join('\n\n');

  const reviewsBlock = reviews.length > 0
    ? reviews
        .map((entry) => `${entry.memberName} (${entry.role || 'Council Member'})\n${entry.content}`)
        .join('\n\n')
    : 'No reviews available.';

  return [
    "User's original question:",
    originalPrompt,
    '',
    'Council first opinions:',
    firstOpinionsBlock,
    '',
    'Council reviews:',
    reviewsBlock,
    '',
    'Now produce the final council answer.',
  ].join('\n');
}

// --------------------------------------------
// Schlanker Council-Call gegen /api/agent
// Nutzt Model-/Provider-/Prompt-Overrides und deaktiviert
// Tools, damit der Council wie bei Karpathy textfokussiert
// deliberiert statt Tools zu verwenden.
// --------------------------------------------

export async function executeCouncilCompletion(options: {
  messages: CouncilApiMessage[];
  moduleId?: string;
  model: string;
  systemPrompt: string;
  signal?: AbortSignal;
}): Promise<string> {
  const normalizedModel = normalizeOpenRouterModelId(options.model);

  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: options.messages,
      moduleId: options.moduleId,
      modelOverride: normalizedModel,
      providerOverride: resolveCouncilProvider(normalizedModel),
      systemPromptOverride: options.systemPrompt,
      disableTools: true,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    let details = `Council request failed (${response.status})`;

    try {
      const errorData = await response.json();
      if (errorData?.details) {
        details = String(errorData.details);
      } else if (errorData?.error) {
        details = String(errorData.error);
      }
    } catch {
      // Antwort konnte nicht als JSON gelesen werden.
    }

    throw new Error(details);
  }

  const data = await response.json();
  return String(data?.message || '').trim();
}

// --------------------------------------------
// Streaming-Variante fuer Council-Antworten
// Streamt Token fuer Token ueber /api/agent/stream und
// meldet den aktuell akkumulierten Text an den Caller.
// Bei Stream-Problemen faellt sie automatisch auf den
// nicht-streamenden Council-Call zurueck.
// --------------------------------------------

export async function executeCouncilCompletionStream(options: {
  messages: CouncilApiMessage[];
  moduleId?: string;
  model: string;
  systemPrompt: string;
  onProgress?: (content: string) => void;
  signal?: AbortSignal;
  toolIds?: string[];
}): Promise<string> {
  const normalizedModel = normalizeOpenRouterModelId(options.model);
  const hasTools = (options.toolIds?.length ?? 0) > 0;
  let response: Response;

  try {
    response = await fetch('/api/agent/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: options.messages,
        moduleId: options.moduleId,
        modelOverride: normalizedModel,
        providerOverride: resolveCouncilProvider(normalizedModel),
        systemPromptOverride: options.systemPrompt,
        disableTools: !hasTools,
        toolIds: hasTools ? options.toolIds : undefined,
      }),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error;
    }

    const fallback = await executeCouncilCompletion(options);
    options.onProgress?.(fallback);
    return fallback;
  }

  if (!response.ok || !response.body) {
    const fallback = await executeCouncilCompletion(options);
    options.onProgress?.(fallback);
    return fallback;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';
  let streamHadError = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;

        try {
          const parsed = JSON.parse(payload);
          if (parsed.token) {
            accumulated += String(parsed.token);
            options.onProgress?.(accumulated);
          }
          if (parsed.error) {
            streamHadError = true;
          }
        } catch {
          // Ungueltige SSE-Zeile ignorieren.
        }
      }
    }
  } catch (error) {
    if (options.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw error;
    }

    streamHadError = true;
  }

  if (!accumulated || streamHadError) {
    if (options.signal?.aborted) {
      throw new DOMException('Council run was aborted.', 'AbortError');
    }

    const fallback = await executeCouncilCompletion(options);
    options.onProgress?.(fallback);
    return fallback;
  }

  return accumulated.trim();
}
