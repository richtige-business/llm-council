// ============================================
// tools.ts - Calendar Module Agent Tools
// 
// Zweck: Definiert alle Agent-Tools für das Kalender-Modul
//        mit eingebetteter Ausführungslogik
// Verwendet von: Tool Registry, API Route
// ============================================

import type { ModuleTool, ModuleToolResult, ToolExecutionContext } from '@/lib/agent/types';

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateGerman(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// --------------------------------------------
// Calendar Module Tools
// --------------------------------------------

export const calendarModuleTools: ModuleTool[] = [
  // ========================================
  // CREATE EVENT - Termin erstellen
  // ========================================
  {
    id: 'calendar.createEvent',
    name: 'Termin erstellen',
    description: `Erstellt einen neuen Termin im Kalender.
Verwende dieses Tool wenn der User einen Termin, ein Meeting, eine Verabredung oder ein Event erstellen möchte.
Beispiele: "Termin mit Max um 14 Uhr", "Meeting morgen um 10", "Arzttermin am Freitag"`,
    module: 'calendar',
    
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titel des Termins (z.B. "Meeting mit Max", "Arzttermin")',
        },
        date: {
          type: 'string',
          description: 'Datum im Format YYYY-MM-DD (z.B. "2025-01-16")',
        },
        startTime: {
          type: 'string',
          description: 'Startzeit im Format HH:MM (z.B. "14:00")',
        },
        endTime: {
          type: 'string',
          description: 'Endzeit im Format HH:MM (z.B. "15:00"). Falls nicht angegeben, wird 1 Stunde nach Startzeit verwendet.',
        },
        description: {
          type: 'string',
          description: 'Optionale Beschreibung des Termins',
        },
        allDay: {
          type: 'boolean',
          description: 'Ist es ein ganztägiges Event? Standard: false',
        },
        categoryId: {
          type: 'string',
          description: 'Kategorie-ID (z.B. "work", "private", "important"). Standard: "private"',
          enum: ['work', 'private', 'important', 'family', 'health'],
        },
      },
      required: ['title', 'date'],
    },
    
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
    
    execute: async (input, context): Promise<ModuleToolResult> => {
      const { title, date, startTime, endTime, description, allDay, categoryId } = input as {
        title: string;
        date: string;
        startTime?: string;
        endTime?: string;
        description?: string;
        allDay?: boolean;
        categoryId?: string;
      };

      // Berechne Start- und Endzeit
      const startDateTime = startTime 
        ? `${date}T${startTime}:00` 
        : `${date}T09:00:00`;
      
      const calculatedEndTime = endTime 
        ? `${date}T${endTime}:00`
        : startTime 
          ? `${date}T${String(parseInt(startTime.split(':')[0]) + 1).padStart(2, '0')}:${startTime.split(':')[1]}:00`
          : `${date}T10:00:00`;

      // Event-Daten für die Action vorbereiten
      const eventData = {
        title,
        startDate: startDateTime,
        endDate: calculatedEndTime,
        description: description || '',
        allDay: allDay || false,
        categoryId: categoryId || 'private',
        reminders: [],
      };

      return {
        success: true,
        data: eventData,
        events: [{
          type: 'calendar.eventCreated',
          payload: { title, date, startTime },
          sourceModuleId: 'calendar',
          timestamp: Date.now(),
          traceId: context.traceId,
        }],
      };
    },
    
    createAction: (input, result) => {
      if (!result.success) return null;
      
      const eventData = result.data as {
        title: string;
        startDate: string;
        endDate: string;
        description: string;
        allDay: boolean;
        categoryId: string;
        reminders: Array<{ id: string; minutesBefore: number; type: string }>;
      };
      
      return {
        type: 'calendar.createEvent',
        module: 'calendar',
        payload: eventData,
        executed: false,
        timestamp: Date.now(),
      };
    },
  },

  // ========================================
  // LIST EVENTS - Termine auflisten
  // ========================================
  {
    id: 'calendar.listEvents',
    name: 'Termine anzeigen',
    description: `Listet Termine für einen bestimmten Tag oder Zeitraum auf.
Verwende dieses Tool wenn der User wissen möchte welche Termine er hat.
Beispiele: "Was habe ich heute?", "Zeig mir meine Termine morgen", "Termine diese Woche"`,
    module: 'calendar',
    
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Datum im Format YYYY-MM-DD. Falls nicht angegeben, wird heute verwendet.',
        },
        endDate: {
          type: 'string',
          description: 'Optionales Enddatum für einen Zeitraum (YYYY-MM-DD)',
        },
      },
      required: [],
    },
    
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { date, endDate } = input as { date?: string; endDate?: string };
      const targetDate = date || getTodayISO();
      
      return {
        success: true,
        data: { date: targetDate, endDate },
      };
    },
    
    createAction: (input, result) => {
      const { date } = result.data as { date: string };
      
      return {
        type: 'calendar.openTab',
        module: 'calendar',
        payload: { date },
        executed: false,
        timestamp: Date.now(),
      };
    },
  },

  // ========================================
  // DELETE EVENT - Termin löschen
  // ========================================
  {
    id: 'calendar.deleteEvent',
    name: 'Termin löschen',
    description: `Löscht einen bestehenden Termin aus dem Kalender.
Verwende dieses Tool wenn der User einen Termin löschen oder absagen möchte.
Beispiele: "Lösche den Termin mit Max", "Sag das Meeting ab"`,
    module: 'calendar',
    
    inputSchema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'ID des zu löschenden Events',
        },
        title: {
          type: 'string',
          description: 'Alternativ: Titel des Events um es zu finden',
        },
        date: {
          type: 'string',
          description: 'Datum des Events (hilft bei der Suche)',
        },
      },
      required: [],
    },
    
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { eventId, title, date } = input as {
        eventId?: string;
        title?: string;
        date?: string;
      };
      
      return {
        success: true,
        data: { eventId, title, date },
      };
    },
    
    createAction: (input) => ({
      type: 'calendar.deleteEvent',
      module: 'calendar',
      payload: input as Record<string, unknown>,
      executed: false,
      timestamp: Date.now(),
    }),
  },

  // ========================================
  // OPEN CALENDAR - Kalender öffnen
  // ========================================
  {
    id: 'calendar.open',
    name: 'Kalender öffnen',
    description: `Öffnet den Kalender als Tab.
Verwende dieses Tool wenn der User den Kalender sehen oder öffnen möchte.
Beispiele: "Zeig mir den Kalender", "Öffne Kalender", "Geh zum Kalender"`,
    module: 'calendar',
    
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Optionales Datum zu dem navigiert werden soll (YYYY-MM-DD)',
        },
        view: {
          type: 'string',
          description: 'Welche Ansicht soll geöffnet werden?',
          enum: ['month', 'week', 'day'],
        },
      },
      required: [],
    },
    
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { date, view } = input as { date?: string; view?: string };
      
      return {
        success: true,
        data: { date, view },
      };
    },
    
    createAction: (input) => ({
      type: 'calendar.openTab',
      module: 'calendar',
      payload: input as Record<string, unknown>,
      executed: false,
      timestamp: Date.now(),
    }),
  },

  // ========================================
  // GET STATUS - Kalender-Status abfragen
  // ========================================
  {
    id: 'calendar.getStatus',
    name: 'Kalender-Status',
    description: `Liefert Informationen über heutige und kommende Termine.
Verwende wenn User nach seinem Terminplan fragt.
Beispiele: "Was steht heute an?", "Habe ich heute Termine?"`,
    module: 'calendar',
    
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    
    effects: [],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (): Promise<ModuleToolResult> => {
      // Diese Funktion liefert nur Metadaten
      // Die eigentlichen Events werden vom Frontend aus dem Store geholt
      const today = getTodayISO();
      
      return {
        success: true,
        data: {
          today,
          todayFormatted: formatDateGerman(today),
          // Hinweis: Die tatsächlichen Events werden im Context-Provider gesammelt
        },
      };
    },
    
    createAction: () => null, // Keine UI-Action nötig
  },

  // ========================================
  // UPDATE EVENT - Termin aktualisieren
  // ========================================
  {
    id: 'calendar.updateEvent',
    name: 'Termin aktualisieren',
    description: `Aktualisiert einen bestehenden Termin.
Verwende wenn User einen Termin verschieben oder ändern möchte.
Beispiele: "Verschiebe das Meeting auf 15 Uhr", "Ändere den Titel"`,
    module: 'calendar',
    
    inputSchema: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'ID des zu ändernden Events',
        },
        title: {
          type: 'string',
          description: 'Neuer Titel (optional)',
        },
        date: {
          type: 'string',
          description: 'Neues Datum (YYYY-MM-DD, optional)',
        },
        startTime: {
          type: 'string',
          description: 'Neue Startzeit (HH:MM, optional)',
        },
        endTime: {
          type: 'string',
          description: 'Neue Endzeit (HH:MM, optional)',
        },
        description: {
          type: 'string',
          description: 'Neue Beschreibung (optional)',
        },
        categoryId: {
          type: 'string',
          description: 'Neue Kategorie (optional)',
        },
      },
      required: ['eventId'],
    },
    
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      return {
        success: true,
        data: input,
      };
    },
    
    createAction: (input) => ({
      type: 'calendar.updateEvent' as 'calendar.createEvent', // Type assertion für Kompatibilität
      module: 'calendar',
      payload: input as Record<string, unknown>,
      executed: false,
      timestamp: Date.now(),
    }),
  },
];
