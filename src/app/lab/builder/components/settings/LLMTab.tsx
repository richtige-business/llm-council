// ============================================
// LLMTab.tsx - OpenRouter Modell-Auswahl
//
// Zweck: UI fuer Anbieterfilter und Modell-Auswahl im Module Builder
// ============================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import { useModels } from '@/lib/llm/use-models';
import {
  DEFAULT_OPENROUTER_MODEL_ID,
  DEFAULT_OPENROUTER_PROVIDER_FILTER,
  filterModelsByProvider,
  getModelProviderId,
} from '@/lib/llm/model-catalog';
import type { LLMConfig } from '../../stores/llm-config-store';

interface LLMTabProps {
  projectId: string;
  config: LLMConfig;
  onUpdate: (projectId: string, updates: Partial<LLMConfig>) => void;
}

export function LLMTab({ projectId, config, onUpdate }: LLMTabProps) {
  const { surface, accentColor, textColor, designStyle } = useThemeStyles();
  const { models: allModels, providers } = useModels();
  const [manualProviderFilter, setManualProviderFilter] = useState<string | null>(null);
  const providerFilter = manualProviderFilter || getModelProviderId(config.model || DEFAULT_OPENROUTER_MODEL_ID);
  const availableModels = useMemo(
    () => filterModelsByProvider(allModels, providerFilter),
    [allModels, providerFilter]
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const selectedModel = allModels.find((m) => m.id === config.model) || allModels[0];

  useEffect(() => {
    if (availableModels.length === 0) return;
    if (availableModels.some((m) => m.id === config.model)) return;
    onUpdate(projectId, { provider: 'openai', model: availableModels[0].id });
  }, [availableModels, config.model, onUpdate, projectId]);

  const handleModelChange = (modelId: string) => {
    onUpdate(projectId, { provider: 'openai', model: modelId });
    setModelOpen(false);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>
          OpenRouter Modellkatalog
        </h3>
        <p className="text-sm mb-4" style={{ color: textColor, opacity: 0.6 }}>
          Waehle ein Modell aus dem aktuellen OpenRouter-Katalog. Gefiltert wird nach Anbieter, ausgefuehrt wird ueber den OpenAI-kompatiblen OpenRouter-Client.
        </p>
      </div>
      
      {/* Anbieter-Filter */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
          Anbieter-Filter
        </label>
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="w-full flex items-center justify-between p-3 rounded-lg text-sm"
            style={{
              ...surface.base,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              color: textColor,
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
              <span>
                {providerFilter === DEFAULT_OPENROUTER_PROVIDER_FILTER
                  ? 'Alle Anbieter'
                  : (providers.find((entry) => entry.id === providerFilter)?.label || providerFilter)}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {filterOpen && (
            <div
              className="absolute z-10 w-full mt-2 rounded-lg shadow-lg overflow-hidden"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              }}
            >
              <button
                onClick={() => {
                  setManualProviderFilter(DEFAULT_OPENROUTER_PROVIDER_FILTER);
                  setFilterOpen(false);
                }}
                className="w-full text-left p-3 hover:bg-opacity-50 transition-colors"
                style={{
                  background: providerFilter === DEFAULT_OPENROUTER_PROVIDER_FILTER ? `${accentColor}20` : 'transparent',
                  color: textColor,
                }}
              >
                <div className="font-medium">Alle Anbieter</div>
                <div className="text-xs opacity-60">Kompletter OpenRouter-Katalog</div>
              </button>
              {providers.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setManualProviderFilter(entry.id);
                    setFilterOpen(false);
                  }}
                  className="w-full text-left p-3 hover:bg-opacity-50 transition-colors"
                  style={{
                    background: providerFilter === entry.id ? `${accentColor}20` : 'transparent',
                    color: textColor,
                  }}
                >
                  <div className="font-medium">{entry.label}</div>
                  <div className="text-xs opacity-60">{entry.count} Modelle</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Model Auswahl */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
          Modell
        </label>
        <div className="relative">
          <button
            onClick={() => setModelOpen(!modelOpen)}
            className="w-full flex items-center justify-between p-3 rounded-lg text-sm"
            style={{
              ...surface.base,
              borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              color: textColor,
            }}
          >
            <div>
              <div className="font-medium">{selectedModel.name}</div>
              {selectedModel.description && (
                <div className="text-xs opacity-60">{selectedModel.providerLabel} · {selectedModel.description}</div>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${modelOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {modelOpen && (
            <div
              className="absolute z-10 w-full mt-2 max-h-64 overflow-y-auto rounded-lg shadow-lg"
              style={{
                ...surface.base,
                borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
              }}
            >
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className="w-full text-left p-3 hover:bg-opacity-50 transition-colors"
                  style={{
                    background: config.model === model.id ? `${accentColor}20` : 'transparent',
                    color: textColor,
                  }}
                >
                  <div className="font-medium">{model.name}</div>
                  {model.description && (
                    <div className="text-xs opacity-60">{model.providerLabel} · {model.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div
        className="p-4 rounded-lg"
        style={{
          background: `${accentColor}10`,
          borderRadius: designStyle === 'brutal' ? '0.5rem' : '0.75rem',
        }}
      >
        <p className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
          💡 <strong>Tipp:</strong> Diese Einstellungen gelten nur fuer dieses Projekt.
          Du kannst pro Projekt einen anderen Anbieter filtern und ein anderes OpenRouter-Modell waehlen.
        </p>
      </div>
    </div>
  );
}
