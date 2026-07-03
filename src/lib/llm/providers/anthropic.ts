// ============================================
// anthropic.ts - Anthropic Claude Provider
// 
// Zweck: Implementierung des LLM Clients für Anthropic Claude
// Verwendet von: LLM Client Factory
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ContentBlock, TextBlock, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages';
import type { 
  LLMClient, 
  LLMRequestConfig, 
  LLMResponse, 
  LLMToolCall, 
  LLMContentBlock,
} from '../types';

// --------------------------------------------
// Anthropic Provider Implementation
// --------------------------------------------

export class AnthropicProvider implements LLMClient {
  provider: 'anthropic' = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generate(config: LLMRequestConfig): Promise<LLMResponse> {
    // Konvertiere Tools zu Claude-Format
    const tools = config.tools?.map(tool => ({
      name: tool.function.name.replace(/\./g, '_'), // Claude nutzt _ statt .
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));

    // --------------------------------------------
    // Messages für Claude formatieren
    // Unterstützt Content-Blöcke (Text + Tool-Use)
    // --------------------------------------------

    const normalizeContentForClaude = (content: string | LLMContentBlock[]) => {
      if (typeof content === 'string') return content;
      return content.map(block => {
        if (block.type === 'text') {
          return { type: 'text' as const, text: block.text };
        }
        if (block.type === 'tool_use') {
          return { 
            type: 'tool_use' as const, 
            id: block.id, 
            name: block.name, 
            input: block.input,
          };
        }
        return {
          type: 'tool_result' as const,
          tool_use_id: block.tool_use_id,
          content: block.content,
        };
      });
    };

    const messages = config.messages
      .filter(m => m.role !== 'system') // System wird separat übergeben
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user' as const,
        content: normalizeContentForClaude(msg.content),
      }));

    // Tool Results hinzufügen falls vorhanden
    if (config.toolResults && config.toolResults.length > 0) {
      // Füge Tool Results als user messages hinzu
      for (const toolResult of config.toolResults) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: toolResult.toolCallId,
              content: toolResult.content,
            },
          ],
        });
      }
    }

    // System Prompt kombinieren
    const systemPrompt = [
      ...config.messages.filter(m => m.role === 'system').map(m => m.content),
      config.system,
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await this.client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      system: systemPrompt || undefined,
      messages: messages as MessageParam[],
      tools: tools && tools.length > 0 ? tools : undefined,
    });

    // Response normalisieren - nutze Anthropic SDK-Typen
    const textContent = response.content.find((c): c is TextBlock => c.type === 'text');
    const toolUseBlocks = response.content.filter((c): c is ToolUseBlock => c.type === 'tool_use');
    const rawContent: LLMContentBlock[] = response.content.map((block: ContentBlock) => {
      if (block.type === 'text') {
        return { type: 'text', text: block.text } as LLMContentBlock;
      }
      if (block.type === 'tool_use') {
        return { 
          type: 'tool_use', 
          id: block.id, 
          name: block.name, 
          input: block.input as Record<string, unknown>,
        } as LLMContentBlock;
      }
      return null;
    }).filter((block): block is LLMContentBlock => block !== null);

    const toolCalls: LLMToolCall[] = toolUseBlocks.map(block => ({
      id: block.id,
      name: block.name.replace(/_/g, '.'), // Zurück zu . Format
      input: block.input as Record<string, unknown>,
    }));

    // Stop Reason mappen
    let stopReason: LLMResponse['stopReason'] = 'end_turn';
    if (response.stop_reason === 'tool_use') {
      stopReason = 'tool_use';
    } else if (response.stop_reason === 'max_tokens') {
      stopReason = 'max_tokens';
    } else if (response.stop_reason === 'stop_sequence') {
      stopReason = 'stop';
    }

    return {
      message: textContent?.text || '',
      rawContent: rawContent.length > 0 ? rawContent : undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      stopReason,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  }

  // --------------------------------------------
  // Streaming Support (Token-by-Token)
  // --------------------------------------------

  async *stream(config: LLMRequestConfig): AsyncIterable<string> {
    // Konvertiere Tools zu Claude-Format
    const tools = config.tools?.map(tool => ({
      name: tool.function.name.replace(/\./g, '_'),
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));

    // Messages für Claude formatieren
    const messages = config.messages
      .filter(m => m.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user' as const,
        content: msg.content,
      }));

    // Tool Results hinzufügen falls vorhanden
    if (config.toolResults && config.toolResults.length > 0) {
      for (const toolResult of config.toolResults) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: toolResult.toolCallId,
              content: toolResult.content,
            },
          ],
        });
      }
    }

    // System Prompt kombinieren
    const systemPrompt = [
      ...config.messages.filter(m => m.role === 'system').map(m => m.content),
      config.system,
    ]
      .filter(Boolean)
      .join('\n\n');

    // Streaming via Anthropic SDK
    const stream = this.client.messages.stream({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.7,
      system: systemPrompt || undefined,
      messages: messages as MessageParam[],
      tools: tools && tools.length > 0 ? tools : undefined,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && 'delta' in event && 'text' in event.delta) {
        yield event.delta.text;
      }
    }
  }

  getAvailableModels(): Array<{ id: string; name: string; description?: string }> {
    return [
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        description: 'Standard - Schnell und sehr fähig',
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Schnell, gut für die meisten Aufgaben',
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Leistungsstark für komplexe Aufgaben',
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Schnellstes Modell für einfache Aufgaben',
      },
    ];
  }
}
