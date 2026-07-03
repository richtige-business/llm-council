// ============================================
// marketplace-module-tools.ts - Marketplace Tools
//
// Zweck: Definiert Discovery- und Installations-Tools fuer Module
// Verwendet von: Tool Registry, Agent Orchestrator
// ============================================

import type { ModuleTool, ModuleToolResult } from '@/lib/agent/types';
import { createToolRuntimeAction } from './runtime-action';

// --------------------------------------------
// Marketplace-Tools
// Installation/Deinstallation bleibt bestaetigungspflichtig.
// --------------------------------------------

export const marketplaceModuleTools: ModuleTool[] = [
  {
    id: 'marketplace.open',
    name: 'Marketplace oeffnen',
    description: 'Oeffnet den Marketplace (Library), um Module zu entdecken.',
    module: 'marketplace',
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
      data: { moduleId: 'library' },
    }),
    createAction: () => ({
      type: 'app.openModule',
      module: 'app',
      payload: { moduleId: 'library' },
      executed: false,
      timestamp: Date.now(),
    }),
  },
  {
    id: 'marketplace.search',
    name: 'Marketplace durchsuchen',
    description: 'Sucht Module anhand von Query, Kategorie und Tags.',
    module: 'marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Suchtext' },
        category: { type: 'string', description: 'Optionale Kategorie' },
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
    createAction: (input, result) => createToolRuntimeAction('marketplace.search', 'marketplace', input, result),
  },
  {
    id: 'marketplace.install',
    name: 'Modul installieren',
    description: 'Installiert ein Modul aus dem Marketplace anhand der Modul-ID.',
    module: 'marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        moduleId: { type: 'string', description: 'ID des zu installierenden Moduls' },
      },
      required: ['moduleId'],
    },
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('marketplace.install', 'marketplace', input, result),
  },
  {
    id: 'marketplace.getModule',
    name: 'Marketplace-Modul laden',
    description: 'Lädt Details eines Moduls aus dem Marketplace.',
    module: 'marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        moduleId: { type: 'string', description: 'Modul-ID' },
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
    createAction: (input, result) => createToolRuntimeAction('marketplace.getModule', 'marketplace', input, result),
  },
  {
    id: 'marketplace.listInstalled',
    name: 'Installierte Module auflisten',
    description: 'Listet installierte Module im Workspace auf.',
    module: 'marketplace',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (): Promise<ModuleToolResult> => ({
      success: true,
      data: {},
    }),
    createAction: (_input, result) => createToolRuntimeAction('marketplace.listInstalled', 'marketplace', {}, result),
  },
  {
    id: 'marketplace.updateModule',
    name: 'Modul aktualisieren',
    description: 'Aktualisiert ein installiertes Modul auf eine neue Version.',
    module: 'marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        moduleId: { type: 'string', description: 'Modul-ID' },
        version: { type: 'string', description: 'Zielversion' },
      },
      required: ['moduleId'],
    },
    effects: ['storage', 'network', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('marketplace.updateModule', 'marketplace', input, result),
  },
  {
    id: 'marketplace.openModuleDetails',
    name: 'Moduldetails öffnen',
    description: 'Öffnet die Detailansicht eines Marketplace-Moduls.',
    module: 'marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        moduleId: { type: 'string', description: 'Modul-ID' },
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
    createAction: (input, result) => createToolRuntimeAction('marketplace.openModuleDetails', 'marketplace', input, result),
  },
  {
    id: 'marketplace.rateModule',
    name: 'Modul bewerten',
    description: 'Bewertet ein Modul im Marketplace.',
    module: 'marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        moduleId: { type: 'string', description: 'Modul-ID' },
        rating: { type: 'number', description: 'Bewertung von 1 bis 5' },
        review: { type: 'string', description: 'Optionale Kurzbewertung' },
      },
      required: ['moduleId', 'rating'],
    },
    effects: ['network'],
    requiresConfirmation: false,
    isIdempotent: false,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('marketplace.rateModule', 'marketplace', input, result),
  },
  {
    id: 'marketplace.uninstall',
    name: 'Modul deinstallieren',
    description: 'Deinstalliert ein installiertes Modul aus dem Workspace.',
    module: 'marketplace',
    inputSchema: {
      type: 'object',
      properties: {
        moduleId: { type: 'string', description: 'ID des zu deinstallierenden Moduls' },
      },
      required: ['moduleId'],
    },
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('marketplace.uninstall', 'marketplace', input, result),
  },
];

