// ============================================
// Kernel Types - Copy from KERNEL_SPEC.md §7
// 
// Zweck: TypeScript-Interfaces für den LifeOS Kernel
// Verwendet von: Kernel-Implementation + Kernel-Stub + alle Module
// ============================================

// --------------------------------------------
// Core Types
// --------------------------------------------

export type ErrorCode = 
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "TOOL_NOT_FOUND"
  | "EXECUTION_ERROR"
  ;

export type ToolEffect = 
  | "time"      // Nutzt aktuelle Zeit
  | "network"   // HTTP-Requests
  | "random"    // Zufallszahlen
  | "storage"   // Lesen/Schreiben in DB
  | "ui"        // UI-Änderungen
  ;

export type ModuleCategory = 
  | "productivity" 
  | "communication" 
  | "finance" 
  | "health" 
  | "utility" 
  | "developer";

export type Permission = 
  // Storage
  | "storage.read.self"
  | "storage.write.self"
  // Network
  | "network.request.restricted"
  | "network.request.unrestricted"
  // Events
  | "events.publish.workspace"
  | "events.subscribe.workspace"
  // Tools
  | `tool.execute.${string}`
  // System
  | "notifications.send"
  | "clipboard.read"
  | "clipboard.write"
  | "filesystem.read"
  | "filesystem.write"
  | "camera"
  | "microphone"
  ;

// --------------------------------------------
// Module Contract
// --------------------------------------------

export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  kernelVersion: string;
  description: string;
  author: string;
  license: string;
  icon: string;
  category: ModuleCategory;
  dependencies?: string[];
  permissions: Permission[];
}

// --------------------------------------------
// Tool Interface
// --------------------------------------------

export interface ToolDefinition {
  id: string;  // Format: "moduleId.toolName"
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  effects: ToolEffect[];
  isIdempotent: boolean;
  requiresConfirmation: boolean;
  execute: ToolExecutor;
}

export type ToolExecutor = (
  input: unknown,
  context: ExecutionContext
) => Promise<ToolResult>;

export interface ExecutionContext {
  userId: string;
  requestingModuleId: string;
  traceId: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: ErrorCode;
    message: string;
  };
  events?: Event[];
}

// JSON Schema (simplified)
export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

// --------------------------------------------
// Event Bus
// --------------------------------------------

export interface Event {
  type: string;  // Format: "${moduleId}.${eventName}"
  payload: unknown;
  timestamp: number;
  sourceModuleId: string;
  traceId: string;
}

export type EventHandler = (event: Event) => void | Promise<void>;

// --------------------------------------------
// Audit Log
// --------------------------------------------

export interface TraceRecord {
  traceId: string;
  timestamp: number;
  userId: string;
  requestingModuleId: string;
  toolId: string;
  input: unknown;
  output?: unknown;
  error?: { code: ErrorCode; message: string };
  durationMs: number;
  permissionChecks: { permission: Permission; granted: boolean }[];
}

export interface TraceFilter {
  userId?: string;
  requestingModuleId?: string;
  toolId?: string;
  traceId?: string;
  startTime?: number;
  endTime?: number;
}

// --------------------------------------------
// Kernel API (vollständig)
// --------------------------------------------

export interface LifeOSKernel {
  // Modul-Lifecycle
  modules: {
    install(manifest: ModuleManifest): Promise<void>;
    enable(moduleId: string): Promise<void>;
    disable(moduleId: string): Promise<void>;
    uninstall(moduleId: string): Promise<void>;
    get(id: string): ModuleManifest | null;
    list(): ModuleManifest[];
  };
  
  // Tool-System
  tools: {
    register(tool: ToolDefinition): void;
    unregister(toolId: string): void;
    execute(
      toolId: string,
      input: unknown,
      context: ExecutionContext
    ): Promise<ToolResult>;
    list(moduleId?: string): ToolDefinition[];
  };
  
  // Event-Bus
  events: {
    publish(event: Event): void;
    subscribe(eventType: string, handler: EventHandler): () => void;
  };
  
  // Permissions
  permissions: {
    check(moduleId: string, permission: Permission): boolean;
    grant(moduleId: string, permission: Permission): void;
    revoke(moduleId: string, permission: Permission): void;
    request(moduleId: string, permissions: Permission[], reason: string): Promise<boolean>;
  };
  
  // Storage
  storage: {
    get<T>(moduleId: string, key: string): Promise<T | null>;
    set<T>(moduleId: string, key: string, value: T): Promise<void>;
    delete(moduleId: string, key: string): Promise<void>;
  };
  
  // Audit
  audit: {
    write(record: TraceRecord): void;
    query(filter?: TraceFilter): TraceRecord[];
  };
  
  // Meta
  version: string;
}

