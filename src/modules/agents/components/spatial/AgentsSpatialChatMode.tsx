// ============================================
// AgentsSpatialChatMode.tsx - Chat-Modus ueber dem Spatial-Core
//
// Zweck: Rendert die bestehende Chat-Oberflaeche als
//        Modus-Panel ueber dem persistente 3D-Raum
// Verwendet von: /app/agents/page.tsx
// ============================================

'use client';

import { AgentsPage } from '../AgentsPage';

export function AgentsSpatialChatMode() {
  return <AgentsPage showShell={false} />;
}
