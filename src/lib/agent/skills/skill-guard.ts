// ============================================
// skill-guard.ts - Runtime-Preconditions fuer Skills
//
// Zweck: Prueft Integrations- und Tool-Abhaengigkeiten vor Skill-Starts
// Verwendet von: /api/agent/route.ts
// ============================================

import { prisma } from '@/lib/db';
import { getSkillById } from '@/lib/agent/skills/skill-catalog';

type IntegrationId = 'gmail' | 'browser';

interface IntegrationStatusSnapshot {
  connected: boolean;
  authOk: boolean;
  lastSeen: number | null;
}

export interface SkillGuardResult {
  ok: boolean;
  missingIntegrations: IntegrationId[];
  missingTools: string[];
  message: string;
}

interface RunSkillGuardInput {
  skillId: string;
  allowedIntegrations: string[];
  availableToolIds: string[];
}

// --------------------------------------------
// Integrations-Status serverseitig aufloesen
// V1: Browser immer verfuegbar, Gmail via aktive Accounts
// --------------------------------------------

async function loadIntegrationSnapshot(
  integrationIds: IntegrationId[]
): Promise<Record<IntegrationId, IntegrationStatusSnapshot>> {
  const snapshot: Record<IntegrationId, IntegrationStatusSnapshot> = {
    browser: {
      connected: true,
      authOk: true,
      lastSeen: Date.now(),
    },
    gmail: {
      connected: false,
      authOk: false,
      lastSeen: null,
    },
  };

  if (integrationIds.includes('gmail')) {
    const account = await prisma.emailAccount.findFirst({
      where: { isActive: true },
      select: {
        lastSyncAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (account) {
      snapshot.gmail = {
        connected: true,
        authOk: true,
        lastSeen: account.lastSyncAt
          ? account.lastSyncAt.getTime()
          : account.createdAt.getTime(),
      };
    }
  }

  return snapshot;
}

// --------------------------------------------
// Lesbare Fehlermeldung bauen
// Fuer klare Blocker-Antworten im Chat
// --------------------------------------------

function buildGuardMessage(missingIntegrations: IntegrationId[], missingTools: string[]): string {
  const parts: string[] = [];

  if (missingIntegrations.length > 0) {
    parts.push(`Fehlende Integrationen: ${missingIntegrations.join(', ')}`);
  }

  if (missingTools.length > 0) {
    parts.push(`Fehlende Tools: ${missingTools.join(', ')}`);
  }

  if (parts.length === 0) {
    return 'Skill kann ausgefuehrt werden.';
  }

  return `Skill wurde blockiert. ${parts.join(' · ')}`;
}

// --------------------------------------------
// Oeffentliche Guard-Funktion
// Fuehrt harte Preconditions fuer Skill-Ausfuehrung durch
// --------------------------------------------

export async function runSkillGuard(input: RunSkillGuardInput): Promise<SkillGuardResult> {
  const skill = getSkillById(input.skillId);
  if (!skill) {
    return {
      ok: false,
      missingIntegrations: [],
      missingTools: [],
      message: `Unbekannter Skill: ${input.skillId}`,
    };
  }

  const requiredIntegrations = skill.requiresIntegrations as IntegrationId[];
  const snapshot = await loadIntegrationSnapshot(requiredIntegrations);

  const missingIntegrations = requiredIntegrations.filter((integrationId) => {
    // Leere Liste bedeutet "alle Integrationen erlaubt"
    const integrationAllowed =
      input.allowedIntegrations.length === 0 || input.allowedIntegrations.includes(integrationId);
    if (!integrationAllowed) return true;

    const status = snapshot[integrationId];
    return !(status?.connected && status?.authOk);
  });

  const missingTools = skill.requiresTools.filter(
    (toolId) => !input.availableToolIds.includes(toolId)
  );

  const ok = missingIntegrations.length === 0 && missingTools.length === 0;
  return {
    ok,
    missingIntegrations,
    missingTools,
    message: buildGuardMessage(missingIntegrations, missingTools),
  };
}
