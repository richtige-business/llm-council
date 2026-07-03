// ============================================
// resolve-spatial-mode.ts - Modus-Helfer fuer den Spatial-Core
//
// Zweck: Leitet aus Pfad oder Override den aktiven
//        Raum-Modus fuer Chat, Settings und Tasks ab
// Verwendet von: AgentsModuleShell, Spatial-Panels
// ============================================

import type { AgentsSpatialMode } from '../../spatial-types';

export function resolveAgentsSpatialMode(
  pathname: string | null,
  modeOverride?: AgentsSpatialMode
): AgentsSpatialMode {
  if (modeOverride) {
    return modeOverride;
  }

  if (pathname?.startsWith('/agents/tasks')) {
    return 'tasks';
  }

  if (pathname?.startsWith('/agents/settings')) {
    return 'settings';
  }

  if (pathname?.startsWith('/agents/chat')) {
    return 'chat';
  }

  return 'idle';
}
