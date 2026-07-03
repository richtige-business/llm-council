// ============================================
// llm-config-store.ts - LLM Provider & Model Konfiguration für Lab Builder
// 
// Zweck: Speichert LLM Provider und Model-Auswahl für den Module Builder
// Verwendet von: BuilderChat, ProjectSettings
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LLMProvider } from '@/lib/llm/types';
import { DEFAULT_OPENROUTER_MODEL_ID, normalizeOpenRouterModelId } from '@/lib/llm/model-catalog';

const OPENROUTER_STORE_FALLBACK = [
  { id: DEFAULT_OPENROUTER_MODEL_ID, name: 'OpenAI: GPT-4o' },
];

// --------------------------------------------
// LLM Config Interface
// --------------------------------------------

export interface LLMConfig {
  provider: LLMProvider;
  model: string; // Model ID (z.B. 'gpt-4o' oder 'claude-sonnet-4-20250514')
}

// --------------------------------------------
// Store State
// --------------------------------------------

interface LLMConfigState {
  // Globale LLM Config für alle Projekte (kann pro Projekt überschrieben werden)
  globalConfig: LLMConfig;
  
  // Pro-Projekt Configs (projectId -> LLMConfig)
  projectConfigs: Record<string, LLMConfig>;
  
  // Setzt die globale Config
  setGlobalConfig: (config: Partial<LLMConfig>) => void;
  
  // Setzt die Config für ein spezifisches Projekt
  setProjectConfig: (projectId: string, config: Partial<LLMConfig>) => void;
  
  // Holt die Config für ein Projekt (mit Fallback zu global)
  getProjectConfig: (projectId: string) => LLMConfig;
  
  // Verfügbare Modelle für einen Provider
  getAvailableModelsForProvider: (provider: LLMProvider) => Array<{ id: string; name: string; description?: string }>;
}

// --------------------------------------------
// Default Config
// --------------------------------------------

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'openai',
  model: DEFAULT_OPENROUTER_MODEL_ID,
};

// --------------------------------------------
// Store erstellen
// --------------------------------------------

export const useLLMConfigStore = create<LLMConfigState>()(
  persist(
    (set, get) => ({
      globalConfig: DEFAULT_CONFIG,
      projectConfigs: {},
      
      setGlobalConfig: (updates) => {
        set((state) => ({
          globalConfig: {
            ...state.globalConfig,
            ...updates,
            provider: 'openai',
            model: normalizeOpenRouterModelId(updates.model || state.globalConfig.model),
          },
        }));
      },
      
      setProjectConfig: (projectId, updates) => {
        set((state) => {
          const currentConfig = state.projectConfigs[projectId] || state.globalConfig;
          return {
            projectConfigs: {
              ...state.projectConfigs,
              [projectId]: {
                ...currentConfig,
                ...updates,
                provider: 'openai',
                model: normalizeOpenRouterModelId(updates.model || currentConfig.model),
              },
            },
          };
        });
      },
      
      getProjectConfig: (projectId) => {
        const { projectConfigs, globalConfig } = get();
        const config = projectConfigs[projectId] || globalConfig;
        return {
          provider: 'openai',
          model: normalizeOpenRouterModelId(config.model),
        };
      },
      
      getAvailableModelsForProvider: () => {
        return OPENROUTER_STORE_FALLBACK;
      },
    }),
    {
      name: 'lifeos-lab-llm-config',
      partialize: (state) => ({
        globalConfig: state.globalConfig,
        projectConfigs: state.projectConfigs,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        state.globalConfig = {
          provider: 'openai',
          model: normalizeOpenRouterModelId(state.globalConfig?.model),
        };

        state.projectConfigs = Object.fromEntries(
          Object.entries(state.projectConfigs || {}).map(([projectId, config]) => [
            projectId,
            {
              provider: 'openai',
              model: normalizeOpenRouterModelId(config.model),
            },
          ])
        );
      },
    }
  )
);
