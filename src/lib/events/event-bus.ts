// ============================================
// event-bus.ts - Inter-Modul Event System
// 
// Zweck: Ermöglicht Kommunikation zwischen Modulen
//        Module können Events emittieren und abonnieren
// Verwendet von: Alle Module, Module Builder
// ============================================

import { create } from 'zustand';
import type { AppEvent, EventHandler } from '@/types';

// --------------------------------------------
// Event Bus State Interface
// Speichert alle Handler und Event-History
// --------------------------------------------

interface EventBusState {
  // Map von Event-Type zu Set von Handlern
  handlers: Map<string, Set<EventHandler>>;
  // Letzte 100 Events für Debugging
  history: AppEvent[];
  // Ob Debug-Modus aktiv ist
  debugMode: boolean;
}

// --------------------------------------------
// Event Bus Actions Interface
// Alle verfügbaren Aktionen
// --------------------------------------------

interface EventBusActions {
  // Event emittieren (wird an alle passenden Handler gesendet)
  emit: <T>(event: Omit<AppEvent<T>, 'timestamp'>) => void;
  
  // Auf spezifischen Event-Type abonnieren
  subscribe: (eventType: string, handler: EventHandler) => () => void;
  
  // Auf alle Events eines Moduls abonnieren
  subscribeToModule: (moduleId: string, handler: EventHandler) => () => void;
  
  // Auf alle Events abonnieren (für Debugging)
  subscribeToAll: (handler: EventHandler) => () => void;
  
  // Debug-Modus umschalten
  setDebugMode: (enabled: boolean) => void;
  
  // Event-History abrufen
  getHistory: (limit?: number) => AppEvent[];
  
  // Event-History löschen
  clearHistory: () => void;
}

// --------------------------------------------
// Event Bus Store
// Zentraler Zustand für alle Events
// --------------------------------------------

export const useEventBus = create<EventBusState & EventBusActions>((set, get) => ({
  // Initial State
  handlers: new Map(),
  history: [],
  debugMode: false,

  // --------------------------------------------
  // emit - Event an alle Handler senden
  // --------------------------------------------
  emit: <T>(event: Omit<AppEvent<T>, 'timestamp'>) => {
    // Vollständiges Event mit Timestamp erstellen
    const fullEvent: AppEvent<T> = {
      ...event,
      timestamp: Date.now(),
    };

    const { handlers, debugMode } = get();
    
    // Debug-Logging wenn aktiviert
    if (debugMode) {
      console.log('🔔 Event emitted:', fullEvent.type, fullEvent);
    }

    // Event in History speichern (max 100 Events)
    set((state) => ({
      history: [...state.history.slice(-99), fullEvent as AppEvent],
    }));

    // Handler aufrufen basierend auf verschiedenen Patterns
    
    // 1. Exakter Event-Type Match (z.B. "calendar.event.created")
    const exactHandlers = handlers.get(event.type);
    exactHandlers?.forEach(handler => {
      try {
        handler(fullEvent as AppEvent);
      } catch (error) {
        console.error(`Error in event handler for "${event.type}":`, error);
      }
    });
    
    // 2. Modul-Wildcard Match (z.B. "calendar.*" matcht alle Calendar Events)
    const moduleWildcard = `${event.source.moduleId}.*`;
    const moduleHandlers = handlers.get(moduleWildcard);
    moduleHandlers?.forEach(handler => {
      try {
        handler(fullEvent as AppEvent);
      } catch (error) {
        console.error(`Error in module handler for "${moduleWildcard}":`, error);
      }
    });
    
    // 3. Global Wildcard Match (alle Events)
    const globalHandlers = handlers.get('*');
    globalHandlers?.forEach(handler => {
      try {
        handler(fullEvent as AppEvent);
      } catch (error) {
        console.error('Error in global event handler:', error);
      }
    });
  },

  // --------------------------------------------
  // subscribe - Auf Event-Type abonnieren
  // Gibt Cleanup-Funktion zurück
  // --------------------------------------------
  subscribe: (eventType: string, handler: EventHandler) => {
    const { handlers } = get();
    
    // Handler-Set erstellen falls nicht vorhanden
    if (!handlers.has(eventType)) {
      handlers.set(eventType, new Set());
    }
    
    // Handler hinzufügen
    handlers.get(eventType)!.add(handler);
    
    // Cleanup-Funktion für useEffect
    return () => {
      handlers.get(eventType)?.delete(handler);
      // Leeres Set entfernen
      if (handlers.get(eventType)?.size === 0) {
        handlers.delete(eventType);
      }
    };
  },

  // --------------------------------------------
  // subscribeToModule - Alle Events eines Moduls abonnieren
  // --------------------------------------------
  subscribeToModule: (moduleId: string, handler: EventHandler) => {
    return get().subscribe(`${moduleId}.*`, handler);
  },

  // --------------------------------------------
  // subscribeToAll - Alle Events abonnieren (für Debugging)
  // --------------------------------------------
  subscribeToAll: (handler: EventHandler) => {
    return get().subscribe('*', handler);
  },

  // --------------------------------------------
  // Debug-Modus
  // --------------------------------------------
  setDebugMode: (enabled: boolean) => {
    set({ debugMode: enabled });
    if (enabled) {
      console.log('🔔 Event Bus Debug Mode: ENABLED');
    }
  },

  // --------------------------------------------
  // History Zugriff
  // --------------------------------------------
  getHistory: (limit = 100) => {
    const { history } = get();
    return history.slice(-limit);
  },

  clearHistory: () => {
    set({ history: [] });
  },
}));

// ============================================
// Standard Events
// Vordefinierte Event-Types für Module
// ============================================

export const STANDARD_EVENTS = {
  // Calendar Events
  CALENDAR_EVENT_CREATED: 'calendar.event.created',
  CALENDAR_EVENT_UPDATED: 'calendar.event.updated',
  CALENDAR_EVENT_DELETED: 'calendar.event.deleted',
  CALENDAR_DATE_CHANGED: 'calendar.date.changed',
  
  // Inbox Events
  INBOX_EMAIL_RECEIVED: 'inbox.email.received',
  INBOX_EMAIL_SENT: 'inbox.email.sent',
  INBOX_EMAIL_READ: 'inbox.email.read',
  INBOX_EMAIL_DELETED: 'inbox.email.deleted',
  
  // Browser Events
  BROWSER_URL_CHANGED: 'browser.url.changed',
  BROWSER_TAB_OPENED: 'browser.tab.opened',
  BROWSER_TAB_CLOSED: 'browser.tab.closed',
  BROWSER_BOOKMARK_ADDED: 'browser.bookmark.added',
  
  // Generic Data Events (für benutzerdefinierte Module)
  DATA_CREATED: 'data.created',
  DATA_UPDATED: 'data.updated',
  DATA_DELETED: 'data.deleted',
  
  // UI/Notification Events
  NOTIFICATION_SHOW: 'ui.notification.show',
  NOTIFICATION_DISMISS: 'ui.notification.dismiss',
  MODAL_OPEN: 'ui.modal.open',
  MODAL_CLOSE: 'ui.modal.close',
  
  // Module Lifecycle Events
  MODULE_ACTIVATED: 'module.activated',
  MODULE_DEACTIVATED: 'module.deactivated',
  MODULE_ERROR: 'module.error',
  
  // Cross-Module Communication
  MODULE_DATA_REQUEST: 'module.data.request',
  MODULE_DATA_RESPONSE: 'module.data.response',
} as const;

// Type für Standard-Events
export type StandardEventType = typeof STANDARD_EVENTS[keyof typeof STANDARD_EVENTS];

// ============================================
// useModuleEvents Hook
// Vereinfachte API für Module
// ============================================

export function useModuleEvents(moduleId: string, toolId: string = 'default') {
  const emit = useEventBus((state) => state.emit);
  const subscribe = useEventBus((state) => state.subscribe);
  const subscribeToModule = useEventBus((state) => state.subscribeToModule);

  return {
    // Event emittieren mit automatischer Source
    emit: <T>(type: string, payload: T) => emit({
      type,
      source: { moduleId, toolId },
      payload,
    }),
    
    // Auf spezifischen Event-Type abonnieren
    subscribe,
    
    // Auf alle Events eines anderen Moduls abonnieren
    subscribeToModule,
    
    // Helfer für Standard-Events
    emitDataCreated: <T>(data: T) => emit({
      type: STANDARD_EVENTS.DATA_CREATED,
      source: { moduleId, toolId },
      payload: data,
    }),
    
    emitDataUpdated: <T>(data: T) => emit({
      type: STANDARD_EVENTS.DATA_UPDATED,
      source: { moduleId, toolId },
      payload: data,
    }),
    
    emitDataDeleted: (id: string) => emit({
      type: STANDARD_EVENTS.DATA_DELETED,
      source: { moduleId, toolId },
      payload: { id },
    }),
    
    // Notification Helper
    showNotification: (message: string, type: 'success' | 'error' | 'info' = 'info') => emit({
      type: STANDARD_EVENTS.NOTIFICATION_SHOW,
      source: { moduleId, toolId },
      payload: { message, type },
    }),
  };
}

// ============================================
// Event Payload Types
// TypeScript Types für Event Payloads
// ============================================

export interface CalendarEventPayload {
  eventId: string;
  title: string;
  startDate: string;
  endDate: string;
  categoryId?: string;
}

export interface InboxEmailPayload {
  emailId: string;
  subject: string;
  from: string;
  to: string[];
}

export interface NotificationPayload {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export interface DataPayload<T = unknown> {
  id: string;
  data: T;
  moduleId: string;
}



