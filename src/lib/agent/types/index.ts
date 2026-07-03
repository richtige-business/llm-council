// ============================================
// index.ts - Zentrale Typ-Exports für das Agent-System
// 
// Zweck: Re-exportiert alle Agent-Typen
// Verwendet von: Gesamte Agent-Infrastruktur
// ============================================

// --------------------------------------------
// Basis-Typen (bestehend)
// --------------------------------------------

export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: { type: string };
  default?: unknown;
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required?: readonly string[];
}

// Legacy AgentTool (für Rückwärtskompatibilität)
export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  module: 'calendar' | 'inbox' | 'browser' | 'app' | 'system';
}

// Tool Result (Legacy)
export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export interface AgentToolCallResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

export interface AgentToolCall {
  name: string;
  input?: Record<string, unknown>;
  durationMs?: number;
  result: AgentToolCallResult;
}

// --------------------------------------------
// Agent Action Types
// --------------------------------------------

export interface AgentAction {
  type: AgentActionType;
  module: string;
  payload: Record<string, unknown>;
  executed: boolean;
  timestamp: number;
}

export type AgentActionType =
  // Calendar Actions
  | 'calendar.openTab'
  | 'calendar.createEvent'
  | 'calendar.openModal'
  | 'calendar.deleteEvent'
  // Inbox Actions
  | 'inbox.openTab'
  | 'inbox.openCompose'
  | 'inbox.searchEmails'
  | 'inbox.emailSent'
  | 'inbox.markEmail'
  | 'inbox.setFilters'
  // Browser Actions
  | 'browser.openTab'
  | 'browser.navigate'
  | 'browser.addBookmark'
  // App Actions
  | 'app.openModule'
  | 'app.navigate'
  | 'app.changeBackground'
  | 'app.toggleSidebar'
  // Generic (für Erweiterbarkeit)
  | string;

// --------------------------------------------
// API Request/Response Types
// --------------------------------------------

export interface AgentRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AgentResponse {
  message: string;
  actions: AgentAction[];
  toolCalls?: AgentToolCall[];
}

// --------------------------------------------
// Claude API Types
// --------------------------------------------

export interface ClaudeToolDefinition {
  name: string;
  description: string;
  input_schema: ToolParameterSchema;
}

export interface ClaudeToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ClaudeToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
}

// --------------------------------------------
// Agent State (für Frontend Store)
// --------------------------------------------

export interface AgentState {
  isExecuting: boolean;
  currentAction: AgentAction | null;
  actionHistory: AgentAction[];
  pendingActions: AgentAction[];
}

// --------------------------------------------
// Neue Module Tool Types
// --------------------------------------------

export * from './module-tools';
