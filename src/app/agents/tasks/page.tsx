// ============================================
// /app/agents/tasks/page.tsx - Route fuer Scheduled Tasks
//
// Zweck: Zeigt die Verwaltungsseite fuer geplante Agent-Aufgaben
//        inklusive Liste, Editor und Run-History
// Verwendet von: Sidebar-Agents-Dropdown
// ============================================

import dynamic from 'next/dynamic';

const ScheduledTasksPage = dynamic(
  () => import('@/modules/agents/components/spatial/AgentsSpatialTasksMode').then((mod) => mod.AgentsSpatialTasksMode),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center p-6 text-sm text-white/60">
        Tasks-Modus wird geladen...
      </div>
    ),
  }
);

export const metadata = {
  title: 'Scheduled Tasks | LLM Council',
  description: 'Geplante einmalige und wiederkehrende Agent-Aufgaben verwalten',
};

export default function ScheduledTasksRoute() {
  return <ScheduledTasksPage />;
}

