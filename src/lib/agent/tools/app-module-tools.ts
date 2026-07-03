// ============================================
// app-module-tools.ts - App-weite Agent Tools
// 
// Zweck: Definiert Tools für App-weite Aktionen
//        (Navigation, Theming, Sidebar, etc.)
// Verwendet von: Tool Registry, API Route
// ============================================

import type { ModuleTool, ModuleToolResult } from '../types';
import { createToolRuntimeAction } from './runtime-action';

// --------------------------------------------
// Modul-Namen Mapping
// --------------------------------------------

const MODULE_NAMES: Record<string, string> = {
  calendar: 'Kalender',
  inbox: 'Postfach',
  browser: 'Browser',
  chat: 'Chat',
  library: 'Bibliothek',
  lab: 'Labor',
  settings: 'Einstellungen',
  training: 'Training',
};

// --------------------------------------------
// Hintergrund-Bilder
// --------------------------------------------

const BACKGROUNDS: Record<string, string> = {
  'mountains-lake': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'northern-lights': 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80',
  'forest-mist': 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80',
  'ocean-sunset': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
  'city-night': 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80',
  'desert-dunes': 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80',
};

const BACKGROUND_NAMES: Record<string, string> = {
  'mountains-lake': 'Bergsee',
  'northern-lights': 'Nordlichter',
  'forest-mist': 'Nebelwald',
  'ocean-sunset': 'Ozean Sonnenuntergang',
  'city-night': 'Stadt bei Nacht',
  'desert-dunes': 'Wüstendünen',
};

// --------------------------------------------
// Hilfe-Texte
// --------------------------------------------

const HELP_TEXTS: Record<string, string> = {
  calendar: `📅 **Kalender-Hilfe**
- "Erstelle einen Termin mit Max morgen um 14 Uhr"
- "Was habe ich heute?"
- "Zeig mir den Kalender"
- "Lösche den Termin mit Max"`,
  inbox: `📧 **Postfach-Hilfe**
- "Schreib eine Mail an max@example.de"
- "Zeig mir meine Mails"
- "Suche Mails von Max"`,
  browser: `🌐 **Browser-Hilfe**
- "Öffne google.com"
- "Such nach TypeScript Tutorial"
- "Speichere diese Seite als Lesezeichen"`,
  chat: `💬 **Chat-Hilfe**
Du kannst mir Fragen stellen oder mich bitten Aktionen auszuführen.
Ich kann Termine erstellen, Mails schreiben, Webseiten öffnen und mehr!`,
  general: `🚀 **LifeOS Hilfe**

Ich bin dein persönlicher Assistent und kann dir bei vielen Dingen helfen:

📅 **Kalender**: Termine erstellen, anzeigen, löschen
📧 **Postfach**: Mails schreiben, suchen
🌐 **Browser**: Webseiten öffnen, suchen
⚙️ **App**: Module öffnen, Hintergrund ändern

Probiere einfach aus! Zum Beispiel:
- "Erstelle einen Termin mit Max morgen um 14 Uhr"
- "Schreib eine Mail an chef@firma.de"
- "Öffne google.com"`,
};

// --------------------------------------------
// App Module Tools
// --------------------------------------------

export const appModuleTools: ModuleTool[] = [
  // ========================================
  // OPEN MODULE - Modul als Tab öffnen
  // ========================================
  {
    id: 'app.openModule',
    name: 'Modul öffnen',
    description: `Öffnet ein LifeOS-Modul als Tab.
Verwende dieses Tool wenn der User ein bestimmtes Modul öffnen möchte.
Beispiele: "Öffne den Kalender", "Geh zum Chat", "Zeig mir die Bibliothek"`,
    module: 'app',
    
    inputSchema: {
      type: 'object',
      properties: {
        moduleId: {
          type: 'string',
          description: 'ID des zu öffnenden Moduls',
          enum: ['calendar', 'inbox', 'browser', 'agents', 'library', 'lab', 'settings', 'training'],
        },
      },
      required: ['moduleId'],
    },
    
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { moduleId } = input as { moduleId: string };
      const moduleName = MODULE_NAMES[moduleId] || moduleId;
      
      return {
        success: true,
        data: { moduleId, moduleName },
      };
    },
    
    createAction: (input) => ({
      type: 'app.openModule',
      module: 'app',
      payload: { moduleId: (input as { moduleId: string }).moduleId },
      executed: false,
      timestamp: Date.now(),
    }),
  },

  // ========================================
  // NAVIGATE TO - Zur Seite navigieren
  // ========================================
  {
    id: 'app.navigate',
    name: 'Navigieren',
    description: `Navigiert zu einer bestimmten Seite in der App.
Verwende dieses Tool wenn der User zu einer Seite navigieren möchte.
Beispiele: "Geh zur Startseite", "Öffne Einstellungen", "Zeig mir das Dashboard"`,
    module: 'app',
    
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Pfad der Seite (z.B. "/", "/calendar", "/settings")',
        },
      },
      required: ['path'],
    },
    
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { path } = input as { path: string };
      
      return {
        success: true,
        data: { path },
      };
    },
    
    createAction: (input) => ({
      type: 'app.navigate',
      module: 'app',
      payload: { path: (input as { path: string }).path },
      executed: false,
      timestamp: Date.now(),
    }),
  },

  // ========================================
  // CHANGE BACKGROUND - Hintergrund ändern
  // ========================================
  {
    id: 'app.changeBackground',
    name: 'Hintergrund ändern',
    description: `Ändert das Hintergrundbild der App.
Verwende dieses Tool wenn der User das Hintergrundbild ändern möchte.
Beispiele: "Ändere den Hintergrund", "Neues Wallpaper", "Zeig mir die Berge als Hintergrund"`,
    module: 'app',
    
    inputSchema: {
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
    
    effects: ['ui', 'storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { backgroundId, customUrl } = input as {
        backgroundId?: string;
        customUrl?: string;
      };
      
      const url = customUrl || (backgroundId ? BACKGROUNDS[backgroundId] : null);
      const name = backgroundId ? BACKGROUND_NAMES[backgroundId] : 'Benutzerdefiniert';
      
      if (!url) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Bitte gib eine Hintergrund-ID oder eine URL an.',
          },
        };
      }
      
      return {
        success: true,
        data: { backgroundId, url, name },
      };
    },
    
    createAction: (input, result) => {
      if (!result.success) return null;
      
      return {
        type: 'app.changeBackground',
        module: 'app',
        payload: {
          backgroundId: (input as { backgroundId?: string }).backgroundId,
          customUrl: (input as { customUrl?: string }).customUrl,
        },
        executed: false,
        timestamp: Date.now(),
      };
    },
  },

  // ========================================
  // TOGGLE SIDEBAR - Sidebar umschalten
  // ========================================
  {
    id: 'app.toggleSidebar',
    name: 'Sidebar umschalten',
    description: `Öffnet oder schließt die Sidebar.
Verwende dieses Tool wenn der User die Sidebar sehen oder verstecken möchte.
Beispiele: "Öffne die Sidebar", "Versteck die Seitenleiste", "Zeig mir das Menü"`,
    module: 'app',
    
    inputSchema: {
      type: 'object',
      properties: {
        open: {
          type: 'boolean',
          description: 'true = öffnen, false = schließen. Falls nicht angegeben: toggle',
        },
      },
      required: [],
    },
    
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { open } = input as { open?: boolean };
      
      return {
        success: true,
        data: { open },
      };
    },
    
    createAction: (input) => ({
      type: 'app.toggleSidebar' as 'app.openModule', // Type assertion für Kompatibilität
      module: 'app',
      payload: { 
        toggleSidebar: true,
        open: (input as { open?: boolean }).open,
      },
      executed: false,
      timestamp: Date.now(),
    }),
  },
  {
    id: 'app.switchTab',
    name: 'Tab wechseln',
    description: 'Wechselt zu einem bereits offenen Modul-Tab oder einer Ansicht.',
    module: 'app',
    inputSchema: {
      type: 'object',
      properties: {
        moduleId: {
          type: 'string',
          description: 'ID des Ziel-Moduls oder Tabs',
        },
      },
      required: ['moduleId'],
    },
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('app.switchTab', 'app', input, result),
  },
  {
    id: 'app.closeTab',
    name: 'Tab schließen',
    description: 'Schließt einen geöffneten Tab oder ein Modul.',
    module: 'app',
    inputSchema: {
      type: 'object',
      properties: {
        moduleId: {
          type: 'string',
          description: 'ID des zu schließenden Moduls oder Tabs',
        },
      },
      required: ['moduleId'],
    },
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('app.closeTab', 'app', input, result),
  },
  {
    id: 'app.searchGlobal',
    name: 'Global suchen',
    description: 'Startet eine globale Suche über Module, Bereiche oder Inhalte.',
    module: 'app',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Suchbegriff',
        },
      },
      required: ['query'],
    },
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('app.searchGlobal', 'app', input, result),
  },

  // ========================================
  // SHOW HELP - Hilfe anzeigen
  // ========================================
  {
    id: 'app.help',
    name: 'Hilfe anzeigen',
    description: `Zeigt Hilfe zu einem Thema oder der App allgemein.
Verwende dieses Tool wenn der User Hilfe braucht oder nicht weiß was er tun soll.
Beispiele: "Hilfe", "Was kann ich hier machen?", "Wie erstelle ich einen Termin?"`,
    module: 'app',
    
    inputSchema: {
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
    
    effects: [],
    requiresConfirmation: false,
    isIdempotent: true,
    
    execute: async (input): Promise<ModuleToolResult> => {
      const { topic } = input as { topic?: string };
      const helpText = HELP_TEXTS[topic || 'general'] || HELP_TEXTS.general;
      
      return {
        success: true,
        data: { 
          topic: topic || 'general',
          helpText,
        },
      };
    },
    
    createAction: () => null, // Keine UI-Action, Antwort kommt im Message-Text
  },
];
