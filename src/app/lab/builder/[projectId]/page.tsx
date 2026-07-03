// ============================================
// LifeOS Module Builder - Projekt-Chat Seite
// 
// Zweck: Chat + Preview für ein spezifisches Projekt
// Navigation: /lab/builder/[projectId]
// ============================================

'use client';

import { Suspense, useState, useCallback, useRef, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Code2, 
  Rocket, 
  ChevronRight,
  CheckCircle,
  Loader2,
  ArrowLeft,
  MessageSquare,
  Hammer,
  Save,
  Pencil,
  X,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  GripVertical,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useModuleRegistry, loadGeneratedModules } from '@/lib/modules/registry';
import { useThemeStyles } from '@/lib/theme';
// ArtifactParser für client-seitiges Real-Time Streaming
// Erkennt <boltAction> Tags im SSE-Stream und aktualisiert Dateien live
import { ArtifactParser } from '@/lib/lab/llm/parser';

// Komponenten
import { GitHubButton } from '../components';

// Stores
import { useProjectsStore } from '../stores/projects-store';
import { useWorkbenchStore } from '../stores/workbench-store';
import { useFilesStore, type FileMap } from '../stores/files-store';
import { useAppStore } from '@/lib/store/app-store';
import { useLLMConfigStore } from '../stores/llm-config-store';
import type { ActionOption } from '../stores/chat-store';
import type { StructuredPreviewError } from '@/lib/lab/debug/types';

// Komponenten
import { ChatInput, Messages } from '../components/chat';
import { Workbench } from '../components/workbench';
import { ProjectSettings } from '../components/settings';
import { PublishModal } from '../components/PublishModal';

// --------------------------------------------
// Haupt-Komponente
// --------------------------------------------

function ProjectChatPageContent({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt');
  
  // Theme-Styles
  const { surface, container, button, accentColor, designStyle, surfaceColor, textColor } = useThemeStyles();
  
  // Stores
  const { 
    projects,
    getCurrentProject,
    setCurrentProject,
    addMessage,
    updateMessage,
    setFile,
    clearFiles,
    setModuleInfo,
    updateProject,
    publishProject,
  } = useProjectsStore();
  
  const { 
    showWorkbench, setShowWorkbench, addFileSnapshot, clearFileSnapshots,
    setStreamingFile, clearStreamingFiles, setActiveStreamingFile,
  } = useWorkbenchStore();
  const setGlobalFiles = useFilesStore(state => state.setFiles);
  const setGlobalFile = useFilesStore(state => state.setFile);
  const appendGlobalFileContent = useFilesStore(state => state.appendFileContent);
  const clearGlobalFiles = useFilesStore(state => state.clearFiles);
  
  // LLM Config - Provider & Model Auswahl
  const llmConfig = useLLMConfigStore(state => state.getProjectConfig(projectId));
  const previewErrors = useWorkbenchStore((state) => state.previewErrors);
  
  // Aktuelles Projekt laden
  useEffect(() => {
    setCurrentProject(projectId);
    clearFileSnapshots();
    // Streaming-Fenster beim Projektwechsel zurücksetzen
    clearStreamingFiles();
  }, [projectId, setCurrentProject, clearFileSnapshots, clearStreamingFiles]);
  
  const project = projects.find(p => p.id === projectId);
  
  // Projekt-Dateien in den globalen Files-Store laden
  // WICHTIG: Erst alte Dateien löschen, dann neue laden!
  // Type-Cast notwendig weil BuilderProject.files einen leicht anderen Typ hat
  useEffect(() => {
    // Beim Projektwechsel: Erst alle alten Dateien löschen
    clearGlobalFiles();
    
    if (project?.files) {
      // Konvertiere project.files zu FileMap (Struktur ist kompatibel)
      const fileMap: FileMap = {};
      for (const [path, entry] of Object.entries(project.files)) {
        if (entry.type === 'file') {
          fileMap[path] = { type: 'file', content: entry.content || '' };
        } else {
          fileMap[path] = { type: 'folder' };
        }
      }
      setGlobalFiles(fileMap);
    }
  }, [projectId, project?.files, setGlobalFiles, clearGlobalFiles]);
  
  // State - initialisiere Input mit URL-Prompt falls vorhanden
  const [input, setInput] = useState(initialPrompt || '');
  const [isStreaming, setIsStreaming] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  
  // Chat Mode - 'build', 'discuss' oder 'pro'
  // Initialisiere mit URL-Parameter falls vorhanden
  const initialMode = searchParams.get('mode') as 'build' | 'discuss' | 'pro' | null;
  const [chatMode, setChatMode] = useState<'build' | 'discuss' | 'pro'>(initialMode || 'build');
  
  // Settings Panel State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState('');
  
  // Chat Panel Collapse State (eingeklappter Chat)
  const [chatCollapsed, setChatCollapsed] = useState(false);
  
  // Resize State
  const [chatWidth, setChatWidth] = useState(50); // Prozent
  const [isResizing, setIsResizing] = useState(false);
  
  // Preview Fullscreen State
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  
  // Iterations-Zaehler fuer Diff-Snapshots
  const generationCountRef = useRef(0);

  // --------------------------------------------
  // Snapshot der Dateien VOR einer Generierung
  // Wird genutzt für die Zusammenfassung der Änderungen
  // --------------------------------------------

  const preGenerationFilesRef = useRef<FileMap | null>(null);

  // Intelligence Orb immer im Builder verstecken
  const setHideIntelligenceOrb = useAppStore((state) => state.setHideIntelligenceOrb);
  
  // Effect: Intelligence Orb im Builder verstecken
  useEffect(() => {
    setHideIntelligenceOrb(true);
    // Cleanup: Orb wieder einblenden wenn Component unmounts
    return () => setHideIntelligenceOrb(false);
  }, [setHideIntelligenceOrb]);
  
  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoSent = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  
  // Hat der Chat bereits begonnen?
  const started = project && project.messages.length > 0;

  // Prompt, der automatisch gestartet werden soll (Query > Projektbeschreibung)
  const queuedPrompt = (() => {
    const fromQuery = (initialPrompt || '').trim();
    if (fromQuery.length > 0) return fromQuery;

    if (!project || project.messages.length > 0) return '';
    const fromDescription = (project.description || '').trim();
    return fromDescription;
  })();

  useEffect(() => {
    if (!project) return;
    setProjectNameDraft(project.name || 'Neues Modul');
  }, [project?.name, project]);

  useEffect(() => {
    if (isRenamingProject) {
      projectNameInputRef.current?.focus();
      projectNameInputRef.current?.select();
    }
  }, [isRenamingProject]);

  const startRenameProject = useCallback(() => {
    if (!project) return;
    setProjectNameDraft(project.name || 'Neues Modul');
    setIsRenamingProject(true);
  }, [project]);

  const cancelRenameProject = useCallback(() => {
    setProjectNameDraft(project?.name || 'Neues Modul');
    setIsRenamingProject(false);
  }, [project?.name]);

  const saveRenameProject = useCallback(() => {
    if (!project) return;
    const nextName = projectNameDraft.trim();
    if (!nextName) {
      cancelRenameProject();
      return;
    }

    if (nextName !== project.name) {
      updateProject(projectId, {
        name: nextName,
        ...(project.moduleInfo
          ? { moduleInfo: { ...project.moduleInfo, name: nextName } }
          : {}),
      });
    }

    setIsRenamingProject(false);
  }, [project, projectId, projectNameDraft, updateProject, cancelRenameProject]);
  
  // Auto-Scroll zum Ende wenn neue Nachrichten kommen oder Streaming aktiv
  useEffect(() => {
    if (chatContainerRef.current && started) {
      // Smooth scroll zum Ende des Chat-Containers
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      });
    }
  }, [project?.messages, isStreaming, started]);
  
  // Auch bei Content-Änderungen der letzten Nachricht scrollen (für Streaming)
  const lastMessageContent = project?.messages[project.messages.length - 1]?.content;
  useEffect(() => {
    if (chatContainerRef.current && started && isStreaming) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [lastMessageContent, started, isStreaming]);
  
  // --------------------------------------------
  // Resize Handler für Chat/Preview Split
  // --------------------------------------------
  
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!mainContainerRef.current) return;
      const rect = mainContainerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      // Mindestens 20%, maximal 80%
      setChatWidth(Math.min(80, Math.max(20, newWidth)));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  
  // --------------------------------------------
  // Chat Collapse Toggle
  // Bei Fullscreen Preview soll Chat komplett ausgeblendet sein
  // --------------------------------------------
  
  const toggleChatCollapse = useCallback(() => {
    setChatCollapsed(prev => !prev);
  }, []);
  
  const togglePreviewFullscreen = useCallback(() => {
    setPreviewFullscreen(prev => !prev);
    // Bei Fullscreen auch Chat kollabieren
    if (!previewFullscreen) {
      setChatCollapsed(true);
    }
  }, [previewFullscreen]);
  
  // --------------------------------------------
  // Chat starten
  // --------------------------------------------
  
  const startChat = useCallback(() => {
    if (!started) {
      setShowWorkbench(true);
    }
  }, [started, setShowWorkbench]);

  // --------------------------------------------
  // Zusammenfassung nach Generierung
  // Erstellt eine kurze Änderungsübersicht + Vorschläge
  // --------------------------------------------

  const buildCompletionSummary = useCallback((data: any) => {
    if (!data || data.chatMode !== 'build') return null;
    if (data.generationStatus && data.generationStatus !== 'ok') return null;

    const beforeFiles = preGenerationFilesRef.current;
    const responseFiles: Array<{ path: string; content: string }> = Array.isArray(data.files)
      ? data.files
      : [];

    const newFiles: string[] = [];
    const updatedFiles: string[] = [];

    if (beforeFiles && responseFiles.length > 0) {
      for (const file of responseFiles) {
        const existed = beforeFiles[file.path]?.type === 'file';
        if (existed) {
          updatedFiles.push(file.path);
        } else {
          newFiles.push(file.path);
        }
      }
    }

    const moduleName = data.moduleInfo?.name || project?.name || 'Modul';
    const fileCount = responseFiles.length;

    // Vorschläge: aus options (falls vorhanden), sonst Default-Liste
    const suggestionItems: string[] = Array.isArray(data.options) && data.options.length > 0
      ? data.options.slice(0, 3).map((o: any) => o.label || o.description || 'Weitere Verbesserung')
      : [
          'Dark Mode + Theme-Switch',
          'Filter & Suche für Datensätze',
          'Export/Import (CSV oder JSON)',
        ];

    const formatList = (items: string[], limit = 4) => {
      if (items.length === 0) return '—';
      const shown = items.slice(0, limit).map(i => `\`${i}\``).join(', ');
      return items.length > limit ? `${shown} +${items.length - limit}` : shown;
    };

    return [
      `✅ **Zusammenfassung für ${moduleName}**`,
      `- ${fileCount} Dateien verarbeitet`,
      `- Neu: ${formatList(newFiles)}`,
      `- Aktualisiert: ${formatList(updatedFiles)}`,
      '',
      '💡 **Vorschläge für nächste Schritte**',
      ...suggestionItems.map(s => `- ${s}`),
    ].join('\n');
  }, [project?.name]);
  
  // --------------------------------------------
  // Nachricht senden (mit SSE Streaming!)
  // --------------------------------------------
  
  const handleSendMessage = useCallback(async (directPrompt?: string, overrideChatMode?: 'build' | 'discuss' | 'pro') => {
    const messageToSend = directPrompt || input.trim();
    if (!messageToSend || isStreaming || !project) return;
    
    // Effektiver chatMode - Override hat Priorität (chatMode aus Closure)
    const effectiveChatMode = overrideChatMode || chatMode;
    let iterationLabel: string | null = null;
    
    const userMessage = messageToSend;
    if (!directPrompt) setInput('');
    startChat();
    
    // --------------------------------------------
    // Alte Streaming-Fenster zurücksetzen
    // Neue Generierung soll mit leeren Streaming-Blöcken starten
    // --------------------------------------------

    clearStreamingFiles();

    // User-Nachricht hinzufügen
    addMessage(projectId, { role: 'user', content: userMessage });
    
    // Assistant-Nachricht vorbereiten
    addMessage(projectId, { role: 'assistant', content: '' });
    
    setIsStreaming(true);
    setShowWorkbench(true);
    
    // Hilfsfunktion: Letzte Assistant-Nachricht finden
    const getLastAssistantMsgId = () => {
      const currentProject = useProjectsStore.getState().projects.find(p => p.id === projectId);
      const assistantMsgs = currentProject?.messages.filter(m => m.role === 'assistant') || [];
      return assistantMsgs[assistantMsgs.length - 1]?.id;
    };

    const restorePreGenerationSnapshot = (): boolean => {
      const snapshotBeforeGeneration = preGenerationFilesRef.current;
      if (!snapshotBeforeGeneration) return false;

      const restoredGlobalFiles: FileMap = {};
      const restoredProjectFiles: Record<string, { type: 'file' | 'folder'; content?: string }> = {};

      for (const [path, entry] of Object.entries(snapshotBeforeGeneration)) {
        if (!entry) continue;
        if (entry.type === 'file') {
          restoredGlobalFiles[path] = { type: 'file', content: entry.content };
          restoredProjectFiles[path] = { type: 'file', content: entry.content };
        } else {
          restoredGlobalFiles[path] = { type: 'folder' };
          restoredProjectFiles[path] = { type: 'folder' };
        }
      }

      setGlobalFiles(restoredGlobalFiles);
      updateProject(projectId, { files: restoredProjectFiles });
      return true;
    };
    
    try {
      // Snapshot VOR der Generierung (nur fuer Build/Pro)
      if (effectiveChatMode !== 'discuss') {
        generationCountRef.current += 1;
        iterationLabel = `Iteration ${generationCountRef.current}`;
        addFileSnapshot(`Vorher - ${iterationLabel}`, useFilesStore.getState().files);
        preGenerationFilesRef.current = structuredClone(useFilesStore.getState().files);
      }

      // Konversations-History aufbauen - GEFILTERT
      // Entferne leere Nachrichten, Fehlermeldungen und "abgebrochen" Meldungen
      const conversationHistory = [
        ...project.messages
          .filter(m => 
            m.content && 
            m.content.trim().length > 0 && 
            !m.content.startsWith('❌') &&
            !m.content.includes('abgebrochen')
          )
          .map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
      ];
      
      // Pro Mode sendet 'build' als chatMode aber mit proMode flag
      const apiChatMode = effectiveChatMode === 'pro' ? 'build' : effectiveChatMode;

      // --------------------------------------------
      // Aktuelles Modul + Dateien an die API senden
      // Damit der Agent vorhandene Files editiert
      // --------------------------------------------

      const currentModulePayload = project.moduleInfo ? {
        ...project.moduleInfo,
        files: Object.entries(project.files || {})
          .filter(([, entry]) => entry.type === 'file')
          .map(([path, entry]) => ({
            path,
            content: entry.content || '',
          })),
      } : null;

      const baseContextPayload = project.baseBinding?.enabled
        ? { baseId: project.baseBinding.baseId }
        : null;
      
      console.log('🚀 [Builder] Sende Request...', {
        mode: apiChatMode,
        messagesCount: conversationHistory.length,
        prompt: userMessage.substring(0, 80),
      });
      
      const response = await fetch('/api/lab/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          chatMode: apiChatMode,
          proMode: effectiveChatMode === 'pro',
          stream: true,
          currentModule: currentModulePayload,
          customPrompt: project.customPrompt?.enabled ? project.customPrompt : null,
          moduleTools: project.tools || [],
          moduleEvents: project.events || [],
          apiKeys: project.apiKeys?.map(k => ({ name: k.name, service: k.service })) || [],
          // LLM Provider & Model aus dem Config Store
          llmProvider: llmConfig.provider,
          llmModel: llmConfig.model,
          baseContext: baseContextPayload,
          // Strukturierte Preview-Fehler fuer den Auto-Debug-Loop
          previewErrors: previewErrors.slice(-5) as StructuredPreviewError[],
        }),
      });
      
      console.log('📥 [Builder] Response:', response.status, response.statusText);
      
      if (!response.ok) {
        let errorMsg = `Server-Fehler (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
          console.error('❌ [Builder] API Error:', response.status, errorData);
        } catch {
          const text = await response.text().catch(() => '');
          console.error('❌ [Builder] API Error (non-JSON):', response.status, text.substring(0, 200));
        }
        throw new Error(errorMsg);
      }
      
      // =============================================
      // STREAMING MODE - SSE lesen
      // =============================================
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Streaming nicht verfuegbar (kein Response-Body)');

        const decoder = new TextDecoder();
        let buffer = '';
        let assistantContent = '';
        let debugStatusSuffix = '';

        const msgId = getLastAssistantMsgId();
        let sawFinalEvent = false;
        let streamTimedOut = false;

        // --------------------------------------------
        // Streaming Watchdog: Beendet Stream bei Inaktivität
        // --------------------------------------------

        const streamTimeoutMs = 45000; // 45s ohne Events
        let lastStreamEventAt = Date.now();
        const resetStreamWatchdog = () => {
          lastStreamEventAt = Date.now();
        };

        // --------------------------------------------
        // Real-Time Code Streaming (Phase 5)
        // ArtifactParser erkennt Datei-Blöcke im Stream
        // und aktualisiert den Files-Store live
        // --------------------------------------------
        let currentStreamingPath: string | null = null;

        const streamParser = new ArtifactParser({
          // Neue Datei beginnt → leere Datei anlegen + Streaming-Status setzen
          onActionStart: (action) => {
            if (sawFinalEvent) return;
            if (action.type === 'file' && action.filePath) {
              currentStreamingPath = action.filePath;
              // Leere Datei im Store anlegen
              setGlobalFile(action.filePath, '');
              setFile(projectId, action.filePath, '');
              // Streaming-Status setzen
              setStreamingFile(action.filePath, 'writing');
              setActiveStreamingFile(action.filePath);
            }
          },
          // Code-Chunk kommt rein → an Datei-Content anhängen
          onActionContent: (content) => {
            if (sawFinalEvent) return;
            if (currentStreamingPath) {
              appendGlobalFileContent(currentStreamingPath, content);
            }
          },
          // Datei fertig geschrieben → Status auf 'complete'
          onActionEnd: (action) => {
            if (sawFinalEvent) {
              currentStreamingPath = null;
              setActiveStreamingFile(null);
              return;
            }
            if (action.type === 'file' && action.filePath) {
              setStreamingFile(action.filePath, 'complete');
              // Finalen Content auch im Projekt-Store speichern
              setFile(projectId, action.filePath, action.content);
              // Globalen Store mit finalem Content überschreiben (sauberer als append)
              setGlobalFile(action.filePath, action.content);
            }
            currentStreamingPath = null;
            setActiveStreamingFile(null);
          },
          // Artifact komplett → NICHT sofort aufräumen!
          // Das final-Event und setIsStreaming(false) kommen danach.
          // Cleanup passiert erst nach dem gesamten Stream (siehe unten).
          onArtifactEnd: () => {
            currentStreamingPath = null;
            setActiveStreamingFile(null);
          },
        });

        const handleFinalPayload = (data: any) => {
          const generationStatus: 'ok' | 'failed_contract' | 'failed_compile' =
            data?.generationStatus === 'failed_contract' || data?.generationStatus === 'failed_compile'
              ? data.generationStatus
              : 'ok';
          const validationErrors: string[] = Array.isArray(data?.validationErrors)
            ? data.validationErrors.filter((err: unknown): err is string => typeof err === 'string')
            : [];
          const attempts = typeof data?.attempts === 'number' ? data.attempts : 1;

          // Nachricht aktualisieren - mit Patch-Warnung falls noetig
          let finalMessage = data.message || '';

          // Patch-Ergebnisse pruefen (Phase 3: Cursor-Style Editing)
          if (generationStatus === 'ok' && data.patches && Array.isArray(data.patches)) {
            const failedPatches = data.patches.filter((p: any) => p.patchFailed);
            const totalPatches = data.patches.length;

            if (failedPatches.length > 0) {
              // Warnung an die Nachricht anhaengen
              const failedFiles = failedPatches.map((p: any) => p.path).join(', ');
              finalMessage += `\n\n⚠️ **${failedPatches.length} von ${totalPatches} Patches konnten nicht angewendet werden.**\nBetroffene Dateien: ${failedFiles}\n\n_Tipp: Sage "Generiere die Datei komplett neu" fuer eine vollstaendige Neugenerierung._`;
              console.warn(`[Builder] ⚠️ ${failedPatches.length}/${totalPatches} Patches fehlgeschlagen:`, failedFiles);
            } else if (totalPatches > 0) {
              console.log(`[Builder] ✅ Alle ${totalPatches} Patches erfolgreich angewendet`);
            }
          }

          if (data.chatMode === 'build' && generationStatus !== 'ok') {
            const restored = restorePreGenerationSnapshot();
            const statusLabel = generationStatus === 'failed_compile'
              ? 'Compile-/Syntax-Check fehlgeschlagen'
              : 'App.tsx-Contract verletzt';
            const errorList = validationErrors.length > 0
              ? `\n\nValidierungsfehler:\n${validationErrors.map((err) => `- ${err}`).join('\n')}`
              : '';
            const retryInfo = `\n\nVersuche: ${attempts}/2`;

            finalMessage = `${finalMessage || '❌ Generierung fehlgeschlagen.'}\n\n❌ ${statusLabel}.${errorList}${retryInfo}\n\nÄnderungen wurden nicht übernommen; der letzte stabile Stand wurde wiederhergestellt.`;

            if (!restored) {
              finalMessage += '\n\nHinweis: Kein Snapshot zum Wiederherstellen verfügbar.';
            }
          }

          if (msgId && finalMessage) {
            updateMessage(projectId, msgId, finalMessage, data.options || undefined);
          }

          if (data.chatMode === 'build' && generationStatus === 'ok') {
            // Dateien speichern (sowohl neue als auch gepatchte)
            if (data.files && data.files.length > 0) {
              for (const file of data.files) {
                setFile(projectId, file.path, file.content);
                setGlobalFile(file.path, file.content);
              }
            }

            if (data.moduleInfo) {
              setModuleInfo(projectId, {
                id: data.moduleInfo.id,
                name: data.moduleInfo.name,
                description: data.moduleInfo.description,
                icon: data.moduleInfo.icon,
                category: data.moduleInfo.category || 'other',
                version: data.moduleInfo.version || '1.0.0',
                author: data.moduleInfo.author || 'LifeOS User',
                tags: data.moduleInfo.tags || [],
              });
            }

            if (iterationLabel) {
              addFileSnapshot(`Nachher - ${iterationLabel}`, useFilesStore.getState().files);
            }
          }

          updateProject(projectId, { status: 'completed' });

          // Abschluss-Zusammenfassung als separate Nachricht
          const summaryMessage = buildCompletionSummary(data);
          if (summaryMessage) {
            addMessage(projectId, { role: 'assistant', content: summaryMessage });
          }

          // Snapshot-Ref zurücksetzen
          preGenerationFilesRef.current = null;
        };

        const processEvent = (rawEvent: string) => {
          const lines = rawEvent.split('\n').filter(Boolean);
          let eventType = 'message';
          let dataLine = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              dataLine += line.replace('data:', '').trim();
            }
          }

          if (!dataLine) return;
          const payload = JSON.parse(dataLine);
          resetStreamWatchdog();

          if (eventType === 'message_delta') {
            assistantContent += payload.delta || '';
            if (msgId) updateMessage(projectId, msgId, `${assistantContent}${debugStatusSuffix}`);
            // Real-Time Streaming: Delta an den Parser weiterleiten
            // Der Parser erkennt <boltAction> Tags und aktualisiert Dateien live
            if (payload.delta) {
              streamParser.processChunk(payload.delta);
            }
          } else if (eventType === 'debug_attempt') {
            const attempt = typeof payload.attempt === 'number' ? payload.attempt : 1;
            const maxAttempts = typeof payload.maxAttempts === 'number' ? payload.maxAttempts : 3;
            const stage = typeof payload.stage === 'string' ? payload.stage : 'validation';
            const reason = typeof payload.reason === 'string' ? payload.reason : '';
            debugStatusSuffix = `\n\n🔧 Auto-Debug: Versuch ${attempt}/${maxAttempts} (${stage})${reason ? `\n- ${reason}` : ''}`;
            if (msgId) updateMessage(projectId, msgId, `${assistantContent}${debugStatusSuffix}`);
          } else if (eventType === 'final') {
            sawFinalEvent = true;
            handleFinalPayload(payload);
          } else if (eventType === 'error') {
            throw new Error(payload.message || 'Streaming Fehler');
          }
        };

        // Watchdog-Intervall starten
        const watchdogInterval = setInterval(() => {
          const now = Date.now();
          if (now - lastStreamEventAt > streamTimeoutMs) {
            streamTimedOut = true;
            try {
              reader.cancel();
            } catch {
              // ignore
            }
            clearInterval(watchdogInterval);
          }
        }, 3000);

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            if (part.trim().length > 0) {
              processEvent(part);
            }
          }
        }

        clearInterval(watchdogInterval);

        // Parser nur finalisieren, wenn KEIN final-Event kam.
        // Sonst können unvollständige Streaming-Fragmente die finalen Dateien überschreiben.
        if (!sawFinalEvent) {
          streamParser.finish();
        } else {
          streamParser.reset();
        }

        // Wenn der Stream abgebrochen wurde: Info in die Nachricht schreiben
        if (streamTimedOut && msgId) {
          updateMessage(
            projectId,
            msgId,
            `${assistantContent}\n\n⚠️ **Streaming wurde wegen Inaktivität beendet.** Zusammenfassung folgt...`
          );
        }

        // Fallback: Wenn kein final-Event kam, Snapshot wiederherstellen.
        // So bleiben keine kaputten/trunkierten Dateien im Projekt.
        if (!sawFinalEvent && effectiveChatMode !== 'discuss') {
          restorePreGenerationSnapshot();

          if (msgId) {
            updateMessage(
              projectId,
              msgId,
              `${assistantContent}\n\n⚠️ **Stream unvollständig (kein final Event). Änderungen wurden zurückgesetzt, um fehlerhaften Code im Preview zu vermeiden.**`
            );
          }

          preGenerationFilesRef.current = null;
        }
        
        // Streaming-Fenster bleiben bestehen, bis die nächste Generierung startet
        // (clearStreamingFiles() wird zu Beginn einer neuen Generierung aufgerufen)

        setIsStreaming(false);
        return;
      }

      // =============================================
      // DISCUSS MODE - JSON Response direkt parsen
      // =============================================
      if (effectiveChatMode === 'discuss') {
        const data = await response.json();
        console.log('💬 [Builder] Discuss Response:', data);
        
        const msgId = getLastAssistantMsgId();
        if (msgId && data.message) {
          updateMessage(projectId, msgId, data.message, data.options || undefined);
        }
        
        updateProject(projectId, { status: 'completed' });
        setIsStreaming(false);
        return;
      }
      
      // =============================================
      // BUILD MODE - JSON Response parsen
      // =============================================
      const data = await response.json();
      console.log('🔧 [Builder] Build Response:', {
        hasMessage: !!data.message,
        filesCount: data.files?.length || 0,
        hasModuleInfo: !!data.moduleInfo,
        hasOptions: !!data.options?.length,
        patchesCount: data.patches?.length || 0,
        generationStatus: data.generationStatus || 'ok',
        attempts: data.attempts || 1,
      });

      const generationStatus: 'ok' | 'failed_contract' | 'failed_compile' =
        data?.generationStatus === 'failed_contract' || data?.generationStatus === 'failed_compile'
          ? data.generationStatus
          : 'ok';
      const validationErrors: string[] = Array.isArray(data?.validationErrors)
        ? data.validationErrors.filter((err: unknown): err is string => typeof err === 'string')
        : [];
      const attempts = typeof data?.attempts === 'number' ? data.attempts : 1;
      
      // Nachricht aktualisieren - mit Patch-Warnung falls noetig
      let buildMessage = data.message || '';

      // Patch-Ergebnisse pruefen (Phase 3: Cursor-Style Editing)
      if (generationStatus === 'ok' && data.patches && Array.isArray(data.patches)) {
        const failedPatches = data.patches.filter((p: any) => p.patchFailed);
        const totalPatches = data.patches.length;

        if (failedPatches.length > 0) {
          const failedFiles = failedPatches.map((p: any) => p.path).join(', ');
          buildMessage += `\n\n⚠️ **${failedPatches.length} von ${totalPatches} Patches konnten nicht angewendet werden.**\nBetroffene Dateien: ${failedFiles}\n\n_Tipp: Sage "Generiere die Datei komplett neu" fuer eine vollstaendige Neugenerierung._`;
          console.warn(`[Builder] ⚠️ ${failedPatches.length}/${totalPatches} Patches fehlgeschlagen:`, failedFiles);
        } else if (totalPatches > 0) {
          console.log(`[Builder] ✅ Alle ${totalPatches} Patches erfolgreich angewendet`);
        }
      }

      if (generationStatus !== 'ok') {
        const restored = restorePreGenerationSnapshot();
        const statusLabel = generationStatus === 'failed_compile'
          ? 'Compile-/Syntax-Check fehlgeschlagen'
          : 'App.tsx-Contract verletzt';
        const errorList = validationErrors.length > 0
          ? `\n\nValidierungsfehler:\n${validationErrors.map((err) => `- ${err}`).join('\n')}`
          : '';
        const retryInfo = `\n\nVersuche: ${attempts}/2`;
        buildMessage = `${buildMessage || '❌ Generierung fehlgeschlagen.'}\n\n❌ ${statusLabel}.${errorList}${retryInfo}\n\nÄnderungen wurden nicht übernommen; der letzte stabile Stand wurde wiederhergestellt.${restored ? '' : '\n\nHinweis: Kein Snapshot zum Wiederherstellen verfügbar.'}`;
      }

      const msgId = getLastAssistantMsgId();
      if (msgId && buildMessage) {
        updateMessage(projectId, msgId, buildMessage, data.options || undefined);
      }
      
      // Generierte Dateien speichern (neue + gepatchte)
      if (generationStatus === 'ok' && data.files && data.files.length > 0) {
        for (const file of data.files) {
          setFile(projectId, file.path, file.content);
          setGlobalFile(file.path, file.content);
        }
        console.log(`📁 [Builder] ${data.files.length} Dateien gespeichert`);
      }

      if (generationStatus === 'ok' && iterationLabel) {
        addFileSnapshot(`Nachher - ${iterationLabel}`, useFilesStore.getState().files);
      }
      
      // Modul-Info speichern
      if (generationStatus === 'ok' && data.moduleInfo) {
        setModuleInfo(projectId, {
          id: data.moduleInfo.id,
          name: data.moduleInfo.name,
          description: data.moduleInfo.description,
          icon: data.moduleInfo.icon,
          category: data.moduleInfo.category || 'other',
          version: data.moduleInfo.version || '1.0.0',
          author: data.moduleInfo.author || 'LifeOS User',
          tags: data.moduleInfo.tags || [],
        });
      }
      
      updateProject(projectId, { status: 'completed' });

      // Abschluss-Zusammenfassung als separate Nachricht
      const summaryMessage = buildCompletionSummary(data);
      if (summaryMessage) {
        addMessage(projectId, { role: 'assistant', content: summaryMessage });
      }

      // Snapshot-Ref zurücksetzen
      preGenerationFilesRef.current = null;

      console.log('✅ [Builder] Generierung abgeschlossen!');
      
    } catch (error: unknown) {
      console.error('❌ [Builder] Fehler:', error);
      const msgId = getLastAssistantMsgId();
      
      // Fehlertyp bestimmen
      const isAbort = (error instanceof Error && error.name === 'AbortError') ||
                      (error instanceof DOMException && error.name === 'AbortError');
      const isNetwork = error instanceof TypeError && (
        error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed')
      );
      
      if (isAbort) {
        if (msgId) updateMessage(projectId, msgId, '⏹️ Generierung wurde abgebrochen.');
      } else if (isNetwork) {
        if (msgId) updateMessage(projectId, msgId, '❌ Netzwerkfehler: Konnte den Server nicht erreichen. Läuft der Dev-Server auf Port 3000?');
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (msgId) updateMessage(projectId, msgId, `❌ ${errorMessage}`);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [input, isStreaming, project, projectId, chatMode, llmConfig, previewErrors, startChat, addMessage, updateMessage, setFile, setGlobalFiles, setGlobalFile, appendGlobalFileContent, setModuleInfo, updateProject, setShowWorkbench, addFileSnapshot, setStreamingFile, clearStreamingFiles, setActiveStreamingFile, buildCompletionSummary]);
  
  // --------------------------------------------
  // Initial Prompt automatisch senden (wenn von Startseite)
  // WICHTIG: Muss NACH handleSendMessage definiert sein!
  // --------------------------------------------
  
  useEffect(() => {
    // Warte auf das Projekt (kann beim ersten Render undefined sein wegen Race-Condition)
    if (!queuedPrompt || !project) {
      console.log('[Auto-Send] Waiting - queuedPrompt:', !!queuedPrompt, 'project:', !!project);
      return;
    }
    
    // Bereits gesendet oder Chat hat bereits begonnen
    if (hasAutoSent.current) {
      console.log('[Auto-Send] Already sent');
      return;
    }
    
    if (project.messages.length > 0) {
      console.log('[Auto-Send] Chat already has messages');
      return;
    }
    
    hasAutoSent.current = true;
    console.log('[Auto-Send] All conditions met, sending prompt:', queuedPrompt);
    
    // Warte kurz bis UI bereit ist und sende dann
    const timer = setTimeout(() => {
      console.log('[Auto-Send] Executing handleSendMessage');
      handleSendMessage(queuedPrompt);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [queuedPrompt, project, handleSendMessage]);
  
  // --------------------------------------------
  // Stopp-Handler
  // --------------------------------------------
  
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  }, []);
  
  // --------------------------------------------
  // Option auswählen (Discuss → Build)
  // Wechselt automatisch in Build-Mode und sendet buildPrompt
  // --------------------------------------------
  
  const handleSelectOption = useCallback((option: ActionOption) => {
    console.log('🎯 Option ausgewählt:', option.label);
    
    // Wechsle zu Build-Mode für die UI
    setChatMode('build');
    
    // Sende mit explizitem Build-Mode Override (umgeht State-Timing Problem)
    handleSendMessage(option.buildPrompt, 'build');
  }, [handleSendMessage]);
  
  // --------------------------------------------
  // Datei im Editor öffnen (von StreamingCodeBlock)
  // Wechselt zum Code-Tab und setzt die selektierte Datei
  // --------------------------------------------
  
  const { setSelectedFile, setCurrentView } = useWorkbenchStore();
  
  const handleOpenFile = useCallback((path: string) => {
    setSelectedFile(path);
    setCurrentView('code');
  }, [setSelectedFile, setCurrentView]);
  
  // --------------------------------------------
  // Modul veröffentlichen
  // --------------------------------------------
  
  const handlePublish = useCallback(async (visibility: 'private' | 'public'): Promise<boolean> => {
    if (!project || Object.keys(project.files).length === 0) return false;
    
    try {
      // Veröffentlichen über den Store (ruft API auf)
      const success = await publishProject(projectId, visibility);
      
      if (success) {
        // Registry aktualisieren
        const { registerModule } = useModuleRegistry.getState();
        const generatedModules = await loadGeneratedModules();
        for (const mod of generatedModules) {
          registerModule(mod);
        }
        
        // Erfolgsmeldung
        const visibilityLabel = visibility === 'public' ? 'öffentlichen' : 'privaten';
        addMessage(projectId, {
          role: 'assistant',
          content: `✅ **Modul "${project.moduleInfo?.name || project.name}" wurde veröffentlicht!**\n\nDas Modul ist jetzt in der ${visibilityLabel} Bibliothek verfügbar.`,
        });
        
        return true;
      } else {
        addMessage(projectId, {
          role: 'assistant',
          content: `❌ **Veröffentlichung fehlgeschlagen.**\nBitte versuche es erneut.`,
        });
        return false;
      }
    } catch (error) {
      console.error('Publish error:', error);
      addMessage(projectId, {
        role: 'assistant',
        content: `❌ **Veröffentlichung fehlgeschlagen:**\n${error instanceof Error ? error.message : 'Netzwerkfehler'}`,
      });
      return false;
    }
  }, [project, projectId, publishProject, addMessage]);
  
  // Prüfe ob bereits veröffentlicht
  const isPublished = project?.status === 'published';
  
  // --------------------------------------------
  // Projekt nicht gefunden
  // --------------------------------------------
  
  if (!project) {
    return (
      <div 
        className="fixed inset-0 z-20 flex items-center justify-center"
        style={{ background: surfaceColor }}
      >
        <div className="text-center">
          <p style={{ color: textColor }}>Projekt nicht gefunden</p>
          <Link 
            href="/lab/builder"
            className="text-sm mt-2 inline-block"
            style={{ color: accentColor }}
          >
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }
  
  // Dateien aus Projekt-Store für Workbench
  const filesCount = Object.values(project.files).filter(f => f.type === 'file').length;
  
  // --------------------------------------------
  // Render
  // --------------------------------------------
  
  return (
    <div 
      className="fixed inset-0 z-20 flex flex-col overflow-hidden"
      data-agent-panel="lab-root"
      style={{
        background: surfaceColor,
        backdropFilter: designStyle === 'glass' ? 'blur(20px)' : 'none',
      }}
    >
      {/* Header */}
      <header 
        className="flex-shrink-0 h-14"
        style={{
          ...container.base,
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
        }}
      >
        <div className="h-full px-4 flex items-center justify-between gap-3">
          {/* Left: Back + Project Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/lab/builder"
              className="p-2 rounded-lg transition-all hover:scale-105"
              style={{
                color: textColor,
                opacity: 0.6,
              }}
              title="Zurück zur Projektübersicht"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div 
                className="w-8 h-8 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                  boxShadow: designStyle === 'brutal' ? '2px 2px 0 #000' : `0 4px 12px ${accentColor}40`,
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                }}
              >
                {project.icon ? (
                  <span className="text-sm">{project.icon}</span>
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  {isRenamingProject ? (
                    <>
                      <input
                        ref={projectNameInputRef}
                        value={projectNameDraft}
                        onChange={(e) => setProjectNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            saveRenameProject();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelRenameProject();
                          }
                        }}
                        onBlur={saveRenameProject}
                        className="h-7 px-2 text-sm font-semibold rounded-md focus:outline-none max-w-[220px]"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          color: textColor,
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}
                        aria-label="Modulname bearbeiten"
                      />
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={saveRenameProject}
                        className="p-1 rounded-md transition-all"
                        style={{
                          color: accentColor,
                          background: 'rgba(255,255,255,0.06)',
                        }}
                        title="Umbenennen speichern"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={cancelRenameProject}
                        className="p-1 rounded-md transition-all"
                        style={{
                          color: textColor,
                          opacity: 0.75,
                          background: 'rgba(255,255,255,0.06)',
                        }}
                        title="Umbenennen abbrechen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <h1
                        className="text-sm font-semibold max-w-[230px] truncate"
                        style={{ color: textColor }}
                        title={project.name || 'Neues Modul'}
                      >
                        {project.name || 'Neues Modul'}
                      </h1>
                      <button
                        onClick={startRenameProject}
                        className="p-1 rounded-md transition-all hover:scale-105"
                        style={{
                          color: textColor,
                          opacity: 0.6,
                          background: 'rgba(255,255,255,0.05)',
                        }}
                        title="Modul umbenennen"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                    style={{
                      color: textColor,
                      opacity: 0.7,
                      background: 'rgba(255,255,255,0.08)',
                    }}
                  >
                    {filesCount > 0 ? `${filesCount} Dateien` : 'Keine Dateien'}
                  </span>
                  {project.baseBinding?.enabled && (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium min-w-0 max-w-[220px] truncate"
                      style={{
                        color: '#93c5fd',
                        background: 'rgba(59, 130, 246, 0.2)',
                      }}
                      title={project.baseBinding.baseDescription}
                    >
                      Fuer Base: {project.baseBinding.baseName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Chat Collapse Toggle - nur wenn gestartet */}
            {started && showWorkbench && (
              <button
                onClick={toggleChatCollapse}
                className="flex items-center gap-2 px-2 py-1.5 transition-all"
                style={{
                  ...button.base,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                  color: textColor,
                  opacity: 0.7,
                }}
                title={chatCollapsed ? 'Chat einblenden' : 'Chat ausblenden'}
              >
                {chatCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            )}
            
            {/* Preview Fullscreen Toggle - nur wenn Workbench sichtbar */}
            {started && showWorkbench && (
              <button
                onClick={togglePreviewFullscreen}
                data-agent-button="builder-preview-toggle"
                className="flex items-center gap-2 px-2 py-1.5 transition-all"
                style={{
                  ...button.base,
                  background: previewFullscreen ? `${accentColor}30` : 'transparent',
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                  color: previewFullscreen ? accentColor : textColor,
                  opacity: previewFullscreen ? 1 : 0.7,
                }}
                title={previewFullscreen ? 'Vollbild beenden' : 'Preview Vollbild'}
              >
                {previewFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}
            
            {/* Settings Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 transition-all text-xs"
              style={{
                ...button.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                color: textColor,
                opacity: 0.7,
              }}
              title="Modul-Einstellungen"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Einstellungen</span>
            </button>
            
            {/* GitHub Button */}
            <GitHubButton />
            
            {/* Workbench Toggle */}
            {started && (
              <button
                onClick={() => setShowWorkbench(!showWorkbench)}
                data-agent-button="builder-workbench-toggle"
                className="flex items-center gap-2 px-3 py-1.5 transition-all text-xs"
                style={{
                  ...button.base,
                  background: showWorkbench ? `${accentColor}30` : surfaceColor,
                  color: showWorkbench ? 'rgba(255, 255, 255, 1)' : textColor,
                  opacity: showWorkbench ? 1 : 0.7,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                }}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showWorkbench ? 'Code ausblenden' : 'Code anzeigen'}</span>
              </button>
            )}
            
            {/* Activate Button - IMMER sichtbar wenn Chat gestartet */}
            {started && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setPublishModalOpen(true)}
                disabled={isPublished || filesCount === 0}
                data-agent-button="builder-publish"
                className="flex items-center gap-2 px-3 py-1.5 transition-all text-xs font-medium text-white"
                style={{
                  background: isPublished 
                    ? '#22c55e' 
                    : `linear-gradient(135deg, ${accentColor} 0%, #764ba2 100%)`,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                  boxShadow: designStyle === 'brutal' 
                    ? '3px 3px 0 #000' 
                    : `0 4px 15px ${accentColor}40`,
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  opacity: (isPublished || filesCount === 0) ? 0.7 : 1,
                  cursor: filesCount === 0 ? 'not-allowed' : 'pointer',
                }}
                title={filesCount === 0 ? 'Generiere zuerst Code' : isPublished ? 'Bereits veröffentlicht' : 'Modul veröffentlichen'}
              >
                {isPublished ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <Rocket className="w-3.5 h-3.5" />
                )}
                <span>
                  {isPublished 
                    ? (project?.publishInfo?.visibility === 'public' ? 'Öffentlich' : 'Veröffentlicht')
                    : 'Veröffentlichen'}
                </span>
              </motion.button>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main 
        ref={mainContainerRef}
        className="flex-1 flex overflow-hidden relative"
        style={{ cursor: isResizing ? 'col-resize' : 'auto' }}
      >
        {/* Chat Panel - Ausblendbar */}
        <AnimatePresence>
          {!(previewFullscreen || chatCollapsed) && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ 
                width: showWorkbench && started ? `${chatWidth}%` : '100%',
                opacity: 1,
              }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col overflow-hidden"
              style={{
                minWidth: showWorkbench && started ? '300px' : 'auto',
              }}
            >
          {/* Chat Content */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
            {!started && queuedPrompt && (
              <div className="h-full flex items-center justify-center px-6">
                <div
                  className="text-sm text-center"
                  style={{ color: textColor, opacity: 0.65 }}
                >
                  Modul wird vorbereitet und Generierung gestartet...
                </div>
              </div>
            )}

            <Messages
              messages={project.messages.map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              }))}
              isStreaming={isStreaming}
              themeStyles={{ surface, container, accentColor, designStyle, textColor }}
              chatMode={chatMode === 'pro' ? 'build' : chatMode}
              onSelectOption={handleSelectOption}
              onOpenFile={handleOpenFile}
            />
          </div>
          
          {/* Bottom Input */}
          <div 
            className="flex-shrink-0 p-4"
            style={{
              ...surface.base,
              borderRadius: 0,
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: 'none',
            }}
          >
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSendMessage}
              onStop={handleStop}
              isStreaming={isStreaming}
              chatStarted={started}
              placeholder="Ändere etwas..."
              themeStyles={{ surface, container, button, accentColor, designStyle, textColor }}
              chatMode={chatMode}
              onChatModeChange={setChatMode}
              projectId={projectId}
            />
          </div>
        </motion.div>
          )}
        </AnimatePresence>
        
        {/* Resize Handle - nur wenn beide Panels sichtbar */}
        {showWorkbench && started && !previewFullscreen && !chatCollapsed && (
          <div
            onMouseDown={handleResizeMouseDown}
            className="flex-shrink-0 w-2 cursor-col-resize flex items-center justify-center group hover:bg-white/10 transition-colors z-10"
            style={{
              background: isResizing ? `${accentColor}20` : 'transparent',
            }}
          >
            <div 
              className="w-1 h-12 rounded-full transition-all group-hover:h-24 group-hover:bg-white/40"
              style={{
                background: isResizing ? accentColor : 'rgba(255,255,255,0.2)',
              }}
            />
          </div>
        )}
        
        {/* Workbench Panel - mit dynamischer Breite */}
        <WorkbenchWithProjectFiles
          projectId={projectId}
          chatStarted={started || false}
          isStreaming={isStreaming}
          isFullscreen={previewFullscreen || chatCollapsed}
        />
      </main>
      
      {/* Settings Panel */}
      <ProjectSettings
        projectId={projectId}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      
      {/* Publish Modal */}
      <PublishModal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        onPublish={handlePublish}
        moduleName={project?.moduleInfo?.name || project?.name || 'Modul'}
      />
    </div>
  );
}

export default function ProjectChatPage({ params }: { params: Promise<{ projectId: string }> }) {
  return (
    <Suspense fallback={<ProjectChatPageFallback />}>
      <ProjectChatPageContent params={params} />
    </Suspense>
  );
}

// --------------------------------------------
// Workbench mit Projekt-Dateien
// --------------------------------------------

function WorkbenchWithProjectFiles({
  chatStarted,
  isStreaming,
  isFullscreen = false,
}: {
  projectId: string;
  chatStarted: boolean;
  isStreaming: boolean;
  isFullscreen?: boolean;
}) {
  // Dateien werden bereits im Haupt-Effect geladen (oben in ProjectChatPage)
  // Keine doppelte Ladung mehr nötig!
  
  return (
    <Workbench
      chatStarted={chatStarted}
      isStreaming={isStreaming}
      isFullscreen={isFullscreen}
    />
  );
}

function ProjectChatPageFallback() {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[#0b1020] p-4 text-sm text-white/60">
      Builder wird geladen...
    </div>
  );
}
