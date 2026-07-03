'use client';

// ============================================
// BuilderChat.tsx - Vibe-Coding Chat Interface
// 
// Zweck: Chat-Interface zum Beschreiben der gewünschten App
//        Unterstützt Build/Discuss Mode
// Verwendet von: Builder Page
// ============================================

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles, User, Bot, Trash2, Hammer, MessageCircle, ChevronUp, Check } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { 
  useBuilderStore, 
  useBuilderMessages, 
  useIsGenerating,
  useBuilderModule,
} from '@/lib/lab';
import type { BuilderMessage } from '@/lib/lab';
import { useBuilderChatStore } from '../stores/chat-store';
import { useLLMConfigStore } from '../stores/llm-config-store';

// --------------------------------------------
// Props Interface
// --------------------------------------------

interface BuilderChatProps {
  onGenerationComplete?: () => void;
  projectId?: string; // Optional: Für projektspezifische LLM Config
}

// --------------------------------------------
// Komponente: BuilderChat
// --------------------------------------------

export function BuilderChat({ onGenerationComplete, projectId }: BuilderChatProps) {
  // Theme-Styles
  const { surface, container, accentColor, textColor, designStyle } = useThemeStyles();
  
  // Store
  const messages = useBuilderMessages();
  const isGenerating = useIsGenerating();
  const currentModule = useBuilderModule();
  const addMessage = useBuilderStore((s) => s.addMessage);
  const updateMessage = useBuilderStore((s) => s.updateMessage);
  const setGenerating = useBuilderStore((s) => s.setGenerating);
  const initModule = useBuilderStore((s) => s.initModule);
  const applyGeneratedChanges = useBuilderStore((s) => s.applyGeneratedChanges);
  const setModuleStatus = useBuilderStore((s) => s.setModuleStatus);
  const clearChat = useBuilderStore((s) => s.clearChat);
  const resetBuilder = useBuilderStore((s) => s.resetBuilder);
  
  // LLM Config Store
  const getProjectConfig = useLLMConfigStore((s) => s.getProjectConfig);
  const llmConfig = projectId ? getProjectConfig(projectId) : useLLMConfigStore((s) => s.globalConfig);
  
  // Local State
  const [input, setInput] = useState('');
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // WICHTIG: Chat Mode als LOKALER State (nicht aus globalem Store)
  // Der globale Store hatte Synchronisationsprobleme
  const [chatMode, setChatModeLocal] = useState<'build' | 'discuss'>('build');
  
  // Wrapper für Mode-Änderung
  const setChatMode = (mode: 'build' | 'discuss') => {
    console.log('🔄 [LOCAL] Setting chatMode to:', mode);
    setChatModeLocal(mode);
  };
  
  // Auto-scroll zum Ende bei neuen Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Auto-resize Textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);
  
  // --------------------------------------------
  // Handler: Nachricht senden
  // --------------------------------------------
  
  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // User-Nachricht hinzufügen
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
    });
    
    // Generating starten
    setGenerating(true);
    
    // Placeholder für Assistant-Antwort mit gespeicherter ID
    const assistantMessageId = crypto.randomUUID();
    addMessage({
      role: 'assistant',
      content: '',
      status: 'pending',
      id: assistantMessageId, // ID explizit setzen!
    });
    
    // AbortController für Timeout (3 Minuten - LLM braucht bei komplexen Modulen lange)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180_000);
    
    // Fortschrittsanzeige: Aktualisiere Pending-Message mit Zeitangabe
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const dots = '.'.repeat((elapsed % 3) + 1);
      updateMessage(assistantMessageId, {
        status: 'streaming',
        // Zeitangabe fuer den User sichtbar machen
        generatedFiles: [`⏱️ ${elapsed}s${dots}`],
      });
    }, 3000);
    
    try {
      console.log('🚀 Starte API-Anfrage...', { chatMode, provider: llmConfig.provider, model: llmConfig.model });
      
      // Nur nicht-leere Messages senden (filtere alte Fehler/Pending raus)
      const cleanMessages = messages
        .filter(m => m.content && m.content.trim().length > 0 && m.status !== 'error' && m.status !== 'pending')
        .map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch('/api/lab/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            ...cleanMessages,
            { role: 'user', content: userMessage },
          ],
          currentModule,
          chatMode,
          stream: true,
          llmProvider: llmConfig.provider,
          llmModel: llmConfig.model,
        }),
      });
      
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      console.log('📥 Response erhalten, Status:', response.status);
      
      // Fehlerbehandlung mit detaillierten Meldungen
      if (!response.ok) {
        let errorMsg = `Server-Fehler (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
          console.error('❌ API Error:', response.status, errorData);
        } catch {
          // Response war kein JSON - z.B. HTML Error Page
          const text = await response.text().catch(() => '');
          console.error('❌ API Error (non-JSON):', response.status, text.substring(0, 200));
          if (response.status === 504) errorMsg = 'Die Generierung hat zu lange gedauert. Versuche einen kürzeren Prompt.';
          else if (response.status >= 500) errorMsg = `Server-Fehler (${response.status}). Prüfe die Konsole für Details.`;
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

          if (eventType === 'message_delta') {
            assistantContent += payload.delta || '';
            updateMessage(assistantMessageId, {
              content: assistantContent,
              status: 'streaming',
            });
          } else if (eventType === 'final') {
            updateMessage(assistantMessageId, {
              content: payload.message,
              status: 'complete',
              generatedFiles: payload.files?.map((f: { path: string }) => f.path),
            });

            if (payload.files || payload.widgets || payload.events || payload.tools || payload.systemPrompt || payload.moduleInfo) {
              try {
                applyGeneratedChanges(
                  payload.files || [],
                  payload.widgets,
                  payload.events,
                  payload.tools,
                  payload.systemPrompt,
                  payload.moduleInfo
                );
                setModuleStatus('ready');
              } catch (applyError) {
                console.error('❌ Fehler beim Anwenden der Änderungen:', applyError);
              }
            }

            onGenerationComplete?.();
          } else if (eventType === 'error') {
            throw new Error(payload.message || 'Streaming Fehler');
          }
        };

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

        return;
      }
      
      // Response parsen
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        throw new Error('Die API-Antwort konnte nicht gelesen werden. Bitte versuche es erneut.');
      }
      
      console.log('✅ API Response:', {
        hasMessage: !!data.message,
        filesCount: data.files?.length || 0,
        hasModuleInfo: !!data.moduleInfo,
      });
      
      // Generierte Dateien, Tools und System Prompt anwenden
      if (data.files || data.widgets || data.events || data.tools || data.systemPrompt || data.moduleInfo) {
        try {
          applyGeneratedChanges(
            data.files || [],
            data.widgets,
            data.events,
            data.tools,
            data.systemPrompt,
            data.moduleInfo
          );
          setModuleStatus('ready');
        } catch (applyError) {
          console.error('❌ Fehler beim Anwenden der Änderungen:', applyError);
          // Trotzdem die Nachricht anzeigen, auch wenn apply fehlschlägt
        }
      }
      
      // Assistant-Nachricht aktualisieren
      updateMessage(assistantMessageId, {
        content: data.message,
        status: 'complete',
        generatedFiles: data.files?.map((f: { path: string }) => f.path),
      });
      
      onGenerationComplete?.();
      
    } catch (error) {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      
      // Spezifische Fehlermeldungen basierend auf Fehlertyp
      let displayMessage: string;
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        displayMessage = 'Die Generierung hat zu lange gedauert (>3 Min). Versuche einen kürzeren oder spezifischeren Prompt.';
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        displayMessage = 'Netzwerkfehler: Konnte den Server nicht erreichen. Läuft der Dev-Server?';
      } else if (error instanceof Error) {
        displayMessage = error.message;
      } else {
        displayMessage = 'Ein unbekannter Fehler ist aufgetreten. Prüfe die Browser-Konsole (F12).';
      }
      
      console.error('❌ Builder Error:', error);
      
      updateMessage(assistantMessageId, {
        content: displayMessage,
        status: 'error',
      });
      
      setModuleStatus('error', 'Generierungsfehler');
      
    } finally {
      clearInterval(progressInterval);
      setGenerating(false);
    }
  };
  
  // --------------------------------------------
  // Handler: Enter-Taste
  // --------------------------------------------
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // --------------------------------------------
  // Render: Einzelne Nachricht
  // Die API entfernt bereits boltArtifact Tags, daher
  // zeigen wir message.content direkt an
  // --------------------------------------------
  
  const renderMessage = (message: BuilderMessage, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      >
        {/* Avatar */}
        <div 
          className="flex h-8 w-8 shrink-0 items-center justify-center"
          style={{
            background: isUser 
              ? 'rgba(255, 255, 255, 0.1)' 
              : `linear-gradient(135deg, ${accentColor} 0%, #a855f7 100%)`,
            borderRadius: designStyle === 'brutal' ? '0.375rem' : '9999px',
            border: designStyle === 'brutal' ? '2px solid #000' : 'none',
          }}
        >
          {isUser ? (
            <User className="h-4 w-4" style={{ color: textColor }} />
          ) : (
            <Bot className="h-4 w-4 text-white" />
          )}
        </div>
        
        {/* Nachricht */}
        <div 
          className={`flex-1 max-w-[85%] p-3 ${isUser ? 'text-right' : ''}`}
          style={{
            background: isUser 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(139, 92, 246, 0.1)',
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
            border: designStyle === 'brutal' 
              ? '2px solid #000' 
              : isUser 
                ? '1px solid rgba(255, 255, 255, 0.1)' 
                : '1px solid rgba(139, 92, 246, 0.2)',
          }}
        >
          {/* Status-Anzeige - Dynamisch basierend auf Mode + Zeitanzeige */}
          {(message.status === 'pending' || message.status === 'streaming') && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: accentColor }} />
              <span className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
                {chatMode === 'discuss' ? 'Denke nach' : 'Generiere Modul'}
                {/* Zeige Zeitangabe aus generatedFiles (wird vom Timer aktualisiert) */}
                {message.generatedFiles?.[0]?.startsWith('⏱️') 
                  ? ` ${message.generatedFiles[0]}` 
                  : '...'}
              </span>
            </div>
          )}
          
          {/* Nachrichteninhalt - API hat bereits Code entfernt */}
          {message.content && (
            <p 
              className="text-sm whitespace-pre-wrap"
              style={{ color: textColor }}
            >
              {message.content}
            </p>
          )}
          
          {/* Generierte Dateien */}
          {message.generatedFiles && message.generatedFiles.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-xs mb-1" style={{ color: textColor, opacity: 0.5 }}>
                Generierte Dateien:
              </p>
              <div className="flex flex-wrap gap-1">
                {message.generatedFiles.map((file) => (
                  <span 
                    key={file}
                    className="text-xs px-2 py-0.5"
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      borderRadius: '9999px',
                    }}
                  >
                    {file.split('/').pop()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };
  
  // --------------------------------------------
  // Render
  // --------------------------------------------
  
  return (
    <div 
      className="flex flex-col h-full"
      style={{
        ...container.base,
        borderRadius: designStyle === 'brutal' ? '0.5rem' : '1rem',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div 
            className="flex h-9 w-9 items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${accentColor} 0%, #a855f7 100%)`,
              borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
            }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-sm" style={{ color: textColor }}>
              Vibe-Coding Agent
            </h3>
            <p className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
              {currentModule ? `Modul: ${currentModule.name}` : 'Beschreibe deine App-Idee'}
            </p>
          </div>
        </div>
        
        {/* Reset Button */}
        {messages.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Möchtest du wirklich von vorne beginnen?')) {
                resetBuilder();
              }
            }}
            className="p-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: textColor, opacity: 0.5 }}
            title="Neu starten"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          // Willkommensnachricht
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div 
              className="flex h-16 w-16 items-center justify-center mb-4"
              style={{
                background: `linear-gradient(135deg, ${accentColor} 0%, #a855f7 100%)`,
                borderRadius: designStyle === 'brutal' ? '0.75rem' : '1rem',
                boxShadow: `0 8px 30px ${accentColor}40`,
              }}
            >
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>
              Willkommen im Modul Builder
            </h3>
            <p className="text-sm max-w-sm" style={{ color: textColor, opacity: 0.6 }}>
              Beschreibe die App, die du bauen möchtest. Ich erstelle automatisch 
              alle nötigen Dateien, Komponenten und Widgets.
            </p>
            
            {/* Beispiel-Prompts */}
            <div className="mt-6 space-y-2">
              <p className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
                Beispiele:
              </p>
              {[
                'Erstelle eine Todo-Liste mit Kategorien',
                'Baue einen Habit Tracker mit Streaks',
                'Erstelle einen Notizen-Manager mit Tags',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setInput(example)}
                  className="block w-full text-left text-sm px-3 py-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ 
                    color: textColor, 
                    opacity: 0.7,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-white/10">
        <div 
          className="p-2"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Mode Switcher - In der Eingabezeile */}
          <div className="flex items-center gap-2 px-2 pb-2 border-b border-white/10 mb-2">
            <div className="relative">
              <button
                onClick={() => setModeDropdownOpen(!modeDropdownOpen)}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/10 disabled:opacity-50"
                style={{
                  color: chatMode === 'build' ? accentColor : '#a855f7',
                }}
              >
                {chatMode === 'build' ? (
                  <Hammer className="w-4 h-4" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
                <span>{chatMode === 'build' ? 'Build' : 'Discuss'}</span>
                <ChevronUp className={`w-3 h-3 transition-transform ${modeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu - Öffnet nach OBEN */}
              <AnimatePresence>
                {modeDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 bottom-full mb-2 z-50 min-w-[200px] py-1 rounded-xl shadow-xl"
                    style={{
                      background: 'rgba(20, 20, 25, 0.98)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    {/* Build Option */}
                    <button
                      onClick={() => {
                        setChatMode('build');
                        setModeDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/10 transition-colors"
                    >
                      <Hammer className="w-5 h-5" style={{ color: accentColor }} />
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: textColor }}>Build</div>
                        <div className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                          Agent implementiert Code
                        </div>
                      </div>
                      {chatMode === 'build' && (
                        <Check className="w-4 h-4" style={{ color: accentColor }} />
                      )}
                    </button>
                    
                    {/* Discuss Option */}
                    <button
                      onClick={() => {
                        setChatMode('discuss');
                        setModeDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/10 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5 text-purple-400" />
                      <div className="flex-1">
                        <div className="font-medium" style={{ color: textColor }}>Discuss</div>
                        <div className="text-xs" style={{ color: textColor, opacity: 0.5 }}>
                          Agent plant & berät
                        </div>
                      </div>
                      {chatMode === 'discuss' && (
                        <Check className="w-4 h-4 text-purple-400" />
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Trennlinie */}
            <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.1)' }} />
            
            {/* Mode Status */}
            <span className="text-xs" style={{ color: textColor, opacity: 0.4 }}>
              {chatMode === 'build' ? '🔨 Baut & implementiert' : '💬 Plant & berät'}
            </span>
          </div>
          
          {/* Textarea + Send Button */}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={chatMode === 'build' ? 'Was soll ich für dich bauen?' : 'Was möchtest du besprechen?'}
              disabled={isGenerating}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none text-sm py-2 px-2"
              style={{ 
                color: textColor,
                minHeight: '40px',
                maxHeight: '120px',
              }}
            />
            
            <button
              onClick={handleSend}
              disabled={!input.trim() || isGenerating}
              className="flex h-9 w-9 shrink-0 items-center justify-center transition-all disabled:opacity-50"
              style={{
                background: input.trim() && !isGenerating ? accentColor : 'rgba(255, 255, 255, 0.1)',
                borderRadius: designStyle === 'brutal' ? '0.375rem' : '0.5rem',
              }}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
        </div>
        
        {/* Hint */}
        <p className="text-xs mt-2 text-center" style={{ color: textColor, opacity: 0.4 }}>
          Drücke Enter zum Senden • Shift+Enter für neue Zeile
        </p>
      </div>
    </div>
  );
}

