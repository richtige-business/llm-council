// ============================================
// tool-metadata.ts - Metadaten-Ableitung fuer Agent-Tools
//
// Zweck: Leitet Source-, Risiko- und Integrationsinformationen fuer Tools ab
// Verwendet von: AgentSettingsBehaviorTab, Skill-Guard
// ============================================

import type { ModuleTool } from '@/lib/agent/types';
import type {
  AgentIntegrationId,
  AgentIntegrationStatus,
} from '@/lib/agent/stores/integration-status-store';

export type ToolSource = 'internal' | 'mcp:gmail' | 'mcp:browser';
export type ToolRisk = 'read' | 'write' | 'destructive';

export function getToolSource(toolId: string): ToolSource {
  if (toolId.startsWith('inbox.')) return 'mcp:gmail';
  if (toolId.startsWith('browser.')) return 'mcp:browser';
  return 'internal';
}

export function getRequiredIntegrationForTool(toolId: string): AgentIntegrationId | null {
  if (toolId.startsWith('inbox.')) return 'gmail';
  if (toolId.startsWith('browser.')) return 'browser';
  return null;
}

export function getToolRisk(tool: Pick<ModuleTool, 'id' | 'effects'>): ToolRisk {
  const id = tool.id.toLowerCase();

  if (/(delete|remove|destroy)/.test(id)) {
    return 'destructive';
  }

  if (/(create|update|send|compose|mark|add|set|filter|open|navigate)/.test(id)) {
    return 'write';
  }

  if (tool.effects.includes('storage') || tool.effects.includes('network') || tool.effects.includes('ui')) {
    return 'write';
  }

  return 'read';
}

export function isIntegrationAllowedForAgent(
  integrationId: AgentIntegrationId,
  allowedIntegrations: string[]
): boolean {
  // Leere Liste bedeutet "alle erlauben"
  if (allowedIntegrations.length === 0) return true;
  return allowedIntegrations.includes(integrationId);
}

export function isToolAvailableForAgent(
  toolId: string,
  allowedIntegrations: string[],
  integrationStatuses: Record<AgentIntegrationId, AgentIntegrationStatus>
): boolean {
  const requiredIntegration = getRequiredIntegrationForTool(toolId);
  if (!requiredIntegration) return true;

  if (!isIntegrationAllowedForAgent(requiredIntegration, allowedIntegrations)) {
    return false;
  }

  const status = integrationStatuses[requiredIntegration];
  return Boolean(status?.connected && status?.authOk);
}
