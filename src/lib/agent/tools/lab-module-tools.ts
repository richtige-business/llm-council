// ============================================
// lab-module-tools.ts - Module-Builder Steuerungs-Tools
//
// Zweck: Definiert High-Level-Tools fuer den Module Builder
// Verwendet von: Tool Registry, Agent Orchestrator
// ============================================

import type { ModuleTool, ModuleToolResult } from '@/lib/agent/types';
import { BUILDER_TOOL_SPECS } from './builder-tool-specs';
import { createToolRuntimeAction } from './runtime-action';

// --------------------------------------------
// Hilfsfunktion fuer statische Builder-Tools
// Reicht Input aktuell transparent durch.
// --------------------------------------------

function createStaticLabTool(spec: typeof BUILDER_TOOL_SPECS[number]): ModuleTool {
  return {
    ...spec,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction(spec.id, spec.module, input, result),
  };
}

// --------------------------------------------
// Lab-Tools
// Ergaenzt debug-command um Builder-Workflow-Schritte.
// --------------------------------------------

export const labModuleTools: ModuleTool[] = [
  ...BUILDER_TOOL_SPECS.map(createStaticLabTool),
  {
    id: 'lab.openBuilder',
    name: 'Builder oeffnen',
    description: 'Oeffnet den Module Builder im Lab-Bereich.',
    module: 'lab',
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
      data: { moduleId: 'lab' },
    }),
    createAction: () => ({
      type: 'app.openModule',
      module: 'app',
      payload: { moduleId: 'lab' },
      executed: false,
      timestamp: Date.now(),
    }),
  },
  {
    id: 'lab.createProject',
    name: 'Builder-Projekt erstellen',
    description: 'Erstellt ein neues Builder-Projekt mit Name und optionaler Beschreibung.',
    module: 'lab',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Projektname' },
        description: { type: 'string', description: 'Projektbeschreibung' },
      },
      required: ['name'],
    },
    effects: ['storage'],
    requiresConfirmation: false,
    isIdempotent: false,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('lab.createProject', 'lab', input, result),
  },
  {
    id: 'lab.generateModule',
    name: 'Modul generieren',
    description: 'Startet eine Builder-Generierung fuer ein Projekt mit Prompt.',
    module: 'lab',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Builder-Projekt-ID' },
        prompt: { type: 'string', description: 'Generierungsanweisung' },
      },
      required: ['projectId', 'prompt'],
    },
    effects: ['storage', 'network'],
    requiresConfirmation: false,
    isIdempotent: false,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('lab.generateModule', 'lab', input, result),
  },
  {
    id: 'lab.previewModule',
    name: 'Modul previewen',
    description: 'Erzeugt eine Vorschau fuer ein Builder-Projekt.',
    module: 'lab',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Builder-Projekt-ID' },
      },
      required: ['projectId'],
    },
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('lab.previewModule', 'lab', input, result),
  },
  {
    id: 'lab.publishModule',
    name: 'Modul publizieren',
    description: 'Publiziert ein Builder-Projekt als installierbares Modul.',
    module: 'lab',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Builder-Projekt-ID' },
        visibility: { type: 'string', description: 'Sichtbarkeit (private/public)', enum: ['private', 'public'] },
      },
      required: ['projectId'],
    },
    effects: ['storage', 'network', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('lab.publishModule', 'lab', input, result),
  },
];

