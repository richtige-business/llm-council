// ============================================
// types.ts - TypeScript Interfaces für Chat-Modul
// 
// Zweck: Definiert alle Typen für Chat-Funktionalität
//        (Conversations, Messages, Folders, etc.)
// Verwendet von: store.ts, ChatPage.tsx, ChatSidebar.tsx
// ============================================

// --------------------------------------------
// Chat Message Interface
// Eine einzelne Chat-Nachricht
// --------------------------------------------

export interface ChatMessageData {
  id: string;                    // Eindeutige ID der Nachricht
  role: 'user' | 'assistant';    // Wer hat die Nachricht geschrieben?
  content: string;                // Inhalt der Nachricht
  timestamp: number;             // Zeitstempel der Nachricht
}

// --------------------------------------------
// Chat Conversation Interface
// Eine komplette Chat-Konversation
// --------------------------------------------

export interface ChatConversation {
  id: string;                     // Eindeutige ID der Konversation
  title: string;                  // Titel der Konversation (wird aus erster Nachricht generiert)
  messages: ChatMessageData[];    // Alle Nachrichten in dieser Konversation
  folderId: string | null;        // ID des Ordners (null = kein Ordner)
  createdAt: number;             // Zeitstempel der Erstellung
  updatedAt: number;             // Zeitstempel der letzten Aktualisierung
}

// --------------------------------------------
// Chat Folder Interface
// Ein Ordner für Chat-Konversationen
// --------------------------------------------

export interface ChatFolderData {
  id: string;                     // Eindeutige ID des Ordners
  name: string;                   // Name des Ordners
  color?: string;                 // Farbe des Ordners (optional, für visuelle Unterscheidung)
  conversationIds: string[];      // IDs der Konversationen in diesem Ordner
  createdAt: number;             // Zeitstempel der Erstellung
}

// --------------------------------------------
// Chat State Interface
// Der komplette Zustand des Chat-Moduls
// --------------------------------------------

export interface ChatState {
  conversations: ChatConversation[];  // Alle Chat-Konversationen
  folders: ChatFolderData[];          // Alle Ordner
  activeConversationId: string | null; // ID der aktiven Konversation
  isLoading: boolean;                 // Lädt der Assistent gerade eine Antwort?
}

// --------------------------------------------
// Chat Actions Interface
// Alle Aktionen die im Chat ausgeführt werden können
// --------------------------------------------

export interface ChatActions {
  // Conversation Management
  createConversation: () => string;  // Neue Konversation erstellen, gibt ID zurück
  deleteConversation: (conversationId: string) => void; // Konversation löschen
  setActiveConversation: (conversationId: string | null) => void; // Aktive Konversation setzen
  updateConversationTitle: (conversationId: string, title: string) => void; // Titel aktualisieren
  
  // Message Management
  addMessage: (conversationId: string, message: Omit<ChatMessageData, 'id' | 'timestamp'>) => void; // Nachricht hinzufügen
  deleteMessage: (conversationId: string, messageId: string) => void; // Nachricht löschen
  
  // Folder Management
  createFolder: (name: string, color?: string) => string; // Ordner erstellen, gibt ID zurück
  deleteFolder: (folderId: string) => void; // Ordner löschen
  updateFolder: (folderId: string, updates: Partial<ChatFolderData>) => void; // Ordner aktualisieren
  moveConversationToFolder: (conversationId: string, folderId: string | null) => void; // Konversation in Ordner verschieben
  
  // UI State
  setIsLoading: (loading: boolean) => void; // Loading-State setzen
}

// --------------------------------------------
// Kombinierter Chat Store Type
// State + Actions zusammen
// --------------------------------------------

export type ChatStore = ChatState & ChatActions;

