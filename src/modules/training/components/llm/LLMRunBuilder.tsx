'use client';

// ============================================
// LLMRunBuilder.tsx - Run-Builder fuer simulierte Trainingslaeufe
//
// Zweck: Erstellt normale Runs im Mock-Modus, damit Settings und
//        Animationen ohne echte Trainingsinfrastruktur testbar sind
// Verwendet von: LLMTrainingWorkspace
// ============================================

import { useEffect, useMemo, useState } from 'react';
import { FlaskConical, Play, SlidersHorizontal } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { TRAINING_CONFIG_PRESETS } from '../../constants';
import type {
  Dataset,
  LLMTrainingSubmode,
  TrainingJob,
  TrainingModel,
  TrainingVisualizationKind,
} from '../../types';

// --------------------------------------------
// Props
// --------------------------------------------

interface LLMRunBuilderProps {
  submode: LLMTrainingSubmode;
  models: TrainingModel[];
  datasets: Dataset[];
  onRunCreated: (job: RunBuilderTrainingJob) => Promise<void> | void;
}

type TrainingPresetKey = keyof typeof TRAINING_CONFIG_PRESETS;
type RunBuilderTrainingJob = TrainingJob & {
  model?: { id: string; name: string; type: string; icon?: string; color?: string };
  dataset?: { id: string; name: string; type: string; rowCount: number };
};

// --------------------------------------------
// Run-Builder
// Erstellt ueber die bestehende Jobs-API normale Simulations-Runs
// --------------------------------------------

export function LLMRunBuilder({
  submode,
  models,
  datasets,
  onRunCreated,
}: LLMRunBuilderProps) {
  const { surface, accentColor, designStyle, textColor } = useThemeStyles();
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [teacherModelId, setTeacherModelId] = useState('');
  const [studentModelId, setStudentModelId] = useState('');
  const [preset, setPreset] = useState<TrainingPresetKey>('balanced');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visualizationKind: TrainingVisualizationKind =
    submode === 'distillation'
      ? 'distillation'
      : submode === 'preference-training'
        ? 'preference'
        : 'fine-tuning';

  const availableDatasets = useMemo(() => {
    return datasets.filter((dataset) => {
      if (dataset.status !== 'ready') return false;
      if (submode === 'preference-training') return dataset.type === 'dpo';
      return dataset.type === 'sft';
    });
  }, [datasets, submode]);

  const availableModels = useMemo(
    () => models.filter((model) => model.type === 'text'),
    [models]
  );

  useEffect(() => {
    if (!selectedModelId && availableModels[0] && submode !== 'distillation') {
      setSelectedModelId(availableModels[0].id);
    }
  }, [availableModels, selectedModelId, submode]);

  useEffect(() => {
    if (!selectedDatasetId && availableDatasets[0]) {
      setSelectedDatasetId(availableDatasets[0].id);
    }
  }, [availableDatasets, selectedDatasetId]);

  useEffect(() => {
    if (submode === 'distillation' && availableModels.length >= 2) {
      if (!teacherModelId) {
        setTeacherModelId(availableModels[0].id);
      }
      if (!studentModelId) {
        setStudentModelId(availableModels[1].id);
      }
    }
  }, [availableModels, teacherModelId, studentModelId, submode]);

  const selectedTeacher = availableModels.find((model) => model.id === teacherModelId) || null;
  const selectedStudent = availableModels.find((model) => model.id === studentModelId) || null;

  const currentMethod = submode === 'preference-training' ? 'dpo' : 'sft';
  const targetModelId = submode === 'distillation' ? studentModelId : selectedModelId;

  const canStartRun = Boolean(
    selectedDatasetId &&
      targetModelId &&
      (submode !== 'distillation' || (teacherModelId && studentModelId && teacherModelId !== studentModelId))
  );

  const handleStartRun = async () => {
    if (!canStartRun) {
      setError('Bitte wähle zuerst ein Modell und ein passendes Dataset aus.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const presetConfig = TRAINING_CONFIG_PRESETS[preset].config;

    try {
      const response = await fetch('/api/training/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: targetModelId,
          datasetId: selectedDatasetId,
          method: currentMethod,
          gpuProvider: 'mock',
          config: {
            ...presetConfig,
            visualizationKind,
            teacherModelId: teacherModelId || null,
            teacherModelName: selectedTeacher?.name || null,
            studentModelId: studentModelId || targetModelId,
            studentModelName:
              selectedStudent?.name ||
              availableModels.find((model) => model.id === targetModelId)?.name ||
              null,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Run konnte nicht gestartet werden');
      }

      await onRunCreated(data.job as RunBuilderTrainingJob);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Unbekannter Fehler beim Starten des Runs'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="mb-4 p-4"
      style={{
        ...surface.base,
        borderRadius: designStyle === 'brutal' ? '0.75rem' : '1.25rem',
      }}
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] opacity-50" style={{ color: textColor }}>
            Simulations-Run
          </p>
          <h3 className="mt-1 text-lg font-semibold" style={{ color: textColor }}>
            Starte einen normalen Run im Mock-Modus
          </h3>
          <p className="mt-1 text-sm opacity-65" style={{ color: textColor }}>
            Damit testest du Settings, Logs und Animationen ohne echte Trainingsinfrastruktur.
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background: 'rgba(59, 130, 246, 0.14)',
            color: '#60a5fa',
          }}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Mock Provider aktiv
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {submode === 'distillation' ? (
            <>
              <SelectField
                label="Teacher Modell"
                value={teacherModelId}
                onChange={setTeacherModelId}
                options={availableModels.map((model) => ({
                  value: model.id,
                  label: model.name,
                }))}
                placeholder="Teacher wählen"
              />
              <SelectField
                label="Student Modell"
                value={studentModelId}
                onChange={setStudentModelId}
                options={availableModels.map((model) => ({
                  value: model.id,
                  label: model.name,
                }))}
                placeholder="Student wählen"
              />
            </>
          ) : (
            <SelectField
              label="Zielmodell"
              value={selectedModelId}
              onChange={setSelectedModelId}
              options={availableModels.map((model) => ({
                value: model.id,
                label: model.name,
              }))}
              placeholder="Modell wählen"
            />
          )}

          <SelectField
            label="Dataset"
            value={selectedDatasetId}
            onChange={setSelectedDatasetId}
            options={availableDatasets.map((dataset) => ({
              value: dataset.id,
              label: `${dataset.name} · ${dataset.rowCount.toLocaleString()} Rows`,
            }))}
            placeholder="Dataset wählen"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
              Preset
            </label>
            <div className="grid gap-2 md:grid-cols-3">
              {(Object.keys(TRAINING_CONFIG_PRESETS) as TrainingPresetKey[]).map((key) => {
                const presetInfo = TRAINING_CONFIG_PRESETS[key];
                const isActive = preset === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPreset(key)}
                    className="rounded-xl border px-3 py-3 text-left transition-transform hover:-translate-y-0.5"
                    style={{
                      borderColor: isActive ? `${accentColor}66` : 'rgba(255, 255, 255, 0.08)',
                      background: isActive ? `${accentColor}14` : 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: textColor }}>
                      {presetInfo.name}
                    </p>
                    <p className="mt-1 text-xs opacity-60" style={{ color: textColor }}>
                      {presetInfo.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" style={{ color: accentColor }} />
              <p className="text-sm font-semibold" style={{ color: textColor }}>
                Run-Vorschau
              </p>
            </div>
            <div className="space-y-2 text-xs" style={{ color: textColor }}>
              <p className="opacity-70">Methode: {currentMethod.toUpperCase()}</p>
              <p className="opacity-70">Visual: {visualizationKind}</p>
              <p className="opacity-70">Preset: {TRAINING_CONFIG_PRESETS[preset].name}</p>
              <p className="opacity-70">Provider: Mock (Simulation)</p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex items-center justify-end">
        <button
          type="button"
          onClick={handleStartRun}
          disabled={isSubmitting || !canStartRun}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-50"
          style={{ background: accentColor }}
        >
          <Play className="h-4 w-4" />
          {isSubmitting ? 'Starte Simulation...' : 'Run starten'}
        </button>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  const { surface, designStyle, textColor } = useThemeStyles();

  return (
    <div>
      <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 text-sm outline-none"
        style={{
          ...surface.base,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.875rem',
          color: textColor,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
