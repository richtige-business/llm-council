// ============================================
// app-tools.ts - Allgemeine App-Tools
// 
// DEPRECATED: Diese Datei wird nur noch für Rückwärtskompatibilität verwendet.
// Nutze stattdessen: @/lib/agent/tools/app-module-tools.ts
// 
// Die neuen Tools haben eingebettete Ausführungslogik und werden
// über die Tool Registry (@/lib/agent/registry) verwaltet.
// ============================================

import type { AgentTool } from '../types';

// --------------------------------------------
// App Tools
// Diese Tools ermöglichen dem Agent allgemeine App-Aktionen
// --------------------------------------------

export const appTools: AgentTool[] = [
  // ----------------------------------------
  // open_module - Modul als Tab öffnen
  // ----------------------------------------
  {
    name: 'open_module',
    description: `Öffnet ein LifeOS-Modul als Tab.
Verwende dieses Tool wenn der User ein bestimmtes Modul öffnen möchte.
Beispiele: "Öffne den Kalender", "Geh zum Chat", "Zeig mir die Bibliothek"`,
    parameters: {
      type: 'object',
      properties: {
        moduleId: {
          type: 'string',
          description: 'ID des zu öffnenden Moduls',
          enum: ['calendar', 'inbox', 'browser', 'agents', 'library', 'lab', 'settings'],
        },
      },
      required: ['moduleId'],
    },
    module: 'app',
  },

  // ----------------------------------------
  // navigate_to - Zur Seite navigieren
  // ----------------------------------------
  {
    name: 'navigate_to',
    description: `Navigiert zu einer bestimmten Seite in der App.
Verwende dieses Tool wenn der User zu einer Seite navigieren möchte.
Beispiele: "Geh zur Startseite", "Öffne Einstellungen", "Zeig mir das Dashboard"`,
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Pfad der Seite (z.B. "/", "/calendar", "/settings")',
        },
      },
      required: ['path'],
    },
    module: 'app',
  },

  // ----------------------------------------
  // change_background - Hintergrundbild ändern
  // ----------------------------------------
  {
    name: 'change_background',
    description: `Ändert das Hintergrundbild der App.
Verwende dieses Tool wenn der User das Hintergrundbild ändern möchte.
Beispiele: "Ändere den Hintergrund", "Neues Wallpaper", "Zeig mir die Berge als Hintergrund"`,
    parameters: {
      type: 'object',
      properties: {
        backgroundId: {
          type: 'string',
          description: 'ID des Hintergrunds',
          enum: ['mountains-lake', 'northern-lights', 'forest-mist', 'ocean-sunset', 'city-night', 'desert-dunes'],
        },
        customUrl: {
          type: 'string',
          description: 'Alternativ: Benutzerdefinierte URL für ein Bild',
        },
      },
      required: [],
    },
    module: 'app',
  },

  // ----------------------------------------
  // toggle_sidebar - Sidebar öffnen/schließen
  // ----------------------------------------
  {
    name: 'toggle_sidebar',
    description: `Öffnet oder schließt die Sidebar.
Verwende dieses Tool wenn der User die Sidebar sehen oder verstecken möchte.
Beispiele: "Öffne die Sidebar", "Versteck die Seitenleiste", "Zeig mir das Menü"`,
    parameters: {
      type: 'object',
      properties: {
        open: {
          type: 'boolean',
          description: 'true = öffnen, false = schließen. Falls nicht angegeben: toggle',
        },
      },
      required: [],
    },
    module: 'app',
  },

  // ----------------------------------------
  // show_help - Hilfe anzeigen
  // ----------------------------------------
  {
    name: 'show_help',
    description: `Zeigt Hilfe zu einem Thema oder der App allgemein.
Verwende dieses Tool wenn der User Hilfe braucht oder nicht weiß was er tun soll.
Beispiele: "Hilfe", "Was kann ich hier machen?", "Wie erstelle ich einen Termin?"`,
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Optionales Thema für spezifische Hilfe',
          enum: ['calendar', 'inbox', 'browser', 'agents', 'general'],
        },
      },
      required: [],
    },
    module: 'app',
  },
];











