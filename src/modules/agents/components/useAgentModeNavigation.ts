// ============================================
// useAgentModeNavigation.ts - Gemeinsame Navigation fuer Agent-Modi
//
// Zweck: Vereinheitlicht den Wechsel zwischen Chat, Tasks und Settings,
//        damit Sidebar, Header und Floating Panel denselben Store-
//        und Routing-Pfad nutzen.
// Verwendet von: AgentHierarchySidebar, AgentModeHeader, FloatingAgentPanel
// ============================================

'use client';

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAgentsStore, useSelectedAgentId } from '../store';
import { useAgentsSpatialStore } from '../spatial-store';
import type { AgentsSpatialMode } from '../spatial-types';
import { resolveAgentsSpatialMode } from './spatial/resolve-spatial-mode';

export type AgentModeHref = '/agents/chat' | '/agents/tasks' | '/agents/settings';
export type AgentNavigationScope = 'global' | 'embedded';

interface AgentModeNavigationOptions {
  navigationScope?: AgentNavigationScope;
  embeddedMode?: AgentsSpatialMode;
  onEmbeddedModeChange?: (mode: AgentsSpatialMode) => void;
}

// --------------------------------------------
// Helper fuer die Zuordnung zwischen Routen und lokalem
// Spatial-Modus. Eingebettete Tabs arbeiten intern mit
// demselben Modus-Modell wie die Vollseiten-Routen.
// --------------------------------------------

export function mapModeHrefToSpatialMode(
  href: AgentModeHref
): Extract<AgentsSpatialMode, 'chat' | 'tasks' | 'settings'> {
  if (href === '/agents/tasks') {
    return 'tasks';
  }

  if (href === '/agents/settings') {
    return 'settings';
  }

  return 'chat';
}

export function mapSpatialModeToHref(mode?: AgentsSpatialMode | null): AgentModeHref | null {
  if (mode === 'tasks') {
    return '/agents/tasks';
  }

  if (mode === 'settings') {
    return '/agents/settings';
  }

  if (mode === 'chat') {
    return '/agents/chat';
  }

  return null;
}

// --------------------------------------------
// Hook fuer konsistente Modus-Navigation
// Hält Gruppenkontext, Council-Entwürfe und Fokus synchron.
// --------------------------------------------
export function useAgentModeNavigation(options: AgentModeNavigationOptions = {}) {
  const {
    navigationScope = 'global',
    embeddedMode,
    onEmbeddedModeChange,
  } = options;
  const pathname = usePathname();
  const router = useRouter();
  const selectedAgentId = useSelectedAgentId();
  const customAgents = useAgentsStore((state) => state.customAgents);
  const syncActiveCouncilDraft = useAgentsStore((state) => state.syncActiveCouncilDraft);
  const setSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);
  const hubView = useAgentsSpatialStore((state) => state.hubView);
  const setHubView = useAgentsSpatialStore((state) => state.setHubView);
  const focusAgent = useAgentsSpatialStore((state) => state.focusAgent);
  const activeGroupRoomId = useAgentsSpatialStore((state) => state.activeGroupRoomId);
  const setActiveGroupRoom = useAgentsSpatialStore((state) => state.setActiveGroupRoom);
  const setSelectedCouncilSeat = useAgentsSpatialStore((state) => state.setSelectedCouncilSeat);
  const setOpenCouncilChatMember = useAgentsSpatialStore((state) => state.setOpenCouncilChatMember);

  const firstGroupId = useMemo(
    () =>
      customAgents.find((agent) => agent.type === 'group' && !agent.parentGroupId)?.id || null,
    [customAgents]
  );

  const activeGroupContextId = useMemo(() => {
    if (activeGroupRoomId) {
      return activeGroupRoomId;
    }

    if (hubView === 'groups') {
      return firstGroupId;
    }

    const selectedCustomAgent = customAgents.find((agent) => agent.id === selectedAgentId);
    return selectedCustomAgent?.type === 'group' ? selectedCustomAgent.id : null;
  }, [activeGroupRoomId, customAgents, firstGroupId, hubView, selectedAgentId]);

  const showTasksControl = hubView !== 'groups' && !activeGroupContextId;

  const activeModeHref =
    navigationScope === 'embedded'
      ? mapSpatialModeToHref(embeddedMode)
      : mapSpatialModeToHref(resolveAgentsSpatialMode(pathname));

  const isControlActive = (href: AgentModeHref) => activeModeHref === href;

  const openMode = (href: AgentModeHref) => {
    if (hubView === 'councils') {
      syncActiveCouncilDraft();
    }

    setSelectedCouncilSeat(null);
    setOpenCouncilChatMember(null);

    // Gruppen sollen beim Wechsel in Chat / Settings erhalten bleiben.
    // Nur im reinen Agent-Kontext wird auf den ausgewaehlten Agenten
    // oder als letzter Fallback auf Intelligence gewechselt.
    const targetAgentId = activeGroupRoomId || (hubView === 'groups' ? firstGroupId : null) || selectedAgentId || 'master';
    const targetCustomAgent = customAgents.find((agent) => agent.id === targetAgentId);
    const targetIsGroup = targetCustomAgent?.type === 'group';

    if (targetIsGroup) {
      setHubView('groups');
      setActiveGroupRoom(targetAgentId);
      setSelectedAgent(targetAgentId);
      focusAgent(targetAgentId);
    } else {
      setHubView('agents');
      setActiveGroupRoom(null);
      setSelectedAgent(targetAgentId);
      focusAgent(targetAgentId);
    }

    if (navigationScope === 'embedded') {
      onEmbeddedModeChange?.(mapModeHrefToSpatialMode(href));
      return;
    }

    router.push(href);
  };

  return {
    openMode,
    isControlActive,
    showTasksControl,
  };
}
