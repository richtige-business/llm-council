// ============================================
// AgentChatBar.tsx - Erweiterte Chat-Eingabe mit Agent-Features
// 
// Zweck: Mächtiges Eingabefeld mit:
//        - Modellauswahl
//        - Kontexttracker
//        - Bild-Import, File-Import
//        - Sprachassistenz (Platzhalter)
//        - Web Research, Deep Research Toggles
// Verwendet von: AgentsPage.tsx
// ============================================

'use client';

import { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Image as ImageIcon,
  Paperclip,
  Folder,
  Mic,
  Bot,
  Globe,
  Search,
  X,
  Home,
  Square,
} from 'lucide-react';
import Link from 'next/link';
import { useThemeStyles } from '@/lib/theme';
import { useAgentsStore } from '../store';
import { ModelSelector } from './ModelSelector';
import { ContextIndicator } from './ContextIndicator';
import { BUILT_IN_AGENT_DEFINITIONS } from '../agent-meta';
import {
  SlashCommands,
  createSlashModelItems,
  type SlashActionCommandItem,
  type SlashAgentPickerItem,
  type SlashCommandItem,
  type SlashModeCommandItem,
  type SlashPickerCommandItem,
  type SlashPickerMode,
} from './SlashCommands';
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_FILE_TYPES,
} from '../constants';
import type { ChatMessageData, AttachedImage, AttachedFile, ReplyToData, OrchestrationMode } from '../types';
import {
  getMatchingOrchestrationModeCommands,
  parseOrchestrationModeCommand,
  type OrchestrationModeCommandOption,
} from '../lib/orchestration-mode';
import {
  formatAttachmentFileSize,
  readAttachmentsFromClipboardData,
  readAttachmentsFromDropData,
  readAttachmentsFromFiles,
  revokeImagePreviewUrls,
  stripTransientAttachmentFieldsFromImages,
} from '../lib/chat-attachments';
import { useAgentConfigStore } from '@/lib/agent/stores/agent-config-store';
import { useModels } from '@/lib/llm/use-models';

// --------------------------------------------
// @-Mention Option: Ein einzelner erwähnbarer Agent
// --------------------------------------------
export interface MentionOption {
  id: string;         // Agent-ID
  name: string;       // Anzeigename
  color?: string;     // Farbe des Agents
}

// --------------------------------------------
// Props
// --------------------------------------------

interface AgentChatBarProps {
  onSend: (
    message: string,
    images?: AttachedImage[],
    files?: AttachedFile[],
    replyTo?: ReplyToData,
    forceMode?: OrchestrationMode,
  ) => void;
  disabled?: boolean;
  placeholder?: string;
  agentId: string;
  messages: ChatMessageData[];   // Für Kontext-Tracker
  modelId: string;               // Für Kontext-Tracker
  mentionOptions?: MentionOption[]; // Verfügbare Agents für @-Mentions
  replyTo?: ReplyToData | null;    // Aktuell zitierte Nachricht (Reply-Funktion)
  onCancelReply?: () => void;      // Reply-Vorschau schließen
  editingMessageId?: string | null;
  editingDraft?: string;
  onCancelEdit?: () => void;
  discussionActive?: boolean;      // Ob gerade eine Diskussion läuft
  onStopDiscussion?: () => void;   // Diskussion manuell beenden
  selectedOrchestrationMode?: OrchestrationMode;
  onSelectOrchestrationMode?: (mode?: OrchestrationMode) => void;
}

const PRODUCT_COMMANDS: Array<SlashActionCommandItem | SlashPickerCommandItem> = [
  {
    type: 'action',
    id: 'new-conversation',
    command: '/neu',
    aliases: ['/neu', '/new'],
    label: 'Neuen Chat erstellen',
    description: 'Startet sofort eine neue Konversation für den aktiven Agenten.',
    icon: 'Plus',
  },
  {
    type: 'action',
    id: 'clear-conversation',
    command: '/leeren',
    aliases: ['/leeren', '/clear'],
    label: 'Chat leeren',
    description: 'Entfernt alle Nachrichten aus der aktuellen Konversation.',
    icon: 'Trash2',
  },
  {
    type: 'picker',
    id: 'pick-agent',
    command: '/agent',
    aliases: ['/agent'],
    label: 'Agent wechseln',
    description: 'Öffnet einen Inline-Picker für verfügbare Agenten.',
    pickerMode: 'agent',
    icon: 'Bot',
  },
  {
    type: 'action',
    id: 'toggle-web-research',
    command: '/web',
    aliases: ['/web'],
    label: 'Web Research umschalten',
    description: 'Schaltet Web Research an oder aus.',
    icon: 'Globe',
  },
  {
    type: 'action',
    id: 'toggle-deep-research',
    command: '/deep',
    aliases: ['/deep'],
    label: 'Deep Research umschalten',
    description: 'Schaltet Deep Research an oder aus.',
    icon: 'Search',
  },
  {
    type: 'picker',
    id: 'pick-model',
    command: '/modell',
    aliases: ['/modell', '/model'],
    label: 'Modell wechseln',
    description: 'Öffnet einen Inline-Picker für verfügbare Modelle.',
    pickerMode: 'model',
    icon: 'Sparkles',
  },
];

function matchesSlashQuery(query: string, candidates: Array<string | undefined>): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return candidates.some((candidate) => candidate?.toLowerCase().includes(normalized));
}

// --------------------------------------------
// Komponente: AgentChatBar
// Erweiterte Chat-Eingabe mit allen Agent-Features
// --------------------------------------------

export function AgentChatBar({
  onSend,
  disabled = false,
  placeholder = 'Frag mich etwas oder gib einen Befehl...',
  agentId,
  messages,
  modelId,
  mentionOptions = [],
  replyTo,
  onCancelReply,
  editingMessageId,
  editingDraft,
  onCancelEdit,
  discussionActive = false,
  onStopDiscussion,
  selectedOrchestrationMode,
  onSelectOrchestrationMode,
}: AgentChatBarProps) {
  const [input, setInput] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [slashMode, setSlashMode] = useState<'commands' | SlashPickerMode | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  
  // Store-Selektoren
  const selectedAgentId = useAgentsStore((state) => state.selectedAgentId);
  const activeConversationId = useAgentsStore((state) => state.activeConversationId);
  const customAgents = useAgentsStore((state) => state.customAgents);
  const createConversation = useAgentsStore((state) => state.createConversation);
  const clearConversationMessages = useAgentsStore((state) => state.clearConversationMessages);
  const setSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);
  const webResearchEnabled = useAgentsStore((state) => state.webResearchEnabled);
  const deepResearchEnabled = useAgentsStore((state) => state.deepResearchEnabled);
  const agentModeEnabled = useAgentsStore((state) => state.agentModeEnabled);
  const setWebResearchEnabled = useAgentsStore((state) => state.setWebResearchEnabled);
  const setDeepResearchEnabled = useAgentsStore((state) => state.setDeepResearchEnabled);
  const setAgentModeEnabled = useAgentsStore((state) => state.setAgentModeEnabled);
  const updateConfig = useAgentConfigStore((state) => state.updateConfig);
  const { models: availableModels } = useModels();
  
  // Theme-Styles
  const { surface, accentColor, textColor, designStyle } = useThemeStyles();

  // Textarea-Höhe automatisch anpassen
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Textarea fokussieren wenn Reply aktiviert wird
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  useEffect(() => {
    if (!editingMessageId) {
      return;
    }

    requestAnimationFrame(() => {
      setInput(editingDraft || '');
      textareaRef.current?.focus();
    });
  }, [editingDraft, editingMessageId]);

  // ----------------------------------------
  // Ordner-Upload vorbereiten (WebKit-Verzeichnisauswahl)
  // So kann der User ganze Ordner statt einzelner Dateien auswählen
  // ----------------------------------------
  useEffect(() => {
    if (!folderInputRef.current) return;
    folderInputRef.current.setAttribute('webkitdirectory', '');
    folderInputRef.current.setAttribute('directory', '');
  }, []);

  // ----------------------------------------
  // @-Mention Logik
  // Erkennt "@" im Eingabetext und zeigt Autocomplete-Dropdown
  // ----------------------------------------
  const filteredMentions = mentionOptions.filter((option) =>
    option.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );
  const deferredSlashQuery = useDeferredValue(slashQuery);
  const slashModeItems = useMemo<SlashModeCommandItem[]>(
    () =>
      getMatchingOrchestrationModeCommands(deferredSlashQuery).map((option) => ({
        type: 'mode',
        command: option.command,
        aliases: option.aliases,
        mode: option.mode,
        label: option.label,
        description: option.description,
        icon: 'Brain',
      })),
    [deferredSlashQuery]
  );
  const filteredSlashCommands = useMemo<SlashCommandItem[]>(() => {
    const matchingProducts = PRODUCT_COMMANDS.filter((item) =>
      matchesSlashQuery(deferredSlashQuery, [item.command, item.label, item.description, ...(item.aliases || [])])
    );
    return [...matchingProducts, ...slashModeItems];
  }, [deferredSlashQuery, slashModeItems]);
  const filteredAgentItems = useMemo<SlashAgentPickerItem[]>(() => {
    const builtInItems: SlashAgentPickerItem[] = BUILT_IN_AGENT_DEFINITIONS.map((builtInAgent) => ({
      type: 'agent',
      id: `built-in-${builtInAgent.id}`,
      agentId: builtInAgent.id,
      label: builtInAgent.name,
      description: builtInAgent.description,
      color: builtInAgent.color,
      icon: builtInAgent.icon,
    }));
    const customAgentItems: SlashAgentPickerItem[] = customAgents.map((customAgent) => ({
      type: 'agent',
      id: `custom-${customAgent.id}`,
      agentId: customAgent.id,
      label: customAgent.name,
      description: customAgent.description || (customAgent.type === 'group' ? 'Gruppe' : 'Custom Agent'),
      color: customAgent.color,
      icon: customAgent.icon || (customAgent.type === 'group' ? 'Users' : 'Bot'),
    }));

    return [...builtInItems, ...customAgentItems].filter((item) =>
      matchesSlashQuery(deferredSlashQuery, [item.label, item.description, item.agentId])
    );
  }, [customAgents, deferredSlashQuery]);
  const filteredModelItems = useMemo(
    () =>
      createSlashModelItems(availableModels).filter((item) =>
        matchesSlashQuery(deferredSlashQuery, [item.label, item.description, item.modelId, item.providerLabel])
      ),
    [availableModels, deferredSlashQuery]
  );
  const activeSlashItems = useMemo(() => {
    if (slashMode === 'agent') {
      return filteredAgentItems;
    }
    if (slashMode === 'model') {
      return filteredModelItems;
    }
    if (slashMode === 'commands') {
      return filteredSlashCommands;
    }
    return [];
  }, [filteredAgentItems, filteredModelItems, filteredSlashCommands, slashMode]);

  const appendAttachments = useCallback((next: { images: AttachedImage[]; files: AttachedFile[] }) => {
    if (next.images.length > 0) {
      setAttachedImages((prev) => [...prev, ...next.images]);
    }
    if (next.files.length > 0) {
      setAttachedFiles((prev) => [...prev, ...next.files]);
    }
  }, []);

  const clearComposeAttachments = useCallback(() => {
    revokeImagePreviewUrls(attachedImages);
    setAttachedImages([]);
    setAttachedFiles([]);
  }, [attachedImages]);

  // Mention einfügen: ersetzt "@query" durch "@AgentName "
  const insertMention = (option: MentionOption) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);

    // Finde die Position des letzten "@" vor dem Cursor
    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex === -1) return;

    const newText = textBefore.slice(0, atIndex) + `@${option.name} ` + textAfter;
    setInput(newText);
    setShowMentions(false);
    setMentionQuery('');
    setMentionIndex(0);

    // Cursor nach der Mention positionieren
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newPos = atIndex + option.name.length + 2; // "@" + name + " "
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    });
  };

  const focusTextarea = useCallback(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  const resetSlashState = useCallback(() => {
    setSlashMode(null);
    setSlashQuery('');
    setSlashIndex(0);
  }, []);

  const clearMentions = useCallback(() => {
    setShowMentions(false);
    setMentionQuery('');
    setMentionIndex(0);
  }, []);

  const insertModeCommand = useCallback((option: Pick<OrchestrationModeCommandOption, 'command'>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);
    const slashMatch = textBefore.match(/(^|\s)(\/[^\s\n]*)$/);
    if (!slashMatch) return;

    const slashToken = slashMatch[2];
    const slashStart = cursorPos - slashToken.length;
    const newText = `${input.slice(0, slashStart)}${option.command} ${textAfter}`;

    setInput(newText);
    resetSlashState();

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newPos = slashStart + option.command.length + 1;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    });
  }, [input, resetSlashState]);

  const openSlashPicker = useCallback((mode: SlashPickerMode) => {
    const nextInput = mode === 'agent' ? '/agent ' : '/modell ';
    setInput(nextInput);
    setSlashMode(mode);
    setSlashQuery('');
    setSlashIndex(0);
    clearMentions();
    focusTextarea();
  }, [clearMentions, focusTextarea]);

  const executeSlashAction = useCallback((item: SlashActionCommandItem) => {
    const targetAgentId = selectedAgentId || agentId || 'master';

    switch (item.id) {
      case 'new-conversation':
        createConversation(targetAgentId);
        break;
      case 'clear-conversation':
        if (activeConversationId) {
          clearConversationMessages(activeConversationId);
        }
        break;
      case 'toggle-web-research':
        setWebResearchEnabled(!webResearchEnabled);
        break;
      case 'toggle-deep-research':
        setDeepResearchEnabled(!deepResearchEnabled);
        break;
    }

    setInput('');
    resetSlashState();
    clearMentions();
    focusTextarea();
  }, [
    activeConversationId,
    agentId,
    clearConversationMessages,
    clearMentions,
    createConversation,
    focusTextarea,
    resetSlashState,
    selectedAgentId,
    setDeepResearchEnabled,
    setWebResearchEnabled,
    webResearchEnabled,
    deepResearchEnabled,
  ]);

  const handleSlashSelection = useCallback((item: SlashCommandItem) => {
    if (item.type === 'action') {
      executeSlashAction(item);
      return;
    }

    if (item.type === 'picker') {
      openSlashPicker(item.pickerMode);
      return;
    }

    if (item.type === 'mode') {
      insertModeCommand({ command: item.command });
      return;
    }

    if (item.type === 'agent') {
      setSelectedAgent(item.agentId);
      const nextState = useAgentsStore.getState();
      if (!nextState.activeConversationId) {
        nextState.createConversation(item.agentId);
      }
      setInput('');
      resetSlashState();
      clearMentions();
      focusTextarea();
      return;
    }

    const targetAgentId = useAgentsStore.getState().selectedAgentId || agentId || 'master';
    updateConfig(targetAgentId, { llmProvider: 'openai', llmModel: item.modelId });
    setInput('');
    resetSlashState();
    clearMentions();
    focusTextarea();
  }, [
    agentId,
    clearMentions,
    executeSlashAction,
    focusTextarea,
    insertModeCommand,
    openSlashPicker,
    resetSlashState,
    setSelectedAgent,
    updateConfig,
  ]);

  // Input-Change: Erkennt @-Trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    const cursorPos = e.target.selectionStart;
    const textBefore = value.slice(0, cursorPos);
    const trimmedBefore = textBefore.trimStart();
    const pickerMatch = trimmedBefore.match(/^\/(agent|modell)\s*(.*)$/i);

    if (pickerMatch) {
      setSlashMode(pickerMatch[1].toLowerCase() === 'agent' ? 'agent' : 'model');
      setSlashQuery(pickerMatch[2] || '');
      setSlashIndex(0);
      clearMentions();
      return;
    }

    const slashMatch = textBefore.match(/(^|\s)(\/[^\s\n]*)$/);
    if (slashMatch) {
      const slashToken = slashMatch[2];
      setSlashMode('commands');
      setSlashQuery(slashToken.slice(1));
      setSlashIndex(0);
      clearMentions();
      return;
    }

    if (mentionOptions.length > 0) {
      const atIndex = textBefore.lastIndexOf('@');

      if (atIndex !== -1) {
        const query = textBefore.slice(atIndex + 1);
        if (!query.includes(' ') && !query.includes('\n')) {
          setMentionQuery(query);
          setShowMentions(true);
          setMentionIndex(0);
          resetSlashState();
          return;
        }
      }
    }

    clearMentions();
    resetSlashState();
  };

  // Tastatur-Navigation im Mention-Dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((slashMode === 'agent' || slashMode === 'model') && e.key === 'Backspace' && slashQuery.length === 0) {
      e.preventDefault();
      setInput('/');
      setSlashMode('commands');
      setSlashQuery('');
      setSlashIndex(0);
      focusTextarea();
      return;
    }

    if (slashMode && activeSlashItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((prev) => (prev + 1) % activeSlashItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex((prev) => (prev - 1 + activeSlashItems.length) % activeSlashItems.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSlashSelection(activeSlashItems[slashIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (slashMode === 'agent' || slashMode === 'model') {
          setInput('/');
          setSlashMode('commands');
          setSlashQuery('');
          setSlashIndex(0);
        } else {
          setInput('');
          resetSlashState();
        }
        return;
      }
    }

    // Mention-Dropdown aktiv: Navigation und Auswahl
    if (showMentions && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    // Normal: Enter sendet, Shift+Enter für Zeilenumbruch
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Nachricht senden (mit optionalem Reply)
  const handleSend = () => {
    if ((!input.trim() && attachedImages.length === 0 && attachedFiles.length === 0) || disabled) return;

    const trimmedInput = input.trim();
    const matchingProductAction = PRODUCT_COMMANDS.find(
      (item): item is SlashActionCommandItem => item.type === 'action' && item.command === trimmedInput
    );
    if (matchingProductAction) {
      executeSlashAction(matchingProductAction);
      return;
    }

    const parsedModeCommand = parseOrchestrationModeCommand(input);
    const hasMessageAfterCommand = parsedModeCommand.message.length > 0;
    if (
      parsedModeCommand.consumedCommand
      && parsedModeCommand.forceMode
      && !hasMessageAfterCommand
      && attachedImages.length === 0
      && attachedFiles.length === 0
    ) {
      onSelectOrchestrationMode?.(parsedModeCommand.forceMode);
      setInput('');
      clearMentions();
      resetSlashState();
      return;
    }

    const message = parsedModeCommand.message || input.trim();
    const forceMode = parsedModeCommand.forceMode ?? selectedOrchestrationMode;
    setInput('');
    clearMentions();
    resetSlashState();
    
    onSend(
      message,
      attachedImages.length > 0 ? stripTransientAttachmentFieldsFromImages(attachedImages) : undefined,
      attachedFiles.length > 0 ? attachedFiles : undefined,
      replyTo || undefined,
      forceMode,
    );

    if (parsedModeCommand.forceMode) {
      onSelectOrchestrationMode?.(parsedModeCommand.forceMode);
    }
    
    // Reply-Vorschau schließen
    if (onCancelReply) onCancelReply();
    
    // Attachments zurücksetzen
    clearComposeAttachments();
    
    // Textarea-Höhe zurücksetzen
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // ----------------------------------------
  // Bild-Import Handler
  // ----------------------------------------
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    void readAttachmentsFromFiles(files).then(appendAttachments);
  }, [appendAttachments]);

  // ----------------------------------------
  // File-Import Handler
  // ----------------------------------------
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    void readAttachmentsFromFiles(files).then(appendAttachments);
  }, [appendAttachments]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    const hasFilePayload = Array.from(clipboardData.items || []).some((item) => item.kind === 'file')
      || clipboardData.files.length > 0;

    if (!hasFilePayload) {
      return;
    }

    e.preventDefault();
    void readAttachmentsFromClipboardData(clipboardData).then((next) => {
      if (next.images.length > 0 || next.files.length > 0) {
        appendAttachments(next);
      }
    });
  }, [appendAttachments]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }

    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }

    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes('Files')) {
      return;
    }

    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    void readAttachmentsFromDropData(e.dataTransfer).then(appendAttachments);
  }, [appendAttachments]);

  // ----------------------------------------
  // Bild entfernen
  // ----------------------------------------
  const removeImage = (imageId: string) => {
    setAttachedImages(prev => {
      const img = prev.find(i => i.id === imageId);
      if (img?.previewUrl) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== imageId);
    });
  };

  // ----------------------------------------
  // Datei entfernen
  // ----------------------------------------
  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div 
      className="border-t border-white/10"
      style={{
        ...surface.base,
        borderRadius: 0,
      }}
    >
      {/* ----------------------------------------
          Reply-Vorschau (wie bei WhatsApp)
          Zeigt die zitierte Nachricht über dem Eingabefeld
          ---------------------------------------- */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 pt-3">
          <div
            className="flex-1 rounded-lg px-3 py-2"
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${replyTo.senderColor || '#a78bfa'}`,
            }}
          >
            <p
              className="text-[11px] font-semibold"
              style={{ color: replyTo.senderColor || '#a78bfa' }}
            >
              {replyTo.senderName}
            </p>
            <p className="text-[11px] text-white/50 line-clamp-2 leading-snug">
              {replyTo.content}
            </p>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
              title="Antwort abbrechen"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {editingMessageId && (
        <div className="flex items-center gap-2 px-4 pt-3">
          <div
            className="flex-1 rounded-lg px-3 py-2"
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              borderLeft: '3px solid #f59e0b',
            }}
          >
            <p className="text-[11px] font-semibold text-amber-200">
              Bearbeitungsmodus
            </p>
            <p className="text-[11px] text-white/55 leading-snug">
              Beim Senden wird der Verlauf ab dieser Nachricht ersetzt und neu fortgeführt.
            </p>
          </div>
          {onCancelEdit && (
            <button
              onClick={onCancelEdit}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
              title="Bearbeitung abbrechen"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* ----------------------------------------
          Attachment-Vorschau (Bilder + Dateien)
          Nur sichtbar wenn Attachments vorhanden
          ---------------------------------------- */}
      {(attachedImages.length > 0 || attachedFiles.length > 0) && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {/* Bild-Vorschau */}
          {attachedImages.map(img => (
            <div key={img.id} className="relative group">
              <img
                src={img.previewUrl}
                alt={img.name}
                className="h-16 w-16 rounded-lg object-cover border border-white/10"
              />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {/* Datei-Vorschau */}
          {attachedFiles.map(file => (
            <div
              key={file.id}
              className="relative group flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10"
            >
              <Paperclip className="h-3 w-3 text-white/50" />
              <div>
                <p className="text-[10px] text-white/70 max-w-[120px] truncate">{file.name}</p>
                <p className="text-[9px] text-white/30">{formatAttachmentFileSize(file.size)}</p>
              </div>
              <button
                onClick={() => removeFile(file.id)}
                className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ----------------------------------------
          Haupt-Eingabebereich
          ---------------------------------------- */}
      <div className="flex items-end gap-2 px-4 py-3">
        {/* Home-Button */}
        <Link
          href="/"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all hover:scale-105 hover:bg-white/10"
          style={{ color: textColor, opacity: 0.5 }}
          title="Zurück zum Dashboard"
        >
          <Home className="h-4 w-4" />
        </Link>

        {/* Textarea + Action Buttons */}
        <div className="flex-1 min-w-0 relative">
          <div 
            className="relative flex flex-col"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            }}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragActive && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] border-2 border-dashed border-cyan-300/60 bg-slate-950/55 text-sm font-medium text-cyan-100 backdrop-blur-sm">
                Dateien hier ablegen
              </div>
            )}

            {slashMode ? (
              <SlashCommands
                mode={slashMode}
                items={activeSlashItems}
                selectedIndex={slashIndex}
                onSelect={handleSlashSelection}
                onHover={setSlashIndex}
              />
            ) : null}

            {/* ----------------------------------------
                @-Mention Autocomplete Dropdown
                Erscheint über der Textarea wenn "@" getippt wird
                ---------------------------------------- */}
            {showMentions && filteredMentions.length > 0 && (
              <div
                className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto rounded-xl shadow-lg border"
                style={{
                  background: 'rgba(30, 30, 50, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  zIndex: 100,
                }}
              >
                <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider"
                     style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Teilnehmer erwähnen
                </div>
                {filteredMentions.map((option, idx) => (
                  <button
                    key={option.id}
                    onClick={() => insertMention(option)}
                    onMouseEnter={() => setMentionIndex(idx)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors"
                    style={{
                      background: idx === mentionIndex ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {/* Agent-Farbpunkt */}
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ background: option.color || '#8B5CF6' }}
                    />
                    <span className="truncate">{option.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={disabled}
              data-agent-input="agents-chat-input"
              placeholder={placeholder}
              rows={1}
              className="w-full resize-none px-3 py-2.5 text-sm bg-transparent placeholder:opacity-40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                maxHeight: '200px',
                overflowY: 'auto',
                color: textColor,
              }}
            />

            {/* ----------------------------------------
                Untere Leiste: Tools + Actions
                ---------------------------------------- */}
            <div className="flex items-center justify-between px-2 pb-2">
              {/* Linke Seite: Attachment-Buttons + Toggles */}
              <div className="flex items-center gap-0.5">
                {/* Bild-Upload */}
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
                  title="Bild anhängen"
                  disabled={disabled}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept={SUPPORTED_IMAGE_TYPES.join(',')}
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {/* Datei-Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
                  title="Datei anhängen"
                  disabled={disabled}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
                  title="Ordner anhängen"
                  disabled={disabled}
                >
                  <Folder className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORTED_FILE_TYPES.join(',')}
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Trenner */}
                <div className="h-4 w-px bg-white/10 mx-1" />

                {/* Web Research Toggle */}
                <button
                  onClick={() => setWebResearchEnabled(!webResearchEnabled)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                    webResearchEnabled
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/5'
                  }`}
                  title="Web Research"
                >
                  <Globe className="h-3 w-3" />
                  Web
                </button>

                {/* Deep Research Toggle */}
                <button
                  onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                    deepResearchEnabled
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/5'
                  }`}
                  title="Deep Research"
                >
                  <Search className="h-3 w-3" />
                  Deep
                </button>

                {/* Agent-Mode Toggle (vorerst ohne Funktion) */}
                <button
                  onClick={() => setAgentModeEnabled(!agentModeEnabled)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                    agentModeEnabled
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-white/30 hover:text-white/50 hover:bg-white/5'
                  }`}
                  title="Agent-Mode (kommt später)"
                >
                  <Bot className="h-3 w-3" />
                  Agent
                </button>
              </div>

              {/* Rechte Seite: Model + Context + Send */}
              <div className="flex items-center gap-1.5">
                {/* Kontext-Tracker */}
                <ContextIndicator
                  messages={messages}
                  modelId={modelId}
                />

                {/* Modellauswahl */}
                <ModelSelector agentId={agentId} compact />
              </div>
            </div>
          </div>
        </div>

        {/* Rechte Actions: Mikrofon über Sendebutton */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:text-white/50 transition-colors cursor-not-allowed"
            title="Sprachmodus (kommt bald)"
            disabled
            style={{
              border: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.08)',
            }}
          >
            <Mic className="h-3.5 w-3.5" />
          </button>

          {/* Stopp-Button (nur bei aktiver Diskussion) oder Send-Button */}
          {discussionActive && onStopDiscussion ? (
            <motion.button
              onClick={onStopDiscussion}
              className="flex h-9 w-9 items-center justify-center text-white transition-colors"
              style={{
                background: '#ef4444',
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Diskussion beenden"
            >
              <Square className="h-3.5 w-3.5" />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleSend}
              disabled={(!input.trim() && attachedImages.length === 0 && attachedFiles.length === 0) || disabled}
              data-agent-button="agents-chat-send"
              className="flex h-9 w-9 items-center justify-center text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: accentColor,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : 'none',
              }}
              whileHover={{ scale: (input.trim() || attachedImages.length > 0) && !disabled ? 1.05 : 1 }}
              whileTap={{ scale: (input.trim() || attachedImages.length > 0) && !disabled ? 0.95 : 1 }}
            >
              <Send className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
