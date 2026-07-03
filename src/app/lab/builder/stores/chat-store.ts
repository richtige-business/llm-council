// ============================================
// LifeOS Module Builder - Chat Store
// 
// Zweck: Verwaltet den Chat-Zustand (wie bolt.diy chatStore)
// Konvertiert von nanostores zu zustand
// ============================================

import { create } from 'zustand';

// --------------------------------------------
// Message Typen
// --------------------------------------------

// --------------------------------------------
// Actionable Options (für Discuss-Mode)
// User kann eine Option wählen → wechselt zu Build
// --------------------------------------------

export interface ActionOption {
  id: string;
  label: string;           // z.B. "🎮 Gamification implementieren"
  description: string;     // Kurzbeschreibung
  buildPrompt: string;     // Der Prompt für den Build-Mode
}

export interface BuilderMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // Für Artifacts/Tool-Aufrufe
  artifacts?: MessageArtifact[];
  // NEU: Actionable Options (nur bei Discuss-Mode)
  options?: ActionOption[];
}

export interface MessageArtifact {
  id: string;
  title: string;
  type: 'file' | 'action';
  content?: string;
  filePath?: string;
}

// --------------------------------------------
// Chat-Modus Typ (wie bei Cursor)
// discuss = Planung und Beratung ohne Code
// build = Code-Generierung mit Artifacts
// --------------------------------------------

export type ChatMode = 'build' | 'discuss';

// --------------------------------------------
// Store State & Actions
// --------------------------------------------

interface ChatState {
  // State
  started: boolean;
  aborted: boolean;
  showChat: boolean;
  messages: BuilderMessage[];
  input: string;
  isStreaming: boolean;
  chatMode: ChatMode; // NEU: Chat-Modus
  
  // Actions
  setStarted: (started: boolean) => void;
  setAborted: (aborted: boolean) => void;
  setShowChat: (show: boolean) => void;
  setInput: (input: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  setChatMode: (mode: ChatMode) => void; // NEU: Chat-Modus setzen
  addMessage: (message: Omit<BuilderMessage, 'id' | 'timestamp'> & { id?: string }) => void;
  updateMessage: (id: string, content: string) => void;
  appendToMessage: (id: string, chunk: string) => void;
  clearMessages: () => void;
  reset: () => void;
}

// --------------------------------------------
// Store erstellen
// --------------------------------------------

export const useBuilderChatStore = create<ChatState>((set, get) => ({
  // Initial State
  started: false,
  aborted: false,
  showChat: true,
  messages: [],
  input: '',
  isStreaming: false,
  chatMode: 'build', // Starte im Build-Modus
  
  // Actions
  setStarted: (started) => set({ started }),
  setAborted: (aborted) => set({ aborted }),
  setShowChat: (show) => set({ showChat: show }),
  setInput: (input) => set({ input }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setChatMode: (mode) => set({ chatMode: mode }),
  
  addMessage: (message) => {
    const newMessage: BuilderMessage = {
      ...message,
      id: (message as BuilderMessage).id || crypto.randomUUID(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
    return newMessage.id;
  },
  
  updateMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg
      ),
    }));
  },
  
  appendToMessage: (id, chunk) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + chunk } : msg
      ),
    }));
  },
  
  clearMessages: () => set({ messages: [] }),
  
  reset: () => set({
    started: false,
    aborted: false,
    showChat: true,
    messages: [],
    input: '',
    isStreaming: false,
    chatMode: 'build', // Zurück zum Build-Modus
  }),
}));

