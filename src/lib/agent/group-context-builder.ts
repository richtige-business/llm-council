// ============================================
// group-context-builder.ts - Gemeinsame Prompt-Builder für Gruppenkontext
//
// Zweck: Konsolidiert die bisher duplizierten Prompt-Bausteine
//        für Gruppenkontext und Teilnehmerrollen in einer Quelle.
// Verwendet von: /api/agent, /api/agent/stream, group-orchestrator
// ============================================

// --------------------------------------------
// Payload-Typen für Group-/Participant-Context
// Halten die Builder lose gekoppelt, damit bestehende
// und künftige Routen dieselbe API nutzen können.
// --------------------------------------------

export interface GroupContextPromptInput {
  groupId?: string;
  parentGroupId?: string;
  rootGroupId?: string;
  groupName?: string;
  groupDescription?: string;
  participantRoles?: Array<Record<string, unknown>>;
  conversationParticipants?: Array<Record<string, unknown>>;
  breakoutSessions?: Array<Record<string, unknown>>;
  folders?: Array<Record<string, unknown>>;
  fileFolders?: Array<Record<string, unknown>>;
  files?: Array<Record<string, unknown>>;
  privateThreads?: Array<Record<string, unknown>>;
}

export interface ParticipantContextPromptInput {
  agentId?: string;
  agentName?: string;
  agentRole?: string;
  groupName?: string;
  otherParticipants?: Array<Record<string, unknown>>;
  wasDirectlyMentioned?: boolean;
  wasAddressedByParticipant?: boolean;
  addressedByParticipantName?: string;
  isDiscussion?: boolean;
  isDirectChat?: boolean;
  activeMode?: string;
  modePhase?: string;
}

// --------------------------------------------
// Hilfsfunktionen für defensive Payload-Normalisierung
// --------------------------------------------

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// --------------------------------------------
// Gruppenkontext als request-spezifischen Promptblock bauen
// Nur für den aktuellen Gruppen-Scope gültig
// --------------------------------------------

export function buildGroupContextPromptBlock(groupContext: unknown): string {
  if (!groupContext || typeof groupContext !== 'object') {
    return '';
  }

  const data = groupContext as GroupContextPromptInput;
  const groupName = String(data.groupName || 'Gruppe');
  const groupDescription = String(data.groupDescription || '');
  const participantRoles = asArray(data.participantRoles);
  const conversationParticipants = asArray(data.conversationParticipants);
  const breakoutSessions = asArray(data.breakoutSessions);
  const folders = asArray(data.folders);
  const fileFolders = asArray(data.fileFolders);
  const files = asArray(data.files);
  const privateThreads = asArray(data.privateThreads);

  const summarizeParticipants = (list: unknown[]): string =>
    list
      .slice(0, 30)
      .map((entry) => {
        const item = asRecord(entry);
        return `- ${String(item.agentId || 'unknown')}: ${String(item.role || 'ohne Rolle')}`;
      })
      .join('\n');

  const foldersBlock = folders
    .slice(0, 30)
    .map((entry) => {
      const folder = asRecord(entry);
      return `- ${String(folder.name || 'Ordner')} (scope=${String(folder.groupScopeId || 'n/a')})`;
    })
    .join('\n');

  const fileFoldersBlock = fileFolders
    .slice(0, 30)
    .map((entry) => {
      const folder = asRecord(entry);
      return `- ${String(folder.name || 'Dateiordner')} (group=${String(folder.groupId || 'n/a')})`;
    })
    .join('\n');

  const filesBlock = files
    .slice(0, 50)
    .map((entry) => {
      const file = asRecord(entry);
      const preview = String(file.contentPreview || '').slice(0, 300);
      const previewSuffix = preview ? ` | Preview: ${preview}` : '';
      return `- ${String(file.name || 'Datei')} (${String(file.type || 'unknown')}, ${String(file.size || 0)} bytes)${previewSuffix}`;
    })
    .join('\n');

  const breakoutBlock = breakoutSessions
    .slice(0, 20)
    .map((entry) => {
      const breakout = asRecord(entry);
      const breakoutParticipants = Array.isArray(breakout.participantRoles)
        ? breakout.participantRoles.length
        : 0;
      return `- ${String(breakout.name || 'Breakout')} (${breakoutParticipants} Teilnehmer)`;
    })
    .join('\n');

  const privateThreadsBlock = privateThreads
    .slice(0, 12)
    .map((entry) => {
      const thread = asRecord(entry);
      const recentMessages = asArray(thread.recentMessages)
        .slice(-4)
        .map((message) => {
          const item = asRecord(message);
          const kind = String(item.privateMessageKind || 'message');
          const role = String(item.role || 'assistant');
          const label = role === 'user'
            ? 'User'
            : kind === 'clarification'
              ? 'Klärung'
              : 'Privat';
          return `    - ${label}: ${String(item.content || '').slice(0, 240)}`;
        })
        .join('\n');

      return [
        `- ${String(thread.title || thread.agentName || thread.agentId || 'Teilnehmer')}`,
        `  Agent ID: ${String(thread.agentId || 'n/a')}`,
        `  Wartet auf User-Antwort: ${thread.requiresPrivateReply ? 'ja' : 'nein'}`,
        `  Ungelesen: ${String(thread.unreadCount || 0)}`,
        recentMessages ? '  Verlauf:' : '',
        recentMessages,
      ].filter(Boolean).join('\n');
    })
    .join('\n');

  return `# Group Scoped RAG Context (strictly local)
This context is ONLY valid for the current group scope.
DO NOT treat this as global user memory.
DO NOT reuse this data outside the current group scope.
If memory.save is used, avoid storing private group-internal details globally unless the user explicitly requests it.

## Group
- Name: ${groupName}
- Description: ${groupDescription || 'keine'}
- Group ID: ${String(data.groupId || 'n/a')}
- Parent Group ID: ${String(data.parentGroupId || 'none')}
- Root Group ID: ${String(data.rootGroupId || 'n/a')}

## Participant Roles (group default)
${summarizeParticipants(participantRoles) || '- keine'}

## Participant Roles (active conversation)
${summarizeParticipants(conversationParticipants) || '- keine'}

## Breakout Sessions
${breakoutBlock || '- keine'}

## Chat Folders (group scoped)
${foldersBlock || '- keine'}

## File Folders (group scoped)
${fileFoldersBlock || '- keine'}

## Files (group scoped)
${filesBlock || '- keine'}

## Participant Private Threads (user-only channel)
${privateThreadsBlock || '- keine relevanten Privatchat-Signale'}
`;
}

// --------------------------------------------
// Teilnehmer-Prompt für Gruppenkonversationen bauen
// Der Agent antwortet strikt in seiner eigenen Rolle
// --------------------------------------------

export function buildParticipantPromptBlock(participantContext: unknown): string {
  if (!participantContext || typeof participantContext !== 'object') {
    return '';
  }

  const ctx = participantContext as ParticipantContextPromptInput;
  const agentName = String(ctx.agentName || 'Agent');
  const agentRole = String(ctx.agentRole || 'Teilnehmer');
  const groupName = String(ctx.groupName || 'Gruppe');
  const wasDirectlyMentioned = Boolean(ctx.wasDirectlyMentioned);
  const wasAddressedByParticipant = Boolean(ctx.wasAddressedByParticipant);
  const addressedByParticipantName = String(ctx.addressedByParticipantName || '');
  const isDiscussion = Boolean(ctx.isDiscussion);
  const activeMode = String(ctx.activeMode || '');
  const modePhase = String(ctx.modePhase || '');
  const otherParticipants = asArray(ctx.otherParticipants);

  const othersBlock = otherParticipants
    .map((entry) => {
      const participant = asRecord(entry);
      return `- ${String(participant.agentName || participant.agentId || 'Agent')} (${String(participant.role || 'Teilnehmer')})`;
    })
    .join('\n');

  if (isDiscussion) {
    const otherNames = otherParticipants
      .map((entry) => {
        const participant = asRecord(entry);
        return String(participant.agentName || participant.agentId || '').trim();
      })
      .filter(Boolean);
    const exampleTarget = otherNames[0] || 'Agent';
    const addressedByParticipantBlock = wasAddressedByParticipant
      ? `\n## YOU WERE JUST ADDRESSED
- Another participant explicitly addressed YOU in the latest turn${addressedByParticipantName ? `: "${addressedByParticipantName}"` : ''}.
- You are the intended next speaker.
- Unless you truly have nothing relevant to add, answer them directly now.
- Do NOT return [PASS] just because the user did not mention you.`
      : '';

    return `# YOUR IDENTITY — READ THIS CAREFULLY
You are "${agentName}".
Your name is "${agentName}". Remember this. You are NOT any of the other participants.
Your role in group "${groupName}": ${agentRole}

The other participants are: ${otherNames.join(', ') || 'keine weiteren'}
You are having a discussion WITH them. Talk TO them, not to the user who started the discussion.

Messages from other agents are shown with their sender name in the conversation history.
${addressedByParticipantBlock}

## CURRENT MODE
- Active mode: ${activeMode || 'free-discussion'}
- Current phase: ${modePhase || 'general'}

## ADDRESSING RULES — CRITICAL
- You are "${agentName}". NEVER write "@${agentName}" — that is YOUR OWN name. You cannot address yourself.
- To address another participant, write: @${exampleTarget} followed by your response.
- ONLY use names from this list: ${otherNames.join(', ') || '(keine)'}
- NEVER write "@alle" or "@everyone" — just speak without addressing anyone if you mean everyone.
- If you want to respond to the group in general, simply write your response without any @mention prefix.
- NEVER simulate another participant's reply.
- NEVER write transcript-style labels for anyone else such as "[Other Agent]:" or "Other Agent:".
- Your output must contain exactly ONE speaker: you, "${agentName}".
- If you want another participant to react, address them and then stop. Do not write their answer for them.

## CHANNEL RULES — CRITICAL
- Default channel is the GROUP CHAT.
- Use "[PRIVATE]" ONLY for content that should go ONLY to the user in the participant private chat.
- Good uses of "[PRIVATE]": missing user context, approvals only the user can give, confidential user-specific notes, short private follow-up questions.
- Do NOT move group-relevant analysis, decisions, or conclusions into "[PRIVATE]".
- If both are needed, output group content first, then a blank line, then: [PRIVATE] your private note/question.
- If you only need user clarification, output ONLY the private part: [PRIVATE] your question.
- Never include another participant's voice inside the private part.

## WHEN TO SPEAK
- Respond ONLY if you have something genuinely NEW from your perspective as "${agentRole}".
- React ONLY to points that concern your expertise or challenge your position.
- If another participant explicitly addressed YOU, treat that as a strong signal to respond now.
- If another agent was addressed by name and it's NOT you → respond with [PASS]
- It is ALWAYS better to [PASS] than to repeat, agree, summarize, or add filler.

## WHEN TO [PASS]
- You agree and have nothing new → [PASS]
- Topic is outside your domain → [PASS]
- Someone else was specifically addressed → [PASS]
- If YOU were explicitly addressed, only use [PASS] when you truly have nothing relevant to contribute.
- Your point was already made → [PASS]
- Respond with EXACTLY: [PASS] (nothing else)

## STYLE
- Talk directly to the other participants, not to "Luc" or the user.
- Be natural and concise. No filler, no pleasantries, no meta-commentary.
- Do NOT start with greetings or catchphrases.
- Disagree directly if you disagree. Explain why.
- Respond in the same language as the conversation.
- Stay in character as "${agentName}".
- Do NOT format your answer as a transcript or multi-speaker dialogue.
- Do NOT start with your own name, title, or a speaker label like "${agentName}:" or "[${agentName}]:".
- Use plain text only. No markdown headings, no bold markers like **text**, and no decorative formatting.
`;
  }

  const isDirectChat = Boolean(ctx.isDirectChat);
  if (isDirectChat) {
    return `# YOUR IDENTITY — PRIVATE CHAT
You are "${agentName}" in a private/direct conversation within the group "${groupName}".
Your role in the group: ${agentRole}

CONTEXT:
- This is a 1-on-1 conversation between you and the user.
- You are part of the group "${groupName}" with these other members:
${othersBlock || '- keine weiteren'}
- You have access to the group's shared context, files, and knowledge.
- Respond naturally and in detail — this is a private conversation, not a group chat.
- This chat is the right place for follow-up questions that only the user can answer.
- Keep private clarifications focused. The essential outcome may later be reintroduced into the group context.
- Respond in the same language as the user's message.
- Stay in character as "${agentName}" with the expertise of your role "${agentRole}".
- Never simulate messages from other participants in your answer.
- Use plain text only. Avoid markdown headings, bold markers, and decorative formatting.
`;
  }

  const directMentionNote = wasDirectlyMentioned
    ? `\nThe user is speaking DIRECTLY TO YOU. You were specifically mentioned or addressed. Respond naturally and with detail since you are the focus of this message.`
    : wasAddressedByParticipant
      ? `\nAnother participant explicitly addressed you${addressedByParticipantName ? ` (${addressedByParticipantName})` : ''}. Respond to them directly and continue the thread from your perspective.`
      : `\nOther agents may also respond after you. Build on what previous agents said — do NOT repeat their points. Add your unique perspective from your role.`;

  return `# YOUR IDENTITY IN THIS GROUP CHAT
You are "${agentName}" in the group "${groupName}".
Your role: ${agentRole}

CRITICAL INSTRUCTIONS:
- You MUST respond as "${agentName}" with the perspective and expertise of your role "${agentRole}".${directMentionNote}
- Give a substantive, in-character response. Explain your perspective with reasoning and examples.
- If other agents have already responded, acknowledge or build on their points — agree, disagree, or add a new angle. Do NOT repeat what they already said.
- Stay in character. Do not break the fourth wall.
- Respond in the same language as the user's message.
- Never write lines for other participants such as "[Training Agent]:" or "Training Agent:".
- Never produce a multi-speaker transcript. Your answer must only contain your own voice as "${agentName}".
- Do not start with your own name or role as a speaker label.
- Use plain text only. Avoid markdown headings, bold markers, and decorative formatting.
- Group-relevant content belongs in the main response.
- If you need something ONLY from the user, append a private segment using: [PRIVATE] your short private note or question.
- Never hide core reasoning or decisions inside [PRIVATE].

## Other participants in this group:
${othersBlock || '- keine weiteren'}
`;
}
