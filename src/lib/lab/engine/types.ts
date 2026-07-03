// ============================================
// LifeOS Module Builder Engine - Types
// 
// Zweck: TypeScript-Definitionen für die Engine
// Verwendet von: Alle Engine-Komponenten
// ============================================

// --------------------------------------------
// Datei-Artifact Typen (inspiriert von bolt.diy/Chef)
// --------------------------------------------

export interface FileArtifact {
  path: string;
  content: string;
  language?: string;
}

export interface ModuleArtifact {
  id: string;
  title: string;
  files: FileArtifact[];
}

// --------------------------------------------
// Tool-Definitionen für den Builder-Agent
// --------------------------------------------

export interface BuilderTool {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  required: string[];
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// --------------------------------------------
// Agent-Message Typen
// --------------------------------------------

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  artifacts?: ModuleArtifact[];
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: ToolResult;
}

// --------------------------------------------
// Module Contract Typen
// --------------------------------------------

export interface ModuleContract {
  // Modul-Metadaten
  id: string;
  name: string;
  description: string;
  version: string;
  category: ModuleCategory;
  icon: string;
  
  // Kommunikation
  events: ModuleEvent[];
  
  // Agent-Integration
  tools: ModuleAgentTool[];
  systemPrompt: ModuleSystemPrompt;
  
  // UI-Integration
  widgets: ModuleWidget[];
  
  // Datei-Struktur
  files: ModuleFile[];
}

export type ModuleCategory = 
  | 'productivity'
  | 'health'
  | 'finance'
  | 'social'
  | 'education'
  | 'entertainment'
  | 'utility'
  | 'custom';

export interface ModuleEvent {
  name: string;
  description: string;
  payload: Record<string, string>;
  direction: 'emit' | 'subscribe' | 'both';
}

export interface ModuleAgentTool {
  id: string;
  name: string;
  description: string;
  category: 'read' | 'write' | 'update' | 'delete';
  parameters: ToolParameter[];
  returns: string;
  implementation: string;
  examples?: string[];
}

export interface ModuleSystemPrompt {
  description: string;
  capabilities: string[];
  limitations?: string[];
  useCases: string[];
  exampleInteractions?: string[];
}

export interface ModuleWidget {
  id: string;
  name: string;
  description: string;
  size: 'small' | 'medium' | 'large';
  defaultEnabled: boolean;
}

export interface ModuleFile {
  path: string;
  content: string;
  description?: string;
}

// --------------------------------------------
// Generation Options
// --------------------------------------------

export interface GenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  includeWidgets?: boolean;
  includeTools?: boolean;
  includeEvents?: boolean;
}

// --------------------------------------------
// Parser Callbacks
// --------------------------------------------

export interface ParserCallbacks {
  onArtifactStart?: (artifact: { id: string; title: string }) => void;
  onArtifactEnd?: (artifact: ModuleArtifact) => void;
  onFileStart?: (file: { path: string }) => void;
  onFileContent?: (file: FileArtifact) => void;
  onFileEnd?: (file: FileArtifact) => void;
  onText?: (text: string) => void;
  onError?: (error: Error) => void;
}



