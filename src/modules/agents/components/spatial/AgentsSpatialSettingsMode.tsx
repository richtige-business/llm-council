// ============================================
// AgentsSpatialSettingsMode.tsx - Settings-Modus im Raum
//
// Zweck: Rendert die bestehende Settings-Oberflaeche als
//        erweitertes Overlay ueber dem persistente Spatial-Core
// Verwendet von: /app/agents/settings/page.tsx
// ============================================

'use client';

import { useMemo } from 'react';
import { AgentSettingsPage } from '../AgentSettingsPage';
import { GroupSettingsOrbStrip } from '../GroupSettingsOrbStrip';
import { GroupSettingsPanel } from '../GroupSettingsPanel';
import { useAgentsStore, useSelectedAgentId } from '../../store';
import { useAgentsSpatialStore } from '../../spatial-store';
import type { AgentsSpatialMode } from '../../spatial-types';
import type { AgentNavigationScope } from '../useAgentModeNavigation';

interface AgentsSpatialSettingsModeProps {
  navigationScope?: AgentNavigationScope;
  embeddedMode?: AgentsSpatialMode;
  onEmbeddedModeChange?: (mode: AgentsSpatialMode) => void;
}

export function AgentsSpatialSettingsMode({
  navigationScope = 'global',
  embeddedMode,
  onEmbeddedModeChange,
}: AgentsSpatialSettingsModeProps) {
  const selectedAgentId = useSelectedAgentId();
  const activeGroupRoomId = useAgentsSpatialStore((state) => state.activeGroupRoomId);
  const customAgents = useAgentsStore((state) => state.customAgents);

  const activeGroupId = useMemo(() => {
    const candidates = [activeGroupRoomId, selectedAgentId].filter(Boolean) as string[];
    return (
      candidates.find((candidateId) =>
        customAgents.some((agent) => agent.id === candidateId && agent.type === 'group')
      ) || null
    );
  }, [activeGroupRoomId, customAgents, selectedAgentId]);

  if (activeGroupId) {
    return (
      <div className="relative flex h-full min-h-0 flex-col p-4 md:p-6">
        <div className="pointer-events-none absolute inset-x-0 -top-32 z-10 flex justify-center md:-top-36">
          <GroupSettingsOrbStrip groupId={activeGroupId} />
        </div>
        <GroupSettingsPanel key={activeGroupId} groupId={activeGroupId} embedded />
      </div>
    );
  }

  return (
    <AgentSettingsPage
      navigationScope={navigationScope}
      embeddedMode={embeddedMode}
      onEmbeddedModeChange={onEmbeddedModeChange}
    />
  );
}
