// ============================================
// openai.ts - OpenAI Provider
// 
// Zweck: Implementierung des LLM Clients für OpenAI
// Verwendet von: LLM Client Factory
// ============================================

import OpenAI from 'openai';
import type { 
  LLMClient, 
  LLMRequestConfig, 
  LLMResponse, 
  LLMToolCall, 
  LLMContentBlock,
} from '../types';

// --------------------------------------------
// OpenAI Provider Implementation
// --------------------------------------------

// --------------------------------------------
// Hilfsfunktion: Content für OpenAI normalisieren
// OpenAI erwartet reinen Text, keine Content-Block-Arrays
// Wird von generate() und stream() genutzt
// --------------------------------------------

function normalizeContentForOpenAI(content: string | LLMContentBlock[]): string {
  if (typeof content === 'string') return content;
  return content
    .map(block => {
      if (block.type === 'text') return block.text;
      if (block.type === 'tool_use') return `[tool_use:${block.name}]`;
      return `[tool_result:${block.tool_use_id}]`;
    })
    .join('\n');
}

function isCodexModel(model: string): boolean {
  const lower = model.toLowerCase();
  return lower.startsWith('codex') || lower.includes('codex');
}

function isResponsesModel(model: string): boolean {
  const lower = model.toLowerCase();
  return isCodexModel(lower) || lower.startsWith('gpt-5');
}

function buildTextPromptForResponses(config: LLMRequestConfig): string {
  const lines: string[] = [];

  if (config.system?.trim()) {
    lines.push(`[system]\n${config.system.trim()}`);
  }

  for (const msg of config.messages) {
    const content = normalizeContentForOpenAI(msg.content);
    lines.push(`[${msg.role}]\n${content}`);
  }

  if (config.toolResults && config.toolResults.length > 0) {
    const toolResultsText = config.toolResults
      .map((tr) => `Tool Result (${tr.toolCallId}): ${tr.content}`)
      .join('\n\n');
    lines.push(`[tool_results]\n${toolResultsText}`);
  }

  return lines.join('\n\n');
}

function extractResponsesTextDelta(event: unknown): string | null {
  if (!event || typeof event !== 'object') return null;
  const maybe = event as {
    type?: string;
    delta?: string;
    text?: string;
  };

  if (maybe.type === 'response.output_text.delta' && typeof maybe.delta === 'string') {
    return maybe.delta;
  }

  if (maybe.type === 'response.delta' && typeof maybe.delta === 'string') {
    return maybe.delta;
  }

  if (maybe.type === 'response.output_text' && typeof maybe.text === 'string') {
    return maybe.text;
  }

  return null;
}

export class OpenAIProvider implements LLMClient {
  provider = 'openai' as const;
  private client: OpenAI;

  constructor(apiKey: string) {
    // Optional: z. B. https://openrouter.ai/api/v1 für OpenRouter (OPENAI_API_KEY = OpenRouter-Key)
    const baseURL = process.env.OPENAI_BASE_URL?.trim();
    this.client = new OpenAI(
      baseURL ? { apiKey, baseURL } : { apiKey },
    );
  }

  async generate(config: LLMRequestConfig): Promise<LLMResponse> {
    if (isResponsesModel(config.model)) {
      const response = await this.client.responses.create({
        model: config.model,
        input: buildTextPromptForResponses(config),
        max_output_tokens: config.maxTokens || 4096,
      });

      return {
        message: response.output_text || '',
        stopReason: 'end_turn',
        usage: {
          inputTokens: response.usage?.input_tokens,
          outputTokens: response.usage?.output_tokens,
        },
      };
    }

    // Messages für OpenAI formatieren
    // OpenAI nutzt system messages im messages Array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // System Prompt hinzufügen
    const systemMessages: string[] = [
      ...config.messages
        .filter(m => m.role === 'system')
        .map(m => normalizeContentForOpenAI(m.content)),
      config.system,
    ].filter(Boolean);

    if (systemMessages.length > 0) {
      messages.push({
        role: 'system',
        content: systemMessages.join('\n\n'),
      });
    }

    // User und Assistant Messages hinzufügen
    for (const msg of config.messages) {
      if (msg.role === 'system') continue; // Bereits oben hinzugefügt

      // Tool Results als separate Messages hinzufügen
      if (config.toolResults && config.toolResults.length > 0) {
        // Tool Results müssen vor der nächsten User-Message eingefügt werden
        // OpenAI erwartet: assistant (mit tool_calls) -> user (mit tool_results)
        // Wir müssen das hier anders handhaben - für jetzt einfach als Text anhängen
      }

      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: normalizeContentForOpenAI(msg.content),
      });
    }

    // Tool Results hinzufügen (falls vorhanden)
    if (config.toolResults && config.toolResults.length > 0) {
      // OpenAI erwartet Tool Results als separate Messages
      // Format: assistant message mit tool_calls, dann user message mit tool_results
      // Für jetzt: Füge Tool Results als Text hinzu
      const toolResultsText = config.toolResults
        .map(tr => `Tool Result (${tr.toolCallId}): ${tr.content}`)
        .join('\n\n');
      
      messages.push({
        role: 'user',
        content: toolResultsText,
      });
    }

    // Tools für OpenAI formatieren
    const tools = config.tools?.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('OpenAI API returned no choices');
    }

    const message = choice.message;

    // Tool Calls extrahieren
    const toolCalls: LLMToolCall[] = [];
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        try {
          const input = JSON.parse(toolCall.function.arguments || '{}');
          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            input,
          });
        } catch (e) {
          console.error('[OpenAI Provider] Fehler beim Parsen von Tool Arguments:', e);
        }
      }
    }

    // Stop Reason mappen
    let stopReason: LLMResponse['stopReason'] = 'end_turn';
    if (choice.finish_reason === 'tool_calls') {
      stopReason = 'tool_use';
    } else if (choice.finish_reason === 'length') {
      stopReason = 'max_tokens';
    } else if (choice.finish_reason === 'stop') {
      stopReason = 'stop';
    }

    return {
      message: message.content || '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason,
      usage: {
        inputTokens: response.usage?.prompt_tokens,
        outputTokens: response.usage?.completion_tokens,
      },
    };
  }

  // --------------------------------------------
  // Streaming Support (Token-by-Token)
  // --------------------------------------------

  async *stream(config: LLMRequestConfig): AsyncIterable<string> {
    if (isResponsesModel(config.model)) {
      const responseStream = await this.client.responses.create({
        model: config.model,
        input: buildTextPromptForResponses(config),
        max_output_tokens: config.maxTokens || 4096,
        stream: true,
      });

      for await (const event of responseStream) {
        const delta = extractResponsesTextDelta(event);
        if (delta) {
          yield delta;
        }
      }
      return;
    }

    // Messages für OpenAI formatieren
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    // System Prompt hinzufügen
    const systemMessages: string[] = [
      ...config.messages
        .filter(m => m.role === 'system')
        .map(m => normalizeContentForOpenAI(m.content)),
      config.system,
    ].filter(Boolean);

    if (systemMessages.length > 0) {
      messages.push({
        role: 'system',
        content: systemMessages.join('\n\n'),
      });
    }

    // User und Assistant Messages hinzufügen
    for (const msg of config.messages) {
      if (msg.role === 'system') continue;
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: normalizeContentForOpenAI(msg.content),
      });
    }

    const stream = await this.client.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  getAvailableModels(): Array<{ id: string; name: string; description?: string }> {
    return [
      {
        id: 'codex-mini-latest',
        name: 'Codex Mini (latest)',
        description: 'Codex-Modell für Coding-Workflows',
      },
      {
        id: 'gpt-5',
        name: 'GPT-5',
        description: 'Neueste Generation',
      },
      {
        id: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        description: 'Schneller & günstiger',
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Standard - Schnell und sehr fähig',
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Leistungsstark für komplexe Aufgaben',
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Schnellstes Modell für einfache Aufgaben',
      },
      {
        id: 'o1-preview',
        name: 'O1 Preview',
        description: 'Reasoning-Modell für komplexe Problemlösung',
      },
      {
        id: 'o1-mini',
        name: 'O1 Mini',
        description: 'Kleineres Reasoning-Modell',
      },
    ];
  }
}
