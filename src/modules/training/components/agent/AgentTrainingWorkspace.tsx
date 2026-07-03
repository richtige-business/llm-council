'use client';

// ============================================
// AgentTrainingWorkspace.tsx - Workspace fuer Agent Training
//
// Zweck: Stellt die neue Agent-Training-Shell bereit und bereitet
//        Learning Mode, Policies und Distillation als V1-UI vor
// Verwendet von: TrainingPage
// ============================================

import { useMemo } from 'react';
import { useThemeStyles } from '@/lib/theme';
import { TRAINING_WORKSPACE_TABS } from '../../constants';
import type {
  AgentTrainingSubmode,
  AgentWorkspaceTab,
  TrainingSubmode,
  TrainingWorkspaceTab,
} from '../../types';
import { TrainingWorkspaceShell } from '../TrainingWorkspaceShell';
import { AgentTrainingEmptyState } from './AgentTrainingEmptyState';

// --------------------------------------------
// Props
// --------------------------------------------

interface AgentTrainingWorkspaceProps {
  submode: AgentTrainingSubmode;
  activeTab: AgentWorkspaceTab;
  onChangeTab: (tab: AgentWorkspaceTab) => void;
  onBackToModes: () => void;
  onBackToHub: () => void;
}

// --------------------------------------------
// Agent-Workspace
// V1 konzentriert sich auf die komplette UX-Struktur
// --------------------------------------------

export function AgentTrainingWorkspace({
  submode,
  activeTab,
  onChangeTab,
  onBackToModes,
  onBackToHub,
}: AgentTrainingWorkspaceProps) {
  const { surface, designStyle, textColor } = useThemeStyles();

  const workspaceTitle = useMemo(() => {
    switch (submode) {
      case 'learning-mode':
        return 'Agent Training · Learning Mode';
      case 'policy-training':
        return 'Agent Training · Tool- & Entscheidungslernen';
      case 'agent-distillation':
        return 'Agent Training · Agent Distillation';
      default:
        return 'Agent Training';
    }
  }, [submode]);

  const workspaceDescription = useMemo(() => {
    switch (submode) {
      case 'learning-mode':
        return 'Bereite einen Bereich vor, in dem Nutzer Agenten Aufgaben vormachen und daraus wiederverwendbare Trajektorien entstehen.';
      case 'policy-training':
        return 'Strukturiere Agent-Regeln, Tool-Routing und Entscheidungspfade in einem eigenen Workspace.';
      case 'agent-distillation':
        return 'Schaffe die Oberfläche für Teacher-Agenten, verdichtete Policies und kostengünstigere Spezial-Agenten.';
      default:
        return 'Trainiere Agenten auf Verhalten, Entscheidungen und Workflow-Ausführung.';
    }
  }, [submode]);

  const tabs = TRAINING_WORKSPACE_TABS.agent.filter(
    (tab): tab is { id: AgentWorkspaceTab; name: string; icon: string } =>
      ['overview', 'learning', 'policies', 'runs', 'replay', 'eval'].includes(tab.id)
  );

  return (
    <TrainingWorkspaceShell
      category="agent"
      submode={submode as TrainingSubmode}
      title={workspaceTitle}
      description={workspaceDescription}
      tabs={tabs as Array<{ id: TrainingWorkspaceTab; name: string; icon: string }>}
      activeTab={activeTab}
      onTabChange={(tab) => onChangeTab(tab as AgentWorkspaceTab)}
      onBackToModes={onBackToModes}
      onBackToHub={onBackToHub}
    >
      <div className="grid h-full gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AgentTrainingEmptyState submode={submode} />

        <div
          className="overflow-hidden p-5"
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
          }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] opacity-55" style={{ color: textColor }}>
            Workspace-Struktur
          </h3>
          <div className="mt-4 space-y-3">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="rounded-xl border px-4 py-3"
                style={{
                  borderColor: activeTab === tab.id ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                  background: activeTab === tab.id ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                }}
              >
                <p className="text-sm font-medium" style={{ color: textColor }}>
                  {tab.name}
                </p>
                <p className="mt-1 text-xs opacity-60" style={{ color: textColor }}>
                  {describeTab(tab.id)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TrainingWorkspaceShell>
  );
}

function describeTab(tab: AgentWorkspaceTab): string {
  switch (tab) {
    case 'overview':
      return 'Schneller Einstieg in Agent-Ziele, Trainingsstatus und nächste Schritte.';
    case 'learning':
      return 'Vorgemachte Aufgaben, Trajektorien und Imitationssessions.';
    case 'policies':
      return 'Regeln für Tool-Nutzung, Entscheidungslogik und Guardrails.';
    case 'runs':
      return 'Trainingsläufe und Distillation-Runs für Agent-Verhalten.';
    case 'replay':
      return 'Spätere Schritt-für-Schritt-Wiedergabe von Agent-Läufen.';
    case 'eval':
      return 'Vergleich von Agent-Policies, Erfolgsraten und Stabilität.';
    default:
      return '';
  }
}
