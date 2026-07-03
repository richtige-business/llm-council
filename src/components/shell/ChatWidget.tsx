// ============================================
// ChatWidget.tsx - Globale Chatbar mit Agent-Integration
// 
// Zweck: Ermöglicht Interaktion mit dem KI-Assistenten
//        und führt Aktionen in der App aus
//        NEU: Intelligence Orb das in die Chatbar fließt
// Verwendet von: Shell.tsx
// ============================================

'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, X, Home, Trash2, Menu, Settings, Bot, Plus, Paperclip } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAppStore } from '@/lib/store/app-store';
import { 
  useIsAgentExecuting, 
  useAgentConfigStore, 
  useAgentExecutor,
  DEFAULT_MODULE_COLORS,
  DEFAULT_AGENT_NAMES,
} from '@/lib/agent';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useThemeStyles } from '@/lib/theme';
import { IntelligenceOrb } from './IntelligenceOrb';
import { useBrowserSpeechToText } from '@/lib/speech/useBrowserSpeechToText';
import { HumanInTheLoopDialog } from '@/components/agent/HumanInTheLoopDialog';
import { AgentSettingsUnifiedModal } from '@/components/agent/AgentSettingsUnifiedModal';
import { useBaseStore } from '@/lib/bases/store';
import { useAgentStore } from '@/lib/agent/agent-store';
import type { AgentAction, AgentToolCall } from '@/lib/agent/types';
import { ChatMarkdown } from '@/modules/agents/components/ChatMarkdown';
import { ChatMessageActions } from '@/modules/agents/components/ChatMessageActions';
import { ThinkingBlock } from '@/modules/agents/components/ThinkingBlock';
import type { AttachedFile, AttachedImage } from '@/modules/agents/types';
import {
  COMBINED_ATTACHMENT_ACCEPT,
  formatAttachmentFileSize,
  readAttachmentsFromClipboardData,
  readAttachmentsFromFiles,
  revokeImagePreviewUrls,
  serializeChatMessageForModel,
  stripTransientAttachmentFieldsFromImages,
} from '@/modules/agents/lib/chat-attachments';
import { syncOrbTabToAgentsConversation } from '@/modules/agents/lib/orb-handoff';
import { getToolCallsSummaryLabel } from '@/modules/agents/lib/tool-call-formatters';

// --------------------------------------------
// Modul-ID aus Pfad extrahieren
// --------------------------------------------

function getModuleIdFromPath(pathname: string): string | null {
  // Dashboard (/) = master
  if (pathname === '/') return 'master';

  // Base-Dashboard: /bases/<baseId> => eigener Base-Agent
  const baseMatch = pathname.match(/^\/bases\/([^/]+)/);
  if (baseMatch?.[1]) {
    return `base:${baseMatch[1]}`;
  }
  
  // /calendar, /inbox, /browser, /chat, /todo-list, /training
  const moduleMatch = pathname.match(/^\/([^/]+)/);
  if (moduleMatch) {
    const moduleId = moduleMatch[1];
    if (moduleId === 'training') return 'lab';
    if (moduleId === 'browser' || moduleId === 'todo-list') return 'master';
    // Prüfe ob es ein bekanntes Modul ist
    if (['calendar', 'inbox', 'agents', 'chat', 'settings', 'library', 'lab'].includes(moduleId)) {
      return moduleId;
    }
  }
  
  return null;
}

// --------------------------------------------
// Mini-Orb Komponente - Kleine Version für die Chatbar
// --------------------------------------------

function MiniOrb({ accentColor, onClick }: { accentColor: string; onClick: () => void }) {
  return (
    <motion.button
      className="relative flex items-center justify-center cursor-pointer shrink-0"
      style={{
        width: 40,
        height: 40,
        background: 'transparent',
        border: 'none',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label="Chat schließen"
    >
      {/* Glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 48,
          height: 48,
          background: `radial-gradient(circle, ${accentColor}30 0%, transparent 70%)`,
          filter: 'blur(6px)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Rotierender Ring */}
      <motion.div
        className="absolute"
        style={{ width: 36, height: 36 }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeDasharray="6 8"
            opacity={0.6}
          />
        </svg>
      </motion.div>
      
      {/* Kern */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 18,
          height: 18,
          background: `radial-gradient(circle at 30% 30%, ${accentColor} 0%, ${accentColor}99 60%, ${accentColor}44 100%)`,
          boxShadow: `0 0 15px ${accentColor}aa, 0 0 30px ${accentColor}44`,
        }}
        animate={{
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Highlight */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 6,
          height: 6,
          background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
          marginTop: -5,
          marginLeft: -1,
        }}
      />
    </motion.button>
  );
}

// --------------------------------------------
// Verfügbare Chat-Module für Dropdown
// --------------------------------------------

const CHAT_MODULES = [
  { id: 'master', name: 'Intelligence', icon: 'Bot', color: '#0ea5e9' },
  { id: 'calendar', name: 'Kalender', icon: 'Calendar', color: '#10B981' },
  { id: 'inbox', name: 'Inbox', icon: 'Mail', color: '#3B82F6' },
  { id: 'lab', name: 'Lab', icon: 'FlaskConical', color: '#14B8A6' },
  { id: 'agents', name: 'Agents', icon: 'BotMessageSquare', color: '#8B5CF6' },
];

interface LiveChatActivity {
  id: string;
  kind: 'tool' | 'skill';
  label: string;
  status: 'running' | 'completed' | 'failed';
}

interface LiveAgentResponse {
  message: string;
  actions: AgentAction[];
  toolCalls?: AgentToolCall[];
}

interface LiveAgentEvent {
  type: 'status' | 'skill_start' | 'skill_end' | 'tool_start' | 'tool_end' | 'final' | 'error';
  id?: string;
  label?: string;
  status?: 'running' | 'completed' | 'failed';
  success?: boolean;
  message?: string;
  response?: LiveAgentResponse;
}

function formatExecutionLabel(name: string): string {
  return name
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildExecutionList(names: string[]): string {
  return Array.from(new Set(names.map(formatExecutionLabel))).join(', ');
}

function DynamicIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[name];
  return Icon ? <Icon className={className} style={style} /> : null;
}

export function ChatWidget() {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const chatOpen = useAppStore((state) => state.chatOpen);
  const setChatOpen = useAppStore((state) => state.setChatOpen);
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen);
  const userName = useAppStore((state) => state.userName);
  const hideIntelligenceOrb = useAppStore((state) => state.hideIntelligenceOrb);
  
  // Chat Tab System
  const chatTabs = useAppStore((state) => state.chatTabs);
  const activeChatTabId = useAppStore((state) => state.activeChatTabId);
  const activeChatModuleId = useAppStore((state) => state.activeChatModuleId);
  const openChatTab = useAppStore((state) => state.openChatTab);
  const closeChatTab = useAppStore((state) => state.closeChatTab);
  const setActiveChatTab = useAppStore((state) => state.setActiveChatTab);
  const setTabAgentsConversationId = useAppStore((state) => state.setTabAgentsConversationId);
  const switchToModuleAgent = useAppStore((state) => state.switchToModuleAgent);
  const addMessageToTab = useAppStore((state) => state.addMessageToTab);
  const updateMessageInTab = useAppStore((state) => state.updateMessageInTab);
  const truncateTabMessages = useAppStore((state) => state.truncateTabMessages);
  const clearTabMessages = useAppStore((state) => state.clearTabMessages);
  
  // Aktiver Tab und dessen Nachrichten
  const activeTab = chatTabs.find(t => t.id === activeChatTabId);
  const chatMessages = useMemo(() => activeTab?.messages ?? [], [activeTab]);
  const lastAssistantMessageId = [...chatMessages]
    .reverse()
    .find((message) => message.role === 'assistant')?.id;
  const hasStreamingOrbMessage = chatMessages.some((message) => message.role === 'assistant' && message.isStreaming);
  
  // Theme-Styles für dynamisches Design
  const { accentColor, designStyle, textColor, buttonTextColor } = useThemeStyles();
  
  // Agent Status und Executor
  const isAgentExecuting = useIsAgentExecuting();
  const setAgentExecuting = useAgentStore((state) => state.setExecuting);
  const { executeActions, pendingConfirmation, confirmAction } = useAgentExecutor();
  
  // Pfad für Orb-Farbe wenn Chat geschlossen
  const pathname = usePathname();
  const router = useRouter();
  
  // Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // --------------------------------------------
  // Modul-spezifische Configs (reaktiv auf Änderungen)
  // --------------------------------------------
  const agentConfigs = useAgentConfigStore((state) => state.configs);
  const bases = useBaseStore((state) => state.bases);
  
  // Aktives Modul für den Chat
  const activeModule = CHAT_MODULES.find((m) => m.id === activeChatModuleId);
  const activeBaseId = activeChatModuleId.startsWith('base:') ? activeChatModuleId.slice(5) : null;
  const activeBase = activeBaseId ? bases.find((base) => base.id === activeBaseId) : undefined;
  
  // Ermittle die Farbe basierend auf aktivem Chat-Modul
  const moduleOrbColor = agentConfigs[activeChatModuleId]?.orbColor
    || DEFAULT_MODULE_COLORS[activeChatModuleId]
    || activeBase?.color
    || activeModule?.color
    || accentColor;
  
  // Ermittle den Agent-Namen basierend auf aktivem Chat-Modul
  const agentDisplayName = (() => {
    const configuredName = agentConfigs[activeChatModuleId]?.agentName
      || DEFAULT_AGENT_NAMES[activeChatModuleId]
      || (activeBase ? `${activeBase.name} Agent` : undefined)
      || activeModule?.name;
    
    // Für Master-Agent: Falls Name "Intelligence" ist, zeige "[Username]'s Intelligence"
    if (activeChatModuleId === 'master') {
      if (configuredName === 'Intelligence' || !configuredName) {
        return `${userName}'s Intelligence`;
      }
      return configuredName;
    }
    
    return configuredName || activeModule?.name || 'Intelligence';
  })();
  
  // Für den Orb wenn Chat geschlossen (basierend auf Pfad)
  const currentModuleId = getModuleIdFromPath(pathname);

  // Helper: Modul-Info abrufen
  const getModuleInfo = (moduleId: string) => {
    const mod = CHAT_MODULES.find((m) => m.id === moduleId);
    const baseId = moduleId.startsWith('base:') ? moduleId.slice(5) : null;
    const baseEntry = baseId ? bases.find((base) => base.id === baseId) : undefined;
    const color = agentConfigs[moduleId]?.orbColor 
      || DEFAULT_MODULE_COLORS[moduleId]
      || baseEntry?.color
      || mod?.color 
      || accentColor;
    const name = agentConfigs[moduleId]?.agentName 
      || DEFAULT_AGENT_NAMES[moduleId] 
      || (baseEntry ? `${baseEntry.name} Agent` : undefined)
      || mod?.name 
      || moduleId;
    const icon = baseEntry ? 'Workflow' : mod?.icon || 'Bot';
    return { color, name, icon };
  };
  
  // --------------------------------------------
  // Lokale States
  // --------------------------------------------
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [orbPosition, setOrbPosition] = useState({ x: 0, y: 0 });
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isHoldingToTalk, setIsHoldingToTalk] = useState(false);
  const [showAgentSettings, setShowAgentSettings] = useState(false);
  const [liveActivities, setLiveActivities] = useState<LiveChatActivity[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const latestInputRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ bottom: 0, left: 0 });
  const finalBufferRef = useRef('');
  const interimBufferRef = useRef('');
  const orbPressHandledRef = useRef(false);
  const orbHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const orbIsHoldingRef = useRef(false);
  // --------------------------------------------
  // Drag-Handling: Clicks nach Drag unterdrücken
  // Verhindert, dass Drag automatisch den Chat öffnet
  // --------------------------------------------
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const actuallyDraggedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const appendComposeAttachments = useCallback((next: { images: AttachedImage[]; files: AttachedFile[] }) => {
    if (next.images.length > 0) {
      setAttachedImages((current) => [...current, ...next.images]);
    }
    if (next.files.length > 0) {
      setAttachedFiles((current) => [...current, ...next.files]);
    }
  }, []);

  const clearComposeAttachments = useCallback(() => {
    revokeImagePreviewUrls(attachedImages);
    setAttachedImages([]);
    setAttachedFiles([]);
  }, [attachedImages]);

  // Master-Tab muss IMMER existieren (ohne Chat zu öffnen!)
  const ensureChatTabExists = useAppStore((state) => state.ensureChatTabExists);
  useEffect(() => {
    const masterTab = chatTabs.find(t => t.moduleId === 'master');
    if (!masterTab) {
      // Master-Tab existiert nicht -> erstellen (öffnet Chat NICHT)
      ensureChatTabExists('master');
    }
  }, [chatTabs, ensureChatTabExists]);
  
  // --------------------------------------------
  // Bei Modul-Wechsel: Automatisch zum entsprechenden Agent wechseln
  // Das sorgt dafür, dass der Orb IMMER die Farbe des aktuellen Moduls zeigt
  // und beim Öffnen des Chats der richtige Agent aktiv ist
  // Auch nach Zustand-Hydration (localStorage) wird der Agent korrigiert
  // --------------------------------------------
  useEffect(() => {
    // Modul-ID vom aktuellen Pfad ermitteln
    const pathModuleId = currentModuleId || 'master';
    
    // Nur wechseln wenn sich das Modul geändert hat
    if (activeChatModuleId !== pathModuleId) {
      switchToModuleAgent(pathModuleId);
    }
  }, [currentModuleId, activeChatModuleId, switchToModuleAgent]); // Auch bei Hydration-Änderungen

  const activeSettingsModuleId = activeChatModuleId || currentModuleId || 'master';
  const activeSettingsModuleInfo = getModuleInfo(activeSettingsModuleId);
  const liveToolLabels = useMemo(
    () => buildExecutionList(liveActivities.filter((activity) => activity.kind === 'tool').map((activity) => activity.label)),
    [liveActivities]
  );
  const liveSkillLabels = useMemo(
    () => buildExecutionList(liveActivities.filter((activity) => activity.kind === 'skill').map((activity) => activity.label)),
    [liveActivities]
  );
  // Auto-scroll bei neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);
  
  // Letzten Input-Stand für STT-Ende speichern
  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  // Auto-focus auf Input wenn Chat geöffnet wird
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [chatOpen]);

  // Cleanup für Orb Hold Timer
  useEffect(() => {
    return () => {
      if (orbHoldTimerRef.current) {
        clearTimeout(orbHoldTimerRef.current);
      }
    };
  }, []);

  // ----------------------------------------
  // Live-Aktivitaeten im Orbchat pflegen
  // Zeigt Tool-/Skill-Nutzung waehrend der Anfrage inline an.
  // ----------------------------------------
  const upsertLiveActivity = useCallback((activity: LiveChatActivity) => {
    setLiveActivities((current) => {
      const filtered = current.filter((entry) => entry.id !== activity.id);
      return [...filtered, activity];
    });
  }, []);

  const clearLiveActivities = useCallback(() => {
    setLiveActivities([]);
  }, []);

  // ----------------------------------------
  // Kontext fuer den Orb-Chat aufbereiten
  // Beschraenkt den Verlauf auf die letzten 10 Turns.
  // ----------------------------------------
  const buildOrbContextMessages = useCallback((
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      images?: AttachedImage[];
      files?: AttachedFile[];
    }>
  ) => messages
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: serializeChatMessageForModel(message),
    })), []);

  const sendOrbAgentRequest = useCallback(async (
    options: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      moduleId?: string;
    }
  ): Promise<LiveAgentResponse> => {
    setAgentExecuting(true);

    try {
      const response = await fetch('/api/agent/live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: options.messages,
          moduleId: options.moduleId,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorMessage = errorBody.details || errorBody.error || `API Fehler (${response.status})`;
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      }

      if (!response.body) {
        throw new Error('Live-Stream nicht verfuegbar');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResponse: LiveAgentResponse | null = null;

      const applyEvent = (event: LiveAgentEvent) => {
        switch (event.type) {
          case 'status':
            break;
          case 'skill_start':
            upsertLiveActivity({
              id: event.id || `skill:${event.label || 'skill'}`,
              kind: 'skill',
              label: event.label || 'Skill',
              status: 'running',
            });
            break;
          case 'skill_end':
            upsertLiveActivity({
              id: event.id || `skill:${event.label || 'skill'}`,
              kind: 'skill',
              label: event.label || 'Skill',
              status: event.success ? 'completed' : 'failed',
            });
            break;
          case 'tool_start':
            upsertLiveActivity({
              id: event.id || `tool:${event.label || 'tool'}`,
              kind: 'tool',
              label: event.label || 'Tool',
              status: 'running',
            });
            break;
          case 'tool_end':
            upsertLiveActivity({
              id: event.id || `tool:${event.label || 'tool'}`,
              kind: 'tool',
              label: event.label || 'Tool',
              status: event.success ? 'completed' : 'failed',
            });
            break;
          case 'final':
            finalResponse = event.response || null;
            break;
          case 'error':
            throw new Error(event.message || 'Unbekannter Live-Fehler');
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundaryIndex = buffer.indexOf('\n\n');
        while (boundaryIndex !== -1) {
          const rawEvent = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);

          const dataLine = rawEvent
            .split('\n')
            .find((line) => line.startsWith('data:'));

          if (dataLine) {
            const payload = JSON.parse(dataLine.slice(5).trim()) as LiveAgentEvent;
            applyEvent(payload);
          }

          boundaryIndex = buffer.indexOf('\n\n');
        }
      }

      if (!finalResponse) {
        throw new Error('Die Live-Antwort wurde nicht abgeschlossen.');
      }

      const completedResponse = finalResponse as LiveAgentResponse;

      if (completedResponse.actions.length > 0) {
        await executeActions(completedResponse.actions);
      }

      return completedResponse;
    } finally {
      setAgentExecuting(false);
    }
  }, [executeActions, setAgentExecuting, upsertLiveActivity]);

  // ----------------------------------------
  // Gemeinsamer Antwortpfad fuer den Orb-Chat
  // Wird von normalem Senden, Editieren und
  // Regenerate gemeinsam verwendet.
  // ----------------------------------------
  const requestOrbReply = useCallback(async (
    tabId: string,
    messageHistory: Array<{
      role: 'user' | 'assistant';
      content: string;
      images?: AttachedImage[];
      files?: AttachedFile[];
    }>
  ) => {
    setIsTyping(true);
    const placeholderId = crypto.randomUUID();

    addMessageToTab(tabId, {
      id: placeholderId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    });

    try {
      const tabModuleId = chatTabs.find((tab) => tab.id === tabId)?.moduleId || activeChatModuleId;
      console.log('📤 Sende Live-Agent-Request über /api/agent/live...');
      const { message, actions, toolCalls } = await sendOrbAgentRequest({
        messages: buildOrbContextMessages(messageHistory),
        moduleId: tabModuleId !== 'master' ? tabModuleId : undefined,
      });
      console.log('📥 Agent-Response erhalten:', {
        messageLength: message?.length,
        actionsCount: actions?.length,
        toolCallsCount: toolCalls?.length,
      });

      updateMessageInTab(tabId, placeholderId, {
        content: message,
        toolCalls,
        isStreaming: false,
      });
    } catch (error) {
      console.error('Chat Fehler:', error);
      updateMessageInTab(tabId, placeholderId, {
        content: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
        isStreaming: false,
      });
    } finally {
      clearLiveActivities();
      setIsTyping(false);
    }
  }, [activeChatModuleId, addMessageToTab, buildOrbContextMessages, chatTabs, clearLiveActivities, sendOrbAgentRequest, updateMessageInTab]);

  // ----------------------------------------
  // Handler: Nachricht senden
  // Verwendet aktivem Chat-Tab für modul-spezifische Anfragen
  // Nutzt sendAgentRequest um Actions auszuführen!
  // ----------------------------------------
  const handleSend = async (overrideMessage?: string) => {
    const userMessage = (overrideMessage ?? input).trim();
    const sanitizedImages = stripTransientAttachmentFieldsFromImages(attachedImages);
    const hasAttachments = Boolean(sanitizedImages?.length || attachedFiles.length);
    if ((!userMessage && !hasAttachments) || !activeChatTabId) return;

    setInput('');
    if (editingMessageId) {
      const editIndex = chatMessages.findIndex((message) => message.id === editingMessageId);

      if (editIndex !== -1) {
        const preservedMessages = chatMessages.slice(0, editIndex);
        truncateTabMessages(activeChatTabId, editIndex);
        setEditingMessageId(null);

        addMessageToTab(activeChatTabId, {
          role: 'user',
          content: userMessage,
          images: sanitizedImages,
          files: attachedFiles.length > 0 ? attachedFiles : undefined,
        });
        clearComposeAttachments();

        await requestOrbReply(activeChatTabId, [
          ...preservedMessages,
          {
            role: 'user',
            content: userMessage,
            images: sanitizedImages,
            files: attachedFiles.length > 0 ? attachedFiles : undefined,
          },
        ]);
        return;
      }

      setEditingMessageId(null);
    }

    addMessageToTab(activeChatTabId, {
      role: 'user',
      content: userMessage,
      images: sanitizedImages,
      files: attachedFiles.length > 0 ? attachedFiles : undefined,
    });
    clearComposeAttachments();

    await requestOrbReply(activeChatTabId, [
      ...chatMessages,
      {
        role: 'user',
        content: userMessage,
        images: sanitizedImages,
        files: attachedFiles.length > 0 ? attachedFiles : undefined,
      },
    ]);
  };

  // ----------------------------------------
  // User-Nachricht bearbeiten
  // Laedt den Text in den Orb-Input und kuerzt
  // beim erneuten Senden den Folgekontext.
  // ----------------------------------------
  const handleEditOrbMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setInput(content);
    setChatOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ----------------------------------------
  // Editieren abbrechen
  // Stellt den normalen Compose-Zustand wieder her.
  // ----------------------------------------
  const handleCancelOrbEdit = () => {
    setEditingMessageId(null);
    setInput('');
  };

  // ----------------------------------------
  // Letzte Antwort neu generieren
  // Entfernt die aktuelle Antwort und fragt den
  // Agenten mit demselben Verlauf erneut.
  // ----------------------------------------
  const handleRegenerateOrbMessage = async (messageId: string) => {
    if (!activeChatTabId) return;

    const messageIndex = chatMessages.findIndex((message) => message.id === messageId);
    if (messageIndex === -1) return;

    truncateTabMessages(activeChatTabId, messageIndex);
    await requestOrbReply(activeChatTabId, chatMessages.slice(0, messageIndex));
  };

  // ----------------------------------------
  // Nachricht kopieren
  // Speichert kurz die kopierte Nachricht fuer
  // visuelles Feedback in der Action-Leiste.
  // ----------------------------------------
  const handleCopyOrbMessage = async (content: string) => {
    if (!content || typeof window === 'undefined' || !navigator?.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(content);
  };

  const handleOrbFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    void readAttachmentsFromFiles(files).then(appendComposeAttachments);
  }, [appendComposeAttachments]);

  const handleOrbPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const clipboardData = e.clipboardData;
    const hasFilePayload = Array.from(clipboardData.items || []).some((item) => item.kind === 'file')
      || clipboardData.files.length > 0;

    if (!hasFilePayload) {
      return;
    }

    e.preventDefault();
    void readAttachmentsFromClipboardData(clipboardData).then((next) => {
      if (next.images.length > 0 || next.files.length > 0) {
        appendComposeAttachments(next);
      }
    });
  }, [appendComposeAttachments]);

  const handleRemoveOrbImage = useCallback((imageId: string) => {
    setAttachedImages((current) => {
      const image = current.find((entry) => entry.id === imageId);
      if (image?.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return current.filter((entry) => entry.id !== imageId);
    });
  }, []);

  const handleRemoveOrbFile = useCallback((fileId: string) => {
    setAttachedFiles((current) => current.filter((file) => file.id !== fileId));
  }, []);

  const handleOpenInAgentsChat = useCallback(() => {
    if (!activeTab) {
      return;
    }

    const conversationId = syncOrbTabToAgentsConversation({
      moduleId: activeTab.moduleId,
      messages: activeTab.messages,
      linkedConversationId: activeTab.agentsConversationId,
    });

    setTabAgentsConversationId(activeTab.id, conversationId);
    setChatOpen(false);
    setSidebarOpen(false);
    router.push('/agents');
  }, [activeTab, router, setChatOpen, setSidebarOpen, setTabAgentsConversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && editingMessageId) {
      handleCancelOrbEdit();
      return;
    }
    if (e.key === 'Escape') {
      setChatOpen(false);
    }
  };

  // Prüfen ob wir nicht auf dem Dashboard sind
  const isDashboard = pathname === '/';
  const isChatModule = pathname === '/agents' || pathname.startsWith('/agents/') || pathname === '/chat' || pathname.startsWith('/chat/');

  // --------------------------------------------
  // Speech-to-Text (Browser STT)
  // --------------------------------------------

  const stt = useBrowserSpeechToText({
    lang: 'de-DE',
    onPartial: (text) => {
      setSpeechError(null);
      const next = `${finalBufferRef.current} ${text}`.trim();
      interimBufferRef.current = text;
      setInput(next);
    },
    onFinal: (text) => {
      setSpeechError(null);
      const next = `${finalBufferRef.current} ${text}`.trim();
      finalBufferRef.current = next;
      interimBufferRef.current = '';
      setInput(next);
    },
    onError: (error) => {
      if (error === 'no-speech' || error === 'aborted') {
        setSpeechError(null);
        return;
      }
      setSpeechError(error);
    },
    onEnd: () => {
      const finalMessage =
        finalBufferRef.current.trim() ||
        interimBufferRef.current.trim() ||
        latestInputRef.current.trim();
      finalBufferRef.current = '';
      interimBufferRef.current = '';
      if (finalMessage) {
        if (!chatOpen) {
          setChatOpen(true);
        }
        setSpeechError(null);
        handleSend(finalMessage);
      }
    },
  });

  const isListening = stt.state === 'listening';
  const canUseMic = stt.supported
    && !isTyping
    && !isAgentExecuting
    && attachedImages.length === 0
    && attachedFiles.length === 0;

  // --------------------------------------------
  // Push-to-Talk + Toggle
  // Hold-to-talk per Press/Release, Klick = Toggle
  // --------------------------------------------

  const startSpeechCapture = useCallback(() => {
    if (!canUseMic || input.trim()) return;
    if (!stt.supported) {
      setSpeechError('speech_not_supported');
      return;
    }
    setSpeechError(null);
    finalBufferRef.current = '';
    interimBufferRef.current = '';
    setInput('');
    stt.start();
  }, [canUseMic, input, stt]);

  const stopSpeechCapture = useCallback(() => {
    if (!isListening) return;
    stt.stop();
  }, [isListening, stt]);

  const handleMicToggle = () => {
    if (isListening) {
      stopSpeechCapture();
      return;
    }
    startSpeechCapture();
  };

  // Orb Push-to-Talk: Hold (200ms+) = Aufnahme, kurzer Klick = Chat öffnen
  const handleOrbPressStart = () => {
    // Starte Timer: nach 200ms wird Push-to-Talk aktiviert
    orbHoldTimerRef.current = setTimeout(() => {
      orbIsHoldingRef.current = true;
      orbPressHandledRef.current = true;
      setIsHoldingToTalk(true);
      setChatOpen(true);
      startSpeechCapture();
    }, 200);
  };

  const handleOrbPressEnd = () => {
    // Timer abbrechen falls noch nicht abgelaufen
    if (orbHoldTimerRef.current) {
      clearTimeout(orbHoldTimerRef.current);
      orbHoldTimerRef.current = null;
    }
    
    // Wenn wir im Push-to-Talk Modus waren → stoppen
    if (orbIsHoldingRef.current) {
      orbIsHoldingRef.current = false;
      setIsHoldingToTalk(false);
      stopSpeechCapture();
    }
  };
  
  // --------------------------------------------
  // Helper: Push-to-Talk abbrechen (z.B. beim Drag)
  // --------------------------------------------
  const cancelOrbHold = useCallback(() => {
    if (orbHoldTimerRef.current) {
      clearTimeout(orbHoldTimerRef.current);
      orbHoldTimerRef.current = null;
    }
    if (orbIsHoldingRef.current) {
      orbIsHoldingRef.current = false;
      setIsHoldingToTalk(false);
      stopSpeechCapture();
    }
  }, [stopSpeechCapture]);

  const finishOrbDrag = useCallback((preserveClickBlocker: boolean) => {
    setIsDragging(false);
    cancelOrbHold();

    if (suppressClickTimerRef.current) {
      clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = null;
    }

    if (preserveClickBlocker || actuallyDraggedRef.current) {
      suppressClickRef.current = true;
      suppressClickTimerRef.current = setTimeout(() => {
        suppressClickRef.current = false;
        orbPressHandledRef.current = false;
        actuallyDraggedRef.current = false;
        suppressClickTimerRef.current = null;
      }, 200);
      return;
    }

    suppressClickRef.current = false;
    orbPressHandledRef.current = false;
    actuallyDraggedRef.current = false;
  }, [cancelOrbHold]);

  // Fallback für "hängende" Drag-States:
  // Wenn Pointer-Up außerhalb des Fensters passiert, feuert onDragEnd teils nicht zuverlässig.
  useEffect(() => {
    const forceDrop = () => {
      if (!isDragging) return;
      finishOrbDrag(true);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        forceDrop();
      }
    };

    window.addEventListener('pointerup', forceDrop);
    window.addEventListener('pointercancel', forceDrop);
    window.addEventListener('mouseup', forceDrop);
    window.addEventListener('touchend', forceDrop);
    window.addEventListener('blur', forceDrop);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pointerup', forceDrop);
      window.removeEventListener('pointercancel', forceDrop);
      window.removeEventListener('mouseup', forceDrop);
      window.removeEventListener('touchend', forceDrop);
      window.removeEventListener('blur', forceDrop);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isDragging, finishOrbDrag]);

  // --------------------------------------------
  // Dimensionen
  // --------------------------------------------
  const chatWidth = 500;
  const chatHeight = 480;

  // Position zurücksetzen wenn Chat geschlossen wird
  // WICHTIG: Dieser Hook muss VOR jedem early return stehen!
  useEffect(() => {
    if (!chatOpen) {
      // Beim Schließen: Position zurück auf Ursprung
      setOrbPosition({ x: 0, y: 0 });
    }
  }, [chatOpen]);
  
  // Position zurücksetzen bei Modulwechsel
  useEffect(() => {
    setOrbPosition({ x: 0, y: 0 });
  }, [pathname]);
  
  // Cleanup für Drag-Click-Blocker
  useEffect(() => {
    return () => {
      if (suppressClickTimerRef.current) {
        clearTimeout(suppressClickTimerRef.current);
      }
    };
  }, []);
  
  // Early return NACH allen Hooks
  // Verstecke ChatWidget wenn im Chat-Modul oder wenn Intelligence Orb ausgeblendet werden soll
  if (isChatModule || hideIntelligenceOrb) {
    return null;
  }

  return (
    <>
      {/* ----------------------------------------
          Human in the Loop Bestätigungs-Dialog
          Wird angezeigt wenn eine Action Bestätigung braucht
          ---------------------------------------- */}
      {pendingConfirmation && (
        <HumanInTheLoopDialog
          action={pendingConfirmation.action}
          onConfirm={() => confirmAction(true)}
          onReject={() => confirmAction(false)}
        />
      )}
      
      {/* Drag Constraints - Ganzer Viewport */}
      <div 
        ref={constraintsRef} 
        className="fixed inset-0 pointer-events-none z-40"
      />
      
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-end gap-3" style={{ pointerEvents: 'auto' }}>
      {/* ----------------------------------------
          Home/Menu Button - Links außerhalb
          Nur sichtbar wenn Chat offen
          ---------------------------------------- */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.1 }}
          >
            {isDashboard ? (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex h-[48px] w-[48px] items-center justify-center transition-all hover:scale-110 hover:brightness-110"
                style={{
                  background: accentColor,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '9999px',
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  boxShadow: designStyle === 'brutal' 
                    ? '3px 3px 0 #000' 
                    : `0 4px 15px ${accentColor}40`,
                }}
                title="Module öffnen"
              >
                <Menu className="h-5 w-5" style={{ color: buttonTextColor }} />
              </button>
            ) : (
              <Link
                href="/"
                className="flex h-[48px] w-[48px] items-center justify-center transition-all hover:scale-110 hover:brightness-110"
                style={{
                  background: accentColor,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '9999px',
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  boxShadow: designStyle === 'brutal' 
                    ? '3px 3px 0 #000' 
                    : `0 4px 15px ${accentColor}40`,
                }}
                title="Zurück zum Dashboard"
              >
                <Home className="h-5 w-5" style={{ color: buttonTextColor }} />
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------
          Haupt-Container: Orb oder Chat
          WICHTIG: pointer-events explizit aktivieren
          ---------------------------------------- */}
      <div className="relative" style={{ pointerEvents: 'auto' }}>
        <AnimatePresence>
          {!chatOpen ? (
            // ========================================
            // GESCHLOSSEN: Großes Intelligence Orb (Draggable)
            // ========================================
            <motion.div
              key="orb-closed"
              initial={{ scale: 0.8, opacity: 0, x: 0, y: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                x: orbPosition.x,
                y: orbPosition.y,
              }}
              exit={{ 
                scale: 0.3,
                opacity: 0,
                transition: { duration: 0.2 }
              }}
              drag
              dragListener={!isHoldingToTalk}
              dragConstraints={constraintsRef}
              dragElastic={0.1}
              dragMomentum={false}
              onPointerUp={() => {
                // PointerUp dient als "Click" auf dem Orb-Container
                // Nur öffnen wenn kein Drag stattgefunden hat
                if (suppressClickRef.current || actuallyDraggedRef.current || isDragging) {
                  // Wichtig: Nicht preventDefault/stopPropagation auf pointerup,
                  // sonst kann Framer den Drag-End-Zyklus verlieren.
                  return;
                }
                // Wenn Push-to-Talk aktiv war, nicht öffnen
                if (orbPressHandledRef.current) {
                  orbPressHandledRef.current = false;
                  return;
                }
                // Chat öffnen mit dem Agent des aktuellen Moduls
                // Auf dem Dashboard (/) = 'master' (Intelligence Agent)
                openChatTab(currentModuleId || 'master');
              }}
              onLostPointerCapture={() => {
                if (isDragging) {
                  finishOrbDrag(true);
                }
              }}
              onDragStart={(_, info) => {
                setIsDragging(true);
                // Speichere Startposition
                dragStartPosRef.current = { x: info.point.x, y: info.point.y };
                actuallyDraggedRef.current = false;
              }}
              onDrag={(_, info) => {
                // Prüfe ob mehr als 5px bewegt wurde (echtes Dragging)
                const dx = Math.abs(info.point.x - dragStartPosRef.current.x);
                const dy = Math.abs(info.point.y - dragStartPosRef.current.y);
                if (dx > 5 || dy > 5) {
                  actuallyDraggedRef.current = true;
                  // Push-to-Talk abbrechen, sobald wirklich gedraggt wird
                  cancelOrbHold();
                  // Klick nach Drag komplett unterdrücken
                  orbPressHandledRef.current = true;
                  suppressClickRef.current = true;
                }
              }}
              onDragEnd={(_, info) => {
                // Nur Position speichern wenn wirklich gedraggt wurde
                if (actuallyDraggedRef.current) {
                  setOrbPosition(prev => ({
                    x: prev.x + info.offset.x,
                    y: prev.y + info.offset.y,
                  }));
                }
                finishOrbDrag(actuallyDraggedRef.current);
              }}
              whileDrag={{ scale: 1.05, cursor: 'grabbing' }}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
                <IntelligenceOrb
                  isOpen={chatOpen}
                  isHovered={isHovered && !isDragging}
                  isListening={isListening}
                  onClick={() => {}}
                  onHoverStart={() => !isDragging && setIsHovered(true)}
                  onHoverEnd={() => setIsHovered(false)}
                  onPressStart={handleOrbPressStart}
                  onPressEnd={handleOrbPressEnd}
                  moduleColor={moduleOrbColor}
                />
            </motion.div>
          ) : (
            // ========================================
            // OFFEN: Chat-Panel mit Mini-Orb
            // ========================================
            <motion.div
              key="chat-open"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative overflow-hidden flex flex-col"
              style={{
                width: chatWidth,
                height: chatHeight,
                borderRadius: designStyle === 'brutal' ? 12 : 24,
                background: 'rgba(20, 20, 28, 0.92)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: designStyle === 'brutal'
                  ? '6px 6px 0 #000'
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'auto',
              }}
            >
              {/* ----------------------------------------
                  Header: Agent-Name oben, dann Tabs + Dropdown
                  pointer-events aktiv für Tabs und Buttons
                  ---------------------------------------- */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="shrink-0"
                style={{ pointerEvents: 'auto' }}
              >
                {/* Oberste Zeile: Agent Name + Close */}
                <div 
                  className="flex items-center justify-between px-3 pt-3 pb-2"
                  style={{ 
                    background: activeTab ? `${moduleOrbColor}10` : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MiniOrb accentColor={activeTab ? moduleOrbColor : accentColor} onClick={() => {}} />
                    <span className="text-sm font-medium" style={{ color: activeTab ? moduleOrbColor : textColor }}>
                      {activeTab ? agentDisplayName : 'Chat'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {chatMessages.length > 0 && activeChatTabId && (
                      <button
                        onClick={() => clearTabMessages(activeChatTabId)}
                        className="flex h-7 w-7 items-center justify-center transition-all hover:bg-red-500/20 rounded-full"
                        style={{ color: textColor, opacity: 0.5 }}
                        title="Chat-Verlauf leeren"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setChatOpen(false)}
                      className="flex h-7 w-7 items-center justify-center transition-all hover:bg-white/10 rounded-full"
                      style={{ color: textColor, opacity: 0.7 }}
                      title="Chat schließen"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Zweite Zeile: Plus-Button + Tabs */}
                <div 
                  className="flex items-center gap-1 px-2 py-2"
                  style={{ flexDirection: 'row', flexWrap: 'nowrap', overflowX: 'auto' }}
                >
                  {/* Plus-Button für Dropdown */}
                  <button
                    ref={plusButtonRef}
                    onClick={() => {
                      // Position vom Button berechnen
                      if (plusButtonRef.current) {
                        const rect = plusButtonRef.current.getBoundingClientRect();
                        setDropdownPosition({
                          bottom: window.innerHeight - rect.top + 8,
                          left: rect.left + rect.width / 2,
                        });
                      }
                      setIsDropdownOpen(true);
                    }}
                    className="flex items-center justify-center h-7 w-7 rounded-lg transition-colors hover:bg-white/15 shrink-0"
                    title="Agent hinzufügen"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    <Plus className="h-4 w-4" style={{ color: textColor }} />
                  </button>
                  
                  {/* Chat-Tabs - Master immer zuerst */}
                  {[...chatTabs].sort((a, b) => {
                    if (a.moduleId === 'master') return -1;
                    if (b.moduleId === 'master') return 1;
                    return 0;
                  }).map((tab) => {
                    const info = getModuleInfo(tab.moduleId);
                    const isActive = tab.id === activeChatTabId;
                    const displayName = tab.moduleId === 'master'
                      ? `${userName}'s Intelligence`
                      : info.name;
                    
                    return (
                      <div
                        key={tab.id}
                        onClick={() => setActiveChatTab(tab.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all group ${
                          isActive ? 'bg-white/15' : 'bg-white/05 hover:bg-white/10'
                        }`}
                        style={{
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          borderBottom: isActive ? `2px solid ${info.color}` : '2px solid transparent',
                        }}
                      >
                        <DynamicIcon 
                          name={info.icon} 
                          className="h-3.5 w-3.5 shrink-0" 
                          style={{ color: isActive ? info.color : 'rgba(255,255,255,0.5)' }} 
                        />
                        <span 
                          className="text-xs font-medium max-w-[70px] truncate"
                          style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.6)' }}
                        >
                          {displayName}
                        </span>
                        
                        {/* Tab schließen - nicht für Master-Tab */}
                        {tab.moduleId !== 'master' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeChatTab(tab.id);
                            }}
                            className="h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all"
                          >
                            <X className="h-2.5 w-2.5 text-white/60" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
              
              {/* ----------------------------------------
                  Messages Area - pointer-events aktiv für Interaktion
                  ---------------------------------------- */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex-1 overflow-y-auto px-4 pb-4"
                style={{ pointerEvents: 'auto' }}
              >
                {!activeTab ? (
                  // Kein Tab ausgewählt
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Bot className="w-12 h-12 mb-3" style={{ color: accentColor, opacity: 0.5 }} />
                    <p className="text-sm mb-1" style={{ color: textColor, opacity: 0.7 }}>
                      Wähle einen Agent aus
                    </p>
                    <p className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
                      Klicke auf &quot;Agent hinzufügen&quot; oben
                    </p>
                  </div>
                ) : chatMessages.length === 0 ? (
                  // Tab ausgewählt aber keine Nachrichten
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <motion.div 
                      className="w-20 h-20 rounded-full mb-4 flex items-center justify-center"
                      style={{ 
                        background: `${moduleOrbColor}15`,
                        boxShadow: `0 0 40px ${moduleOrbColor}20`,
                      }}
                      animate={{
                        boxShadow: [
                          `0 0 40px ${moduleOrbColor}20`,
                          `0 0 60px ${moduleOrbColor}35`,
                          `0 0 40px ${moduleOrbColor}20`,
                        ],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      <div 
                        className="w-10 h-10 rounded-full"
                        style={{ 
                          background: `radial-gradient(circle, ${moduleOrbColor} 0%, ${moduleOrbColor}60 60%, transparent 100%)`,
                        }}
                      />
                    </motion.div>
                    <p 
                      className="text-sm mb-1"
                      style={{ color: textColor, opacity: 0.8 }}
                    >
                      Wie kann ich dir helfen?
                    </p>
                    <p 
                      className="text-xs"
                      style={{ color: textColor, opacity: 0.5 }}
                    >
                      Frag mich etwas oder gib einen Befehl
                    </p>
                  </div>
                ) : (
                  // Nachrichten
                  <div className="space-y-3 py-2">
                    {chatMessages.slice(-10).map((message) => {
                      const isAssistant = message.role === 'assistant';
                      return (
                        <div
                          key={message.id}
                          className={`group/msg group/orb-msg flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                          {isAssistant && message.toolCalls && message.toolCalls.length > 0 && (
                            <div className="mb-2 max-w-[85%]">
                              <button
                                type="button"
                                onClick={handleOpenInAgentsChat}
                                className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/15"
                              >
                                {getToolCallsSummaryLabel(message.toolCalls)}
                              </button>
                            </div>
                          )}

                          {message.images && message.images.length > 0 && (
                            <div className="mb-2 flex max-w-[85%] flex-wrap gap-2">
                              {message.images.map((image) => (
                                <img
                                  key={image.id}
                                  src={image.previewUrl || `data:${image.type};base64,${image.base64}`}
                                  alt={image.name}
                                  className="h-20 max-w-[160px] rounded-xl border border-white/10 object-cover"
                                />
                              ))}
                            </div>
                          )}

                          {message.files && message.files.length > 0 && (
                            <div className="mb-2 flex max-w-[85%] flex-wrap gap-1.5">
                              {message.files.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-2 py-1"
                                >
                                  <Paperclip className="h-3 w-3 text-white/50" />
                                  <span className="max-w-[150px] truncate text-[10px] text-white/75">{file.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="relative max-w-[85%]">
                            <ChatMessageActions
                              align={message.role === 'user' ? 'right' : 'left'}
                              onCopy={message.content ? () => handleCopyOrbMessage(message.content) : undefined}
                              onEdit={message.role === 'user' ? () => handleEditOrbMessage(message.id, message.content) : undefined}
                              onRegenerate={
                                isAssistant && message.id === lastAssistantMessageId
                                  ? () => handleRegenerateOrbMessage(message.id)
                                  : undefined
                              }
                            />

                            <div
                              className="px-4 py-2.5"
                              style={{
                                background: message.role === 'user' ? moduleOrbColor : 'rgba(255, 255, 255, 0.9)',
                                color: message.role === 'user' ? '#ffffff' : '#1f2937',
                                borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
                                border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                                boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
                              }}
                            >
                              {isAssistant && message.reasoning && (
                                <div className="mb-2">
                                  <ThinkingBlock
                                    isStreaming={false}
                                    title="Gedankengang"
                                    content={message.reasoning}
                                    accentColor={moduleOrbColor}
                                    compact={true}
                                    variant="light"
                                  />
                                </div>
                              )}

                              {message.role === 'user' ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                              ) : message.isStreaming ? (
                                <ThinkingBlock
                                  isStreaming={true}
                                  detailItems={[
                                    ...(liveToolLabels ? [`Tools: ${liveToolLabels}`] : []),
                                    ...(liveSkillLabels ? [`Skills: ${liveSkillLabels}`] : []),
                                  ]}
                                  accentColor={moduleOrbColor}
                                  compact={true}
                                  variant="light"
                                />
                              ) : (
                                <ChatMarkdown
                                  content={message.content}
                                  variant="light"
                                  compact={true}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Typing/Executing Indicator */}
                    {(isTyping || isAgentExecuting) && !hasStreamingOrbMessage && (
                      <div className="flex justify-start">
                        <div className="w-[min(100%,320px)]">
                          <ThinkingBlock
                            isStreaming={true}
                            title={isAgentExecuting ? 'Führe Aktion aus...' : undefined}
                            detailItems={[
                              ...(liveToolLabels ? [`Tools: ${liveToolLabels}`] : []),
                              ...(liveSkillLabels ? [`Skills: ${liveSkillLabels}`] : []),
                            ]}
                            accentColor={moduleOrbColor}
                            variant="light"
                          />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </motion.div>
              
              {/* ----------------------------------------
                  Input Area - WICHTIG: pointer-events explizit aktiviert
                  ---------------------------------------- */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="px-4 pb-4 shrink-0"
                style={{ pointerEvents: 'auto' }}
              >
                {editingMessageId && (
                  <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2">
                    <span className="text-[11px] font-medium text-amber-100/90">
                      Du bearbeitest eine gesendete Nachricht
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelOrbEdit}
                      className="rounded-full px-2 py-1 text-[10px] text-amber-100/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}

                {(attachedImages.length > 0 || attachedFiles.length > 0) && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attachedImages.map((image) => (
                      <div key={image.id} className="group relative">
                        <img
                          src={image.previewUrl || `data:${image.type};base64,${image.base64}`}
                          alt={image.name}
                          className="h-14 w-14 rounded-lg border border-white/10 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOrbImage(image.id)}
                          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}

                    {attachedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-2.5 py-1.5"
                      >
                        <Paperclip className="h-3 w-3 text-white/50" />
                        <div>
                          <p className="max-w-[140px] truncate text-[10px] text-white/75">{file.name}</p>
                          <p className="text-[9px] text-white/35">{formatAttachmentFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveOrbFile(file.id)}
                          className="flex h-4 w-4 items-center justify-center rounded-full text-white/30 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div 
                  className="flex items-center gap-2 px-4 py-2"
                  style={{
                    background: designStyle === 'glass' 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : designStyle === 'brutal'
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.08)',
                    borderRadius: designStyle === 'brutal' ? '0.5rem' : '9999px',
                    border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255, 255, 255, 0.1)',
                    pointerEvents: 'auto',
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handleOrbPaste}
                    placeholder={editingMessageId ? 'Nachricht bearbeiten...' : 'Nachricht eingeben...'}
                    className="flex-1 bg-transparent text-sm"
                    style={{ 
                      color: textColor,
                      caretColor: accentColor,
                      outline: 'none',
                      border: 'none',
                      boxShadow: 'none',
                      pointerEvents: 'auto',
                    }}
                    disabled={isTyping || isAgentExecuting}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isTyping || isAgentExecuting}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center transition-all ${
                      isTyping || isAgentExecuting ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
                    }`}
                    style={{
                      background: 'rgba(255, 255, 255, 0.12)',
                      borderRadius: designStyle === 'brutal' ? '0.375rem' : '9999px',
                      border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                      color: textColor,
                    }}
                    title="Datei anhängen"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={COMBINED_ATTACHMENT_ACCEPT}
                    multiple
                    onChange={handleOrbFileSelect}
                    className="hidden"
                  />
                  
                  {(input.trim() || attachedImages.length > 0 || attachedFiles.length > 0) ? (
                    <button
                      onClick={() => handleSend()}
                      disabled={isTyping || isAgentExecuting}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center transition-all ${
                        isTyping || isAgentExecuting ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
                      }`}
                      style={{
                        background: moduleOrbColor,
                        borderRadius: designStyle === 'brutal' ? '0.375rem' : '9999px',
                        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                        color: buttonTextColor,
                      }}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    /* Mic Button - Toggle für Start/Stop */
                    <button
                      onClick={handleMicToggle}
                      disabled={isTyping || isAgentExecuting || !canUseMic}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center transition-all ${
                        isTyping || isAgentExecuting || !canUseMic ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
                      }`}
                      style={{
                        background: isListening
                          ? moduleOrbColor
                          : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: designStyle === 'brutal' ? '0.375rem' : '9999px',
                        border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                        color: isListening ? buttonTextColor : textColor,
                      }}
                    >
                      <Mic
                        className={`h-3.5 w-3.5 ${isListening ? 'animate-pulse' : ''}`}
                        style={{ opacity: canUseMic ? 0.8 : 0.4 }}
                      />
                    </button>
                  )}
                </div>

                {/* ----------------------------------------
                    Speech Status & Errors
                    ---------------------------------------- */}
                {isListening ? (
                  <div className="mt-1 text-xs" style={{ color: moduleOrbColor, opacity: 0.9 }}>
                    🎤 Höre zu ... (Klick zum Stoppen)
                  </div>
                ) : attachedImages.length > 0 || attachedFiles.length > 0 ? (
                  <div className="mt-1 text-xs" style={{ color: textColor, opacity: 0.6 }}>
                    Anhänge werden als Kontext mitgesendet
                  </div>
                ) : editingMessageId ? (
                  <div className="mt-1 text-xs" style={{ color: textColor, opacity: 0.6 }}>
                    Beim Senden werden die bearbeitete Nachricht und alle Folgeantworten ersetzt
                  </div>
                ) : (
                  <div className="mt-1 text-xs" style={{ color: textColor, opacity: 0.5 }}>
                    Klicke auf das Mikrofon zum Sprechen
                  </div>
                )}
                {speechError && (
                  <div className="mt-1 text-xs" style={{ color: '#f87171' }}>
                    {speechError === 'not-allowed'
                      ? 'Mikrofon-Zugriff verweigert.'
                      : speechError === 'speech_not_supported'
                      ? 'Speech-to-Text wird in diesem Browser nicht unterstützt.'
                      : 'Spracherkennung fehlgeschlagen.'}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ----------------------------------------
          Settings Button - Rechts außerhalb
          Nur sichtbar wenn Chat offen
          ---------------------------------------- */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: -20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.1 }}
          >
            <button
              type="button"
              onClick={() => setShowAgentSettings(true)}
              className="flex h-[48px] w-[48px] items-center justify-center transition-all hover:scale-110 hover:brightness-110"
              style={{
                background: accentColor,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '9999px',
                border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                boxShadow: designStyle === 'brutal' 
                  ? '3px 3px 0 #000' 
                  : `0 4px 15px ${accentColor}40`,
              }}
              title={`${activeSettingsModuleInfo.name} Einstellungen`}
            >
              <Settings className="h-5 w-5" style={{ color: buttonTextColor }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {showAgentSettings && (
        <AgentSettingsUnifiedModal
          moduleId={activeSettingsModuleId}
          moduleName={activeSettingsModuleInfo.name}
          moduleColor={activeSettingsModuleInfo.color}
          onClose={() => setShowAgentSettings(false)}
        />
      )}
    </div>
    
    {/* ----------------------------------------
        Agent-Auswahl Dropdown (außerhalb des Chat-Containers)
        ---------------------------------------- */}
    {isDropdownOpen && (
      <>
        {/* Backdrop zum Schließen */}
        <div 
          className="fixed inset-0 z-[9998] bg-black/20"
          onClick={() => setIsDropdownOpen(false)}
        />
        {/* Dropdown Menü */}
        <div 
          className="fixed z-[9999] py-2 rounded-xl min-w-[240px]"
          style={{
            bottom: dropdownPosition.bottom,
            left: dropdownPosition.left,
            transform: 'translateX(-50%)',
            background: 'rgba(25, 25, 35, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
        >
          <div className="px-4 py-2 text-xs text-white/50 font-semibold uppercase tracking-wide border-b border-white/10 mb-1">
            Agent auswählen
          </div>
          {CHAT_MODULES.map((module) => {
            const hasTab = chatTabs.some(t => t.moduleId === module.id);
            const moduleInfo = getModuleInfo(module.id);
            const moduleName = module.id === 'master' 
              ? `${userName}'s Intelligence`
              : moduleInfo.name || module.name;
            const moduleColor = moduleInfo.color || module.color;
            
            return (
              <button
                key={module.id}
                onClick={() => {
                  openChatTab(module.id);
                  setIsDropdownOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/10"
              >
                <div 
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ background: `${moduleColor}30` }}
                >
                  <DynamicIcon 
                    name={module.icon} 
                    className="h-4 w-4" 
                    style={{ color: moduleColor }} 
                  />
                </div>
                <span className="text-sm flex-1 text-left text-white/90">
                  {moduleName}
                </span>
                {hasTab && (
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ background: moduleColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </>
    )}
    </>
  );
}
