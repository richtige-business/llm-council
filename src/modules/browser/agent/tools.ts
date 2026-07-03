// ============================================
// tools.ts - Browser Module Agent Tools
// 
// Zweck: Definiert alle Agent-Tools für das Browser-Modul
//        mit eingebetteter Ausführungslogik
// Verwendet von: Tool Registry, API Route
// ============================================

import type { ModuleTool, ModuleToolResult } from '@/lib/agent/types';

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------

function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  return normalized;
}

// --------------------------------------------
// Browser Module Tools
// --------------------------------------------

export const browserModuleTools: ModuleTool[] = [
  // ========================================
  // NAVIGATE - URL im Browser öffnen
  // ========================================
  {
    id: 'browser.navigate',
    name: 'URL öffnen',
    description: `Öffnet eine URL im integrierten Browser.
Verwende dieses Tool wenn der User eine Webseite öffnen möchte.
Beispiele: "Öffne google.com", "Geh zu youtube.de", "Zeig mir die Seite von Apple"`,
    module: 'browser',
    
    inputSchema: {
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
    
    effects: ['ui', 'network'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { url, newTab } = input as { url: string; newTab?: boolean };
      const normalizedUrl = normalizeUrl(url);
      
      return {
        success: true,
        data: { 
          url: normalizedUrl, 
          newTab: newTab !== false,
        },
      };
    },
    
    createAction: (input, result) => {
      const { url, newTab } = result.data as { url: string; newTab: boolean };
      
      return {
        type: 'browser.navigate',
        module: 'browser',
        payload: { url, newTab },
        executed: false,
        timestamp: Date.now(),
      };
    },
  },

  // ========================================
  // SEARCH WEB - Google-Suche
  // ========================================
  {
    id: 'browser.search',
    name: 'Web-Suche',
    description: `Führt eine Google-Suche durch und zeigt die Ergebnisse im Browser.
Verwende dieses Tool wenn der User etwas im Internet suchen möchte.
Beispiele: "Such nach Restaurants in Berlin", "Google mal TypeScript Tutorial", "Finde Infos über KI"`,
    module: 'browser',
    
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Der Suchbegriff',
        },
      },
      required: ['query'],
    },
    
    effects: ['ui', 'network'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { query } = input as { query: string };
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      
      return {
        success: true,
        data: { query, url: searchUrl },
      };
    },
    
    createAction: (input, result) => {
      const { url } = result.data as { url: string };
      
      return {
        type: 'browser.navigate',
        module: 'browser',
        payload: { url, newTab: true },
        executed: false,
        timestamp: Date.now(),
      };
    },
  },

  // ========================================
  // ADD BOOKMARK - Lesezeichen hinzufügen
  // ========================================
  {
    id: 'browser.addBookmark',
    name: 'Lesezeichen hinzufügen',
    description: `Fügt ein Lesezeichen für die aktuelle oder angegebene URL hinzu.
Verwende dieses Tool wenn der User eine Seite als Lesezeichen speichern möchte.
Beispiele: "Speichere diese Seite", "Lesezeichen für google.com", "Merke dir diese URL"`,
    module: 'browser',
    
    inputSchema: {
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
    
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { url, title, folder } = input as {
        url?: string;
        title?: string;
        folder?: string;
      };
      
      return {
        success: true,
        data: { url, title, folder },
      };
    },
    
    createAction: (input) => ({
      type: 'browser.addBookmark',
      module: 'browser',
      payload: input as Record<string, unknown>,
      executed: false,
      timestamp: Date.now(),
    }),
  },

  // ========================================
  // OPEN BROWSER - Browser öffnen
  // ========================================
  {
    id: 'browser.open',
    name: 'Browser öffnen',
    description: `Öffnet den Browser als Tab.
Verwende dieses Tool wenn der User den Browser öffnen möchte ohne eine spezifische URL.
Beispiele: "Öffne den Browser", "Ich will surfen", "Zeig mir den Browser"`,
    module: 'browser',
    
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (): Promise<ModuleToolResult> => {
      return {
        success: true,
        data: {},
      };
    },
    
    createAction: () => ({
      type: 'browser.openTab',
      module: 'browser',
      payload: {},
      executed: false,
      timestamp: Date.now(),
    }),
  },

  // ========================================
  // GET STATUS - Browser-Status abfragen
  // ========================================
  {
    id: 'browser.getStatus',
    name: 'Browser-Status',
    description: `Liefert Informationen über den Browser-Status.
Verwende wenn User nach offenen Tabs oder Verlauf fragt.`,
    module: 'browser',
    
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    
    effects: [],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (): Promise<ModuleToolResult> => {
      // Status wird vom Frontend aus dem Store geholt
      return {
        success: true,
        data: {
          // Hinweis: Die tatsächlichen Tabs werden im Context-Provider gesammelt
        },
      };
    },
    
    createAction: () => null,
  },
  {
    id: 'browser.extractPage',
    name: 'Seiteninhalt extrahieren',
    description: 'Extrahiert lesbaren Inhalt aus der aktuellen Seite.',
    module: 'browser',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Optionaler Zielbereich oder Selektor',
        },
      },
      required: [],
    },
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: () => null,
  },
  {
    id: 'browser.summarizePage',
    name: 'Seite zusammenfassen',
    description: 'Erzeugt eine knappe Zusammenfassung der aktuellen Seite.',
    module: 'browser',
    inputSchema: {
      type: 'object',
      properties: {
        focus: {
          type: 'string',
          description: 'Optionaler Fokus für die Zusammenfassung',
        },
      },
      required: [],
    },
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: () => null,
  },
  {
    id: 'browser.readSelection',
    name: 'Browser-Auswahl lesen',
    description: 'Liest die aktuelle Textauswahl aus dem Browser-Kontext.',
    module: 'browser',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (): Promise<ModuleToolResult> => ({
      success: true,
      data: {},
    }),
    createAction: () => null,
  },
  {
    id: 'browser.downloadFile',
    name: 'Datei herunterladen',
    description: 'Löst einen Datei-Download im Browser aus.',
    module: 'browser',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Download-URL',
        },
        fileName: {
          type: 'string',
          description: 'Optionaler Dateiname',
        },
      },
      required: ['url'],
    },
    effects: ['network', 'storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => ({
      type: 'browser.downloadFile',
      module: 'browser',
      payload: {
        ...(input as Record<string, unknown>),
        resultData: result.data,
      },
      executed: false,
      timestamp: Date.now(),
    }),
  },
];
