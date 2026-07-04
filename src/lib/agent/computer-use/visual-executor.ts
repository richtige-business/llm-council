// ============================================
// visual-executor.ts - Einstieg fuer visuelle Tool-Rezepte
//
// Zweck: Delegiert Agent-Aktionen an das neue Recipe-System
//        mit expliziten Ergebniszustaenden und Fallback-Regeln.
// Verwendet von: use-agent-executor.ts
// ============================================

import type { AgentAction } from '../types';
import { runVisualToolRecipe } from './visual-tool-recipes';

export type {
  VisualActionResult,
  VisualExecutionStatus,
} from './visual-tool-recipes';

// --------------------------------------------
// Haupt-Executor
// Nutzt die zentrale Registry statt ad-hoc Switches.
// --------------------------------------------

export async function executeVisualAction(
  action: AgentAction
) {
  return runVisualToolRecipe(action);
}
