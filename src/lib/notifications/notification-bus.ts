// ============================================
// notification-bus.ts - System-Benachrichtigungs-Bus
// 
// Zweck: Ermöglicht Modulen, Benachrichtigungen an das Postfach zu senden
//        Nutzt ein Event-basiertes System für lose Kopplung
// Verwendet von: Kalender, Aufgaben, andere Module
// ============================================

import { create } from 'zustand';

// --------------------------------------------
// Typen für das Benachrichtigungssystem
// --------------------------------------------

/**
 * Priorität einer Benachrichtigung
 */
export type NotificationPriority = 'low' | 'normal' | 'high';

/**
 * Bekannte Quellen für System-Benachrichtigungen
 */
export type NotificationSource = 
  | 'calendar'   // Kalender-Erinnerungen
  | 'tasks'      // Aufgaben-Deadlines
  | 'notes'      // Notiz-Erinnerungen
  | 'system'     // System-Meldungen
  | 'contacts'   // Automatisch erstellte Kontakte
  | 'inbox'      // Postfach-Benachrichtigungen (Terminvorschläge etc.)
  | string;      // Erweiterbar für neue Module

/**
 * Neue Benachrichtigung (zum Erstellen)
 */
export interface NewNotification {
  source: NotificationSource;
  title: string;
  body: string;
  priority?: NotificationPriority;
  actionUrl?: string;        // Link zum relevanten Element
  metadata?: Record<string, unknown>;  // Zusätzliche Daten
}

/**
 * Vollständige Benachrichtigung (mit ID und Timestamps)
 */
export interface SystemNotification extends NewNotification {
  id: string;
  createdAt: string;
  isRead: boolean;
}

// --------------------------------------------
// Event-Listener Typen
// --------------------------------------------

type NotificationListener = (notification: SystemNotification) => void;

// --------------------------------------------
// Notification Bus Store
// Zentraler Hub für alle System-Benachrichtigungen
// --------------------------------------------

interface NotificationBusState {
  // Registrierte Listener
  listeners: Set<NotificationListener>;
  
  // Letzte Benachrichtigungen (für Debugging/Logs)
  recentNotifications: SystemNotification[];
  
  // Maximale Anzahl gespeicherter Benachrichtigungen
  maxRecent: number;
}

interface NotificationBusActions {
  // Listener registrieren
  subscribe: (listener: NotificationListener) => () => void;
  
  // Benachrichtigung senden
  publish: (notification: NewNotification) => SystemNotification;
  
  // Alle Listener benachrichtigen
  notifyListeners: (notification: SystemNotification) => void;
  
  // Recent-Liste leeren
  clearRecent: () => void;
}

type NotificationBusStore = NotificationBusState & NotificationBusActions;

// --------------------------------------------
// Store erstellen
// --------------------------------------------

export const useNotificationBus = create<NotificationBusStore>((set, get) => ({
  // Initial State
  listeners: new Set(),
  recentNotifications: [],
  maxRecent: 100,

  /**
   * Listener für neue Benachrichtigungen registrieren
   * Gibt eine Unsubscribe-Funktion zurück
   */
  subscribe: (listener) => {
    set((state) => ({
      listeners: new Set(state.listeners).add(listener),
    }));

    // Unsubscribe-Funktion zurückgeben
    return () => {
      set((state) => {
        const newListeners = new Set(state.listeners);
        newListeners.delete(listener);
        return { listeners: newListeners };
      });
    };
  },

  /**
   * Neue Benachrichtigung veröffentlichen
   * Sendet sie an alle registrierten Listener
   */
  publish: (notification) => {
    // Vollständige Benachrichtigung erstellen
    const fullNotification: SystemNotification = {
      ...notification,
      id: crypto.randomUUID(),
      priority: notification.priority || 'normal',
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    // In Recent-Liste speichern
    set((state) => ({
      recentNotifications: [
        fullNotification,
        ...state.recentNotifications.slice(0, state.maxRecent - 1),
      ],
    }));

    // Listener benachrichtigen
    get().notifyListeners(fullNotification);

    return fullNotification;
  },

  /**
   * Alle registrierten Listener benachrichtigen
   */
  notifyListeners: (notification) => {
    const { listeners } = get();
    listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Fehler im Notification-Listener:', error);
      }
    });
  },

  /**
   * Recent-Liste leeren
   */
  clearRecent: () => {
    set({ recentNotifications: [] });
  },
}));

// ============================================
// Convenience-Funktionen für Module
// Diese machen das Senden von Benachrichtigungen einfacher
// ============================================

/**
 * Benachrichtigung veröffentlichen (Shortcut)
 * 
 * @example
 * publishNotification({
 *   source: 'calendar',
 *   title: 'Termin in 15 Minuten',
 *   body: 'Meeting mit Max',
 *   priority: 'high',
 *   actionUrl: '/calendar?event=abc123',
 * });
 */
export function publishNotification(notification: NewNotification): SystemNotification {
  return useNotificationBus.getState().publish(notification);
}

/**
 * Auf neue Benachrichtigungen hören
 * 
 * @example
 * useEffect(() => {
 *   const unsubscribe = subscribeToNotifications((notification) => {
 *     console.log('Neue Benachrichtigung:', notification);
 *   });
 *   return unsubscribe;
 * }, []);
 */
export function subscribeToNotifications(
  listener: NotificationListener
): () => void {
  return useNotificationBus.getState().subscribe(listener);
}

// ============================================
// Vordefinierte Benachrichtigungs-Funktionen
// Für häufige Anwendungsfälle
// ============================================

/**
 * Kalender-Erinnerung senden
 */
export function sendCalendarReminder(
  title: string,
  body: string,
  eventId: string,
  minutesBefore: number
): SystemNotification {
  return publishNotification({
    source: 'calendar',
    title,
    body,
    priority: minutesBefore <= 5 ? 'high' : 'normal',
    actionUrl: `/calendar?event=${eventId}`,
    metadata: { eventId, minutesBefore },
  });
}

/**
 * Aufgaben-Erinnerung senden
 */
export function sendTaskReminder(
  title: string,
  body: string,
  taskId: string,
  isDueSoon: boolean
): SystemNotification {
  return publishNotification({
    source: 'tasks',
    title,
    body,
    priority: isDueSoon ? 'high' : 'normal',
    actionUrl: `/tasks?task=${taskId}`,
    metadata: { taskId, isDueSoon },
  });
}

/**
 * System-Meldung senden (für App-Updates, Fehler, etc.)
 */
export function sendSystemNotification(
  title: string,
  body: string,
  priority: NotificationPriority = 'normal'
): SystemNotification {
  return publishNotification({
    source: 'system',
    title,
    body,
    priority,
  });
}











