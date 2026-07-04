// ============================================
// route.ts - LLM Models API
//
// Zweck: Lädt den aktuellen OpenRouter-Modellkatalog fuer
//        alle Modellauswahlfenster der App
// Verwendet von: AgentSettingsModal, LLMTab, Lab Builder
// ============================================

import { NextResponse } from 'next/server';
import {
  buildModelProviders,
  mapOpenRouterModel,
  OPENROUTER_FALLBACK_MODELS,
  sortCatalogModels,
} from '@/lib/llm/model-catalog';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

// --------------------------------------------
// OpenRouter-Modelle laden und normalisieren
// --------------------------------------------

async function fetchOpenRouterModels() {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('[LLM Models] OpenRouter API Fehler:', response.status);
      return OPENROUTER_FALLBACK_MODELS;
    }

    const data = await response.json();
    const rawModels = Array.isArray(data?.data) ? data.data : [];
    const normalizedModels = sortCatalogModels(rawModels.map(mapOpenRouterModel));

    return normalizedModels.length > 0 ? normalizedModels : OPENROUTER_FALLBACK_MODELS;
  } catch (error) {
    console.warn('[LLM Models] OpenRouter Fetch Fehler:', error);
    return OPENROUTER_FALLBACK_MODELS;
  }
}

// --------------------------------------------
// GET Handler
// Liefert den kompletten OpenRouter-Katalog samt Anbieterliste
// --------------------------------------------

export async function GET() {
  const models = await fetchOpenRouterModels();
  const providers = buildModelProviders(models);

  return NextResponse.json({
    source: 'openrouter',
    models,
    providers,
  });
}
