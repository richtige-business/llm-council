// ============================================
// agent-config-store.ts - Konfiguration für Modul-Agenten
// 
// Zweck: Speichert und verwaltet die Einstellungen für jeden
//        Modul-spezifischen Agenten (LLM, Prompts, Tools, Farben)
// Verwendet von: AgentSettingsModal, API Route, ChatWidget
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LLMProvider } from '@/lib/llm/types';
import {
  DEFAULT_OPENROUTER_MODEL_ID,
  normalizeOpenRouterModelId,
} from '@/lib/llm/model-catalog';

// --------------------------------------------
// Verfügbare Claude-Modelle
// --------------------------------------------

export const CLAUDE_MODELS = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Standard - Schnell und sehr fähig',
    tier: 'recommended',
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Schnell, gut für die meisten Aufgaben',
    tier: 'fast',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: 'Leistungsstark für komplexe Aufgaben',
    tier: 'powerful',
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    description: 'Schnellstes Modell für einfache Aufgaben',
    tier: 'fastest',
  },
] as const;

export type ClaudeModelId = typeof CLAUDE_MODELS[number]['id'];

// --------------------------------------------
// Verfügbare OpenAI-Modelle
// --------------------------------------------

export const OPENAI_MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Standard - Schnell und sehr fähig',
    tier: 'recommended',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Leistungsstark für komplexe Aufgaben',
    tier: 'powerful',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Schnellstes Modell für einfache Aufgaben',
    tier: 'fastest',
  },
  {
    id: 'o1-preview',
    name: 'O1 Preview',
    description: 'Reasoning-Modell für komplexe Problemlösung',
    tier: 'reasoning',
  },
  {
    id: 'o1-mini',
    name: 'O1 Mini',
    description: 'Kleineres Reasoning-Modell',
    tier: 'reasoning',
  },
] as const;

export type OpenAIModelId = typeof OPENAI_MODELS[number]['id'];

// --------------------------------------------
// Multimodale Modell-Konfiguration
// Eigene Auswahl fuer Image, Video, TTS und STT
// --------------------------------------------

export type AgentMultimodalModality = 'image' | 'video' | 'tts' | 'stt';
export type AgentMultimodalProvider = 'openai' | 'browser';

export interface AgentMultimodalModelInfo {
  id: string;
  name: string;
  description?: string;
  provider: AgentMultimodalProvider;
}

export interface AgentMultimodalModeConfig {
  enabled: boolean;
  provider: AgentMultimodalProvider;
  model: string;
}

export interface AgentMultimodalConfig {
  image: AgentMultimodalModeConfig;
  video: AgentMultimodalModeConfig;
  tts: AgentMultimodalModeConfig;
  stt: AgentMultimodalModeConfig;
}

export const AGENT_MULTIMODAL_MODEL_OPTIONS: Record<
  AgentMultimodalModality,
  AgentMultimodalModelInfo[]
> = {
  image: [
    {
      id: 'gpt-image-1',
      name: 'GPT Image 1',
      description: 'Bildgenerierung fuer Assets, Variationen und Mockups',
      provider: 'openai',
    },
  ],
  video: [
    {
      id: 'sora',
      name: 'Sora',
      description: 'Videogenerierung fuer Sequenzen und Szenen',
      provider: 'openai',
    },
  ],
  tts: [
    {
      id: 'tts-1',
      name: 'TTS-1',
      description: 'Schnelle Sprachsynthese fuer Assistenz-Audio',
      provider: 'openai',
    },
    {
      id: 'tts-1-hd',
      name: 'TTS-1 HD',
      description: 'Hoehere Audioqualitaet bei etwas mehr Latenz',
      provider: 'openai',
    },
  ],
  stt: [
    {
      id: 'browser-speech',
      name: 'Browser Speech API',
      description: 'Lokale Spracheingabe direkt im Browser',
      provider: 'browser',
    },
    {
      id: 'gpt-4o-transcribe',
      name: 'GPT-4o Transcribe',
      description: 'Serverseitige Transkription mit guter Qualitaet',
      provider: 'openai',
    },
    {
      id: 'whisper-1',
      name: 'Whisper 1',
      description: 'Bewaehrtes Transkriptionsmodell fuer Audio-Uploads',
      provider: 'openai',
    },
  ],
};

export function createDefaultAgentMultimodalConfig(): AgentMultimodalConfig {
  return {
    image: {
      enabled: false,
      provider: 'openai',
      model: 'gpt-image-1',
    },
    video: {
      enabled: false,
      provider: 'openai',
      model: 'sora',
    },
    tts: {
      enabled: false,
      provider: 'openai',
      model: 'tts-1',
    },
    stt: {
      enabled: false,
      provider: 'browser',
      model: 'browser-speech',
    },
  };
}

function normalizeMultimodalModeConfig(
  modality: AgentMultimodalModality,
  input: Partial<AgentMultimodalModeConfig> | undefined
): AgentMultimodalModeConfig {
  const defaults = createDefaultAgentMultimodalConfig()[modality];
  const options = AGENT_MULTIMODAL_MODEL_OPTIONS[modality];
  const supportedProviders = new Set(options.map((entry) => entry.provider));
  const provider = input?.provider && supportedProviders.has(input.provider)
    ? input.provider
    : defaults.provider;
  const fallbackModelForProvider =
    options.find((entry) => entry.provider === provider)?.id
    || defaults.model;
  const model = input?.model && options.some(
    (entry) => entry.id === input.model && entry.provider === provider
  )
    ? input.model
    : fallbackModelForProvider;

  return {
    enabled: input?.enabled ?? defaults.enabled,
    provider,
    model,
  };
}

function normalizeAgentMultimodalConfig(
  config?: Partial<AgentMultimodalConfig>
): AgentMultimodalConfig {
  return {
    image: normalizeMultimodalModeConfig('image', config?.image),
    video: normalizeMultimodalModeConfig('video', config?.video),
    tts: normalizeMultimodalModeConfig('tts', config?.tts),
    stt: normalizeMultimodalModeConfig('stt', config?.stt),
  };
}

// --------------------------------------------
// Standard System-Prompt Vorlagen
// --------------------------------------------

export const SYSTEM_PROMPT_TEMPLATES = {
  default: `Du bist ein hilfreicher KI-Assistent für LLM Council. 
Antworte präzise und freundlich auf Deutsch.
Nutze die verfügbaren Tools um Aktionen auszuführen.`,

  calendar: `Du bist der Kalender-Assistent von LLM Council.
Deine Aufgabe ist es, dem Benutzer bei der Verwaltung seiner Termine zu helfen.
Du kannst Events erstellen, bearbeiten, löschen und anzeigen.
Beachte deutsche Datumsformate und Feiertage.
Antworte immer auf Deutsch.`,

  inbox: `Du bist der E-Mail-Assistent von LLM Council.
Deine Aufgabe ist es, dem Benutzer bei der Verwaltung seiner E-Mails zu helfen.
Du kannst E-Mails lesen, schreiben, beantworten und organisieren.
Achte auf professionelle Formulierungen.
Antworte immer auf Deutsch.`,

  browser: `Du bist der Browser-Assistent von LLM Council.
Deine Aufgabe ist es, dem Benutzer beim Surfen im Web zu helfen.
Du kannst Webseiten öffnen, Suchen durchführen und Inhalte analysieren.
Antworte immer auf Deutsch.`,

  todo: `Du bist der Aufgaben-Assistent von LLM Council.
Deine Aufgabe ist es, dem Benutzer bei der Verwaltung seiner To-Do-Listen zu helfen.
Du kannst Aufgaben erstellen, abhaken, priorisieren und organisieren.
Antworte immer auf Deutsch.`,

  agents: `Du bist der Agents-Assistent von LLM Council.
Du koordinierst verschiedene KI-Agenten und hilfst dem Benutzer mit Chat,
Web Research, Deep Research und Memory-Management.
Antworte freundlich und informativ auf Deutsch.`,

  chat: `Du bist der Chat-Assistent von LLM Council.
Deine Aufgabe ist es, dem Benutzer bei Gesprächen und Notizen zu helfen.
Antworte freundlich und informativ auf Deutsch.`,

  training: `Du bist der Training-Assistent von LLM Council.
Deine Aufgabe ist es, dem Benutzer bei KI-Training und Modell-Experimenten zu helfen.
Erkläre komplexe Konzepte verständlich.
Antworte immer auf Deutsch.`,

  lab: `Du bist der Lab-Assistent von LLM Council.
Deine Aufgabe ist es, den Module Builder zu steuern und den Build-Prozess zu koordinieren.
Arbeite strukturiert, liefere klare Schritte und frage bei riskanten Aktionen nach.
Antworte immer auf Deutsch.`,

  master: `Du bist der Hauptassistent von LLM Council - der "Über-Agent".
Du kannst alle Module von LLM Council steuern und koordinieren:
- Kalender: Termine verwalten
- Postfach: E-Mails verwalten
- Browser: Im Web surfen
- Aufgaben: To-Do-Listen verwalten
- Und mehr...

Erkenne anhand der Benutzeranfrage welches Modul angesprochen werden soll
und nutze die entsprechenden Tools.
Antworte immer auf Deutsch.`,
} as const;

// --------------------------------------------
// Agent-Konfiguration Interface
// Speichert alle Einstellungen für einen Modul-Agent
// --------------------------------------------

export interface AgentConfig {
  // Modul-ID (z.B. 'calendar', 'inbox', 'master')
  moduleId: string;
  
  // Custom Name für den Agent (z.B. "Max's Intelligence")
  agentName: string;
  
  // Agent-Icon (Lucide Icon Name, z.B. 'Bot', 'BrainCircuit')
  agentIcon: string;
  
  // Farbe des Intelligence Orb für dieses Modul
  orbColor: string;
  
  // ========================================
  // LLM Provider & Model Konfiguration
  // ========================================
  
  // Ausgewählter LLM Provider
  llmProvider: LLMProvider;
  
  // Ausgewähltes Modell (abhängig vom Provider)
  llmModel: string; // Kann Claude oder OpenAI Model ID sein
  
  // Custom System-Prompt (überschreibt Standard wenn gesetzt)
  systemPrompt: string;
  
  // Liste der aktivierten Tool-IDs für diesen Agent
  enabledTools: string[];
  
  // LLM Temperature (0.0 - 1.0)
  temperature: number;
  
  // Max Tokens für die Antwort
  maxTokens: number;
  
  // ========================================
  // Generative UI / Visual Mode Einstellungen
  // ========================================
  
  // Aktiviert den visuellen Modus (animierter Cursor, UI-Interaktion)
  // Wenn false: Agent arbeitet im Hintergrund (schneller)
  visualModeEnabled: boolean;

  // Liste von Tool-IDs, die visuell ausgeführt werden sollen
  // Leer = alle aktivierten Tools sichtbar ausführen
  visualTools: string[];
  
  // Liste von Tool-IDs die Benutzer-Bestätigung erfordern (Human in the Loop)
  // z.B. ['calendar.createEvent', 'inbox.sendEmail']
  // Basiert auf den Tools des jeweiligen Moduls
  humanInTheLoopTools: string[];

  // Aktivierte Skill-IDs für diesen Agenten
  // Leer = keine Skills explizit aktiviert
  enabledSkills: string[];

  // Erlaubte Integrationen für diesen Agenten
  // Leer = alle verbundenen Integrationen erlaubt
  allowedIntegrations: string[];

  // Multimodale Modell-Slots für spezialisierte Ausgaben/Eingaben
  multimodal: AgentMultimodalConfig;
}

// --------------------------------------------
// Standard-Konfigurationen pro Modul
// --------------------------------------------

export const DEFAULT_MODULE_COLORS: Record<string, string> = {
  master: '#0ea5e9',    // Cyan - Dashboard/Master Agent
  calendar: '#f87171',  // Rot - Kalender (entspricht Navbar: from-rose-300 to-red-400)
  inbox: '#fbbf24',     // Gelb - Postfach (entspricht Navbar: from-amber-200 to-yellow-300)
  browser: '#38bdf8',   // Blau - Browser (entspricht Navbar: from-sky-200 to-cyan-300)
  agents: '#8B5CF6',     // Lila - Agents (vorher Pink für Chat)
  lab: '#14B8A6',        // Teal - Module Builder
  settings: '#6366F1',   // Indigo - Einstellungen
  marketplace: '#A855F7', // Violet - Marketplace/Library
  chat: '#EC4899',       // Pink - Chat (backward-compat)
  'todo-list': '#F59E0B', // Orange - Aufgaben
  training: '#EF4444',  // Rot - Training
};

export const DEFAULT_AGENT_CONFIG: Omit<AgentConfig, 'moduleId' | 'orbColor' | 'agentName' | 'agentIcon'> = {
  llmProvider: 'openai', // Standard: OpenRouter ueber OpenAI-kompatiblen Client
  llmModel: DEFAULT_OPENROUTER_MODEL_ID, // Standard-Modell fuer OpenRouter
  systemPrompt: '',
  enabledTools: [], // Leer = alle Tools des Moduls aktiviert
  temperature: 0.7,
  maxTokens: 4096,
  // Generative UI / Visual Mode
  visualModeEnabled: true, // Standard: Generative UI aktiviert
  visualTools: [], // Leer = alle aktivierten Tools werden sichtbar ausgeführt
  humanInTheLoopTools: [], // Leer = keine Bestätigung nötig
  enabledSkills: [], // Leer = keine Skills explizit aktiviert
  allowedIntegrations: [], // Leer = alle verbundenen Integrationen erlaubt
  multimodal: createDefaultAgentMultimodalConfig(),
};

// Standard-Namen für Agenten (vollständige Namen)
export const DEFAULT_AGENT_NAMES: Record<string, string> = {
  master: 'Intelligence', // Standard für Dashboard
  calendar: 'Kalender',
  inbox: 'Inbox',
  browser: 'Browser Agent',
  agents: 'Agents',
  lab: 'Lab',
  settings: 'Settings Agent',
  marketplace: 'Marketplace Agent',
  chat: 'Chat Agent',
  'todo-list': 'Aufgaben Agent',
  training: 'Training Agent',
};

// --------------------------------------------
// Agent Icon Templates
// 5 verschiedene Persönlichkeiten für Agenten
// --------------------------------------------

export interface AgentIconTemplate {
  id: string;
  name: string;
  icon: string; // Lucide Icon Name
  description: string;
  personality: string; // Zusatz für den System-Prompt
}

export const AGENT_ICON_TEMPLATES: AgentIconTemplate[] = [
  {
    id: 'assistant',
    name: 'Assistent',
    icon: 'Bot',
    description: 'Freundlicher Helfer für alle Aufgaben',
    personality: 'Sei freundlich, hilfsbereit und geduldig. Erkläre Dinge verständlich.',
  },
  {
    id: 'expert',
    name: 'Experte',
    icon: 'BrainCircuit',
    description: 'Professioneller Spezialist mit Fachwissen',
    personality: 'Antworte präzise und fundiert. Teile dein Expertenwissen und erkläre Hintergründe.',
  },
  {
    id: 'creative',
    name: 'Kreativ',
    icon: 'Sparkles',
    description: 'Kreativer Denker mit originellen Ideen',
    personality: 'Sei kreativ und denke außerhalb der Box. Schlage innovative Lösungen vor.',
  },
  {
    id: 'organizer',
    name: 'Organisator',
    icon: 'ListChecks',
    description: 'Strukturierter Planer für Ordnung',
    personality: 'Strukturiere Informationen klar. Erstelle Listen und priorisiere Aufgaben effizient.',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    icon: 'TrendingUp',
    description: 'Analytiker für Daten und Zusammenhänge',
    personality: 'Analysiere Situationen gründlich. Zeige Muster auf und gib datenbasierte Empfehlungen.',
  },
];

// Standard-Icon für Module
export const DEFAULT_AGENT_ICONS: Record<string, string> = {
  master: 'Bot',
  calendar: 'Bot',
  inbox: 'Bot',
  browser: 'Bot',
  agents: 'BotMessageSquare',
  lab: 'FlaskConical',
  settings: 'Shield',
  marketplace: 'Layers',
  chat: 'Bot',
  'todo-list': 'ListChecks',
  training: 'BrainCircuit',
};

// Hilfsfunktion: Erstellt den vollständigen Master-Agent-Namen
export function getMasterAgentName(userName: string, customName?: string): string {
  const baseName = customName || DEFAULT_AGENT_NAMES.master;
  return `${userName}'s ${baseName}`;
}

// --------------------------------------------
// Store State Interface
// --------------------------------------------

interface AgentConfigState {
  // Map von moduleId zu AgentConfig
  configs: Record<string, AgentConfig>;
  
  // Gibt die Config für ein Modul zurück (mit Defaults, OHNE State zu ändern)
  getConfig: (moduleId: string) => AgentConfig;
  
  // Initialisiert die Config für ein Modul (in useEffect aufrufen)
  ensureConfig: (moduleId: string) => void;
  
  // Aktualisiert die Config für ein Modul
  updateConfig: (moduleId: string, updates: Partial<AgentConfig>) => void;
  
  // Setzt die Config für ein Modul auf Standardwerte zurück
  resetConfig: (moduleId: string) => void;
  
  // Setzt alle Configs zurück
  resetAllConfigs: () => void;
  
  // Gibt den System-Prompt für ein Modul zurück (mit Template-Fallback)
  getSystemPrompt: (moduleId: string) => string;
  
  // Gibt die Orb-Farbe für ein Modul zurück
  getOrbColor: (moduleId: string) => string;
  
  // Gibt den Agent-Namen für ein Modul zurück
  getAgentName: (moduleId: string) => string;
  
  // Gibt das Agent-Icon für ein Modul zurück
  getAgentIcon: (moduleId: string) => string;
}

// --------------------------------------------
// Alte Default-Farben (für Migration)
// Diese werden auf die neuen Farben aktualisiert
// --------------------------------------------

const OLD_DEFAULT_COLORS: Record<string, string> = {
  calendar: '#10B981',  // Altes Grün -> wird zu Rot
  inbox: '#3B82F6',     // Altes Blau -> wird zu Gelb
  browser: '#8B5CF6',   // Altes Lila -> wird zu Blau
};

// --------------------------------------------
// Hilfsfunktion: Standard-Config für ein Modul erstellen
// --------------------------------------------

function createDefaultConfig(moduleId: string): AgentConfig {
  return {
    moduleId,
    agentName: DEFAULT_AGENT_NAMES[moduleId] || `${moduleId} Agent`,
    agentIcon: DEFAULT_AGENT_ICONS[moduleId] || 'Bot',
    orbColor: DEFAULT_MODULE_COLORS[moduleId] || '#0ea5e9',
    ...DEFAULT_AGENT_CONFIG,
  };
}

function ensureNormalizedAgentConfig(config: AgentConfig): AgentConfig {
  return {
    ...config,
    llmProvider: 'openai',
    llmModel: normalizeOpenRouterModelId(config.llmModel),
    visualTools: Array.isArray(config.visualTools) ? config.visualTools : [],
    enabledSkills: Array.isArray(config.enabledSkills) ? config.enabledSkills : [],
    allowedIntegrations: Array.isArray(config.allowedIntegrations) ? config.allowedIntegrations : [],
    multimodal: normalizeAgentMultimodalConfig(config.multimodal),
  };
}

// --------------------------------------------
// Migration: Alte Configs ohne llmProvider migrieren
// --------------------------------------------

function migrateConfigProvider(configs: Record<string, AgentConfig>): Record<string, AgentConfig> {
  const migrated = { ...configs };
  let hasChanges = false;
  
  for (const [moduleId, config] of Object.entries(migrated)) {
    const normalizedModel = normalizeOpenRouterModelId(config.llmModel);
    const needsProviderMigration = config.llmProvider !== 'openai';
    const needsModelMigration = normalizedModel !== config.llmModel;

    if (needsProviderMigration || needsModelMigration) {
      migrated[moduleId] = {
        ...config,
        llmProvider: 'openai',
        llmModel: normalizedModel,
      };
      hasChanges = true;
    }
  }
  
  return hasChanges ? migrated : configs;
}

// --------------------------------------------
// Migration: Fuegt multimodale Defaults zu alten Configs hinzu
// --------------------------------------------

function migrateConfigMultimodal(configs: Record<string, AgentConfig>): Record<string, AgentConfig> {
  const migrated = { ...configs };
  let hasChanges = false;

  for (const [moduleId, config] of Object.entries(migrated)) {
    const normalized = ensureNormalizedAgentConfig(config);
    if (JSON.stringify(normalized.multimodal) !== JSON.stringify(config.multimodal)) {
      migrated[moduleId] = {
        ...normalized,
        moduleId,
      };
      hasChanges = true;
    }
  }

  return hasChanges ? migrated : configs;
}

// --------------------------------------------
// Migration: Aktualisiert alte Farben auf neue Defaults
// --------------------------------------------

function migrateConfigColors(configs: Record<string, AgentConfig>): Record<string, AgentConfig> {
  const migrated = { ...configs };
  let hasChanges = false;
  
  for (const [moduleId, oldColor] of Object.entries(OLD_DEFAULT_COLORS)) {
    const config = migrated[moduleId];
    if (config && config.orbColor === oldColor) {
      // Alte Farbe gefunden -> auf neue Default-Farbe aktualisieren
      migrated[moduleId] = {
        ...config,
        orbColor: DEFAULT_MODULE_COLORS[moduleId] || config.orbColor,
      };
      hasChanges = true;
    }
  }
  
  return hasChanges ? migrated : configs;
}

// --------------------------------------------
// Zustand Store mit Persistenz
// --------------------------------------------

export const useAgentConfigStore = create<AgentConfigState>()(
  persist(
    (set, get) => ({
      // Initiale Configs (leer - werden on-demand erstellt)
      // Migration wird beim Laden durchgeführt (siehe persist middleware)
      configs: {},
      
      // ----------------------------------------
      // Config für ein Modul abrufen
      // WICHTIG: Ändert NICHT den State während des Abrufs!
      // Gibt immer die gespeicherte Config zurück, oder eine Default-Config
      // Migriert automatisch alte Farben auf neue Defaults
      // ----------------------------------------
      getConfig: (moduleId: string): AgentConfig => {
        const { configs } = get();
        
        // Falls Config existiert, prüfe auf Migration
        if (configs[moduleId]) {
          const config = configs[moduleId];
          const oldColor = OLD_DEFAULT_COLORS[moduleId];
          const newColor = DEFAULT_MODULE_COLORS[moduleId];
          
          // Wenn alte Farbe verwendet wird, gib Config mit neuer Farbe zurück
          // (aber ändere State nicht hier - das macht ensureConfig)
          if (oldColor && newColor && config.orbColor === oldColor) {
            return ensureNormalizedAgentConfig({
              ...config,
              orbColor: newColor,
            });
          }
          
          return ensureNormalizedAgentConfig(config);
        }
        
        // Sonst Standard-Config zurückgeben OHNE State zu ändern
        // Der State wird erst beim expliziten updateConfig/ensureConfig geändert
        return createDefaultConfig(moduleId);
      },
      
      // ----------------------------------------
      // Config für ein Modul initialisieren (wenn nicht vorhanden)
      // Diese Funktion DARF State ändern - sollte in useEffect aufgerufen werden
      // Migriert auch alte Farben auf neue Defaults
      // ----------------------------------------
      ensureConfig: (moduleId: string): void => {
        const { configs } = get();
        
        if (!configs[moduleId]) {
          const defaultConfig = createDefaultConfig(moduleId);
          set((state) => ({
            configs: {
              ...state.configs,
                [moduleId]: ensureNormalizedAgentConfig(defaultConfig),
            },
          }));
        } else {
          // Migration: Prüfe ob alte Farbe verwendet wird und aktualisiere sie
          const config = configs[moduleId];
          const oldColor = OLD_DEFAULT_COLORS[moduleId];
          const newColor = DEFAULT_MODULE_COLORS[moduleId];
          
          if (oldColor && newColor && config.orbColor === oldColor) {
            // Alte Farbe gefunden -> auf neue Default-Farbe aktualisieren
            set((state) => ({
              configs: {
                ...state.configs,
                [moduleId]: {
                  ...config,
                  orbColor: newColor,
                  multimodal: normalizeAgentMultimodalConfig(config.multimodal),
                },
              },
            }));
          } else if (JSON.stringify(normalizeAgentMultimodalConfig(config.multimodal)) !== JSON.stringify(config.multimodal)) {
            set((state) => ({
              configs: {
                ...state.configs,
                [moduleId]: ensureNormalizedAgentConfig(config),
              },
            }));
          }
        }
      },
      
      // ----------------------------------------
      // Config für ein Modul aktualisieren
      // ----------------------------------------
      updateConfig: (moduleId: string, updates: Partial<AgentConfig>) => {
        set((state) => {
          const existingConfig = state.configs[moduleId] || createDefaultConfig(moduleId);
          
          return {
            configs: {
              ...state.configs,
              [moduleId]: ensureNormalizedAgentConfig({
                ...existingConfig,
                ...updates,
                moduleId, // Sicherstellen dass moduleId nicht überschrieben wird
              }),
            },
          };
        });
      },
      
      // ----------------------------------------
      // Config für ein Modul zurücksetzen
      // ----------------------------------------
      resetConfig: (moduleId: string) => {
        set((state) => ({
          configs: {
            ...state.configs,
            [moduleId]: createDefaultConfig(moduleId),
          },
        }));
      },
      
      // ----------------------------------------
      // Alle Configs zurücksetzen
      // ----------------------------------------
      resetAllConfigs: () => {
        set({ configs: {} });
      },
      
      // ----------------------------------------
      // System-Prompt für ein Modul abrufen
      // Nutzt Custom-Prompt wenn gesetzt, sonst Template + Persönlichkeit
      // ----------------------------------------
      getSystemPrompt: (moduleId: string): string => {
        const config = get().getConfig(moduleId);
        
        // Basis-Prompt: Custom oder Template
        let basePrompt: string;
        if (config.systemPrompt && config.systemPrompt.trim()) {
          basePrompt = config.systemPrompt;
        } else {
          const templateKey = moduleId as keyof typeof SYSTEM_PROMPT_TEMPLATES;
          basePrompt = SYSTEM_PROMPT_TEMPLATES[templateKey] || SYSTEM_PROMPT_TEMPLATES.default;
        }
        
        // Persönlichkeit basierend auf Icon-Template hinzufügen
        const iconTemplate = AGENT_ICON_TEMPLATES.find(t => t.icon === config.agentIcon);
        if (iconTemplate && iconTemplate.personality) {
          return `${basePrompt}\n\nPersönlichkeit: ${iconTemplate.personality}`;
        }
        
        return basePrompt;
      },
      
      // ----------------------------------------
      // Orb-Farbe für ein Modul abrufen
      // ----------------------------------------
      getOrbColor: (moduleId: string): string => {
        const config = get().getConfig(moduleId);
        return config.orbColor;
      },
      
      // ----------------------------------------
      // Agent-Name für ein Modul abrufen
      // ----------------------------------------
      getAgentName: (moduleId: string): string => {
        const config = get().getConfig(moduleId);
        return config.agentName || DEFAULT_AGENT_NAMES[moduleId] || `${moduleId} Agent`;
      },
      
      // ----------------------------------------
      // Agent-Icon für ein Modul abrufen
      // ----------------------------------------
      getAgentIcon: (moduleId: string): string => {
        const config = get().getConfig(moduleId);
        return config.agentIcon || DEFAULT_AGENT_ICONS[moduleId] || 'Bot';
      },
    }),
    {
      name: 'llm-council-agent-configs',
      // Nur die configs speichern, nicht die Funktionen
      partialize: (state) => ({
        configs: state.configs,
      }),
      // Migration beim Laden: Aktualisiere alte Farben und Provider
      onRehydrateStorage: () => (state) => {
        if (state && state.configs) {
          // Zuerst Farben migrieren
          let migrated = migrateConfigColors(state.configs);
          // Dann Provider migrieren
          migrated = migrateConfigProvider(migrated);
          // Danach multimodale Defaults ergänzen
          migrated = migrateConfigMultimodal(migrated);
          
          // Prüfe ob Migration Änderungen vorgenommen hat
          const hasColorChanges = Object.keys(migrated).some(
            key => migrated[key].orbColor !== state.configs[key]?.orbColor
          );
          const hasProviderChanges = Object.keys(migrated).some(
            key => migrated[key].llmProvider !== state.configs[key]?.llmProvider
          );
          const hasMultimodalChanges = Object.keys(migrated).some(
            key => JSON.stringify(migrated[key].multimodal) !== JSON.stringify(state.configs[key]?.multimodal)
          );
          
          if (hasColorChanges || hasProviderChanges || hasMultimodalChanges) {
            // State aktualisieren mit migrierten Configs
            setTimeout(() => {
              state.configs = migrated;
            }, 0);
          }
        }
      },
    }
  )
);

// --------------------------------------------
// Selektoren für optimierte Re-Renders
// --------------------------------------------

// --------------------------------------------
// Selector: Agent-Config abrufen (ohne State-Änderungen)
// Nutzt getConfig um Config abzurufen - ändert NICHT den State
// Für State-Initialisierung in Client-Komponenten: useAgentConfigClient Hook nutzen
// --------------------------------------------
export function selectAgentConfig(moduleId: string): (state: AgentConfigState) => AgentConfig {
  return (state) => state.getConfig(moduleId);
}

export const useAgentOrbColor = (moduleId: string) =>
  useAgentConfigStore((state) => state.getOrbColor(moduleId));

export const useAgentSystemPrompt = (moduleId: string) =>
  useAgentConfigStore((state) => state.getSystemPrompt(moduleId));

export const useAgentName = (moduleId: string) =>
  useAgentConfigStore((state) => state.getAgentName(moduleId));

export const useAgentIcon = (moduleId: string) =>
  useAgentConfigStore((state) => state.getAgentIcon(moduleId));

export const useUpdateAgentConfig = () =>
  useAgentConfigStore((state) => state.updateConfig);

export const useResetAgentConfig = () =>
  useAgentConfigStore((state) => state.resetConfig);

export const useEnsureAgentConfig = () =>
  useAgentConfigStore((state) => state.ensureConfig);

// Visual Mode und Human in the Loop Selektoren
export const useVisualModeEnabled = (moduleId: string) =>
  useAgentConfigStore((state) => state.getConfig(moduleId).visualModeEnabled ?? true);

export const useHumanInTheLoopTools = (moduleId: string) =>
  useAgentConfigStore((state) => state.getConfig(moduleId).humanInTheLoopTools ?? []);

// LLM Provider und Model Selektoren
export const useLLMProvider = (moduleId: string) =>
  useAgentConfigStore((state) => state.getConfig(moduleId).llmProvider ?? 'openai');

export const useLLMModel = (moduleId: string) =>
  useAgentConfigStore((state) => state.getConfig(moduleId).llmModel ?? DEFAULT_OPENROUTER_MODEL_ID);
