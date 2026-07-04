// ============================================
// AgentSettingsModelTab.tsx - Modell- und Prompt-Tab
//
// Zweck: Kapselt den schweren Model-/Prompt-Bereich
//        inklusive Modell-Fetching fuer lazy Loading
// Verwendet von: AgentSettingsPage.tsx
// ============================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useModels } from '@/lib/llm/use-models';
import type { LLMProvider } from '@/lib/llm/types';
import {
  AGENT_MULTIMODAL_MODEL_OPTIONS,
  type AgentMultimodalConfig,
  type AgentMultimodalModality,
  type AgentMultimodalProvider,
} from '@/lib/agent/stores/agent-config-store';
import {
  DEFAULT_OPENROUTER_PROVIDER_FILTER,
  filterModelsByProvider,
  getModelProviderId,
} from '@/lib/llm/model-catalog';

interface AgentSettingsModelTabProps {
  provider: LLMProvider;
  onProviderChange: (provider: LLMProvider) => void;
  model: string;
  onModelChange: (model: string) => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  maxTokens: number;
  onMaxTokensChange: (value: number) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  multimodal: AgentMultimodalConfig;
  onMultimodalChange: (value: AgentMultimodalConfig) => void;
  onSave: () => void;
  onReset: () => void;
}

const MULTIMODAL_META: Array<{
  id: AgentMultimodalModality;
  label: string;
  description: string;
}> = [
  {
    id: 'image',
    label: 'Image',
    description: 'Bildgenerierung fuer Assets, Visuals und Mockups.',
  },
  {
    id: 'video',
    label: 'Video',
    description: 'Videogenerierung fuer Sequenzen, Demos und Szenen.',
  },
  {
    id: 'tts',
    label: 'TTS',
    description: 'Text-to-Speech fuer Sprachausgabe und Voice Responses.',
  },
  {
    id: 'stt',
    label: 'STT',
    description: 'Speech-to-Text fuer Spracheingabe und Transkription.',
  },
];

const PROVIDER_LABELS: Record<AgentMultimodalProvider, string> = {
  openai: 'OpenAI',
  browser: 'Browser',
};

export function AgentSettingsModelTab({
  provider,
  onProviderChange,
  model,
  onModelChange,
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  prompt,
  onPromptChange,
  multimodal,
  onMultimodalChange,
  onSave,
  onReset,
}: AgentSettingsModelTabProps) {
  const { models: allModels, providers, loading: modelsLoading } = useModels();
  const [providerFilter, setProviderFilter] = useState(() => getModelProviderId(model));

  useEffect(() => {
    // OpenRouter laeuft in diesem Setup immer ueber den OpenAI-kompatiblen Client.
    if (provider !== 'openai') {
      onProviderChange('openai');
    }
  }, [onProviderChange, provider]);

  useEffect(() => {
    setProviderFilter(getModelProviderId(model));
  }, [model]);

  const models = useMemo(
    () => filterModelsByProvider(allModels, providerFilter),
    [allModels, providerFilter]
  );

  const updateMultimodalMode = (
    modality: AgentMultimodalModality,
    updates: Partial<AgentMultimodalConfig[AgentMultimodalModality]>
  ) => {
    onMultimodalChange({
      ...multimodal,
      [modality]: {
        ...multimodal[modality],
        ...updates,
      },
    });
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-4 text-sm font-semibold text-white">Model & Prompt</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-white/60">Anbieter-Filter</label>
          <select
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
          >
            <option value={DEFAULT_OPENROUTER_PROVIDER_FILTER}>Alle Anbieter</option>
            {providers.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label} ({entry.count})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">Modell</label>
          <select
            value={model}
            onChange={(event) => {
              onProviderChange('openai');
              onModelChange(event.target.value);
            }}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
          >
            {modelsLoading && <option>Lade Modelle...</option>}
            {models.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.providerLabel} · {entry.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">Temperature</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(event) => onTemperatureChange(Number(event.target.value))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/60">Max Tokens</label>
          <input
            type="number"
            min="256"
            step="256"
            value={maxTokens}
            onChange={(event) => onMaxTokensChange(Number(event.target.value))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-white/45">
        Die Modellliste kommt live von OpenRouter. Gefiltert wird nach Anbieter, ausgefuehrt wird immer ueber den OpenAI-kompatiblen OpenRouter-Client.
      </p>
      <div className="mt-4">
        <label className="mb-1 block text-xs text-white/60">System Prompt</label>
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          rows={10}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
          placeholder="Optionaler System Prompt fuer diesen Agenten..."
        />
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white">Multimodale Modelle</h4>
          <p className="mt-1 text-xs text-white/45">
            Definiere spezialisierte Modelle fuer Bild, Video, Sprachausgabe und Transkription.
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {MULTIMODAL_META.map((entry) => {
            const modeConfig = multimodal[entry.id];
            const allOptions = AGENT_MULTIMODAL_MODEL_OPTIONS[entry.id];
            const availableProviders = Array.from(new Set(allOptions.map((option) => option.provider)));
            const providerOptions = allOptions.filter((option) => option.provider === modeConfig.provider);

            return (
              <div
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-medium text-white">{entry.label}</h5>
                    <p className="mt-1 text-xs text-white/45">{entry.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateMultimodalMode(entry.id, { enabled: !modeConfig.enabled })}
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      modeConfig.enabled
                        ? 'border-emerald-400/35 bg-emerald-400/15 text-emerald-200'
                        : 'border-white/10 bg-white/5 text-white/50'
                    }`}
                  >
                    {modeConfig.enabled ? 'Aktiv' : 'Inaktiv'}
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-white/60">Provider</label>
                    <select
                      value={modeConfig.provider}
                      onChange={(event) => {
                        const nextProvider = event.target.value as AgentMultimodalProvider;
                        const fallbackModel =
                          allOptions.find((option) => option.provider === nextProvider)?.id
                          || allOptions[0]?.id
                          || modeConfig.model;
                        updateMultimodalMode(entry.id, {
                          provider: nextProvider,
                          model: fallbackModel,
                        });
                      }}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                    >
                      {availableProviders.map((providerOption) => (
                        <option key={`${entry.id}-${providerOption}`} value={providerOption}>
                          {PROVIDER_LABELS[providerOption]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-white/60">Modell</label>
                    <select
                      value={modeConfig.model}
                      onChange={(event) => updateMultimodalMode(entry.id, { model: event.target.value })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/25 focus:outline-none"
                    >
                      {providerOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[11px] text-white/35">
                    {providerOptions.find((option) => option.id === modeConfig.model)?.description || 'Keine Zusatzbeschreibung vorhanden.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          Modell-Slots zuruecksetzen
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
        >
          Modelleinstellungen speichern
        </button>
      </div>
    </div>
  );
}

