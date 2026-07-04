// ============================================
// AgentSettingsPage.tsx - Vollwertige Settings-Seite fuer Agents
//
// Zweck: Ersetzt die reine Modal-Nutzung durch eine zentrale
//        Verwaltungsseite fuer Agenten, Gruppen, Analytics und Hierarchie
// Verwendet von: /agents/settings
// ============================================

'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BrainCircuit,
  Wrench,
  BarChart3,
  Network,
  Info,
  Check,
  Plus,
  Trash2,
  ArrowUpToLine,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import type { LLMProvider } from '@/lib/llm/types';
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/llm/model-catalog';
import {
  useAgentConfigStore,
  DEFAULT_AGENT_CONFIG,
  DEFAULT_MODULE_COLORS,
  DEFAULT_AGENT_ICONS,
  DEFAULT_AGENT_NAMES,
  createDefaultAgentMultimodalConfig,
} from '@/lib/agent/stores/agent-config-store';
import { GROUP_CHAT_ROLE_PRESETS } from '../constants';
import { useAgentsStore, useSelectedAgentId } from '../store';
import { useScheduledTasksStore } from '../tasks-store';
import { AGENT_ICON_MAP, AGENT_ICON_OPTIONS } from '../agent-meta';
import { GroupLibraryFilesSection } from './GroupLibraryFilesSection';
import { AgentModeHeader } from './AgentModeHeader';
import type { AgentNavigationScope } from './useAgentModeNavigation';
import { useGroupLibrary } from '../hooks/useGroupLibrary';
import type { AgentsSpatialMode } from '../spatial-types';
import type { GroupChatParticipantRole } from '../types';
import { AgentSettingsAnalyticsPanel, AgentSettingsHierarchyPanel } from './AgentSettingsAnalyticsHierarchy';
import { buildFullAgentEntries, type AgentListEntry } from './agent-settings-entries';

// --------------------------------------------
// Typen fuer die Seiten-UI
// --------------------------------------------

type SettingsTab = 'general' | 'model' | 'behavior' | 'analytics' | 'hierarchy';

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string; Icon: LucideIcon }> = [
  { id: 'general', label: 'General', Icon: Info },
  { id: 'model', label: 'Model & Prompt', Icon: BrainCircuit },
  { id: 'behavior', label: 'Behavior & Tools', Icon: Wrench },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { id: 'hierarchy', label: 'Hierarchy', Icon: Network },
];

const COLOR_SWATCHES = [
  '#0ea5e9',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#EF4444',
  '#14B8A6',
];

const EMPTY_TOOL_IDS: string[] = [];
const EMPTY_SKILL_IDS: string[] = [];
const EMPTY_INTEGRATION_IDS: string[] = [];
const EMPTY_PARTICIPANT_ROLES: GroupChatParticipantRole[] = [];

const tabLoadingState = () => (
  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
    Bereich wird geladen...
  </div>
);

const AgentSettingsModelTab = dynamic(
  () => import('./AgentSettingsModelTab').then((mod) => mod.AgentSettingsModelTab),
  { loading: tabLoadingState }
);

const AgentSettingsBehaviorTab = dynamic(
  () => import('./AgentSettingsBehaviorTab').then((mod) => mod.AgentSettingsBehaviorTab),
  { loading: tabLoadingState }
);

// --------------------------------------------
// Hilfsfunktionen fuer Darstellung und Analytics
// --------------------------------------------

// --------------------------------------------
// Hauptseite
// --------------------------------------------

interface AgentSettingsPageProps {
  navigationScope?: AgentNavigationScope;
  embeddedMode?: AgentsSpatialMode;
  onEmbeddedModeChange?: (mode: AgentsSpatialMode) => void;
}

export function AgentSettingsPage({
  navigationScope = 'global',
  embeddedMode,
  onEmbeddedModeChange,
}: AgentSettingsPageProps) {
  const customAgents = useAgentsStore((state) => state.customAgents);
  const selectedAgentId = useSelectedAgentId();
  const setSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);
  const { textColor, surface } = useThemeStyles();

  const entries = useMemo<AgentListEntry[]>(() => buildFullAgentEntries(customAgents), [customAgents]);

  const focusedEntry =
    entries.find((entry) => entry.id === selectedAgentId) ||
    entries.find((entry) => entry.id === 'master') ||
    entries[0] ||
    null;

  const handleFocusAgent = (agentId: string) => {
    setSelectedAgent(agentId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      {focusedEntry ? (
        <>
          <AgentModeHeader
            mode="settings"
            agentName={focusedEntry.name}
            agentColor={focusedEntry.color}
            description="Konfiguration, Analytics und Hierarchie fuer den aktuell ausgewaehlten Orb."
            navigationScope={navigationScope}
            embeddedMode={embeddedMode}
            onEmbeddedModeChange={onEmbeddedModeChange}
          />
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5" style={surface.base}>
            <AgentSettingsDetail
              key={focusedEntry.id}
              focusedEntry={focusedEntry}
              entries={entries}
              onFocusAgent={handleFocusAgent}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm" style={{ color: textColor, opacity: 0.5 }}>
          Kein Agent gefunden.
        </div>
      )}
    </div>
  );
}

// --------------------------------------------
// Detailbereich fuer den aktiven Agenten
// Kapselt Formularzustand pro Auswahl in einer eigenen Instanz
// --------------------------------------------

function AgentSettingsDetail({
  focusedEntry,
  entries,
  onFocusAgent,
}: {
  focusedEntry: AgentListEntry;
  entries: AgentListEntry[];
  onFocusAgent: (agentId: string) => void;
}) {
  const customAgents = useAgentsStore((state) => state.customAgents);
  const updateCustomAgent = useAgentsStore((state) => state.updateCustomAgent);
  const updateGroupAgent = useAgentsStore((state) => state.updateGroupAgent);
  const tasks = useScheduledTasksStore((state) => state.tasks);

  const ensureConfig = useAgentConfigStore((state) => state.ensureConfig);
  const storedConfig = useAgentConfigStore((state) => state.configs[focusedEntry.id]);
  const updateConfig = useAgentConfigStore((state) => state.updateConfig);

  const { accentColor } = useThemeStyles();

  const [tab, setTab] = useState<SettingsTab>('general');
  const [saveNotice, setSaveNotice] = useState('');

  useEffect(() => {
    ensureConfig(focusedEntry.id);
  }, [ensureConfig, focusedEntry.id]);

  const isGroup = focusedEntry.kind === 'group';
  const isSystem = focusedEntry.kind === 'system';
  const currentCustomAgent = customAgents.find((agent) => agent.id === focusedEntry.id);
  const {
    library,
    folders: groupLibraryFolders,
    documents: groupLibraryDocuments,
    isLoading: isGroupLibraryLoading,
    ensureLibrary,
    refresh: refreshGroupLibrary,
    updateLibrary,
    importFiles: importGroupFiles,
    downloadZip: downloadGroupZip,
  } = useGroupLibrary(isGroup ? focusedEntry.id : null, {
    name: currentCustomAgent?.name || focusedEntry.name,
    description: currentCustomAgent?.description || focusedEntry.description || '',
    objective: currentCustomAgent?.objective || '',
  });
  const participantOptions = useMemo(
    () =>
      entries
        .filter((entry) => entry.kind !== 'group' && entry.id !== focusedEntry.id)
        .map((entry) => ({ id: entry.id, name: entry.name })),
    [entries, focusedEntry.id]
  );

  const builtInFallbackName = DEFAULT_AGENT_NAMES[focusedEntry.id] || focusedEntry.name;
  const builtInFallbackColor = DEFAULT_MODULE_COLORS?.[focusedEntry.id] || focusedEntry.color || '#8B5CF6';
  const builtInFallbackIcon = DEFAULT_AGENT_ICONS?.[focusedEntry.id] || focusedEntry.icon || 'Bot';
  const fallbackMultimodalConfig = useMemo(() => createDefaultAgentMultimodalConfig(), []);
  const syncedAgentName = storedConfig?.agentName || focusedEntry.name || builtInFallbackName;
  const syncedDescription = currentCustomAgent?.description || focusedEntry.description || '';
  const syncedObjective = currentCustomAgent?.objective || '';
  const syncedIcon = storedConfig?.agentIcon || focusedEntry.icon || builtInFallbackIcon;
  const syncedColor = storedConfig?.orbColor || focusedEntry.color || builtInFallbackColor;
  const syncedProvider = storedConfig?.llmProvider || DEFAULT_AGENT_CONFIG.llmProvider;
  const syncedModel = storedConfig?.llmModel || DEFAULT_AGENT_CONFIG.llmModel;
  const syncedTemperature = storedConfig?.temperature ?? DEFAULT_AGENT_CONFIG.temperature;
  const syncedMaxTokens = storedConfig?.maxTokens ?? DEFAULT_AGENT_CONFIG.maxTokens;
  const syncedPrompt = storedConfig?.systemPrompt || DEFAULT_AGENT_CONFIG.systemPrompt;
  const syncedMultimodal = storedConfig?.multimodal || fallbackMultimodalConfig;
  const syncedVisualMode = storedConfig?.visualModeEnabled ?? DEFAULT_AGENT_CONFIG.visualModeEnabled;
  const syncedVisualTools = storedConfig?.visualTools || EMPTY_TOOL_IDS;
  const syncedEnabledTools = storedConfig?.enabledTools || EMPTY_TOOL_IDS;
  const syncedHumanInTheLoopTools = storedConfig?.humanInTheLoopTools || EMPTY_TOOL_IDS;
  const syncedEnabledSkills = storedConfig?.enabledSkills || EMPTY_SKILL_IDS;
  const syncedAllowedIntegrations = storedConfig?.allowedIntegrations || EMPTY_INTEGRATION_IDS;
  const syncedParticipants = focusedEntry.participantRoles || EMPTY_PARTICIPANT_ROLES;

  const [name, setName] = useState(syncedAgentName);
  const [description, setDescription] = useState(syncedDescription);
  const [objective, setObjective] = useState(syncedObjective);
  const [icon, setIcon] = useState(syncedIcon);
  const [color, setColor] = useState(syncedColor);
  const [provider, setProvider] = useState<LLMProvider>(syncedProvider);
  const [model, setModel] = useState(syncedModel);
  const [temperature, setTemperature] = useState(syncedTemperature);
  const [maxTokens, setMaxTokens] = useState(syncedMaxTokens);
  const [prompt, setPrompt] = useState(syncedPrompt);
  const [multimodal, setMultimodal] = useState(syncedMultimodal);
  const [visualMode, setVisualMode] = useState(syncedVisualMode);
  const [visualTools, setVisualTools] = useState<string[]>(syncedVisualTools);
  const [enabledTools, setEnabledTools] = useState<string[]>(syncedEnabledTools);
  const [humanInTheLoopTools, setHumanInTheLoopTools] = useState<string[]>(syncedHumanInTheLoopTools);
  const [enabledSkills, setEnabledSkills] = useState<string[]>(syncedEnabledSkills);
  const [allowedIntegrations, setAllowedIntegrations] = useState<string[]>(syncedAllowedIntegrations);
  const [participants, setParticipants] = useState<GroupChatParticipantRole[]>(syncedParticipants);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setName(syncedAgentName);
    setDescription(syncedDescription);
    setObjective(syncedObjective);
    setIcon(syncedIcon);
    setColor(syncedColor);
    setProvider(syncedProvider);
    setModel(syncedModel);
    setTemperature(syncedTemperature);
    setMaxTokens(syncedMaxTokens);
    setPrompt(syncedPrompt);
    setMultimodal(syncedMultimodal);
    setVisualMode(syncedVisualMode);
    setVisualTools(syncedVisualTools);
    setEnabledTools(syncedEnabledTools);
    setHumanInTheLoopTools(syncedHumanInTheLoopTools);
    setEnabledSkills(syncedEnabledSkills);
    setAllowedIntegrations(syncedAllowedIntegrations);
    setParticipants(syncedParticipants);
  }, [
    syncedAgentName,
    syncedColor,
    syncedDescription,
    syncedVisualTools,
    syncedEnabledTools,
    syncedHumanInTheLoopTools,
    syncedEnabledSkills,
    syncedAllowedIntegrations,
    syncedIcon,
    syncedMaxTokens,
    syncedModel,
    syncedMultimodal,
    syncedObjective,
    syncedParticipants,
    syncedPrompt,
    syncedProvider,
    syncedTemperature,
    syncedVisualMode,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!saveNotice) return;
    const timeoutId = window.setTimeout(() => setSaveNotice(''), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [saveNotice]);

  const relatedTasks = useMemo(
    () => tasks.filter((task) => task.targetId === focusedEntry.id),
    [focusedEntry.id, tasks]
  );

  const parentEntry = useMemo(() => {
    if (focusedEntry.parentGroupId) {
      return entries.find((entry) => entry.id === focusedEntry.parentGroupId) || null;
    }
    if (focusedEntry.parentId) {
      return entries.find((entry) => entry.id === focusedEntry.parentId) || null;
    }
    if (focusedEntry.kind === 'system' && focusedEntry.id !== 'master') {
      return entries.find((entry) => entry.id === 'master') || null;
    }
    return null;
  }, [entries, focusedEntry]);

  const handleToggleHumanInLoop = (toolId: string) => {
    setHumanInTheLoopTools((prev) =>
      prev.includes(toolId) ? prev.filter((entry) => entry !== toolId) : [...prev, toolId]
    );
  };

  const handleUpdateParticipant = (index: number, updates: Partial<GroupChatParticipantRole>) => {
    setParticipants((prev) =>
      prev.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, ...updates } : participant
      )
    );
  };

  const handlePinGroupLibraryToDashboard = async () => {
    if (!isGroup) return;
    await ensureLibrary();
    const response = await fetch('/api/dashboard-folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surfaceType: 'home',
        surfaceId: 'main',
        name: `${name.trim() || focusedEntry.name} Dateien`,
        color,
        x: 96,
        y: 144,
        linkedGroupId: focusedEntry.id,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      setSaveNotice('Dashboard-Link konnte nicht erstellt werden.');
      return;
    }
    await updateLibrary({ linkedDashboardFolderId: data.folder.id });
    setSaveNotice('Gruppenordner wurde im Dashboard angelegt.');
  };

  const handleSaveModelSettings = () => {
    updateConfig(focusedEntry.id, {
      llmProvider: 'openai',
      llmModel: model,
      temperature,
      maxTokens,
      systemPrompt: prompt,
      multimodal,
    });
    setSaveNotice('Modelleinstellungen gespeichert.');
  };

  const handleSaveGeneralSettings = async () => {
    const normalizedName = name.trim() || focusedEntry.name;
    const normalizedDescription = description.trim();
    const normalizedObjective = objective.trim();

    if (isGroup) {
      const normalizedParticipants = participants
        .filter((participant) => participant.agentId.trim() !== '')
        .map((participant) => ({
          ...participant,
          agentId: participant.agentId.trim(),
          role: participant.role.trim(),
        }));

      const currentAdminAgentId = currentCustomAgent?.adminAgentId?.trim() || '';
      if (
        currentAdminAgentId
        && normalizedParticipants.length > 0
        && !normalizedParticipants.some((participant) => participant.agentId === currentAdminAgentId)
      ) {
        setSaveNotice('Speichern fehlgeschlagen: Der aktuelle Gruppen-Admin muss Teilnehmer bleiben.');
        return;
      }

      updateGroupAgent(focusedEntry.id, {
        name: normalizedName,
        description: normalizedDescription,
        objective: normalizedObjective,
        color,
        icon,
        participantRoles: normalizedParticipants,
      });

      updateConfig(focusedEntry.id, {
        agentName: normalizedName,
        agentIcon: icon,
        orbColor: color,
      });

      try {
        await ensureLibrary();
        await updateLibrary({
          name: normalizedName,
          description: normalizedDescription,
          objective: normalizedObjective,
          linkedDashboardFolderId: library?.linkedDashboardFolderId || null,
        });
      } catch {
        setSaveNotice('Agent gespeichert, aber die Gruppenbibliothek konnte nicht synchronisiert werden.');
        return;
      }

      setSaveNotice('Gruppeneinstellungen gespeichert.');
      return;
    }

    if (!isSystem && currentCustomAgent) {
      updateCustomAgent(focusedEntry.id, {
        name: normalizedName,
        description: normalizedDescription,
        icon,
        color,
      });
    }

    updateConfig(focusedEntry.id, {
      agentName: normalizedName,
      agentIcon: icon,
      orbColor: color,
    });

    setSaveNotice('Agent-Einstellungen gespeichert.');
  };

  const handleSaveBehaviorSettings = () => {
    updateConfig(focusedEntry.id, {
      visualModeEnabled: visualMode,
      visualTools,
      enabledTools,
      humanInTheLoopTools,
      enabledSkills,
      allowedIntegrations,
    });

    setSaveNotice('Verhalten und Tools gespeichert.');
  };

  const handleResetModelSettings = () => {
    const nextMultimodal = createDefaultAgentMultimodalConfig();
    setProvider('openai');
    setModel(DEFAULT_OPENROUTER_MODEL_ID);
    setTemperature(DEFAULT_AGENT_CONFIG.temperature);
    setMaxTokens(DEFAULT_AGENT_CONFIG.maxTokens);
    setPrompt(DEFAULT_AGENT_CONFIG.systemPrompt);
    setMultimodal(nextMultimodal);
    updateConfig(focusedEntry.id, {
      llmProvider: 'openai',
      llmModel: DEFAULT_OPENROUTER_MODEL_ID,
      temperature: DEFAULT_AGENT_CONFIG.temperature,
      maxTokens: DEFAULT_AGENT_CONFIG.maxTokens,
      systemPrompt: DEFAULT_AGENT_CONFIG.systemPrompt,
      multimodal: nextMultimodal,
    });
    setSaveNotice('Multimodale Modelle wurden zurueckgesetzt.');
  };

  return (
    <div className="space-y-4">
      {saveNotice ? (
        <p className="text-right text-xs sm:text-sm" style={{ color: accentColor }}>
          {saveNotice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2 md:gap-2">
        {SETTINGS_TABS.map(({ id, label, Icon: TabIcon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors md:gap-2 md:px-3 md:py-2 md:text-sm"
              style={{
                background: active ? `${color}22` : 'transparent',
                color: active ? color : 'rgba(255,255,255,0.55)',
                border: active ? `1px solid ${color}44` : '1px solid transparent',
              }}
            >
              <TabIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'general' && (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">General</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-white/60">Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-white/60">Beschreibung</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  disabled={isSystem}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                />
                {isSystem && (
                  <p className="mt-1 text-[11px] text-white/40">
                    System-Agenten nutzen hier nur eine Info-Beschreibung. Persistiert bearbeitet werden Name, Icon und Farbe ueber die Config.
                  </p>
                )}
              </div>

              {isGroup && (
                <div>
                  <label className="mb-1 block text-xs text-white/60">Group Objective</label>
                  <textarea
                    value={objective}
                    onChange={(event) => setObjective(event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
                    placeholder="Was ist das zentrale Ziel dieser Gruppe?"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-white/60">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {AGENT_ICON_OPTIONS.map((option) => {
                    const IconComponent = AGENT_ICON_MAP[option.key] || BrainCircuit;
                    const isActive = icon === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setIcon(option.key)}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                          isActive
                            ? 'border-white/25 bg-white/15 text-white'
                            : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
                        }`}
                        title={option.label}
                      >
                        <IconComponent className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-white/60">Farbe</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setColor(swatch)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border"
                      style={{
                        backgroundColor: swatch,
                        borderColor: color === swatch ? '#ffffff' : 'rgba(255,255,255,0.15)',
                      }}
                    >
                      {color === swatch ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-xl border border-white/10 bg-white/5 p-1"
                  />
                </div>
              </div>

              {isGroup && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs text-white/60">Teilnehmer & Rollen</label>
                    <button
                      type="button"
                      onClick={() => setParticipants((prev) => [...prev, { agentId: '', role: '' }])}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/75 hover:bg-white/15"
                    >
                      <Plus className="h-3 w-3" />
                      Zeile
                    </button>
                  </div>
                  <datalist id={`roles-${focusedEntry.id}`}>
                    {GROUP_CHAT_ROLE_PRESETS.map((role) => (
                      <option key={role} value={role} />
                    ))}
                  </datalist>
                  <div className="space-y-2">
                    {participants.map((participant, index) => (
                      <div key={`participant-${index}`} className="flex items-center gap-2">
                        <select
                          value={participant.agentId}
                          onChange={(event) => handleUpdateParticipant(index, { agentId: event.target.value })}
                          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white focus:border-white/25 focus:outline-none"
                        >
                          <option value="">Agent waehlen...</option>
                          {participantOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={participant.role}
                          list={`roles-${focusedEntry.id}`}
                          onChange={(event) => handleUpdateParticipant(index, { role: event.target.value })}
                          placeholder="Rolle"
                          className="w-32 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setParticipants((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isGroup ? (
                <GroupLibraryFilesSection
                  groupName={name.trim() || focusedEntry.name}
                  library={library}
                  folders={groupLibraryFolders}
                  documents={groupLibraryDocuments}
                  isLoading={isGroupLibraryLoading}
                  onEnsureLibrary={ensureLibrary}
                  onRefresh={refreshGroupLibrary}
                  onImportFiles={importGroupFiles}
                  onDownloadZip={downloadGroupZip}
                  onPinToDashboard={handlePinGroupLibraryToDashboard}
                />
              ) : null}
            </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Identity Snapshot</h3>
              <div className="space-y-2 text-sm text-white/65">
                <div className="flex justify-between gap-4">
                  <span>Typ</span>
                  <span className="text-white">{focusedEntry.kind}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Agent-ID</span>
                  <span className="truncate text-white">{focusedEntry.id}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Parent</span>
                  <span className="text-white">{parentEntry?.name || 'Kein Parent'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Gruppen-Tasks</span>
                  <span className="text-white">{relatedTasks.length}</span>
                </div>
                {isGroup ? (
                  <div className="flex justify-between gap-4">
                    <span>Dashboard-Link</span>
                    <span className="truncate text-white">
                      {library?.linkedDashboardFolderId || 'Noch keiner'}
                    </span>
                  </div>
                ) : null}
              </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Notiz</h3>
              <p className="text-sm text-white/55">
                Diese Seite nutzt bestehende Agent-Config-Daten. Analytics sind aktuell als Schaetzung markiert, bis echte Provider-Usage persistiert wird.
              </p>
              {isGroup ? (
                <button
                  type="button"
                  onClick={() => void handlePinGroupLibraryToDashboard()}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/85 hover:bg-white/15"
                >
                  <ArrowUpToLine className="h-3.5 w-3.5" />
                  Gruppenordner im Dashboard anlegen
                </button>
              ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSaveGeneralSettings()}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
            >
              Allgemeine Einstellungen speichern
            </button>
          </div>
        </div>
      )}

      {tab === 'model' && (
        <AgentSettingsModelTab
          provider={provider}
          onProviderChange={setProvider}
          model={model}
          onModelChange={setModel}
          temperature={temperature}
          onTemperatureChange={setTemperature}
          maxTokens={maxTokens}
          onMaxTokensChange={setMaxTokens}
          prompt={prompt}
          onPromptChange={setPrompt}
          multimodal={multimodal}
          onMultimodalChange={setMultimodal}
          onSave={handleSaveModelSettings}
          onReset={handleResetModelSettings}
        />
      )}

      {tab === 'behavior' && (
        <div className="space-y-4">
          <AgentSettingsBehaviorTab
            moduleId={focusedEntry.id}
            visualMode={visualMode}
            onVisualModeChange={setVisualMode}
            visualTools={visualTools}
            onVisualToolsChange={setVisualTools}
            enabledTools={enabledTools}
            onEnabledToolsChange={setEnabledTools}
            humanInTheLoopTools={humanInTheLoopTools}
            onToggleHumanInLoop={handleToggleHumanInLoop}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveBehaviorSettings}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
            >
              Verhalten speichern
            </button>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <AgentSettingsAnalyticsPanel
          focusedEntryId={focusedEntry.id}
          llmModelFallback={model || 'Standard'}
        />
      )}

      {tab === 'hierarchy' && (
        <AgentSettingsHierarchyPanel
          focusedEntry={focusedEntry}
          entries={entries}
          onFocusAgent={onFocusAgent}
        />
      )}
    </div>
  );
}

