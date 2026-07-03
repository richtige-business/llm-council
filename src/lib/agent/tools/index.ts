// ============================================
// index.ts - Tool Registry (Legacy Wrapper)
// 
// Zweck: Rückwärtskompatibilität für alte Tool-Imports
//        DEPRECATED: Nutze stattdessen die neue Registry
// Verwendet von: Alte Imports, Migration
// 
// HINWEIS: Diese Datei ist Client-Side-kompatibel und enthält
//          keine Server-Only-Abhängigkeiten.
// ============================================

import type { AgentTool } from '../types';

// Legacy imports (für Rückwärtskompatibilität)
import { calendarTools } from './calendar-tools';
import { inboxTools } from './inbox-tools';
import { browserTools } from './browser-tools';
import { appTools } from './app-tools';

// --------------------------------------------
// Alle Legacy Tools zusammenführen
// DEPRECATED: Nutze toolRegistry.list() stattdessen (Server-Side)
// --------------------------------------------

/** @deprecated Nutze toolRegistry.list() stattdessen (nur Server-Side) */
export const ALL_TOOLS: AgentTool[] = [
  ...calendarTools,
  ...inboxTools,
  ...browserTools,
  ...appTools,
];

// --------------------------------------------
// Legacy Funktionen (für Rückwärtskompatibilität)
// --------------------------------------------

/** @deprecated Nutze toolRegistry.getByModule() stattdessen (nur Server-Side) */
export function getToolsByModule(module: AgentTool['module']): AgentTool[] {
  return ALL_TOOLS.filter(tool => tool.module === module);
}

/** @deprecated Nutze toolRegistry.get() stattdessen (nur Server-Side) */
export function getToolByName(name: string): AgentTool | undefined {
  return ALL_TOOLS.find(tool => tool.name === name);
}

// Re-exports für Rückwärtskompatibilität
export { calendarTools } from './calendar-tools';
export { inboxTools } from './inbox-tools';
export { browserTools } from './browser-tools';
export { appTools } from './app-tools';




