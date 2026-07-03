// ============================================
// runtime-action.ts - Einheitliche Runtime-Actions fuer Agent-Tools
//
// Zweck: Baut standardisierte Frontend-Actions aus Tool-Calls,
//        damit neue Tools nicht mehr als sichtbare No-Ops enden.
// Verwendet von: Tool-Definitionen fuer Agents, Lab, Settings, Marketplace, App
// ============================================

import type { AgentAction } from '@/lib/agent/types';
import type { ModuleToolResult } from '@/lib/agent/types/module-tools';

// --------------------------------------------
// Eingaben in ein Action-Payload ueberfuehren
// Tools koennen beliebige Input-Formate liefern. Fuer Actions
// brauchen wir aber immer ein Objekt, damit Handler sauber lesen.
// --------------------------------------------

function normalizeActionPayload(input: unknown): Record<string, unknown> {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  return {
    value: input,
  };
}

// --------------------------------------------
// Standard-Action fuer Tool-Ausfuehrungen erzeugen
// Der Action-Type entspricht der Tool-ID, damit Handler gezielt
// auf genau dieses Tool oder Prefixe reagieren koennen.
// --------------------------------------------

export function createToolRuntimeAction(
  toolId: string,
  moduleId: string,
  input: unknown,
  result: ModuleToolResult
): AgentAction {
  return {
    type: toolId,
    module: moduleId,
    payload: {
      ...normalizeActionPayload(input),
      toolId,
      moduleId,
      resultData: result.data,
      resultSuccess: result.success,
    },
    executed: false,
    timestamp: Date.now(),
  };
}
