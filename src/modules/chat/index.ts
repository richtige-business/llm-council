// ============================================
// index.ts - Haupt-Export für das Chat-Modul
// 
// Zweck: Zentraler Einstiegspunkt für alle Exports des Moduls
//        Hier wird auch das Modul bei der Registry angemeldet
// Verwendet von: App-Layout, Sidebar, andere Module
// ============================================

// --------------------------------------------
// Re-Exports
// Alles was andere Teile der App brauchen könnten
// --------------------------------------------

// Types exportieren
export type {
  ChatMessageData,
  ChatConversation,
  ChatFolderData,
  ChatState,
  ChatActions,
  ChatStore,
} from './types';

// Store und Hooks exportieren
export {
  useChatStore,
  useChatConversations,
  useActiveChatConversation,
  useChatFolders,
  useChatIsLoading,
} from './store';

// Konstanten exportieren
export {
  FOLDER_COLORS,
  MAX_CONVERSATIONS,
  MAX_MESSAGES_PER_CONVERSATION,
  DEFAULT_CONVERSATION_TITLE,
  CHAT_MODULE_INFO,
} from './constants';

// Komponenten exportieren
export {
  ChatPage,
  ChatSidebar,
  ChatMessage,
  ChatInput,
  ChatFolder,
} from './components';

// --------------------------------------------
// Modul-Registration Funktion
// Wird beim App-Start aufgerufen um das Modul zu registrieren
// --------------------------------------------

import { CHAT_MODULE_INFO } from './constants';
import type { Module, Tool, Widget } from '@/types';

/**
 * Erstellt das vollständige Modul-Objekt für die Registry
 * Dieses Objekt enthält alle Metadaten und Komponenten
 */
export function createChatModule(): Module {
  // Basis-Modul aus den Konstanten
  const module: Module = {
    ...CHAT_MODULE_INFO,
    
    // Tools sind vollständige Anwendungen innerhalb des Moduls
    // Der Chat hat ein Haupt-Tool: die Chat-Ansicht
    tools: [
      {
        id: 'chat-main',
        moduleId: 'chat',
        name: 'Chat',
        description: 'KI-Assistent mit Chat-History und Ordner-System',
        version: '1.0.0',
        icon: 'MessageSquare',
        capabilities: ['chat', 'history', 'folders'],
        inputs: { fields: [] },
        outputs: { fields: [] },
        events: [
          {
            name: 'messageSent',
            description: 'Wird ausgelöst wenn eine Nachricht gesendet wurde',
            payload: { fields: [{ name: 'message', type: 'string', required: true }] },
          },
        ],
        // Component wird dynamisch geladen
        component: () => null,
        widgets: [],
      } as Tool,
    ],
    
    // Widgets sind kleine Vorschau-Komponenten für das Dashboard
    // Chat hat keine Widgets (kann später hinzugefügt werden)
    widgets: [],
    
    // Modul ist standardmäßig aktiv
    isActive: true,
    
    // Reihenfolge in der Sidebar (niedrig = weiter oben)
    // Chat ist im Hub, daher wird order nicht verwendet
    order: 0,
  };
  
  return module;
}

