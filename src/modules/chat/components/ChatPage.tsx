// ============================================
// ChatPage.tsx - Haupt-Chat-Komponente mit Agent-Integration
// 
// Zweck: Hauptansicht des Chat-Moduls
//        Split-View: Sidebar links, Chat rechts
//        Nutzt Agent-API für intelligente Aktionen
//        Verwendet Theme-System für dynamisches Styling
// Verwendet von: TabContent.tsx (wenn Chat-Modul als Tab geöffnet wird)
// ============================================

'use client';

import { useEffect, useRef } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { useChatStore, useActiveChatConversation, useChatIsLoading } from '../store';
import { useAgentExecutor, useIsAgentExecuting } from '@/lib/agent';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ThinkingBlock } from '@/modules/agents/components/ThinkingBlock';
import { useThemeStyles } from '@/lib/theme';

// --------------------------------------------
// Komponente: ChatPage
// Hauptansicht des Chat-Moduls
// --------------------------------------------

export function ChatPage() {
  // --------------------------------------------
  // Store-Selektoren (Performance-optimiert)
  // --------------------------------------------
  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const createConversation = useChatStore((state) => state.createConversation);
  const addMessage = useChatStore((state) => state.addMessage);
  const setIsLoading = useChatStore((state) => state.setIsLoading);

  // Theme-Styles für dynamisches Design
  const { button, accentColor, designStyle } = useThemeStyles();

  // Agent Hook für Aktionen
  const { sendAgentRequest } = useAgentExecutor();
  const isAgentExecuting = useIsAgentExecuting();

  const activeConversation = useActiveChatConversation();
  const isLoading = useChatIsLoading();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------
  // Effekt: Erste Konversation erstellen
  // Wenn keine Konversationen vorhanden sind
  // ----------------------------------------
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation();
    }
  }, [conversations.length, createConversation]);

  // ----------------------------------------
  // Effekt: Zum Ende der Nachrichten scrollen
  // Wenn neue Nachrichten hinzukommen
  // ----------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length, isLoading, isAgentExecuting]);

  // ----------------------------------------
  // Handler: Nachricht senden
  // Nutzt jetzt die Agent-API mit Tool Use
  // ----------------------------------------
  const handleSendMessage = async (content: string) => {
    const conversationId = activeConversationId || createConversation();
    
    // User-Nachricht zur Konversation hinzufügen
    addMessage(conversationId, { role: 'user', content });

    // Assistent-Antwort von Claude abrufen
    setIsLoading(true);

    try {
      // Alle bisherigen Nachrichten für Context
      // (letzte 10 Nachrichten für Context)
      const conversation = conversations.find(c => c.id === conversationId);
      const contextMessages = [
        ...(conversation?.messages || []),
        { role: 'user' as const, content },
      ].slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Agent-Request senden (führt auch Aktionen aus)
      const { message } = await sendAgentRequest(contextMessages);
      
      // Antwort zur Konversation hinzufügen
      addMessage(conversationId, {
        role: 'assistant',
        content: message,
      });

    } catch (error) {
      console.error('Chat Fehler:', error);
      // Fehler-Nachricht anzeigen
      addMessage(conversationId, {
        role: 'assistant',
        content: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ----------------------------------------
          Linke Sidebar
          Chat-History und Ordner
          ---------------------------------------- */}
      <ChatSidebar />

      {/* ----------------------------------------
          Rechte Chat-Ansicht
          Nachrichten und Eingabefeld
          ---------------------------------------- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeConversation ? (
          <>
            {/* ----------------------------------------
                Chat-Header
                Titel der aktuellen Konversation
                ---------------------------------------- */}
            <div 
              className="flex items-center gap-3 p-4"
              style={{
                ...button.base,
                borderRadius: 0,
                borderBottom: designStyle === 'brutal' ? '2px solid #000' : '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <h2 className="text-lg font-semibold text-white">
                {activeConversation.title}
              </h2>
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
                Scrollbarer Bereich mit allen Nachrichten
                ---------------------------------------- */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-3xl space-y-6">
                {activeConversation.messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {/* Loading-Indikator wenn Assistent antwortet */}
                {(isLoading || isAgentExecuting) && (
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
                        detailItems={isAgentExecuting ? ['Der Agent arbeitet gerade an einem Tool-Schritt.'] : []}
                        accentColor={accentColor}
                      />
                    </div>
                  </div>
                )}

                {/* Scroll-Anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* ----------------------------------------
                Eingabefeld
                Unten fixiert, mit Home-Button links
                ---------------------------------------- */}
            <ChatInput
              onSend={handleSendMessage}
              disabled={isLoading || isAgentExecuting}
              placeholder="Frag mich etwas oder gib einen Befehl..."
              showHomeButton={true}
            />
          </>
        ) : (
          /* ----------------------------------------
              Leere Ansicht
              Wenn keine Konversation aktiv ist
              ---------------------------------------- */
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-white/60">Keine Konversation ausgewählt</p>
              <button
                onClick={() => createConversation()}
                className="mt-4 px-4 py-2 text-sm text-white transition-colors"
                style={{
                  background: accentColor,
                  borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
                  border: designStyle === 'brutal' ? '2px solid #000' : 'none',
                  boxShadow: designStyle === 'brutal' ? '3px 3px 0 #000' : 'none',
                }}
              >
                Neuen Chat erstellen
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Agent Settings Button entfernt - im Chat-Modul nicht benötigt,
          da die Einstellungen über die globale Chatbar zugänglich sind */}
    </div>
  );
}
