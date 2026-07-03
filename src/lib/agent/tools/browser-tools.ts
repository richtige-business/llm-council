// ============================================
// browser-tools.ts - Browser-spezifische Agent Tools
// 
// DEPRECATED: Diese Datei wird nur noch für Rückwärtskompatibilität verwendet.
// Nutze stattdessen: @/modules/browser/agent/tools.ts
// 
// Die neuen Tools haben eingebettete Ausführungslogik und werden
// über die Tool Registry (@/lib/agent/registry) verwaltet.
// ============================================

import type { AgentTool } from '../types';

// --------------------------------------------
// Browser Tools
// Diese Tools ermöglichen dem Agent Browser-Aktionen
// --------------------------------------------

export const browserTools: AgentTool[] = [
  // ----------------------------------------
  // open_url - URL im Browser öffnen
  // ----------------------------------------
  {
    name: 'open_url',
    description: `Öffnet eine URL im integrierten Browser.
Verwende dieses Tool wenn der User eine Webseite öffnen möchte.
Beispiele: "Öffne google.com", "Geh zu youtube.de", "Zeig mir die Seite von Apple"`,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Die zu öffnende URL (z.B. "google.com", "https://example.de")',
        },
        newTab: {
          type: 'boolean',
          description: 'In neuem Tab öffnen? Standard: true',
        },
      },
      required: ['url'],
    },
    module: 'browser',
  },

  // ----------------------------------------
  // search_web - Google-Suche
  // ----------------------------------------
  {
    name: 'search_web',
    description: `Führt eine Google-Suche durch und zeigt die Ergebnisse im Browser.
Verwende dieses Tool wenn der User etwas im Internet suchen möchte.
Beispiele: "Such nach Restaurants in Berlin", "Google mal TypeScript Tutorial", "Finde Infos über KI"`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Der Suchbegriff',
        },
      },
      required: ['query'],
    },
    module: 'browser',
  },

  // ----------------------------------------
  // add_bookmark - Lesezeichen hinzufügen
  // ----------------------------------------
  {
    name: 'add_bookmark',
    description: `Fügt ein Lesezeichen für die aktuelle oder angegebene URL hinzu.
Verwende dieses Tool wenn der User eine Seite als Lesezeichen speichern möchte.
Beispiele: "Speichere diese Seite", "Lesezeichen für google.com", "Merke dir diese URL"`,
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Die URL für das Lesezeichen (optional, sonst aktuelle Seite)',
        },
        title: {
          type: 'string',
          description: 'Titel des Lesezeichens',
        },
        folder: {
          type: 'string',
          description: 'Optionaler Ordner für das Lesezeichen',
        },
      },
      required: [],
    },
    module: 'browser',
  },

  // ----------------------------------------
  // open_browser - Browser öffnen
  // ----------------------------------------
  {
    name: 'open_browser',
    description: `Öffnet den Browser als Tab.
Verwende dieses Tool wenn der User den Browser öffnen möchte ohne eine spezifische URL.
Beispiele: "Öffne den Browser", "Ich will surfen", "Zeig mir den Browser"`,
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    module: 'browser',
  },
];











