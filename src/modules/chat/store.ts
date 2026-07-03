// ============================================
// store.ts - Chat State Management
// 
// Zweck: Verwaltet alle Chat-Daten (Conversations, Messages, Folders)
//        mit Zustand und Persistierung in localStorage
// Verwendet von: ChatPage.tsx, ChatSidebar.tsx, ChatInput.tsx
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatStore, ChatConversation, ChatMessageData, ChatFolderData } from './types';
import { DEFAULT_CONVERSATION_TITLE, MAX_CONVERSATIONS } from './constants';

// --------------------------------------------
// Chat Store erstellen
// Verwaltet Conversations, Messages und Folders
// --------------------------------------------

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // ----------------------------------------
      // Initial State
      // Startwerte für den Chat
      // ----------------------------------------
      
      conversations: [],
      folders: [],
      activeConversationId: null,
      isLoading: false,

      // ----------------------------------------
      // Conversation Management Actions
      // Erstellen, Löschen, Aktualisieren von Konversationen
      // ----------------------------------------

      // Neue Konversation erstellen
      // Rückgabe: ID der neuen Konversation
      createConversation: () => {
        const state = get();
        
        // Prüfen ob maximale Anzahl erreicht
        if (state.conversations.length >= MAX_CONVERSATIONS) {
          // Älteste Konversation entfernen
          const sortedConversations = [...state.conversations].sort((a, b) => a.createdAt - b.createdAt);
          const oldestId = sortedConversations[0].id;
          get().deleteConversation(oldestId);
        }

        // Neue Konversation erstellen
        const newConversation: ChatConversation = {
          id: crypto.randomUUID(),
          title: DEFAULT_CONVERSATION_TITLE,
          messages: [],
          folderId: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Konversation zum Array hinzufügen und als aktiv setzen
        set({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: newConversation.id,
        });

        return newConversation.id;
      },

      // Konversation löschen
      // Parameter: conversationId - ID der zu löschenden Konversation
      // Rückgabe: keine
      deleteConversation: (conversationId) => {
        const state = get();
        
        // Konversation aus Array entfernen
        const newConversations = state.conversations.filter(conv => conv.id !== conversationId);
        
        // Wenn die gelöschte Konversation aktiv war, aktive Konversation neu setzen
        let newActiveConversationId = state.activeConversationId;
        if (state.activeConversationId === conversationId) {
          // Nimm die erste Konversation oder null wenn keine mehr da sind
          newActiveConversationId = newConversations.length > 0 ? newConversations[0].id : null;
        }

        // Konversation aus allen Ordnern entfernen
        const updatedFolders = state.folders.map(folder => ({
          ...folder,
          conversationIds: folder.conversationIds.filter(id => id !== conversationId),
        }));

        set({
          conversations: newConversations,
          activeConversationId: newActiveConversationId,
          folders: updatedFolders,
        });
      },

      // Aktive Konversation setzen
      // Parameter: conversationId - ID der Konversation die aktiv werden soll (oder null)
      // Rückgabe: keine
      setActiveConversation: (conversationId) => {
        set({ activeConversationId: conversationId });
      },

      // Titel einer Konversation aktualisieren
      // Parameter: conversationId - ID der Konversation, title - Neuer Titel
      // Rückgabe: keine
      updateConversationTitle: (conversationId, title) => {
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, title, updatedAt: Date.now() }
              : conv
          ),
        }));
      },

      // ----------------------------------------
      // Message Management Actions
      // Nachrichten hinzufügen und löschen
      // ----------------------------------------

      // Nachricht zu einer Konversation hinzufügen
      // Parameter: conversationId - ID der Konversation, message - Die Nachricht (ohne id und timestamp)
      // Rückgabe: keine
      addMessage: (conversationId, message) => {
        const state = get();
        const conversation = state.conversations.find(conv => conv.id === conversationId);
        if (!conversation) return;

        // Neue Nachricht erstellen
        const newMessage: ChatMessageData = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };

        // Nachricht zur Konversation hinzufügen
        const updatedConversations = state.conversations.map(conv => {
          if (conv.id === conversationId) {
            // Wenn es die erste Nachricht ist und der Titel noch Standard ist, Titel generieren
            let newTitle = conv.title;
            if (conv.messages.length === 0 && message.role === 'user' && conv.title === DEFAULT_CONVERSATION_TITLE) {
              // Titel aus erster Nachricht generieren (max. 50 Zeichen)
              newTitle = message.content.slice(0, 50).trim();
              if (message.content.length > 50) {
                newTitle += '...';
              }
            }

            return {
              ...conv,
              title: newTitle,
              messages: [...conv.messages, newMessage],
              updatedAt: Date.now(),
            };
          }
          return conv;
        });

        set({ conversations: updatedConversations });
      },

      // Nachricht aus einer Konversation löschen
      // Parameter: conversationId - ID der Konversation, messageId - ID der zu löschenden Nachricht
      // Rückgabe: keine
      deleteMessage: (conversationId, messageId) => {
        set((state) => ({
          conversations: state.conversations.map(conv =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: conv.messages.filter(msg => msg.id !== messageId),
                  updatedAt: Date.now(),
                }
              : conv
          ),
        }));
      },

      // ----------------------------------------
      // Folder Management Actions
      // Ordner erstellen, löschen, aktualisieren
      // ----------------------------------------

      // Ordner erstellen
      // Parameter: name - Name des Ordners, color - Optional: Farbe des Ordners
      // Rückgabe: ID des neuen Ordners
      createFolder: (name, color) => {
        const newFolder: ChatFolderData = {
          id: crypto.randomUUID(),
          name,
          color,
          conversationIds: [],
          createdAt: Date.now(),
        };

        set((state) => ({
          folders: [...state.folders, newFolder],
        }));

        return newFolder.id;
      },

      // Ordner löschen
      // Parameter: folderId - ID des zu löschenden Ordners
      // Rückgabe: keine
      deleteFolder: (folderId) => {
        set((state) => {
          // Alle Konversationen aus dem Ordner entfernen (folderId auf null setzen)
          const updatedConversations = state.conversations.map(conv =>
            conv.folderId === folderId ? { ...conv, folderId: null } : conv
          );

          return {
            conversations: updatedConversations,
            folders: state.folders.filter(folder => folder.id !== folderId),
          };
        });
      },

      // Ordner aktualisieren
      // Parameter: folderId - ID des Ordners, updates - Teil-Updates
      // Rückgabe: keine
      updateFolder: (folderId, updates) => {
        set((state) => ({
          folders: state.folders.map(folder =>
            folder.id === folderId ? { ...folder, ...updates } : folder
          ),
        }));
      },

      // Konversation in Ordner verschieben
      // Parameter: conversationId - ID der Konversation, folderId - ID des Ordners (oder null für "Kein Ordner")
      // Rückgabe: keine
      moveConversationToFolder: (conversationId, folderId) => {
        set((state) => {
          // Konversation aktualisieren
          const updatedConversations = state.conversations.map(conv =>
            conv.id === conversationId ? { ...conv, folderId } : conv
          );

          // Ordner aktualisieren (Konversation aus altem Ordner entfernen, zu neuem hinzufügen)
          const updatedFolders = state.folders.map(folder => {
            // Konversation aus diesem Ordner entfernen (falls vorhanden)
            const conversationIds = folder.conversationIds.filter(id => id !== conversationId);
            
            // Wenn dies der Ziel-Ordner ist, Konversation hinzufügen
            if (folderId === folder.id) {
              return {
                ...folder,
                conversationIds: [...conversationIds, conversationId],
              };
            }
            
            return { ...folder, conversationIds };
          });

          return {
            conversations: updatedConversations,
            folders: updatedFolders,
          };
        });
      },

      // ----------------------------------------
      // UI State Actions
      // Loading-State verwalten
      // ----------------------------------------

      // Loading-State setzen
      // Parameter: loading - Ob der Assistent gerade lädt
      // Rückgabe: keine
      setIsLoading: (loading) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'lifeos-chat-state',
      partialize: (state) => ({
        conversations: state.conversations,
        folders: state.folders,
        activeConversationId: state.activeConversationId,
      }),
    }
  )
);

// --------------------------------------------
// Selectors für optimierte Re-Renders
// Nur die benötigten Teile des Stores abonnieren
// --------------------------------------------

export const useChatConversations = () => 
  useChatStore((state) => state.conversations);

export const useActiveChatConversation = () => 
  useChatStore((state) => 
    state.conversations.find(conv => conv.id === state.activeConversationId)
  );

export const useChatFolders = () => 
  useChatStore((state) => state.folders);

export const useChatIsLoading = () => 
  useChatStore((state) => state.isLoading);

