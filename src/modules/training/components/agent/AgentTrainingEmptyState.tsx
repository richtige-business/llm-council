'use client';

// ============================================
// AgentTrainingEmptyState.tsx - Platzhalter fuer Agent-Modi
//
// Zweck: Zeigt vorbereitete V1-Landing-States fuer Agent Training,
//        bis die echte Backend- und Replay-Logik folgt
// Verwendet von: AgentTrainingWorkspace
// ============================================

import { useThemeStyles } from '@/lib/theme';
import type { AgentTrainingSubmode } from '../../types';
import { TRAINING_SUBMODE_INFO } from '../../constants';
import { TrainingIcon } from '../TrainingIcon';

// --------------------------------------------
// Props
// --------------------------------------------

interface AgentTrainingEmptyStateProps {
  submode: AgentTrainingSubmode;
}

// --------------------------------------------
// Platzhalter-Komponente
// Formuliert klar, was spaeter in diesem Bereich passieren wird
// --------------------------------------------

export function AgentTrainingEmptyState({ submode }: AgentTrainingEmptyStateProps) {
  const { surface, designStyle, textColor } = useThemeStyles();
  const info = TRAINING_SUBMODE_INFO[submode];

  const detailText =
    submode === 'learning-mode'
      ? 'Hier startet später der Learning Mode, in dem Nutzer Arbeitsweisen vormachen und daraus Trainings-Trajektorien entstehen.'
      : submode === 'policy-training'
        ? 'Hier definierst und trainierst du später, wann Agenten Tools nutzen, Rückfragen stellen und Entscheidungen treffen.'
        : 'Hier bündelst du später Teacher-Agenten, Distillation-Runs und komprimierte Agent-Policies.';

  return (
    <div
      className="flex h-full min-h-[360px] items-center justify-center p-6"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
      }}
    >
      <div className="max-w-2xl text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: `${info.color}18` }}
        >
          <TrainingIcon iconName={info.icon} className="h-7 w-7" style={{ color: info.color }} />
        </div>
        <h2 className="text-2xl font-semibold" style={{ color: textColor }}>
          {info.name}
        </h2>
        <p className="mt-3 text-sm opacity-70" style={{ color: textColor }}>
          {info.description}
        </p>
        <p className="mt-4 text-sm opacity-60" style={{ color: textColor }}>
          {detailText}
        </p>
        <div className="mt-6 grid gap-3 text-left md:grid-cols-3">
          <InfoCard
            title="Input"
            description="Aus Demos, Entscheidungen und Tool-Trajektorien werden später neue Trainingsartefakte aufgebaut."
          />
          <InfoCard
            title="Replay"
            description="V1 schafft bereits die IA für spätere Schritt-für-Schritt-Replays und Agent-Analysen."
          />
          <InfoCard
            title="Nächster Schritt"
            description="Der Workspace ist jetzt vorbereitet, damit die echte Agent-Logik ohne weiteren Navigationsumbau folgen kann."
          />
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { textColor } = useThemeStyles();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold" style={{ color: textColor }}>
        {title}
      </p>
      <p className="mt-2 text-xs opacity-65" style={{ color: textColor }}>
        {description}
      </p>
    </div>
  );
}
