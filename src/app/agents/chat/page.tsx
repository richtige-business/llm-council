// ============================================
// /app/agents/chat/page.tsx - Route fuer den Chat-Modus
//
// Zweck: Rendert den Chat-Modus als Overlay ueber dem
//        persistente Agents Spatial Core
// Verwendet von: Agents-Steuerung im Modul
// ============================================

import dynamic from 'next/dynamic';

const AgentsChatMode = dynamic(
  () => import('@/modules/agents/components/spatial/AgentsSpatialChatMode').then((mod) => mod.AgentsSpatialChatMode),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center p-6 text-sm text-white/60">
        Chat-Modus wird geladen...
      </div>
    ),
  }
);

export default function AgentsChatRoute() {
  return <AgentsChatMode />;
}
