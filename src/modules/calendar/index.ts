// ============================================
// index.ts - Haupt-Export für das Kalender-Modul
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
  CalendarEvent,
  Category,
  RecurrenceRule,
  Reminder,
  CalendarView,
  CalendarState,
  CalendarActions,
  CalendarStore,
} from './types';

// Store und Hooks exportieren
export {
  useCalendarStore,
  useCalendarEvents,
  useCalendarCategories,
  useCategoryById,
  getEventsForDate,      // Hilfsfunktion (mit useMemo verwenden!)
  getUpcomingEvents,     // Hilfsfunktion (mit useMemo verwenden!)
  hydrateCalendarStore,  // Für SSR-Hydration
} from './store';

// Konstanten exportieren
export {
  DEFAULT_CATEGORIES,
  WEEKDAYS_SHORT,
  WEEKDAYS_LONG,
  MONTHS,
  REMINDER_OPTIONS,
  RECURRENCE_OPTIONS,
  TIME_SLOTS,
  CALENDAR_MODULE_INFO,
} from './constants';

// Datum-Utilities exportieren
export {
  formatDate,
  formatDateShort,
  formatTime,
  formatDateTime,
  getMonthDays,
  isInMonth,
  getWeekDays,
  getWeekNumber,
  isSameDay,
  isToday,
  isPast,
  isFuture,
  toISODateString,
  toISOString,
  combineDateAndTime,
  getRelativeTime,
} from './utils/date-utils';

// Widgets exportieren
export {
  UpcomingEventsWidget,
  MiniCalendarWidget,
} from './widgets';

// --------------------------------------------
// Modul-Registration Funktion
// Wird beim App-Start aufgerufen um das Modul zu registrieren
// --------------------------------------------

import { CALENDAR_MODULE_INFO } from './constants';
import type { Module, Tool, Widget } from '@/types';

/**
 * Erstellt das vollständige Modul-Objekt für die Registry
 * Dieses Objekt enthält alle Metadaten und Komponenten
 */
export function createCalendarModule(): Module {
  // Basis-Modul aus den Konstanten
  const module: Module = {
    ...CALENDAR_MODULE_INFO,
    
    // Tools sind vollständige Anwendungen innerhalb des Moduls
    // Der Kalender hat ein Haupt-Tool: die Kalender-Ansicht
    tools: [
      {
        id: 'calendar-main',
        moduleId: 'calendar',
        name: 'Kalender',
        description: 'Monats-, Wochen- und Tagesansicht',
        version: '1.0.0',
        icon: 'Calendar',
        capabilities: ['view', 'create', 'edit', 'delete'],
        inputs: { fields: [] },
        outputs: { fields: [] },
        events: [
          {
            name: 'eventCreated',
            description: 'Wird ausgelöst wenn ein Event erstellt wird',
            payload: { fields: [{ name: 'event', type: 'object', required: true }] },
          },
          {
            name: 'eventUpdated',
            description: 'Wird ausgelöst wenn ein Event geändert wird',
            payload: { fields: [{ name: 'event', type: 'object', required: true }] },
          },
          {
            name: 'eventDeleted',
            description: 'Wird ausgelöst wenn ein Event gelöscht wird',
            payload: { fields: [{ name: 'eventId', type: 'string', required: true }] },
          },
        ],
        // Component wird dynamisch geladen
        component: () => null,
        widgets: [],
      } as Tool,
    ],
    
    // Widgets sind kleine Vorschau-Komponenten für das Dashboard
    widgets: [
      {
        id: 'upcoming-events',
        toolId: 'calendar-main',
        name: 'Nächste Termine',
        description: 'Zeigt die kommenden Events an',
        size: 'medium',
        refreshInterval: 60000, // Jede Minute aktualisieren
        component: () => null,
      } as Widget,
      {
        id: 'mini-calendar',
        toolId: 'calendar-main',
        name: 'Mini-Kalender',
        description: 'Kompakte Monatsübersicht',
        size: 'small',
        component: () => null,
      } as Widget,
    ],
    
    // Modul ist standardmäßig aktiv
    isActive: true,
    
    // Reihenfolge in der Sidebar (niedrig = weiter oben)
    order: 1,
  };
  
  return module;
}

