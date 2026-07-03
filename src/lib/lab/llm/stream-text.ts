// ============================================
// LifeOS Module Builder - Stream Text
// 
// Zweck: Streaming-Funktion für LLM-Aufrufe
// Portiert von: bolt.diy
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import { MAX_TOKENS } from './constants';

// --------------------------------------------
// Types
// --------------------------------------------

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamTextOptions {
  messages: Message[];
  systemPrompt: string;
  onChunk?: (chunk: string) => void;
  onToolUse?: (toolName: string, toolInput: unknown) => void;
  signal?: AbortSignal;
}

export interface StreamTextResult {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// --------------------------------------------
// Streaming Text Generation
// --------------------------------------------

export async function* streamText(options: StreamTextOptions): AsyncGenerator<string, StreamTextResult> {
  const { messages, systemPrompt, signal } = options;
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');
  }

  const client = new Anthropic({ apiKey });
  
  // Erstelle den Stream
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
  });

  let fullText = '';
  let usage = { inputTokens: 0, outputTokens: 0 };

  // Stream verarbeiten
  for await (const event of stream) {
    if (signal?.aborted) {
      stream.controller.abort();
      break;
    }

    if (event.type === 'content_block_delta') {
      const delta = event.delta;
      if ('text' in delta) {
        fullText += delta.text;
        yield delta.text;
      }
    }

    if (event.type === 'message_delta') {
      if (event.usage) {
        usage.outputTokens = event.usage.output_tokens;
      }
    }
  }

  // Finale Message für Usage
  const finalMessage = await stream.finalMessage();
  if (finalMessage.usage) {
    usage = {
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    };
  }

  return {
    text: fullText,
    usage,
  };
}

// --------------------------------------------
// Non-Streaming Variante (für einfache Calls)
// --------------------------------------------

export async function generateText(options: Omit<StreamTextOptions, 'onChunk'>): Promise<StreamTextResult> {
  const generator = streamText(options);
  let result: StreamTextResult = { text: '' };
  
  // Alle Chunks konsumieren
  while (true) {
    const { done, value } = await generator.next();
    if (done) {
      result = value;
      break;
    }
  }
  
  return result;
}



