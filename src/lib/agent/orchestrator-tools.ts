// ============================================
// orchestrator-tools.ts - Structured Output und Tool-Schemas für den Orchestrator
//
// Zweck: Definiert den JSON-Vertrag für Orchestrator-Entscheidungen
//        sowie vorbereitete Artefakt-Tool-Kontrakte für spätere Phasen.
// Verwendet von: orchestrator-prompts, langgraph-llm-adapter, group-orchestrator
// ============================================

import type { LLMTool } from '@/lib/llm/types';
import type {
  AuthorityScope,
  GroupChatParticipantRole,
  GroupObjective,
  OrchestrationMode,
  OrchestratedAgentSettings,
  ParticipantAuthority,
} from '@/modules/agents/types';

// --------------------------------------------
// Orchestrator-Actions
// Repräsentieren die steuerbaren nächsten Schritte
// des serverseitigen Gruppen-Orchestrators.
// --------------------------------------------

export type OrchestratorAction =
  | { type: 'broadcast'; prompt: string; targetAgentIds?: string[] }
  | { type: 'ask_agent'; agentId: string; question: string }
  | { type: 'ask_sub_admin'; adminId: string; task: string; scope: string }
  | { type: 'private_message'; agentId: string; message: string; reason: string }
  | { type: 'private_clarification'; agentId: string; question: string }
  | { type: 'respond'; message: string }
  | { type: 'delegate'; task: string; assignTo: string[]; delegateVia?: string }
  | {
      type: 'create_breakout';
      name: string;
      participantIds: string[];
      task: string;
      mode?: OrchestrationMode;
      reportBackTo?: string;
      autoSaveArtifacts?: boolean;
      targetFolderId?: string | null;
      maxTurns?: number;
    }
  | { type: 'synthesize'; fromResponses?: string[] }
  | {
      type: 'create_agent';
      name: string;
      role: string;
      description: string;
      icon?: string;
      color?: string;
      parentAgentId?: string;
      targetGroupId?: string;
      authority?: ParticipantAuthority;
      scope?: AuthorityScope;
      capabilities?: string[];
      settings?: OrchestratedAgentSettings;
      addToGroup: boolean;
      temporary?: boolean;
    }
  | { type: 'save_artifact'; name: string; folderId?: string; content: string }
  | { type: 'create_folder'; name: string; parentFolderId?: string }
  | { type: 'update_artifact'; documentId: string; content: string }
  | { type: 'update_objective'; objectiveId: string; updates: Partial<GroupObjective> }
  | { type: 'create_objective'; objective: Partial<GroupObjective> }
  | { type: 'change_mode'; newMode: OrchestrationMode; reasoning: string }
  | { type: 'end_session'; summary: string };

export interface OrchestratorDecision {
  reasoning: string;
  mode: OrchestrationMode;
  actions: OrchestratorAction[];
}

export interface OrchestratorValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
}

export interface OrchestratorValidationContext {
  participants?: GroupChatParticipantRole[];
  defaultTargetAgentIds?: string[];
  requestedMode?: OrchestrationMode;
  modePhase?: string;
}

// --------------------------------------------
// JSON-Schema-Beschreibung für Structured Output
// Wird als Prompt-Instruktion an das Modell übergeben.
// --------------------------------------------

export const ORCHESTRATOR_DECISION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reasoning', 'mode', 'actions'],
  properties: {
    reasoning: {
      type: 'string',
      description: 'Kurze Begründung, warum diese nächsten Schritte gewählt wurden.',
    },
    mode: {
      type: 'string',
      enum: [
        'free-discussion',
        'brainstorming',
        'debate',
        'task-delegation',
        'review',
        'synthesis',
        'planning',
      ],
    },
    actions: {
      type: 'array',
      description: 'Liste der nächsten Orchestrator-Aktionen in Ausführungsreihenfolge.',
      items: {
        type: 'object',
      },
    },
  },
} as const;

function buildEligibleParticipantIds(participants: GroupChatParticipantRole[]): string[] {
  return participants
    .filter((participant) => participant.authority !== 'observer')
    .map((participant) => participant.agentId);
}

function buildDefaultTargetAgentIds(params: OrchestratorValidationContext): string[] {
  if (params.defaultTargetAgentIds && params.defaultTargetAgentIds.length > 0) {
    return params.defaultTargetAgentIds;
  }

  return buildEligibleParticipantIds(params.participants || []);
}

function normalizeFreeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[*`"'“”‘’]/g, '')
    .replace(/^[@#]+/, '')
    .replace(/^(?:the|der|die|das)\s+/i, '')
    .replace(/[():]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,!?;:]+$/g, '')
    .trim();
}

function buildParticipantAliases(participant: GroupChatParticipantRole): string[] {
  const aliases = new Set<string>();
  const push = (value?: string) => {
    if (!value) return;
    const normalized = normalizeFreeText(value);
    if (!normalized) return;
    aliases.add(normalized);
    aliases.add(normalized.replace(/\s+/g, ''));
    aliases.add(normalized.replace(/\s+agent$/i, ''));
    aliases.add(normalized.replace(/\s+teilnehmer$/i, ''));
  };

  push(participant.agentId);
  push(participant.role);
  push(`${participant.role || participant.agentId} agent`);

  return Array.from(aliases).filter(Boolean);
}

function buildParticipantAliasMap(
  participants: GroupChatParticipantRole[],
): Map<string, string> {
  const aliasMap = new Map<string, string>();

  for (const participant of participants) {
    for (const alias of buildParticipantAliases(participant)) {
      aliasMap.set(alias, participant.agentId);
    }
  }

  return aliasMap;
}

function splitTargetCandidates(value: string): string[] {
  return value
    .split(/\s*(?:,|;|\/|\bund\b|\band\b|&|\n)\s*/i)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function coerceStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => {
        if (typeof entry === 'string') return splitTargetCandidates(entry);
        return [];
      })
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return splitTargetCandidates(value);
  }

  if (typeof value === 'number') {
    return [String(value)];
  }

  return undefined;
}

function normalizeModeValue(value: unknown): OrchestrationMode | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = normalizeFreeText(value).replace(/\s+/g, '-');
  const synonyms: Record<string, OrchestrationMode> = {
    'free-discussion': 'free-discussion',
    'discussion': 'free-discussion',
    'free-discusssion': 'free-discussion',
    'brainstorm': 'brainstorming',
    'brainstorming': 'brainstorming',
    'debate': 'debate',
    'task-delegation': 'task-delegation',
    'task-delegate': 'task-delegation',
    'delegation': 'task-delegation',
    'delegate': 'task-delegation',
    'review': 'review',
    'synthesis': 'synthesis',
    'summarize': 'synthesis',
    'summary': 'synthesis',
    'planning': 'planning',
    'plan': 'planning',
  };

  return synonyms[normalized];
}

function normalizeActionTypeValue(value: unknown): OrchestratorAction['type'] | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = normalizeFreeText(value).replace(/\s+/g, '-').replace(/_/g, '-');
  const synonyms: Record<string, OrchestratorAction['type']> = {
    'broadcast': 'broadcast',
    'ask-agent': 'ask_agent',
    'askagent': 'ask_agent',
    'ask-participant': 'ask_agent',
    'ask-sub-admin': 'ask_sub_admin',
    'asksubadmin': 'ask_sub_admin',
    'private-message': 'private_message',
    'private-clarification': 'private_clarification',
    'respond': 'respond',
    'reply': 'respond',
    'delegate': 'delegate',
    'delegation': 'delegate',
    'create-breakout': 'create_breakout',
    'breakout': 'create_breakout',
    'synthesize': 'synthesize',
    'synthesis': 'synthesize',
    'create-agent': 'create_agent',
    'save-artifact': 'save_artifact',
    'create-folder': 'create_folder',
    'update-artifact': 'update_artifact',
    'update-objective': 'update_objective',
    'create-objective': 'create_objective',
    'change-mode': 'change_mode',
    'end-session': 'end_session',
  };

  return synonyms[normalized];
}

function normalizeTargetAgentIds(
  rawValue: unknown,
  context: OrchestratorValidationContext = {},
): string[] | undefined {
  const participants = context.participants || [];
  const aliasMap = buildParticipantAliasMap(participants);
  const defaultTargetAgentIds = buildDefaultTargetAgentIds(context);
  const candidates = coerceStringArray(rawValue);
  if (!candidates || candidates.length === 0) {
    return undefined;
  }

  const allAliases = new Set([
    'all',
    'alle',
    'everyone',
    'all participants',
    'alle teilnehmer',
    'participants',
    'teilnehmer',
    'ganze gruppe',
    'entire group',
  ]);

  const resolved = new Set<string>();

  for (const candidate of candidates) {
    const normalized = normalizeFreeText(candidate);
    if (!normalized) continue;

    if (allAliases.has(normalized)) {
      defaultTargetAgentIds.forEach((agentId) => resolved.add(agentId));
      continue;
    }

    const mapped = aliasMap.get(normalized) || aliasMap.get(normalized.replace(/\s+/g, ''));
    if (mapped) {
      resolved.add(mapped);
      continue;
    }
  }

  return resolved.size > 0 ? Array.from(resolved) : undefined;
}

function normalizeActionRecord(
  action: unknown,
  context: OrchestratorValidationContext = {},
): unknown {
  if (!isRecord(action)) {
    return action;
  }

  const normalizedType = normalizeActionTypeValue(action.type) || action.type;
  const normalized: Record<string, unknown> = {
    ...action,
    type: normalizedType,
  };

  switch (normalizedType) {
    case 'respond':
      normalized.message = action.message ?? action.summary ?? action.content;
      break;
    case 'ask_agent':
      normalized.agentId = normalizeTargetAgentIds(action.agentId ?? action.targetAgentIds, context)?.[0];
      normalized.question = action.question ?? action.task ?? action.prompt ?? action.message;
      break;
    case 'ask_sub_admin':
      normalized.adminId = normalizeTargetAgentIds(action.adminId ?? action.agentId, context)?.[0];
      normalized.task = action.task ?? action.question ?? action.prompt;
      normalized.scope = action.scope ?? action.domain;
      break;
    case 'broadcast':
      normalized.prompt = action.prompt ?? action.message ?? action.question ?? action.task;
      normalized.targetAgentIds = normalizeTargetAgentIds(
        action.targetAgentIds ?? action.assignTo ?? action.agentIds ?? action.agentId,
        context,
      );
      break;
    case 'delegate':
      normalized.task = action.task ?? action.prompt ?? action.question ?? action.message;
      normalized.assignTo = normalizeTargetAgentIds(
        action.assignTo ?? action.targetAgentIds ?? action.agentIds ?? action.agentId,
        context,
      );
      normalized.delegateVia = normalizeTargetAgentIds(action.delegateVia, context)?.[0] ?? action.delegateVia;
      break;
    case 'private_message':
      normalized.agentId = normalizeTargetAgentIds(action.agentId, context)?.[0];
      normalized.message = action.message ?? action.content ?? action.question;
      normalized.reason = action.reason ?? 'Direkte Rückfrage an den User.';
      break;
    case 'private_clarification':
      normalized.agentId = normalizeTargetAgentIds(action.agentId, context)?.[0];
      normalized.question = action.question ?? action.message ?? action.prompt;
      break;
    case 'create_breakout':
      normalized.participantIds = normalizeTargetAgentIds(
        action.participantIds ?? action.assignTo ?? action.targetAgentIds,
        context,
      );
      normalized.task = action.task ?? action.prompt ?? action.question;
      normalized.mode = normalizeModeValue(action.mode) ?? action.mode;
      normalized.reportBackTo = normalizeTargetAgentIds(
        action.reportBackTo ?? action.adminId ?? action.delegateVia,
        context,
      )?.[0] ?? action.reportBackTo;
      normalized.autoSaveArtifacts = action.autoSaveArtifacts ?? action.saveArtifacts;
      normalized.targetFolderId = action.targetFolderId ?? action.folderId;
      normalized.maxTurns = typeof action.maxTurns === 'number'
        ? action.maxTurns
        : typeof action.turnLimit === 'number'
          ? action.turnLimit
          : undefined;
      break;
    case 'change_mode':
      normalized.newMode = normalizeModeValue(action.newMode) ?? action.newMode;
      normalized.reasoning = action.reasoning ?? action.message;
      break;
    case 'end_session':
      normalized.summary = action.summary ?? action.message;
      break;
    case 'create_agent':
      normalized.icon = action.icon ?? action.agentIcon;
      normalized.color = action.color ?? action.orbColor;
      normalized.parentAgentId = normalizeTargetAgentIds(action.parentAgentId, context)?.[0] ?? action.parentAgentId;
      normalized.targetGroupId = normalizeTargetAgentIds(action.targetGroupId, context)?.[0] ?? action.targetGroupId;
      normalized.capabilities = coerceStringArray(action.capabilities);
      normalized.addToGroup = typeof action.addToGroup === 'boolean'
        ? action.addToGroup
        : typeof action.joinGroup === 'boolean'
          ? action.joinGroup
          : false;
      normalized.settings = isRecord(action.settings) ? action.settings : undefined;
      break;
    default:
      break;
  }

  return normalized;
}

function normalizeDecisionRecord(
  decision: unknown,
  context: OrchestratorValidationContext = {},
): unknown {
  if (!isRecord(decision)) {
    return decision;
  }

  return {
    ...decision,
    mode: normalizeModeValue(decision.mode) ?? decision.mode,
    actions: Array.isArray(decision.actions)
      ? decision.actions.map((action) => normalizeActionRecord(action, context))
      : decision.actions,
  };
}

export function buildOrchestratorDecisionSchemaPrompt(
  context: OrchestratorValidationContext = {},
): string {
  const participantIds = (context.participants || []).map((participant) => participant.agentId);
  const defaultTargetAgentIds = buildDefaultTargetAgentIds(context);
  const requestedMode = context.requestedMode;
  const modeSpecificRules = requestedMode
    ? (() => {
        switch (requestedMode) {
          case 'brainstorming':
            return [
              `- Current requested mode: ${requestedMode}.`,
              '- Do not use a respond-only shortcut. Prefer collaborative idea collection followed by synthesize.',
              '- Good action patterns: broadcast -> synthesize, ask_agent -> ask_agent -> synthesize.',
            ];
          case 'debate':
            return [
              `- Current requested mode: ${requestedMode}.`,
              '- Do not use a respond-only shortcut. Create visible contrast between at least two perspectives.',
              '- Good action patterns: ask_agent(Pro) -> ask_agent(Contra) -> synthesize.',
            ];
          case 'task-delegation':
            return [
              `- Current requested mode: ${requestedMode}.`,
              '- Prefer delegate, ask_sub_admin, ask_agent, or broadcast before synthesize.',
              '- Do not answer only with respond if delegation/execution is still required.',
            ];
          case 'review':
            return [
              `- Current requested mode: ${requestedMode}.`,
              '- Prefer independent participant feedback before synthesize.',
              '- Do not use a respond-only shortcut unless the review is already complete.',
            ];
          case 'planning':
            return [
              `- Current requested mode: ${requestedMode}.`,
              '- Planning should gather input and usually create or update at least one objective.',
              '- Do not use a respond-only shortcut while the plan is still being formed.',
            ];
          case 'synthesis':
            return [
              `- Current requested mode: ${requestedMode}.`,
              '- Prefer synthesize or end_session when enough material already exists.',
            ];
          case 'free-discussion':
          default:
            return [
              `- Current requested mode: ${requestedMode}.`,
              '- A direct respond action is acceptable when no multi-agent step is needed.',
            ];
        }
      })()
    : [];

  return [
    'Return ONLY valid JSON with no markdown fences.',
    'Use this schema:',
    JSON.stringify(ORCHESTRATOR_DECISION_JSON_SCHEMA, null, 2),
    'Rules:',
    '- reasoning must be concise but informative.',
    '- mode must be one of the allowed orchestration modes.',
    '- actions must be an array.',
    '- Prefer actionable, minimal next steps.',
    '- If no multi-agent step is needed, use a single action of type "respond".',
    participantIds.length > 0
      ? `- Valid participant IDs for agentId/adminId/assignTo/targetAgentIds/participantIds: ${participantIds.join(', ')}`
      : '- Use only real participant IDs in all routing fields.',
    defaultTargetAgentIds.length > 0
      ? `- If you mean "all relevant participants", use exactly this array: ${JSON.stringify(defaultTargetAgentIds)}`
      : '- Never use "all" as a literal string in assignTo or targetAgentIds.',
    '- Never use role labels like "CEO" or "Browser Agent" inside agentId/adminId/assignTo/targetAgentIds. Use IDs only.',
    '- Use "private_clarification" when the user must answer a targeted question in a participant private chat.',
    '- Use "private_message" for private user-only notes that do not require a reply.',
    '- Never duplicate private content in a public respond/broadcast action.',
    '- For "create_breakout", always provide: name, participantIds, task. Optionally provide mode, reportBackTo, autoSaveArtifacts, targetFolderId, maxTurns.',
    '- For "create_agent", you may also provide icon, color, parentAgentId, targetGroupId, capabilities and a nested settings object (llmModel, systemPrompt, enabledTools, temperature, maxTokens, visualModeEnabled, humanInTheLoopTools, multimodal).',
    ...(context.modePhase ? [`- Current mode phase: ${context.modePhase}. Keep actions aligned with this phase.`] : []),
    ...modeSpecificRules,
    'Examples:',
    '- {"reasoning":"CEO entscheidet und delegiert die Ausarbeitung.","mode":"task-delegation","actions":[{"type":"delegate","task":"Analysiere Markt und liefere 3 Chancen.","assignTo":["browser","training"]},{"type":"synthesize"}]}',
    '- {"reasoning":"Alle sollen kurzen Input geben.","mode":"free-discussion","actions":[{"type":"broadcast","prompt":"Gebt je einen kurzen Vorschlag.","targetAgentIds":["browser","training"]},{"type":"synthesize"}]}',
    '- {"reasoning":"Nur eine direkte Antwort ist nötig.","mode":"free-discussion","actions":[{"type":"respond","message":"..."}]}',
    '- {"reasoning":"Nur der User kann Budgetdetails nachreichen.","mode":"planning","actions":[{"type":"private_clarification","agentId":"browser","question":"Welche Budgetgrenze soll ich fuer die Recherche beachten?"}]}',
    '- {"reasoning":"Der User braucht einen privaten Hinweis ohne Gruppenunterbrechung.","mode":"free-discussion","actions":[{"type":"private_message","agentId":"training","message":"Ich habe dir im Einzelchat die sensiblen Details abgelegt.","reason":"User-only Hinweis."}]}',
    '- {"reasoning":"Ein Teilteam soll separat arbeiten.","mode":"task-delegation","actions":[{"type":"create_breakout","name":"Kampagnen-Squad","participantIds":["browser","training"],"task":"Erarbeitet 3 Kampagnenideen.","mode":"brainstorming","reportBackTo":"owner-agent","maxTurns":4}]}',
    '- {"reasoning":"Es fehlt ein spezialisierter Sub-Agent.","mode":"planning","actions":[{"type":"create_agent","name":"Research Ops","role":"Research Specialist","description":"Sammelt Wettbewerbs- und Marktinformationen.","icon":"Search","color":"#38bdf8","parentAgentId":"owner-agent","targetGroupId":"group-1","addToGroup":true,"capabilities":["research","analysis"],"settings":{"llmModel":"gpt-4o","systemPrompt":"Du fokussierst dich auf Marktanalyse.","temperature":0.3}}]}',
  ].join('\n');
}

// --------------------------------------------
// Artefakt-Tool-Kontrakte
// Werden in Phase 2 noch nicht serverseitig vollständig
// ausgeführt, aber das Schema steht bereits stabil fest.
// --------------------------------------------

export const GROUP_ARTIFACT_TOOLS: LLMTool[] = [
  {
    type: 'function',
    function: {
      name: 'save_document',
      description: 'Speichert ein Dokument in der Gruppenbibliothek.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Dateiname des Dokuments.' },
          content: { type: 'string', description: 'Vollständiger Dokumentinhalt.' },
          folderId: { type: 'string', description: 'Optionaler Zielordner.' },
          mimeType: { type: 'string', description: 'Optionaler MIME-Type.' },
        },
        required: ['name', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_folder',
      description: 'Erstellt einen Ordner in der Gruppenbibliothek.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Ordnername.' },
          parentFolderId: { type: 'string', description: 'Optionaler Parent-Ordner.' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_document',
      description: 'Liest ein Dokument aus der Gruppenbibliothek.',
      parameters: {
        type: 'object',
        properties: {
          documentId: { type: 'string', description: 'Dokument-ID.' },
        },
        required: ['documentId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_documents',
      description: 'Listet Dokumente oder Ordner in der Gruppenbibliothek.',
      parameters: {
        type: 'object',
        properties: {
          folderId: { type: 'string', description: 'Optionaler Zielordner.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_artifact',
      description: 'Aktualisiert den Inhalt eines vorhandenen Dokuments.',
      parameters: {
        type: 'object',
        properties: {
          documentId: { type: 'string', description: 'Dokument-ID.' },
          content: { type: 'string', description: 'Neuer vollständiger Inhalt.' },
        },
        required: ['documentId', 'content'],
      },
    },
  },
];

// --------------------------------------------
// Validierungs-Helfer
// Halten Structured Output robust, ohne zusätzliche
// Runtime-Dependency für Schema-Validierung.
// --------------------------------------------

const VALID_MODES: OrchestrationMode[] = [
  'free-discussion',
  'brainstorming',
  'debate',
  'task-delegation',
  'review',
  'synthesis',
  'planning',
];

const VALID_ACTION_TYPES = new Set<OrchestratorAction['type']>([
  'broadcast',
  'ask_agent',
  'ask_sub_admin',
  'private_message',
  'private_clarification',
  'respond',
  'delegate',
  'create_breakout',
  'synthesize',
  'create_agent',
  'save_artifact',
  'create_folder',
  'update_artifact',
  'update_objective',
  'create_objective',
  'change_mode',
  'end_session',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function validateModeSpecificActions(
  requestedMode: OrchestrationMode | undefined,
  actions: OrchestratorAction[],
): string[] {
  if (!requestedMode || actions.length === 0) {
    return [];
  }

  const onlyRespondAction = actions.length === 1 && actions[0]?.type === 'respond';
  if (!onlyRespondAction) {
    return [];
  }

  if (requestedMode === 'free-discussion' || requestedMode === 'synthesis') {
    return [];
  }

  return [`Modus ${requestedMode} darf nicht nur mit einer respond-Aktion beantwortet werden.`];
}

export function validateOrchestratorAction(
  action: unknown,
  context: OrchestratorValidationContext = {},
): OrchestratorValidationResult<OrchestratorAction> {
  const normalizedAction = normalizeActionRecord(action, context);
  const errors: string[] = [];

  if (!isRecord(normalizedAction)) {
    return {
      valid: false,
      errors: ['Action ist kein Objekt.'],
    };
  }

  const type = normalizedAction.type;
  if (!hasString(type) || !VALID_ACTION_TYPES.has(type as OrchestratorAction['type'])) {
    return {
      valid: false,
      errors: ['Action.type fehlt oder ist ungültig.'],
    };
  }

  switch (type) {
    case 'respond':
      if (!hasString(normalizedAction.message)) errors.push('respond.message fehlt.');
      break;
    case 'ask_agent':
      if (!hasString(normalizedAction.agentId)) errors.push('ask_agent.agentId fehlt.');
      if (!hasString(normalizedAction.question)) errors.push('ask_agent.question fehlt.');
      break;
    case 'broadcast':
      if (!hasString(normalizedAction.prompt)) errors.push('broadcast.prompt fehlt.');
      if (normalizedAction.targetAgentIds !== undefined && !hasStringArray(normalizedAction.targetAgentIds)) {
        errors.push('broadcast.targetAgentIds muss ein String-Array sein.');
      }
      break;
    case 'delegate':
      if (!hasString(normalizedAction.task)) errors.push('delegate.task fehlt.');
      if (!hasStringArray(normalizedAction.assignTo)) errors.push('delegate.assignTo muss ein String-Array sein.');
      break;
    case 'synthesize':
      if (normalizedAction.fromResponses !== undefined && !hasStringArray(normalizedAction.fromResponses)) {
        errors.push('synthesize.fromResponses muss ein String-Array sein.');
      }
      break;
    case 'change_mode':
      if (!hasString(normalizedAction.newMode) || !VALID_MODES.includes(normalizedAction.newMode as OrchestrationMode)) {
        errors.push('change_mode.newMode ist ungültig.');
      }
      if (!hasString(normalizedAction.reasoning)) errors.push('change_mode.reasoning fehlt.');
      break;
    case 'end_session':
      if (!hasString(normalizedAction.summary)) errors.push('end_session.summary fehlt.');
      break;
    case 'ask_sub_admin':
      if (!hasString(normalizedAction.adminId)) errors.push('ask_sub_admin.adminId fehlt.');
      if (!hasString(normalizedAction.task)) errors.push('ask_sub_admin.task fehlt.');
      if (!hasString(normalizedAction.scope)) errors.push('ask_sub_admin.scope fehlt.');
      break;
    case 'private_message':
      if (!hasString(normalizedAction.agentId)) errors.push('private_message.agentId fehlt.');
      if (!hasString(normalizedAction.message)) errors.push('private_message.message fehlt.');
      if (!hasString(normalizedAction.reason)) errors.push('private_message.reason fehlt.');
      break;
    case 'private_clarification':
      if (!hasString(normalizedAction.agentId)) errors.push('private_clarification.agentId fehlt.');
      if (!hasString(normalizedAction.question)) errors.push('private_clarification.question fehlt.');
      break;
    case 'create_breakout':
      if (!hasString(normalizedAction.name)) errors.push('create_breakout.name fehlt.');
      if (!hasString(normalizedAction.task)) errors.push('create_breakout.task fehlt.');
      if (!hasStringArray(normalizedAction.participantIds)) {
        errors.push('create_breakout.participantIds muss ein String-Array sein.');
      }
      if (
        normalizedAction.mode !== undefined
        && (!hasString(normalizedAction.mode) || !VALID_MODES.includes(normalizedAction.mode as OrchestrationMode))
      ) {
        errors.push('create_breakout.mode ist ungültig.');
      }
      break;
    case 'create_agent':
      if (!hasString(normalizedAction.name)) errors.push('create_agent.name fehlt.');
      if (!hasString(normalizedAction.role)) errors.push('create_agent.role fehlt.');
      if (!hasString(normalizedAction.description)) errors.push('create_agent.description fehlt.');
      if (typeof normalizedAction.addToGroup !== 'boolean') errors.push('create_agent.addToGroup fehlt.');
      break;
    case 'save_artifact':
      if (!hasString(normalizedAction.name)) errors.push('save_artifact.name fehlt.');
      if (!hasString(normalizedAction.content)) errors.push('save_artifact.content fehlt.');
      break;
    case 'create_folder':
      if (!hasString(normalizedAction.name)) errors.push('create_folder.name fehlt.');
      break;
    case 'update_artifact':
      if (!hasString(normalizedAction.documentId)) errors.push('update_artifact.documentId fehlt.');
      if (!hasString(normalizedAction.content)) errors.push('update_artifact.content fehlt.');
      break;
    case 'update_objective':
      if (!hasString(normalizedAction.objectiveId)) errors.push('update_objective.objectiveId fehlt.');
      if (!isRecord(normalizedAction.updates)) errors.push('update_objective.updates fehlt.');
      break;
    case 'create_objective':
      if (!isRecord(normalizedAction.objective)) errors.push('create_objective.objective fehlt.');
      break;
    default:
      break;
  }

  return {
    valid: errors.length === 0,
    data: errors.length === 0 ? (normalizedAction as OrchestratorAction) : undefined,
    errors,
  };
}

export function validateOrchestratorDecision(
  decision: unknown,
  context: OrchestratorValidationContext = {},
): OrchestratorValidationResult<OrchestratorDecision> {
  const normalizedDecision = normalizeDecisionRecord(decision, context);
  const errors: string[] = [];

  if (!isRecord(normalizedDecision)) {
    return {
      valid: false,
      errors: ['Decision ist kein Objekt.'],
    };
  }

  if (!hasString(normalizedDecision.reasoning)) {
    errors.push('Decision.reasoning fehlt.');
  }

  if (!hasString(normalizedDecision.mode) || !VALID_MODES.includes(normalizedDecision.mode as OrchestrationMode)) {
    errors.push('Decision.mode ist ungültig.');
  }

  if (!Array.isArray(normalizedDecision.actions)) {
    errors.push('Decision.actions muss ein Array sein.');
  }

  const parsedActions: OrchestratorAction[] = [];
  if (Array.isArray(normalizedDecision.actions)) {
    normalizedDecision.actions.forEach((action, index) => {
      const result = validateOrchestratorAction(action, context);
      if (!result.valid || !result.data) {
        errors.push(`Action ${index}: ${result.errors.join(' ')}`);
        return;
      }
      parsedActions.push(result.data);
    });
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  errors.push(...validateModeSpecificActions(
    context.requestedMode,
    parsedActions,
  ));

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    data: {
      reasoning: normalizedDecision.reasoning as string,
      mode: normalizedDecision.mode as OrchestrationMode,
      actions: parsedActions,
    },
    errors: [],
  };
}

export function buildOrchestratorDecisionValidator(
  context: OrchestratorValidationContext = {},
) {
  return (decision: unknown) => validateOrchestratorDecision(decision, context);
}
