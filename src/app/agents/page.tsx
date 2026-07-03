// ============================================
// /app/agents/page.tsx - Route für das Agents-Modul
// 
// Zweck: Next.js App Router Seite für /agents
//        Bindet die AgentsPage Komponente ein
// Verwendet von: Navigation, Sidebar-Links
// ============================================

import dynamic from 'next/dynamic';

const AgentsPage = dynamic(
  () => import('@/modules/agents/components/spatial/AgentsSpatialIdleMode').then((mod) => mod.AgentsSpatialIdleMode),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center p-6 text-sm text-white/60">
        Agents Raum wird geladen...
      </div>
    ),
  }
);

// --------------------------------------------
// Metadata für SEO und Browser-Tab
// --------------------------------------------

export const metadata = {
  title: 'Agents | LifeOS',
  description: 'KI-Agenten mit Chat, Web Research, Memory und Multi-Modell-Support',
};

// --------------------------------------------
// Seiten-Komponente
// Rendert die AgentsPage aus dem Modul
// --------------------------------------------

export default function AgentsRoute() {
  return <AgentsPage />;
}
