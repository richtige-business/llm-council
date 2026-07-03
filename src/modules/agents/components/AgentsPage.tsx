// ============================================
// AgentsPage.tsx - Hauptansicht des Agents-Moduls
// 
// Zweck: 3-Spalten-Layout mit:
//        1. Agent-Hierarchie-Sidebar (links)
//        2. Chat-History-Sidebar (mitte-links)
//        3. Chat-Bereich mit erweiterter ChatBar (rechts)
// Verwendet von: TabContent.tsx, /agents Route
// ============================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Zap, BotMessageSquare, Brain, Plus, X } from 'lucide-react';
import {
  useAgentsStore,
  useActiveAgentsConversation,
  useAgentsIsLoading,
  useSelectedAgentId,
  migrateFromChatStore,
} from '../store';
import { useIsAgentExecuting } from '@/lib/agent';
import {
  useAgentName,
  useAgentOrbColor,
  useLLMModel,
  useAgentConfigStore,
  DEFAULT_AGENT_NAMES,
  DEFAULT_MODULE_COLORS,
} from '@/lib/agent/stores/agent-config-store';
import { ChatMessage } from './ChatMessage';
import { AgentChatBar, type MentionOption } from './AgentChatBar';
import { ThinkingBlock } from './ThinkingBlock';
import { MemoryPanel } from './MemoryPanel';
import { AgentsModuleShell } from './AgentsModuleShell';
import { OrchestrationModeIndicator } from './OrchestrationModeIndicator';
import { BreakoutIndicator } from './BreakoutIndicator';
import { AgentsSpatialTasksMode } from './spatial/AgentsSpatialTasksMode';
import { AgentsSpatialSettingsMode } from './spatial/AgentsSpatialSettingsMode';
import { useThemeStyles } from '@/lib/theme';
import { SuggestedActions, getSuggestedActionsForAgent } from './SuggestedActions';
import type {
  AttachedFile,
  AttachedImage,
  ChatMessageData,
  GroupChatParticipantRole,
  GroupObjective,
  GroupOrchestrateEvent,
  GroupOrchestrateRequest,
  OrchestrationMode,
  ReplyToData,
} from '../types';
import { DEFAULT_CONVERSATION_TITLE, ORCHESTRATION_MODES } from '../constants';
import type { AgentsSpatialMode } from '../spatial-types';
import type { AgentNavigationScope } from './useAgentModeNavigation';
import { serializeChatMessageForModel } from '../lib/chat-attachments';

/** Teilnehmer-Modal über allen Sidebars und dem Chat-Bereich */
const PARTICIPANTS_MODAL_OVERLAY_Z = 'z-[99999]';

// --------------------------------------------
// Modul-Erkennung für Agent Mode Workspace
// Lokale Kopie der Orchestrator-Patterns (Client-safe)
// --------------------------------------------
const MODULE_DETECT_PATTERNS: Record<string, RegExp[]> = {
  calendar: [/termin/i, /kalender/i, /event/i, /meeting/i, /schedule/i, /appointment/i],
  inbox: [/e-?mail/i, /postfach/i, /mail/i, /inbox/i, /senden|schicken/i],
  browser: [/browser/i, /web/i, /website/i, /öffne.*url/i, /such.*google/i, /navigier/i, /internet/i],
  'todo-list': [/aufgabe/i, /todo/i, /to-?do/i, /task/i, /erledigen/i],
  training: [/training/i, /fine-?tune/i, /trainieren/i],
};

function detectModuleFromMessage(message: string): string | null {
  for (const [moduleId, patterns] of Object.entries(MODULE_DETECT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) return moduleId;
    }
  }
  return null;
}

// --------------------------------------------
// Eingebaute Agenten für Teilnehmer-Auswahl
// --------------------------------------------
const BUILT_IN_AGENT_OPTIONS = ['master', 'calendar', 'inbox', 'lab'];

// Mindestanzahl Nachrichten, ab der ein Chat-Titel generiert wird
const AUTO_TITLE_MIN_MESSAGES = 3;

type ConversationModeState = {
  activeMode?: OrchestrationMode;
  forcedMode?: OrchestrationMode;
  reasoning?: string;
};

// ============================================
// Collaboration-Erkennung
// Prüft ob der User eine Gruppendiskussion anstoßen will
// ============================================

const COLLABORATION_TRIGGERS = [
  // Deutsche Wortstämme (matcht Imperativ, Infinitiv, Konjugationen)
  /diskutier/i, /bespre?ch/i, /debattier/i,
  /findet.*lösung/i, /arbeit.*zusammen/i,
  /lös.*gemeinsam/i, /was meint ihr/i,
  /eure meinung/i, /einig/i,
  /analysier.*gemeinsam/i, /überleg.*zusammen/i,
  /brainstorm/i, /klär.*untereinander/i,
  /erarbeit/i, /develop.*together/i,
  /discuss/i, /find.*solution/i,
  /tauscht euch aus/i, /berat/i,
  // Zusätzliche Trigger für Diskussions-Szenarien
  /konsens/i, /überzeugt?\b/i, /konvertier/i,
  /streitet/i, /argumen?tier/i, /hört.*auf.*wenn/i,
  /redet.*miteinander/i, /sprecht.*darüber/i,
  /verhandel/i, /kommt.*überein/i,
  /findet.*kompromiss/i, /löst.*konflikt/i,
  /klärt.*das/i, /macht.*aus/i,
  /gegeneinander/i, /miteinander/i,
  /zusammen.*lösung/i, /gemeinsam.*klär/i,
  /debate/i, /argue/i, /convince/i, /persuade/i,
  /reach.*consensus/i, /work.*out/i,
];

// Erkennt ob die Nachricht eine Kollaboration impliziert
const isCollaborationRequest = (text: string): boolean =>
  COLLABORATION_TRIGGERS.some((pattern) => pattern.test(text));

// ============================================
// Pass-Signal-Erkennung
// Ein Agent antwortet mit "[PASS]" wenn er nichts
// Neues beizutragen hat. Diese Nachricht wird dem
// User nicht angezeigt.
// ============================================
const isPassSignal = (text: string): boolean => {
  const trimmed = text.trim();
  return trimmed === '[PASS]' || trimmed.startsWith('[PASS]');
};

// ============================================
// Reply-Target-Erkennung (v2)
// Scannt die GESAMTE Nachricht nach Adressierungen.
// Patterns: "**An Name:**", "An Name:", "@Name"
// Ignoriert generische Adressierungen wie "An alle".
// Der Content wird NICHT bereinigt — "An X:" bleibt im
// Text stehen, weil die Agents es als Stilmittel nutzen.
// Nur das Turn-Routing und replyTo werden daraus abgeleitet.
// ============================================

// Generische Adressierungen die KEIN spezifischer Agent sind
const GENERIC_TARGETS = ['alle', 'all', 'everyone', 'euch', 'euch allen'];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Patterns für explizite Adressierungen wie "An X:" oder "@X"
const EXPLICIT_REPLY_SCAN_PATTERNS = [
  /\*{2}An\s+(.+?):\*{2}/gi,      // "**An Christ:**" (Markdown-Bold)
  /\*{2}@\s*(.+?)[\s:,]\*{2}/gi,  // "**@Christ:**"
  /(?:^|\n)An\s+(.+?):/gim,       // "An Christ:" am Zeilenanfang
  /(?:^|\n)@(\S+)/gim,            // "@Christ" am Zeilenanfang
];

// Zusätzliche Pattern für natürliche Vocatives wie
// "CEO, Finance, Marketing - was ist euer Input?"
const VOCATIVE_REPLY_SCAN_PATTERNS = [
  /(?:^|\n)(.+?)\s+-\s+(?=was\b|wie\b|warum\b|wer\b|kann\b|könnt\b|magst\b|gebt\b|sagt\b|antwort|reagier|dein\b|euer\b)/gim,
  /(?:^|\n)(.+?),\s*(?=was\b|wie\b|warum\b|wer\b|kann\b|könnt\b|magst\b|gebt\b|sagt\b|antwort|reagier|dein\b|euer\b)/gim,
];

function splitAddressCandidates(segment: string): string[] {
  return segment
    .replace(/\*{1,2}/g, '')
    .split(/\s*(?:,| und | and |&|\/)\s*/i)
    .map((entry) => entry.replace(/[:\-]+$/g, '').trim())
    .filter((entry) => entry.length > 0)
    .filter((entry) => !GENERIC_TARGETS.includes(entry.toLowerCase()));
}

// Extrahiert explizit adressierte Targets aus einer Agent-Nachricht.
// Gibt die Targets in der Reihenfolge ihres letzten Vorkommens zurück.
const extractExplicitReplyTargets = (text: string): string[] => {
  const detectedTargets: string[] = [];

  for (const pattern of EXPLICIT_REPLY_SCAN_PATTERNS) {
    // Reset lastIndex weil wir /g Patterns verwenden
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const rawTarget = match[1]?.trim();
      if (!rawTarget) continue;
      detectedTargets.push(...splitAddressCandidates(rawTarget));
    }
  }

  for (const pattern of VOCATIVE_REPLY_SCAN_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const rawTarget = match[1]?.trim();
      if (!rawTarget) continue;
      detectedTargets.push(...splitAddressCandidates(rawTarget));
    }
  }

  return detectedTargets;
};

// --------------------------------------------
// Migration: Alte Chat-Daten beim ersten Laden übernehmen
// --------------------------------------------

let migrationDone = false;

// --------------------------------------------
// Komponente: AgentsPage
// Hauptansicht fuer den Chat-Workspace, optional mit Modul-Shell
// --------------------------------------------

interface AgentsPageProps {
  showShell?: boolean;
  navigationScope?: AgentNavigationScope;
  initialMode?: AgentsSpatialMode;
}

export function AgentsPage({
  showShell = true,
  navigationScope = 'global',
  initialMode = 'chat',
}: AgentsPageProps) {
  // ----------------------------------------
  // Lokaler State
  // ----------------------------------------
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [conversationParticipants, setConversationParticipants] = useState<GroupChatParticipantRole[]>([]);
  const [participantsFormError, setParticipantsFormError] = useState('');
  const participantsPortalMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [embeddedMode, setEmbeddedMode] = useState<AgentsSpatialMode>(initialMode);

  // ----------------------------------------
  // Store-Selektoren
  // ----------------------------------------
  const conversations = useAgentsStore((state) => state.conversations);
  const folders = useAgentsStore((state) => state.folders);
  const groupFileFolders = useAgentsStore((state) => state.groupFileFolders);
  const groupFiles = useAgentsStore((state) => state.groupFiles);
  const customAgents = useAgentsStore((state) => state.customAgents);
  const breakoutSessionRecords = useAgentsStore((state) => state.breakoutSessions);
  const groupObjectives = useAgentsStore((state) => state.groupObjectives);
  const activeConversationId = useAgentsStore((state) => state.activeConversationId);
  const createConversation = useAgentsStore((state) => state.createConversation);
  const addMessage = useAgentsStore((state) => state.addMessage);
  const setActiveConversation = useAgentsStore((state) => state.setActiveConversation);
  const setSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);
  const updateMessage = useAgentsStore((state) => state.updateMessage);
  const deleteMessage = useAgentsStore((state) => state.deleteMessage);
  const updateConversationParticipants = useAgentsStore((state) => state.updateConversationParticipants);
  const ensureGroupParticipantChats = useAgentsStore((state) => state.ensureGroupParticipantChats);
  const upsertBreakoutSession = useAgentsStore((state) => state.upsertBreakoutSession);
  const createOrchestratedAgent = useAgentsStore((state) => state.createOrchestratedAgent);
  const addGroupObjective = useAgentsStore((state) => state.addGroupObjective);
  const updateGroupObjective = useAgentsStore((state) => state.updateGroupObjective);
  const setIsLoading = useAgentsStore((state) => state.setIsLoading);
  const updateConversationTitle = useAgentsStore((state) => state.updateConversationTitle);
  const agentModeEnabled = useAgentsStore((state) => state.agentModeEnabled);
  const setAgentModeEnabled = useAgentsStore((state) => state.setAgentModeEnabled);
  const selectedAgentId = useSelectedAgentId();
  const effectiveSelectedAgentId = selectedAgentId || 'master';

  // Theme-Styles
  const { button, accentColor, designStyle, textColor } = useThemeStyles();

  // Agent-Config für ausgewählten Agent (einzelne Felder = stabile Referenzen)
  const configuredAgentName = useAgentName(effectiveSelectedAgentId);
  const configuredAgentOrbColor = useAgentOrbColor(effectiveSelectedAgentId);
  const agentLlmModel = useLLMModel(effectiveSelectedAgentId);
  const agentConfigs = useAgentConfigStore((state) => state.configs);
  const selectedCustomAgent = useMemo(
    () => customAgents.find((agent) => agent.id === selectedAgentId),
    [customAgents, selectedAgentId]
  );
  const agentName = selectedCustomAgent?.name || configuredAgentName;
  const agentOrbColor = selectedCustomAgent?.color || configuredAgentOrbColor;
  const isGroupAgentSelected = selectedCustomAgent?.type === 'group';
  const emptyChatSuggestions = useMemo(
    () => getSuggestedActionsForAgent(effectiveSelectedAgentId, agentName, 4),
    [agentName, effectiveSelectedAgentId]
  );
  const groupParticipantRoles = useMemo(
    () => selectedCustomAgent?.participantRoles ?? [],
    [selectedCustomAgent]
  );

  // Teilnehmernamen für den Header auflösen
  const groupParticipantLabel = useMemo(() => {
    if (!isGroupAgentSelected || groupParticipantRoles.length === 0) {
      return '';
    }

    const resolveAgentName = (agentId: string): string => {
      const customAgent = customAgents.find((agent) => agent.id === agentId);
      if (customAgent) return customAgent.name;
      return agentConfigs[agentId]?.agentName || DEFAULT_AGENT_NAMES[agentId] || agentId;
    };

    return groupParticipantRoles
      .map((participant) => `${resolveAgentName(participant.agentId)} (${participant.role})`)
      .join(', ');
  }, [agentConfigs, customAgents, groupParticipantRoles, isGroupAgentSelected]);

  const isAgentExecuting = useIsAgentExecuting();

  const activeConversation = useActiveAgentsConversation();
  const isLoading = useAgentsIsLoading();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStreamingMessage = Boolean(activeConversation?.messages.some((message) => message.isStreaming));
  const isNormalAgentChat = !isGroupAgentSelected;
  const breakoutSessions = useMemo(() => {
    if (!isGroupAgentSelected) return [];
    return breakoutSessionRecords.filter(
      (session) => session.parentGroupId === effectiveSelectedAgentId
    );
  }, [breakoutSessionRecords, effectiveSelectedAgentId, isGroupAgentSelected]);

  // Einzelchat innerhalb einer Gruppe erkennen
  // groupParticipantChatId zeigt an: Dieser Chat ist ein 1:1-Chat mit einem bestimmten Teilnehmer
  const isGroupParticipantChat = Boolean(
    isGroupAgentSelected && activeConversation?.groupParticipantChatId
  );
  const groupParticipantChatAgentId = activeConversation?.groupParticipantChatId;

  // ----------------------------------------
  // Reply-State: Speichert die aktuell zitierte Nachricht
  // Wird gesetzt wenn der User auf den Reply-Button klickt
  // ----------------------------------------
  const [replyToMessage, setReplyToMessage] = useState<ReplyToData | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState('');

  // ----------------------------------------
  // Diskussions-State: Ob gerade eine Diskussion läuft
  // Wird für den Stopp-Button und den Loop-Abbruch verwendet
  // ----------------------------------------
  const [discussionActive, setDiscussionActive] = useState(false);
  const discussionActiveRef = useRef(false);
  const orchestrationAbortControllerRef = useRef<AbortController | null>(null);
  const [conversationModeState, setConversationModeState] = useState<Record<string, ConversationModeState>>({});
  const pendingReasoningByConversationRef = useRef<Record<string, string>>({});

  // Reply-Handler: Wird von ChatMessage aufgerufen
  const handleReply = useCallback((message: ChatMessageData) => {
    const senderName = message.role === 'user'
      ? 'Du'
      : (message.agentName || agentName || 'Assistent');
    const senderColor = message.role === 'user'
      ? '#6366f1' // Indigo für User
      : (message.agentColor || agentOrbColor || '#a78bfa');

    setReplyToMessage({
      messageId: message.id,
      content: message.content.slice(0, 200), // Vorschau auf 200 Zeichen begrenzen
      senderName,
      senderColor,
    });
  }, [agentName, agentOrbColor]);

  // Reply abbrechen
  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  const handleEditMessage = useCallback((message: ChatMessageData) => {
    setReplyToMessage(null);
    setEditingMessageId(message.id);
    setEditingDraft(message.content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingDraft('');
  }, []);

  // Diskussion manuell stoppen (Stopp-Button)
  const handleStopDiscussion = useCallback(() => {
    orchestrationAbortControllerRef.current?.abort();
    orchestrationAbortControllerRef.current = null;
    setDiscussionActive(false);
    discussionActiveRef.current = false;
  }, []);

  const activeConversationModeState = activeConversationId
    ? conversationModeState[activeConversationId]
    : undefined;
  const handleOpenBreakout = useCallback((breakoutGroupId: string, breakoutConversationId: string | null) => {
    setSelectedAgent(breakoutGroupId);
    if (breakoutConversationId) {
      setActiveConversation(breakoutConversationId);
    }
  }, [setActiveConversation, setSelectedAgent]);

  const handleConversationForcedModeChange = useCallback((conversationId: string, mode?: OrchestrationMode) => {
    setConversationModeState((current) => ({
      ...current,
      [conversationId]: {
        ...current[conversationId],
        forcedMode: mode,
      },
    }));
  }, []);

  // ----------------------------------------
  // Ref für handleSendMessage, damit der ActionButton-Handler
  // immer die aktuelle Version aufrufen kann
  // ----------------------------------------
  const sendMessageRef = useRef<(content: string) => void>(() => {});

  // ----------------------------------------
  // Action-Button-Handler: Wird von ChatMessage aufgerufen
  // wenn der User auf einen eingebetteten Button klickt
  // z.B. "Agent Mode aktivieren"
  // ----------------------------------------
  const handleActionButton = useCallback((type: string, payload?: Record<string, unknown>) => {
    if (type === 'activate-agent-mode') {
      // Agent Mode aktivieren
      setAgentModeEnabled(true);

      // Original-Nachricht erneut senden (jetzt mit Agent Mode aktiv)
      const originalMessage = payload?.originalMessage as string | undefined;
      if (originalMessage) {
        // Kurze Verzögerung, damit der UI-State sich aktualisiert
        setTimeout(() => {
          sendMessageRef.current(originalMessage);
        }, 150);
      }
    }
  }, [setAgentModeEnabled]);

  // Teilnehmeroptionen für normale Agent-Chats
  const participantOptions = useMemo(() => {
    const builtInOptions = BUILT_IN_AGENT_OPTIONS.map((agentId) => ({
      id: agentId,
      name: agentConfigs[agentId]?.agentName || DEFAULT_AGENT_NAMES[agentId] || agentId,
    }));
    const customAgentOptions = customAgents
      .filter((agent) => agent.type !== 'group')
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
      }));
    return [...builtInOptions, ...customAgentOptions];
  }, [agentConfigs, customAgents]);

  // ----------------------------------------
  // @-Mention Optionen für die ChatBar
  // Baut eine Liste aller Teilnehmer des aktuellen Grupppenchats
  // oder aller Konversations-Teilnehmer für normale Chats
  // ----------------------------------------
  const mentionOptions: MentionOption[] = useMemo(() => {
    // Hilfsfunktion: Agent-Name und Farbe auflösen
    const resolveName = (agentId: string): string => {
      const custom = customAgents.find((a) => a.id === agentId);
      if (custom) return custom.name;
      return agentConfigs[agentId]?.agentName || DEFAULT_AGENT_NAMES[agentId] || agentId;
    };
    const resolveColor = (agentId: string): string => {
      const custom = customAgents.find((a) => a.id === agentId);
      if (custom) return custom.color;
      return agentConfigs[agentId]?.orbColor || DEFAULT_MODULE_COLORS[agentId] || '#8B5CF6';
    };

    // Gruppen: Teilnehmer aus den Gruppenrollen
    if (isGroupAgentSelected && groupParticipantRoles.length > 0) {
      return groupParticipantRoles.map((p) => ({
        id: p.agentId,
        name: resolveName(p.agentId),
        color: resolveColor(p.agentId),
      }));
    }

    // Normale Chats mit mehreren Teilnehmern
    if (activeConversation?.participantRoles && activeConversation.participantRoles.length > 0) {
      return activeConversation.participantRoles.map((p) => ({
        id: p.agentId,
        name: resolveName(p.agentId),
        color: resolveColor(p.agentId),
      }));
    }

    // Einzelner Agent – kein @-Mention nötig
    return [];
  }, [isGroupAgentSelected, groupParticipantRoles, activeConversation?.participantRoles, customAgents, agentConfigs]);

  const conversationParticipantLabel = useMemo(() => {
    if (!isNormalAgentChat || !activeConversation?.participantRoles?.length) return '';
    const resolveAgentName = (agentId: string): string => {
      const customAgent = customAgents.find((agent) => agent.id === agentId);
      if (customAgent) return customAgent.name;
      return agentConfigs[agentId]?.agentName || DEFAULT_AGENT_NAMES[agentId] || agentId;
    };
    return activeConversation.participantRoles
      .map((participant) => `${resolveAgentName(participant.agentId)} (${participant.role})`)
      .join(', ');
  }, [activeConversation?.participantRoles, agentConfigs, customAgents, isNormalAgentChat]);

  // ----------------------------------------
  // Effekt: Migration alter Chat-Daten
  // ----------------------------------------
  useEffect(() => {
    if (!migrationDone) {
      migrateFromChatStore();
      migrationDone = true;
    }
  }, []);

  // ----------------------------------------
  // Effekt: Erste Konversation erstellen
  // ----------------------------------------
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation();
    }
  }, [conversations.length, createConversation]);

  // ----------------------------------------
  // Effekt: Zum Ende der Nachrichten scrollen
  // ----------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length, isLoading, isAgentExecuting]);

  // Modal-State aus aktiver Konversation initialisieren
  useEffect(() => {
    if (!activeConversation) {
      setConversationParticipants([]);
      return;
    }
    setConversationParticipants(activeConversation.participantRoles || []);
  }, [activeConversation]);

  // ----------------------------------------
  // Teilnehmer im Konversations-Header verwalten
  // ----------------------------------------
  const addParticipantRow = () => {
    setConversationParticipants((prev) => [...prev, { agentId: '', role: '' }]);
  };

  const updateParticipantRow = (index: number, updates: Partial<GroupChatParticipantRole>) => {
    setConversationParticipants((prev) =>
      prev.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, ...updates } : participant
      )
    );
  };

  const removeParticipantRow = (index: number) => {
    setConversationParticipants((prev) => prev.filter((_, participantIndex) => participantIndex !== index));
  };

  const handleSaveParticipants = () => {
    if (!activeConversation) return;
    const normalizedParticipants = conversationParticipants
      .filter((participant) => participant.agentId.trim() && participant.role.trim())
      .map((participant) => ({
        agentId: participant.agentId.trim(),
        role: participant.role.trim(),
      }));

    // ----------------------------------------
    // Teilnehmer robust mergen (weitere hinzufügen)
    // Verhindert, dass bestehende Teilnehmer verloren gehen
    // ----------------------------------------
    const mergedByAgent = new Map<string, GroupChatParticipantRole>();
    (activeConversation.participantRoles || []).forEach((participant) => {
      mergedByAgent.set(participant.agentId, { ...participant });
    });
    normalizedParticipants.forEach((participant) => {
      mergedByAgent.set(participant.agentId, { ...participant });
    });
    const mergedParticipants = Array.from(mergedByAgent.values());

    updateConversationParticipants(activeConversation.id, mergedParticipants);
    setParticipantsFormError('');
    setShowParticipantsModal(false);
  };

  // ----------------------------------------
  // Automatische Chat-Titel-Generierung
  // Wird nach ~3 Nachrichten aufgerufen, wenn der Titel noch "Neuer Chat" ist.
  // Sendet die bisherigen Nachrichten an das LLM, um einen passenden Titel zu finden.
  // ----------------------------------------
  const generateChatTitle = useCallback(async (conversationId: string) => {
    // Aktuelle Konversation aus dem Store holen
    const currentConversations = useAgentsStore.getState().conversations;
    const conv = currentConversations.find((c) => c.id === conversationId);
    if (!conv) return;

    // Nur wenn der Titel noch der Default ist
    if (conv.title !== DEFAULT_CONVERSATION_TITLE) return;

    // Nur wenn genug Nachrichten vorhanden sind
    if (conv.messages.length < AUTO_TITLE_MIN_MESSAGES) return;

    // Die letzten Nachrichten als Kontext für die Titelgenerierung
    const contextSnippet = conv.messages
      .slice(0, 6) // Maximal 6 Nachrichten für den Titel
      .map((msg) => `${msg.role === 'user' ? 'User' : (msg.agentName || 'Assistant')}: ${msg.content.slice(0, 150)}`)
      .join('\n');

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Fasse den folgenden Chatverlauf in einem kurzen, prägnanten Titel zusammen (maximal 5 Wörter, keine Anführungszeichen, keine Satzzeichen am Ende). Antworte NUR mit dem Titel, sonst nichts.\n\n${contextSnippet}`,
            },
          ],
        }),
      });

      if (!response.ok) return;

      const data = await response.json();
      const generatedTitle = (data.message || '').trim().replace(/^["']|["']$/g, '').slice(0, 60);

      if (generatedTitle && generatedTitle.length > 0) {
        updateConversationTitle(conversationId, generatedTitle);
      }
    } catch (err) {
      // Titelgenerierung ist nicht kritisch – bei Fehler ignorieren
      console.warn('Auto-Titel-Generierung fehlgeschlagen:', err);
    }
  }, [updateConversationTitle]);

  // ----------------------------------------
  // Hilfsfunktion: SSE-Stream lesen und Token für Token
  // an eine bereits hinzugefügte (leere) Nachricht anhängen.
  // Gibt den vollständigen Text zurück.
  // ----------------------------------------
  // ----------------------------------------
  // Sprecher-Mix-Schutz für Gruppen-Outputs
  // Verhindert, dass ein Agent fremde Sprecherlabels wie
  // "[Training Agent]:" in seine eigene Nachricht schreibt.
  // ----------------------------------------
  const sanitizeParticipantResponse = useCallback(
    (
      rawContent: string,
      fetchBody: Record<string, unknown>,
    ): { content: string; foreignSpeakerDetected: boolean } => {
      if (!rawContent) {
        return { content: rawContent, foreignSpeakerDetected: false };
      }

      const participantContext = fetchBody.participantContext;
      if (!participantContext || typeof participantContext !== 'object') {
        return {
          content: rawContent,
          foreignSpeakerDetected: false,
        };
      }

      const ctx = participantContext as Record<string, unknown>;
      const agentName = String(ctx.agentName || '').trim();
      const otherParticipants = Array.isArray(ctx.otherParticipants)
        ? ctx.otherParticipants
        : [];

      const escapeRegExp = (value: string) =>
        value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const otherNames = otherParticipants
        .map((participant) => {
          const data = participant as Record<string, unknown>;
          return String(data.agentName || data.agentId || '').trim();
        })
        .filter(Boolean)
        // Laengere Namen zuerst, damit Teilmatches nicht zu frueh greifen.
        .sort((left, right) => right.length - left.length);

      let sanitized = rawContent;

      // Redundantes Eigenlabel am Anfang entfernen:
      // "[Browser Agent]: Hallo ..." -> "Hallo ..."
      if (agentName) {
        const selfPrefixPattern = new RegExp(
          `^\\s*\\[${escapeRegExp(agentName)}\\]:\\s*`,
          'i',
        );
        sanitized = sanitized.replace(selfPrefixPattern, '');
      }

      if (otherNames.length === 0) {
        return {
          content: sanitized,
          foreignSpeakerDetected: false,
        };
      }

      // Fremde Sprecher nur am Zeilenanfang erkennen.
      // Normale Erwähnungen im Fliesstext bleiben erlaubt.
      const foreignSpeakerPattern = new RegExp(
        `(?:^|\\n)\\s*\\[(?:${otherNames.map(escapeRegExp).join('|')})\\]:\\s*`,
        'i',
      );
      const foreignSpeakerMatch = foreignSpeakerPattern.exec(sanitized);

      if (!foreignSpeakerMatch) {
        return {
          content: sanitized,
          foreignSpeakerDetected: false,
        };
      }

      return {
        content: sanitized.slice(0, foreignSpeakerMatch.index),
        foreignSpeakerDetected: true,
      };
    },
    [],
  );

  // ----------------------------------------
  // Fallback: Nicht-streamende Route aufrufen
  // Wird verwendet wenn der Stream fehlschlägt oder leer ist
  // ----------------------------------------
  const fallbackToNonStreaming = async (
    fetchBody: Record<string, unknown>,
    conversationId: string,
    messageId: string,
  ): Promise<string> => {
    try {
      const fallback = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fetchBody),
      });

      // Fehler-Response: Versuche die Details auszulesen
      if (!fallback.ok) {
        let errText = `Fehler (${fallback.status})`;
        try {
          const errData = await fallback.json();
          // API-spezifische Fehlermeldungen benutzerfreundlich anzeigen
          if (errData.details?.includes('overloaded') || errData.details?.includes('529')) {
            errText = '⚠️ API ist gerade überlastet. Bitte versuche es in ein paar Sekunden erneut.';
          } else if (errData.details?.includes('rate_limit') || errData.details?.includes('429')) {
            errText = '⚠️ Rate-Limit erreicht. Bitte warte einen Moment.';
          } else if (errData.details?.includes('API Key')) {
            errText = '⚠️ API-Key fehlt oder ist ungültig. Prüfe die Einstellungen.';
          } else if (errData.error) {
            errText = `⚠️ ${errData.error}${errData.details ? `: ${errData.details.slice(0, 100)}` : ''}`;
          }
        } catch {
          // JSON-Parsing fehlgeschlagen — generischen Text nutzen
        }
        updateMessage(conversationId, messageId, { content: errText, isStreaming: false });
        return errText;
      }

      const data = await fallback.json();
      const msg = data.message || 'Keine Antwort erhalten.';
      const sanitized = sanitizeParticipantResponse(msg, fetchBody);
      const safeMessage = sanitized.content
        || (sanitized.foreignSpeakerDetected
          ? '⚠️ Antwort wurde verworfen, weil ein anderer Agent in derselben Nachricht mitgesprochen hat.'
          : msg);

      if (sanitized.foreignSpeakerDetected) {
        console.warn('Fallback-Antwort enthielt fremden Sprecher und wurde gekürzt/verworfen.');
      }

      updateMessage(conversationId, messageId, { content: safeMessage, isStreaming: false });
      return safeMessage;
    } catch (err) {
      console.error('Fallback-Route fehlgeschlagen:', err);
      const errMsg = '⚠️ Netzwerkfehler — Antwort konnte nicht geladen werden.';
      updateMessage(conversationId, messageId, { content: errMsg, isStreaming: false });
      return errMsg;
    }
  };

  const streamToMessage = async (
    fetchBody: Record<string, unknown>,
    conversationId: string,
    messageId: string,
  ): Promise<string> => {
    let response: Response;
    try {
      response = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fetchBody),
      });
    } catch {
      // Netzwerkfehler → Fallback
      console.warn('Stream-Fetch fehlgeschlagen, nutze Fallback');
      return fallbackToNonStreaming(fetchBody, conversationId, messageId);
    }

    if (!response.ok || !response.body) {
      // HTTP-Fehler → Fallback
      console.warn(`Stream-Route: ${response.status}, nutze Fallback`);
      return fallbackToNonStreaming(fetchBody, conversationId, messageId);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';
    let streamHadError = false;
    let foreignSpeakerDetected = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE-Events parsen (können mehrere in einem Chunk sein)
        const lines = buffer.split('\n');
        // Letztes unvollständiges Fragment behalten
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();

          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);
            // Token empfangen → an Nachricht anhängen
            if (parsed.token && !foreignSpeakerDetected) {
              const nextAccumulated = accumulated + parsed.token;
              const sanitized = sanitizeParticipantResponse(nextAccumulated, fetchBody);

              if (sanitized.foreignSpeakerDetected) {
                foreignSpeakerDetected = true;
                if (sanitized.content) {
                  accumulated = sanitized.content;
                  updateMessage(conversationId, messageId, { content: accumulated, isStreaming: true });
                } else {
                  accumulated = '';
                  streamHadError = true;
                }
              } else {
                accumulated = sanitized.content;
                updateMessage(conversationId, messageId, { content: accumulated, isStreaming: true });
              }
            }
            // Fehler vom Server empfangen
            if (parsed.error) {
              console.warn('Stream-Fehler vom Server:', parsed.error);
              streamHadError = true;
            }
          } catch {
            // Ungültiges JSON ignorieren
          }
        }
      }
    } catch (err) {
      console.warn('Stream-Lesung abgebrochen:', err);
      streamHadError = true;
    }

    // Wenn der Stream leer war oder einen Fehler hatte → Fallback
    if (!accumulated && streamHadError) {
      console.warn('Stream war leer/fehlerhaft, nutze Fallback');
      return fallbackToNonStreaming(fetchBody, conversationId, messageId);
    }

    // Wenn der Stream einfach keine Tokens lieferte → Fallback
    if (!accumulated) {
      console.warn('Stream lieferte keine Tokens, nutze Fallback');
      return fallbackToNonStreaming(fetchBody, conversationId, messageId);
    }

    updateMessage(conversationId, messageId, { content: accumulated, isStreaming: false });

    return accumulated;
  };

  // ----------------------------------------
  // Handler: Nachricht senden
  // ----------------------------------------
  const handleSendMessage = async (
    content: string,
    images?: AttachedImage[],
    files?: AttachedFile[],
    replyTo?: ReplyToData,
    forceMode?: OrchestrationMode,
  ) => {
    orchestrationAbortControllerRef.current?.abort();
    orchestrationAbortControllerRef.current = null;
    discussionActiveRef.current = false;
    setDiscussionActive(false);

    const conversationId = activeConversationId || createConversation();
    const conversation = conversations.find(c => c.id === conversationId);
    let baseMessages = conversation?.messages || [];
    let workspaceMessageId: string | null = null;

    if (editingMessageId) {
      const editIndex = baseMessages.findIndex((message) => message.id === editingMessageId);

      if (editIndex !== -1) {
        const preservedMessages = baseMessages.slice(0, editIndex);
        baseMessages
          .slice(editIndex)
          .forEach((message) => deleteMessage(conversationId, message.id));
        baseMessages = preservedMessages;
      }

      setEditingMessageId(null);
      setEditingDraft('');
    }
    
    // User-Nachricht zur Konversation hinzufügen (mit optionalem Reply)
    addMessage(conversationId, { role: 'user', content, images, files, replyTo });

    // Assistent-Antwort abrufen
    setIsLoading(true);

    try {
      // ----------------------------------------
      // Smart Agent-Mode-Vorschlag (Feature 2)
      // Wenn Agent Mode AUS ist und kein Gruppenchat,
      // prüfen ob der User eine Aktion will
      // ----------------------------------------
      if (!agentModeEnabled && !isGroupAgentSelected) {
        try {
          const classifyResponse = await fetch('/api/agent/classify-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: content }),
          });

          if (classifyResponse.ok) {
            const classifyResult = await classifyResponse.json();

            // Wenn die Klassifikation eine Aktion erkennt (mit genug Confidence)
            if (classifyResult.isAction && classifyResult.confidence >= 0.7) {
              // Vorschlags-Nachricht mit Button einfügen
              addMessage(conversationId, {
                role: 'assistant',
                content: `Ich erkenne, dass du möchtest, dass ich etwas für dich tue${classifyResult.detectedModule ? ` (${classifyResult.detectedModule})` : ''}. Soll ich den Agent Mode aktivieren, damit ich das direkt erledigen kann?`,
                actionButton: {
                  type: 'activate-agent-mode',
                  label: 'Agent Mode aktivieren',
                  payload: {
                    originalMessage: content,
                    detectedModule: classifyResult.detectedModule,
                  },
                },
              });

              setIsLoading(false);
              return; // Nicht normal weiter — warte auf Button-Klick
            }
          }
        } catch (classifyError) {
          // Bei Fehlern: Einfach normal weitermachen
          console.warn('Intent-Klassifikation fehlgeschlagen, normal weiter:', classifyError);
        }
      }

      // ----------------------------------------
      // Agent Mode Live-Preview (Feature 1)
      // Wenn Agent Mode AN ist, Modul erkennen und
      // Workspace-Nachricht mit Live-Fenster einfügen
      // ----------------------------------------
      if (agentModeEnabled && !isGroupAgentSelected) {
        const detectedModule = detectModuleFromMessage(content);
        if (detectedModule) {
          workspaceMessageId = addMessage(conversationId, {
            role: 'assistant',
            content: `Ich arbeite im ${detectedModule}-Modul...`,
            agentWorkspace: {
              moduleId: detectedModule,
              isActive: true,
            },
          });
        }
      }

      // Falls eine Nachricht zitiert wird, Kontext für das LLM anhängen
      const replyContext = replyTo
        ? `\n\n[Antwort auf "${replyTo.senderName}": "${replyTo.content}"]`
        : '';

      const userMessageForModel: ChatMessageData = {
        id: 'pending-user-message',
        role: 'user',
        content: content + replyContext,
        timestamp: Date.now(),
        images,
        files,
      };

      const contextMessages = [
        ...baseMessages,
        userMessageForModel,
      ].slice(-20).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: serializeChatMessageForModel(msg),
      }));

      // Agent-Request senden
      // Wir nutzen einen direkten Fetch mit moduleId für modul-spezifische Agenten
      const moduleId = effectiveSelectedAgentId !== 'master' ? effectiveSelectedAgentId : undefined;
      
      // ----------------------------------------
      // Gruppenkontext pro Request mitsenden (isoliert pro Gruppe)
      // ----------------------------------------
      const buildGroupScopeAgentIds = (): string[] => {
        if (!isGroupAgentSelected || !selectedCustomAgent) {
          return [];
        }

        const isSubgroup = Boolean(selectedCustomAgent.parentGroupId);
        if (isSubgroup) {
          return [effectiveSelectedAgentId];
        }

        const ids = new Set<string>([effectiveSelectedAgentId]);
        let changed = true;
        while (changed) {
          changed = false;
          customAgents.forEach((agent) => {
            if (agent.type === 'group' && agent.parentGroupId && ids.has(agent.parentGroupId) && !ids.has(agent.id)) {
              ids.add(agent.id);
              changed = true;
            }
          });
        }
        return Array.from(ids);
      };

      const groupScopeAgentIds = buildGroupScopeAgentIds();
      const groupContext = isGroupAgentSelected && selectedCustomAgent
        ? (() => {
            const scopedFolders = folders
              .filter((folder) => groupScopeAgentIds.includes(folder.agentId))
              .map((folder) => ({
                id: folder.id,
                name: folder.name,
                color: folder.color,
                groupScopeId: folder.agentId,
              }));

            const scopedFiles = groupFiles
              .filter((file) => groupScopeAgentIds.includes(file.groupId))
              .slice(-60)
              .map((file) => ({
                id: file.id,
                name: file.name,
                type: file.type,
                size: file.size,
                groupId: file.groupId,
                folderId: file.folderId,
                // Inhalte begrenzen, damit Prompt kompakt bleibt
                contentPreview: file.content?.slice(0, 1200),
              }));

            const scopedFileFolders = groupFileFolders
              .filter((folder) => groupScopeAgentIds.includes(folder.groupId))
              .map((folder) => ({
                id: folder.id,
                name: folder.name,
                color: folder.color,
                groupId: folder.groupId,
              }));

            const privateThreads = conversations
              .filter(
                (entry) =>
                  entry.agentId === selectedCustomAgent.id
                  && Boolean(entry.groupParticipantChatId)
                  && entry.messages.length > 0,
              )
              .map((entry) => ({
                conversationId: entry.id,
                agentId: entry.groupParticipantChatId,
                title: entry.title,
                unreadCount: entry.unreadCount || 0,
                requiresPrivateReply: Boolean(entry.requiresPrivateReply),
                lastPrivateMessageAt: entry.lastPrivateMessageAt,
                recentMessages: entry.messages.slice(-4).map((message) => ({
                  role: message.role,
                  content: message.content,
                  privateMessageKind: message.privateMessageKind,
                  agentName: message.agentName,
                })),
              }));

            const breakoutSessionSummaries = breakoutSessions.map((session) => ({
              id: session.breakoutId,
              breakoutGroupId: session.breakoutGroupId,
              breakoutConversationId: session.breakoutConversationId,
              name: session.name,
              description: session.summary || session.task,
              participantRoles: session.participants,
              status: session.status,
              task: session.task,
              mode: session.mode,
              reportBackTo: session.reportBackTo,
            }));

            return {
              groupId: selectedCustomAgent.id,
              groupName: selectedCustomAgent.name,
              groupDescription: selectedCustomAgent.description || '',
              parentGroupId: selectedCustomAgent.parentGroupId || null,
              rootGroupId: selectedCustomAgent.rootGroupId || selectedCustomAgent.id,
              participantRoles: selectedCustomAgent.participantRoles || [],
              conversationParticipants: activeConversation?.participantRoles || [],
              scopeAgentIds: groupScopeAgentIds,
              breakoutSessions: breakoutSessionSummaries,
              folders: scopedFolders,
              fileFolders: scopedFileFolders,
              files: scopedFiles,
              privateThreads,
            };
          })()
        : undefined;

      // ----------------------------------------
      // Hilfsfunktion: Agent-Namen auflösen
      // ----------------------------------------
      const resolveParticipantName = (agentId: string): string => {
        const custom = customAgents.find((a) => a.id === agentId);
        if (custom) return custom.name;
        return agentConfigs[agentId]?.agentName || DEFAULT_AGENT_NAMES[agentId] || agentId;
      };

      const resolveParticipantColor = (agentId: string): string => {
        const custom = customAgents.find((a) => a.id === agentId);
        if (custom) return custom.color;
        return agentConfigs[agentId]?.orbColor || DEFAULT_MODULE_COLORS[agentId] || '#8B5CF6';
      };

      const getGroupOrchestratorIdentity = () => {
        const preferredParticipant = allParticipants.find((participant) => participant.authority === 'owner')
          || allParticipants.find((participant) => participant.authority === 'admin')
          || allParticipants.find((participant) => participant.agentId === selectedCustomAgent?.adminAgentId)
          || allParticipants[0];

        if (!preferredParticipant) {
          return {
            agentId: 'orchestrator',
            agentName: 'Orchestrator',
            agentColor: '#6366f1',
          };
        }

        return {
          agentId: preferredParticipant.agentId,
          agentName: preferredParticipant.role || resolveParticipantName(preferredParticipant.agentId),
          agentColor: resolveParticipantColor(preferredParticipant.agentId),
        };
      };

      // ----------------------------------------
      // Gruppenchat: Smart Routing
      // Erkennt ob ein bestimmter Agent angesprochen wird (@Name oder Name)
      // Nur angesprochene Agents antworten, sonst alle
      // Bei Einzelchats (groupParticipantChatId): Nur der eine Teilnehmer antwortet
      // ----------------------------------------
      // Teilnehmer: Aus Gruppen-Rollen ODER aus normalen Chat-Teilnehmern
      let allParticipants = isGroupAgentSelected
        ? (selectedCustomAgent?.participantRoles || activeConversation?.participantRoles || [])
        : (activeConversation?.participantRoles || []);

      // Einzelchat innerhalb einer Gruppe: Nur den einen Teilnehmer als Ansprechpartner verwenden
      if (isGroupParticipantChat && groupParticipantChatAgentId) {
        const participantRole = allParticipants.find(
          (p) => p.agentId === groupParticipantChatAgentId
        );
        allParticipants = participantRole ? [participantRole] : [];
      }

      if (isGroupParticipantChat && selectedCustomAgent && groupParticipantChatAgentId) {
        const mainConversation = useAgentsStore.getState().conversations.find(
          (entry) => entry.agentId === selectedCustomAgent.id && !entry.groupParticipantChatId,
        );
        if (mainConversation) {
          addMessage(mainConversation.id, {
            role: 'system',
            content: `Antwort für ${resolveParticipantName(groupParticipantChatAgentId)} im Privatchat erfasst. Der Kontext wird beim nächsten Gruppenturn berücksichtigt.`,
            privateMessageKind: 'status',
          });
        }
      }

      const getParticipantAliases = (participant: typeof allParticipants[number]): string[] => {
        return Array.from(new Set([
          resolveParticipantName(participant.agentId),
          participant.role || '',
          participant.agentId,
        ]
          .map((entry) => entry.trim().toLowerCase())
          .filter((entry) => entry.length > 0)));
      };

      const textContainsAlias = (text: string, alias: string): boolean => {
        if (!alias) return false;
        if (alias.includes(' ')) {
          return text.includes(alias);
        }

        const boundaryPattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`, 'i');
        return boundaryPattern.test(text);
      };

      // Erkennt welche Teilnehmer im Text angesprochen oder erwähnt werden
      const detectMentionedParticipants = (
        text: string,
        participantList: typeof allParticipants,
        options?: {
          excludeAgentId?: string;
          explicitTargetsOnly?: boolean;
        },
      ): typeof allParticipants => {
        if (participantList.length === 0) return [];

        const lowerText = text.toLowerCase();
        const explicitTargets = extractExplicitReplyTargets(text)
          .map((entry) => entry.toLowerCase());
        const mentioned: typeof allParticipants = [];

        for (const participant of participantList) {
          if (options?.excludeAgentId && participant.agentId === options.excludeAgentId) {
            continue;
          }

          const aliases = getParticipantAliases(participant);
          const isExplicitlyMentioned = explicitTargets.some((target) =>
            aliases.some((alias) =>
              target === alias || target.includes(alias) || alias.includes(target)));

          if (isExplicitlyMentioned) {
            mentioned.push(participant);
            continue;
          }

          if (options?.explicitTargetsOnly) {
            continue;
          }

          const isMentioned = aliases.some((alias) => {
            if (lowerText.includes(`@${alias}`)) {
              return true;
            }

            if (alias.length <= 2) {
              return false;
            }

            return textContainsAlias(lowerText, alias);
          });

          if (isMentioned) {
            mentioned.push(participant);
          }
        }

        return mentioned;
      };

      const detectAddressedParticipantsFromReply = (
        text: string,
        participantList: typeof allParticipants,
        senderAgentId: string,
      ): typeof allParticipants => {
        const explicitMatches = detectMentionedParticipants(text, participantList, {
          excludeAgentId: senderAgentId,
          explicitTargetsOnly: true,
        });

        if (explicitMatches.length > 0) {
          return explicitMatches;
        }

        return [];
      };

      const mentionedParticipants = detectMentionedParticipants(content, allParticipants);
      // Wenn niemand explizit angesprochen wird, antworten alle
      const participants = mentionedParticipants.length > 0 ? mentionedParticipants : allParticipants;
      const selectedGroupObjectives = selectedCustomAgent
        ? groupObjectives.filter((objective) => objective.groupId === selectedCustomAgent.id)
        : [];

      const handleGroupOrchestrateStream = async () => {
        if (!selectedCustomAgent) {
          return;
        }

        const abortController = new AbortController();
        orchestrationAbortControllerRef.current = abortController;
        setDiscussionActive(true);
        discussionActiveRef.current = true;

        const activeMessageByAgentId = new Map<string, string>();
        const orchestratorIdentity = getGroupOrchestratorIdentity();

        const getMessageKey = (targetConversationId: string, agentId: string) =>
          `${targetConversationId}:${agentId}`;
        const resolveEventConversationId = (breakoutId?: string): string => {
          if (!breakoutId) {
            return conversationId;
          }

          return useAgentsStore.getState().breakoutSessions.find(
            (session) => session.breakoutId === breakoutId
          )?.breakoutConversationId || conversationId;
        };

        const ensureAgentMessage = (
          targetConversationId: string,
          agentId: string,
          agentName?: string,
          agentColor?: string,
        ): string => {
          const messageKey = getMessageKey(targetConversationId, agentId);
          const existingMessageId = activeMessageByAgentId.get(messageKey);
          const pendingReasoning = pendingReasoningByConversationRef.current[targetConversationId];

          if (existingMessageId) {
            if (pendingReasoning) {
              updateMessage(targetConversationId, existingMessageId, {
                reasoning: pendingReasoning,
                isStreaming: true,
              });
              delete pendingReasoningByConversationRef.current[targetConversationId];
            }
            return existingMessageId;
          }

          const messageId = addMessage(targetConversationId, {
            role: 'assistant',
            content: '',
            model: agentLlmModel,
            agentId,
            agentName: agentName || resolveParticipantName(agentId),
            agentColor: agentColor || resolveParticipantColor(agentId),
            reasoning: pendingReasoning,
            isStreaming: true,
          });
          if (pendingReasoning) {
            delete pendingReasoningByConversationRef.current[targetConversationId];
          }
          activeMessageByAgentId.set(messageKey, messageId);
          return messageId;
        };

        const toObjectiveDraft = (
          objective: Partial<GroupObjective>,
        ): Omit<GroupObjective, 'id' | 'createdAt' | 'updatedAt'> => ({
          groupId: selectedCustomAgent.id,
          title: objective.title || 'Neues Ziel',
          description: objective.description || '',
          type: objective.type || 'short-term',
          status: objective.status || 'planned',
          priority: objective.priority || 'medium',
          subObjectives: objective.subObjectives,
          assignedAgentIds: objective.assignedAgentIds,
          artifactIds: objective.artifactIds,
          parentObjectiveId: objective.parentObjectiveId,
          deadline: objective.deadline,
          progress: objective.progress ?? 0,
        });

        const requestBody: GroupOrchestrateRequest = {
          groupId: selectedCustomAgent.id,
          conversationId,
          userMessage: content + replyContext,
          forceMode: forceMode ?? conversationModeState[conversationId]?.forcedMode,
          mentionedAgentIds: mentionedParticipants.map((participant) => participant.agentId),
          images,
          files,
          conversationHistory: [
            ...baseMessages,
            userMessageForModel,
          ].slice(-20),
          participants: allParticipants,
          objectives: selectedGroupObjectives,
          groupContext,
        };

        try {
          const response = await fetch('/api/agent/group-orchestrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: abortController.signal,
          });

          if (!response.ok || !response.body) {
            throw new Error(`Group-Orchestrierung fehlgeschlagen (${response.status}).`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() || '';

            for (const chunk of chunks) {
              const dataLine = chunk
                .split('\n')
                .find((line) => line.startsWith('data: '));

              if (!dataLine) continue;

              const payload = dataLine.slice(6).trim();
              if (!payload || payload === '[DONE]') {
                continue;
              }

              let event: GroupOrchestrateEvent;
              try {
                event = JSON.parse(payload) as GroupOrchestrateEvent;
              } catch {
                continue;
              }

              switch (event.type) {
                case 'agent_speaking': {
                  const targetConversationId = resolveEventConversationId(event.breakoutId);
                  ensureAgentMessage(targetConversationId, event.agentId, event.agentName);
                  break;
                }
                case 'agent_token': {
                  const targetConversationId = resolveEventConversationId(event.breakoutId);
                  const messageId = ensureAgentMessage(targetConversationId, event.agentId, event.agentName);
                  const existingContent = useAgentsStore.getState()
                    .conversations
                    .find((entry) => entry.id === targetConversationId)
                    ?.messages
                    .find((message) => message.id === messageId)
                    ?.content || '';
                  updateMessage(targetConversationId, messageId, {
                    content: existingContent + event.token,
                    isStreaming: true,
                  });
                  break;
                }
                case 'agent_done': {
                  const targetConversationId = resolveEventConversationId(event.breakoutId);
                  const messageId = ensureAgentMessage(targetConversationId, event.agentId, event.agentName);
                  updateMessage(targetConversationId, messageId, {
                    content: event.fullContent,
                    isStreaming: false,
                  });
                  activeMessageByAgentId.delete(getMessageKey(targetConversationId, event.agentId));
                  break;
                }
                case 'agent_passed': {
                  const targetConversationId = resolveEventConversationId(event.breakoutId);
                  const messageId = activeMessageByAgentId.get(getMessageKey(targetConversationId, event.agentId));
                  if (messageId) {
                    deleteMessage(targetConversationId, messageId);
                    activeMessageByAgentId.delete(getMessageKey(targetConversationId, event.agentId));
                  }
                  break;
                }
                case 'private_message': {
                  ensureGroupParticipantChats(selectedCustomAgent.id);
                  const participantConversation = useAgentsStore.getState().conversations.find(
                    (entry) =>
                      entry.agentId === selectedCustomAgent.id
                      && entry.groupParticipantChatId === event.agentId,
                  );

                  if (participantConversation) {
                    addMessage(participantConversation.id, {
                      role: 'assistant',
                      content: event.content,
                      model: agentLlmModel,
                      agentId: event.agentId,
                      agentName: event.agentName,
                      agentColor: resolveParticipantColor(event.agentId),
                      privateMessageKind: 'message',
                    });
                  }
                  break;
                }
                case 'private_clarification_needed': {
                  ensureGroupParticipantChats(selectedCustomAgent.id);
                  const participantConversation = useAgentsStore.getState().conversations.find(
                    (entry) =>
                      entry.agentId === selectedCustomAgent.id
                      && entry.groupParticipantChatId === event.agentId,
                  );

                  if (participantConversation) {
                    addMessage(participantConversation.id, {
                      role: 'assistant',
                      content: event.question,
                      model: agentLlmModel,
                      agentId: event.agentId,
                      agentName: event.agentName,
                      agentColor: resolveParticipantColor(event.agentId),
                      privateMessageKind: 'clarification',
                    });
                  }
                  addMessage(conversationId, {
                    role: 'system',
                    content: `${event.agentName} klärt gerade etwas mit dir im Privatchat.`,
                    privateMessageKind: 'status',
                  });
                  break;
                }
                case 'objective_updated': {
                  updateGroupObjective(event.objectiveId, event.updates);
                  break;
                }
                case 'objective_created': {
                  addGroupObjective(selectedCustomAgent.id, toObjectiveDraft(event.objective));
                  break;
                }
                case 'orchestrator_message': {
                  const targetConversationId = resolveEventConversationId(event.breakoutId);
                  const messageId = ensureAgentMessage(
                    targetConversationId,
                    orchestratorIdentity.agentId,
                    orchestratorIdentity.agentName,
                    orchestratorIdentity.agentColor,
                  );
                  updateMessage(targetConversationId, messageId, {
                    content: event.content,
                    agentId: orchestratorIdentity.agentId,
                    agentName: orchestratorIdentity.agentName,
                    agentColor: orchestratorIdentity.agentColor,
                    isStreaming: false,
                  });
                  activeMessageByAgentId.delete(getMessageKey(targetConversationId, orchestratorIdentity.agentId));
                  break;
                }
                case 'synthesis': {
                  const targetConversationId = resolveEventConversationId(event.breakoutId);
                  const messageId = ensureAgentMessage(
                    targetConversationId,
                    orchestratorIdentity.agentId,
                    orchestratorIdentity.agentName,
                    orchestratorIdentity.agentColor,
                  );
                  updateMessage(targetConversationId, messageId, {
                    content: event.content,
                    agentId: orchestratorIdentity.agentId,
                    agentName: orchestratorIdentity.agentName,
                    agentColor: orchestratorIdentity.agentColor,
                    isStreaming: false,
                  });
                  activeMessageByAgentId.delete(getMessageKey(targetConversationId, orchestratorIdentity.agentId));
                  break;
                }
                case 'error': {
                  const targetConversationId = resolveEventConversationId(event.breakoutId);
                  addMessage(targetConversationId, {
                    role: 'assistant',
                    content: `⚠️ ${event.message}`,
                    agentId: orchestratorIdentity.agentId,
                    agentName: orchestratorIdentity.agentName,
                    agentColor: orchestratorIdentity.agentColor,
                  });
                  break;
                }
                case 'orchestration_aborted':
                  break;
                case 'mode_selected': {
                  pendingReasoningByConversationRef.current[conversationId] = event.reasoning;
                  setConversationModeState((current) => ({
                    ...current,
                    [conversationId]: {
                      ...current[conversationId],
                      activeMode: event.mode,
                      reasoning: event.reasoning,
                    },
                  }));
                  break;
                }
                case 'mode_changed': {
                  pendingReasoningByConversationRef.current[conversationId] = event.reasoning;
                  setConversationModeState((current) => ({
                    ...current,
                    [conversationId]: {
                      ...current[conversationId],
                      activeMode: event.newMode,
                      reasoning: event.reasoning,
                    },
                  }));
                  break;
                }
                case 'breakout_created': {
                  const breakoutConversationId = upsertBreakoutSession({
                    breakoutId: event.breakoutId,
                    parentGroupId: event.parentGroupId,
                    breakoutGroupId: event.breakoutGroupId,
                    breakoutConversationId: event.breakoutConversationId,
                    name: event.name,
                    task: event.task,
                    participants: event.participants,
                    mode: event.mode,
                    reportBackTo: event.reportBackTo,
                    autoSaveArtifacts: event.autoSaveArtifacts,
                    targetFolderId: event.targetFolderId,
                    status: 'running',
                  });

                  addMessage(breakoutConversationId, {
                    role: 'system',
                    content: `Breakout gestartet: ${event.task}`,
                    privateMessageKind: 'status',
                  });
                  addMessage(conversationId, {
                    role: 'system',
                    content: `Breakout "${event.name}" gestartet mit ${event.participants.length} Teilnehmern.`,
                    privateMessageKind: 'status',
                  });
                  break;
                }
                case 'breakout_result': {
                  const currentState = useAgentsStore.getState();
                  const existingSession = currentState.breakoutSessions.find(
                    (session) => session.breakoutId === event.breakoutId
                  );
                  const breakoutGroup = currentState.customAgents.find(
                    (agent) => agent.id === event.breakoutGroupId
                  );
                  const breakoutConversationId = upsertBreakoutSession({
                    breakoutId: event.breakoutId,
                    parentGroupId: event.parentGroupId,
                    breakoutGroupId: event.breakoutGroupId,
                    breakoutConversationId: event.breakoutConversationId,
                    name: existingSession?.name || breakoutGroup?.name || 'Breakout',
                    task: existingSession?.task || breakoutGroup?.objective || breakoutGroup?.description || '',
                    participants: existingSession?.participants || breakoutGroup?.participantRoles || [],
                    mode: existingSession?.mode,
                    reportBackTo: existingSession?.reportBackTo || event.reportedByAgentId,
                    autoSaveArtifacts: existingSession?.autoSaveArtifacts,
                    targetFolderId: existingSession?.targetFolderId,
                    status: 'completed',
                    summary: event.summary,
                  });

                  addMessage(breakoutConversationId, {
                    role: 'assistant',
                    content: event.summary,
                    model: agentLlmModel,
                    agentId: event.reportedByAgentId,
                    agentName: event.reportedByName,
                    agentColor: resolveParticipantColor(event.reportedByAgentId),
                  });
                  addMessage(conversationId, {
                    role: 'system',
                    content: `Breakout "${existingSession?.name || breakoutGroup?.name || event.breakoutId}" abgeschlossen: ${event.summary}`,
                    privateMessageKind: 'status',
                  });
                  break;
                }
                case 'agent_created': {
                  createOrchestratedAgent({
                    agentId: event.agentId,
                    name: event.name,
                    role: event.role,
                    description: event.description,
                    icon: event.icon,
                    color: event.color,
                    parentAgentId: event.parentAgentId,
                    targetGroupId: event.targetGroupId,
                    addToGroup: event.addToGroup,
                    authority: event.authority,
                    scope: event.scope,
                    capabilities: event.capabilities,
                    settings: event.settings,
                    temporary: event.temporary,
                  });
                  addMessage(resolveEventConversationId(event.breakoutId), {
                    role: 'system',
                    content: event.addToGroup
                      ? `Neuer Sub-Agent erstellt: ${event.name} (${event.role}) und zur Gruppe hinzugefügt.`
                      : `Neuer Sub-Agent erstellt: ${event.name} (${event.role}).`,
                    privateMessageKind: 'status',
                  });
                  break;
                }
                case 'task_delegated':
                case 'task_completed':
                case 'sub_admin_active':
                case 'artifact_saved':
                case 'folder_created':
                case 'intervention_received':
                case 'orchestration_paused':
                case 'orchestration_resumed':
                case 'session_end':
                  break;
                default:
                  break;
              }
            }
          }
        } finally {
          if (orchestrationAbortControllerRef.current === abortController) {
            orchestrationAbortControllerRef.current = null;
          }
          setDiscussionActive(false);
          discussionActiveRef.current = false;
        }
      };

      if (isGroupAgentSelected && !isGroupParticipantChat) {
        await handleGroupOrchestrateStream();
        return;
      }

      if (participants.length > 0) {
        // ----------------------------------------
        // Hilfsfunktion: Einen einzelnen Agent-Call ausführen
        // Wird sowohl im normalen als auch im Diskussionsmodus verwendet
        // Parameter isDiscussion: Aktiviert den natürlichen Diskussions-Prompt
        // ----------------------------------------
        // ----------------------------------------
        // callParticipantStreaming: Streaming-Version
        // 1. Legt eine leere Platzhalter-Nachricht an
        // 2. Streamt Token für Token über SSE
        // 3. Gibt den vollständigen Text + Metadaten zurück
        // ----------------------------------------
        const callParticipantStreaming = async (
          participant: typeof participants[0],
          msgs: typeof contextMessages,
          isDiscussion?: boolean,
          addressContext?: {
            wasAddressedByParticipant?: boolean;
            addressedByParticipantName?: string;
          },
        ) => {
          const participantName = resolveParticipantName(participant.agentId);
          const participantColor = resolveParticipantColor(participant.agentId);

          const otherParticipants = allParticipants
            .filter((p) => p.agentId !== participant.agentId)
            .map((p) => ({
              agentId: p.agentId,
              agentName: resolveParticipantName(p.agentId),
              role: p.role,
            }));

          const wasDirectlyMentioned = mentionedParticipants
            .some((mentionedParticipant) => mentionedParticipant.agentId === participant.agentId);

          // Bei Einzelchats: Alle Gruppenteilnehmer als "andere" angeben
          // damit der Agent den vollen Gruppenkontext hat
          const effectiveOtherParticipants = isGroupParticipantChat
            ? groupParticipantRoles
                .filter((p) => p.agentId !== participant.agentId)
                .map((p) => ({
                  agentId: p.agentId,
                  agentName: resolveParticipantName(p.agentId),
                  role: p.role,
                }))
            : otherParticipants;

          const pContext = {
            agentId: participant.agentId,
            agentName: participantName,
            agentRole: participant.role,
            groupName: isGroupAgentSelected
              ? (selectedCustomAgent?.name || 'Gruppe')
              : (activeConversation?.title || 'Chat'),
            otherParticipants: effectiveOtherParticipants,
            wasDirectlyMentioned,
            wasAddressedByParticipant: Boolean(addressContext?.wasAddressedByParticipant),
            addressedByParticipantName: addressContext?.addressedByParticipantName || '',
            isDiscussion: isDiscussion || false,
            isDirectChat: isGroupParticipantChat || false,
          };

          const fetchBody = {
            messages: msgs,
            moduleId: participant.agentId,
            groupContext,
            participantContext: pContext,
          };

          const pendingReasoning = pendingReasoningByConversationRef.current[conversationId];
          if (pendingReasoning) {
            delete pendingReasoningByConversationRef.current[conversationId];
          }

          // Platzhalter-Nachricht VOR dem try anlegen,
          // damit die ID auch im catch verfügbar ist
          const msgId = addMessage(conversationId, {
            role: 'assistant',
            content: '',
            model: agentLlmModel,
            agentId: participant.agentId,
            agentName: participantName,
            agentColor: participantColor,
            reasoning: pendingReasoning,
            isStreaming: true,
          });

          try {
            // SSE-Stream lesen und Nachricht Stück für Stück aktualisieren
            const fullContent = await streamToMessage(fetchBody, conversationId, msgId);

            return {
              messageId: msgId,
              agentId: participant.agentId,
              agentName: participantName,
              agentColor: participantColor,
              content: fullContent,
              success: true,
            };
          } catch (err) {
            console.error(`Fehler bei Agent ${participantName}:`, err);
            // Platzhalter mit Fehlermeldung befüllen statt leer lassen
            updateMessage(conversationId, msgId, {
              content: `(${participantName} konnte nicht antworten)`,
              isStreaming: false,
            });
            return {
              messageId: msgId,
              agentId: participant.agentId,
              agentName: participantName,
              agentColor: participantColor,
              content: `(${participantName} konnte nicht antworten)`,
              success: false,
            };
          }
        };

        // ----------------------------------------
        // Entscheidung: Diskussionsmodus oder Single-Round?
        // Diskussion wird ausgelöst wenn:
        // 1. Mindestens 2 Teilnehmer vorhanden
        // 2. Die Nachricht eine Kollaboration impliziert
        // ----------------------------------------
        const shouldCollaborate =
          participants.length >= 2 && isCollaborationRequest(content);

        if (shouldCollaborate) {
          // ========================================
          // DISKUSSIONSMODUS (natürlicher Flow + Streaming)
          // Intelligentes Turn-System mit Token-für-Token-Anzeige.
          // Jeder Agent streamt seine Antwort direkt in den Chat.
          // Nach dem vollständigen Stream wird geprüft:
          // - [PASS] → Nachricht wieder entfernen
          // - Reply-Erkennung → replyTo anhängen, Turn-Routing
          // ========================================

          setDiscussionActive(true);
          discussionActiveRef.current = true;

          let runningMessages = [...contextMessages];
          const passedAgents = new Set<string>();
          let turnQueue: typeof allParticipants = [...allParticipants];
          const lastMessageByAgent = new Map<string, { id: string; content: string; name: string; color: string }>();
          const directAddressContextByAgentId = new Map<string, { addressedByParticipantName: string }>();

          while (turnQueue.length > 0) {
            if (!discussionActiveRef.current) break;

            const freshConv = useAgentsStore.getState().conversations
              .find((c) => c.id === conversationId);
            if (freshConv) {
              const lastMsg = freshConv.messages[freshConv.messages.length - 1];
              if (lastMsg && lastMsg.role === 'user' && lastMsg.content !== content) {
                break;
              }
            }

            const currentParticipant = turnQueue.shift()!;
            if (passedAgents.has(currentParticipant.agentId)) continue;

            const currentAddressContext = directAddressContextByAgentId.get(currentParticipant.agentId);
            directAddressContextByAgentId.delete(currentParticipant.agentId);

            // Agent-Antwort wird direkt in den Chat gestreamt
            const agentResponse = await callParticipantStreaming(
              currentParticipant,
              runningMessages,
              true,
              currentAddressContext
                ? {
                    wasAddressedByParticipant: true,
                    addressedByParticipantName: currentAddressContext.addressedByParticipantName,
                  }
                : undefined,
            );

            // API-Fehler → gestreamte Nachricht wieder entfernen
            if (!agentResponse.success) {
              if (agentResponse.messageId) {
                deleteMessage(conversationId, agentResponse.messageId);
              }
              continue;
            }

            // [PASS] → Agent hat nichts beizutragen, gestreamte Nachricht entfernen
            if (isPassSignal(agentResponse.content)) {
              if (agentResponse.messageId) {
                deleteMessage(conversationId, agentResponse.messageId);
              }
              passedAgents.add(currentParticipant.agentId);

              if (passedAgents.size >= allParticipants.length) break;

              if (turnQueue.length === 0) {
                const activeAgents = allParticipants.filter((p) => !passedAgents.has(p.agentId));
                if (activeAgents.length === 0) break;
                turnQueue = [...activeAgents];
              }
              continue;
            }

            // Agent hat wieder gesprochen → aus passedAgents entfernen
            passedAgents.delete(currentParticipant.agentId);

            // Reply-Erkennung auf dem vollständig gestreamten Text
            const addressedParticipants = detectAddressedParticipantsFromReply(
              agentResponse.content,
              allParticipants,
              currentParticipant.agentId,
            );
            const primaryAddressedParticipant = addressedParticipants[0];

            if (primaryAddressedParticipant && agentResponse.messageId) {
              const lastMsg = lastMessageByAgent.get(primaryAddressedParticipant.agentId);
              if (lastMsg) {
                // replyTo nachträglich an die gestreamte Nachricht anhängen
                updateMessage(conversationId, agentResponse.messageId, {
                  replyTo: {
                    messageId: lastMsg.id,
                    content: lastMsg.content.slice(0, 200),
                    senderName: lastMsg.name,
                    senderColor: lastMsg.color,
                  },
                });
              }
            }

            // Letzte Nachricht merken für zukünftige Reply-Referenzen
            if (agentResponse.messageId) {
              lastMessageByAgent.set(agentResponse.agentId, {
                id: agentResponse.messageId,
                content: agentResponse.content,
                name: agentResponse.agentName,
                color: agentResponse.agentColor,
              });
            }

            // Kontext für folgende Agents aktualisieren
            runningMessages = [
              ...runningMessages,
              {
                role: 'assistant' as const,
                content: `[${agentResponse.agentName}]: ${agentResponse.content}`,
              },
            ];

            // ----------------------------------------
            // Turn-Routing (robust):
            // 1. Wenn ein gültiger Adressat erkannt wurde → nur er kommt dran
            // 2. Sonst (Self-Ref, ungültiger Name, allgemein): alle aktiven
            //    Agents die noch nicht gepasst haben kommen in die Queue
            // 3. Der aktuelle Agent wird immer ausgeschlossen (doppelte Antwort verhindern)
            // ----------------------------------------
            if (addressedParticipants.length > 0) {
              const nextTargets = addressedParticipants.filter(
                (participant) => !passedAgents.has(participant.agentId),
              );

              if (nextTargets.length > 0) {
                directAddressContextByAgentId.clear();
                nextTargets.forEach((participant) => {
                  passedAgents.delete(participant.agentId);
                  directAddressContextByAgentId.set(participant.agentId, {
                    addressedByParticipantName: agentResponse.agentName,
                  });
                });
                turnQueue = [...nextTargets];
                continue;
              }
            }

            if (turnQueue.length === 0) {
              directAddressContextByAgentId.clear();
              // Kein gültiger Adressat oder alle Targets haben gepasst → alle aktiven Agents
              // (ohne den aktuellen, der gerade gesprochen hat)
              const activeAgents = allParticipants.filter(
                (p) => !passedAgents.has(p.agentId) && p.agentId !== currentParticipant.agentId
              );
              if (activeAgents.length === 0) break;
              turnQueue = [...activeAgents];
            } else {
              directAddressContextByAgentId.clear();
            }
          }

          setDiscussionActive(false);
          discussionActiveRef.current = false;

        } else {
          // ========================================
          // NORMALER MULTI-AGENT MODUS (sequenziell, single-round, Streaming)
          // Agents antworten nacheinander in der Reihenfolge der Teilnehmerliste.
          // So kann jeder Agent auf die vorherigen Antworten eingehen.
          // ========================================
          let runningMessages = [...contextMessages];

          for (const participant of participants) {
            const result = await callParticipantStreaming(participant, runningMessages);

            // Antwort in den laufenden Kontext aufnehmen,
            // damit der nächste Agent sie sehen kann
            if (result.success && result.content) {
              runningMessages = [
                ...runningMessages,
                {
                  role: 'assistant' as const,
                  content: `[${result.agentName}]: ${result.content}`,
                },
              ];
            }
          }
        }
      } else {
        // ----------------------------------------
        // Normaler Chat: Ein einzelner Agent antwortet (Streaming)
        // 1. Leere Platzhalter-Nachricht hinzufügen
        // 2. Token für Token über SSE streamen
        // ----------------------------------------
        const placeholderMsgId = addMessage(conversationId, {
          role: 'assistant',
          content: '',
          model: agentLlmModel,
          isStreaming: true,
        });

        await streamToMessage(
          { messages: contextMessages, moduleId, groupContext },
          conversationId,
          placeholderMsgId,
        );
      }

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Agent Fehler:', error);
      addMessage(conversationId, {
        role: 'assistant',
        content: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
      });
    } finally {
      setIsLoading(false);

      // Workspace-Embed deaktivieren wenn vorhanden
      if (workspaceMessageId) {
        updateMessage(conversationId, workspaceMessageId, {
          agentWorkspace: {
            moduleId: detectModuleFromMessage(content) || 'master',
            isActive: false,
          },
          content: 'Aktion abgeschlossen.',
        });
      }

      // Automatische Titelgenerierung (non-blocking, im Hintergrund)
      // Wird erst ausgelöst wenn genug Nachrichten vorhanden sind
      generateChatTitle(conversationId);
    }
  };

  // Ref für den ActionButton-Handler aktualisieren
  sendMessageRef.current = handleSendMessage;

  const pageContent = (
    <>
      {/* ========================================
          Memory Panel (Overlay)
          ======================================== */}
      <MemoryPanel
        isOpen={isMemoryPanelOpen}
        onClose={() => setIsMemoryPanelOpen(false)}
      />

      {/* ========================================
          Chat-Bereich
          ======================================== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!selectedAgentId ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
              <BotMessageSquare className="mx-auto mb-3 h-12 w-12 text-white/20" />
              <p className="text-sm text-white/60">Kein Agent ausgewählt</p>
              <p className="mt-2 text-xs text-white/40">
                Wähle links einen Agenten aus oder klicke in den Leerraum, um die Auswahl aufzuheben.
              </p>
            </div>
          </div>
        ) : activeConversation ? (
          <>
            {/* ----------------------------------------
                Chat-Header
                Titel + Agent-Info + Status
                ---------------------------------------- */}
            <div 
              className="flex items-center gap-3 px-4 py-3"
              style={{
                ...button.base,
                borderRadius: 0,
                borderBottom: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Agent-Indikator */}
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: `${agentOrbColor || '#8B5CF6'}20` }}
              >
                <BotMessageSquare
                  className="h-3.5 w-3.5"
                  style={{ color: agentOrbColor || '#8B5CF6' }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="min-w-0 truncate">{activeConversation.title}</span>
                </h2>
                {isGroupAgentSelected && !isGroupParticipantChat && (
                  <OrchestrationModeIndicator
                    activeMode={activeConversationModeState?.activeMode}
                    forcedMode={activeConversationModeState?.forcedMode}
                    reasoning={activeConversationModeState?.reasoning}
                    accentColor={agentOrbColor || '#8B5CF6'}
                  />
                )}
                {isGroupParticipantChat && (
                  <p className="truncate text-[10px] text-white/45">
                    Einzelchat · {selectedCustomAgent?.name || 'Gruppe'}
                  </p>
                )}
                {isGroupAgentSelected && !isGroupParticipantChat && groupParticipantLabel && (
                  <p className="truncate text-[10px] text-white/45">
                    {groupParticipantLabel}
                  </p>
                )}
                {!isGroupAgentSelected && conversationParticipantLabel && (
                  <p className="truncate text-[10px] text-white/45">
                    {conversationParticipantLabel}
                  </p>
                )}
              </div>

              {isGroupAgentSelected && !isGroupParticipantChat && activeConversationId && (
                <select
                  value={activeConversationModeState?.forcedMode || ''}
                  onChange={(event) => {
                    const nextValue = event.target.value as OrchestrationMode | '';
                    handleConversationForcedModeChange(activeConversationId, nextValue || undefined);
                  }}
                  className="h-8 max-w-[180px] shrink-0 rounded-lg px-2 text-[11px] font-medium focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: textColor,
                    border: designStyle === 'brutal'
                      ? '2px solid #000'
                      : '1px solid rgba(255,255,255,0.1)',
                  }}
                  title="Gruppenmodus erzwingen"
                >
                  <option value="">Auto-Modus</option>
                  {Object.entries(ORCHESTRATION_MODES).map(([mode, config]) => (
                    <option key={mode} value={mode}>
                      {config.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Teilnehmer hinzufügen (nur normale Agent-Chats) */}
              {isNormalAgentChat && (
                <button
                  onClick={() => {
                    setShowParticipantsModal(true);
                    setParticipantsFormError('');
                    setConversationParticipants((activeConversation?.participantRoles || []).length > 0
                      ? activeConversation?.participantRoles || []
                      : [{ agentId: '', role: '' }]);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
                  title="Teilnehmer hinzufügen"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Memory-Button */}
              <button
                onClick={() => setIsMemoryPanelOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
                title="Agent Memory"
              >
                <Brain className="h-3.5 w-3.5" />
              </button>

              {/* Ausführungs-Status */}
              {isAgentExecuting && (
                <div 
                  className="flex items-center gap-1.5 px-2 py-1"
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    borderRadius: designStyle === 'brutal' ? '0.25rem' : '9999px',
                    border: designStyle === 'brutal' ? '1px solid #000' : 'none',
                  }}
                >
                  <Zap className="h-3 w-3 animate-pulse text-amber-400" />
                  <span className="text-xs text-amber-300">Führe Aktion aus...</span>
                </div>
              )}
            </div>

            {/* ----------------------------------------
                Nachrichten-Bereich
                ---------------------------------------- */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mx-auto max-w-3xl space-y-4">
                {isGroupAgentSelected && !isGroupParticipantChat && breakoutSessions.length > 0 && (
                  <BreakoutIndicator
                    sessions={breakoutSessions}
                    onOpenBreakout={handleOpenBreakout}
                  />
                )}
                {activeConversation.messages.length === 0 && !isLoading && !isAgentExecuting ? (
                  <SuggestedActions
                    suggestions={emptyChatSuggestions}
                    onSelect={(prompt) => {
                      void handleSendMessage(prompt);
                    }}
                    title="Schnell starten"
                  />
                ) : null}
                {activeConversation.messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onReply={handleReply}
                    onActionButton={handleActionButton}
                    onEdit={message.role === 'user' ? handleEditMessage : undefined}
                  />
                ))}

                {/* Loading-Indikator */}
                {(isLoading || isAgentExecuting) && !hasStreamingMessage && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                      {isAgentExecuting ? (
                        <Zap className="h-4 w-4 animate-pulse text-white" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      )}
                    </div>
                    <div className="min-w-[240px] max-w-[340px]">
                      <ThinkingBlock
                        isStreaming={true}
                        title={isAgentExecuting ? 'Führe Aktion aus...' : 'Antwort wird erstellt...'}
                        detailItems={isAgentExecuting ? ['Der Agent verarbeitet gerade einen Tool- oder Planungs-Schritt.'] : []}
                        accentColor={agentOrbColor}
                      />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* ----------------------------------------
                Erweiterte Chat-Bar
                Mit Modellauswahl, Kontext, Attachments, etc.
                ---------------------------------------- */}
            <AgentChatBar
              onSend={handleSendMessage}
              disabled={isLoading || isAgentExecuting}
              agentId={effectiveSelectedAgentId}
              messages={activeConversation.messages}
              modelId={agentLlmModel || 'openai/gpt-4o'}
              mentionOptions={mentionOptions}
              replyTo={replyToMessage}
              onCancelReply={handleCancelReply}
              editingMessageId={editingMessageId}
              editingDraft={editingDraft}
              onCancelEdit={handleCancelEdit}
              discussionActive={discussionActive}
              onStopDiscussion={handleStopDiscussion}
              selectedOrchestrationMode={
                isGroupAgentSelected && !isGroupParticipantChat
                  ? activeConversationModeState?.forcedMode
                  : undefined
              }
              onSelectOrchestrationMode={
                isGroupAgentSelected && !isGroupParticipantChat && activeConversationId
                  ? (mode) => handleConversationForcedModeChange(activeConversationId, mode)
                  : undefined
              }
            />
          </>
        ) : (
          /* ----------------------------------------
              Leere Ansicht
              ---------------------------------------- */
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <BotMessageSquare className="mx-auto h-12 w-12 mb-3 text-white/20" />
              <p className="text-white/60 text-sm">Keine Konversation ausgewählt</p>
              <button
                onClick={() => {
                  if (!isGroupAgentSelected) {
                    createConversation();
                  }
                }}
                disabled={isGroupAgentSelected}
                className="mt-4 px-4 py-2 text-sm text-white transition-colors"
                style={{
                  background: accentColor,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : 'none',
                }}
              >
                {isGroupAgentSelected ? 'Gruppenchat wird verwendet' : 'Neuen Chat erstellen'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Teilnehmer-Modal für normale Agent-Chats (Portal: zentriert, höchster z-Index) */}
      {participantsPortalMounted &&
        showParticipantsModal &&
        isNormalAgentChat &&
        activeConversation &&
        createPortal(
          <div
            className={`fixed inset-0 ${PARTICIPANTS_MODAL_OVERLAY_Z} flex items-center justify-center p-4`}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowParticipantsModal(false)}
              aria-hidden
            />
            <div
              className="relative z-[1] mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111827]/95 p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Chat-Teilnehmer</h3>
                <p className="text-[11px] text-white/45">Weitere Agenten für diese Konversation hinzufügen</p>
              </div>
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white/70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {conversationParticipants.map((participant, index) => (
                <div key={`chat-participant-${index}`} className="flex items-center gap-1.5">
                  <select
                    value={participant.agentId}
                    onChange={(event) => updateParticipantRow(index, { agentId: event.target.value })}
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
                    onChange={(event) => updateParticipantRow(index, { role: event.target.value })}
                    placeholder="Rolle"
                    className="w-28 rounded-lg border border-white/10 bg-white/10 px-2 py-1.5 text-[11px] text-white placeholder:text-white/40 focus:outline-none"
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

            <button
              onClick={addParticipantRow}
              className="mt-2 w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/75 hover:bg-white/20"
            >
              Teilnehmer hinzufügen
            </button>

            {participantsFormError && (
              <p className="mt-2 text-[11px] text-rose-300">{participantsFormError}</p>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveParticipants}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600"
              >
                Speichern
              </button>
            </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );

  if (!showShell) {
    return pageContent;
  }

  const effectiveShellMode = navigationScope === 'embedded' ? embeddedMode : undefined;
  const shellContent =
    navigationScope === 'embedded' && embeddedMode === 'tasks' ? (
      <AgentsSpatialTasksMode
        navigationScope="embedded"
        embeddedMode={embeddedMode}
        onEmbeddedModeChange={setEmbeddedMode}
      />
    ) : navigationScope === 'embedded' && embeddedMode === 'settings' ? (
      <AgentsSpatialSettingsMode
        navigationScope="embedded"
        embeddedMode={embeddedMode}
        onEmbeddedModeChange={setEmbeddedMode}
      />
    ) : (
      pageContent
    );

  return (
    <AgentsModuleShell
      navigationScope={navigationScope}
      embeddedMode={effectiveShellMode}
      onEmbeddedModeChange={navigationScope === 'embedded' ? setEmbeddedMode : undefined}
    >
      {shellContent}
    </AgentsModuleShell>
  );
}
