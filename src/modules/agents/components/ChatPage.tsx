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

import { useEffect, useRef, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { useChatStore, useActiveChatConversation, useChatIsLoading } from '../store';
import type { ChatMessageData } from '../types';
import { useAgentExecutor, useIsAgentExecuting } from '@/lib/agent';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ThinkingBlock } from './ThinkingBlock';
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
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const setIsLoading = useChatStore((state) => state.setIsLoading);

  // Theme-Styles für dynamisches Design
  const { button, accentColor, designStyle } = useThemeStyles();

  // Agent Hook für Aktionen
  const { sendAgentRequest } = useAgentExecutor();
  const isAgentExecuting = useIsAgentExecuting();

  const activeConversation = useActiveChatConversation();
  const isLoading = useChatIsLoading();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const lastAssistantMessageId = [...(activeConversation?.messages ?? [])]
    .reverse()
    .find((message) => message.role === 'assistant')?.id;

  // ----------------------------------------
  // Kontext fuer den Agenten aufbereiten
  // System-Nachrichten werden ausgefiltert, damit
  // nur relevante Dialogturns an die API gehen.
  // ----------------------------------------
  const buildContextMessages = (
    messages: Array<Pick<ChatMessageData, 'role' | 'content'>>,
  ) => messages
    .filter((message) => message.role !== 'system')
    .slice(-10)
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content,
    }));

  // ----------------------------------------
  // Gemeinsamer Antwortpfad
  // Holt eine neue Assistenten-Antwort fuer einen
  // bereits vorbereiteten Nachrichtenkontext.
  // ----------------------------------------
  const requestAssistantReply = async (
    conversationId: string,
    messageHistory: Array<Pick<ChatMessageData, 'role' | 'content'>>,
  ) => {
    setIsLoading(true);

    try {
      const { message, toolCalls } = await sendAgentRequest(buildContextMessages(messageHistory));

      addMessage(conversationId, {
        role: 'assistant',
        content: message,
        toolCalls,
      });
    } catch (error) {
      console.error('Chat Fehler:', error);
      addMessage(conversationId, {
        role: 'assistant',
        content: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
  // Nutzt die gemeinsame Antwortlogik fuer normalen
  // Versand und das Bearbeiten bestehender Messages.
  // ----------------------------------------
  const handleSendMessage = async (content: string) => {
    const conversationId = activeConversationId || createConversation();
    const conversation = conversations.find((entry) => entry.id === conversationId);
    const currentMessages = conversation?.messages ?? [];

    if (editingMessageId) {
      const editIndex = currentMessages.findIndex((message) => message.id === editingMessageId);

      if (editIndex !== -1) {
        const preservedMessages = currentMessages.slice(0, editIndex);

        currentMessages
          .slice(editIndex)
          .forEach((message) => deleteMessage(conversationId, message.id));

        setEditingMessageId(null);
        setDraftMessage('');

        addMessage(conversationId, { role: 'user', content });
        await requestAssistantReply(conversationId, [
          ...preservedMessages,
          { role: 'user', content },
        ]);
        return;
      }

      setEditingMessageId(null);
      setDraftMessage('');
    }

    addMessage(conversationId, { role: 'user', content });
    await requestAssistantReply(conversationId, [
      ...currentMessages,
      { role: 'user', content },
    ]);
  };

  // ----------------------------------------
  // Nachricht bearbeiten
  // Laedt den Text in den Input und entfernt beim
  // naechsten Senden alle abhaengigen Folgeantworten.
  // ----------------------------------------
  const handleEditMessage = (message: ChatMessageData) => {
    setEditingMessageId(message.id);
    setDraftMessage(message.content);
  };

  // ----------------------------------------
  // Bearbeitung abbrechen
  // Setzt den Input wieder in den normalen Modus.
  // ----------------------------------------
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setDraftMessage('');
  };

  // ----------------------------------------
  // Letzte Antwort neu generieren
  // Entfernt die aktuelle Assistenten-Antwort und
  // fragt den Agenten mit demselben Kontext erneut.
  // ----------------------------------------
  const handleRegenerateMessage = async (message: ChatMessageData) => {
    if (!activeConversation) return;

    const messageIndex = activeConversation.messages.findIndex((entry) => entry.id === message.id);
    if (messageIndex === -1) return;

    deleteMessage(activeConversation.id, message.id);

    await requestAssistantReply(
      activeConversation.id,
      activeConversation.messages.slice(0, messageIndex),
    );
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
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onEdit={message.role === 'user' ? handleEditMessage : undefined}
                    onRegenerate={message.role === 'assistant' ? handleRegenerateMessage : undefined}
                    canRegenerate={message.id === lastAssistantMessageId}
                  />
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
                        detailItems={isAgentExecuting ? ['Der Agent plant oder fuehrt gerade einen Tool-Schritt aus.'] : []}
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
              placeholder={editingMessageId ? 'Nachricht bearbeiten...' : 'Frag mich etwas oder gib einen Befehl...'}
              showHomeButton={true}
              value={draftMessage}
              onValueChange={setDraftMessage}
              isEditing={Boolean(editingMessageId)}
              onCancelEdit={handleCancelEdit}
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
