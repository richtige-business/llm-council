'use client';

// ============================================
// TrainingRunVisualizationModal.tsx - Grosses Visualisierungsfenster fuer Sim-Runs
//
// Zweck: Zeigt Trainingsanimationen in einem grossen Popup, ohne
//        den eigentlichen Run-Lebenszyklus zu beeinflussen
// Verwendet von: LLMTrainingWorkspace
// ============================================

import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Cpu, Sparkles, X } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import type { Dataset, LLMTrainingSubmode, TrainingJob } from '../../types';
import { DistillationAnimation } from '../animations/DistillationAnimation';
import { FineTuningBenchPressAnimation } from '../animations/FineTuningBenchPressAnimation';

// --------------------------------------------
// Typen fuer den angezeigten Job
// Erweitert den Basis-Job um die geladenen UI-Beziehungen
// --------------------------------------------

interface VisualizedTrainingJob extends TrainingJob {
  model?: { id: string; name: string; type: string; icon?: string; color?: string };
  dataset?: { id: string; name: string; type: string; rowCount: number };
}

interface TrainingRunVisualizationModalProps {
  isOpen: boolean;
  submode: LLMTrainingSubmode;
  activeRun: VisualizedTrainingJob | null;
  datasets: Dataset[];
  onClose: () => void;
}

// --------------------------------------------
// Modal
// Trennt die Visualisierung bewusst vom eigentlichen Run
// --------------------------------------------

export function TrainingRunVisualizationModal({
  isOpen,
  submode,
  activeRun,
  datasets,
  onClose,
}: TrainingRunVisualizationModalProps) {
  const { container, surface, designStyle, textColor, accentColor } = useThemeStyles();

  const status =
    activeRun?.status === 'completed'
      ? 'completed'
      : activeRun?.status === 'failed' || activeRun?.status === 'cancelled'
        ? 'failed'
        : activeRun?.status === 'running'
          ? 'running'
          : 'idle';

  const linkedDataset = datasets.find((dataset) => dataset.id === activeRun?.datasetId) || null;
  const datasetName = linkedDataset?.name || activeRun?.dataset?.name || 'Noch nicht verfügbar';
  const datasetRowCount = linkedDataset?.rowCount || activeRun?.dataset?.rowCount || 0;

  const renderVisualization = () => {
    if (submode === 'distillation') {
      return (
        <DistillationAnimation
          progress={activeRun?.progress || 0}
          status={status}
          teacherName={activeRun?.config?.teacherModelName || 'Teacher Brain'}
          studentName={
            activeRun?.config?.studentModelName ||
            activeRun?.model?.name ||
            'Student Brain'
          }
        />
      );
    }

    if (submode === 'example-tuning') {
      return (
        <FineTuningBenchPressAnimation
          progress={activeRun?.progress || 0}
          status={status}
          datasetCountLabel={
            datasetRowCount > 0 ? `${datasetRowCount.toLocaleString()} Rows` : 'Dataset'
          }
          epochs={activeRun?.totalEpochs || activeRun?.config?.epochs || 3}
        />
      );
    }

    return (
      <div
        className="flex h-full min-h-[420px] items-center justify-center p-6"
        style={{
          ...surface.base,
          borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.5rem',
        }}
      >
        <div className="max-w-xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.24em] opacity-50" style={{ color: textColor }}>
            Preference Training
          </p>
          <h3 className="mt-2 text-2xl font-semibold" style={{ color: textColor }}>
            Visualisierung folgt als nächster Schritt
          </h3>
          <p className="mt-3 text-sm opacity-65" style={{ color: textColor }}>
            Der Sim-Run läuft bereits normal im Hintergrund weiter. Für Preference Training ist
            aktuell noch kein eigenes Key-Visual umgesetzt.
          </p>
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-4 z-[80] mx-auto flex w-full max-w-7xl items-center justify-center"
          >
            <div
              className="flex h-full max-h-[92vh] w-full flex-col overflow-hidden"
              style={{
                ...container.base,
                borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.75rem',
              }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] opacity-50" style={{ color: textColor }}>
                    Visualisierungsfenster
                  </p>
                  <h2 className="mt-1 text-xl font-semibold md:text-2xl" style={{ color: textColor }}>
                    Trainings-Visual läuft separat vom Run
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm opacity-65" style={{ color: textColor }}>
                    Du kannst dieses Fenster jederzeit schließen. Der Trainingslauf wird dadurch
                    nicht gestoppt und läuft im Hintergrund normal weiter.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-white/10"
                  style={{ borderRadius: designStyle === 'brutal' ? '0.5rem' : '9999px' }}
                >
                  <X className="h-5 w-5" style={{ color: textColor }} />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 md:grid-cols-[1.6fr_0.75fr] md:p-6">
                <div className="min-h-0 overflow-y-auto">
                  {renderVisualization()}
                </div>

                <div className="min-h-0 overflow-y-auto">
                  <div
                    className="space-y-4 p-4"
                    style={{
                      ...surface.base,
                      borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.5rem',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" style={{ color: accentColor }} />
                      <h3 className="text-sm font-semibold" style={{ color: textColor }}>
                        Live-Status
                      </h3>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                      <MetricCard
                        icon={Activity}
                        label="Fortschritt"
                        value={`${activeRun?.progress || 0}%`}
                      />
                      <MetricCard
                        icon={Cpu}
                        label="Run-Status"
                        value={activeRun?.status || 'idle'}
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] opacity-50" style={{ color: textColor }}>
                        Kontext
                      </p>
                      <div className="mt-3 space-y-3 text-sm" style={{ color: textColor }}>
                        <InfoRow label="Modell" value={activeRun?.model?.name || 'Noch nicht verfügbar'} />
                        <InfoRow label="Dataset" value={datasetName} />
                        <InfoRow label="Methode" value={activeRun?.method?.toUpperCase() || '-'} />
                        <InfoRow
                          label="Visual"
                          value={activeRun?.config?.visualizationKind || 'fine-tuning'}
                        />
                        <InfoRow
                          label="Epoch"
                          value={`${activeRun?.currentEpoch || 0}/${activeRun?.totalEpochs || activeRun?.config?.epochs || 3}`}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm" style={{ color: '#bbf7d0' }}>
                      Dieses Fenster ist nur ein Visualisierungs-Gadget. Der Trainingsjob bleibt
                      aktiv, auch wenn du das Popup schließt oder in andere Tabs wechselst.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

// --------------------------------------------
// Kleine UI-Helfer
// Halten die Info-Spalte kompakt und lesbar
// --------------------------------------------

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  const { surface, designStyle, textColor, accentColor } = useThemeStyles();

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: accentColor }} />
        <span className="text-xs font-medium uppercase tracking-[0.18em] opacity-55" style={{ color: textColor }}>
          {label}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold" style={{ color: textColor }}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="opacity-55">{label}</span>
      <span className="max-w-[60%] text-right font-medium opacity-90">{value}</span>
    </div>
  );
}
