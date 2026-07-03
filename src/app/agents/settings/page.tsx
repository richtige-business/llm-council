// ============================================
// /app/agents/settings/page.tsx - Route fuer Agent Settings
//
// Zweck: Zeigt die zentrale Verwaltungsseite fuer Agents,
//        Gruppen, Analytics und Orchestrierungs-Hierarchie
// Verwendet von: Sidebar-Agents-Dropdown
// ============================================

import dynamic from 'next/dynamic';

const AgentSettingsPage = dynamic(
  () => import('@/modules/agents/components/spatial/AgentsSpatialSettingsMode').then((mod) => mod.AgentsSpatialSettingsMode),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center p-6 text-sm text-white/60">
        Settings-Modus wird geladen...
      </div>
    ),
  }
);

export const metadata = {
  title: 'Agent Settings | LifeOS',
  description: 'Konfiguration, Analytics und Hierarchie fuer Agenten und Gruppen',
};

export default function AgentSettingsRoute() {
  return <AgentSettingsPage />;
}

