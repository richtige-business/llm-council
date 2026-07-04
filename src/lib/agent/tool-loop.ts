// ============================================
// tool-loop.ts - Gemeinsame Tool-Call-Schleife
//
// Zweck: Extrahiert die agentische Tool-Use-Schleife aus
//        /api/agent/route.ts, damit sie auch von der
//        Streaming-Route (fuer Council-Mitglieder mit Skills)
//        wiederverwendet werden kann.
// Verwendet von: /api/agent/route.ts, /api/agent/stream/route.ts
// ============================================

import { toolRegistry } from './registry/tool-registry';
import { createLogger } from '@/lib/logger';
import { DEFAULT_USER_ID } from '@/lib/services/user-service';
import type { AgentAction, ModuleToolResult } from './types';
import type { LLMClient, LLMContentBlock, LLMMessage, LLMResponse, LLMTool } from '@/lib/llm/types';

const log = createLogger('ToolLoop');

export function generateTraceId(): string {
  return crypto.randomUUID();
}

// --------------------------------------------
// Hardening: Maximale Tool-Iterationen
// Verhindert endlose Tool-Loops
// --------------------------------------------

export const MAX_TOOL_ITERATIONS = 5;

// --------------------------------------------
// Hardening: Tool-Result Truncation
// Begrenzt die Groesse von Tool-Ergebnissen, die an das LLM gehen
// --------------------------------------------

const MAX_RESULT_CHARS = 2000;
const MAX_ARRAY_ITEMS = 5;

export function truncateToolResult(result: unknown): unknown {
  if (result === null || result === undefined) return result;

  if (typeof result === 'string') {
    if (result.length > MAX_RESULT_CHARS) {
      return result.slice(0, MAX_RESULT_CHARS) + ' [truncated]';
    }
    return result;
  }

  if (Array.isArray(result)) {
    const truncated = result.slice(0, MAX_ARRAY_ITEMS).map((item) => {
      if (typeof item === 'object' && item !== null) {
        const summaryFields = ['id', 'subject', 'title', 'name', 'from', 'sender', 'date', 'email', 'status', 'key', 'value', 'category', 'url', 'snippet'];
        const summary: Record<string, unknown> = {};
        for (const field of summaryFields) {
          if (field in item) {
            summary[field] = (item as Record<string, unknown>)[field];
          }
        }
        return Object.keys(summary).length > 0 ? summary : item;
      }
      return item;
    });

    if (result.length > MAX_ARRAY_ITEMS) {
      return {
        items: truncated,
        totalCount: result.length,
        note: `Zeige ${MAX_ARRAY_ITEMS} von ${result.length} Ergebnissen`,
      };
    }
    return truncated;
  }

  if (typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    const truncated: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      truncated[key] = truncateToolResult(value);
    }
    return truncated;
  }

  return result;
}

// --------------------------------------------
// Helfer: Assistant-Content fuer Tool-Loop bauen
// Sichert Tool-Use Bloecke fuer Anthropic
// --------------------------------------------

export function buildAssistantContentForToolLoop(
  llmProvider: string,
  llmResponse: { message: string; rawContent?: LLMContentBlock[]; toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }> }
): string | LLMContentBlock[] {
  if (llmResponse.rawContent && llmResponse.rawContent.length > 0) {
    return llmResponse.rawContent;
  }
  if (llmProvider === 'anthropic' && llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
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
    if (blocks.length > 0) return blocks;
  }
  return llmResponse.message && llmResponse.message.trim()
    ? llmResponse.message
    : '(Tool-Ausführung läuft...)';
}

// --------------------------------------------
// runAgentToolLoop - fuehrt die Tool-Use-Schleife aus
// bis das LLM eine finale Antwort ohne weitere Tool-Calls liefert
// (oder MAX_TOOL_ITERATIONS erreicht ist).
// --------------------------------------------

export interface ToolLoopResult {
  message: string;
  toolCalls: Array<{
    name: string;
    input?: Record<string, unknown>;
    durationMs?: number;
    result: ModuleToolResult;
  }>;
  actions: AgentAction[];
}

export async function runAgentToolLoop(options: {
  llmClient: LLMClient;
  llmProvider: string;
  model: string;
  messages: LLMMessage[];
  system: string;
  tools: LLMTool[];
  maxTokens?: number;
  temperature?: number;
  traceId: string;
  requestingModuleId?: string;
}): Promise<ToolLoopResult> {
  const { llmClient, llmProvider, model, messages, system, tools, maxTokens, temperature, traceId, requestingModuleId } = options;

  const actions: AgentAction[] = [];
  const toolCalls: ToolLoopResult['toolCalls'] = [];

  let llmResponse: LLMResponse = await llmClient.generate({
    model,
    messages,
    system,
    tools: tools.length > 0 ? tools : undefined,
    maxTokens,
    temperature,
  });

  let toolIteration = 0;

  while (llmResponse.stopReason === 'tool_use' && llmResponse.toolCalls && toolIteration < MAX_TOOL_ITERATIONS) {
    toolIteration++;
    log.debug(`Tool-Iteration ${toolIteration}/${MAX_TOOL_ITERATIONS}`);

    const toolResults: Array<{ toolCallId: string; content: string }> = [];

    for (const toolCall of llmResponse.toolCalls) {
      const toolNameForRegistry = toolCall.name.replace(/_/g, '.');
      const startedAt = Date.now();
      const result = await toolRegistry.execute(toolNameForRegistry, toolCall.input, {
        userId: DEFAULT_USER_ID,
        requestingModuleId: requestingModuleId || 'agent',
        traceId,
      });
      const durationMs = Date.now() - startedAt;

      const truncatedData = truncateToolResult(result.data);
      const toolResultContent = JSON.stringify({
        success: result.success,
        data: truncatedData,
        error: result.error,
        message: result.success ? 'Tool erfolgreich ausgeführt' : result.error?.message || 'Fehler bei Tool-Ausführung',
      });

      toolResults.push({ toolCallId: toolCall.id, content: toolResultContent });
      toolCalls.push({ name: toolNameForRegistry, input: toolCall.input, durationMs, result });

      const originalToolId = toolRegistry.fromClaudeName(toolCall.name);
      const tool = toolRegistry.get(originalToolId);
      if (tool?.createAction) {
        const action = tool.createAction(toolCall.input, result);
        if (action) actions.push(action);
      }
    }

    const additionalMessages: LLMMessage[] = [];
    if (toolIteration === MAX_TOOL_ITERATIONS) {
      log.warn(`Max Tool-Iterationen (${MAX_TOOL_ITERATIONS}) erreicht - erzwinge finale Antwort`);
      additionalMessages.push({
        role: 'user',
        content: 'You have reached the maximum number of tool calls. Please respond with what you have so far. Do not call any more tools.',
      });
    }

    const assistantContent = buildAssistantContentForToolLoop(llmProvider, llmResponse);

    llmResponse = await llmClient.generate({
      model,
      messages: [...messages, { role: 'assistant', content: assistantContent }, ...additionalMessages],
      system,
      tools: toolIteration < MAX_TOOL_ITERATIONS && tools.length > 0 ? tools : undefined,
      maxTokens,
      temperature,
      toolResults,
    });
  }

  return {
    message: llmResponse.message || 'Ich konnte keine Antwort generieren.',
    toolCalls,
    actions,
  };
}
