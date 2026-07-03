// ============================================
// types.ts - Module Builder Type Definitions
// 
// Zweck: TypeScript Interfaces für den Module Builder
// Verwendet von: Builder Store, Components, API
// ============================================

import type { ModuleCategory, WidgetSize } from '@/types';

// --------------------------------------------
// Modul-Datei Repräsentation
// Jede Datei im generierten Modul
// --------------------------------------------

export interface ModuleFile {
  // Relativer Pfad innerhalb des Moduls (z.B. "components/TodoPage.tsx")
  path: string;
  // Dateiinhalt
  content: string;
  // Datei-Typ für Syntax Highlighting
  language: 'typescript' | 'json' | 'css';
  // Beschreibung was die Datei tut
  description: string;
  // Timestamp der letzten Änderung
  updatedAt: number;
}

// --------------------------------------------
// Widget-Definition im Builder
// --------------------------------------------

export interface BuilderWidget {
  // Widget Name (z.B. "TodoWidget")
  name: string;
  // Widget Größe
  size: WidgetSize;
  // Generierter Code
  code: string;
  // Vorschau-Status
  previewReady: boolean;
}

// --------------------------------------------
// Modul im Builder-Prozess
// Repräsentiert das aktuell gebaute Modul
// --------------------------------------------

export interface BuildingModule {
  // Eindeutige ID (kebab-case, z.B. "todo-list")
  id: string;
  // Anzeigename (z.B. "Todo List")
  name: string;
  // Kurzbeschreibung
  description: string;
  // Kategorie für Sidebar/Library
  category: ModuleCategory;
  // Lucide Icon Name
  icon: string;
  // Version (Standard: 1.0.0)
  version: string;
  // Alle generierten Dateien
  files: ModuleFile[];
  // Generierte Widgets
  widgets: BuilderWidget[];
  // Event-Definitionen für Inter-Modul-Kommunikation
  events: ModuleEventDefinition[];
  // Berechtigungen die das Modul benötigt
  permissions: string[];
  
  // ========================================
  // AGENT-ORCHESTRIERUNG
  // Diese Felder sind essentiell für Agents
  // ========================================
  
  // Tools die Agents aufrufen können
  tools: ModuleTool[];
  // System Prompt für Agent-Kontext
  systemPrompt: ModuleSystemPrompt;
  
  // Erstellungszeitpunkt
  createdAt: number;
  // Letzte Aktualisierung
  updatedAt: number;
  // Status
  status: 'drafting' | 'generating' | 'ready' | 'error' | 'published';
  // Fehler falls vorhanden
  error?: string;
}

// --------------------------------------------
// Event-Definition für Module
// --------------------------------------------

export interface ModuleEventDefinition {
  // Event Name (z.B. "todo.created")
  name: string;
  // Beschreibung
  description: string;
  // Payload-Schema (vereinfacht)
  payloadFields: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
  }[];
}

// --------------------------------------------
// JSONSchema Types (Standard für API-Definition)
// Ermöglicht typsichere Inter-Modul-Kommunikation
// --------------------------------------------

export interface JSONSchema {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
  description?: string;
  // String
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: 'email' | 'uri' | 'date' | 'date-time' | 'uuid';
  enum?: (string | number)[];
  // Number
  minimum?: number;
  maximum?: number;
  // Array
  items?: JSONSchema;
  minItems?: number;
  maxItems?: number;
  // Object
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  // Default
  default?: unknown;
}

// --------------------------------------------
// Module Tool - Funktion die Agents aufrufen können
// Diese Tools ermöglichen Agent-Orchestrierung
// ERWEITERT: Jetzt mit JSONSchema für typsichere API
// --------------------------------------------

export interface ModuleToolParameter {
  // Parameter-Name
  name: string;
  // Datentyp
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  // Beschreibung für den Agent
  description: string;
  // Pflichtfeld?
  required: boolean;
  // Standardwert (optional)
  default?: unknown;
  // Enum-Werte (optional)
  enum?: string[];
}

export interface ModuleTool {
  // Eindeutige Tool-ID (z.B. "create_todo")
  id: string;
  // Anzeigename (z.B. "Todo erstellen")
  name: string;
  // Ausführliche Beschreibung für Agents
  description: string;
  // Kategorie des Tools
  category: 'read' | 'write' | 'update' | 'delete' | 'action' | 'query';
  // Input-Parameter (legacy format)
  parameters: ModuleToolParameter[];
  // NEU: JSONSchema für Input (Standard-konform)
  inputSchema?: JSONSchema;
  // Rückgabe-Typ Beschreibung
  returns: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'void';
    description: string;
  };
  // NEU: JSONSchema für Output (Standard-konform)
  outputSchema?: JSONSchema;
  // TypeScript/JavaScript Implementierung
  implementation: string;
  // Beispiel-Aufrufe für den Agent
  examples: {
    description: string;
    input: Record<string, unknown>;
    expectedOutput?: unknown;
  }[];
  // Benötigte Berechtigungen
  requiredPermissions: string[];
}

// --------------------------------------------
// Module API Definition
// Wird in module.json unter "api" gespeichert
// --------------------------------------------

export interface ModuleAction {
  // Eindeutige Action-ID (snake_case)
  name: string;
  // Beschreibung für Agent-Discovery
  description: string;
  // Input-Schema (JSONSchema)
  input: JSONSchema;
  // Output-Schema (JSONSchema)
  output: JSONSchema;
  // Beispiele für den Agent
  examples?: {
    description: string;
    input: Record<string, unknown>;
    output?: unknown;
  }[];
}

export interface ModuleEvent {
  // Event-Name (snake_case, z.B. "contact_created")
  name: string;
  // Beschreibung
  description: string;
  // Payload-Schema
  payload: JSONSchema;
}

export interface ModuleAPI {
  // Actions die das Modul anbietet
  actions: ModuleAction[];
  // Events die das Modul emittieren kann
  events: ModuleEvent[];
}

// --------------------------------------------
// Erweitertes Module Manifest
// module.json mit optionaler API-Definition
// --------------------------------------------

export interface ModuleManifest {
  // Pflichtfelder
  id: string;
  name: string;
  icon: string;
  entry: string;
  // Optionale Metadaten
  description?: string;
  version?: string;
  category?: string;
  author?: string;
  tags?: string[];
  // NEU: API-Definition für Agent-Orchestrierung
  api?: ModuleAPI;
  // Berechtigungen
  permissions?: ('storage' | 'notifications' | 'network' | 'calendar' | 'contacts')[];
}

// --------------------------------------------
// Module System Prompt
// Kontext für Agents über das Modul
// --------------------------------------------

export interface ModuleSystemPrompt {
  // Haupt-Beschreibung des Moduls für Agents
  description: string;
  // Fähigkeiten des Moduls (was kann es tun?)
  capabilities: string[];
  // Einschränkungen (was kann es NICHT tun?)
  limitations: string[];
  // Wann sollte ein Agent dieses Modul verwenden?
  useCases: string[];
  // Wann sollte ein Agent dieses Modul NICHT verwenden?
  antiPatterns: string[];
  // Beispiel-Interaktionen
  exampleInteractions: {
    userIntent: string;
    agentAction: string;
    toolsUsed: string[];
  }[];
  // Kontext über Datenstrukturen
  dataContext: string;
  // Priorität bei Konflikten mit anderen Modulen (1-10)
  priority: number;
}

// --------------------------------------------
// Chat-Nachricht im Builder
// --------------------------------------------

export interface BuilderMessage {
  // Eindeutige ID
  id: string;
  // Rolle (user oder assistant)
  role: 'user' | 'assistant';
  // Nachrichteninhalt
  content: string;
  // Zeitstempel
  timestamp: number;
  // Generierte Dateien (bei assistant)
  generatedFiles?: string[];
  // Status der Generierung
  status?: 'pending' | 'streaming' | 'complete' | 'error';
}

// --------------------------------------------
// Builder Session
// Eine komplette Builder-Sitzung
// --------------------------------------------

export interface BuilderSession {
  // Session ID
  id: string;
  // Chat-Verlauf
  messages: BuilderMessage[];
  // Aktuelles Modul
  module: BuildingModule | null;
  // Ausgewählte Datei für Preview
  selectedFile: string | null;
  // Aktiver Tab (chat, code, preview)
  activeTab: 'chat' | 'code' | 'preview' | 'widgets';
  // Session-Start
  startedAt: number;
}

// --------------------------------------------
// API Request/Response Types
// --------------------------------------------

export interface BuilderGenerateRequest {
  // Aktuelle Chat-Nachrichten
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  // Aktuelles Modul (falls vorhanden)
  currentModule: BuildingModule | null;
  // Spezifische Aktion (optional)
  action?: 'create' | 'update' | 'add_widget' | 'add_event' | 'fix_error';
}

export interface BuilderGenerateResponse {
  // Antwort-Text
  message: string;
  // Generierte/aktualisierte Dateien
  files?: ModuleFile[];
  // Modul-Metadaten
  moduleInfo?: Partial<BuildingModule>;
  // Widgets
  widgets?: BuilderWidget[];
  // Events
  events?: ModuleEventDefinition[];
  // Tools für Agent-Orchestrierung
  tools?: ModuleTool[];
  // System Prompt für Agents
  systemPrompt?: ModuleSystemPrompt;
  // Fehler
  error?: string;
}

// --------------------------------------------
// Tool-Definitionen für den Agent
// --------------------------------------------

export interface AgentTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

// --------------------------------------------
// Template Types
// --------------------------------------------

export interface ModuleTemplate {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  files: Omit<ModuleFile, 'updatedAt'>[];
  widgets: Omit<BuilderWidget, 'previewReady'>[];
}

// --------------------------------------------
// Preview State
// --------------------------------------------

export interface PreviewState {
  // Ob Preview aktiv ist
  active: boolean;
  // Fehler beim Kompilieren
  compileErrors: string[];
  // Laufzeit-Fehler
  runtimeErrors: string[];
  // Letzte erfolgreiche Kompilierung
  lastSuccessfulCompile: number | null;
}

