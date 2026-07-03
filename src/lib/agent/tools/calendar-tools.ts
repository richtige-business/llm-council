// ============================================
// calendar-tools.ts - Kalender-spezifische Agent Tools
// 
// DEPRECATED: Diese Datei wird nur noch für Rückwärtskompatibilität verwendet.
// Nutze stattdessen: @/modules/calendar/agent/tools.ts
// 
// Die neuen Tools haben eingebettete Ausführungslogik und werden
// über die Tool Registry (@/lib/agent/registry) verwaltet.
// ============================================

import type { AgentTool } from '../types';

// --------------------------------------------
// Kalender Tools
// Diese Tools ermöglichen dem Agent Kalender-Aktionen
// --------------------------------------------

export const calendarTools: AgentTool[] = [
  // ----------------------------------------
  // create_event - Neuen Termin erstellen
  // ----------------------------------------
  {
    name: 'create_event',
    description: `Erstellt einen neuen Termin im Kalender. 
Verwende dieses Tool wenn der User einen Termin, ein Meeting, eine Verabredung oder ein Event erstellen möchte.
Beispiele: "Termin mit Max um 14 Uhr", "Meeting morgen um 10", "Arzttermin am Freitag"`,
    parameters: {
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
    module: 'calendar',
  },

  // ----------------------------------------
  // list_events - Termine auflisten
  // ----------------------------------------
  {
    name: 'list_events',
    description: `Listet Termine für einen bestimmten Tag oder Zeitraum auf.
Verwende dieses Tool wenn der User wissen möchte welche Termine er hat.
Beispiele: "Was habe ich heute?", "Zeig mir meine Termine morgen", "Termine diese Woche"`,
    parameters: {
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
    module: 'calendar',
  },

  // ----------------------------------------
  // delete_event - Termin löschen
  // ----------------------------------------
  {
    name: 'delete_event',
    description: `Löscht einen bestehenden Termin aus dem Kalender.
Verwende dieses Tool wenn der User einen Termin löschen oder absagen möchte.
Beispiele: "Lösche den Termin mit Max", "Sag das Meeting ab"`,
    parameters: {
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
    module: 'calendar',
  },

  // ----------------------------------------
  // open_calendar - Kalender öffnen
  // ----------------------------------------
  {
    name: 'open_calendar',
    description: `Öffnet den Kalender als Tab.
Verwende dieses Tool wenn der User den Kalender sehen oder öffnen möchte.
Beispiele: "Zeig mir den Kalender", "Öffne Kalender", "Geh zum Kalender"`,
    parameters: {
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
    module: 'calendar',
  },
];











