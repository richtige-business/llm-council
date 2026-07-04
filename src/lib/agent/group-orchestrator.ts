// ============================================
// group-orchestrator.ts - LangGraph StateGraph für Gruppen-Orchestrierung
//
// Zweck: Stellt die serverseitige Orchestrierungs-Engine für Gruppenchats
//        bereit und ersetzt schrittweise die clientseitige Turn-Logik.
// Verwendet von: zukünftige group-orchestrate Route, Phase-2-Smoke-Tests
// ============================================

import { Annotation, END, MemorySaver, StateGraph } from '@langchain/langgraph';
import { buildSystemPrompt } from '@/lib/agent/context';
import { initializeToolRegistry } from '@/lib/agent/init-server';
import { toolRegistry } from '@/lib/agent/registry';
import { createLogger } from '@/lib/logger';
import type {
  LLMContentBlock,
  LLMMessage,
  LLMResponse,
  LLMTool,
} from '@/lib/llm/types';
import { DEFAULT_USER_ID } from '@/lib/services/user-service';
import type {
  ChatMessageData,
  GroupOrchestrateEvent,
  GroupChatParticipantRole,
  GroupObjective,
  OrchestratorTask,
  OrchestrationMode,
  ParsedAgentResponse,
} from '@/modules/agents/types';
import { buildParticipantPromptBlock } from './group-context-builder';
import {
  createLangGraphLLMAdapter,
  type LangGraphUsageSummary,
} from './langgraph-llm-adapter';
import {
  buildOrchestratorSystemPrompt,
  buildSubAdminSystemPrompt,
} from './orchestrator-prompts';
import {
  type OrchestratorAction,
  type OrchestratorDecision,
  buildOrchestratorDecisionValidator,
  buildOrchestratorDecisionSchemaPrompt,
} from './orchestrator-tools';

const log = createLogger('GroupOrchestrator');
const defaultAdapter = createLangGraphLLMAdapter();
const PRIVATE_MARKER = '[PRIVATE]';

export interface AgentResponseRecord {
  agentId: string;
  agentName: string;
  rawContent: string;
  parsed?: ParsedAgentResponse;
  status: 'completed' | 'passed' | 'error';
  error?: string;
}

export interface ArtifactRecord {
  name: string;
  content?: string;
  folderId?: string;
}

export interface PrivateMessageRecord {
  agentId: string;
  content: string;
  createdAt: number;
}

export interface ClarificationRequest {
  agentId: string;
  question: string;
  createdAt: number;
  status: 'pending';
}

export interface GroupOrchestratorInput {
  userMessage: string;
  groupId: string;
  conversationId: string;
  conversationHistory: ChatMessageData[];
  participants: GroupChatParticipantRole[];
  objectives?: GroupObjective[];
  groupContext?: unknown;
  forceMode?: OrchestrationMode;
  mentionedAgentIds?: string[];
  maxTurns?: number;
  isAborted?: boolean;
}

export type GroupOrchestratorLLMAdapter = ReturnType<typeof createLangGraphLLMAdapter>;
export type GroupOrchestratorEventHandler = (
  event: GroupOrchestrateEvent,
) => void | Promise<void>;

export interface GroupOrchestratorDependencies {
  llmAdapter?: GroupOrchestratorLLMAdapter;
  systemPromptBuilder?: typeof buildSystemPrompt;
  onEvent?: GroupOrchestratorEventHandler;
  signal?: AbortSignal;
  emitSyntheticTokens?: boolean;
}

export interface GroupGraphState extends GroupOrchestratorInput {
  objectives: GroupObjective[];
  orchestratorDecision: OrchestratorDecision | null;
  activeMode: OrchestrationMode;
  modePhase: string | null;
  modeRound: number;
  mentionedAgentIds: string[];
  actionQueue: OrchestratorAction[];
  activeAction: OrchestratorAction | null;
  agentResponses: AgentResponseRecord[];
  pendingTasks: OrchestratorTask[];
  completedTasks: OrchestratorTask[];
  breakoutsCreated: string[];
  artifactsSaved: ArtifactRecord[];
  privateMessages: PrivateMessageRecord[];
  pendingClarifications: ClarificationRequest[];
  synthesisResult: string | null;
  responseMessage: string | null;
  objectiveUpdates: Array<Partial<GroupObjective>>;
  turnCount: number;
  shouldContinue: boolean;
  events: GroupOrchestrateEvent[];
  checkpointId?: string;
  tokensUsed: number;
  costEstimate: number;
  lastError: string | null;
}

// --------------------------------------------
// LangGraph-State-Definition
// Standardwerte halten den Graph auch ohne Route stabil.
// --------------------------------------------

const overwrite = <T>(defaultValue: () => T) =>
  Annotation<T>({
    reducer: (_left, right) => right,
    default: defaultValue,
  });

const GroupGraphStateAnnotation = Annotation.Root({
  userMessage: overwrite(() => ''),
  groupId: overwrite(() => ''),
  conversationId: overwrite(() => ''),
  conversationHistory: overwrite(() => [] as ChatMessageData[]),
  participants: overwrite(() => [] as GroupChatParticipantRole[]),
  objectives: overwrite(() => [] as GroupObjective[]),
  groupContext: overwrite(() => undefined as unknown),
  forceMode: overwrite(() => undefined as OrchestrationMode | undefined),
  mentionedAgentIds: overwrite(() => [] as string[]),
  maxTurns: overwrite(() => 20),
  isAborted: overwrite(() => false),
  orchestratorDecision: overwrite(() => null as OrchestratorDecision | null),
  activeMode: overwrite(() => 'free-discussion' as OrchestrationMode),
  modePhase: overwrite(() => null as string | null),
  modeRound: overwrite(() => 0),
  actionQueue: overwrite(() => [] as OrchestratorAction[]),
  activeAction: overwrite(() => null as OrchestratorAction | null),
  agentResponses: overwrite(() => [] as AgentResponseRecord[]),
  pendingTasks: overwrite(() => [] as OrchestratorTask[]),
  completedTasks: overwrite(() => [] as OrchestratorTask[]),
  breakoutsCreated: overwrite(() => [] as string[]),
  artifactsSaved: overwrite(() => [] as ArtifactRecord[]),
  privateMessages: overwrite(() => [] as PrivateMessageRecord[]),
  pendingClarifications: overwrite(() => [] as ClarificationRequest[]),
  synthesisResult: overwrite(() => null as string | null),
  responseMessage: overwrite(() => null as string | null),
  objectiveUpdates: overwrite(() => [] as Array<Partial<GroupObjective>>),
  turnCount: overwrite(() => 0),
  shouldContinue: overwrite(() => true),
  events: overwrite(() => [] as GroupOrchestrateEvent[]),
  checkpointId: overwrite(() => undefined as string | undefined),
  tokensUsed: overwrite(() => 0),
  costEstimate: overwrite(() => 0),
  lastError: overwrite(() => null as string | null),
});

type GroupGraphStateValue = typeof GroupGraphStateAnnotation.State;

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

const MAX_TOOL_ITERATIONS = 5;
const MAX_RESULT_CHARS = 2000;
const MAX_ARRAY_ITEMS = 5;

class GroupOrchestratorAbortError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'GroupOrchestratorAbortError';
  }
}

class AsyncEventQueue<T> {
  private queue: T[] = [];
  private resolvers: Array<(result: IteratorResult<T>) => void> = [];
  private closed = false;

  push(item: T) {
    if (this.closed) {
      return;
    }

    const resolver = this.resolvers.shift();
    if (resolver) {
      resolver({ value: item, done: false });
      return;
    }

    this.queue.push(item);
  }

  close() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    while (this.resolvers.length > 0) {
      const resolver = this.resolvers.shift();
      resolver?.({ value: undefined as T, done: true });
    }
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.queue.length > 0) {
      const value = this.queue.shift()!;
      return { value, done: false };
    }

    if (this.closed) {
      return { value: undefined as T, done: true };
    }

    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }
}

function createTraceId(): string {
  return crypto.randomUUID();
}

function ensureInitialized() {
  initializeToolRegistry();
}

function sanitizeUserMessage(content: string): string {
  return `---\n${content}\n---`;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new GroupOrchestratorAbortError('User hat abgebrochen');
  }
}

async function emitGroupEvent(
  onEvent: GroupOrchestratorEventHandler | undefined,
  event: GroupOrchestrateEvent,
) {
  if (!onEvent) {
    return;
  }
  await onEvent(event);
}

function createAbortEvent(reason = 'User hat abgebrochen'): GroupOrchestrateEvent {
  return {
    type: 'orchestration_aborted',
    reason,
  };
}

function chunkTextForTokens(text: string): string[] {
  const matches = text.match(/\S+\s*|\n/g);
  if (!matches || matches.length === 0) {
    return text ? [text] : [];
  }
  return matches;
}

async function emitAgentTextTokens(params: {
  onEvent?: GroupOrchestratorEventHandler;
  signal?: AbortSignal;
  agentId: string;
  agentName: string;
  content: string;
}) {
  const tokens = chunkTextForTokens(params.content);
  for (const token of tokens) {
    throwIfAborted(params.signal);
    await emitGroupEvent(params.onEvent, {
      type: 'agent_token',
      agentId: params.agentId,
      agentName: params.agentName,
      token,
    });
  }
}

function isEmptyAssistantContent(content: LLMMessage['content']): boolean {
  if (typeof content === 'string') {
    return !content || content.trim() === '';
  }
  if (!Array.isArray(content) || content.length === 0) {
    return true;
  }
  return !content.some((block) => {
    if (block.type === 'text') return block.text.trim() !== '';
    if (block.type === 'tool_use') return true;
    return block.type === 'tool_result';
  });
}

function buildAssistantContentForToolLoop(
  llmResponse: {
    message: string;
    rawContent?: LLMContentBlock[];
    toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  },
): string | LLMContentBlock[] {
  if (llmResponse.rawContent && llmResponse.rawContent.length > 0) {
    return llmResponse.rawContent;
  }

  if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
    const blocks: LLMContentBlock[] = [];
    if (llmResponse.message && llmResponse.message.trim()) {
      blocks.push({ type: 'text', text: llmResponse.message });
    }
    for (const toolCall of llmResponse.toolCalls) {
      blocks.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.name.replace(/\./g, '_'),
        input: toolCall.input,
      });
    }
    if (blocks.length > 0) {
      return blocks;
    }
  }

  return llmResponse.message && llmResponse.message.trim()
    ? llmResponse.message
    : '(Tool-Ausführung läuft...)';
}

function truncateToolResult(result: unknown): unknown {
  if (result === null || result === undefined) return result;
  if (typeof result === 'string') {
    return result.length > MAX_RESULT_CHARS
      ? `${result.slice(0, MAX_RESULT_CHARS)} [truncated]`
      : result;
  }
  if (Array.isArray(result)) {
    return result.slice(0, MAX_ARRAY_ITEMS).map((entry) => truncateToolResult(entry));
  }
  if (typeof result === 'object') {
    const limitedEntries = Object.entries(result as Record<string, unknown>)
      .slice(0, MAX_ARRAY_ITEMS)
      .map(([key, value]) => [key, truncateToolResult(value)]);
    return Object.fromEntries(limitedEntries);
  }
  return result;
}

function appendEvent(state: GroupGraphStateValue, event: GroupOrchestrateEvent): GroupOrchestrateEvent[] {
  return [...state.events, event];
}

function createEmptyUsageSummary(): LangGraphUsageSummary {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
  };
}

function accumulateUsage(
  state: GroupGraphStateValue,
  usage: LangGraphUsageSummary,
): Pick<GroupGraphStateValue, 'tokensUsed' | 'costEstimate'> {
  return {
    tokensUsed: state.tokensUsed + usage.totalTokens,
    costEstimate: state.costEstimate + usage.estimatedCost,
  };
}

function getAdminParticipants(participants: GroupChatParticipantRole[]): GroupChatParticipantRole[] {
  return participants.filter((participant) =>
    participant.authority === 'owner' || participant.authority === 'admin');
}

function getDefaultAdmin(participants: GroupChatParticipantRole[]): GroupChatParticipantRole | null {
  const owner = participants.find((participant) => participant.authority === 'owner');
  if (owner) return owner;
  return getAdminParticipants(participants)[0] || participants[0] || null;
}

function getEligibleParticipants(participants: GroupChatParticipantRole[]): GroupChatParticipantRole[] {
  return participants.filter((participant) => participant.authority !== 'observer');
}

function resolveParticipantName(
  participants: GroupChatParticipantRole[],
  agentId: string,
): string {
  return participants.find((participant) => participant.agentId === agentId)?.role || agentId;
}

function getOrchestratorSpeaker(state: GroupGraphStateValue): {
  agentId: string;
  agentName: string;
} {
  const admin = getDefaultAdmin(state.participants);
  return {
    agentId: admin?.agentId || 'orchestrator',
    agentName: admin?.role || admin?.agentId || 'Orchestrator',
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {};
}

function addBreakoutContextToEvent(
  event: GroupOrchestrateEvent,
  breakoutId: string,
): GroupOrchestrateEvent | null {
  switch (event.type) {
    case 'agent_speaking':
    case 'agent_token':
    case 'agent_done':
    case 'agent_passed':
    case 'error':
    case 'synthesis':
    case 'orchestrator_message':
      return {
        ...event,
        breakoutId,
      };
    case 'agent_created':
      return {
        ...event,
        breakoutId,
      };
    default:
      return null;
  }
}

function mapConversationHistoryToLlmMessages(history: ChatMessageData[]): LLMMessage[] {
  return history
    .filter((message) => {
      if (message.role === 'system') {
        return false;
      }
      if (message.role === 'assistant') {
        return !isEmptyAssistantContent(message.content);
      }
      return Boolean(message.content?.trim());
    })
    .map((message) => {
      if (message.role === 'assistant') {
        const prefix = message.agentName ? `Nachricht von ${message.agentName}\n` : '';
        return {
          role: 'assistant' as const,
          content: `${prefix}${message.content}`,
        };
      }

      return {
        role: 'user' as const,
        content: sanitizeUserMessage(message.content),
      };
    });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeParticipantAlias(value: string): string {
  return value
    .toLowerCase()
    .replace(/[*`"'“”‘’[\]()]/g, ' ')
    .replace(/[@#:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildParticipantAliasesForFormatting(participant: GroupChatParticipantRole): string[] {
  const aliases = new Set<string>();
  const role = participant.role || participant.agentId;
  const normalizedRole = normalizeParticipantAlias(role);
  const normalizedAgentId = normalizeParticipantAlias(participant.agentId);

  if (normalizedRole) {
    aliases.add(normalizedRole);
  }
  if (normalizedAgentId) {
    aliases.add(normalizedAgentId);
  }

  const roleParts = role.match(/\(([^)]+)\)/g) || [];
  roleParts.forEach((entry) => {
    const normalized = normalizeParticipantAlias(entry.replace(/[()]/g, ''));
    if (normalized) {
      aliases.add(normalized);
    }
  });

  return Array.from(aliases);
}

function getPreferredMentionLabel(participant: GroupChatParticipantRole): string {
  const role = participant.role?.trim();
  if (role) {
    const bracketAlias = role.match(/\(([^)]+)\)/)?.[1]?.trim();
    if (bracketAlias) {
      return bracketAlias;
    }
    if (!role.includes(' ')) {
      return role;
    }
  }

  return participant.agentId;
}

function buildMentionAliasMap(participants: GroupChatParticipantRole[]): Map<string, string> {
  const aliasMap = new Map<string, string>();
  for (const participant of participants) {
    const mentionLabel = getPreferredMentionLabel(participant);
    for (const alias of buildParticipantAliasesForFormatting(participant)) {
      aliasMap.set(alias, mentionLabel);
    }
  }
  return aliasMap;
}

function normalizeMarkdownLikeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeLeadingSpeakerLine(
  text: string,
  participant: GroupChatParticipantRole,
): string {
  let output = text.trimStart();
  const selfLabels = [
    participant.role || participant.agentId,
    participant.agentId,
    getPreferredMentionLabel(participant),
  ].filter(Boolean);

  for (const label of selfLabels) {
    const linePattern = new RegExp(`^(?:\\[)?${escapeRegExp(label)}(?:\\])?\\s*\\n+`, 'i');
    if (linePattern.test(output)) {
      output = output.replace(linePattern, '').trimStart();
    }
  }

  return output;
}

function normalizeLeadingAddressPrefix(
  text: string,
  participant: GroupChatParticipantRole,
  participants: GroupChatParticipantRole[],
): string {
  const aliasMap = buildMentionAliasMap(participants);
  const selfAliases = new Set(buildParticipantAliasesForFormatting(participant));
  const patterns = [
    /^\[([^\]\n]{1,80})\]:\s*/,
    /^An\s+([^:\n]{1,80}):\s*/i,
    /^@([^:\n]{1,80}):\s*/,
    /^([^:\n]{1,60}):\s*/,
  ];

  let output = normalizeLeadingSpeakerLine(text, participant);

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (!match) {
      continue;
    }

    const rawLabel = match[1]?.trim();
    const normalizedLabel = normalizeParticipantAlias(rawLabel || '');
    if (!normalizedLabel) {
      continue;
    }

    if (selfAliases.has(normalizedLabel)) {
      output = output.slice(match[0].length).trimStart();
      continue;
    }

    const mentionLabel = aliasMap.get(normalizedLabel);
    if (mentionLabel) {
      output = `@${mentionLabel} ${output.slice(match[0].length).trimStart()}`;
    }

    break;
  }

  return output;
}

function normalizeParticipantRawResponse(params: {
  rawResponse: string;
  participant: GroupChatParticipantRole;
  participants: GroupChatParticipantRole[];
}): string {
  const trimmed = params.rawResponse.trim();
  if (!trimmed || trimmed === '[PASS]') {
    return trimmed;
  }

  const privateIndex = trimmed.indexOf(PRIVATE_MARKER);

  const normalizeGroupPart = (value: string) =>
    normalizeMarkdownLikeText(
      normalizeLeadingAddressPrefix(value, params.participant, params.participants),
    );
  const normalizePrivatePart = (value: string) =>
    normalizeMarkdownLikeText(
      normalizeLeadingSpeakerLine(value, params.participant),
    );

  if (privateIndex === -1) {
    return normalizeGroupPart(trimmed);
  }

  const groupPart = normalizeGroupPart(trimmed.slice(0, privateIndex));
  const privatePart = normalizePrivatePart(trimmed.slice(privateIndex + PRIVATE_MARKER.length));

  if (groupPart && privatePart) {
    return `${groupPart}\n\n${PRIVATE_MARKER} ${privatePart}`;
  }
  if (privatePart) {
    return `${PRIVATE_MARKER} ${privatePart}`;
  }
  return groupPart;
}

function normalizeNarrativeText(text: string): string {
  return normalizeMarkdownLikeText(text);
}

function parseAgentResponse(rawResponse: string): ParsedAgentResponse {
  const trimmed = rawResponse.trim();
  const idx = trimmed.indexOf(PRIVATE_MARKER);
  const isPass = trimmed === '[PASS]';

  if (idx === -1) {
    return {
      groupContent: isPass ? null : trimmed || null,
      privateContent: null,
      isPass,
    };
  }

  const groupPart = trimmed.slice(0, idx).trim();
  const privatePart = trimmed.slice(idx + PRIVATE_MARKER.length).trim();

  return {
    groupContent: groupPart || null,
    privateContent: privatePart || null,
    isPass,
  };
}

function getPublicAgentContent(record: AgentResponseRecord): string {
  if (record.status !== 'completed') {
    return '';
  }

  return record.parsed?.groupContent || '';
}

function classifyPrivateContent(params: {
  privateContent: string;
  hasGroupContent: boolean;
}): 'private_message' | 'private_clarification' {
  const normalized = params.privateContent.trim().toLowerCase();
  if (!normalized) {
    return 'private_message';
  }

  const clarificationSignals = [
    /\?$/,
    /\b(kannst du|koenntest du|bitte|brauch(?:e|en)|welch(?:e|er|es)|wann|wo|wie|wer|wieviel|gib mir|teile mir|sag mir|sage mir|nenn mir|best[aä]tige|präzisier|praezisier)\b/i,
  ];

  if (clarificationSignals.some((pattern) => pattern.test(normalized))) {
    return 'private_clarification';
  }

  if (!params.hasGroupContent && /^(ich brauche|mir fehlt|bevor ich weiter|ohne .* kann ich)/i.test(normalized)) {
    return 'private_clarification';
  }

  return 'private_message';
}

function createSafePublicTokenStreamer(
  onSafeChunk: (chunk: string) => void | Promise<void>,
): {
  consume: (chunk: string) => Promise<void>;
  flush: () => Promise<void>;
} {
  let pending = '';
  let privateMode = false;

  return {
    async consume(chunk: string) {
      if (!chunk || privateMode) {
        return;
      }

      pending += chunk;
      const markerIndex = pending.indexOf(PRIVATE_MARKER);
      if (markerIndex !== -1) {
        const publicPart = pending.slice(0, markerIndex);
        if (publicPart) {
          await onSafeChunk(publicPart);
        }
        pending = '';
        privateMode = true;
        return;
      }

      const safeLength = Math.max(0, pending.length - (PRIVATE_MARKER.length - 1));
      if (safeLength > 0) {
        const safePart = pending.slice(0, safeLength);
        pending = pending.slice(safeLength);
        if (safePart) {
          await onSafeChunk(safePart);
        }
      }
    },
    async flush() {
      if (privateMode || !pending) {
        pending = '';
        return;
      }

      const safePart = pending;
      pending = '';
      await onSafeChunk(safePart);
    },
  };
}

function buildFallbackDecision(state: GroupGraphStateValue, reason: string): OrchestratorDecision {
  return {
    reasoning: reason,
    mode: state.forceMode || state.activeMode || 'free-discussion',
    actions: [
      {
        type: 'respond',
        message: `Ich nutze einen Fallback im Modus "${state.forceMode || state.activeMode || 'free-discussion'}", weil die strukturierte Orchestrierungsentscheidung fehlgeschlagen ist.`,
      },
    ],
  };
}

function buildTerminalGuardUpdate(
  state: GroupGraphStateValue,
  reason: string,
): Partial<GroupGraphStateValue> {
  return {
    shouldContinue: false,
    responseMessage: state.responseMessage || reason,
    lastError: reason,
    events: appendEvent(state, { type: 'error', message: reason }),
  };
}

function actionToTask(action: Extract<OrchestratorAction, { type: 'delegate' }>): OrchestratorTask {
  return {
    id: `task-${crypto.randomUUID()}`,
    description: action.task,
    assignedTo: action.assignTo,
    delegatedBy: action.delegateVia || 'orchestrator',
    status: 'pending',
    createdAt: Date.now(),
  };
}

function toLlmTools(moduleId: string): LLMTool[] {
  return toolRegistry.getByModule(moduleId).map((tool) => ({
    type: 'function',
    function: {
      name: tool.id.replace(/\./g, '_'),
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.inputSchema.properties as LLMTool['function']['parameters']['properties'],
        required: tool.inputSchema.required ? [...tool.inputSchema.required] : undefined,
      },
    },
  }));
}

async function runToolLoopedCompletion(params: {
  moduleId: string;
  messages: LLMMessage[];
  system: string;
  llmAdapter?: GroupOrchestratorLLMAdapter;
  signal?: AbortSignal;
}): Promise<{
  text: string;
  response: LLMResponse;
  usage: LangGraphUsageSummary;
}> {
  throwIfAborted(params.signal);
  const traceId = createTraceId();
  const tools = toLlmTools(params.moduleId);
  const formattedMessages = params.messages;
  const llmAdapter = params.llmAdapter || defaultAdapter;

  let result = await llmAdapter.invokeText({
    moduleId: params.moduleId,
    messages: formattedMessages,
    system: params.system,
    tools: tools.length > 0 ? tools : undefined,
  });

  let totalUsage = result.usage;
  let llmResponse = result.response;
  let toolIteration = 0;

  while (
    llmResponse.stopReason === 'tool_use'
    && llmResponse.toolCalls
    && toolIteration < MAX_TOOL_ITERATIONS
  ) {
    throwIfAborted(params.signal);
    toolIteration += 1;
    const toolResults: Array<{ toolCallId: string; content: string }> = [];

    for (const toolCall of llmResponse.toolCalls) {
      throwIfAborted(params.signal);
      const toolNameForRegistry = toolRegistry.fromClaudeName(toolCall.name);
      const execution = await toolRegistry.execute(
        toolNameForRegistry,
        toolCall.input,
        {
          userId: DEFAULT_USER_ID,
          requestingModuleId: 'group-orchestrator',
          traceId,
        },
      );

      toolResults.push({
        toolCallId: toolCall.id,
        content: JSON.stringify({
          success: execution.success,
          data: truncateToolResult(execution.data),
          error: execution.error,
          message: execution.success
            ? 'Tool erfolgreich ausgeführt'
            : execution.error?.message || 'Fehler bei Tool-Ausführung',
        }),
      });
    }

    const additionalMessages: LLMMessage[] = [];
    if (toolIteration === MAX_TOOL_ITERATIONS) {
      additionalMessages.push({
        role: 'user',
        content: 'You have reached the maximum number of tool calls. Please respond with what you have so far. Do not call any more tools.',
      });
    }

    result = await llmAdapter.invokeText({
      moduleId: params.moduleId,
      messages: [
        ...formattedMessages,
        {
          role: 'assistant',
          content: buildAssistantContentForToolLoop(llmResponse),
        },
        ...additionalMessages,
      ],
      system: params.system,
      tools: toolIteration < MAX_TOOL_ITERATIONS && tools.length > 0 ? tools : undefined,
      toolResults,
    });

    totalUsage = {
      inputTokens: totalUsage.inputTokens + result.usage.inputTokens,
      outputTokens: totalUsage.outputTokens + result.usage.outputTokens,
      totalTokens: totalUsage.totalTokens + result.usage.totalTokens,
      estimatedCost: totalUsage.estimatedCost + result.usage.estimatedCost,
    };
    llmResponse = result.response;
  }

  return {
    text: result.text,
    response: result.response,
    usage: totalUsage,
  };
}

async function executeParticipantTurn(params: {
  state: GroupGraphStateValue;
  participant: GroupChatParticipantRole;
  prompt: string;
  llmAdapter?: GroupOrchestratorLLMAdapter;
  systemPromptBuilder?: typeof buildSystemPrompt;
  signal?: AbortSignal;
  onTokenChunk?: (chunk: string) => void | Promise<void>;
}): Promise<{
  record: AgentResponseRecord;
  usage: LangGraphUsageSummary;
  usedLiveStreaming: boolean;
}> {
  const { state, participant, prompt } = params;
  const llmAdapter = params.llmAdapter || defaultAdapter;
  const systemPromptBuilder = params.systemPromptBuilder || buildSystemPrompt;
  throwIfAborted(params.signal);
  const baseSystemPrompt = await systemPromptBuilder(prompt);
  const participantPrompt = buildParticipantPromptBlock({
    agentId: participant.agentId,
    agentName: participant.role || participant.agentId,
    agentRole: participant.role,
    groupName: String((state.groupContext as Record<string, unknown> | undefined)?.groupName || 'Gruppe'),
    otherParticipants: state.participants
      .filter((entry) => entry.agentId !== participant.agentId)
      .map((entry) => ({
        agentId: entry.agentId,
        agentName: entry.role || entry.agentId,
        role: entry.role,
      })),
    wasDirectlyMentioned: state.mentionedAgentIds.includes(participant.agentId),
    isDiscussion: true,
    isDirectChat: false,
    activeMode: state.activeMode,
    modePhase: state.modePhase || undefined,
  });

  const llmMessages: LLMMessage[] = [
    ...mapConversationHistoryToLlmMessages(state.conversationHistory),
    {
      role: 'user',
      content: sanitizeUserMessage(prompt),
    },
  ];
  const system = [baseSystemPrompt, participantPrompt].filter(Boolean).join('\n\n');
  const llmTools = toLlmTools(participant.agentId);

  if (llmTools.length === 0 && params.onTokenChunk) {
    let streamedText = '';
    const safeStreamer = createSafePublicTokenStreamer(params.onTokenChunk);

    for await (const chunk of llmAdapter.streamText({
      moduleId: participant.agentId,
      messages: llmMessages,
      system,
    })) {
      throwIfAborted(params.signal);
      streamedText += chunk;
      await safeStreamer.consume(chunk);
    }
    await safeStreamer.flush();

    const normalizedText = normalizeParticipantRawResponse({
      rawResponse: streamedText,
      participant,
      participants: state.participants,
    });
    const parsed = parseAgentResponse(normalizedText);
    return {
      record: {
        agentId: participant.agentId,
        agentName: participant.role || participant.agentId,
        rawContent: normalizedText,
        parsed,
        status: parsed.isPass ? 'passed' : 'completed',
      },
      usage: createEmptyUsageSummary(),
      usedLiveStreaming: true,
    };
  }

  const result = await runToolLoopedCompletion({
    moduleId: participant.agentId,
    messages: llmMessages,
    system,
    llmAdapter,
    signal: params.signal,
  });

  const normalizedText = normalizeParticipantRawResponse({
    rawResponse: result.text,
    participant,
    participants: state.participants,
  });
  const parsed = parseAgentResponse(normalizedText);

  return {
    record: {
      agentId: participant.agentId,
      agentName: participant.role || participant.agentId,
      rawContent: normalizedText,
      parsed,
      status: parsed.isPass ? 'passed' : 'completed',
    },
    usage: result.usage,
    usedLiveStreaming: false,
  };
}

function getCurrentAction(state: GroupGraphStateValue): OrchestratorAction | null {
  return state.actionQueue[0] || null;
}

interface ModeGuardrailResult {
  decision: OrchestratorDecision;
  nextPhase: string | null;
  nextRound: number;
}

function getInitialModePhase(mode: OrchestrationMode): string | null {
  switch (mode) {
    case 'brainstorming':
      return 'generate';
    case 'debate':
      return 'opening';
    case 'task-delegation':
      return 'decompose';
    case 'review':
      return 'present';
    case 'planning':
      return 'input';
    case 'synthesis':
      return 'synthesize';
    case 'free-discussion':
    default:
      return null;
  }
}

function hasActionType(
  actions: OrchestratorAction[],
  types: OrchestratorAction['type'][],
): boolean {
  return actions.some((action) => types.includes(action.type));
}

function appendActionIfMissing(
  actions: OrchestratorAction[],
  predicate: (action: OrchestratorAction) => boolean,
  fallbackAction: OrchestratorAction,
): OrchestratorAction[] {
  return actions.some(predicate) ? actions : [...actions, fallbackAction];
}

function buildEligibleNonAdminParticipantIds(state: GroupGraphStateValue): string[] {
  const adminAgent = getDefaultAdmin(state.participants);
  return getEligibleParticipants(state.participants)
    .filter((participant) => participant.agentId !== adminAgent?.agentId)
    .map((participant) => participant.agentId);
}

function buildPlanningObjectiveDraft(state: GroupGraphStateValue): Partial<GroupObjective> {
  const title = state.userMessage.trim().slice(0, 80) || 'Planungsziel';
  return {
    groupId: state.groupId,
    title,
    description: state.userMessage.trim(),
    type: 'short-term',
    status: 'planned',
    priority: 'medium',
    assignedAgentIds: buildEligibleNonAdminParticipantIds(state),
    progress: 0,
  };
}

function applyModeGuardrails(
  state: GroupGraphStateValue,
  decision: OrchestratorDecision,
): ModeGuardrailResult {
  const requestedMode = state.forceMode || decision.mode;
  const eligibleParticipantIds = buildEligibleNonAdminParticipantIds(state);
  const fallbackPrompt = state.userMessage.trim() || 'Bearbeitet die aktuelle Nutzeranfrage.';
  let actions = [...decision.actions];
  let nextPhase = state.modePhase || getInitialModePhase(requestedMode);
  let nextRound = state.modeRound;
  let adjusted = false;

  const ensureSynthesis = () => {
    const nextActions = appendActionIfMissing(
      actions,
      (action) => action.type === 'synthesize' || action.type === 'end_session',
      { type: 'synthesize' },
    );
    adjusted = adjusted || nextActions !== actions;
    actions = nextActions;
  };

  if (requestedMode === 'brainstorming') {
    if (!hasActionType(actions, ['broadcast', 'ask_agent', 'delegate', 'ask_sub_admin', 'create_breakout'])) {
      actions = [
        {
          type: 'broadcast',
          prompt: `Liefert unabhängig voneinander je 2-3 neue Ideen zu: ${fallbackPrompt}`,
          targetAgentIds: eligibleParticipantIds,
        },
      ];
      adjusted = true;
    }
    ensureSynthesis();
    nextPhase = state.agentResponses.length > 0 ? 'decide' : 'evaluate';
    nextRound += 1;
  }

  if (requestedMode === 'debate') {
    if (eligibleParticipantIds.length >= 2 && !hasActionType(actions, ['ask_agent', 'broadcast'])) {
      const [proAgentId, contraAgentId] = eligibleParticipantIds;
      actions = [
        {
          type: 'ask_agent',
          agentId: proAgentId,
          question: `Übernimm die Pro-Position zu "${fallbackPrompt}" und liefere die stärksten Argumente.`,
        },
        {
          type: 'ask_agent',
          agentId: contraAgentId,
          question: `Übernimm die kritische oder Contra-Position zu "${fallbackPrompt}" und greife die stärksten Annahmen an.`,
        },
      ];
      adjusted = true;
    }
    ensureSynthesis();
    nextPhase = state.modeRound === 0 ? 'cross-examination' : 'verdict';
    nextRound += 1;
  }

  if (requestedMode === 'task-delegation') {
    if (!hasActionType(actions, ['delegate', 'ask_sub_admin', 'ask_agent', 'broadcast', 'create_breakout', 'create_agent'])) {
      actions = eligibleParticipantIds.length > 0
        ? [
            {
              type: 'delegate',
              task: fallbackPrompt,
              assignTo: eligibleParticipantIds,
            },
          ]
        : [
            {
              type: 'respond',
              message: 'Es stehen aktuell keine ausführenden Teilnehmer für die Delegation bereit.',
            },
          ];
      adjusted = true;
    }
    if (hasActionType(actions, ['delegate', 'ask_sub_admin', 'ask_agent', 'broadcast'])) {
      ensureSynthesis();
    }
    nextPhase = state.pendingTasks.length > 0 ? 'integrate' : 'assign';
    nextRound += 1;
  }

  if (requestedMode === 'review') {
    if (!hasActionType(actions, ['broadcast', 'ask_agent'])) {
      actions = [
        {
          type: 'broadcast',
          prompt: `Bewertet "${fallbackPrompt}" unabhängig aus eurer Fachperspektive. Nennt Stärken, Risiken und konkrete Verbesserungen.`,
          targetAgentIds: eligibleParticipantIds,
        },
      ];
      adjusted = true;
    }
    ensureSynthesis();
    nextPhase = state.agentResponses.length > 0 ? 'synthesize' : 'discuss';
    nextRound += 1;
  }

  if (requestedMode === 'planning') {
    if (!hasActionType(actions, ['broadcast', 'ask_agent', 'delegate', 'ask_sub_admin', 'create_breakout', 'create_agent'])) {
      actions = [
        {
          type: 'broadcast',
          prompt: `Gebt Input zu Machbarkeit, Aufwand und Risiken für dieses Ziel: ${fallbackPrompt}`,
          targetAgentIds: eligibleParticipantIds,
        },
      ];
      adjusted = true;
    }
    if (!hasActionType(actions, ['create_objective', 'update_objective', 'create_agent', 'create_breakout'])) {
      actions = [
        ...actions,
        {
          type: 'create_objective',
          objective: buildPlanningObjectiveDraft(state),
        },
      ];
      adjusted = true;
    }
    if (hasActionType(actions, ['broadcast', 'ask_agent', 'delegate', 'ask_sub_admin'])) {
      ensureSynthesis();
    }
    nextPhase = state.agentResponses.length > 0 ? 'finalize' : 'draft';
    nextRound += 1;
  }

  if (!nextPhase) {
    nextPhase = getInitialModePhase(requestedMode);
  }

  return {
    decision: {
      ...decision,
      mode: requestedMode,
      reasoning: adjusted
        ? `${decision.reasoning} Mode-Guardrails haben die nächste Aktionsfolge geschärft.`
        : decision.reasoning,
      actions,
    },
    nextPhase,
    nextRound,
  };
}

// --------------------------------------------
// Graph-Nodes
// Kernnodes sind produktiv ausführbar, spätere Phasen-
// Nodes sind als sichere Erweiterungspunkte angelegt.
// --------------------------------------------

function createOrchestratorNode(
  llmAdapter: GroupOrchestratorLLMAdapter,
  deps: GroupOrchestratorDependencies,
) {
  return async function orchestratorNode(
    state: GroupGraphStateValue,
  ): Promise<Partial<GroupGraphStateValue>> {
    throwIfAborted(deps.signal);
    if (state.isAborted) {
      await emitGroupEvent(deps.onEvent, {
        type: 'error',
        message: 'Orchestrierung wurde vor dem Start abgebrochen.',
      });
      return buildTerminalGuardUpdate(state, 'Orchestrierung wurde vor dem Start abgebrochen.');
    }

    if (state.turnCount >= state.maxTurns) {
      await emitGroupEvent(deps.onEvent, {
        type: 'error',
        message: 'Maximale Anzahl an Orchestrierungs-Turns erreicht.',
      });
      return buildTerminalGuardUpdate(state, 'Maximale Anzahl an Orchestrierungs-Turns erreicht.');
    }

    const adminAgent = getDefaultAdmin(state.participants);
    if (!adminAgent) {
      await emitGroupEvent(deps.onEvent, {
        type: 'error',
        message: 'Kein Admin oder Teilnehmer für die Gruppen-Orchestrierung gefunden.',
      });
      return buildTerminalGuardUpdate(state, 'Kein Admin oder Teilnehmer für die Gruppen-Orchestrierung gefunden.');
    }

    const systemPrompt = buildOrchestratorSystemPrompt({
      adminAgent,
      allParticipants: state.participants,
      objectives: state.objectives,
      groupContext: state.groupContext,
      mode: state.forceMode || state.activeMode || 'free-discussion',
      mentionedAgentIds: state.mentionedAgentIds,
      modePhase: state.modePhase,
      modeRound: state.modeRound,
    });
    const decisionValidationContext = {
      participants: state.participants,
      defaultTargetAgentIds: getEligibleParticipants(state.participants)
        .filter((participant) => participant.agentId !== adminAgent.agentId)
        .map((participant) => participant.agentId),
      requestedMode: state.forceMode || state.activeMode || undefined,
      modePhase: state.modePhase || undefined,
    };

    const messages = [
      ...mapConversationHistoryToLlmMessages(state.conversationHistory),
      {
        role: 'user' as const,
        content: sanitizeUserMessage(state.userMessage),
      },
    ];

    let decision: OrchestratorDecision;
    let usage: LangGraphUsageSummary | null = null;

    try {
      const structured = await llmAdapter.invokeStructured<OrchestratorDecision>({
        moduleId: adminAgent.agentId,
        messages,
        system: systemPrompt,
        schemaPrompt: buildOrchestratorDecisionSchemaPrompt(decisionValidationContext),
        validator: buildOrchestratorDecisionValidator(decisionValidationContext),
        retries: 2,
      });

      decision = structured.data;
      usage = structured.usage;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      decision = buildFallbackDecision(state, reason);
    }

    const nextMode = state.forceMode || decision.mode;
    const guardedDecision = applyModeGuardrails(
      {
        ...state,
        activeMode: nextMode,
      },
      decision,
    );
    const modeChanged = state.activeMode && state.activeMode !== nextMode;
    const modeEvent: GroupOrchestrateEvent = modeChanged
      ? {
          type: 'mode_changed',
          oldMode: state.activeMode,
          newMode: nextMode,
          reasoning: guardedDecision.decision.reasoning,
        }
      : {
          type: 'mode_selected',
          mode: nextMode,
          reasoning: guardedDecision.decision.reasoning,
        };
    await emitGroupEvent(deps.onEvent, modeEvent);
    const baseEvents = appendEvent(state, modeEvent);

    return {
      activeMode: nextMode,
      modePhase: guardedDecision.nextPhase,
      modeRound: guardedDecision.nextRound,
      actionQueue: guardedDecision.decision.actions.length > 0
        ? guardedDecision.decision.actions
        : buildFallbackDecision(state, 'Leere Action-Liste').actions,
      activeAction: guardedDecision.decision.actions[0] || null,
      turnCount: state.turnCount + 1,
      events: baseEvents,
      orchestratorDecision: guardedDecision.decision,
      ...(usage ? accumulateUsage(state, usage) : {}),
    };
  };
}

function createSubAdminNode(
  llmAdapter: GroupOrchestratorLLMAdapter,
  deps: GroupOrchestratorDependencies,
) {
  return async function subAdminNode(
    state: GroupGraphStateValue,
  ): Promise<Partial<GroupGraphStateValue>> {
    throwIfAborted(deps.signal);
    const action = getCurrentAction(state);
    if (!action) {
      return {
        shouldContinue: false,
        lastError: 'subAdminNode wurde ohne aktive Aktion aufgerufen.',
      };
    }

    const adminId = action.type === 'ask_sub_admin'
      ? action.adminId
      : action.type === 'delegate'
        ? action.delegateVia
        : undefined;
    const adminAgent = state.participants.find((participant) => participant.agentId === adminId);

    if (!adminAgent) {
      await emitGroupEvent(deps.onEvent, {
        type: 'error',
        message: `Sub-Admin ${adminId || 'unknown'} wurde nicht gefunden.`,
      });
      return {
        actionQueue: state.actionQueue.slice(1),
        activeAction: state.actionQueue[1] || null,
        events: appendEvent(state, {
          type: 'error',
          message: `Sub-Admin ${adminId || 'unknown'} wurde nicht gefunden.`,
        }),
        lastError: `Sub-Admin ${adminId || 'unknown'} wurde nicht gefunden.`,
      };
    }

    const delegatedTask = action.type === 'ask_sub_admin'
      ? action.task
      : action.type === 'delegate'
        ? action.task
        : 'Delegierte Teilaufgabe';

    const systemPrompt = buildSubAdminSystemPrompt({
      adminAgent,
      allParticipants: state.participants,
      objectives: state.objectives,
      delegatedTask,
      groupContext: state.groupContext,
      mode: state.activeMode,
      modePhase: state.modePhase,
      modeRound: state.modeRound,
    });
    const decisionValidationContext = {
      participants: state.participants,
      defaultTargetAgentIds: (adminAgent.scope?.subordinateAgentIds || []).length > 0
        ? adminAgent.scope?.subordinateAgentIds || []
        : getEligibleParticipants(state.participants)
            .filter((participant) => participant.agentId !== adminAgent.agentId)
            .map((participant) => participant.agentId),
      requestedMode: state.activeMode,
      modePhase: state.modePhase || undefined,
    };

    try {
      throwIfAborted(deps.signal);
      const structured = await llmAdapter.invokeStructured<OrchestratorDecision>({
        moduleId: adminAgent.agentId,
        messages: [
          ...mapConversationHistoryToLlmMessages(state.conversationHistory),
          {
            role: 'user',
            content: sanitizeUserMessage(delegatedTask),
          },
        ],
        system: systemPrompt,
        schemaPrompt: buildOrchestratorDecisionSchemaPrompt(decisionValidationContext),
        validator: buildOrchestratorDecisionValidator(decisionValidationContext),
        retries: 2,
      });

      const guardedDecision = applyModeGuardrails(state, structured.data);

      await emitGroupEvent(deps.onEvent, {
        type: 'sub_admin_active',
        adminId: adminAgent.agentId,
        scope: adminAgent.scope?.domain || 'global',
      });

      return {
        actionQueue: [...guardedDecision.decision.actions, ...state.actionQueue.slice(1)],
        activeAction: guardedDecision.decision.actions[0] || state.actionQueue[1] || null,
        modePhase: guardedDecision.nextPhase,
        modeRound: guardedDecision.nextRound,
        events: appendEvent(state, {
          type: 'sub_admin_active',
          adminId: adminAgent.agentId,
          scope: adminAgent.scope?.domain || 'global',
        }),
        ...accumulateUsage(state, structured.usage),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await emitGroupEvent(deps.onEvent, {
        type: 'error',
        message: `Sub-Admin-Ausführung fehlgeschlagen: ${reason}`,
      });
      return {
        actionQueue: state.actionQueue.slice(1),
        activeAction: state.actionQueue[1] || null,
        events: appendEvent(state, {
          type: 'error',
          message: `Sub-Admin-Ausführung fehlgeschlagen: ${reason}`,
        }),
        lastError: reason,
      };
    }
  };
}

function createAgentExecutionNode(
  llmAdapter: GroupOrchestratorLLMAdapter,
  systemPromptBuilder: typeof buildSystemPrompt,
  deps: GroupOrchestratorDependencies,
) {
  return async function agentExecutionNode(
    state: GroupGraphStateValue,
  ): Promise<Partial<GroupGraphStateValue>> {
    throwIfAborted(deps.signal);
    const action = getCurrentAction(state);
    if (!action) {
      return {
        shouldContinue: false,
        lastError: 'agentExecutionNode wurde ohne aktive Aktion aufgerufen.',
      };
    }

    const targetId = action.type === 'ask_agent'
      ? action.agentId
      : action.type === 'delegate'
        ? action.assignTo[0]
        : undefined;

    const participant = getEligibleParticipants(state.participants)
      .find((entry) => entry.agentId === targetId);

    if (!participant || !targetId) {
      await emitGroupEvent(deps.onEvent, {
        type: 'error',
        message: `Teilnehmer ${targetId || 'unknown'} konnte nicht ausgeführt werden.`,
      });
      return {
        actionQueue: state.actionQueue.slice(1),
        activeAction: state.actionQueue[1] || null,
        events: appendEvent(state, {
          type: 'error',
          message: `Teilnehmer ${targetId || 'unknown'} konnte nicht ausgeführt werden.`,
        }),
        lastError: `Teilnehmer ${targetId || 'unknown'} konnte nicht ausgeführt werden.`,
      };
    }

    const prompt = action.type === 'ask_agent'
      ? action.question
      : action.type === 'delegate'
        ? action.task
        : '';

    const speakingEvent: GroupOrchestrateEvent = {
      type: 'agent_speaking',
      agentId: participant.agentId,
      agentName: participant.role || participant.agentId,
    };
    await emitGroupEvent(deps.onEvent, speakingEvent);
    const baseEvents = appendEvent(state, speakingEvent);

    try {
      const { record, usage, usedLiveStreaming } = await executeParticipantTurn({
        state,
        participant,
        prompt,
        llmAdapter,
        systemPromptBuilder,
        signal: deps.signal,
        onTokenChunk: async (chunk) => {
          await emitGroupEvent(deps.onEvent, {
            type: 'agent_token',
            agentId: participant.agentId,
            agentName: participant.role || participant.agentId,
            token: chunk,
          });
        },
      });

      const pendingTasks = action.type === 'delegate'
        ? state.pendingTasks.filter((task) =>
            !(task.description === action.task && task.assignedTo.join('|') === action.assignTo.join('|')))
        : state.pendingTasks;
      const completedTasks = action.type === 'delegate'
        ? [
            ...state.completedTasks,
            {
              ...actionToTask(action),
              status: 'completed',
              completedAt: Date.now(),
            } as OrchestratorTask,
          ]
        : state.completedTasks;
      const publicContent = getPublicAgentContent(record);
      const hasOnlyPrivateContent = !publicContent && Boolean(record.parsed?.privateContent);
      const completionEvent: GroupOrchestrateEvent = record.status === 'passed' || hasOnlyPrivateContent
        ? {
            type: 'agent_passed',
            agentId: record.agentId,
            agentName: record.agentName,
          }
        : {
            type: 'agent_done',
            agentId: record.agentId,
            agentName: record.agentName,
            fullContent: publicContent,
          };

      if (record.status !== 'passed' && !usedLiveStreaming && deps.emitSyntheticTokens !== false) {
        await emitAgentTextTokens({
          onEvent: deps.onEvent,
          signal: deps.signal,
          agentId: record.agentId,
          agentName: record.agentName,
          content: publicContent,
        });
      }
      await emitGroupEvent(deps.onEvent, completionEvent);
      if (action.type === 'delegate') {
        await emitGroupEvent(deps.onEvent, {
          type: 'task_completed',
          taskId: completedTasks[completedTasks.length - 1]?.id || action.task,
          result: publicContent,
        });
      }

      return {
        agentResponses: [...state.agentResponses, record],
        pendingTasks,
        completedTasks,
        actionQueue: state.actionQueue.slice(1),
        activeAction: state.actionQueue[1] || null,
        events: [
          ...baseEvents,
          completionEvent,
        ],
        ...accumulateUsage(state, usage),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await emitGroupEvent(deps.onEvent, {
        type: 'error',
        message: `Agent-Ausführung fehlgeschlagen für ${participant.agentId}: ${reason}`,
      });
      return {
        agentResponses: [
          ...state.agentResponses,
          {
            agentId: participant.agentId,
            agentName: participant.role || participant.agentId,
            rawContent: '',
            status: 'error',
            error: reason,
          },
        ],
        actionQueue: state.actionQueue.slice(1),
        activeAction: state.actionQueue[1] || null,
        events: [
          ...baseEvents,
          {
            type: 'error',
            message: `Agent-Ausführung fehlgeschlagen für ${participant.agentId}: ${reason}`,
          },
        ],
        lastError: reason,
      };
    }
  };
}

function createBroadcastNode(
  llmAdapter: GroupOrchestratorLLMAdapter,
  systemPromptBuilder: typeof buildSystemPrompt,
  deps: GroupOrchestratorDependencies,
) {
  return async function broadcastNode(
    state: GroupGraphStateValue,
  ): Promise<Partial<GroupGraphStateValue>> {
    throwIfAborted(deps.signal);
    const action = getCurrentAction(state);
    if (!action || (action.type !== 'broadcast' && action.type !== 'delegate')) {
      return {
        shouldContinue: false,
        lastError: 'broadcastNode wurde ohne broadcast-Aktion aufgerufen.',
      };
    }

    const targetIds = action.type === 'broadcast' && action.targetAgentIds?.length
      ? new Set(action.targetAgentIds)
      : action.type === 'delegate'
        ? new Set(action.assignTo)
        : null;

    const targets = getEligibleParticipants(state.participants)
      .filter((participant) => !targetIds || targetIds.has(participant.agentId));

    const nextResponses = [...state.agentResponses];
    const nextEvents = [...state.events];
    let tokensUsed = state.tokensUsed;
    let costEstimate = state.costEstimate;

    for (const participant of targets) {
      throwIfAborted(deps.signal);
      const speakingEvent: GroupOrchestrateEvent = {
        type: 'agent_speaking',
        agentId: participant.agentId,
        agentName: participant.role || participant.agentId,
      };
      await emitGroupEvent(deps.onEvent, speakingEvent);
      nextEvents.push(speakingEvent);

      try {
        const { record, usage, usedLiveStreaming } = await executeParticipantTurn({
          state,
          participant,
          prompt: action.type === 'broadcast' ? action.prompt : action.task,
          llmAdapter,
          systemPromptBuilder,
          signal: deps.signal,
          onTokenChunk: async (chunk) => {
            await emitGroupEvent(deps.onEvent, {
              type: 'agent_token',
              agentId: participant.agentId,
              agentName: participant.role || participant.agentId,
              token: chunk,
            });
          },
        });

        nextResponses.push(record);
        tokensUsed += usage.totalTokens;
        costEstimate += usage.estimatedCost;
        const publicContent = getPublicAgentContent(record);
        const hasOnlyPrivateContent = !publicContent && Boolean(record.parsed?.privateContent);
        const completionEvent: GroupOrchestrateEvent = record.status === 'passed' || hasOnlyPrivateContent
          ? {
              type: 'agent_passed',
              agentId: record.agentId,
              agentName: record.agentName,
            }
          : {
              type: 'agent_done',
              agentId: record.agentId,
              agentName: record.agentName,
              fullContent: publicContent,
            };

        if (record.status !== 'passed' && !usedLiveStreaming && deps.emitSyntheticTokens !== false) {
          await emitAgentTextTokens({
            onEvent: deps.onEvent,
            signal: deps.signal,
            agentId: record.agentId,
            agentName: record.agentName,
            content: publicContent,
          });
        }

        await emitGroupEvent(deps.onEvent, completionEvent);
        nextEvents.push(completionEvent);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        nextResponses.push({
          agentId: participant.agentId,
          agentName: participant.role || participant.agentId,
          rawContent: '',
          status: 'error',
          error: reason,
        });
        const errorEvent: GroupOrchestrateEvent = {
          type: 'error',
          message: `Broadcast fehlgeschlagen für ${participant.agentId}: ${reason}`,
        };
        await emitGroupEvent(deps.onEvent, errorEvent);
        nextEvents.push(errorEvent);
      }
    }

    const pendingTasks = action.type === 'delegate'
      ? state.pendingTasks.filter((task) =>
          !(task.description === action.task && task.assignedTo.join('|') === action.assignTo.join('|')))
      : state.pendingTasks;
    const completedTasks = action.type === 'delegate'
      ? [
          ...state.completedTasks,
          {
            ...actionToTask(action),
            status: 'completed',
            completedAt: Date.now(),
          } as OrchestratorTask,
        ]
      : state.completedTasks;

    if (action.type === 'delegate' && completedTasks.length > state.completedTasks.length) {
      const completedTask = completedTasks[completedTasks.length - 1];
      await emitGroupEvent(deps.onEvent, {
        type: 'task_completed',
        taskId: completedTask.id,
        result: nextResponses
          .slice(-targets.length)
          .map((response) => getPublicAgentContent(response))
          .filter(Boolean)
          .join('\n\n'),
      });
    }

    return {
      agentResponses: nextResponses,
      pendingTasks,
      completedTasks,
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: nextEvents,
      tokensUsed,
      costEstimate,
    };
  };
}

async function breakoutNode(
  state: GroupGraphStateValue,
  deps: GroupOrchestratorDependencies,
): Promise<Partial<GroupGraphStateValue>> {
  throwIfAborted(deps.signal);
  const action = getCurrentAction(state);
  if (!action || action.type !== 'create_breakout') {
    return {
      shouldContinue: false,
      lastError: 'breakoutNode wurde ohne create_breakout-Aktion aufgerufen.',
    };
  }

  const breakoutId = `breakout-${crypto.randomUUID()}`;
  const breakoutParticipants = state.participants.filter((participant) =>
    action.participantIds.includes(participant.agentId)
  );

  if (breakoutParticipants.length === 0) {
    const reason = 'Breakout konnte nicht gestartet werden, weil keine gültigen Teilnehmer ausgewählt wurden.';
    await emitGroupEvent(deps.onEvent, {
      type: 'error',
      message: reason,
    });
    return {
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: appendEvent(state, {
        type: 'error',
        message: reason,
      }),
      lastError: reason,
    };
  }

  const breakoutGroupId = `group-${breakoutId}`;
  const breakoutConversationId = `conversation-${breakoutId}`;
  const reportBackTo = action.reportBackTo
    || getDefaultAdmin(breakoutParticipants)?.agentId
    || breakoutParticipants[0]?.agentId
    || getOrchestratorSpeaker(state).agentId;
  const breakoutCreatedEvent: GroupOrchestrateEvent = {
    type: 'breakout_created',
    breakoutId,
    breakoutGroupId,
    breakoutConversationId,
    parentGroupId: state.groupId,
    name: action.name,
    task: action.task,
    participants: breakoutParticipants,
    mode: action.mode,
    reportBackTo,
    autoSaveArtifacts: action.autoSaveArtifacts,
    targetFolderId: action.targetFolderId,
  };

  await emitGroupEvent(deps.onEvent, breakoutCreatedEvent);
  const breakoutEvents: GroupOrchestrateEvent[] = [breakoutCreatedEvent];

  try {
    const groupContext = asRecord(state.groupContext);
    const breakoutContext = {
      ...groupContext,
      groupId: breakoutGroupId,
      groupName: action.name,
      parentGroupId: state.groupId,
      rootGroupId: String(groupContext.rootGroupId || state.groupId),
      participantRoles: breakoutParticipants,
      conversationParticipants: breakoutParticipants,
      breakoutId,
      breakoutTask: action.task,
      reportBackTo,
      isBreakoutSession: true,
    };

    const breakoutState = await runGroupOrchestrator(
      {
        userMessage: action.task,
        groupId: breakoutGroupId,
        conversationId: breakoutConversationId,
        conversationHistory: state.conversationHistory.slice(-10),
        participants: breakoutParticipants,
        objectives: state.objectives,
        groupContext: breakoutContext,
        forceMode: action.mode || state.activeMode,
        mentionedAgentIds: [],
        maxTurns: typeof action.maxTurns === 'number' && action.maxTurns > 0
          ? action.maxTurns
          : Math.min(state.maxTurns, 6),
      },
      {
        ...deps,
        onEvent: async (event) => {
          const breakoutEvent = addBreakoutContextToEvent(event, breakoutId);
          if (!breakoutEvent) {
            return;
          }
          breakoutEvents.push(breakoutEvent);
          await emitGroupEvent(deps.onEvent, breakoutEvent);
        },
      },
    );

    const streamedBreakoutSummary = [...breakoutEvents]
      .reverse()
      .find((event) =>
        event.type === 'synthesis'
        || event.type === 'orchestrator_message'
      );
    const summary = normalizeNarrativeText(
      breakoutState.responseMessage
      || breakoutState.synthesisResult
      || (streamedBreakoutSummary
        && 'content' in streamedBreakoutSummary
        ? streamedBreakoutSummary.content
        : '')
      || breakoutState.agentResponses
        .map((response) => getPublicAgentContent(response))
        .filter(Boolean)
        .join('\n\n')
      || `${action.name} hat keine zusammenfassbare Rückmeldung geliefert.`,
    );
    const reporter = breakoutParticipants.find((participant) => participant.agentId === reportBackTo)
      || getDefaultAdmin(breakoutParticipants)
      || breakoutParticipants[0];
    const breakoutResultEvent: GroupOrchestrateEvent = {
      type: 'breakout_result',
      breakoutId,
      breakoutGroupId,
      breakoutConversationId,
      parentGroupId: state.groupId,
      summary,
      reportedByAgentId: reporter?.agentId || breakoutId,
      reportedByName: reporter?.role || reporter?.agentId || action.name,
    };

    await emitGroupEvent(deps.onEvent, breakoutResultEvent);
    breakoutEvents.push(breakoutResultEvent);

    const breakoutResponse: AgentResponseRecord = {
      agentId: breakoutId,
      agentName: `${action.name} Ergebnis`,
      rawContent: summary,
      parsed: parseAgentResponse(summary),
      status: 'completed',
    };

    return {
      breakoutsCreated: [...state.breakoutsCreated, breakoutId],
      agentResponses: [...state.agentResponses, breakoutResponse],
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: [...state.events, ...breakoutEvents],
      tokensUsed: state.tokensUsed + breakoutState.tokensUsed,
      costEstimate: state.costEstimate + breakoutState.costEstimate,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const breakoutErrorEvent: GroupOrchestrateEvent = {
      type: 'error',
      message: `Breakout "${action.name}" fehlgeschlagen: ${reason}`,
      breakoutId,
    };
    await emitGroupEvent(deps.onEvent, breakoutErrorEvent);
    breakoutEvents.push(breakoutErrorEvent);
    return {
      breakoutsCreated: [...state.breakoutsCreated, breakoutId],
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: [...state.events, ...breakoutEvents],
      lastError: reason,
    };
  }
}

async function artifactNode(
  state: GroupGraphStateValue,
  deps: GroupOrchestratorDependencies,
): Promise<Partial<GroupGraphStateValue>> {
  throwIfAborted(deps.signal);
  const action = getCurrentAction(state);
  if (!action) {
    return {
      shouldContinue: false,
      lastError: 'artifactNode wurde ohne aktive Aktion aufgerufen.',
    };
  }

  if (action.type === 'save_artifact') {
    await emitGroupEvent(deps.onEvent, {
      type: 'artifact_saved',
      name: action.name,
      folderId: action.folderId || null,
    });
    return {
      artifactsSaved: [
        ...state.artifactsSaved,
        { name: action.name, content: action.content, folderId: action.folderId },
      ],
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: appendEvent(state, {
        type: 'artifact_saved',
        name: action.name,
        folderId: action.folderId || null,
      }),
    };
  }

  if (action.type === 'create_folder') {
    const folderId = `folder-${crypto.randomUUID()}`;
    await emitGroupEvent(deps.onEvent, {
      type: 'folder_created',
      folderId,
      name: action.name,
    });
    return {
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: appendEvent(state, {
        type: 'folder_created',
        folderId,
        name: action.name,
      }),
    };
  }

  if (action.type === 'update_artifact') {
    await emitGroupEvent(deps.onEvent, {
      type: 'artifact_saved',
      name: action.documentId,
      folderId: null,
    });
    return {
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: appendEvent(state, {
        type: 'artifact_saved',
        name: action.documentId,
        folderId: null,
      }),
    };
  }

  return {
    actionQueue: state.actionQueue.slice(1),
    activeAction: state.actionQueue[1] || null,
  };
}

function createSynthesisNode(
  llmAdapter: GroupOrchestratorLLMAdapter,
  deps: GroupOrchestratorDependencies,
) {
  return async function synthesisNode(
    state: GroupGraphStateValue,
  ): Promise<Partial<GroupGraphStateValue>> {
    throwIfAborted(deps.signal);
    const action = getCurrentAction(state);
    const orchestratorSpeaker = getOrchestratorSpeaker(state);
    const synthesisInputs = state.agentResponses
      .filter((entry) => entry.status === 'completed' && entry.parsed?.groupContent)
      .map((entry) => `- ${entry.agentName}: ${entry.parsed?.groupContent}`)
      .join('\n');

    const prompt = action?.type === 'synthesize' && action.fromResponses?.length
      ? `Fasse diese ausgewählten Antwort-IDs zusammen: ${action.fromResponses.join(', ')}\n\n${synthesisInputs}`
      : `Fasse die bisherigen Gruppenbeiträge präzise zusammen:\n\n${synthesisInputs || '- keine Beiträge'}`;

    try {
      let streamedText = '';
      for await (const chunk of llmAdapter.streamText({
        moduleId: orchestratorSpeaker.agentId,
        messages: [
          {
            role: 'user',
            content: sanitizeUserMessage(prompt),
          },
        ],
        system: 'Du bist der Synthese-Knoten einer Multi-Agent-Orchestrierung. Fasse präzise, auf Deutsch und ohne Wiederholung zusammen.',
        maxTokensOverride: 1200,
        temperatureOverride: 0.2,
      })) {
        throwIfAborted(deps.signal);
        streamedText += chunk;
        await emitGroupEvent(deps.onEvent, {
          type: 'agent_token',
          agentId: orchestratorSpeaker.agentId,
          agentName: orchestratorSpeaker.agentName,
          token: chunk,
        });
      }

      const normalizedText = normalizeNarrativeText(streamedText);

      await emitGroupEvent(deps.onEvent, {
        type: 'synthesis',
        content: normalizedText,
      });

      return {
        synthesisResult: normalizedText,
        responseMessage: normalizedText,
        actionQueue: action ? state.actionQueue.slice(1) : state.actionQueue,
        activeAction: action ? state.actionQueue[1] || null : state.activeAction,
        events: appendEvent(state, {
          type: 'synthesis',
          content: normalizedText,
        }),
        ...accumulateUsage(state, createEmptyUsageSummary()),
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await emitGroupEvent(deps.onEvent, {
        type: 'error',
        message: `Synthese fehlgeschlagen: ${reason}`,
      });
      return {
        actionQueue: action ? state.actionQueue.slice(1) : state.actionQueue,
        activeAction: action ? state.actionQueue[1] || null : state.activeAction,
        events: appendEvent(state, {
          type: 'error',
          message: `Synthese fehlgeschlagen: ${reason}`,
        }),
        lastError: reason,
      };
    }
  };
}

async function goalUpdateNode(
  state: GroupGraphStateValue,
  deps: GroupOrchestratorDependencies,
): Promise<Partial<GroupGraphStateValue>> {
  throwIfAborted(deps.signal);
  const action = getCurrentAction(state);
  if (!action) {
    return {
      shouldContinue: false,
      lastError: 'goalUpdateNode wurde ohne aktive Aktion aufgerufen.',
    };
  }

  if (action.type === 'update_objective') {
    await emitGroupEvent(deps.onEvent, {
      type: 'objective_updated',
      objectiveId: action.objectiveId,
      updates: action.updates,
    });
    return {
      objectiveUpdates: [...state.objectiveUpdates, action.updates],
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: appendEvent(state, {
        type: 'objective_updated',
        objectiveId: action.objectiveId,
        updates: action.updates,
      }),
    };
  }

  if (action.type === 'create_objective') {
    await emitGroupEvent(deps.onEvent, {
      type: 'objective_created',
      objective: action.objective,
    });
    return {
      objectiveUpdates: [...state.objectiveUpdates, action.objective],
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: appendEvent(state, {
        type: 'objective_created',
        objective: action.objective,
      }),
    };
  }

  return {
    actionQueue: state.actionQueue.slice(1),
    activeAction: state.actionQueue[1] || null,
  };
}

async function channelRouterNode(
  state: GroupGraphStateValue,
  deps: GroupOrchestratorDependencies,
): Promise<Partial<GroupGraphStateValue>> {
  throwIfAborted(deps.signal);
  const nextResponses = state.agentResponses.map((response) => {
    if (response.parsed) {
      return response;
    }
    return {
      ...response,
      parsed: parseAgentResponse(response.rawContent),
      status: parseAgentResponse(response.rawContent).isPass ? 'passed' : response.status,
    };
  });

  const nextEvents = [...state.events];
  const privateMessages = [...state.privateMessages];
  const pendingClarifications = [...state.pendingClarifications];

  for (const response of nextResponses) {
    if (!response.parsed?.privateContent) {
      continue;
    }

    const createdAt = Date.now();
    const privateEventType = classifyPrivateContent({
      privateContent: response.parsed.privateContent,
      hasGroupContent: Boolean(response.parsed.groupContent),
    });

    if (privateEventType === 'private_message') {
      privateMessages.push({
        agentId: response.agentId,
        content: response.parsed.privateContent,
        createdAt,
      });
      const privateEvent: GroupOrchestrateEvent = {
        type: 'private_message',
        agentId: response.agentId,
        agentName: response.agentName,
        content: response.parsed.privateContent,
        conversationId: state.conversationId,
      };
      nextEvents.push(privateEvent);
      await emitGroupEvent(deps.onEvent, privateEvent);
      continue;
    }

    if (response.rawContent.includes(PRIVATE_MARKER)) {
      pendingClarifications.push({
        agentId: response.agentId,
        question: response.parsed.privateContent,
        createdAt,
        status: 'pending',
      });
      const clarificationEvent: GroupOrchestrateEvent = {
        type: 'private_clarification_needed',
        agentId: response.agentId,
        agentName: response.agentName,
        question: response.parsed.privateContent,
        conversationId: state.conversationId,
      };
      nextEvents.push(clarificationEvent);
      await emitGroupEvent(deps.onEvent, clarificationEvent);
    }
  }

  return {
    agentResponses: nextResponses,
    privateMessages,
    pendingClarifications,
    events: nextEvents,
  };
}

async function routingNode(
  state: GroupGraphStateValue,
  deps: GroupOrchestratorDependencies,
): Promise<Partial<GroupGraphStateValue>> {
  throwIfAborted(deps.signal);
  const action = getCurrentAction(state);

  if (!state.shouldContinue) {
    return state;
  }

  if (state.turnCount >= state.maxTurns) {
    await emitGroupEvent(deps.onEvent, {
      type: 'session_end',
      summary: state.responseMessage || state.synthesisResult || 'Maximale Anzahl an Runden erreicht.',
    });
    return {
      shouldContinue: false,
      responseMessage: state.responseMessage || state.synthesisResult || 'Maximale Anzahl an Runden erreicht.',
      events: appendEvent(state, {
        type: 'session_end',
        summary: state.responseMessage || state.synthesisResult || 'Maximale Anzahl an Runden erreicht.',
      }),
    };
  }

  if (action?.type === 'change_mode') {
    await emitGroupEvent(deps.onEvent, {
      type: 'mode_changed',
      oldMode: state.activeMode,
      newMode: action.newMode,
      reasoning: action.reasoning,
    });
    return {
      activeMode: action.newMode,
      modePhase: getInitialModePhase(action.newMode),
      modeRound: 0,
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: appendEvent(state, {
        type: 'mode_changed',
        oldMode: state.activeMode,
        newMode: action.newMode,
        reasoning: action.reasoning,
      }),
    };
  }

  if (action?.type === 'respond') {
    const normalizedMessage = normalizeNarrativeText(action.message);
    await emitGroupEvent(deps.onEvent, {
      type: 'orchestrator_message',
      content: normalizedMessage,
    });
    return {
      shouldContinue: false,
      responseMessage: normalizedMessage,
      actionQueue: [],
      activeAction: null,
      events: appendEvent(state, {
        type: 'orchestrator_message',
        content: normalizedMessage,
      }),
    };
  }

  if (action?.type === 'end_session') {
    await emitGroupEvent(deps.onEvent, {
      type: 'session_end',
      summary: action.summary,
    });
    return {
      shouldContinue: false,
      responseMessage: action.summary,
      actionQueue: [],
      activeAction: null,
      events: appendEvent(state, {
        type: 'session_end',
        summary: action.summary,
      }),
    };
  }

  if (action?.type === 'create_agent') {
    const orchestratorSpeaker = getOrchestratorSpeaker(state);
    const agentCreatedEvent: GroupOrchestrateEvent = {
      type: 'agent_created',
      agentId: `custom-${crypto.randomUUID()}`,
      name: action.name,
      role: action.role,
      description: action.description,
      addToGroup: action.addToGroup,
      temporary: action.temporary ?? false,
      icon: action.icon,
      color: action.color,
      parentAgentId: action.parentAgentId || orchestratorSpeaker.agentId,
      targetGroupId: action.targetGroupId || (action.addToGroup ? state.groupId : undefined),
      authority: action.authority,
      scope: action.scope,
      capabilities: action.capabilities,
      settings: action.settings,
    };
    await emitGroupEvent(deps.onEvent, agentCreatedEvent);
    return {
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: appendEvent(state, agentCreatedEvent),
    };
  }

  if (action?.type === 'private_message') {
    const agentName = resolveParticipantName(state.participants, action.agentId);
    const normalizedMessage = normalizeNarrativeText(action.message);
    const createdAt = Date.now();
    await emitGroupEvent(deps.onEvent, {
      type: 'private_message',
      agentId: action.agentId,
      agentName,
      content: normalizedMessage,
      conversationId: state.conversationId,
    });
    return {
      privateMessages: [
        ...state.privateMessages,
        {
          agentId: action.agentId,
          content: normalizedMessage,
          createdAt,
        },
      ],
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: appendEvent(state, {
        type: 'private_message',
        agentId: action.agentId,
        agentName,
        content: normalizedMessage,
        conversationId: state.conversationId,
      }),
    };
  }

  if (action?.type === 'private_clarification') {
    const agentName = resolveParticipantName(state.participants, action.agentId);
    const normalizedQuestion = normalizeNarrativeText(action.question);
    const createdAt = Date.now();
    await emitGroupEvent(deps.onEvent, {
      type: 'private_clarification_needed',
      agentId: action.agentId,
      agentName,
      question: normalizedQuestion,
      conversationId: state.conversationId,
    });
    return {
      pendingClarifications: [
        ...state.pendingClarifications,
        {
          agentId: action.agentId,
          question: normalizedQuestion,
          createdAt,
          status: 'pending',
        },
      ],
      actionQueue: state.actionQueue.slice(1),
      activeAction: state.actionQueue[1] || null,
      events: appendEvent(state, {
        type: 'private_clarification_needed',
        agentId: action.agentId,
        agentName,
        question: normalizedQuestion,
        conversationId: state.conversationId,
      }),
    };
  }

  if (action?.type === 'delegate') {
    const alreadyTracked = state.pendingTasks.some((task) =>
      task.description === action.task
      && task.assignedTo.join('|') === action.assignTo.join('|'));
    const delegatedTask = actionToTask(action);

    if (alreadyTracked) {
      return state;
    }

    await emitGroupEvent(deps.onEvent, {
      type: 'task_delegated',
      task: delegatedTask,
    });

    return {
      pendingTasks: [...state.pendingTasks, delegatedTask],
      events: appendEvent(state, {
        type: 'task_delegated',
        task: delegatedTask,
      }),
    };
  }

  if (!action && !state.responseMessage) {
    if (state.synthesisResult) {
      await emitGroupEvent(deps.onEvent, {
        type: 'session_end',
        summary: state.synthesisResult,
      });
    }
    return {
      shouldContinue: false,
      responseMessage: state.synthesisResult,
      events: state.synthesisResult
        ? appendEvent(state, {
            type: 'session_end',
            summary: state.synthesisResult,
          })
        : state.events,
    };
  }

  return state;
}

function routeToNextNode(state: GroupGraphStateValue): string {
  if (!state.shouldContinue) {
    return END;
  }

  const action = getCurrentAction(state);
  if (!action) {
    if (state.responseMessage || state.synthesisResult) {
      return END;
    }
    return 'orchestratorNode';
  }

  switch (action.type) {
    case 'ask_sub_admin':
      return 'subAdminNode';
    case 'ask_agent':
      return 'agentExecutionNode';
    case 'broadcast':
      return 'broadcastNode';
    case 'delegate':
      return action.delegateVia ? 'subAdminNode' : (action.assignTo.length > 1 ? 'broadcastNode' : 'agentExecutionNode');
    case 'synthesize':
      return 'synthesisNode';
    case 'create_breakout':
      return 'breakoutNode';
    case 'save_artifact':
    case 'create_folder':
    case 'update_artifact':
      return 'artifactNode';
    case 'update_objective':
    case 'create_objective':
      return 'goalUpdateNode';
    case 'private_message':
    case 'private_clarification':
      return 'channelRouterNode';
    case 'change_mode':
      return 'orchestratorNode';
    case 'respond':
      return END;
    case 'end_session':
      return END;
    case 'create_agent':
      return END;
    default:
      return END;
  }
}

// --------------------------------------------
// Öffentliche Graph-Factory
// Erstellt einen kompilieren StateGraph mit Checkpointing.
// --------------------------------------------

export function createGroupOrchestratorGraph(deps: GroupOrchestratorDependencies = {}) {
  ensureInitialized();
  const llmAdapter = deps.llmAdapter || defaultAdapter;
  const systemPromptBuilder = deps.systemPromptBuilder || buildSystemPrompt;

  return new StateGraph(GroupGraphStateAnnotation)
    .addNode('orchestratorNode', createOrchestratorNode(llmAdapter, deps))
    .addNode('subAdminNode', createSubAdminNode(llmAdapter, deps))
    .addNode('agentExecutionNode', createAgentExecutionNode(llmAdapter, systemPromptBuilder, deps))
    .addNode('broadcastNode', createBroadcastNode(llmAdapter, systemPromptBuilder, deps))
    .addNode('breakoutNode', (state) => breakoutNode(state, deps))
    .addNode('artifactNode', (state) => artifactNode(state, deps))
    .addNode('synthesisNode', createSynthesisNode(llmAdapter, deps))
    .addNode('goalUpdateNode', (state) => goalUpdateNode(state, deps))
    .addNode('channelRouterNode', (state) => channelRouterNode(state, deps))
    .addNode('routingNode', (state) => routingNode(state, deps))
    .addEdge('__start__', 'orchestratorNode')
    .addEdge('orchestratorNode', 'routingNode')
    .addEdge('subAdminNode', 'routingNode')
    .addEdge('agentExecutionNode', 'channelRouterNode')
    .addEdge('broadcastNode', 'channelRouterNode')
    .addEdge('channelRouterNode', 'routingNode')
    .addEdge('breakoutNode', 'routingNode')
    .addEdge('artifactNode', 'routingNode')
    .addEdge('synthesisNode', 'routingNode')
    .addEdge('goalUpdateNode', 'routingNode')
    .addConditionalEdges('routingNode', routeToNextNode)
    .compile({
      checkpointer: new MemorySaver(),
    });
}

// --------------------------------------------
// Öffentliche Run-Hilfe
// Baut den Initial-State und führt den Graph aus.
// --------------------------------------------

export async function runGroupOrchestrator(
  input: GroupOrchestratorInput,
  deps: GroupOrchestratorDependencies = {},
): Promise<GroupGraphStateValue> {
  throwIfAborted(deps.signal);
  const graph = createGroupOrchestratorGraph(deps);
  const threadId = input.conversationId || `${input.groupId}:${crypto.randomUUID()}`;

  const initialState: GroupGraphStateValue = {
    userMessage: input.userMessage,
    groupId: input.groupId,
    conversationId: input.conversationId,
    conversationHistory: input.conversationHistory,
    participants: input.participants,
    objectives: input.objectives || [],
    groupContext: input.groupContext,
    forceMode: input.forceMode,
    mentionedAgentIds: input.mentionedAgentIds || [],
    maxTurns: input.maxTurns ?? 20,
    isAborted: input.isAborted ?? false,
    orchestratorDecision: null,
    activeMode: input.forceMode || 'free-discussion',
    modePhase: getInitialModePhase(input.forceMode || 'free-discussion'),
    modeRound: 0,
    actionQueue: [],
    activeAction: null,
    agentResponses: [],
    pendingTasks: [],
    completedTasks: [],
    breakoutsCreated: [],
    artifactsSaved: [],
    privateMessages: [],
    pendingClarifications: [],
    synthesisResult: null,
    responseMessage: null,
    objectiveUpdates: [],
    turnCount: 0,
    shouldContinue: true,
    events: [],
    checkpointId: threadId,
    tokensUsed: 0,
    costEstimate: 0,
    lastError: null,
  };

  const finalState = await graph.invoke(
    initialState as typeof GroupGraphStateAnnotation.State,
    {
      configurable: {
        thread_id: threadId,
      },
    },
  );
  return finalState;
}

export interface StreamGroupOrchestratorResult {
  finalState: Promise<GroupGraphStateValue>;
  events: AsyncIterable<GroupOrchestrateEvent>;
}

export function isGroupOrchestratorAbortError(error: unknown): error is GroupOrchestratorAbortError {
  return error instanceof GroupOrchestratorAbortError;
}

export function streamGroupOrchestrator(
  input: GroupOrchestratorInput,
  deps: GroupOrchestratorDependencies = {},
): StreamGroupOrchestratorResult {
  const queue = new AsyncEventQueue<GroupOrchestrateEvent>();
  const forwardEvent: GroupOrchestratorEventHandler = async (event) => {
    await deps.onEvent?.(event);
    queue.push(event);
  };

  const finalState = (async () => {
    try {
      return await runGroupOrchestrator(input, {
        ...deps,
        onEvent: forwardEvent,
      });
    } catch (error) {
      if (isGroupOrchestratorAbortError(error)) {
        const abortEvent = createAbortEvent(error.message);
        await forwardEvent(abortEvent);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        await forwardEvent({
          type: 'error',
          message,
        });
      }
      throw error;
    } finally {
      queue.close();
    }
  })();

  return {
    finalState,
    events: {
      [Symbol.asyncIterator]() {
        return {
          next: () => queue.next(),
        };
      },
    },
  };
}
