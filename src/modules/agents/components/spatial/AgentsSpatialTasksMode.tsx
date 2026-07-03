// ============================================
// AgentsSpatialTasksMode.tsx - Task-Modus im Agents-Raum
//
// Zweck: Rendert die bestehende Task-Verwaltung als
//        Modus-Overlay ueber dem persistente Spatial-Core
// Verwendet von: /app/agents/tasks/page.tsx
// ============================================

'use client';

import { ScheduledTasksPage } from '../ScheduledTasksPage';
import type { AgentsSpatialMode } from '../../spatial-types';
import type { AgentNavigationScope } from '../useAgentModeNavigation';

interface AgentsSpatialTasksModeProps {
  navigationScope?: AgentNavigationScope;
  embeddedMode?: AgentsSpatialMode;
  onEmbeddedModeChange?: (mode: AgentsSpatialMode) => void;
}

export function AgentsSpatialTasksMode({
  navigationScope = 'global',
  embeddedMode,
  onEmbeddedModeChange,
}: AgentsSpatialTasksModeProps) {
  return (
    <ScheduledTasksPage
      navigationScope={navigationScope}
      embeddedMode={embeddedMode}
      onEmbeddedModeChange={onEmbeddedModeChange}
    />
  );
}
