// ============================================
// index.ts - Agent Module Exports
// 
// Zweck: Zentrale Exports für das Agent-System
// 
// HINWEIS: Diese Datei wird von Client-Komponenten importiert.
// Server-Only-Module (init-server.ts) werden NICHT exportiert.
// ============================================

// Typen
export * from './types';

// Registry (nur die Registries selbst, nicht die Server-Tools)
export { 
  toolRegistry, 
  actionRegistry,
  registerActionHandler,
  executeAction,
} from './registry';

// Initialisierung (nur Client-Side)
export { initializeActionRegistry, resetActionRegistry } from './init';

// Agent Store (Frontend State)
export * from './agent-store';

// Agent Config Store (Modul-spezifische Agent-Einstellungen)
export * from './stores/agent-config-store';

// Sandbox Store (Teaching Mode)
export * from './stores/sandbox-store';

// Sandbox Tools (Action Recorder, Discovery)
export * from './sandbox';

// Orchestrator (Master-Agent für Dashboard)
export { 
  orchestrator,
  detectModuleFromMessage,
  orchestrateAgentRequest,
  getModuleAgentConfig,
} from './orchestrator';

// Agent Executor Hook
export * from './use-agent-executor';

// Computer Use (optional)
export * from './computer-use';

// Legacy: Tool-Definitionen (deprecated, use registry instead)
// Nur Typen und Legacy-Hilfsfunktionen
export {
  ALL_TOOLS,
  getToolsByModule,
  getToolByName,
} from './tools';
