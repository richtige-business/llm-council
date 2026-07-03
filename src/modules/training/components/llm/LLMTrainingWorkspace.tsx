'use client';

// ============================================
// LLMTrainingWorkspace.tsx - Workspace fuer LLM Training
//
// Zweck: Kapselt die bestehende Model-, Job- und Sandbox-Logik
//        in einen bereichsspezifischen Workspace mit neuer IA
// Verwendet von: TrainingPage
// ============================================

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Brain,
  Database,
  Dumbbell,
  FlaskConical,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { TRAINING_WORKSPACE_TABS } from '../../constants';
import type {
  Dataset,
  LLMTrainingSubmode,
  LLMWorkspaceTab,
  SandboxSession,
  TrainingModel,
  TrainingSubmode,
  TrainingWorkspaceTab,
  TrainingJob,
} from '../../types';
import { DistillationAnimation } from '../animations/DistillationAnimation';
import { FineTuningBenchPressAnimation } from '../animations/FineTuningBenchPressAnimation';
import { CreateDatasetModal } from '../CreateDatasetModal';
import { CreateModelModal } from '../CreateModelModal';
import { CreateSandboxModal } from '../CreateSandboxModal';
import { JobCard } from '../JobCard';
import { LLMRunBuilder } from './LLMRunBuilder';
import { ModelCard } from '../ModelCard';
import { SandboxCard } from '../SandboxCard';
import { TrainingRunVisualizationModal } from './TrainingRunVisualizationModal';
import { TrainingWorkspaceShell } from '../TrainingWorkspaceShell';

// --------------------------------------------
// Props
// --------------------------------------------

interface LLMTrainingWorkspaceProps {
  submode: LLMTrainingSubmode;
  activeTab: LLMWorkspaceTab;
  models: TrainingModel[];
  datasets: Dataset[];
  jobs: TrainingJob[];
  sessions: SandboxSession[];
  modelsLoading: boolean;
  datasetsLoading: boolean;
  jobsLoading: boolean;
  sessionsLoading: boolean;
  error: string | null;
  onChangeTab: (tab: LLMWorkspaceTab) => void;
  onBackToModes: () => void;
  onBackToHub: () => void;
  onRefreshModels: () => Promise<void> | void;
  onRefreshDatasets: () => Promise<void> | void;
  onRefreshJobs: () => Promise<void> | void;
  onRefreshSessions: () => Promise<void> | void;
  onClearError: () => void;
}

interface VisualizedTrainingJob extends TrainingJob {
  model?: { id: string; name: string; type: string; icon?: string; color?: string };
  dataset?: { id: string; name: string; type: string; rowCount: number };
}

// --------------------------------------------
// Workspace
// Nutzt bestehende Training-Bausteine im neuen Layout
// --------------------------------------------

export function LLMTrainingWorkspace({
  submode,
  activeTab,
  models,
  datasets,
  jobs,
  sessions,
  modelsLoading,
  datasetsLoading,
  jobsLoading,
  sessionsLoading,
  error,
  onChangeTab,
  onBackToModes,
  onBackToHub,
  onRefreshModels,
  onRefreshDatasets,
  onRefreshJobs,
  onRefreshSessions,
  onClearError,
}: LLMTrainingWorkspaceProps) {
  const { surface, accentColor, designStyle, textColor } = useThemeStyles();
  const [showCreateModel, setShowCreateModel] = useState(false);
  const [showCreateDataset, setShowCreateDataset] = useState(false);
  const [showCreateSandbox, setShowCreateSandbox] = useState(false);
  const [isVisualizationModalOpen, setIsVisualizationModalOpen] = useState(false);
  const [visualizationJobId, setVisualizationJobId] = useState<string | null>(null);
  const [visualizationFallbackJob, setVisualizationFallbackJob] = useState<VisualizedTrainingJob | null>(null);

  const workspaceTitle = useMemo(() => {
    switch (submode) {
      case 'example-tuning':
        return 'LLM Training · Beispieltraining';
      case 'preference-training':
        return 'LLM Training · Preference Training';
      case 'distillation':
        return 'LLM Training · Distillation';
      default:
        return 'LLM Training';
    }
  }, [submode]);

  const workspaceDescription = useMemo(() => {
    switch (submode) {
      case 'example-tuning':
        return 'Arbeite mit Modellen, Datensätzen und Runs für klassisches Fine-Tuning mit Beispieldaten.';
      case 'preference-training':
        return 'Nutze Sandbox und Feedback-Workflows, um Modelle über Präferenzen und Korrekturen zu verbessern.';
      case 'distillation':
        return 'Organisiere Teacher- und Student-Modelle, Trainingsläufe und Evaluationsschritte für Distillation.';
      default:
        return 'Verwalte LLM-Modelle, Trainingsläufe und Sandbox-Tests in einem gemeinsamen Workspace.';
    }
  }, [submode]);

  const readyDatasets = datasets.filter((dataset) => dataset.status === 'ready');
  const runningJobs = jobs.filter((job) => job.status === 'running' || job.status === 'queued');
  const activeSimulationRun = useMemo(() => {
    const matchingRun = jobs.find((job) => {
      if (job.status !== 'running' || job.gpuProvider !== 'mock') return false;

      if (submode === 'distillation') {
        return job.config?.visualizationKind === 'distillation';
      }

      if (submode === 'preference-training') {
        return job.config?.visualizationKind === 'preference';
      }

      return job.config?.visualizationKind === 'fine-tuning' || !job.config?.visualizationKind;
    });

    return matchingRun || runningJobs[0] || null;
  }, [jobs, runningJobs, submode]);

  const visualizationRun = useMemo(() => {
    if (visualizationJobId) {
      const matchedRun = jobs.find((job) => job.id === visualizationJobId);
      if (matchedRun) {
        return matchedRun as VisualizedTrainingJob;
      }
    }

    return visualizationFallbackJob || (activeSimulationRun as VisualizedTrainingJob | null);
  }, [activeSimulationRun, jobs, visualizationFallbackJob, visualizationJobId]);

  const isLoading =
    (activeTab === 'models' && modelsLoading) ||
    (activeTab === 'runs' && jobsLoading) ||
    (activeTab === 'sandbox' && sessionsLoading) ||
    ((activeTab === 'overview' || activeTab === 'eval') &&
      (modelsLoading || datasetsLoading || jobsLoading || sessionsLoading));

  const tabs = TRAINING_WORKSPACE_TABS.llm.filter(
    (tab): tab is { id: LLMWorkspaceTab; name: string; icon: string } =>
      ['overview', 'models', 'runs', 'eval', 'sandbox'].includes(tab.id)
  );

  const handleRefresh = async () => {
    switch (activeTab) {
      case 'models':
        await onRefreshModels();
        break;
      case 'runs':
        await onRefreshJobs();
        break;
      case 'sandbox':
        await onRefreshSessions();
        break;
      case 'overview':
      case 'eval':
        await Promise.all([
          Promise.resolve(onRefreshModels()),
          Promise.resolve(onRefreshDatasets()),
          Promise.resolve(onRefreshJobs()),
          Promise.resolve(onRefreshSessions()),
        ]);
        break;
    }
  };

  const renderCreateAction = () => {
    if (activeTab === 'models') {
      return (
        <button
          type="button"
          onClick={() => setShowCreateModel(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
          style={{
            background: accentColor,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.875rem',
          }}
        >
          <Plus className="h-4 w-4" />
          Neues Modell
        </button>
      );
    }

    if (activeTab === 'sandbox') {
      return (
        <button
          type="button"
          onClick={() => setShowCreateSandbox(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
          style={{
            background: accentColor,
            borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.875rem',
          }}
        >
          <Plus className="h-4 w-4" />
          Neue Session
        </button>
      );
    }

    return null;
  };

  return (
    <>
      <TrainingWorkspaceShell
        category="llm"
        submode={submode as TrainingSubmode}
        title={workspaceTitle}
        description={workspaceDescription}
        tabs={tabs as Array<{ id: TrainingWorkspaceTab; name: string; icon: string }>}
        activeTab={activeTab}
        onTabChange={(tab) => onChangeTab(tab as LLMWorkspaceTab)}
        onBackToModes={onBackToModes}
        onBackToHub={onBackToHub}
        actions={
          <>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex h-10 w-10 items-center justify-center transition-transform hover:scale-[1.02] disabled:opacity-60"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.875rem',
              }}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} style={{ color: textColor }} />
            </button>
            {renderCreateAction()}
          </>
        }
      >
        <div className="flex h-full flex-col overflow-hidden">
          <AnimatePresence>
            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3"
              >
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-300">{error}</span>
                <button type="button" onClick={onClearError} className="ml-auto text-xs text-red-200/80 hover:text-red-100">
                  Schließen
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === 'overview' ? (
              <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                <div className="space-y-4">
                  <OverviewMetricCards
                    models={models.length}
                    readyDatasets={readyDatasets.length}
                    runningJobs={runningJobs.length}
                    sessions={sessions.length}
                    onOpenModels={() => onChangeTab('models')}
                    onOpenRuns={() => onChangeTab('runs')}
                    onOpenSandbox={() => onChangeTab('sandbox')}
                  />
                  <OverviewList
                    title="Letzte Trainingsläufe"
                    icon={Dumbbell}
                    items={jobs.slice(0, 4).map((job) => ({
                      id: job.id,
                      title: `${job.method.toUpperCase()} · ${job.status}`,
                      description: `Epoch ${job.currentEpoch}/${job.totalEpochs} · ${job.datasetId}`,
                    }))}
                    emptyText="Noch keine Trainingsläufe vorhanden."
                  />
                </div>

                <div className="space-y-4">
                  <OverviewList
                    title="Bereite Datensätze"
                    icon={Database}
                    items={readyDatasets.slice(0, 5).map((dataset) => ({
                      id: dataset.id,
                      title: dataset.name,
                      description: `${dataset.rowCount.toLocaleString()} Einträge · ${dataset.type}`,
                    }))}
                    emptyText="Noch keine bereiten Datensätze vorhanden."
                    actionLabel="Dataset anlegen"
                    onAction={() => setShowCreateDataset(true)}
                  />
                  <OverviewList
                    title="Aktive Sandbox-Sessions"
                    icon={FlaskConical}
                    items={sessions.slice(0, 4).map((session) => ({
                      id: session.id,
                      title: session.name || session.baseModel,
                      description: `${session.feedbackCount} Feedbacks · ${session.status}`,
                    }))}
                    emptyText="Noch keine Sandbox-Session vorhanden."
                  />
                </div>
              </div>
            ) : null}

            {activeTab === 'models' ? (
              <CardGrid
                isLoading={modelsLoading}
                isEmpty={models.length === 0}
                emptyTitle="Keine Modelle"
                emptyDescription="Erstelle dein erstes LLM-Modell für Fine-Tuning oder Distillation."
                emptyActionLabel="Modell erstellen"
                onEmptyAction={() => setShowCreateModel(true)}
                icon={Brain}
              >
                {models.map((model) => (
                  <ModelCard key={model.id} model={model} onUpdate={onRefreshModels} />
                ))}
              </CardGrid>
            ) : null}

            {activeTab === 'runs' ? (
              <div className="space-y-4">
                <LLMRunBuilder
                  submode={submode}
                  models={models}
                  datasets={datasets}
                  onRunCreated={async (job) => {
                    setVisualizationJobId(job.id);
                    setVisualizationFallbackJob(job);
                    setIsVisualizationModalOpen(true);
                    await onRefreshJobs();
                  }}
                />

                <SimulationExperiencePanel
                  submode={submode}
                  activeRun={activeSimulationRun}
                  datasets={datasets}
                />

                <StackView
                  isLoading={jobsLoading}
                  isEmpty={jobs.length === 0}
                  emptyTitle="Keine Runs"
                  emptyDescription="Starte Trainingsläufe über deine Modelle und Datensätze."
                  icon={Dumbbell}
                >
                  {jobs.map((job) => (
                    <JobCard key={job.id} job={job} onUpdate={onRefreshJobs} />
                  ))}
                </StackView>
              </div>
            ) : null}

            {activeTab === 'sandbox' ? (
              <CardGrid
                isLoading={sessionsLoading}
                isEmpty={sessions.length === 0}
                emptyTitle="Keine Sandbox-Sessions"
                emptyDescription="Teste Modelle und Preference-Workflows in sicheren Sessions."
                emptyActionLabel="Session erstellen"
                onEmptyAction={() => setShowCreateSandbox(true)}
                icon={FlaskConical}
              >
                {sessions.map((session) => (
                  <SandboxCard key={session.id} session={session} onUpdate={onRefreshSessions} />
                ))}
              </CardGrid>
            ) : null}

            {activeTab === 'eval' ? (
              <WorkspacePlaceholder
                title="Eval ist vorbereitet"
                description="In diesem Schritt vergleichst du Runs, Teacher/Student-Kombinationen und Sandbox-Signale. Für V1 bleibt der Bereich als vorbereitete Hülle bestehen, damit die IA bereits vollständig ist."
              />
            ) : null}
          </div>
        </div>
      </TrainingWorkspaceShell>

      <CreateModelModal
        isOpen={showCreateModel}
        onClose={() => setShowCreateModel(false)}
        onCreated={() => {
          setShowCreateModel(false);
          void onRefreshModels();
        }}
      />
      <CreateDatasetModal
        isOpen={showCreateDataset}
        onClose={() => setShowCreateDataset(false)}
        onCreated={() => {
          setShowCreateDataset(false);
          void onRefreshDatasets();
        }}
      />
      <CreateSandboxModal
        isOpen={showCreateSandbox}
        onClose={() => setShowCreateSandbox(false)}
        onCreated={() => {
          setShowCreateSandbox(false);
          void onRefreshSessions();
        }}
      />
      <TrainingRunVisualizationModal
        isOpen={isVisualizationModalOpen}
        submode={submode}
        activeRun={visualizationRun}
        datasets={datasets}
        onClose={() => setIsVisualizationModalOpen(false)}
      />
    </>
  );
}

// --------------------------------------------
// Hilfs-Komponenten
// Kleine Workspace-spezifische UI-Bausteine fuer V1
// --------------------------------------------

function OverviewMetricCards({
  models,
  readyDatasets,
  runningJobs,
  sessions,
  onOpenModels,
  onOpenRuns,
  onOpenSandbox,
}: {
  models: number;
  readyDatasets: number;
  runningJobs: number;
  sessions: number;
  onOpenModels: () => void;
  onOpenRuns: () => void;
  onOpenSandbox: () => void;
}) {
  const { surface, designStyle, textColor } = useThemeStyles();
  const cards = [
    { id: 'models', label: 'Modelle', value: models, action: onOpenModels, color: '#8b5cf6' },
    { id: 'datasets', label: 'Bereite Datasets', value: readyDatasets, action: undefined, color: '#06b6d4' },
    { id: 'runs', label: 'Aktive Runs', value: runningJobs, action: onOpenRuns, color: '#f59e0b' },
    { id: 'sessions', label: 'Sandbox Sessions', value: sessions, action: onOpenSandbox, color: '#10b981' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={card.action}
          disabled={!card.action}
          className="p-4 text-left transition-transform hover:-translate-y-1 disabled:cursor-default disabled:hover:translate-y-0"
          style={{
            ...surface.base,
            borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
            border: `1px solid ${card.color}22`,
          }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] opacity-50" style={{ color: textColor }}>
            {card.label}
          </p>
          <p className="mt-3 text-3xl font-semibold" style={{ color: card.color }}>
            {card.value}
          </p>
        </button>
      ))}
    </div>
  );
}

function OverviewList({
  title,
  icon: Icon,
  items,
  emptyText,
  actionLabel,
  onAction,
}: {
  title: string;
  icon: typeof Brain;
  items: Array<{ id: string; title: string; description: string }>;
  emptyText: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { surface, designStyle, textColor, accentColor } = useThemeStyles();

  return (
    <div
      className="p-4"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
          <h3 className="text-sm font-semibold" style={{ color: textColor }}>
            {title}
          </h3>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ background: accentColor }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-sm opacity-60" style={{ color: textColor }}>
          {emptyText}
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 px-3 py-3"
              style={{ color: textColor }}
            >
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs opacity-60">{item.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CardGrid({
  isLoading,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  icon: Icon,
  children,
}: {
  isLoading: boolean;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  icon: typeof Brain;
  children: ReactNode;
}) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (isEmpty) {
    return (
      <EmptyState
        icon={Icon}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function StackView({
  isLoading,
  isEmpty,
  emptyTitle,
  emptyDescription,
  icon: Icon,
  children,
}: {
  isLoading: boolean;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  icon: typeof Brain;
  children: ReactNode;
}) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (isEmpty) {
    return <EmptyState icon={Icon} title={emptyTitle} description={emptyDescription} />;
  }

  return <div className="space-y-3">{children}</div>;
}

function LoadingState() {
  const { textColor } = useThemeStyles();

  return (
    <div className="flex items-center justify-center py-14">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: textColor, opacity: 0.6 }} />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: typeof Brain;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { surface, accentColor, designStyle, textColor } = useThemeStyles();

  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-16 text-center"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
      }}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: `${accentColor}1f` }}
      >
        <Icon className="h-7 w-7" style={{ color: accentColor }} />
      </div>
      <h3 className="text-lg font-semibold" style={{ color: textColor }}>
        {title}
      </h3>
      <p className="mt-2 max-w-xl text-sm opacity-65" style={{ color: textColor }}>
        {description}
      </p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white"
          style={{ background: accentColor }}
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function WorkspacePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { surface, designStyle, textColor } = useThemeStyles();

  return (
    <div
      className="flex h-full min-h-[320px] items-center justify-center p-6"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
      }}
    >
      <div className="max-w-2xl text-center">
        <h3 className="text-xl font-semibold" style={{ color: textColor }}>
          {title}
        </h3>
        <p className="mt-3 text-sm opacity-65" style={{ color: textColor }}>
          {description}
        </p>
      </div>
    </div>
  );
}

function SimulationExperiencePanel({
  submode,
  activeRun,
  datasets,
}: {
  submode: LLMTrainingSubmode;
  activeRun: (TrainingJob & {
    model?: { id: string; name: string; type: string; icon?: string; color?: string };
    dataset?: { id: string; name: string; type: string; rowCount: number };
  }) | null;
  datasets: Dataset[];
}) {
  const { surface, designStyle, textColor } = useThemeStyles();
  const status =
    activeRun?.status === 'completed'
      ? 'completed'
      : activeRun?.status === 'failed' || activeRun?.status === 'cancelled'
        ? 'failed'
        : activeRun?.status === 'running'
          ? 'running'
          : 'idle';

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
    const dataset = datasets.find((entry) => entry.id === activeRun?.datasetId) || null;

    return (
      <FineTuningBenchPressAnimation
        progress={activeRun?.progress || 0}
        status={status}
        datasetCountLabel={
          dataset ? `${dataset.rowCount.toLocaleString()} Rows` : 'Dataset'
        }
        epochs={activeRun?.totalEpochs || activeRun?.config?.epochs || 3}
      />
    );
  }

  return (
    <div
      className="p-5"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
      }}
    >
      <h3 className="text-lg font-semibold" style={{ color: textColor }}>
        Preference-Run Simulation
      </h3>
      <p className="mt-2 text-sm opacity-65" style={{ color: textColor }}>
        Für Preference Training läuft der normale Mock-Run bereits. Eine eigene visuelle
        Trainingsanimation kann später ergänzt werden, sobald du dafür eine konkrete Bildsprache
        festgelegt hast.
      </p>
      {activeRun ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm" style={{ color: textColor }}>
          <p className="font-medium">{activeRun.model?.name || 'Unbekanntes Modell'}</p>
          <p className="mt-1 opacity-65">
            Fortschritt: {activeRun.progress}% · Epoche {activeRun.currentEpoch}/{activeRun.totalEpochs}
          </p>
        </div>
      ) : null}
    </div>
  );
}
