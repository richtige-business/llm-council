// ============================================
// agent-config-hooks.ts - Client-only Hooks für Agent-Config
// 
// Zweck: React Hooks die useEffect benötigen
//        Separate Datei um Server-Imports zu ermöglichen
// Verwendet von: Client-Komponenten (AgentSettingsModal, ChatWidget, etc.)
// ============================================

'use client';

import { useEffect } from 'react';
import { 
  useAgentConfigStore, 
  type AgentConfig,
} from './agent-config-store';
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/llm/model-catalog';

// --------------------------------------------
// Standard-Config erstellen (Kopie aus Store für Fallback)
// --------------------------------------------

const DEFAULT_MODULE_COLORS: Record<string, string> = {
  master: '#0ea5e9',
  calendar: '#f87171',
  inbox: '#fbbf24',
  browser: '#38bdf8',
  chat: '#EC4899',
  lab: '#14B8A6',
  'todo-list': '#F59E0B',
  training: '#EF4444',
};

const DEFAULT_AGENT_NAMES: Record<string, string> = {
  master: 'Intelligence',
  calendar: 'Kalender',
  inbox: 'Inbox',
  browser: 'Browser Agent',
  chat: 'Chat Agent',
  lab: 'Lab',
  'todo-list': 'Aufgaben Agent',
  training: 'Training Agent',
};

const DEFAULT_AGENT_ICONS: Record<string, string> = {
  master: 'Bot',
  calendar: 'Bot',
  inbox: 'Bot',
  browser: 'Bot',
  chat: 'Bot',
  lab: 'FlaskConical',
  'todo-list': 'ListChecks',
  training: 'BrainCircuit',
};

function createDefaultConfig(moduleId: string): AgentConfig {
  return {
    moduleId,
    agentName: DEFAULT_AGENT_NAMES[moduleId] || `${moduleId} Agent`,
    agentIcon: DEFAULT_AGENT_ICONS[moduleId] || 'Bot',
    orbColor: DEFAULT_MODULE_COLORS[moduleId] || '#0ea5e9',
    llmProvider: 'openai',
    llmModel: DEFAULT_OPENROUTER_MODEL_ID,
    systemPrompt: '',
    enabledTools: [],
    temperature: 0.7,
    maxTokens: 4096,
    visualModeEnabled: true,
    visualTools: [],
    humanInTheLoopTools: [],
    enabledSkills: [],
    allowedIntegrations: [],
    multimodal: {
      image: { enabled: false, provider: 'openai', model: 'gpt-image-1' },
      video: { enabled: false, provider: 'openai', model: 'sora' },
      tts: { enabled: false, provider: 'openai', model: 'tts-1' },
      stt: { enabled: false, provider: 'browser', model: 'browser-speech' },
    },
  };
}

// --------------------------------------------
// Hook: Agent-Config mit automatischer Initialisierung
// Nutzt ensureConfig um sicherzustellen, dass Config existiert
// NUR IN CLIENT-KOMPONENTEN VERWENDEN!
// --------------------------------------------

export function useAgentConfig(moduleId: string): AgentConfig {
  const config = useAgentConfigStore((state) => state.configs[moduleId]);
  const ensureConfig = useAgentConfigStore((state) => state.ensureConfig);
  
  // Initialisiere Config beim ersten Render (in useEffect um State-Änderungen
  // während des Renders zu vermeiden)
  useEffect(() => {
    ensureConfig(moduleId);
  }, [moduleId, ensureConfig]);
  
  // Gib existierende Config oder Default zurück
  return config || createDefaultConfig(moduleId);
}


