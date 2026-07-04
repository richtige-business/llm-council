// ============================================
// use-models.ts - Hook fuer dynamische Modell-Liste
//
// Zweck: Laedt den OpenRouter-Modellkatalog von der API
// Verwendet von: AgentSettingsModal, LLMTab, Agent- und Builder-UI
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  buildModelProviders,
  type ModelInfo,
  type ModelProviderInfo,
  OPENROUTER_FALLBACK_MODELS,
} from './model-catalog';

interface ModelsApiResponse {
  source: 'openrouter';
  models: ModelInfo[];
  providers: ModelProviderInfo[];
}

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>(OPENROUTER_FALLBACK_MODELS);
  const [providers, setProviders] = useState<ModelProviderInfo[]>(buildModelProviders(OPENROUTER_FALLBACK_MODELS));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/llm/models');
      if (!res.ok) throw new Error(`API Fehler: ${res.status}`);
      const data: ModelsApiResponse = await res.json();

      if (data.models?.length > 0) {
        setModels(data.models);
      }

      if (data.providers?.length > 0) {
        setProviders(data.providers);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, providers, loading, error, refetch: fetchModels };
}
