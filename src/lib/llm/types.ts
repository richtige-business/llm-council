// ============================================
// types.ts - LLM Provider Types
// 
// Zweck: Gemeinsame Typen für alle LLM Provider
// Verwendet von: Provider-Implementierungen, API Routes
// ============================================

// --------------------------------------------
// LLM Provider Enum
// --------------------------------------------

export type LLMProvider = 'anthropic' | 'openai';

// --------------------------------------------
// Message Types (gemeinsam für beide Provider)
// --------------------------------------------

// --------------------------------------------
// LLM Content Blocks (für Anbieter wie Anthropic)
// --------------------------------------------

export interface LLMTextBlock {
  type: 'text';
  text: string;
}

export interface LLMToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LLMToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

export type LLMContentBlock = LLMTextBlock | LLMToolUseBlock | LLMToolResultBlock;

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | LLMContentBlock[];
}

// --------------------------------------------
// JSON Schema Property-Typen (für Tool-Definitionen)
// --------------------------------------------

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
}

// --------------------------------------------
// Tool Definition (gemeinsam für beide Provider)
// --------------------------------------------

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, JSONSchemaProperty>;
      required?: string[];
    };
  };
}

// --------------------------------------------
// Tool Call (Provider-spezifisch, aber normalisiert)
// --------------------------------------------

export interface LLMToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// --------------------------------------------
// LLM Response (normalisiert für beide Provider)
// --------------------------------------------

export interface LLMResponse {
  message: string;
  // Optional: Originale Content-Blöcke (z.B. Tool-Use bei Anthropic)
  rawContent?: LLMContentBlock[];
  toolCalls?: LLMToolCall[];
  stopReason: 'end_turn' | 'max_tokens' | 'tool_use' | 'stop';
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

// --------------------------------------------
// LLM Request Config
// --------------------------------------------

export interface LLMRequestConfig {
  model: string;
  messages: LLMMessage[];
  system?: string; // Für Anthropic (wird in messages umgewandelt für OpenAI)
  tools?: LLMTool[];
  maxTokens?: number;
  temperature?: number;
  toolResults?: Array<{
    toolCallId: string;
    content: string;
  }>;
}

// --------------------------------------------
// LLM Client Interface
// Abstraktion für beide Provider
// --------------------------------------------

export interface LLMClient {
  // Provider-Name
  provider: LLMProvider;
  
  // Generiere eine Antwort
  generate(config: LLMRequestConfig): Promise<LLMResponse>;
  
  // Streaming Support (optional)
  stream?(config: LLMRequestConfig): AsyncIterable<string>;
  
  // Verfügbare Modelle für diesen Provider
  getAvailableModels(): Array<{
    id: string;
    name: string;
    description?: string;
  }>;
}
