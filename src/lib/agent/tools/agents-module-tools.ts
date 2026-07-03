// ============================================
// agents-module-tools.ts - Agent-Management Tools
//
// Zweck: Definiert steuernde Tools fuer das Agents-Modul
// Verwendet von: Tool Registry, Agent Orchestrator
// ============================================

import type { ModuleTool, ModuleToolResult } from '@/lib/agent/types';
import { AGENTS_TOOL_SPECS } from './agents-tool-specs';
import { createToolRuntimeAction } from './runtime-action';

// --------------------------------------------
// Hilfsfunktion fuer statische Agents-Tools
// Reicht Input aktuell transparent durch.
// --------------------------------------------

function createStaticAgentsTool(spec: typeof AGENTS_TOOL_SPECS[number]): ModuleTool {
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
// Agents-Modul Tools
// Diese Tools steuern Agent-Workflows auf hoher Ebene.
// --------------------------------------------

export const agentsModuleTools: ModuleTool[] = [
  ...AGENTS_TOOL_SPECS.map(createStaticAgentsTool),
  {
    id: 'agents.openWorkspace',
    name: 'Open Agents workspace',
    description: 'Opens the Agents area for chat, groups, and councils.',
    module: 'agents',
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
      data: { moduleId: 'agents' },
    }),
    createAction: () => ({
      type: 'app.openModule',
      module: 'app',
      payload: { moduleId: 'agents' },
      executed: false,
      timestamp: Date.now(),
    }),
  },
  {
    id: 'agents.createAgent',
    name: 'Agent erstellen',
    description: 'Legt einen neuen Custom-Agenten mit Name, Ziel und Rolle an.',
    module: 'agents',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name des Agenten' },
        description: { type: 'string', description: 'Kurzbeschreibung des Agenten' },
        objective: { type: 'string', description: 'Primäres Ziel des Agenten' },
      },
      required: ['name'],
    },
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('agents.createAgent', 'agents', input, result),
  },
  {
    id: 'agents.updateAgent',
    name: 'Agent aktualisieren',
    description: 'Aktualisiert Name, Beschreibung oder Ziel eines vorhandenen Agenten.',
    module: 'agents',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'ID des Agenten' },
        name: { type: 'string', description: 'Neuer Name' },
        description: { type: 'string', description: 'Neue Beschreibung' },
        objective: { type: 'string', description: 'Neues Ziel' },
      },
      required: ['agentId'],
    },
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('agents.updateAgent', 'agents', input, result),
  },
  {
    id: 'agents.deleteAgent',
    name: 'Agent loeschen',
    description: 'Loescht einen vorhandenen Agenten inklusive Konfiguration.',
    module: 'agents',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'ID des zu loeschenden Agenten' },
      },
      required: ['agentId'],
    },
    effects: ['storage', 'ui'],
    requiresConfirmation: true,
    isIdempotent: true,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('agents.deleteAgent', 'agents', input, result),
  },
  {
    id: 'agents.createGroup',
    name: 'Agent-Gruppe erstellen',
    description: 'Erstellt eine neue Agent-Gruppe fuer koordinierte Teamarbeit.',
    module: 'agents',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Gruppenname' },
        description: { type: 'string', description: 'Gruppenbeschreibung' },
      },
      required: ['name'],
    },
    effects: ['storage', 'ui'],
    requiresConfirmation: false,
    isIdempotent: false,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('agents.createGroup', 'agents', input, result),
  },
  {
    id: 'agents.runCouncil',
    name: 'Run council',
    description: 'Starts a council run for structured multi-agent decisions.',
    module: 'agents',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Question or topic for the council run' },
      },
      required: ['prompt'],
    },
    effects: ['ui'],
    requiresConfirmation: false,
    isIdempotent: false,
    execute: async (input): Promise<ModuleToolResult> => ({
      success: true,
      data: input,
    }),
    createAction: (input, result) => createToolRuntimeAction('agents.runCouncil', 'agents', input, result),
  },
];

