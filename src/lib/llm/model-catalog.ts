// ============================================
// model-catalog.ts - Gemeinsamer OpenRouter-Modellkatalog
//
// Zweck: Normalisiert OpenRouter-Modelle fuer API, Hooks und UI
// Verwendet von: /api/llm/models, use-models, Agent-/Builder-Model-Selector
// ============================================

// --------------------------------------------
// Typen fuer Provider-Filter und Modell-Metadaten
// --------------------------------------------

export const DEFAULT_OPENROUTER_PROVIDER_FILTER = 'all';
export const DEFAULT_OPENROUTER_MODEL_ID = 'openai/gpt-4o';

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  provider: string;
  providerLabel: string;
  contextLength?: number;
  supportsTools?: boolean;
  isFree?: boolean;
}

export interface ModelProviderInfo {
  id: string;
  label: string;
  count: number;
}

interface OpenRouterModelRecord {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  supported_parameters?: string[];
}

const PROVIDER_LABEL_OVERRIDES: Record<string, string> = {
  '01-ai': '01.AI',
  'ai21': 'AI21',
  'arcee-ai': 'Arcee AI',
  'cohere': 'Cohere',
  'deepseek': 'DeepSeek',
  'google': 'Google',
  'meta-llama': 'Meta',
  'microsoft': 'Microsoft',
  'mistral': 'Mistral',
  'moonshot': 'Moonshot',
  'openai': 'OpenAI',
  'perplexity': 'Perplexity',
  'qwen': 'Qwen',
  'x-ai': 'xAI',
  'z-ai': 'Z.ai',
};

const PROVIDER_SORT_ORDER = [
  'openai',
  'anthropic',
  'google',
  'meta-llama',
  'x-ai',
  'mistral',
  'deepseek',
  'qwen',
  'cohere',
  'moonshot',
  'perplexity',
];

const LEGACY_MODEL_ID_MAP: Record<string, string> = {
  'claude-sonnet-4-20250514': 'anthropic/claude-sonnet-4',
  'claude-opus-4-20250514': 'anthropic/claude-opus-4',
  'claude-3-5-sonnet-20241022': 'anthropic/claude-sonnet-4',
  'claude-3-opus-20240229': 'anthropic/claude-opus-4',
  'claude-3-haiku-20240307': 'anthropic/claude-3-haiku',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'gpt-5': 'openai/gpt-5',
  'gpt-5-mini': 'openai/gpt-5-mini',
  'o1-preview': 'openai/o1',
  'o1-mini': 'openai/o1',
  'codex-mini-latest': 'openai/codex-mini',
};

// --------------------------------------------
// Statische Fallback-Modelle fuer Offline-/Fehlerfaelle
// --------------------------------------------

export const OPENROUTER_FALLBACK_MODELS: ModelInfo[] = [
  {
    id: 'openai/gpt-4o',
    name: 'OpenAI: GPT-4o',
    description: 'Allround-Modell fuer Chat, Tools und Multimodalitaet',
    provider: 'openai',
    providerLabel: 'OpenAI',
    contextLength: 128000,
    supportsTools: true,
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'OpenAI: GPT-4o Mini',
    description: 'Schneller und guenstiger fuer Standard-Tasks',
    provider: 'openai',
    providerLabel: 'OpenAI',
    contextLength: 128000,
    supportsTools: true,
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Anthropic: Claude Sonnet 4',
    description: 'Stark fuer reasoning-lastige Assistenz-Aufgaben',
    provider: 'anthropic',
    providerLabel: 'Anthropic',
    contextLength: 200000,
    supportsTools: true,
  },
  {
    id: 'google/gemini-2.5-pro',
    name: 'Google: Gemini 2.5 Pro',
    description: 'Grosses Kontextfenster fuer komplexe Workflows',
    provider: 'google',
    providerLabel: 'Google',
    contextLength: 1048576,
    supportsTools: true,
  },
  {
    id: 'x-ai/grok-4.20',
    name: 'xAI: Grok 4.20',
    description: 'Breit einsetzbares Modell mit grossem Kontext',
    provider: 'x-ai',
    providerLabel: 'xAI',
    contextLength: 2000000,
    supportsTools: true,
  },
];

// --------------------------------------------
// Provider aus Modell-ID ableiten
// OpenRouter nutzt das Schema "anbieter/modell"
// --------------------------------------------

export function getModelProviderId(modelId: string): string {
  const normalized = normalizeOpenRouterModelId(modelId);
  const [provider] = normalized.split('/');
  return provider || 'other';
}

export function getProviderLabel(providerId: string): string {
  return PROVIDER_LABEL_OVERRIDES[providerId] || providerId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// --------------------------------------------
// Alte lokale Modell-IDs auf OpenRouter-IDs mappen
// Damit bestehende Persistenz nicht unbrauchbar wird
// --------------------------------------------

export function normalizeOpenRouterModelId(modelId?: string | null): string {
  if (!modelId) return DEFAULT_OPENROUTER_MODEL_ID;
  if (modelId.includes('/')) return modelId;
  return LEGACY_MODEL_ID_MAP[modelId] || DEFAULT_OPENROUTER_MODEL_ID;
}

// --------------------------------------------
// OpenRouter-JSON in UI-freundliche Struktur ueberfuehren
// --------------------------------------------

export function mapOpenRouterModel(model: OpenRouterModelRecord): ModelInfo {
  const normalizedId = normalizeOpenRouterModelId(model.id);
  const provider = getModelProviderId(normalizedId);
  const supportedParameters = model.supported_parameters || [];

  return {
    id: normalizedId,
    name: model.name || normalizedId,
    description: model.description,
    provider,
    providerLabel: getProviderLabel(provider),
    contextLength: model.context_length,
    supportsTools: supportedParameters.includes('tools'),
    isFree: normalizedId.includes(':free'),
  };
}

export function sortCatalogModels(models: ModelInfo[]): ModelInfo[] {
  return [...models].sort((a, b) => {
    const providerIndexA = PROVIDER_SORT_ORDER.indexOf(a.provider);
    const providerIndexB = PROVIDER_SORT_ORDER.indexOf(b.provider);
    const normalizedProviderIndexA = providerIndexA === -1 ? PROVIDER_SORT_ORDER.length : providerIndexA;
    const normalizedProviderIndexB = providerIndexB === -1 ? PROVIDER_SORT_ORDER.length : providerIndexB;

    if (normalizedProviderIndexA !== normalizedProviderIndexB) {
      return normalizedProviderIndexA - normalizedProviderIndexB;
    }

    if (a.isFree !== b.isFree) {
      return Number(b.isFree) - Number(a.isFree);
    }

    return a.name.localeCompare(b.name, 'de');
  });
}

export function buildModelProviders(models: ModelInfo[]): ModelProviderInfo[] {
  const counts = new Map<string, number>();

  for (const model of models) {
    counts.set(model.provider, (counts.get(model.provider) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: getProviderLabel(id),
      count,
    }))
    .sort((a, b) => {
      const indexA = PROVIDER_SORT_ORDER.indexOf(a.id);
      const indexB = PROVIDER_SORT_ORDER.indexOf(b.id);
      const normalizedIndexA = indexA === -1 ? PROVIDER_SORT_ORDER.length : indexA;
      const normalizedIndexB = indexB === -1 ? PROVIDER_SORT_ORDER.length : indexB;

      if (normalizedIndexA !== normalizedIndexB) {
        return normalizedIndexA - normalizedIndexB;
      }

      return a.label.localeCompare(b.label, 'de');
    });
}

export function filterModelsByProvider(
  models: ModelInfo[],
  providerFilter: string
): ModelInfo[] {
  if (!providerFilter || providerFilter === DEFAULT_OPENROUTER_PROVIDER_FILTER) {
    return models;
  }

  return models.filter((model) => model.provider === providerFilter);
}
