// ============================================
// langgraph-llm-adapter.ts - Adapter zwischen LLMClient und LangGraph
//
// Zweck: Kapselt createLLMClient() und stellt eine einheitliche
//        API für Text-, Structured- und Streaming-Aufrufe bereit.
// Verwendet von: group-orchestrator
// ============================================

import { createLLMClient } from '@/lib/llm/client';
import type {
  LLMMessage,
  LLMProvider,
  LLMRequestConfig,
  LLMResponse,
  LLMTool,
} from '@/lib/llm/types';
import {
  DEFAULT_AGENT_CONFIG,
  useAgentConfigStore,
} from '@/lib/agent/stores/agent-config-store';

// --------------------------------------------
// Laufzeit-Metriken für Token- und Kosten-Tracking
// --------------------------------------------

export interface LangGraphUsageSummary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface LangGraphTextResult {
  text: string;
  response: LLMResponse;
  usage: LangGraphUsageSummary;
  provider: LLMProvider;
  model: string;
}

export interface LangGraphStructuredResult<T> {
  data: T;
  rawText: string;
  response: LLMResponse;
  usage: LangGraphUsageSummary;
  provider: LLMProvider;
  model: string;
}

export interface LangGraphInvocationOptions {
  moduleId: string;
  messages: LLMMessage[];
  system?: string;
  providerOverride?: LLMProvider;
  modelOverride?: string;
  maxTokensOverride?: number;
  temperatureOverride?: number;
  tools?: LLMTool[];
  toolResults?: LLMRequestConfig['toolResults'];
}

export interface LangGraphStructuredInvocationOptions<T>
  extends LangGraphInvocationOptions {
  validator: (value: unknown) => { valid: boolean; data?: T; errors: string[] };
  schemaPrompt: string;
  retries?: number;
}

// --------------------------------------------
// Preis-Tabelle für grobe Kostenschätzung
// USD pro 1M Tokens, absichtlich konservativ und lokal
// gehalten, damit das Budget-Tracking nicht blockiert.
// --------------------------------------------

const MODEL_PRICING_USD_PER_1M_TOKENS: Record<
  string,
  { input: number; output: number }
> = {
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'gpt-4o': { input: 5, output: 15 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'o1-preview': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
};

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

function stripJsonCodeFences(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function safeJsonParse(value: string): unknown {
  const normalized = stripJsonCodeFences(value);

  try {
    return JSON.parse(normalized);
  } catch {
    const firstBrace = normalized.indexOf('{');
    const lastBrace = normalized.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('Structured Output ist kein gültiges JSON-Objekt.');
    }
    return JSON.parse(normalized.slice(firstBrace, lastBrace + 1));
  }
}

function buildUsageSummary(model: string, response: LLMResponse): LangGraphUsageSummary {
  const inputTokens = response.usage?.inputTokens ?? 0;
  const outputTokens = response.usage?.outputTokens ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const pricing = MODEL_PRICING_USD_PER_1M_TOKENS[model];

  const estimatedCost = pricing
    ? ((inputTokens / 1_000_000) * pricing.input) + ((outputTokens / 1_000_000) * pricing.output)
    : 0;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
  };
}

function resolveInvocationConfig(options: LangGraphInvocationOptions): {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
} {
  const config = useAgentConfigStore.getState().getConfig(options.moduleId);

  return {
    provider: options.providerOverride || config.llmProvider || DEFAULT_AGENT_CONFIG.llmProvider,
    model: options.modelOverride || config.llmModel || DEFAULT_AGENT_CONFIG.llmModel,
    temperature: options.temperatureOverride ?? config.temperature ?? DEFAULT_AGENT_CONFIG.temperature,
    maxTokens: options.maxTokensOverride ?? config.maxTokens ?? DEFAULT_AGENT_CONFIG.maxTokens,
  };
}

async function invokeRaw(options: LangGraphInvocationOptions): Promise<LangGraphTextResult> {
  const resolved = resolveInvocationConfig(options);
  const client = createLLMClient(resolved.provider);

  const response = await client.generate({
    model: resolved.model,
    messages: options.messages,
    system: options.system,
    tools: options.tools,
    toolResults: options.toolResults,
    maxTokens: resolved.maxTokens,
    temperature: resolved.temperature,
  });

  return {
    text: response.message || '',
    response,
    usage: buildUsageSummary(resolved.model, response),
    provider: resolved.provider,
    model: resolved.model,
  };
}

// --------------------------------------------
// Öffentliche Adapter-Factory
// Die Factory hält die API klein und testbar.
// --------------------------------------------

export function createLangGraphLLMAdapter() {
  return {
    async invokeText(options: LangGraphInvocationOptions): Promise<LangGraphTextResult> {
      return invokeRaw(options);
    },

    async invokeStructured<T>(
      options: LangGraphStructuredInvocationOptions<T>,
    ): Promise<LangGraphStructuredResult<T>> {
      const retries = options.retries ?? 2;
      const baseSystem = options.system ? `${options.system}\n\n${options.schemaPrompt}` : options.schemaPrompt;

      let lastError = 'Unbekannter Structured-Output-Fehler.';

      for (let attempt = 0; attempt <= retries; attempt += 1) {
        const system = attempt === 0
          ? baseSystem
          : `${baseSystem}\n\nThe previous output was invalid. Return valid JSON only.`;

        const result = await invokeRaw({
          ...options,
          system,
        });

        try {
          const parsed = safeJsonParse(result.text);
          const validation = options.validator(parsed);

          if (validation.valid && validation.data !== undefined) {
            return {
              data: validation.data,
              rawText: result.text,
              response: result.response,
              usage: result.usage,
              provider: result.provider,
              model: result.model,
            };
          }

          lastError = validation.errors.join(' ') || 'Structured Output konnte nicht validiert werden.';
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
      }

      throw new Error(`Structured Output fehlgeschlagen: ${lastError}`);
    },

    async *streamText(
      options: LangGraphInvocationOptions,
    ): AsyncIterable<string> {
      const resolved = resolveInvocationConfig(options);
      const client = createLLMClient(resolved.provider);

      if (client.stream) {
        for await (const chunk of client.stream({
          model: resolved.model,
          messages: options.messages,
          system: options.system,
          maxTokens: resolved.maxTokens,
          temperature: resolved.temperature,
        })) {
          yield chunk;
        }
        return;
      }

      const fallback = await client.generate({
        model: resolved.model,
        messages: options.messages,
        system: options.system,
        maxTokens: resolved.maxTokens,
        temperature: resolved.temperature,
      });

      if (fallback.message) {
        yield fallback.message;
      }
    },

    estimateResponseUsage(model: string, response: LLMResponse): LangGraphUsageSummary {
      return buildUsageSummary(model, response);
    },
  };
}
