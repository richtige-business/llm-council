// ============================================
// AgentHierarchySidebar.tsx - Agenten-Hierarchie Sidebar
// 
// Zweck: Zeigt alle verfügbaren Agenten in einer Baumstruktur
//        Master-Agent als Root, Modul-Agents als Kinder
//        Ermöglicht Agenten-Wechsel und Konfiguration
// Verwendet von: AgentsPage.tsx (linke Sidebar)
// ============================================

'use client';

import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  BrainCircuit,
  Calendar,
  Mail,
  Globe,
  ListChecks,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  BookOpen,
  MessageSquare,
  Dumbbell,
  FlaskConical,
  Network,
  Plus,
  Users,
  UsersRound,
  Briefcase,
  Shield,
  Zap,
  Target,
  Layers,
  Pencil,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { useAgentsStore, useSelectedAgentId, useAgentSidebarCollapsed } from '../store';
import { useThemeStyles } from '@/lib/theme';
import {
  useAgentConfigStore,
  DEFAULT_MODULE_COLORS,
  DEFAULT_AGENT_NAMES,
} from '@/lib/agent/stores/agent-config-store';
import type { AgentNode, CustomAgentData, GroupChatParticipantRole } from '../types';
import type { AgentsSpatialMode } from '../spatial-types';
import { AddParticipantModal } from './AddParticipantModal';
import { useAgentsSpatialStore } from '../spatial-store';
import {
  mapSpatialModeToHref,
  useAgentModeNavigation,
  type AgentNavigationScope,
} from './useAgentModeNavigation';

// --------------------------------------------
// Icon-Mapping: String → Lucide-Komponente
// Verwendet um Agent-Icons dynamisch zu rendern
// --------------------------------------------

/** z-Index für Agent-/Gruppen-Erstellungs-Overlays (über allen Sidebars) */
const AGENTS_OVERLAY_Z = 'z-[99999]';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Bot,
  BrainCircuit,
  Calendar,
  Mail,
  Globe,
  ListChecks,
  Sparkles,
  Search,
  BookOpen,
  MessageSquare,
  Dumbbell,
  FlaskConical,
  Network,
  Users,
  UsersRound,
  Briefcase,
  Shield,
  Zap,
  Target,
  Layers,
};

const CONTROL_ITEMS = [
  { href: '/agents/chat', label: 'Chat', Icon: MessageSquare },
  { href: '/agents/tasks', label: 'Tasks', Icon: ListChecks },
  { href: '/agents/settings', label: 'Settings', Icon: Settings },
] as const;

// --------------------------------------------
// Eingebaute Agenten-Definition
// Diese Agenten sind immer verfügbar
// --------------------------------------------

const BUILT_IN_AGENTS: AgentNode[] = [
  {
    id: 'master',
    name: 'Intelligence',
    icon: 'BrainCircuit',
    color: '#0ea5e9',
    status: 'active',
    description: 'Ueberblick, Routing und moduluebergreifende Koordination',
    isBuiltIn: true,
    children: [
      {
        id: 'calendar',
        name: 'Kalender',
        icon: 'Calendar',
        color: '#f87171',
        status: 'idle',
        description: 'Termine und Events verwalten',
        isBuiltIn: true,
      },
      {
        id: 'inbox',
        name: 'Inbox',
        icon: 'Mail',
        color: '#fbbf24',
        status: 'idle',
        description: 'E-Mails lesen, priorisieren und beantworten',
        isBuiltIn: true,
      },
      {
        id: 'lab',
        name: 'Lab',
        icon: 'FlaskConical',
        color: '#14B8A6',
        status: 'idle',
        description: 'Trainings-, Builder- und Lab-Workflows',
        isBuiltIn: true,
      },
    ],
  },
];

// --------------------------------------------
// Sidebar-Baum: Built-in IDs und Merge mit Custom-Subagents
// --------------------------------------------

/** Sammelt alle IDs aus dem statischen Built-in-Baum (master + Module). */
function collectBuiltInAgentIds(nodes: AgentNode[], into: Set<string> = new Set()): Set<string> {
  nodes.forEach((n) => {
    into.add(n.id);
    if (n.children?.length) collectBuiltInAgentIds(n.children, into);
  });
  return into;
}

/** Einmalig: alle System-Agent-IDs fuer Parent-Checks. */
const BUILT_IN_ID_SET = collectBuiltInAgentIds(BUILT_IN_AGENTS);

/** Tiefe Kopie des Built-in-Baums, damit wir Children erweitern ohne die Konstante zu mutieren. */
function cloneAgentTree(nodes: AgentNode[]): AgentNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children?.length ? cloneAgentTree(node.children) : undefined,
  }));
}

/**
 * True, wenn beim Hochlaufen der parentAgentId-Kette ein Built-in vorkommt.
 * Dann gehoert der Agent nur unter „Systemagents“, nicht unter „Eigene Agents“.
 */
function customAgentHasBuiltInAncestor(
  agent: CustomAgentData,
  byId: Map<string, CustomAgentData>,
  builtInIds: Set<string>
): boolean {
  const seen = new Set<string>();
  let pid: string | undefined = agent.parentAgentId;
  while (pid) {
    if (builtInIds.has(pid)) return true;
    if (seen.has(pid)) break;
    seen.add(pid);
    const parent = byId.get(pid);
    if (!parent) break;
    pid = parent.parentAgentId;
  }
  return false;
}

/** Alle Custom-Agenten direkt unter parentId inkl. verschachtelter Custom-Kinder. */
function buildCustomNodesUnderParent(
  parentId: string,
  nonGroup: CustomAgentData[],
  selectedAgentId: string | null
): AgentNode[] {
  return nonGroup
    .filter((c) => c.parentAgentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => {
      const nested = buildCustomNodesUnderParent(c.id, nonGroup, selectedAgentId);
      return {
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        status: c.id === selectedAgentId ? ('active' as const) : ('idle' as const),
        description: c.description || 'Benutzerdefinierter Agent',
        isBuiltIn: false,
        children: nested.length > 0 ? nested : undefined,
      };
    });
}

/** Haengt unter jedem Knoten Custom-Subagents ein (Parent = Knoten-ID). */
function mergeBuiltInTreeWithCustomChildren(
  nodes: AgentNode[],
  nonGroup: CustomAgentData[],
  selectedAgentId: string | null
): AgentNode[] {
  return nodes.map((node) => {
    const builtInNested = node.children?.length
      ? mergeBuiltInTreeWithCustomChildren(node.children, nonGroup, selectedAgentId)
      : [];
    const customDirect = buildCustomNodesUnderParent(node.id, nonGroup, selectedAgentId);
    const children = [...builtInNested, ...customDirect];
    return { ...node, children: children.length > 0 ? children : undefined };
  });
}

// --------------------------------------------
// Komponente: AgentHierarchySidebar
// Linke Sidebar mit Agenten-Baumstruktur
// --------------------------------------------

interface AgentHierarchySidebarProps {
  navigationScope?: AgentNavigationScope;
  embeddedMode?: AgentsSpatialMode;
  onEmbeddedModeChange?: (mode: AgentsSpatialMode) => void;
}

export function AgentHierarchySidebar({
  navigationScope = 'global',
  embeddedMode,
  onEmbeddedModeChange,
}: AgentHierarchySidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationMode, setCreationMode] = useState<'agent' | 'group'>('agent');
  const [agentNameInput, setAgentNameInput] = useState('');
  const [agentDescriptionInput, setAgentDescriptionInput] = useState('');
  const [agentParentIdInput, setAgentParentIdInput] = useState<string>('root');
  const [groupTitleInput, setGroupTitleInput] = useState('');
  const [groupParticipants, setGroupParticipants] = useState<GroupChatParticipantRole[]>([]);
  const [groupAdminAgentId, setGroupAdminAgentId] = useState('');
  const [groupFormError, setGroupFormError] = useState('');
  const [collapsedNodeIds, setCollapsedNodeIds] = useState<Set<string>>(new Set());
  const [participantTargetGroupId, setParticipantTargetGroupId] = useState<string | null>(null);
  const [editingCouncilId, setEditingCouncilId] = useState<string | null>(null);
  const [editingCouncilName, setEditingCouncilName] = useState('');
  const createLockRef = useRef(false);
  /** true erst nach Client-Hydration — vermeidet SSR-Mismatch bei createPortal(document.body) */
  const overlayMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const selectedAgentId = useSelectedAgentId();
  const isCollapsed = useAgentSidebarCollapsed();
  const router = useRouter();
  const pathname = usePathname();
  const setSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);
  const toggleAgentSidebar = useAgentsStore((state) => state.toggleAgentSidebar);
  const customAgents = useAgentsStore((state) => state.customAgents);
  const councils = useAgentsStore((state) => state.councils);
  const createCustomAgent = useAgentsStore((state) => state.createCustomAgent);
  const createGroupAgent = useAgentsStore((state) => state.createGroupAgent);
  const createCouncilDraft = useAgentsStore((state) => state.createCouncilDraft);
  const openCouncil = useAgentsStore((state) => state.openCouncil);
  const persistActiveCouncilDraft = useAgentsStore((state) => state.persistActiveCouncilDraft);
  const updateCouncilName = useAgentsStore((state) => state.updateCouncilName);
  const deleteCouncil = useAgentsStore((state) => state.deleteCouncil);
  const deleteCustomAgent = useAgentsStore((state) => state.deleteCustomAgent);
  const hubView = useAgentsSpatialStore((state) => state.hubView);
  const setHubView = useAgentsSpatialStore((state) => state.setHubView);
  const focusAgent = useAgentsSpatialStore((state) => state.focusAgent);
  const setActiveGroupRoom = useAgentsSpatialStore((state) => state.setActiveGroupRoom);
  const setSelectedCouncilSeat = useAgentsSpatialStore((state) => state.setSelectedCouncilSeat);
  const setOpenCouncilChatMember = useAgentsSpatialStore((state) => state.setOpenCouncilChatMember);
  const activeGroupRoomId = useAgentsSpatialStore((state) => state.activeGroupRoomId);
  const activeCouncilDraftId = useAgentsStore((state) => state.activeCouncilDraftId);
  const { openMode, isControlActive, showTasksControl } = useAgentModeNavigation({
    navigationScope,
    embeddedMode,
    onEmbeddedModeChange,
  });
  
  // Theme-Styles
  const { surface, accentColor, textColor, designStyle } = useThemeStyles();
  const surfaceBorder = typeof surface.base.border === 'string' ? surface.base.border : undefined;
  const sidebarRightBorder =
    designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)';
  const sidebarSurfaceStyle = {
    ...surface.base,
    border: undefined,
    borderRadius: 0,
    borderTop: surfaceBorder,
    borderBottom: surfaceBorder,
    borderLeft: surfaceBorder,
    borderRight: sidebarRightBorder,
  };

  // Agenten mit Store-Konfigurationen anreichern
  const configs = useAgentConfigStore((state) => state.configs);
  const updateAgentConfig = useAgentConfigStore((state) => state.updateConfig);
  
  const builtInEnrichedAgents = useMemo(() => {
    return BUILT_IN_AGENTS.map((agent) => ({
      ...agent,
      name: configs[agent.id]?.agentName || DEFAULT_AGENT_NAMES[agent.id] || agent.name,
      color: configs[agent.id]?.orbColor || DEFAULT_MODULE_COLORS[agent.id] || agent.color,
      children: agent.children?.map((child) => ({
        ...child,
        name: configs[child.id]?.agentName || DEFAULT_AGENT_NAMES[child.id] || child.name,
        color: configs[child.id]?.orbColor || DEFAULT_MODULE_COLORS[child.id] || child.color,
        status: child.id === selectedAgentId ? 'active' as const : 'idle' as const,
      })),
      status: agent.id === selectedAgentId ? 'active' as const : 'idle' as const,
    }));
  }, [configs, selectedAgentId]);

  // ----------------------------------------
  // Nur Nicht-Gruppen-Customs (fuer Baum + Merge)
  // ----------------------------------------
  const nonGroupCustom = useMemo(
    () => customAgents.filter((customAgent) => customAgent.type !== 'group'),
    [customAgents]
  );

  const customById = useMemo(() => {
    const m = new Map<string, CustomAgentData>();
    nonGroupCustom.forEach((c) => m.set(c.id, c));
    return m;
  }, [nonGroupCustom]);

  // ----------------------------------------
  // System-Agents: Built-in plus Custom-Subagents unter dem jeweiligen Parent
  // ----------------------------------------
  const systemAgents = useMemo<AgentNode[]>(() => {
    const clonedRoots = cloneAgentTree(builtInEnrichedAgents);
    return mergeBuiltInTreeWithCustomChildren(clonedRoots, nonGroupCustom, selectedAgentId || '');
  }, [builtInEnrichedAgents, nonGroupCustom, selectedAgentId]);

  // ----------------------------------------
  // Eigene Agents: nur Custom-Baeume ohne System-Vorfahren (klar von System getrennt)
  // ----------------------------------------
  const customRootAgents = useMemo<AgentNode[]>(() => {
    const customNodeMap = new Map<string, AgentNode>();
    nonGroupCustom.forEach((customAgent) => {
      if (customAgentHasBuiltInAncestor(customAgent, customById, BUILT_IN_ID_SET)) return;
      customNodeMap.set(customAgent.id, {
        id: customAgent.id,
        name: customAgent.name,
        icon: customAgent.icon,
        color: customAgent.color,
        status: customAgent.id === selectedAgentId ? 'active' : 'idle',
        description: customAgent.description || 'Benutzerdefinierter Agent',
        isBuiltIn: false,
        children: [],
      });
    });

    const roots: AgentNode[] = [];
    nonGroupCustom.forEach((customAgent) => {
      if (customAgentHasBuiltInAncestor(customAgent, customById, BUILT_IN_ID_SET)) return;

      const node = customNodeMap.get(customAgent.id);
      if (!node) return;

      const parentId = customAgent.parentAgentId;
      const customParent = parentId ? customNodeMap.get(parentId) : undefined;

      if (customParent) {
        customParent.children = customParent.children?.length
          ? [...customParent.children, node]
          : [node];
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [nonGroupCustom, customById, selectedAgentId]);

  const groupNodes = useMemo<AgentNode[]>(() => {
    return customAgents
      .filter((customAgent) => customAgent.type === 'group' && !customAgent.parentGroupId)
      .map((groupAgent) => ({
        id: groupAgent.id,
        name: groupAgent.name,
        icon: groupAgent.icon,
        color: groupAgent.color,
        status: groupAgent.id === selectedAgentId || groupAgent.id === activeGroupRoomId ? 'active' : 'idle',
        description: `${groupAgent.participantRoles?.length || 0} Teilnehmer`,
        isBuiltIn: false,
        children: [],
      }));
  }, [activeGroupRoomId, customAgents, selectedAgentId]);

  // ----------------------------------------
  // Erste Gruppe als Fallback fuer Gruppen-Hub
  // Wenn noch nichts ausgewaehlt ist, sollen
  // Chat und Settings trotzdem die erste Gruppe oeffnen.
  // ----------------------------------------
  const firstGroupId = groupNodes[0]?.id || null;

  // ----------------------------------------
  // Kontrollleiste an aktiven Kontext anpassen
  // Der gemeinsame Navigations-Hook liefert die
  // sichtbaren Modus-Schalter bereits konsistent.
  // ----------------------------------------
  const visibleControlItems = useMemo(
    () => (showTasksControl ? CONTROL_ITEMS : CONTROL_ITEMS.filter((item) => item.href !== '/agents/tasks')),
    [showTasksControl]
  );

  // ----------------------------------------
  // Eingebettete Tabs behalten ihren lokalen Modus
  // statt ueber /agents* Routen auszubrechen.
  // ----------------------------------------
  const activeModeRoute =
    navigationScope === 'embedded'
      ? mapSpatialModeToHref(embeddedMode)
      : pathname === '/agents/chat' || pathname === '/agents/tasks' || pathname === '/agents/settings'
        ? pathname
        : null;

  const openShellMode = (mode: AgentsSpatialMode) => {
    if (navigationScope === 'embedded') {
      onEmbeddedModeChange?.(mode);
      return;
    }

    if (mode === 'chat' || mode === 'tasks' || mode === 'settings') {
      router.push(mapSpatialModeToHref(mode) || '/agents/chat');
      return;
    }

    router.push('/agents');
  };

  // Agent auswählen (ohne automatisch neuen Chat zu erstellen)
  const handleSelectAgent = (agentId: string) => {
    const modeRoute = activeModeRoute;
    const selectedCustomAgent = customAgents.find((agent) => agent.id === agentId);
    if (selectedCustomAgent?.type === 'group') {
      const targetAdminId = selectedCustomAgent.adminAgentId?.trim() || selectedCustomAgent.id;
      setHubView('groups');
      setActiveGroupRoom(agentId);
      if (modeRoute) {
        setSelectedAgent(agentId);
        focusAgent(agentId);
        openShellMode(modeRoute === '/agents/tasks' ? 'tasks' : modeRoute === '/agents/settings' ? 'settings' : 'chat');
      } else {
        // Im Gruppen-Hub nur in den Raum zoomen, aber keinen
        // Teilnehmer automatisch als aktiv markieren.
        setSelectedAgent(null);
        focusAgent(targetAdminId);
        openShellMode('idle');
      }
      return;
    }

    setHubView('agents');
    setActiveGroupRoom(null);
    setSelectedAgent(agentId);
    focusAgent(agentId);
    openShellMode(modeRoute === '/agents/tasks' ? 'tasks' : modeRoute === '/agents/settings' ? 'settings' : modeRoute ? 'chat' : 'idle');
  };

  const handleClearSelection = () => {
    setActiveGroupRoom(null);
    setSelectedAgent(null);
    focusAgent(null);
  };

  const openAgentsHub = () => {
    setHubView('agents');
    setActiveGroupRoom(null);
    setSelectedAgent(null);
    // Kamera beim Wechsel in den Agent-Hub wieder auf die normale
    // Perspektive zum zentralen Intelligence-Orb zuruecksetzen.
    focusAgent('master');
    openShellMode('idle');
  };

  const openGroupsHub = () => {
    setHubView('groups');
    setActiveGroupRoom(null);
    setSelectedAgent(null);
    focusAgent(null);
    openShellMode('idle');
  };

  const openCouncilsHub = () => {
    setHubView('councils');
    setActiveGroupRoom(null);
    setSelectedAgent(null);
    focusAgent(null);
    openShellMode('idle');
  };

  const handleStartRenameCouncil = (councilId: string, councilName: string) => {
    setEditingCouncilId(councilId);
    setEditingCouncilName(councilName);
  };

  const handleCommitRenameCouncil = () => {
    if (!editingCouncilId) {
      return;
    }

    const normalizedName = editingCouncilName.trim();
    if (normalizedName) {
      updateCouncilName(editingCouncilId, normalizedName);
    }

    setEditingCouncilId(null);
    setEditingCouncilName('');
  };

  const renderControlLink = (
    href: (typeof CONTROL_ITEMS)[number]['href'],
    label: (typeof CONTROL_ITEMS)[number]['label'],
    Icon: (typeof CONTROL_ITEMS)[number]['Icon']
  ) => {
    return (
      <button
        key={href}
        type="button"
        onClick={() => openMode(href)}
        data-agent-button={
          href === '/agents/tasks'
            ? 'agents-control-tasks'
            : href === '/agents/settings'
              ? 'agents-control-settings'
              : href === '/agents/chat'
                ? 'agents-control-chat'
                : undefined
        }
        aria-label={label}
        title={label}
        className={`flex flex-1 items-center justify-center rounded px-2 py-2 transition-colors ${
          isControlActive(href) ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/80'
        }`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      </button>
    );
  };

  // Agent erstellen
  const handleCreateAgent = () => {
    if (createLockRef.current) return;
    const trimmedName = agentNameInput.trim();
    if (!trimmedName) return;
    createLockRef.current = true;

    const newAgentId = createCustomAgent(
      trimmedName,
      agentDescriptionInput.trim() || undefined,
      'Bot',
      '#8B5CF6',
      agentParentIdInput !== 'root' ? agentParentIdInput : undefined
    );
    // Agent-Config sofort auf den sichtbaren Namen/Farbe synchronisieren
    updateAgentConfig(newAgentId, {
      agentName: trimmedName,
      orbColor: '#8B5CF6',
    });
    setAgentNameInput('');
    setAgentDescriptionInput('');
    setAgentParentIdInput('root');
    setShowCreateModal(false);
    setHubView('agents');
    setActiveGroupRoom(null);
    setSelectedAgent(newAgentId);
    focusAgent(newAgentId);
    openShellMode('settings');
    setTimeout(() => {
      createLockRef.current = false;
    }, 250);
  };

  // Subagent-Flow für einen bestehenden Agent starten
  const handleStartCreateSubagent = (parentAgentId: string) => {
    setCreationMode('agent');
    setGroupFormError('');
    setAgentNameInput('');
    setAgentDescriptionInput('');
    setAgentParentIdInput(parentAgentId);
    setShowCreateModal(true);
  };

  // Gruppe erstellen (als Agent-Sidebar-Eintrag)
  const handleCreateGroupChat = () => {
    if (createLockRef.current) return;
    setGroupFormError('');
    const validParticipants = groupParticipants.filter(
      (participant) => participant.agentId.trim()
    );
    if (validParticipants.length === 0) {
      setGroupFormError('Bitte mindestens einen Teilnehmer auswaehlen.');
      return;
    }

    if (!groupAdminAgentId.trim()) {
      setGroupFormError('Bitte einen Admin fuer die Gruppe auswaehlen.');
      return;
    }

    const normalizedAdminAgentId = groupAdminAgentId.trim();
    if (!validParticipants.some((participant) => participant.agentId === normalizedAdminAgentId)) {
      setGroupFormError('Der Admin muss einer der zugewiesenen Teilnehmer sein.');
      return;
    }

    createLockRef.current = true;

    const groupName = groupTitleInput.trim() || 'Neue Gruppe';
    const newGroupId = createGroupAgent(groupName, validParticipants, normalizedAdminAgentId);
    // Gruppen ebenfalls im Agent-Config-Store synchron halten
    updateAgentConfig(newGroupId, {
      agentName: groupName,
      orbColor: '#14B8A6',
    });
    setGroupTitleInput('');
    setGroupParticipants([]);
    setGroupAdminAgentId('');
    setShowCreateModal(false);
    setHubView('groups');
    setActiveGroupRoom(newGroupId);
    setSelectedAgent(newGroupId);
    focusAgent(newGroupId);
    openShellMode('settings');
    setTimeout(() => {
      createLockRef.current = false;
    }, 250);
  };

  // Teilnehmer-Zeile hinzufügen
  const addParticipantRow = () => {
    setGroupParticipants((prev) => [...prev, { agentId: '', role: '' }]);
  };

  // Teilnehmer-Zeile aktualisieren
  const updateParticipantRow = (index: number, updates: Partial<GroupChatParticipantRole>) => {
    setGroupParticipants((prev) =>
      prev.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, ...updates } : participant
      )
    );
  };

  // Teilnehmer-Zeile entfernen
  const removeParticipantRow = (index: number) => {
    setGroupParticipants((prev) => prev.filter((_, participantIndex) => participantIndex !== index));
  };

  // Subagenten eines Knotens ein-/ausklappen
  const toggleNodeCollapsed = (nodeId: string) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Agent-Tree rekursiv rendern (inkl. Subagents)
  // alignLeft: eigene Agents linksbündig, Subagents von Intelligence eingerückt
  const renderAgentTree = (agent: AgentNode, depth: number, alignLeft?: boolean) => {
    return (
      <div key={agent.id} className={depth === 0 ? 'mb-1' : ''}>
        <AgentTreeItem
          agent={agent}
          isSelected={agent.id === selectedAgentId}
          onClick={() => handleSelectAgent(agent.id)}
          depth={depth}
          alignLeft={alignLeft}
          onCreateSubagent={() => handleStartCreateSubagent(agent.id)}
          onDelete={() => {
            if (!agent.isBuiltIn && confirm(`Agent "${agent.name}" wirklich löschen?`)) {
              deleteCustomAgent(agent.id);
            }
          }}
          canDelete={!agent.isBuiltIn}
          hasChildren={Boolean(agent.children && agent.children.length > 0)}
          isCollapsed={collapsedNodeIds.has(agent.id)}
          onToggleCollapsed={() => toggleNodeCollapsed(agent.id)}
        />
        {agent.children && agent.children.length > 0 && !collapsedNodeIds.has(agent.id) && (
          <AnimatePresence>
            {agent.children.map((child) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {renderAgentTree(child, depth + 1)}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    );
  };

  // Tree flatten für Icons und Select-Optionen
  const flattenAgents = (agents: AgentNode[]): Array<{ agent: AgentNode; depth: number }> => {
    const result: Array<{ agent: AgentNode; depth: number }> = [];
    const walk = (list: AgentNode[], depth: number) => {
      list.forEach((agent) => {
        result.push({ agent, depth });
        if (agent.children && agent.children.length > 0) {
          walk(agent.children, depth + 1);
        }
      });
    };
    walk(agents, 0);
    return result;
  };
  const flatAgentEntries = useMemo(
    () => [...flattenAgents(systemAgents), ...flattenAgents(customRootAgents)],
    [systemAgents, customRootAgents]
  );

  // ----------------------------------------
  // Portal: Agent/Gruppe erstellen — viewport-zentriert, höchster z-index
  // ----------------------------------------
  const participantModal =
    participantTargetGroupId &&
    (() => {
      const targetGroup = groupNodes.find((g) => g.id === participantTargetGroupId);
      return (
        <AddParticipantModal
          groupId={participantTargetGroupId}
          groupName={targetGroup?.name || 'Gruppe'}
          onClose={() => setParticipantTargetGroupId(null)}
        />
      );
    })();

  const createAgentGroupPortal =
    overlayMounted &&
    createPortal(
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            key="agent-create-overlay"
            role="dialog"
            aria-modal="true"
            className={`fixed inset-0 ${AGENTS_OVERLAY_Z} flex items-center justify-center p-4`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              data-agent-panel="agents-create-modal"
              className="relative z-[1] max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
                  <button
                    onClick={() => {
                      setCreationMode('agent');
                      setGroupFormError('');
                    }}
                    data-agent-button="agents-create-agent"
                    className={`rounded px-2 py-1 text-[11px] ${creationMode === 'agent' ? 'bg-white/15 text-white' : 'text-white/50'}`}
                  >
                    Neuer Agent
                  </button>
                  <button
                    onClick={() => {
                      setCreationMode('group');
                      setGroupFormError('');
                      setGroupAdminAgentId('');
                      setGroupParticipants((prev) => (prev.length > 0 ? prev : [{ agentId: '', role: '' }]));
                    }}
                    data-agent-button="agents-create-group"
                    className={`rounded px-2 py-1 text-[11px] ${creationMode === 'group' ? 'bg-white/15 text-white' : 'text-white/50'}`}
                  >
                    Gruppenchat
                  </button>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white/60"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {creationMode === 'agent' ? (
                <div className="space-y-2">
                  <input
                    value={agentNameInput}
                    onChange={(event) => setAgentNameInput(event.target.value)}
                    data-agent-input="agents-create-agent-name"
                    placeholder="Agent-Name..."
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
                  />
                  <input
                    value={agentDescriptionInput}
                    onChange={(event) => setAgentDescriptionInput(event.target.value)}
                    data-agent-input="agents-create-agent-description"
                    placeholder="Rolle/Beschreibung (optional)..."
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
                  />
                  <select
                    value={agentParentIdInput}
                    onChange={(event) => setAgentParentIdInput(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="root">Unter Intelligence (Standard)</option>
                    {flatAgentEntries.map(({ agent, depth }) => (
                      <option key={agent.id} value={agent.id}>
                        Als Subagent von: {'\u00A0'.repeat(depth * 2)}{agent.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleCreateAgent}
                    data-agent-button="agents-create-agent-submit"
                    className="w-full rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600"
                  >
                    Agent erstellen
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    value={groupTitleInput}
                    onChange={(event) => setGroupTitleInput(event.target.value)}
                    data-agent-input="agents-create-group-name"
                    placeholder="Gruppenchat-Titel..."
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
                  />
                  <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                    {groupParticipants.map((participant, index) => (
                      <div key={`participant-${index}`} className="flex items-center gap-1.5">
                        <select
                          value={participant.agentId}
                          onChange={(event) => updateParticipantRow(index, { agentId: event.target.value })}
                          className="flex-1 rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                        >
                          <option value="">Agent wählen...</option>
                          {flatAgentEntries.map(({ agent, depth }) => (
                            <option key={agent.id} value={agent.id}>
                              {'\u00A0'.repeat(depth * 2)}{agent.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={participant.role}
                          onChange={(event) => updateParticipantRow(index, { role: event.target.value })}
                          placeholder="Rolle"
                          className="w-24 rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-[11px] text-white placeholder:text-white/40 focus:outline-none"
                        />
                        <button
                          onClick={() => removeParticipantRow(index)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <select
                    value={groupAdminAgentId}
                    onChange={(event) => setGroupAdminAgentId(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  >
                    <option value="">Admin / Orchestrator wählen...</option>
                    {groupParticipants
                      .filter((participant) => participant.agentId.trim())
                      .map((participant, index) => {
                        const resolvedAgent = flatAgentEntries.find(({ agent }) => agent.id === participant.agentId.trim());
                        const label = resolvedAgent?.agent.name || participant.agentId.trim();
                        const roleSuffix = participant.role.trim() ? ` (${participant.role.trim()})` : '';
                        return (
                          <option key={`group-admin-${participant.agentId}-${index}`} value={participant.agentId.trim()}>
                            {label}{roleSuffix}
                          </option>
                        );
                      })}
                  </select>
                  <button
                    onClick={addParticipantRow}
                    className="w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20"
                  >
                    Teilnehmer hinzufügen
                  </button>
                  <button
                    onClick={handleCreateGroupChat}
                    data-agent-button="agents-create-group-submit"
                    className="w-full rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600"
                  >
                    Gruppenchat erstellen
                  </button>
                  {groupFormError && <p className="text-[11px] text-rose-300">{groupFormError}</p>}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );

  // ----------------------------------------
  // Kollabierte Ansicht (nur Icons)
  // ----------------------------------------
  if (isCollapsed) {
    return (
      <>
        <div
          className="flex h-full w-12 flex-col items-center gap-1 py-3"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleClearSelection();
            }
          }}
          style={sidebarSurfaceStyle}
        >
          {/* Expand-Button */}
          <button
            onClick={toggleAgentSidebar}
            className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="Council-Panel öffnen"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={openCouncilsHub}
            data-agent-button="agents-view-councils-collapsed"
            className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="LLM Council"
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>
        {createAgentGroupPortal}
        {participantModal}
      </>
    );
  }

  // ----------------------------------------
  // Volle Ansicht
  // ----------------------------------------
  return (
    <>
    <div
      className="flex h-full w-56 flex-col"
      style={sidebarSurfaceStyle}
    >
      {/* ----------------------------------------
          Header mit Titel und Collapse-Button
          ---------------------------------------- */}
      <div className="border-b border-white/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={openCouncilsHub}
            className="flex items-center gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-white/5"
          >
            <Layers className="h-4 w-4" style={{ color: accentColor }} />
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: textColor, opacity: 0.6 }}>
              LLM Council
            </h3>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleAgentSidebar}
              className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
              title="Council-Panel einklappen"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ----------------------------------------
          Agent-Baum
          ---------------------------------------- */}
      <div className="border-b border-white/10 p-2">
        <div className="rounded-lg bg-white/5 p-1">
          <button
            onClick={openCouncilsHub}
            data-agent-button="agents-view-councils"
            className="w-full rounded px-2 py-1.5 text-[11px] bg-white/15 text-white"
          >
            LLM Council
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-2"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            handleClearSelection();
          }
        }}
      >
        <div className="space-y-2">
            {/* Council erstellen Button */}
            <button
              type="button"
              onClick={() => {
                persistActiveCouncilDraft();
                createCouncilDraft();
                openCouncilsHub();
              }}
              data-agent-button="agents-council-create"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 px-3 py-2 text-xs text-white/60 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white/80"
            >
              <Plus className="h-3.5 w-3.5" />
              New council
            </button>

            {/* Councils Liste */}
            <div className="space-y-1">
              {councils.length > 0 ? (
                councils.map((council) => {
                  const isSelectedCouncil = hubView === 'councils' && council.id === activeCouncilDraftId;

                  return (
                  <div
                    key={council.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                      isSelectedCouncil
                        ? 'border-white/20 bg-white/12 text-white'
                        : 'border-white/10 bg-white/[0.04] text-white/45 hover:border-white/20 hover:bg-white/[0.08] hover:text-white/75'
                    }`}
                  >
                    {editingCouncilId === council.id ? (
                      <input
                        type="text"
                        value={editingCouncilName}
                        autoFocus
                        onChange={(event) => setEditingCouncilName(event.target.value)}
                        onBlur={handleCommitRenameCouncil}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            handleCommitRenameCouncil();
                          }
                          if (event.key === 'Escape') {
                            setEditingCouncilId(null);
                            setEditingCouncilName('');
                          }
                        }}
                        className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none placeholder:text-white/35 focus:border-white/25"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          persistActiveCouncilDraft();
                          openCouncil(council.id);
                          openCouncilsHub();
                        }}
                        className={`min-w-0 flex-1 truncate text-left transition-colors ${
                          isSelectedCouncil ? 'text-white' : 'text-white/45 hover:text-white/75'
                        }`}
                      >
                        {council.name}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleStartRenameCouncil(council.id, council.name);
                      }}
                      className={`rounded-md p-1 transition-colors ${
                        isSelectedCouncil
                          ? 'text-white/65 hover:bg-white/10 hover:text-white'
                          : 'text-white/35 hover:bg-white/10 hover:text-white/80'
                      }`}
                      title="Rename council"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (editingCouncilId === council.id) {
                          setEditingCouncilId(null);
                          setEditingCouncilName('');
                        }
                        deleteCouncil(council.id);
                      }}
                      className={`rounded-md p-1 transition-colors ${
                        isSelectedCouncil
                          ? 'text-white/65 hover:bg-white/10 hover:text-red-300'
                          : 'text-white/35 hover:bg-white/10 hover:text-red-300'
                      }`}
                      title="Delete council"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )})
              ) : (
                <p className="px-2 py-3 text-[11px] text-white/40">Your first council will appear here.</p>
              )}
            </div>
          </div>
      </div>
    </div>
    {createAgentGroupPortal}
    {participantModal}
    </>
  );
}

// --------------------------------------------
// Komponente: AgentTreeItem
// Ein einzelner Agent im Baum (volle Ansicht)
// --------------------------------------------

interface AgentTreeItemProps {
  agent: AgentNode;
  isSelected: boolean;
  onClick: () => void;
  depth: number;
  onCreateSubagent: () => void;
  onDelete: () => void;
  canDelete: boolean;
  hasChildren: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  alignLeft?: boolean;
  createButtonTitle?: string;
}

function AgentTreeItem({
  agent,
  isSelected,
  onClick,
  depth,
  onCreateSubagent,
  onDelete,
  canDelete,
  hasChildren,
  isCollapsed,
  onToggleCollapsed,
  alignLeft = false,
  createButtonTitle,
}: AgentTreeItemProps) {
  const IconComponent = ICON_MAP[agent.icon] || Bot;

  return (
    <div
      className={`w-full flex items-center gap-2 py-1.5 rounded-lg text-left transition-all group ${
        isSelected
          ? 'bg-white/15 text-white'
          : 'text-white/60 hover:bg-white/10 hover:text-white/80'
      }`}
      style={{
        paddingLeft: alignLeft ? '6px' : `${8 + depth * 16}px`,
        paddingRight: '8px',
      }}
    >
      {/* Collapse-Icon für Subagenten */}
      {hasChildren ? (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleCollapsed();
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white/70"
          title={isCollapsed ? 'Aufklappen' : 'Einklappen'}
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      ) : alignLeft ? null : (
        <span className="h-5 w-5 shrink-0" />
      )}

      {/* Status-Indikator + Icon */}
      <button onClick={onClick} className="relative flex-shrink-0">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: isSelected
              ? `${agent.color}30`
              : 'rgba(255,255,255,0.05)',
            color: isSelected ? agent.color : undefined,
          }}
        >
          <IconComponent className="h-3.5 w-3.5" />
        </div>
        {/* Status-Punkt */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-black/50 ${
            agent.status === 'active'
              ? 'bg-green-400'
              : agent.status === 'idle'
              ? 'bg-white/30'
              : 'bg-red-400/50'
          }`}
        />
      </button>

      {/* Name */}
      <button onClick={onClick} className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-medium">{agent.name}</p>
        {agent.description && depth === 0 && (
          <p className="truncate text-[10px] text-white/30">{agent.description}</p>
        )}
      </button>

      {/* Subagent hinzufügen */}
      <button
        onClick={(event) => {
          event.stopPropagation();
          onCreateSubagent();
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/30 hover:bg-white/10 hover:text-white/70 transition-colors"
        title={createButtonTitle || `Subagent unter ${agent.name} erstellen`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {/* Agent löschen */}
      {canDelete && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/25 hover:bg-white/10 hover:text-rose-400 transition-colors"
          title={`${agent.name} löschen`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// --------------------------------------------
// Komponente: AgentIconButton
// Ein Agent-Icon für die kollabierte Ansicht
// --------------------------------------------

interface AgentIconButtonProps {
  agent: AgentNode;
  isSelected: boolean;
  onClick: () => void;
  collapsed?: boolean;
  isChild?: boolean;
}

function AgentIconButton({ agent, isSelected, onClick, isChild }: AgentIconButtonProps) {
  const IconComponent = ICON_MAP[agent.icon] || Bot;

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center rounded-lg transition-all ${
        isChild ? 'h-7 w-7 my-0.5' : 'h-8 w-8 my-0.5'
      } ${
        isSelected
          ? 'bg-white/15 text-white'
          : 'text-white/40 hover:bg-white/10 hover:text-white/60'
      }`}
      title={agent.name}
    >
      <span style={{ color: isSelected ? agent.color : undefined }}>
        <IconComponent className={isChild ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </span>
    </button>
  );
}
