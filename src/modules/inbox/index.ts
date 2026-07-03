// ============================================
// index.ts - Haupt-Export für das Inbox-Modul
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
  MessageType,
  MessagePriority,
  MessageFolder,
  EmailAccount,
  Message,
  Attachment,
  NewMessage,
  InboxState,
  InboxActions,
  InboxStore,
} from './types';

// Store und Hooks exportieren
export {
  useInboxStore,
  useInboxMessages,
  useSelectedFolder,
  useSearchQuery,
  getFilteredMessages,
  useSelectedMessage,
  useUnreadCount,
  useInboxAccounts,
  useAccountById,
  hydrateInboxStore,
} from './store';

// Konstanten exportieren
export {
  INBOX_MODULE_INFO,
  FOLDERS,
  PROVIDERS,
  PRIORITY_COLORS,
  SYSTEM_SOURCES,
  DEFAULT_FOLDER,
  MESSAGES_PER_PAGE,
  SYNC_INTERVAL_MS,
  KEYBOARD_SHORTCUTS,
  API_ENDPOINTS,
} from './constants';

// Widgets exportieren
export { UnreadCountWidget, RecentMessagesWidget } from './widgets';

// --------------------------------------------
// Modul-Registration Funktion
// Wird beim App-Start aufgerufen um das Modul zu registrieren
// --------------------------------------------

import { INBOX_MODULE_INFO } from './constants';
import type { Module, Tool, Widget } from '@/types';

/**
 * Erstellt das vollständige Modul-Objekt für die Registry
 */
export function createInboxModule(): Module {
  const module: Module = {
    ...INBOX_MODULE_INFO,
    
    // Tools: Das Haupt-Postfach
    tools: [
      {
        id: 'inbox-main',
        moduleId: 'inbox',
        name: 'Postfach',
        description: 'E-Mails und Benachrichtigungen verwalten',
        version: '1.0.0',
        icon: 'Mail',
        capabilities: ['view', 'create', 'edit', 'delete'],
        inputs: { fields: [] },
        outputs: { fields: [] },
        events: [
          {
            name: 'messageReceived',
            description: 'Wird ausgelöst wenn eine neue Nachricht eingeht',
            payload: { fields: [{ name: 'message', type: 'object', required: true }] },
          },
          {
            name: 'messageRead',
            description: 'Wird ausgelöst wenn eine Nachricht gelesen wird',
            payload: { fields: [{ name: 'messageId', type: 'string', required: true }] },
          },
          {
            name: 'messageSent',
            description: 'Wird ausgelöst wenn eine Nachricht gesendet wird',
            payload: { fields: [{ name: 'message', type: 'object', required: true }] },
          },
        ],
        component: () => null,  // Wird dynamisch geladen
        widgets: [],
      } as Tool,
    ],
    
    // Widgets für das Dashboard
    widgets: [
      {
        id: 'unread-count',
        toolId: 'inbox-main',
        name: 'Ungelesene Nachrichten',
        description: 'Zeigt die Anzahl ungelesener Nachrichten',
        size: 'small',
        refreshInterval: 60000,
        component: () => null,
      } as Widget,
      {
        id: 'recent-messages',
        toolId: 'inbox-main',
        name: 'Letzte Nachrichten',
        description: 'Zeigt die neuesten Nachrichten',
        size: 'medium',
        refreshInterval: 60000,
        component: () => null,
      } as Widget,
    ],
    
    isActive: true,
    order: 2,  // Nach dem Kalender
  };
  
  return module;
}

