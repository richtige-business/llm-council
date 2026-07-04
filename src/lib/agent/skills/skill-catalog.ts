// ============================================
// skill-catalog.ts - Statischer Skill-Katalog fuer Agent Settings V1
//
// Zweck: Definiert aktivierbare Skills inkl. Tool- und Integrationsabhaengigkeiten
// Verwendet von: Agent Settings (Behavior Tab), Skill-Guard zur Laufzeit
// ============================================

import type { AgentIntegrationId } from '@/lib/agent/stores/integration-status-store';

// --------------------------------------------
// Skill-Typen
// Reine Metadaten fuer V1 (ohne eigene Skill-Engine)
// --------------------------------------------

export interface AgentSkillDefinition {
  id: string;
  name: string;
  description: string;
  requiresIntegrations: AgentIntegrationId[];
  requiresTools: string[];
}

// --------------------------------------------
// Skill-Katalog V1
// Drei Start-Skills fuer den schnellen Rollout
// --------------------------------------------

export const AGENT_SKILL_CATALOG: AgentSkillDefinition[] = [
  {
    id: 'inbox.zero.daily',
    name: 'Inbox Zero Daily',
    description: 'Priorisiert neue Mails, erstellt Antwortentwuerfe und strukturiert den Tageseingang.',
    requiresIntegrations: ['gmail'],
    requiresTools: [
      'inbox.open',
      'inbox.searchEmails',
      'inbox.sendEmail',
    ],
  },
  {
    id: 'meeting.followup',
    name: 'Meeting Follow-up',
    description: 'Leitet Follow-up Aktionen aus Meetings ab und bereitet Versand/Notizen vor.',
    requiresIntegrations: ['gmail'],
    requiresTools: [
      'calendar.listEvents',
      'inbox.sendEmail',
      'memory.save',
    ],
  },
  {
    id: 'research.brief',
    name: 'Research Brief',
    description: 'Sammelt Web-Informationen und erstellt daraus eine kurze Entscheidungsgrundlage.',
    requiresIntegrations: ['browser'],
    requiresTools: [
      'browser.open',
      'browser.navigate',
      'browser.getStatus',
    ],
  },
];

export function getSkillById(skillId: string): AgentSkillDefinition | undefined {
  return AGENT_SKILL_CATALOG.find((skill) => skill.id === skillId);
}
