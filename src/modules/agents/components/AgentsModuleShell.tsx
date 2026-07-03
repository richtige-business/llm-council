// ============================================
// AgentsModuleShell.tsx - Gemeinsame Shell fuer Agents-Unterseiten
//
// Zweck: Haelt die linke Agenten-Sidebar, die optionale
//        Chat-History, den 3D-Raum (nur Hub, nicht im Chat) und das
//        Agent-Kontextpanel persistent ueber Chat, Tasks und Settings
// Verwendet von: /app/agents/layout.tsx
// ============================================

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useThemeStyles } from '@/lib/theme';
import { useBackgroundImage, useBackgroundType, useSolidBackground } from '@/lib/store/app-store';
import { DEFAULT_AGENT_NAMES, useAgentConfigStore } from '@/lib/agent/stores/agent-config-store';
import { useAgentsStore, useSelectedAgentId } from '../store';
import { useScheduledTasksStore } from '../tasks-store';
import { useAgentsSpatialStore } from '../spatial-store';
import type { AgentsSpatialMode } from '../spatial-types';
import { getCouncilStagePresentation } from '../council-stage-ui';
import { AgentHierarchySidebar } from './AgentHierarchySidebar';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import { CouncilSeatModalHost } from './CouncilSeatModalHost';
import { CouncilChatBar } from './CouncilChatBar';
import { FloatingAgentPanel } from './spatial/FloatingAgentPanel';
import { AgentsSpatialOverlayHost } from './spatial/AgentsSpatialOverlayHost';
import { buildSpatialGraph } from './spatial/buildSpatialGraph';
import { buildGroupSpatialGraph } from './spatial/buildGroupSpatialGraph';
import { buildCouncilPreviewSpatialGraph } from './spatial/buildCouncilPreviewSpatialGraph';
import { buildGroupsOverviewSpatialGraph } from './spatial/buildGroupsOverviewSpatialGraph';
import { resolveAgentsSpatialMode } from './spatial/resolve-spatial-mode';
import type { AgentNavigationScope } from './useAgentModeNavigation';

const AgentsSpatialScene = dynamic(
  () => import('./spatial/AgentsSpatialScene').then((mod) => mod.AgentsSpatialScene),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-white/55">
        Agents Raum wird geladen...
      </div>
    ),
    ssr: false,
  }
);

interface AgentsModuleShellProps {
  children?: ReactNode;
  modeOverride?: AgentsSpatialMode;
  navigationScope?: AgentNavigationScope;
  embeddedMode?: AgentsSpatialMode;
  onEmbeddedModeChange?: (mode: AgentsSpatialMode) => void;
}

// --------------------------------------------
// Council-Titel fuer die Anzeige normalisieren
// Das Eingabefeld bleibt frei editierbar, waehrend
// Titel und gespeicherte Namen konsistent enden.
// --------------------------------------------

function formatCouncilTitle(name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return '';
  }

  return /(?:\s|^)council$/i.test(trimmedName)
    ? trimmedName
    : `${trimmedName} Council`;
}

// --------------------------------------------
// Chip-Hintergruende: beliebigen Farbwert (hex, rgb, rgba)
// in ein rgba mit fester Ziel-Deckkraft umwandeln.
// Hex-Farben werden korrekt geparst – anders als der
// fruehere reduceBackgroundAlpha-Ansatz, der nur rgba/rgb
// verstand und bei Hex-Werten die Farbe unveraendert (solid)
// zurueckgab.
// --------------------------------------------

function toTransparentRgba(color: string, alpha: number): string {
  const hexClean = color.replace('#', '');
  if (/^[0-9a-fA-F]{3,8}$/.test(hexClean)) {
    let r: number, g: number, b: number;
    if (hexClean.length <= 4) {
      r = parseInt(hexClean[0] + hexClean[0], 16);
      g = parseInt(hexClean[1] + hexClean[1], 16);
      b = parseInt(hexClean[2] + hexClean[2], 16);
    } else {
      r = parseInt(hexClean.substring(0, 2), 16);
      g = parseInt(hexClean.substring(2, 4), 16);
      b = parseInt(hexClean.substring(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }

  const rgbaMatch = color.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*[0-9.]+\s*\)$/i);
  if (rgbaMatch) {
    return `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${alpha.toFixed(2)})`;
  }

  const rgbMatch = color.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha.toFixed(2)})`;
  }

  return color;
}

export function AgentsModuleShell({
  children,
  modeOverride,
  navigationScope = 'global',
  embeddedMode,
  onEmbeddedModeChange,
}: AgentsModuleShellProps) {
  const [showCouncilNameBar, setShowCouncilNameBar] = useState(false);
  const router = useRouter();
  const selectedAgentId = useSelectedAgentId();
  const setSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);
  const customAgents = useAgentsStore((state) => state.customAgents);
  const councils = useAgentsStore((state) => state.councils);
  const activeCouncilDraftId = useAgentsStore((state) => state.activeCouncilDraftId);
  const conversations = useAgentsStore((state) => state.conversations);
  const activeCouncilDraftName = useAgentsStore((state) => state.activeCouncilDraftName);
  const activeCouncilDraftSeatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const activeCouncilStage = useAgentsStore((state) => state.activeCouncilStage);
  const ensureCouncilDraft = useAgentsStore((state) => state.ensureCouncilDraft);
  const openCouncil = useAgentsStore((state) => state.openCouncil);
  const persistActiveCouncilDraft = useAgentsStore((state) => state.persistActiveCouncilDraft);
  const syncActiveCouncilDraft = useAgentsStore((state) => state.syncActiveCouncilDraft);
  const setActiveCouncilDraftName = useAgentsStore((state) => state.setActiveCouncilDraftName);
  const tasks = useScheduledTasksStore((state) => state.tasks);
  const configs = useAgentConfigStore((state) => state.configs);
  const pathname = usePathname();
  const backgroundImage = useBackgroundImage();
  const backgroundType = useBackgroundType();
  const solidBackground = useSolidBackground();
  const setMode = useAgentsSpatialStore((state) => state.setMode);
  const hubView = useAgentsSpatialStore((state) => state.hubView);
  const focusAgent = useAgentsSpatialStore((state) => state.focusAgent);
  const setActiveGroupRoom = useAgentsSpatialStore((state) => state.setActiveGroupRoom);
  const activeGroupRoomId = useAgentsSpatialStore((state) => state.activeGroupRoomId);
  const selectedCouncilSeatId = useAgentsSpatialStore((state) => state.selectedCouncilSeatId);
  const {
    surface,
    button,
    input: inputStyles,
    textColor,
    surfaceColor,
    designStyle,
  } = useThemeStyles();
  const resolvedModeOverride =
    navigationScope === 'embedded' ? embeddedMode || modeOverride || 'chat' : modeOverride;

  // --------------------------------------------
  // Eingebettete Tabs steuern ihren Raum-Modus lokal,
  // Vollseiten-Routen leiten ihn weiterhin aus dem Pfad ab.
  // --------------------------------------------
  const baseMode =
    navigationScope === 'embedded'
      ? resolveAgentsSpatialMode(null, resolvedModeOverride)
      : resolveAgentsSpatialMode(pathname, resolvedModeOverride);
  const mode =
    baseMode === 'idle'
      ? activeGroupRoomId
        ? 'group'
        : hubView === 'groups'
          ? 'groups'
          : hubView === 'councils'
            ? 'council'
          : 'idle'
      : baseMode;

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  useEffect(() => {
    // --------------------------------------------
    // Modus-Routen frueh vorwaermen
    // Dadurch compiliert Turbopack Chat / Tasks / Settings
    // schon kurz nach dem Betreten des Agents-Moduls im Hintergrund.
    // Im Dev-Modus fuehrt das bei grossen Agent-/Council-Dateien
    // jedoch zu extremen SWC/Turbopack-Spitzen und kann den
    // lokalen Next-Server minutenlang blockieren.
    // --------------------------------------------
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    const warmRoutes = () => {
      router.prefetch('/agents/chat');
      router.prefetch('/agents/tasks');
      router.prefetch('/agents/settings');

      void import('./spatial/AgentsSpatialChatMode');
      void import('./spatial/AgentsSpatialTasksMode');
      void import('./spatial/AgentsSpatialSettingsMode');
    };

    const idleHandle =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? window.requestIdleCallback(warmRoutes, { timeout: 1200 })
        : window.setTimeout(warmRoutes, 250);

    return () => {
      if (typeof idleHandle === 'number') {
        window.clearTimeout(idleHandle);
        return;
      }

      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
      }
    };
  }, [router]);

  useEffect(() => {
    if (!selectedAgentId) {
      return;
    }

    focusAgent(selectedAgentId);
  }, [focusAgent, selectedAgentId]);

  useEffect(() => {
    if (!activeGroupRoomId) {
      return;
    }

    const activeGroup = customAgents.find(
      (agent) => agent.id === activeGroupRoomId && agent.type === 'group'
    );

    if (!activeGroup) {
      setActiveGroupRoom(null);
      return;
    }

    if (!selectedAgentId || selectedAgentId === activeGroupRoomId) {
      return;
    }

    const isParticipant = (activeGroup.participantRoles || []).some(
      (participant) => participant.agentId === selectedAgentId
    );

    if (!isParticipant) {
      setActiveGroupRoom(null);
    }
  }, [activeGroupRoomId, customAgents, selectedAgentId, setActiveGroupRoom]);

  // Wenn Settings / Tasks / Chat geoeffnet werden und kein Agent
  // gewaehlt ist, den aktuellen Gruppenkontext beibehalten und
  // nur als Fallback auf Intelligence wechseln.
  useEffect(() => {
    if ((mode === 'chat' || mode === 'tasks' || mode === 'settings') && !selectedAgentId) {
      setSelectedAgent(activeGroupRoomId || 'master');
    }
  }, [activeGroupRoomId, mode, selectedAgentId, setSelectedAgent]);

  // --------------------------------------------
  // Council-Draft automatisch initialisieren und beim
  // Verlassen des Council-Hubs automatisch persistieren.
  // --------------------------------------------
  useEffect(() => {
    if (mode === 'council') {
      ensureCouncilDraft();
    }
  }, [ensureCouncilDraft, mode]);

  useEffect(() => {
    if (mode !== 'council') {
      return;
    }

    setShowCouncilNameBar(!activeCouncilDraftName.trim());
  }, [activeCouncilDraftId, activeCouncilDraftName, mode]);

  useEffect(() => {
    return () => {
      if (mode === 'council') {
        syncActiveCouncilDraft();
      }
    };
  }, [mode, syncActiveCouncilDraft]);

  // Spatial-Graph fuer das Kontextpanel im Hub-Modus
  const hubGraph = useMemo(
    () => buildSpatialGraph({ customAgents, conversations, tasks, configs }),
    [customAgents, conversations, tasks, configs],
  );

  const groupRoomGraph = useMemo(
    () =>
      activeGroupRoomId
        ? buildGroupSpatialGraph({
            groupId: activeGroupRoomId,
            customAgents,
            conversations,
            tasks,
            configs,
          })
        : null,
    [activeGroupRoomId, configs, conversations, customAgents, tasks],
  );

  const groupsOverviewGraph = useMemo(
    () =>
      buildGroupsOverviewSpatialGraph({
        customAgents,
        conversations,
        tasks,
        configs,
      }),
    [configs, conversations, customAgents, tasks],
  );

  const councilPreviewGraph = useMemo(
    () => buildCouncilPreviewSpatialGraph(),
    [],
  );

  const graph =
    mode === 'group' && groupRoomGraph
      ? groupRoomGraph
      : mode === 'groups'
        ? groupsOverviewGraph
        : mode === 'council'
          ? councilPreviewGraph
        : hubGraph;
  const groupCenterNode =
    mode === 'group' && activeGroupRoomId && selectedAgentId === activeGroupRoomId
      ? graph.agentNodes[0] || null
      : null;
  const activeGroup = activeGroupRoomId
    ? customAgents.find((agent) => agent.id === activeGroupRoomId && agent.type === 'group') || null
    : null;

  const selectedNode = useMemo(
    () =>
      selectedAgentId
        ? graph.agentNodes.find((node) => node.id === selectedAgentId) || groupCenterNode
        : null,
    [graph.agentNodes, groupCenterNode, selectedAgentId],
  );

  const relatedTasks = useMemo(
    () =>
      selectedNode
        ? graph.taskNodes.filter((t) => t.targetId === selectedNode.id)
        : [],
    [graph.taskNodes, selectedNode],
  );

  const relatedConversations = useMemo(
    () =>
      selectedNode
        ? graph.conversationNodes.filter((c) => c.targetId === selectedNode.id)
        : [],
    [graph.conversationNodes, selectedNode],
  );

  const selectedModelName = selectedNode
    ? configs[selectedNode.id]?.llmModel
    : undefined;

  // Das Kontextpanel wird nur im idle-Modus (Hub) gezeigt
  const showAgentPanel = (mode === 'idle' || mode === 'group') && selectedNode !== null;
  const activeCouncilTitle = formatCouncilTitle(activeCouncilDraftName);
  const isPersistedCouncilOpen = useMemo(
    () => councils.some((council) => council.id === activeCouncilDraftId),
    [activeCouncilDraftId, councils],
  );
  const spatialRoomTitle =
    mode === 'group'
      ? activeGroup?.name || 'Gruppe'
      : mode === 'groups'
        ? 'Gruppen-Hub'
        : mode === 'council'
          ? activeCouncilTitle || 'Council hub'
        : mode === 'idle'
          ? 'Agent-Hub'
          : null;
  const councilStagePresentation = getCouncilStagePresentation(activeCouncilStage);
  const councilStageBadgeLabel = councilStagePresentation.badgeLabel;

  return (
    <div className="flex h-full overflow-hidden" data-agent-panel="agents-root">
      <AgentHierarchySidebar
        navigationScope={navigationScope}
        embeddedMode={resolvedModeOverride}
        onEmbeddedModeChange={onEmbeddedModeChange}
      />
      {selectedAgentId && mode === 'chat' ? <ChatHistorySidebar /> : null}
      <div className="relative isolate flex min-w-0 flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: backgroundType === 'image' ? `url(${backgroundImage})` : 'none',
            backgroundColor: backgroundType === 'solid' ? solidBackground : 'transparent',
          }}
        />
        {/* 3D-Szene: Im Chat komplett aus, im Hub alle Orbs, bei tasks/settings nur isolierter Orb */}
        {mode !== 'chat' ? (
          <>
            <div className="absolute inset-0 z-0">
              <AgentsSpatialScene />
            </div>
            {mode === 'idle' ? (
              <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.04),rgba(2,6,23,0.18))]" />
            ) : null}
          </>
        ) : null}

        {spatialRoomTitle && !selectedCouncilSeatId ? (
          <div className="absolute inset-x-0 top-8 z-40 flex justify-center px-4">
            <div className="flex w-full max-w-lg flex-col items-center gap-3">
              <div
                className="pointer-events-none px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.32em]"
                style={{
                  ...surface.base,
                  color: textColor,
                  borderRadius: designStyle === 'brutal' ? '0.75rem' : '9999px',
                }}
              >
                {spatialRoomTitle}
              </div>

              {mode === 'council' && showCouncilNameBar ? (
                <div
                  className="pointer-events-auto w-full p-2"
                  style={{
                    ...surface.base,
                    borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
                  }}
                >
                  <input
                    type="text"
                    value={activeCouncilDraftName}
                    onChange={(event) => setActiveCouncilDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') {
                        return;
                      }

                      event.preventDefault();
                      const savedCouncilId = syncActiveCouncilDraft();
                      if (savedCouncilId) {
                        openCouncil(savedCouncilId);
                        setShowCouncilNameBar(false);
                      }
                    }}
                    placeholder="Rename this council..."
                    className="w-full px-4 py-3 text-sm outline-none transition-colors"
                    style={{
                      ...inputStyles.base,
                      width: '100%',
                      color: textColor,
                      borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                      boxShadow:
                        designStyle === 'glass'
                          ? inputStyles.base.boxShadow
                          : designStyle === 'neo'
                            ? inputStyles.base.boxShadow
                            : undefined,
                      background: inputStyles.base.background || surfaceColor,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {mode === 'council' && !selectedCouncilSeatId && councilStageBadgeLabel ? (
          <div className="pointer-events-none absolute left-6 top-6 z-40">
            <div
              className="flex max-w-xs flex-col gap-1.5 px-3 py-2.5"
              style={{
                ...button.base,
                ...(designStyle === 'glass' ? surface.base : {}),
                color: textColor,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
              }}
            >
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    activeCouncilStage === 'error'
                      ? 'bg-rose-400'
                      : activeCouncilStage === 'completed'
                        ? 'bg-amber-300'
                        : 'animate-pulse bg-cyan-300'
                  }`}
                />
                <span>{councilStageBadgeLabel}</span>
              </div>
              {councilStagePresentation.description ? (
                <p className="text-[11px] leading-relaxed text-white/72">
                  {councilStagePresentation.description}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Agent-Kontextpanel: z-50 damit es ueber Drei-Html-Overlays liegt */}
        {showAgentPanel ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 z-50 flex justify-center px-4">
            <FloatingAgentPanel
              node={selectedNode}
              mode={mode}
              modelName={selectedModelName}
              relatedTasks={relatedTasks}
              relatedConversations={relatedConversations}
                navigationScope={navigationScope}
                embeddedMode={resolvedModeOverride}
                onEmbeddedModeChange={onEmbeddedModeChange}
            />
          </div>
        ) : null}

        {mode === 'council' ? <CouncilSeatModalHost /> : null}

        {/* Council-Chatbar: zentriert unten, nur im Council-Modus */}
        <AnimatePresence>
          {mode === 'council' && !selectedCouncilSeatId ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex justify-center px-6">
            <div className="pointer-events-auto w-full max-w-2xl">
              <CouncilChatBar />
            </div>
          </div>
        ) : null}
        </AnimatePresence>

        <AgentsSpatialOverlayHost mode={mode}>{children}</AgentsSpatialOverlayHost>
      </div>
    </div>
  );
}
