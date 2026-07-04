// ============================================
// agent-settings-entries.ts - Agent-Listen fuer Settings
//
// Zweck: Gemeinsamer Typ und Builder fuer eingebaute + Custom-Agenten
// Verwendet von: AgentSettingsPage, AgentSettingsModal, Analytics/Hierarchy
// ============================================

import { BUILT_IN_AGENT_DEFINITIONS } from '../agent-meta';
import type { CustomAgentData, GroupChatParticipantRole } from '../types';

// --------------------------------------------
// Eintrag in Settings-Listen (System / Custom / Gruppe)
// --------------------------------------------

export interface AgentListEntry {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  kind: 'system' | 'custom' | 'group';
  parentId?: string;
  parentGroupId?: string;
  rootGroupId?: string;
  participantRoles?: GroupChatParticipantRole[];
}

export function toAgentEntry(agent: CustomAgentData): AgentListEntry {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    icon: agent.icon,
    color: agent.color,
    kind: agent.type === 'group' ? 'group' : 'custom',
    parentId: agent.parentAgentId,
    parentGroupId: agent.parentGroupId,
    rootGroupId: agent.rootGroupId,
    participantRoles: agent.participantRoles,
  };
}

export function builtInToAgentEntries(): AgentListEntry[] {
  return BUILT_IN_AGENT_DEFINITIONS.map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    icon: agent.icon,
    color: agent.color,
    kind: 'system' as const,
    parentId: agent.parentId,
  }));
}

export function buildFullAgentEntries(customAgents: CustomAgentData[]): AgentListEntry[] {
  return [...builtInToAgentEntries(), ...customAgents.map(toAgentEntry)];
}
