// ============================================
// ModelSelector.tsx - Modellauswahl Dropdown
//
// Zweck: Ermoeglicht die Auswahl aktueller OpenRouter-Modelle
//        direkt in der Chat-Bar inklusive Anbieterfilter
// Verwendet von: AgentChatBar.tsx
// ============================================

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronDown, Sparkles } from 'lucide-react';
import { useAgentConfigStore } from '@/lib/agent/stores/agent-config-store';
import {
  DEFAULT_OPENROUTER_MODEL_ID,
  DEFAULT_OPENROUTER_PROVIDER_FILTER,
  filterModelsByProvider,
  getModelProviderId,
} from '@/lib/llm/model-catalog';
import { useModels } from '@/lib/llm/use-models';

// --------------------------------------------
// Props
// --------------------------------------------

interface ModelSelectorProps {
  agentId: string;       // Agent-ID für Config-Zugriff
  compact?: boolean;     // Kompakte Ansicht (nur Icon + Modellname)
}

// --------------------------------------------
// Komponente: ModelSelector
// Dropdown zur Modellauswahl in der Chat-Bar
// --------------------------------------------

export function ModelSelector({ agentId, compact = true }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [providerFilter, setProviderFilter] = useState(DEFAULT_OPENROUTER_PROVIDER_FILTER);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Agent-Config aus Store (einzelne Felder fuer stabile Referenzen)
  const currentModel = useAgentConfigStore(
    (state) => state.configs[agentId]?.llmModel ?? DEFAULT_OPENROUTER_MODEL_ID
  );
  const updateConfig = useAgentConfigStore((state) => state.updateConfig);
  const { models: allModels, providers, loading } = useModels();

  const currentModelInfo = useMemo(
    () => allModels.find((model) => model.id === currentModel) || allModels[0],
    [allModels, currentModel]
  );
  const filteredModels = useMemo(
    () => filterModelsByProvider(allModels, providerFilter),
    [allModels, providerFilter]
  );

  // Klick außerhalb schließt Dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    setProviderFilter(getModelProviderId(currentModel));
  }, [currentModel]);

  // Modell wechseln
  const handleModelChange = (modelId: string) => {
    updateConfig(agentId, { llmProvider: 'openai', llmModel: modelId });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ----------------------------------------
          Trigger-Button
          ---------------------------------------- */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-white/60 hover:text-white/80 hover:bg-white/10 transition-colors"
      >
        <Sparkles className="h-3 w-3" />
        <span className="text-[11px] font-medium">
          {compact
            ? (currentModelInfo?.name || 'Modell waehlen')
            : `${currentModelInfo?.providerLabel || 'OpenRouter'} · ${currentModelInfo?.name || 'Modell waehlen'}`}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* ----------------------------------------
          Dropdown-Panel
          ---------------------------------------- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-72 rounded-xl bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl z-50 overflow-hidden"
          >
            {/* Anbieter-Filter */}
            <div className="border-b border-white/10 px-2 py-2">
              <div className="mb-1.5 px-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
                Anbieter
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1">
                <button
                  onClick={() => setProviderFilter(DEFAULT_OPENROUTER_PROVIDER_FILTER)}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    providerFilter === DEFAULT_OPENROUTER_PROVIDER_FILTER
                      ? 'bg-white/12 text-white'
                      : 'text-white/45 hover:bg-white/8 hover:text-white/70'
                  }`}
                >
                  Alle
                </button>
                {providers.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setProviderFilter(entry.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      providerFilter === entry.id
                        ? 'bg-white/12 text-white'
                        : 'text-white/45 hover:bg-white/8 hover:text-white/70'
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modell-Liste */}
            <div className="p-1.5 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-2 text-xs text-white/45">Lade OpenRouter-Modelle...</div>
              ) : filteredModels.map((model) => {
                const isSelected = model.id === currentModel;

                return (
                  <button
                    key={model.id}
                    onClick={() => handleModelChange(model.id)}
                    className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/8'
                    }`}
                  >
                    <Bot className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${
                      isSelected ? 'text-purple-400' : 'text-white/40'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{model.name}</p>
                      <p className="text-[10px] text-white/40">
                        {model.providerLabel} · {model.description || model.id}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="ml-auto mt-0.5 h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
