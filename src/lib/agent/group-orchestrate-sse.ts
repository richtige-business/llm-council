// ============================================
// group-orchestrate-sse.ts - Gemeinsame SSE-Helfer für Gruppen-Orchestrierung
//
// Zweck: Serialisiert Group-Orchestrate-Events konsistent für
//        Route, Frontend-Consumer und Verifikation.
// Verwendet von: group-orchestrate Route, Verify-Skripten
// ============================================

import type { GroupOrchestrateEvent } from '@/modules/agents/types';

export function serializeGroupOrchestrateEvent(event: GroupOrchestrateEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function serializeGroupOrchestrateDone(): string {
  return 'data: [DONE]\n\n';
}

export function serializeGroupOrchestrateError(message: string): string {
  return serializeGroupOrchestrateEvent({
    type: 'error',
    message,
  });
}
