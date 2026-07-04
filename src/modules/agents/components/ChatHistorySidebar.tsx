// ============================================
// ChatHistorySidebar.tsx - Chat-History Sidebar mit Ordnern
// 
// Zweck: Mittlere Sidebar im Agents-Modul
//        Zeigt Chat-History, Ordner, Inline-Rename
//        Erweitert um Pin, Rename, verbesserte UX
// Verwendet von: AgentsPage.tsx
// ============================================

'use client';

import { useState, useMemo, useRef, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  MessageSquare,
  Trash2,
  FolderPlus,
  MoreVertical,
  Pin,
  PinOff,
  Pencil,
  Settings,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Upload,
  Download,
  FileText,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { useAgentsStore, useHistorySidebarCollapsed } from '../store';
import { ChatFolder } from './ChatFolder';
import { FOLDER_COLORS } from '../constants';
import type {
  ChatConversation,
  ChatFolderData,
  GroupChatParticipantRole,
} from '../types';
import { useThemeStyles } from '@/lib/theme';
import { AgentSettingsUnifiedModal } from '@/components/agent/AgentSettingsUnifiedModal';
import {
  useAgentName,
  useAgentOrbColor,
  useAgentConfigStore,
  DEFAULT_AGENT_NAMES,
} from '@/lib/agent/stores/agent-config-store';
import { GroupSettingsModal } from './GroupSettingsModal';
import { useGroupLibrary } from '../hooks/useGroupLibrary';

// --------------------------------------------
// Eingebaute Agenten als Teilnehmer-Optionen
// --------------------------------------------
const BUILT_IN_AGENT_OPTIONS = [
  { id: 'master', name: 'Intelligence' },
  { id: 'calendar', name: 'Kalender' },
  { id: 'inbox', name: 'Inbox' },
  { id: 'lab', name: 'Lab' },
];

/** z-Index für Dialoge (über Sidebars und Kontextmenüs), zentriert per Portal an body */
const CHAT_HISTORY_OVERLAY_Z = 'z-[99999]';

// --------------------------------------------
// Komponente: ChatHistorySidebar
// Mittlere Sidebar mit Chat-History und Ordnern
// --------------------------------------------

export function ChatHistorySidebar() {
  const conversations = useAgentsStore((state) => state.conversations);
  const folders = useAgentsStore((state) => state.folders);
  const customAgents = useAgentsStore((state) => state.customAgents);
  const activeConversationId = useAgentsStore((state) => state.activeConversationId);
  const selectedAgentId = useAgentsStore((state) => state.selectedAgentId);
  const effectiveSelectedAgentId = selectedAgentId || 'master';
  const setSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);
  const createConversation = useAgentsStore((state) => state.createConversation);
  const ensureGroupMainConversation = useAgentsStore((state) => state.ensureGroupMainConversation);
  const ensureGroupParticipantChats = useAgentsStore((state) => state.ensureGroupParticipantChats);
  const createBreakoutSession = useAgentsStore((state) => state.createBreakoutSession);
  const deleteConversation = useAgentsStore((state) => state.deleteConversation);
  const setActiveConversation = useAgentsStore((state) => state.setActiveConversation);
  const createFolder = useAgentsStore((state) => state.createFolder);
  const moveConversationToFolder = useAgentsStore((state) => state.moveConversationToFolder);
  const isCollapsed = useHistorySidebarCollapsed();
  const toggleHistorySidebar = useAgentsStore((state) => state.toggleHistorySidebar);

  // Theme-Styles
  const { surface, accentColor, textColor, designStyle } = useThemeStyles();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showAgentSettings, setShowAgentSettings] = useState(false);
  const [showBreakoutDialog, setShowBreakoutDialog] = useState(false);
  const [breakoutName, setBreakoutName] = useState('');
  const [breakoutParticipants, setBreakoutParticipants] = useState<GroupChatParticipantRole[]>([]);
  const [breakoutFormError, setBreakoutFormError] = useState('');
  const [showGroupFileFolderDialog, setShowGroupFileFolderDialog] = useState(false);
  const [newGroupFileFolderName, setNewGroupFileFolderName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  /** Client-only: Dialog-Portale nicht während SSR rendern */
  const overlayMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const groupFileInputRef = useRef<HTMLInputElement>(null);
  const groupDirectoryInputRef = useRef<HTMLInputElement>(null);
  const configuredAgentName = useAgentName(effectiveSelectedAgentId);
  const configuredAgentColor = useAgentOrbColor(effectiveSelectedAgentId);
  const updateAgentConfig = useAgentConfigStore((state) => state.updateConfig);
  const selectedCustomAgent = useMemo(
    () => customAgents.find((agent) => agent.id === selectedAgentId),
    [customAgents, selectedAgentId]
  );
  const activeAgentName = selectedCustomAgent?.name || configuredAgentName;
  const activeAgentColor = selectedCustomAgent?.color || configuredAgentColor;
  const isGroupAgentSelected = selectedCustomAgent?.type === 'group';
  const isSubgroupSelected = Boolean(selectedCustomAgent?.parentGroupId);
  const parentGroup = useMemo(
    () =>
      selectedCustomAgent?.parentGroupId
        ? customAgents.find((agent) => agent.id === selectedCustomAgent.parentGroupId)
        : undefined,
    [customAgents, selectedCustomAgent]
  );

  const participantOptions = useMemo(() => {
    const customAgentOptions = customAgents
      .filter((agent) => agent.type !== 'group')
      .map((agent) => ({ id: agent.id, name: agent.name }));
    return [...BUILT_IN_AGENT_OPTIONS, ...customAgentOptions];
  }, [customAgents]);

  const {
    folders: groupLibraryFolders,
    documents: groupLibraryDocuments,
    importFiles: importGroupFiles,
    createFolder: createGroupLibraryFolder,
    downloadZip: downloadGroupZip,
  } = useGroupLibrary(isGroupAgentSelected ? effectiveSelectedAgentId : null, {
    name: selectedCustomAgent?.name,
    description: selectedCustomAgent?.description,
    objective: selectedCustomAgent?.objective,
  });

  // Für Root-Gruppen: eigene Daten + alle Untergruppen aggregieren
  const selectedScopeAgentIds = useMemo(() => {
    if (!isGroupAgentSelected || !selectedCustomAgent) {
      return [effectiveSelectedAgentId];
    }

    if (isSubgroupSelected) {
      return [effectiveSelectedAgentId];
    }

    const scopeIds = new Set<string>([effectiveSelectedAgentId]);
    let changed = true;
    while (changed) {
      changed = false;
      customAgents.forEach((agent) => {
        if (
          agent.type === 'group' &&
          agent.parentGroupId &&
          scopeIds.has(agent.parentGroupId) &&
          !scopeIds.has(agent.id)
        ) {
          scopeIds.add(agent.id);
          changed = true;
        }
      });
    }
    return Array.from(scopeIds);
  }, [customAgents, effectiveSelectedAgentId, isGroupAgentSelected, isSubgroupSelected, selectedCustomAgent]);

  // Untergruppen der aktuell ausgewählten Gruppe
  const breakoutSessions = useMemo(() => {
    if (!isGroupAgentSelected) return [];
    return customAgents.filter(
      (agent) => agent.type === 'group' && agent.parentGroupId === effectiveSelectedAgentId
    );
  }, [customAgents, effectiveSelectedAgentId, isGroupAgentSelected]);

  // Gruppenchat (Hauptchat) der ausgewählten Gruppe (ohne groupParticipantChatId)
  const mainConversation = useMemo(() => {
    if (!isGroupAgentSelected) return null;
    return conversations.find(
      (conversation) =>
        conversation.agentId === effectiveSelectedAgentId && !conversation.groupParticipantChatId
    ) || null;
  }, [conversations, effectiveSelectedAgentId, isGroupAgentSelected]);

  // Einzelchats mit Gruppenteilnehmern (mit groupParticipantChatId)
  const participantChats = useMemo(() => {
    if (!isGroupAgentSelected) return [];
    return conversations.filter(
      (conversation) =>
        conversation.agentId === effectiveSelectedAgentId && conversation.groupParticipantChatId
    );
  }, [conversations, effectiveSelectedAgentId, isGroupAgentSelected]);

  // Dateiablage für die ausgewählte Gruppen-Scope
  const visibleGroupFileFolders = useMemo(() => {
    if (!isGroupAgentSelected) return [];
    return groupLibraryFolders;
  }, [groupLibraryFolders, isGroupAgentSelected]);

  const visibleGroupFiles = useMemo(() => {
    if (!isGroupAgentSelected) return [];
    return groupLibraryDocuments;
  }, [groupLibraryDocuments, isGroupAgentSelected]);

  const groupFilesByFolder = useMemo(() => {
    const grouped: Record<string, typeof visibleGroupFiles> = {};
    visibleGroupFileFolders.forEach((folder) => {
      grouped[folder.id] = visibleGroupFiles.filter((file) => file.folderId === folder.id);
    });
    return grouped;
  }, [visibleGroupFileFolders, visibleGroupFiles]);

  const looseGroupFiles = useMemo(() => {
    return visibleGroupFiles.filter((file) => !file.folderId);
  }, [visibleGroupFiles]);

  // ----------------------------------------
  // Ordner-Upload vorbereiten (WebKit-Verzeichnisauswahl)
  // Ermöglicht Upload kompletter Ordner in die Gruppenablage
  // ----------------------------------------
  useEffect(() => {
    if (!groupDirectoryInputRef.current) return;
    groupDirectoryInputRef.current.setAttribute('webkitdirectory', '');
    groupDirectoryInputRef.current.setAttribute('directory', '');
  }, []);

  // ----------------------------------------
  // Sync: Custom-Agent Name/Farbe -> AgentConfigStore
  // Damit AgentSettingsModal und Sidebar denselben Namen zeigen
  // ----------------------------------------
  useEffect(() => {
    if (!selectedCustomAgent) return;
    const desiredName = selectedCustomAgent.name;
    const desiredColor = selectedCustomAgent.color;
    if (!desiredName) return;

    updateAgentConfig(effectiveSelectedAgentId, {
      agentName: desiredName,
      orbColor: desiredColor,
    });
  }, [effectiveSelectedAgentId, selectedCustomAgent, updateAgentConfig]);

  // Für Gruppen: Hauptchat + Einzelchats mit Teilnehmern sicherstellen
  useEffect(() => {
    if (!isGroupAgentSelected) return;
    ensureGroupMainConversation(effectiveSelectedAgentId);
    ensureGroupParticipantChats(effectiveSelectedAgentId);
  }, [effectiveSelectedAgentId, ensureGroupMainConversation, ensureGroupParticipantChats, isGroupAgentSelected]);

  // Konversationen dynamisch nach ausgewähltem Agent filtern
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (selectedScopeAgentIds.includes(conv.agentId)) return true;
      if (conv.isGroupChat) {
        return (conv.participantRoles || []).some(
          (participant) => participant.agentId === effectiveSelectedAgentId
        );
      }
      return false;
    });
  }, [conversations, effectiveSelectedAgentId, selectedScopeAgentIds]);

  // Angepinnte Konversationen
  const pinnedConversations = useMemo(() => {
    return filteredConversations.filter(conv => conv.isPinned && !conv.folderId);
  }, [filteredConversations]);

  // Konversationen ohne Ordner (nicht angepinnt)
  const conversationsWithoutFolder = useMemo(() => {
    return filteredConversations.filter(conv => !conv.folderId && !conv.isPinned);
  }, [filteredConversations]);

  // Konversationen nach Ordner gruppieren
  const conversationsByFolder = useMemo(() => {
    const grouped: Record<string, ChatConversation[]> = {};
    folders.forEach(folder => {
      grouped[folder.id] = filteredConversations.filter(conv => conv.folderId === folder.id);
    });
    return grouped;
  }, [filteredConversations, folders]);

  // Ordner nur für den aktiven Agent anzeigen (auch leere Ordner)
  const visibleFolders = useMemo(() => {
    return folders.filter((folder) => selectedScopeAgentIds.includes(folder.agentId));
  }, [folders, selectedScopeAgentIds]);

  // Ordner expandieren/kollabieren
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Neuen Ordner erstellen
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const color = FOLDER_COLORS[visibleFolders.length % FOLDER_COLORS.length];
      createFolder(newFolderName.trim(), color);
      setNewFolderName('');
      setShowNewFolderDialog(false);
    }
  };

  // Gruppen-Dateiordner erstellen
  const handleCreateGroupFileFolder = () => {
    if (!isGroupAgentSelected) return;
    const trimmedName = newGroupFileFolderName.trim();
    if (!trimmedName) return;
    const color = FOLDER_COLORS[visibleGroupFileFolders.length % FOLDER_COLORS.length];
    void createGroupLibraryFolder(trimmedName, { color, relativePath: trimmedName });
    setNewGroupFileFolderName('');
    setShowGroupFileFolderDialog(false);
  };

  // Dateien in die Gruppenablage hochladen
  const handleSelectGroupFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isGroupAgentSelected) return;
    const files = event.target.files;
    if (!files) return;
    void importGroupFiles(Array.from(files), selectedCustomAgent?.name || effectiveSelectedAgentId);

    event.target.value = '';
  };

  // Breakout-Session erstellen
  const handleCreateBreakoutSession = () => {
    if (!isGroupAgentSelected || !selectedCustomAgent) return;

    const validParticipants = breakoutParticipants.filter(
      (participant) => participant.agentId.trim() && participant.role.trim()
    );
    if (validParticipants.length === 0) {
      setBreakoutFormError('Bitte mindestens einen Teilnehmer mit Rolle auswählen.');
      return;
    }

    const breakoutId = createBreakoutSession(
      effectiveSelectedAgentId,
      breakoutName.trim() || 'Breakout Session',
      validParticipants
    );
    if (!breakoutId) {
      setBreakoutFormError('Breakout Session konnte nicht erstellt werden.');
      return;
    }

    setBreakoutName('');
    setBreakoutParticipants([]);
    setBreakoutFormError('');
    setShowBreakoutDialog(false);
  };

  const addBreakoutParticipantRow = () => {
    setBreakoutParticipants((prev) => [...prev, { agentId: '', role: '' }]);
  };

  const updateBreakoutParticipantRow = (index: number, updates: Partial<GroupChatParticipantRole>) => {
    setBreakoutParticipants((prev) =>
      prev.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, ...updates } : participant
      )
    );
  };

  const removeBreakoutParticipantRow = (index: number) => {
    setBreakoutParticipants((prev) => prev.filter((_, participantIndex) => participantIndex !== index));
  };

  // --------------------------------------------
  // Dialog-Portale: zentriert im Viewport, höchster z-Index (nicht in Sidebar-Stacking-Context)
  // --------------------------------------------
  const dialogPortals =
    overlayMounted &&
    createPortal(
      <>
        <AnimatePresence>
          {showNewFolderDialog && (
            <motion.div
              key="chat-new-folder-overlay"
              role="dialog"
              aria-modal="true"
              className={`fixed inset-0 ${CHAT_HISTORY_OVERLAY_Z} flex items-center justify-center p-4`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowNewFolderDialog(false)}
                aria-hidden
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-[1] max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="mb-2 text-xs font-medium text-white">Neuer Ordner</h4>
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') setShowNewFolderDialog(false);
                  }}
                  data-agent-input="agents-folder-name"
                  placeholder="Ordnername..."
                  className="mb-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateFolder}
                    data-agent-button="agents-folder-submit"
                    className="flex-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs text-white transition-colors hover:bg-indigo-600"
                  >
                    Erstellen
                  </button>
                  <button
                    onClick={() => setShowNewFolderDialog(false)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/20"
                  >
                    Abbrechen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBreakoutDialog && isGroupAgentSelected && !isSubgroupSelected && (
            <motion.div
              key="chat-breakout-overlay"
              role="dialog"
              aria-modal="true"
              className={`fixed inset-0 ${CHAT_HISTORY_OVERLAY_Z} flex items-center justify-center p-4`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowBreakoutDialog(false)}
                aria-hidden
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-[1] max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="mb-2 text-xs font-medium text-white">Neue Breakout Session</h4>
                <input
                  value={breakoutName}
                  onChange={(event) => setBreakoutName(event.target.value)}
                  placeholder="Session-Name..."
                  className="mb-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                />

                <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                  {breakoutParticipants.map((participant, index) => (
                    <div key={`breakout-participant-${index}`} className="flex items-center gap-1.5">
                      <select
                        value={participant.agentId}
                        onChange={(event) => updateBreakoutParticipantRow(index, { agentId: event.target.value })}
                        className="flex-1 rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-[11px] text-white focus:outline-none"
                      >
                        <option value="">Agent wählen...</option>
                        {participantOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={participant.role}
                        onChange={(event) => updateBreakoutParticipantRow(index, { role: event.target.value })}
                        placeholder="Rolle"
                        className="w-24 rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-[11px] text-white placeholder:text-white/40 focus:outline-none"
                      />
                      <button
                        onClick={() => removeBreakoutParticipantRow(index)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addBreakoutParticipantRow}
                  className="mt-2 w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20"
                >
                  Teilnehmer hinzufügen
                </button>

                {breakoutFormError && (
                  <p className="mt-2 text-[11px] text-rose-300">{breakoutFormError}</p>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleCreateBreakoutSession}
                    className="flex-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs text-white hover:bg-indigo-600"
                  >
                    Session erstellen
                  </button>
                  <button
                    onClick={() => setShowBreakoutDialog(false)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20"
                  >
                    Abbrechen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showGroupFileFolderDialog && isGroupAgentSelected && (
            <motion.div
              key="chat-group-file-folder-overlay"
              role="dialog"
              aria-modal="true"
              className={`fixed inset-0 ${CHAT_HISTORY_OVERLAY_Z} flex items-center justify-center p-4`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowGroupFileFolderDialog(false)}
                aria-hidden
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative z-[1] max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="mb-2 text-xs font-medium text-white">Neuer Dateiordner</h4>
                <input
                  value={newGroupFileFolderName}
                  onChange={(event) => setNewGroupFileFolderName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleCreateGroupFileFolder();
                    if (event.key === 'Escape') setShowGroupFileFolderDialog(false);
                  }}
                  placeholder="Ordnername..."
                  className="mb-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateGroupFileFolder}
                    className="flex-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs text-white hover:bg-indigo-600"
                  >
                    Erstellen
                  </button>
                  <button
                    onClick={() => setShowGroupFileFolderDialog(false)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20"
                  >
                    Abbrechen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>,
      document.body
    );

  // Ohne Auswahl gibt es bewusst keine rechte Sidebar.
  if (!selectedAgentId) {
    return null;
  }

  // ----------------------------------------
  // Kollabierte Ansicht
  // ----------------------------------------
  if (isCollapsed) {
    return (
      <>
      <div
        className="flex h-full w-10 flex-col items-center py-3"
        style={{
          ...surface.base,
          borderRadius: 0,
          borderRight: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <button
          onClick={toggleHistorySidebar}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors mb-2"
          title="Chat-History öffnen"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            if (isGroupAgentSelected && !isSubgroupSelected) {
              setShowBreakoutDialog(true);
              setBreakoutFormError('');
              setBreakoutParticipants((prev) => (prev.length > 0 ? prev : [{ agentId: '', role: '' }]));
            } else if (isGroupAgentSelected && isSubgroupSelected) {
              ensureGroupMainConversation(effectiveSelectedAgentId);
            } else {
              createConversation();
            }
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title={isGroupAgentSelected && !isSubgroupSelected ? 'Break Out erstellen' : 'Neuer Chat'}
        >
          {isGroupAgentSelected && isSubgroupSelected ? (
            <MessageSquare className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      {dialogPortals}
      </>
    );
  }

  // ----------------------------------------
  // Volle Ansicht
  // ----------------------------------------
  return (
    <>
    <div
      className="flex h-full w-64 flex-col"
      style={{
        ...surface.base,
        borderRadius: 0,
        borderRight: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* ----------------------------------------
          Header mit "New Chat" und Collapse Button
          ---------------------------------------- */}
      <div className="border-b border-white/10 p-3">
        {/* Rücknavigation: Untergruppe -> Hauptgruppe */}
        {isGroupAgentSelected && isSubgroupSelected && parentGroup && (
          <button
            onClick={() => setSelectedAgent(parentGroup.id)}
            className="mb-2 flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] text-white/55 hover:bg-white/10 hover:text-white/80"
          >
            <ArrowLeft className="h-3 w-3" />
            Zur Hauptgruppe: {parentGroup.name}
          </button>
        )}

        {/* Aktiver Agent */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: activeAgentColor || accentColor }}
            />
            <p className="truncate text-xs font-semibold text-white/80">
              {activeAgentName || 'Agent'}
            </p>
          </div>
          <button
            onClick={() => setShowAgentSettings(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
            title={isGroupAgentSelected ? 'Gruppen-Einstellungen' : 'Agent-Einstellungen'}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isGroupAgentSelected && !isSubgroupSelected) {
                setShowBreakoutDialog(true);
                setBreakoutFormError('');
                setBreakoutParticipants((prev) => (prev.length > 0 ? prev : [{ agentId: '', role: '' }]));
              } else if (isGroupAgentSelected && isSubgroupSelected) {
                ensureGroupMainConversation(effectiveSelectedAgentId);
              } else {
                createConversation();
              }
            }}
            data-agent-button="agents-new-conversation"
            className="flex flex-1 items-center gap-2 px-3 py-2 text-xs font-medium text-white transition-colors"
            style={{
              background: accentColor,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              border: designStyle === 'brutal' ? '2px solid #000' : 'none',
              boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : 'none',
            }}
          >
            {isGroupAgentSelected && !isSubgroupSelected ? (
              <>
                <Plus className="h-3.5 w-3.5" />
                Break Out
              </>
            ) : (
              <>
                <MessageSquare className="h-3.5 w-3.5" />
                Neuer Chat
              </>
            )}
          </button>
          {!isGroupAgentSelected && (
            <button
              onClick={() => setShowNewFolderDialog(true)}
              data-agent-button="agents-new-folder"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
              title="Neuer Ordner"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={toggleHistorySidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
            title="Chat-History einklappen"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ----------------------------------------
          Scrollbarer Content-Bereich
          ---------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-2">
        {isGroupAgentSelected ? (
          <div className="space-y-4">
            {/* Files */}
            <div>
              <div className="mb-1.5 flex items-center justify-between px-2">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Files</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowGroupFileFolderDialog(true)}
                    className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white/70"
                    title="Dateiordner anlegen"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => groupFileInputRef.current?.click()}
                    className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white/70"
                    title="Datei hochladen"
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => groupDirectoryInputRef.current?.click()}
                    className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white/70"
                    title="Ordner hochladen"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => void downloadGroupZip()}
                    className="flex h-6 w-6 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white/70"
                    title="Gruppenordner exportieren"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <input
                ref={groupFileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleSelectGroupFiles}
              />
              <input
                ref={groupDirectoryInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleSelectGroupFiles}
              />

              {visibleGroupFileFolders.length > 0 && (
                <div className="mb-2 space-y-0.5">
                  {visibleGroupFileFolders.map((folder) => (
                    <div key={folder.id}>
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-white/65 hover:bg-white/8 hover:text-white"
                      >
                        <FolderOpen className="h-3.5 w-3.5" style={{ color: folder.color || '#3b82f6' }} />
                        <span className="flex-1 truncate">{folder.name}</span>
                        <span className="text-[10px] text-white/35">
                          {(groupFilesByFolder[folder.id] || []).length}
                        </span>
                      </button>
                      {expandedFolders.has(folder.id) && (
                        <div className="ml-5 mt-0.5 space-y-0.5">
                          {(groupFilesByFolder[folder.id] || []).map((file) => (
                            <div key={file.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-white/60">
                              <FileText className="h-3 w-3 shrink-0 opacity-60" />
                              <span className="truncate">{file.relativePath || file.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {looseGroupFiles.length > 0 && (
                <div className="space-y-0.5">
                  {looseGroupFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-white/60">
                      <FileText className="h-3 w-3 shrink-0 opacity-60" />
                      <span className="truncate">{file.relativePath || file.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chats: Gruppenchat + Einzelchats mit Teilnehmern */}
            <div>
              <h3 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                Chats
              </h3>

              {/* Gruppenchat (alle Teilnehmer) */}
              {mainConversation ? (
                <ConversationItem
                  conversation={mainConversation}
                  isActive={mainConversation.id === activeConversationId}
                  onSelect={() => setActiveConversation(mainConversation.id)}
                  onDelete={() => deleteConversation(mainConversation.id)}
                  canDelete={false}
                />
              ) : (
                <p className="px-2 py-1 text-[11px] text-white/35">Noch kein Gruppenchat vorhanden.</p>
              )}

              {/* Einzelchats mit jedem Teilnehmer */}
              {participantChats.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {participantChats.map((chat) => (
                    <ConversationItem
                      key={chat.id}
                      conversation={chat}
                      isActive={chat.id === activeConversationId}
                      onSelect={() => setActiveConversation(chat.id)}
                      onDelete={() => deleteConversation(chat.id)}
                      canDelete={true}
                    />
                  ))}
                </div>
              )}
            </div>

            {!isSubgroupSelected && (
              <div>
                <h3 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  Break Out Sessions
                </h3>
                {breakoutSessions.length > 0 ? (
                  <div className="space-y-0.5">
                    {breakoutSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedAgent(session.id)}
                        className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors ${
                          session.id === selectedAgentId
                            ? 'bg-white/15 text-white'
                            : 'text-white/60 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        <p className="truncate text-xs font-medium">{session.name}</p>
                        <p className="text-[10px] text-white/35">
                          {session.participantRoles?.length || 0} Teilnehmer
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 py-1 text-[11px] text-white/35">Noch keine Break Out Sessions.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Angepinnte Chats */}
            {pinnedConversations.length > 0 && (
              <div className="mb-3">
                <h3 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30 flex items-center gap-1">
                  <Pin className="h-2.5 w-2.5" />
                  Angepinnt
                </h3>
                <div className="space-y-0.5">
                  {pinnedConversations.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => setActiveConversation(conv.id)}
                      onDelete={() => deleteConversation(conv.id)}
                      onMoveToFolder={(folderId) => moveConversationToFolder(conv.id, folderId)}
                      folders={visibleFolders}
                      canDelete={!(isGroupAgentSelected && conv.agentId === effectiveSelectedAgentId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ordner-Sektion */}
            {visibleFolders.length > 0 && (
              <div className="mb-3">
                <h3 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30 flex items-center gap-1">
                  <FolderOpen className="h-2.5 w-2.5" />
                  Ordner
                </h3>
                <div className="space-y-0.5">
                  {visibleFolders.map((folder) => (
                    <div key={folder.id}>
                      <ChatFolder
                        folder={{
                          ...folder,
                          conversationIds: (conversationsByFolder[folder.id] || []).map((conv) => conv.id),
                        }}
                        isExpanded={expandedFolders.has(folder.id)}
                        onToggle={() => toggleFolder(folder.id)}
                      />
                      {/* Konversationen in Ordnern */}
                      {expandedFolders.has(folder.id) && (
                        <div className="ml-4 mt-0.5 space-y-0.5">
                          {(conversationsByFolder[folder.id] || []).map((conv) => (
                            <ConversationItem
                              key={conv.id}
                              conversation={conv}
                              isActive={conv.id === activeConversationId}
                              onSelect={() => setActiveConversation(conv.id)}
                              onDelete={() => deleteConversation(conv.id)}
                              canDelete={!(isGroupAgentSelected && conv.agentId === effectiveSelectedAgentId)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Konversationen ohne Ordner */}
            <div>
              <h3 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {visibleFolders.length > 0 || pinnedConversations.length > 0 ? 'Weitere Chats' : 'Chats'}
              </h3>
              <div className="space-y-0.5">
                {conversationsWithoutFolder.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    onSelect={() => setActiveConversation(conv.id)}
                    onDelete={() => deleteConversation(conv.id)}
                    onMoveToFolder={(folderId) => moveConversationToFolder(conv.id, folderId)}
                    folders={visibleFolders}
                    canDelete={!(isGroupAgentSelected && conv.agentId === effectiveSelectedAgentId)}
                  />
                ))}
              </div>

              {/* Hinweis wenn keine Chats vorhanden */}
              {filteredConversations.length === 0 && (
                <div className="py-6 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 mb-2" style={{ color: textColor, opacity: 0.15 }} />
                  <p className="text-xs" style={{ color: textColor, opacity: 0.3 }}>
                    Noch keine Chats für diesen Agent
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Agent- oder Gruppen-Einstellungen als Popup */}
      {showAgentSettings && !isGroupAgentSelected && (
        <AgentSettingsUnifiedModal
          moduleId={effectiveSelectedAgentId}
          moduleName={activeAgentName || 'Agent'}
          moduleColor={activeAgentColor}
          onClose={() => setShowAgentSettings(false)}
        />
      )}
      {showAgentSettings && isGroupAgentSelected && (
        <GroupSettingsModal
          key={`group-settings-${effectiveSelectedAgentId}`}
          groupId={effectiveSelectedAgentId}
          onClose={() => setShowAgentSettings(false)}
        />
      )}
    </div>
    {dialogPortals}
    </>
  );
}

// --------------------------------------------
// Komponente: ConversationItem
// Ein einzelner Chat-Eintrag in der Sidebar
// Erweitert um: Inline-Rename, Pin, verbesserte UX
// --------------------------------------------

interface ConversationItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMoveToFolder?: (folderId: string | null) => void;
  folders?: ChatFolderData[];
  canDelete?: boolean;
}

function ConversationItem({ 
  conversation, 
  isActive, 
  onSelect, 
  onDelete,
  onMoveToFolder,
  folders = [],
  canDelete = true,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.title);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLDivElement>(null);
  
  const updateConversationTitle = useAgentsStore((state) => state.updateConversationTitle);
  const togglePinConversation = useAgentsStore((state) => state.togglePinConversation);
  const customAgentsForItem = useAgentsStore((state) => state.customAgents);
  const agentConfigsForItem = useAgentConfigStore((state) => state.configs);

  // ----------------------------------------
  // Teilnehmer-Auflösung und Multi-Agent-Markierung
  // ----------------------------------------
  const participantRoles = conversation.participantRoles || [];
  const hasMultipleParticipants = participantRoles.length > 0;
  const unreadCount = conversation.unreadCount || 0;
  const hasUnreadPrivate = unreadCount > 0;
  const requiresPrivateReply = Boolean(conversation.requiresPrivateReply);

  // Agent-Name auflösen (Custom-Agent oder eingebauter Agent)
  const resolveAgentNameForItem = (agentId: string): string => {
    const custom = customAgentsForItem.find((a) => a.id === agentId);
    if (custom) return custom.name;
    return agentConfigsForItem[agentId]?.agentName || DEFAULT_AGENT_NAMES[agentId] || agentId;
  };

  // Teilnehmernamen als kommaseparierte Liste (max. 3 anzeigen)
  const participantLabel = useMemo(() => {
    if (participantRoles.length === 0) return '';
    const names = participantRoles.map((p) => resolveAgentNameForItem(p.agentId));
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 3).join(', ')} +${names.length - 3}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantRoles, customAgentsForItem, agentConfigsForItem]);

  // Focus auf Rename-Input wenn aktiv
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Klick außerhalb schließt das Menü (Backdrop ist in manchen Layouts nicht klickbar)
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuButtonRef.current && !menuButtonRef.current.contains(target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Rename abschließen
  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue.trim() !== conversation.title) {
      updateConversationTitle(conversation.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  // Zeitstempel formatieren
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return date.toLocaleDateString('de-DE', { weekday: 'short' });
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className={`group relative ${showMenu ? 'z-[120]' : 'z-0'}`}>
      <button
        onClick={onSelect}
        onDoubleClick={() => {
          setRenameValue(conversation.title);
          setIsRenaming(true);
        }}
        className={`w-full rounded-lg px-2.5 py-1.5 text-left transition-colors ${
          isActive
            ? 'bg-white/15 text-white'
            : 'text-white/60 hover:bg-white/8 hover:text-white'
        }`}
      >
        {isRenaming ? (
          // Inline-Rename Input
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') setIsRenaming(false);
              e.stopPropagation();
            }}
            onBlur={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-xs font-medium text-white outline-none border-b border-white/30 pb-0.5"
          />
        ) : (
          <div className="flex items-center gap-2">
            {/* Icon: Einzelchat-Teilnehmer, Multi-Agent-Chats, oder normaler Chat */}
            {conversation.groupParticipantChatId ? (
              <MessageSquare className="h-3 w-3 shrink-0 text-emerald-400/70" />
            ) : hasMultipleParticipants ? (
              <Users className="h-3 w-3 shrink-0 text-indigo-400/70" />
            ) : (
              <MessageSquare className="h-3 w-3 shrink-0 opacity-50" />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-medium">{conversation.title}</p>
              {/* Einzelchat-Hinweis innerhalb einer Gruppe */}
              {conversation.groupParticipantChatId && (
                <p className="truncate text-[10px] text-emerald-300/50">
                  {requiresPrivateReply
                    ? 'Einzelchat · Antwort benötigt'
                    : hasUnreadPrivate
                      ? 'Einzelchat · Neue Nachricht'
                      : 'Einzelchat'}
                </p>
              )}
              {/* Teilnehmer-Liste unter dem Chatnamen */}
              {!conversation.groupParticipantChatId && hasMultipleParticipants && (
                <p className="truncate text-[10px] text-indigo-300/50">
                  {participantRoles.length} Teilnehmer · {participantLabel}
                </p>
              )}
              <p className="text-[10px] text-white/30">{formatDate(conversation.updatedAt)}</p>
            </div>
            {conversation.isPinned && (
              <Pin className="h-2.5 w-2.5 shrink-0 text-white/30" />
            )}
            {requiresPrivateReply && (
              <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-200">
                Antwort
              </span>
            )}
            {!requiresPrivateReply && hasUnreadPrivate && (
              <span className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-200">
                {unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Menu-Button (nur bei Hover) */}
      {!isRenaming && (
        <div className={`absolute right-1 top-1/2 -translate-y-1/2 transition-opacity ${showMenu ? 'opacity-100 z-[130]' : 'opacity-0 group-hover:opacity-100'}`}>
          {/* Backdrop außerhalb des Refs, damit Klick-außerhalb zuverlässig funktioniert */}
          {showMenu && (
            <div
              className="fixed inset-0 z-[140]"
              onClick={() => setShowMenu(false)}
              aria-hidden="true"
            />
          )}
          <div ref={menuButtonRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="flex h-5 w-5 items-center justify-center rounded text-white/40 hover:text-white/60 hover:bg-white/10 transition-colors"
            >
              <MoreVertical className="h-3 w-3" />
            </button>

            {/* Dropdown-Menu */}
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-0 top-6 z-[150] w-44 rounded-lg bg-black/95 backdrop-blur-sm border border-white/10 shadow-2xl py-1"
              >
                {/* Umbenennen */}
                <button
                  onClick={() => {
                    setRenameValue(conversation.title);
                    setIsRenaming(true);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Umbenennen
                </button>

                {/* Anpinnen/Lösen */}
                <button
                  onClick={() => {
                    togglePinConversation(conversation.id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition-colors"
                >
                  {conversation.isPinned ? (
                    <>
                      <PinOff className="h-3 w-3" />
                      Lösen
                    </>
                  ) : (
                    <>
                      <Pin className="h-3 w-3" />
                      Anpinnen
                    </>
                  )}
                </button>

                {/* In Ordner verschieben */}
                {onMoveToFolder && folders.length > 0 && (
                  <>
                    <div className="my-1 h-px bg-white/10" />
                    <div className="px-3 py-1 text-[10px] font-semibold text-white/30 uppercase">
                      In Ordner
                    </div>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          onMoveToFolder(folder.id);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition-colors"
                      >
                        <div
                          className="h-2.5 w-2.5 rounded"
                          style={{ backgroundColor: folder.color || '#3b82f6' }}
                        />
                        {folder.name}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        onMoveToFolder(null);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 transition-colors"
                    >
                      Kein Ordner
                    </button>
                  </>
                )}

                {/* Löschen */}
                {canDelete && (
                  <>
                    <div className="my-1 h-px bg-white/10" />
                    <button
                      onClick={() => {
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Löschen
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
