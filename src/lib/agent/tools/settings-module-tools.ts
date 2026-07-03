// ============================================
// settings-module-tools.ts - Settings-Steuerung Tools
//
// Zweck: Definiert Tools fuer Navigation und Pref-Management
// Verwendet von: Tool Registry, Agent Orchestrator
// ============================================

import type { ModuleTool, ModuleToolResult } from '@/lib/agent/types';
import { createToolRuntimeAction } from './runtime-action';

// --------------------------------------------
// Settings-Modul Tools
// Fokus auf sichere, nachvollziehbare Einstellungen.
// --------------------------------------------

export const settingsModuleTools: ModuleTool[] = [
  {
    id: 'settings.open',
    name: 'Einstellungen oeffnen',
    description: 'Oeffnet den Einstellungen-Bereich in LifeOS.',
    module: 'settings',
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
      data: { moduleId: 'settings' },
    }),
    createAction: () => ({
      type: 'app.openModule',
      module: 'app',
      payload: { moduleId: 'settings' },
      executed: false,
      timestamp: Date.now(),
    }),
  },
  {
    id: 'settings.search',
    name: 'Einstellungen durchsuchen',
    description: 'Sucht nach passenden Settings-Bereichen anhand eines Suchbegriffs.',
    module: 'settings',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Suchbegriff fuer Settings' },
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
    createAction: (input, result) => createToolRuntimeAction('settings.search', 'settings', input, result),
  },
  {
    id: 'settings.updatePreference',
    name: 'Praeferenz aktualisieren',
    description: 'Setzt eine konkrete Nutzereinstellung auf einen neuen Wert.',
    module: 'settings',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Einstellungs-Key' },
        value: { type: 'string', description: 'Neuer Wert als String' },
      },
      required: ['key', 'value'],
    },
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('settings.updatePreference', 'settings', input, result),
  },
  {
    id: 'settings.getPreference',
    name: 'Praeferenz abrufen',
    description: 'Liest eine konkrete Nutzereinstellung.',
    module: 'settings',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Einstellungs-Key' },
      },
      required: ['key'],
    },
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('settings.getPreference', 'settings', input, result),
  },
  {
    id: 'settings.listSections',
    name: 'Settings-Sektionen auflisten',
    description: 'Listet verfügbare Settings-Sektionen auf.',
    module: 'settings',
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
    createAction: (_input, result) => createToolRuntimeAction('settings.listSections', 'settings', {}, result),
  },
  {
    id: 'settings.export',
    name: 'Settings exportieren',
    description: 'Exportiert ausgewählte Einstellungen.',
    module: 'settings',
    inputSchema: {
      type: 'object',
      properties: {
        section: { type: 'string', description: 'Optionale Sektion' },
      },
      required: [],
    },
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('settings.export', 'settings', input, result),
  },
  {
    id: 'settings.import',
    name: 'Settings importieren',
    description: 'Importiert Einstellungen aus einer Payload oder Datei.',
    module: 'settings',
    inputSchema: {
      type: 'object',
      properties: {
        payload: { type: 'object', description: 'Zu importierende Einstellungen' },
      },
      required: ['payload'],
    },
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: false,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('settings.import', 'settings', input, result),
  },
  {
    id: 'settings.setTheme',
    name: 'Theme setzen',
    description: 'Setzt das globale Theme der App.',
    module: 'settings',
    inputSchema: {
      type: 'object',
      properties: {
        theme: { type: 'string', description: 'Theme-ID' },
      },
      required: ['theme'],
    },
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('settings.setTheme', 'settings', input, result),
  },
  {
    id: 'settings.setLanguage',
    name: 'Sprache setzen',
    description: 'Setzt die Sprache der App.',
    module: 'settings',
    inputSchema: {
      type: 'object',
      properties: {
        locale: { type: 'string', description: 'Locale-Code' },
      },
      required: ['locale'],
    },
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('settings.setLanguage', 'settings', input, result),
  },
  {
    id: 'settings.setPrivacyMode',
    name: 'Privacy-Mode setzen',
    description: 'Aktiviert oder deaktiviert Datenschutz-/Privacy-Modi.',
    module: 'settings',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Privacy-Mode aktiv?' },
      },
      required: ['enabled'],
    },
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('settings.setPrivacyMode', 'settings', input, result),
  },
  {
    id: 'settings.resetPreference',
    name: 'Praeferenz zuruecksetzen',
    description: 'Setzt eine Einstellung auf den Standardwert zurueck.',
    module: 'settings',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Einstellungs-Key' },
      },
      required: ['key'],
    },
    effects: ['storage'],
    requiresConfirmation: true,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('settings.resetPreference', 'settings', input, result),
  },
];

