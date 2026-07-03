// ============================================
// GroupSettingsPanel.tsx - Wiederverwendbares Panel fuer Gruppeneinstellungen
//
// Zweck: Rendert die vollstaendige Gruppen-Settings-Oberflaeche
//        sowohl eingebettet als Seiteninhalt als auch innerhalb
//        des GroupSettingsModal-Portals.
// Verwendet von: GroupSettingsModal, AgentsSpatialSettingsMode
// ============================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  X,
  Plus,
  Trash2,
  Check,
  Users,
  UsersRound,
  Network,
  MessageSquare,
  Bot,
  Sparkles,
  Briefcase,
  Shield,
  Zap,
  Target,
  Layers,
  CalendarClock,
  ArrowUpToLine,
  Pin,
} from 'lucide-react';
import { useAgentsStore } from '../store';
import { useAgentConfigStore } from '@/lib/agent/stores/agent-config-store';
import type { GroupChatParticipantRole } from '../types';
import { GROUP_CHAT_ROLE_PRESETS } from '../constants';
import { useScheduledTasksStore } from '../tasks-store';
import { useGroupLibrary } from '../hooks/useGroupLibrary';
import { GroupLibraryFilesSection } from './GroupLibraryFilesSection';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Eingebaute Agenten als Teilnehmer-Optionen
// --------------------------------------------
const BUILT_IN_AGENT_OPTIONS = [
  { id: 'master', name: 'Intelligence' },
  { id: 'calendar', name: 'Kalender' },
  { id: 'inbox', name: 'Inbox' },
  { id: 'lab', name: 'Lab' },
];

// --------------------------------------------
// Farbpalette fuer Gruppen (Schnellauswahl)
// --------------------------------------------
const GROUP_COLORS = ['#14B8A6', '#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444'];

// --------------------------------------------
// Icon-Auswahl fuer Gruppen
// --------------------------------------------
const GROUP_ICON_OPTIONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'Users', label: 'Team', Icon: Users },
  { key: 'UsersRound', label: 'Runde', Icon: UsersRound },
  { key: 'Network', label: 'Netz', Icon: Network },
  { key: 'MessageSquare', label: 'Chat', Icon: MessageSquare },
  { key: 'Briefcase', label: 'Projekt', Icon: Briefcase },
  { key: 'Shield', label: 'Schutz', Icon: Shield },
  { key: 'Zap', label: 'Aktion', Icon: Zap },
  { key: 'Target', label: 'Fokus', Icon: Target },
  { key: 'Layers', label: 'Ebenen', Icon: Layers },
  { key: 'Bot', label: 'Bot', Icon: Bot },
  { key: 'Sparkles', label: 'KI', Icon: Sparkles },
];

const DEFAULT_GROUP_COLOR = '#14B8A6';

// --------------------------------------------
// Hex-Farbe normalisieren (#rrggbb)
// --------------------------------------------
function normalizeHexColor(raw: string, fallback: string): string {
  let t = raw.trim();
  if (!t.startsWith('#')) t = `#${t}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase();
  const fb = fallback.trim().startsWith('#') ? fallback.trim() : `#${fallback.trim()}`;
  return /^#[0-9A-Fa-f]{6}$/.test(fb) ? fb.toLowerCase() : DEFAULT_GROUP_COLOR;
}

function isValidHex6(raw: string): boolean {
  const t = raw.trim().startsWith('#') ? raw.trim() : `#${raw.trim()}`;
  return /^#[0-9A-Fa-f]{6}$/.test(t);
}

interface GroupSettingsPanelProps {
  groupId: string;
  onClose?: () => void;
  embedded?: boolean;
}

export function GroupSettingsPanel({
  groupId,
  onClose,
  embedded = false,
}: GroupSettingsPanelProps) {
  const customAgents = useAgentsStore((state) => state.customAgents);
  const updateGroupAgent = useAgentsStore((state) => state.updateGroupAgent);
  const updateAgentConfig = useAgentConfigStore((state) => state.updateConfig);
  const createTask = useScheduledTasksStore((state) => state.createTask);
  const updateTask = useScheduledTasksStore((state) => state.updateTask);
  const tasks = useScheduledTasksStore((state) => state.tasks);
  const { surface, button, input, designStyle } = useThemeStyles();

  const group = useMemo(
    () => customAgents.find((agent) => agent.id === groupId && agent.type === 'group'),
    [customAgents, groupId]
  );

  const participantOptions = useMemo(() => {
    const customAgentOptions = customAgents
      .filter((agent) => agent.type !== 'group' && agent.id !== groupId)
      .map((agent) => ({ id: agent.id, name: agent.name }));
    return [...BUILT_IN_AGENT_OPTIONS, ...customAgentOptions];
  }, [customAgents, groupId]);

  const [groupName, setGroupName] = useState(group?.name || '');
  const [groupDescription, setGroupDescription] = useState(group?.description || '');
  const [groupObjective, setGroupObjective] = useState(group?.objective || '');
  const [groupColor, setGroupColor] = useState(group?.color || DEFAULT_GROUP_COLOR);
  const [groupIcon, setGroupIcon] = useState(group?.icon || 'Users');
  const [participants, setParticipants] = useState<GroupChatParticipantRole[]>(group?.participantRoles || []);
  const [groupAdminAgentId, setGroupAdminAgentId] = useState(group?.adminAgentId || '');
  const [formError, setFormError] = useState('');
  const {
    library,
    folders,
    documents,
    isLoading: isLibraryLoading,
    refresh: refreshLibrary,
    ensureLibrary,
    updateLibrary,
    importFiles,
    downloadZip,
  } = useGroupLibrary(groupId, {
    name: group?.name,
    description: group?.description,
    objective: group?.objective,
  });

  const roleDatalistId = `group-role-presets-${groupId}`;
  const initializedRef = useRef(false);
  const panelStyle = useMemo(
    () => ({
      ...surface.base,
      overflow: 'hidden',
      ...(embedded
        ? {
            display: 'flex',
            height: '100%',
            minHeight: 0,
            flexDirection: 'column' as const,
          }
        : {}),
    }),
    [embedded, surface.base]
  );
  const sectionCardStyle = useMemo(
    () => ({
      ...surface.base,
      background:
        designStyle === 'glass'
          ? 'rgba(255, 255, 255, 0.04)'
          : surface.base.background,
      boxShadow:
        designStyle === 'glass'
          ? '0 18px 40px -20px rgba(15, 23, 42, 0.45)'
          : surface.base.boxShadow,
    }),
    [designStyle, surface.base]
  );
  const inputBaseStyle = useMemo(
    () => ({
      ...input.base,
      color: '#ffffff',
    }),
    [input.base]
  );
  const secondaryButtonStyle = useMemo(
    () => ({
      ...button.base,
      color: '#ffffff',
    }),
    [button.base]
  );
  const primaryButtonStyle = useMemo(
    () => ({
      ...button.primary,
      color: '#ffffff',
    }),
    [button.primary]
  );

  const colorPickerValue = useMemo(
    () => (isValidHex6(groupColor) ? normalizeHexColor(groupColor, DEFAULT_GROUP_COLOR) : DEFAULT_GROUP_COLOR),
    [groupColor]
  );

  useEffect(() => {
    initializedRef.current = false;
  }, [groupId]);

  useEffect(() => {
    if (!group || initializedRef.current) return;
    initializedRef.current = true;
    /* Einmalige Sync nach Store/Persist — set-state-in-effect hier bewusst */
    /* eslint-disable react-hooks/set-state-in-effect */
    setGroupName(group.name || '');
    setGroupDescription(group.description || '');
    setGroupObjective(group.objective || '');
    setGroupColor(group.color || DEFAULT_GROUP_COLOR);
    setGroupIcon(group.icon || 'Users');
    setParticipants(group.participantRoles || []);
    setGroupAdminAgentId(group.adminAgentId || group.participantRoles?.[0]?.agentId || '');
    setFormError('');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [group]);

  // --------------------------------------------
  // Teilnehmerzeilen verwalten
  // --------------------------------------------
  const addParticipantRow = () => {
    setParticipants((prev) => [...prev, { agentId: '', role: '' }]);
  };

  const updateParticipantRow = (index: number, updates: Partial<GroupChatParticipantRole>) => {
    setParticipants((prev) =>
      prev.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, ...updates } : participant
      )
    );
  };

  const removeParticipantRow = (index: number) => {
    setParticipants((prev) => prev.filter((_, participantIndex) => participantIndex !== index));
  };

  const groupTasks = useMemo(
    () => tasks.filter((task) => task.targetType === 'group' && task.targetId === groupId),
    [groupId, tasks]
  );

  const handleCreateScheduledTask = () => {
    const createdTaskId = createTask(groupId);
    if (!createdTaskId) return;
    updateTask(createdTaskId, {
      targetType: 'group',
      title: `Task fuer ${groupName.trim() || group?.name || 'diese Gruppe'}`,
    });
  };

  const handlePinToDashboard = async () => {
    const currentLibrary =
      library ||
      (await ensureLibrary()) ||
      (await refreshLibrary().then(() => null));

    const response = await fetch('/api/dashboard-folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surfaceType: 'home',
        surfaceId: 'main',
        name: `${groupName.trim() || group?.name || 'Gruppe'} Dateien`,
        color: normalizeHexColor(groupColor, DEFAULT_GROUP_COLOR),
        x: 80,
        y: 120,
        linkedGroupId: groupId,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      setFormError(data.message || 'Gruppenordner konnte nicht ans Dashboard angeheftet werden.');
      return;
    }

    const libraryId = currentLibrary?.id || library?.id;
    if (libraryId) {
      await updateLibrary({ linkedDashboardFolderId: data.folder.id });
    }
  };

  const handleSave = async () => {
    setFormError('');
    const normalizedName = groupName.trim();
    const normalizedObjective = groupObjective.trim();

    if (!normalizedName) {
      setFormError('Bitte einen Gruppennamen angeben.');
      return;
    }

    if (!normalizedObjective) {
      setFormError('Bitte ein klares Group Objective angeben.');
      return;
    }

    const normalizedParticipants = participants
      .filter((participant) => participant.agentId.trim() !== '')
      .map((participant) => ({
        agentId: participant.agentId.trim(),
        role: participant.role.trim(),
      }));

    if (normalizedParticipants.length === 0) {
      setFormError('Bitte mindestens einen Teilnehmer hinzufügen.');
      return;
    }

    const normalizedAdminAgentId = groupAdminAgentId.trim();
    if (!normalizedAdminAgentId) {
      setFormError('Bitte einen Admin fuer die Gruppe auswaehlen.');
      return;
    }

    if (!normalizedParticipants.some((participant) => participant.agentId === normalizedAdminAgentId)) {
      setFormError('Der Admin muss einer der Gruppen-Teilnehmer sein.');
      return;
    }

    const normalizedColor = normalizeHexColor(groupColor, group?.color || DEFAULT_GROUP_COLOR);
    const iconKeys = new Set(GROUP_ICON_OPTIONS.map((option) => option.key));
    const safeIcon = iconKeys.has(groupIcon) ? groupIcon : 'Users';

    updateGroupAgent(groupId, {
      name: normalizedName,
      description: groupDescription.trim(),
      objective: normalizedObjective,
      color: normalizedColor,
      icon: safeIcon,
      participantRoles: normalizedParticipants,
      adminAgentId: normalizedAdminAgentId,
    });

    updateAgentConfig(groupId, {
      agentName: normalizedName,
      orbColor: normalizedColor,
      agentIcon: safeIcon,
    });

    await ensureLibrary();
    await updateLibrary({
      name: normalizedName,
      description: groupDescription.trim(),
      objective: normalizedObjective,
      linkedDashboardFolderId: library?.linkedDashboardFolderId || null,
    });

    onClose?.();
  };

  if (!group) return null;

  return (
    <div
      className={`rounded-2xl ${
        embedded ? 'flex h-full min-h-0 flex-col' : 'mx-3 w-full max-w-6xl sm:mx-4'
      }`}
      style={panelStyle}
    >
      <datalist id={roleDatalistId}>
        {GROUP_CHAT_ROLE_PRESETS.map((role) => (
          <option key={role} value={role} />
        ))}
      </datalist>

      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 sm:px-5">
        <div>
          <h3 className="text-sm font-semibold text-white">Gruppeneinstellungen</h3>
          <p className="text-[11px] text-white/45">Darstellung, Name und Teilnehmer mit Rollen</p>
        </div>
        {onClose ? (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white/80"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className={`${embedded ? 'min-h-0 flex-1 overflow-y-auto' : 'max-h-[min(78vh,640px)] overflow-y-auto'} p-4 sm:p-5`}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] xl:items-start">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-white/70">Gruppenname</label>
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                className="w-full px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none"
                style={inputBaseStyle}
                placeholder="z.B. Produkt-Team"
              />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-white/70">Gruppenbeschreibung</label>
                <textarea
                  value={groupDescription}
                  onChange={(event) => setGroupDescription(event.target.value)}
                  rows={2}
                  className="w-full resize-none px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none"
                  style={inputBaseStyle}
                  placeholder="Wofuer ist diese Gruppe zustaendig?"
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-white/70">Group Objective (essential)</label>
                <textarea
                  value={groupObjective}
                  onChange={(event) => setGroupObjective(event.target.value)}
                  rows={2}
                  className="w-full resize-none px-3 py-2 text-xs text-white placeholder:text-white/40 focus:outline-none"
                  style={inputBaseStyle}
                  placeholder="Welches konkrete Ergebnis soll diese Gruppe erreichen?"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-1 block text-xs text-white/70">Gruppen-Icon</label>
                <div className="flex flex-wrap gap-1.5">
                  {GROUP_ICON_OPTIONS.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      title={label}
                      onClick={() => setGroupIcon(key)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors sm:h-9 sm:w-9 ${
                        groupIcon === key
                          ? 'border-white/50 bg-white/15 text-white'
                          : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white/85'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-w-0">
                <label className="mb-1 block text-xs text-white/70">Gruppenfarbe</label>
                <div className="flex flex-wrap items-center gap-2">
                  {GROUP_COLORS.map((color) => {
                    const normalizedSwatch = normalizeHexColor(color, color);
                    const normalizedCurrent = normalizeHexColor(groupColor, DEFAULT_GROUP_COLOR);
                    const isActive = normalizedCurrent === normalizedSwatch;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setGroupColor(normalizedSwatch)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border"
                        style={{
                          background: normalizedSwatch,
                          borderColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.2)',
                        }}
                      >
                        {isActive ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                      </button>
                    );
                  })}
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70 hover:bg-white/10">
                    <span>Eigene</span>
                    <input
                      type="color"
                      value={colorPickerValue}
                      onChange={(event) => setGroupColor(event.target.value)}
                      className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                      title="Farbe waehlen"
                    />
                  </label>
                  <input
                    value={groupColor}
                    onChange={(event) => setGroupColor(event.target.value)}
                    onBlur={() => setGroupColor((currentColor) => normalizeHexColor(currentColor, DEFAULT_GROUP_COLOR))}
                    placeholder="#14B8A6"
                    className="w-[88px] rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 font-mono text-[11px] text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="text-xs text-white/70">Teilnehmer und Rollen</label>
                <button
                  type="button"
                  onClick={addParticipantRow}
                  className="flex shrink-0 items-center gap-1 px-2 py-1 text-[11px] text-white/80"
                  style={secondaryButtonStyle}
                >
                  <Plus className="h-3 w-3" />
                  Teilnehmer
                </button>
              </div>
              <p className="mb-1.5 text-[10px] text-white/40">Rolle: Vorschlaege aus der Liste oder frei tippen</p>

              <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1 sm:max-h-40">
                {participants.map((participant, index) => (
                  <div key={`group-participant-${index}`} className="flex items-center gap-1.5">
                    <select
                      value={participant.agentId}
                      onChange={(event) => updateParticipantRow(index, { agentId: event.target.value })}
                      className="min-w-0 flex-1 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                      style={inputBaseStyle}
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
                      onChange={(event) => updateParticipantRow(index, { role: event.target.value })}
                      list={roleDatalistId}
                      placeholder="Rolle"
                      className="w-24 shrink-0 px-2 py-1.5 text-[11px] text-white placeholder:text-white/40 focus:outline-none sm:w-[7.5rem]"
                      style={inputBaseStyle}
                    />
                    <button
                      type="button"
                      onClick={() => removeParticipantRow(index)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2">
                <label className="mb-1 block text-xs text-white/70">Admin / Orchestrator</label>
                <select
                  value={groupAdminAgentId}
                  onChange={(event) => setGroupAdminAgentId(event.target.value)}
                  className="w-full px-3 py-2 text-xs text-white focus:outline-none"
                  style={inputBaseStyle}
                >
                  <option value="">Admin waehlen...</option>
                  {participants
                    .filter((participant) => participant.agentId.trim() !== '')
                    .map((participant, index) => {
                      const option = participantOptions.find((entry) => entry.id === participant.agentId.trim());
                      const label = option?.name || participant.agentId.trim();
                      const roleSuffix = participant.role.trim() ? ` (${participant.role.trim()})` : '';
                      return (
                        <option key={`group-admin-option-${participant.agentId}-${index}`} value={participant.agentId.trim()}>
                          {label}{roleSuffix}
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 sm:p-4" style={sectionCardStyle}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 shrink-0 text-white/60" />
                    <h4 className="text-sm font-semibold text-white">Scheduled Tasks</h4>
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/45">Getrennt von Einzelagenten.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateScheduledTask}
                  className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-white/85"
                  style={secondaryButtonStyle}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Neue Task
                </button>
              </div>

              <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                {groupTasks.length > 0 ? (
                  groupTasks.slice(0, 6).map((task) => (
                    <div key={task.id} className="px-2.5 py-1.5" style={inputBaseStyle}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-white">{task.title}</p>
                          <p className="text-[10px] text-white/45">
                            {task.type === 'recurring' ? 'Wiederkehrend' : 'Einmalig'} · {task.status}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/55">
                          {task.enabled ? 'aktiv' : 'paused'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-[11px] text-white/45" style={inputBaseStyle}>
                    Noch keine Scheduled Tasks fuer diese Gruppe.
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 sm:p-4" style={sectionCardStyle}>
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-white/60" />
                <h4 className="text-sm font-semibold text-white">Dashboard-Verknuepfung</h4>
              </div>
              <p className="mt-1 text-[11px] text-white/45">
                Ordner im Haupt-Dashboard anheften (Link zur Gruppenbibliothek).
              </p>
              <div className="mt-2 px-2.5 py-1.5 text-[11px] text-white/65" style={inputBaseStyle}>
                {library?.linkedDashboardFolderId
                  ? `Verknuepft: ${library.linkedDashboardFolderId}`
                  : 'Noch kein Dashboard-Ordner verknuepft.'}
              </div>
              <button
                type="button"
                onClick={() => void handlePinToDashboard()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 px-3 py-2 text-[11px] text-white/85 sm:w-auto"
                style={secondaryButtonStyle}
              >
                <ArrowUpToLine className="h-3.5 w-3.5" />
                Auf Dashboard pinnen
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <GroupLibraryFilesSection
            groupName={groupName.trim() || group?.name || 'Gruppe'}
            library={library}
            folders={folders}
            documents={documents}
            isLoading={isLibraryLoading}
            onEnsureLibrary={ensureLibrary}
            onRefresh={refreshLibrary}
            onImportFiles={importFiles}
            onDownloadZip={downloadZip}
          />
        </div>

        {formError ? <p className="mt-3 text-[11px] text-rose-300">{formError}</p> : null}
      </div>

      <div className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-white/70 hover:text-white"
            style={secondaryButtonStyle}
          >
            Abbrechen
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void handleSave()}
          className="px-3 py-1.5 text-xs font-medium text-white"
          style={primaryButtonStyle}
        >
          Speichern
        </button>
      </div>
    </div>
  );
}
