// ============================================
// module-tools.ts - Typen für das modulare Agent-Tool-System
// 
// Zweck: Definiert Typen für Tools mit eingebetteter Ausführungslogik
// Verwendet von: Tool Registry, Module Tools, API Route
// ============================================

import type { ToolParameterSchema, AgentAction } from './index';

// --------------------------------------------
// Tool Effect Types
// Deklariert welche Side-Effects ein Tool hat
// --------------------------------------------

export type ToolEffect = 
  | 'time'      // Nutzt aktuelle Zeit
  | 'network'   // HTTP-Requests
  | 'random'    // Zufallszahlen
  | 'storage'   // Lesen/Schreiben in DB
  | 'ui'        // UI-Änderungen
  ;

// --------------------------------------------
// Error Codes für Tool-Ausführung
// Standardisierte Fehler-Codes
// --------------------------------------------

export type ToolErrorCode = 
  | 'VALIDATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'TOOL_NOT_FOUND'
  | 'EXECUTION_ERROR'
  | 'NO_ACCOUNT'
  | 'TOKEN_EXPIRED'
  | 'SEND_FAILED'
  | 'NOT_IMPLEMENTED'
  ;

// --------------------------------------------
// Tool Execution Context
// Kontext der bei jeder Tool-Ausführung übergeben wird
// --------------------------------------------

export interface ToolExecutionContext {
  // Welcher User führt das Tool aus?
  userId: string;
  
  // Von welchem Modul wird das Tool aufgerufen?
  // (für Cross-Module-Calls und Permission-Checks)
  requestingModuleId: string;
  
  // Trace-ID für Logging und Debugging
  traceId: string;
}

// --------------------------------------------
// Tool Result
// Standardisiertes Ergebnis einer Tool-Ausführung
// --------------------------------------------

export interface ModuleToolResult {
  // War die Ausführung erfolgreich?
  success: boolean;
  
  // Optionale Daten die zurückgegeben werden
  data?: unknown;
  
  // Fehler-Details falls success = false
  error?: {
    code: ToolErrorCode;
    message: string;
  };
  
  // Events die emittiert werden sollen (für Event Bus)
  events?: Array<{
    type: string;
    payload: unknown;
    sourceModuleId: string;
    timestamp: number;
    traceId: string;
  }>;
}

// --------------------------------------------
// Module Tool Definition
// Ein Tool mit eingebetteter Ausführungslogik
// --------------------------------------------

export interface ModuleTool {
  // ========================================
  // Identität
  // ========================================
  
  // Globale Tool-ID im Format "moduleId.toolName"
  // Beispiele: "inbox.sendEmail", "calendar.createEvent"
  id: string;
  
  // Anzeigename des Tools
  name: string;
  
  // Beschreibung für Claude (was macht das Tool?)
  description: string;
  
  // Zu welchem Modul gehört das Tool?
  module: string;
  
  // ========================================
  // Schema
  // ========================================
  
  // Input-Schema im JSON Schema Format
  inputSchema: ToolParameterSchema;
  
  // Optionales Output-Schema
  outputSchema?: ToolParameterSchema;
  
  // ========================================
  // Metadaten
  // ========================================
  
  // Welche Side-Effects hat das Tool?
  effects: ToolEffect[];
  
  // Soll der User vor Ausführung gefragt werden?
  // (Advisory - wird nicht vom System enforced)
  requiresConfirmation: boolean;
  
  // Ist das Tool idempotent?
  // (Mehrfache Ausführung mit gleichen Inputs = gleiches Ergebnis)
  isIdempotent?: boolean;
  
  // ========================================
  // Ausführung
  // ========================================
  
  // Die eigentliche Ausführungslogik
  execute: (
    input: unknown,
    context: ToolExecutionContext
  ) => Promise<ModuleToolResult>;
  
  // ========================================
  // Frontend-Action
  // ========================================
  
  // Erstellt eine Action für das Frontend (optional)
  // Wird aufgerufen nachdem execute() erfolgreich war
  createAction?: (
    input: unknown,
    result: ModuleToolResult
  ) => AgentAction | null;
}

// --------------------------------------------
// Action Handler
// Führt Agent-Actions im Frontend aus
// --------------------------------------------

export interface ActionHandler {
  // Zu welchem Modul gehört dieser Handler?
  moduleId: string;
  
  // Welche Action-Types werden unterstützt?
  supportedActions: string[];
  
  // Führt eine Action aus
  execute: (action: AgentAction) => Promise<ActionResult>;
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

// --------------------------------------------
// Module Context
// Kontext-Daten eines Moduls für den Agent
// --------------------------------------------

export interface ModuleContext {
  // Modul-ID
  moduleId: string;
  
  // Aktueller UI-State
  state: Record<string, unknown>;
  
  // Statistiken (z.B. unreadCount, eventCount)
  stats: Record<string, number>;
  
  // Aktive Filter (optional)
  activeFilters?: Record<string, unknown>;
  
  // Relevante Daten (optional)
  // z.B. top contacts, upcoming events
  relevantData?: unknown;
}

// --------------------------------------------
// Agent Context
// Gesamter Kontext für den Agent
// --------------------------------------------

export interface AgentContext {
  // App-weiter Kontext
  app: {
    activeModule: string | null;
    openTabs: string[];
    userName: string;
  };
  
  // Module-spezifischer Kontext
  modules: Record<string, ModuleContext>;
  
  // Aktuelles Datum/Zeit
  currentDate: string;
  currentTime: string;
  dayOfWeek: string;
}

// --------------------------------------------
// Claude Tool Definition (für API)
// Format das Claude erwartet
// --------------------------------------------

export interface ClaudeModuleToolDefinition {
  name: string;
  description: string;
  input_schema: ToolParameterSchema;
}
