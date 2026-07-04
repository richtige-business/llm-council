// ============================================
// tool-scope.ts - Zentrale Tool-Scope-Regeln fuer Agenten
//
// Zweck: Definiert, welche Tool-IDs pro Agent erlaubt sind
// Verwendet von: Orchestrator, AgentSettingsBehaviorTab, API-Guard
// ============================================

import type { ModuleTool } from '@/lib/agent/types';
import { AGENTS_TOOL_SPECS } from './agents-tool-specs';
import { BUILDER_TOOL_SPECS } from './builder-tool-specs';

// --------------------------------------------
// Scope-IDs
// Gruppiert Tool-Bloecke in wiederverwendbare Sets.
// --------------------------------------------

type ToolScopeId =
  | 'basic'
  | 'calendar'
  | 'inbox'
  | 'browser'
  | 'lab'
  | 'agents'
  | 'settings'
  | 'marketplace';

// --------------------------------------------
// Basis-Tools fuer alle Agenten
// Jeder Agent bekommt diese Core-Faehigkeiten.
// --------------------------------------------

const BASIC_TOOL_IDS = [
  'app.openModule',
  'app.navigate',
  'app.changeBackground',
  'app.toggleSidebar',
  'app.switchTab',
  'app.closeTab',
  'app.searchGlobal',
  'app.help',
  'memory.recall',
  'memory.list',
  'memory.save',
  'memory.update',
  'memory.delete',
  'memory.clearCategory',
  'memory.export',
  'memory.import',
] as const;

const AGENTS_TOOL_IDS = [
  'agents.openWorkspace',
  'agents.createAgent',
  'agents.updateAgent',
  'agents.deleteAgent',
  'agents.createGroup',
  'agents.runCouncil',
  ...AGENTS_TOOL_SPECS.map((tool) => tool.id),
] as const;

const BUILDER_TOOL_IDS = [
  'lab.runDebugCommand',
  ...BUILDER_TOOL_SPECS.map((tool) => tool.id),
] as const;

// --------------------------------------------
// Scope -> Tool-IDs
// Fokus liegt auf klaren, kontrollierten Bloecken.
// --------------------------------------------

const SCOPE_TOOL_IDS: Record<ToolScopeId, readonly string[]> = {
  basic: BASIC_TOOL_IDS,
  calendar: ['calendar.createEvent', 'calendar.listEvents', 'calendar.deleteEvent', 'calendar.open', 'calendar.getStatus', 'calendar.updateEvent'],
  inbox: ['inbox.sendEmail', 'inbox.searchEmails', 'inbox.open', 'inbox.markEmail', 'inbox.composeEmail', 'inbox.getStatus', 'inbox.filterEmails'],
  browser: [
    'browser.navigate',
    'browser.search',
    'browser.addBookmark',
    'browser.open',
    'browser.getStatus',
    'browser.extractPage',
    'browser.summarizePage',
    'browser.readSelection',
    'browser.downloadFile',
  ],
  lab: BUILDER_TOOL_IDS,
  agents: AGENTS_TOOL_IDS,
  settings: [
    'settings.open',
    'settings.search',
    'settings.updatePreference',
    'settings.getPreference',
    'settings.listSections',
    'settings.export',
    'settings.import',
    'settings.setTheme',
    'settings.setLanguage',
    'settings.setPrivacyMode',
    'settings.resetPreference',
  ],
  marketplace: [
    'marketplace.open',
    'marketplace.search',
    'marketplace.getModule',
    'marketplace.listInstalled',
    'marketplace.install',
    'marketplace.updateModule',
    'marketplace.openModuleDetails',
    'marketplace.rateModule',
    'marketplace.uninstall',
  ],
};

// --------------------------------------------
// Agent -> Scope-Mapping
// Definiert die freigegebenen Tool-Bloecke pro Agent.
// --------------------------------------------

const AGENT_SCOPE_MAP: Record<string, readonly ToolScopeId[]> = {
  // Intelligence behaelt Browser-/Recherche-Faehigkeiten, damit
  // dafuer kein eigener System-Agent mehr noetig ist.
  master: ['basic', 'agents', 'settings', 'marketplace', 'browser'],
  calendar: ['basic', 'calendar'],
  inbox: ['basic', 'inbox'],
  lab: ['basic', 'lab'],
  agents: ['basic', 'agents'],
};

// --------------------------------------------
// Helfer: Scope-Liste fuer Agent bestimmen
// Fallback: unknown/custom -> basic.
// --------------------------------------------

export function getScopesForAgent(agentId: string): readonly ToolScopeId[] {
  if (agentId.startsWith('group-')) {
    return ['basic', 'agents'];
  }

  return AGENT_SCOPE_MAP[agentId] || ['basic'];
}

// --------------------------------------------
// Helfer: erlaubte Tool-IDs fuer Agent
// Deduping, damit IDs nicht doppelt auftreten.
// --------------------------------------------

export function getAllowedToolIdsForAgent(agentId: string): string[] {
  const scopes = getScopesForAgent(agentId);
  const ids = scopes.flatMap((scope) => SCOPE_TOOL_IDS[scope] || []);
  return Array.from(new Set(ids));
}

// --------------------------------------------
// Helfer: Tools fuer Agent filtern
// Nimmt registrierte Tools und liefert nur erlaubte.
// --------------------------------------------

export function getScopedToolsForAgent(agentId: string, tools: ModuleTool[]): ModuleTool[] {
  const allowedIds = new Set(getAllowedToolIdsForAgent(agentId));
  return tools.filter((tool) => allowedIds.has(tool.id));
}

