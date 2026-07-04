// ============================================
// index.ts - Tool Registry (Legacy Wrapper)
//
// Zweck: Rückwärtskompatibilität für alte Tool-Imports
//        DEPRECATED: Nutze stattdessen die neue Registry
//
// HINWEIS: Diese Datei ist Client-Side-kompatibel und enthält
//          keine Server-Only-Abhängigkeiten.
// ============================================

import type { AgentTool } from '../types';

// --------------------------------------------
// Alle Legacy Tools zusammenführen
// DEPRECATED: Nutze toolRegistry.list() stattdessen (Server-Side)
// --------------------------------------------

/** @deprecated Nutze toolRegistry.list() stattdessen (nur Server-Side) */
export const ALL_TOOLS: AgentTool[] = [];

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
