'use client';

// ============================================
// DatasetStudioWorkspace.tsx - Workspace fuer das Dataset Studio
//
// Zweck: Trennt Datensatz-Erstellung und Datenpflege als eigenen
//        Hauptbereich vom eigentlichen Modell- oder Agent-Training
// Verwendet von: TrainingPage
// ============================================

import { useMemo, useState } from 'react';
import { Database, Loader2, Plus, RefreshCw, ShieldAlert, Sparkles, Upload } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { TRAINING_WORKSPACE_TABS } from '../../constants';
import type {
  Dataset,
  DatasetStudioSubmode,
  DatasetWorkspaceTab,
  TrainingSubmode,
  TrainingWorkspaceTab,
} from '../../types';
import { CreateDatasetModal } from '../CreateDatasetModal';
import { DatasetCard } from '../DatasetCard';
import { TrainingWorkspaceShell } from '../TrainingWorkspaceShell';

// --------------------------------------------
// Props
// --------------------------------------------

interface DatasetStudioWorkspaceProps {
  submode: DatasetStudioSubmode;
  activeTab: DatasetWorkspaceTab;
  datasets: Dataset[];
  datasetsLoading: boolean;
  onChangeTab: (tab: DatasetWorkspaceTab) => void;
  onBackToModes: () => void;
  onBackToHub: () => void;
  onRefreshDatasets: () => Promise<void> | void;
}

// --------------------------------------------
// Dataset-Studio Workspace
// Hebt Datensaetze als eigenen Produktbereich hervor
// --------------------------------------------

export function DatasetStudioWorkspace({
  submode,
  activeTab,
  datasets,
  datasetsLoading,
  onChangeTab,
  onBackToModes,
  onBackToHub,
  onRefreshDatasets,
}: DatasetStudioWorkspaceProps) {
  const { surface, accentColor, designStyle, textColor } = useThemeStyles();
  const [showCreateDataset, setShowCreateDataset] = useState(false);

  const workspaceTitle = useMemo(() => {
    switch (submode) {
      case 'upload':
        return 'Dataset Studio · Upload';
      case 'synthetic':
        return 'Dataset Studio · Synthetic Generation';
      case 'extract':
        return 'Dataset Studio · Session Extraction';
      case 'quality':
        return 'Dataset Studio · Clean & Score';
      default:
        return 'Dataset Studio';
    }
  }, [submode]);

  const workspaceDescription = useMemo(() => {
    switch (submode) {
      case 'upload':
        return 'Importiere Datensätze aus Dateien und bereite sie für LLM- oder Agent-Training auf.';
      case 'synthetic':
        return 'Erweitere Golden Examples um synthetische Beispiele und baue daraus Trainingsmaterial.';
      case 'extract':
        return 'Nutze später Sandbox-Sessions, Feedback und Agent-Läufe als Datenquelle.';
      case 'quality':
        return 'Behalte PII-Warnungen, Datenqualität und Versionen in einem eigenen Bereich im Blick.';
      default:
        return 'Verwalte Quellen, Transformationen und Qualität deiner Trainingsdaten.';
    }
  }, [submode]);

  const tabs = TRAINING_WORKSPACE_TABS.dataset.filter(
    (tab): tab is { id: DatasetWorkspaceTab; name: string; icon: string } =>
      ['sources', 'transforms', 'quality', 'versions', 'exports'].includes(tab.id)
  );

  const syntheticCount = datasets.filter((dataset) => dataset.source === 'synthetic').length;
  const piiWarningCount = datasets.reduce(
    (count, dataset) => count + (dataset.piiWarnings?.length || 0),
    0
  );

  return (
    <>
      <TrainingWorkspaceShell
        category="dataset"
        submode={submode as TrainingSubmode}
        title={workspaceTitle}
        description={workspaceDescription}
        tabs={tabs as Array<{ id: TrainingWorkspaceTab; name: string; icon: string }>}
        activeTab={activeTab}
        onTabChange={(tab) => onChangeTab(tab as DatasetWorkspaceTab)}
        onBackToModes={onBackToModes}
        onBackToHub={onBackToHub}
        actions={
          <>
            <button
              type="button"
              onClick={() => void onRefreshDatasets()}
              disabled={datasetsLoading}
              className="flex h-10 w-10 items-center justify-center transition-transform hover:scale-[1.02] disabled:opacity-60"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.875rem',
              }}
            >
              <RefreshCw className={`h-4 w-4 ${datasetsLoading ? 'animate-spin' : ''}`} style={{ color: textColor }} />
            </button>
            <button
              type="button"
              onClick={() => setShowCreateDataset(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white"
              style={{
                background: accentColor,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.875rem',
              }}
            >
              <Plus className="h-4 w-4" />
              Neues Dataset
            </button>
          </>
        }
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === 'sources' ? (
              <>
                <div className="mb-4 grid gap-4 lg:grid-cols-3">
                  <MetricCard icon={Database} color="#06b6d4" label="Datasets gesamt" value={datasets.length} />
                  <MetricCard icon={Sparkles} color="#6366f1" label="Synthetische Quellen" value={syntheticCount} />
                  <MetricCard icon={ShieldAlert} color="#f59e0b" label="PII-Warnungen" value={piiWarningCount} />
                </div>

                {datasetsLoading ? (
                  <LoadingState />
                ) : datasets.length === 0 ? (
                  <WorkspacePlaceholder
                    icon={Upload}
                    title="Noch keine Datensätze vorhanden"
                    description="Lege dein erstes Dataset an, um Upload, Synthetic Generation oder spätere Session-Extraktion aufzubauen."
                    actionLabel="Dataset erstellen"
                    onAction={() => setShowCreateDataset(true)}
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {datasets.map((dataset) => (
                      <DatasetCard key={dataset.id} dataset={dataset} onUpdate={onRefreshDatasets} />
                    ))}
                  </div>
                )}
              </>
            ) : null}

            {activeTab === 'transforms' ? (
              <WorkspacePlaceholder
                icon={Sparkles}
                title="Transformationen vorbereitet"
                description="Dieser Bereich bündelt Upload, Synthetic Generation und Session Extraction. In V1 wird die Struktur sichtbar gemacht, damit der Ausbau später ohne erneuten IA-Umbau folgen kann."
              />
            ) : null}

            {activeTab === 'quality' ? (
              <WorkspacePlaceholder
                icon={ShieldAlert}
                title="Qualitätsansicht vorbereitet"
                description="Hier werden später PII-Checks, Duplikate, Qualitäts-Scores und Freigaben zentral überprüft."
              />
            ) : null}

            {activeTab === 'versions' ? (
              <WorkspacePlaceholder
                icon={Database}
                title="Versionen folgen im nächsten Schritt"
                description="Die neue IA reserviert diesen Bereich für Versionierung, Vergleich und nachvollziehbare Dataset-Entwicklung."
              />
            ) : null}

            {activeTab === 'exports' ? (
              <WorkspacePlaceholder
                icon={Upload}
                title="Exporte folgen im nächsten Schritt"
                description="Hier landen später Exporte in LLM Training, Agent Training und externe Formate wie JSONL."
              />
            ) : null}
          </div>
        </div>
      </TrainingWorkspaceShell>

      <CreateDatasetModal
        isOpen={showCreateDataset}
        onClose={() => setShowCreateDataset(false)}
        onCreated={() => {
          setShowCreateDataset(false);
          void onRefreshDatasets();
        }}
      />
    </>
  );
}

function MetricCard({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof Database;
  color: string;
  label: string;
  value: number;
}) {
  const { surface, designStyle, textColor } = useThemeStyles();

  return (
    <div
      className="p-4"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
        border: `1px solid ${color}22`,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <p className="text-xs font-medium uppercase tracking-[0.2em] opacity-55" style={{ color: textColor }}>
          {label}
        </p>
      </div>
      <p className="mt-3 text-3xl font-semibold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  const { textColor } = useThemeStyles();

  return (
    <div className="flex items-center justify-center py-14">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: textColor, opacity: 0.6 }} />
    </div>
  );
}

function WorkspacePlaceholder({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: typeof Database;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { surface, accentColor, designStyle, textColor } = useThemeStyles();

  return (
    <div
      className="flex min-h-[320px] items-center justify-center p-6"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
      }}
    >
      <div className="max-w-2xl text-center">
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: `${accentColor}1f` }}
        >
          <Icon className="h-7 w-7" style={{ color: accentColor }} />
        </div>
        <h3 className="text-xl font-semibold" style={{ color: textColor }}>
          {title}
        </h3>
        <p className="mt-3 text-sm opacity-65" style={{ color: textColor }}>
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
    </div>
  );
}
