// ============================================
// constants.ts - AI Training Center Konstanten
// 
// Zweck: Zentrale Konstanten und Modul-Informationen
// Verwendet von: Components, Store, API
// ============================================

import type { ModuleCategory } from '@/types';
import type { 
  ModelType, 
  DatasetType, 
  TrainingMethod, 
  GPUProvider,
  TrainingConfig,
  TrainingCategory,
  TrainingSubmode,
  TrainingWorkspaceTab,
} from './types';

// --------------------------------------------
// Modul-Informationen
// Für die Registry und Sidebar
// --------------------------------------------

export const TRAINING_MODULE_INFO = {
  id: 'training',
  name: 'AI Training Center',
  description: 'Fine-tune LLMs und teste sie in der Sandbox',
  version: '1.0.0',
  icon: 'Brain',
  category: 'lab' as ModuleCategory,
  color: '#f59e0b', // Amber
};

// --------------------------------------------
// Training-Hub Navigation
// Konfiguration fuer Startscreen, Submodi und Workspaces
// --------------------------------------------

export const TRAINING_CATEGORY_INFO: Record<TrainingCategory, {
  name: string;
  description: string;
  icon: string;
  color: string;
  useCases: string[];
  ctaLabel: string;
}> = {
  llm: {
    name: 'LLM Training',
    description: 'Trainiere Sprachmodelle auf Stil, Formate, Präferenzen und spezialisierte Aufgaben.',
    icon: 'Brain',
    color: '#8b5cf6',
    useCases: ['Antwortstil verbessern', 'JSON-Ausgaben beibringen', 'Student-Modelle destillieren'],
    ctaLabel: 'LLM Training starten',
  },
  agent: {
    name: 'Agent Training',
    description: 'Bringe Agenten bei, wie sie Entscheidungen treffen, Tools nutzen und Workflows ausführen.',
    icon: 'Bot',
    color: '#10b981',
    useCases: ['Learning Mode nutzen', 'Tool-Entscheidungen trainieren', 'Agent-Verhalten strukturieren'],
    ctaLabel: 'Agent Training starten',
  },
  dataset: {
    name: 'Dataset Studio',
    description: 'Erstelle, bereinige, erweitere und versioniere Trainingsdaten für Modelle und Agenten.',
    icon: 'Database',
    color: '#06b6d4',
    useCases: ['CSV und JSONL hochladen', 'Synthetische Daten erzeugen', 'Sessions in Datensätze umwandeln'],
    ctaLabel: 'Dataset Studio öffnen',
  },
};

export const TRAINING_SUBMODE_INFO: Record<TrainingSubmode, {
  category: TrainingCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  'example-tuning': {
    category: 'llm',
    name: 'Beispieltraining',
    description: 'Bringe dem Modell gewünschte Outputs über gute Beispiele bei.',
    icon: 'GraduationCap',
    color: '#8b5cf6',
  },
  'preference-training': {
    category: 'llm',
    name: 'Preference Training',
    description: 'Verbessere Antworten über Bewertungen, Korrekturen und Präferenzen.',
    icon: 'ThumbsUp',
    color: '#ec4899',
  },
  distillation: {
    category: 'llm',
    name: 'Distillation',
    description: 'Übertrage das Verhalten starker Teacher-Setups auf günstigere Student-Modelle.',
    icon: 'GitBranch',
    color: '#f59e0b',
  },
  'learning-mode': {
    category: 'agent',
    name: 'Learning Mode',
    description: 'Lasse Agenten von vorgemachten Workflows und Imitationen lernen.',
    icon: 'Workflow',
    color: '#10b981',
  },
  'policy-training': {
    category: 'agent',
    name: 'Tool- & Entscheidungslernen',
    description: 'Trainiere, wann Tools genutzt werden und welche Entscheidungen ein Agent treffen soll.',
    icon: 'Route',
    color: '#14b8a6',
  },
  'agent-distillation': {
    category: 'agent',
    name: 'Agent Distillation',
    description: 'Verdichte komplexe Agent-Läufe in kompaktere, kostengünstigere Agent-Policies.',
    icon: 'Layers3',
    color: '#22c55e',
  },
  upload: {
    category: 'dataset',
    name: 'Upload',
    description: 'Importiere Trainingsdaten aus Dateien und strukturierten Quellen.',
    icon: 'Upload',
    color: '#06b6d4',
  },
  synthetic: {
    category: 'dataset',
    name: 'Synthetic Generation',
    description: 'Erweitere bestehende Datensätze mit synthetisch generierten Beispielen.',
    icon: 'Sparkles',
    color: '#6366f1',
  },
  extract: {
    category: 'dataset',
    name: 'Session Extraction',
    description: 'Leite Trainingsdaten aus Sandbox-Sessions, Feedback und Agent-Läufen ab.',
    icon: 'ScanSearch',
    color: '#0ea5e9',
  },
  quality: {
    category: 'dataset',
    name: 'Clean & Score',
    description: 'Bereinige Datensätze, erkenne PII und bewerte die Datenqualität.',
    icon: 'ShieldCheck',
    color: '#f97316',
  },
};

export const TRAINING_SUBMODES_BY_CATEGORY: Record<TrainingCategory, TrainingSubmode[]> = {
  llm: ['example-tuning', 'preference-training', 'distillation'],
  agent: ['learning-mode', 'policy-training', 'agent-distillation'],
  dataset: ['upload', 'synthetic', 'extract', 'quality'],
};

export const TRAINING_WORKSPACE_TABS: Record<TrainingCategory, Array<{
  id: TrainingWorkspaceTab;
  name: string;
  icon: string;
}>> = {
  llm: [
    { id: 'overview', name: 'Overview', icon: 'LayoutDashboard' },
    { id: 'models', name: 'Models', icon: 'Brain' },
    { id: 'runs', name: 'Runs', icon: 'Dumbbell' },
    { id: 'eval', name: 'Eval', icon: 'BadgeCheck' },
    { id: 'sandbox', name: 'Sandbox', icon: 'FlaskConical' },
  ],
  agent: [
    { id: 'overview', name: 'Overview', icon: 'LayoutDashboard' },
    { id: 'learning', name: 'Learning Mode', icon: 'Workflow' },
    { id: 'policies', name: 'Policies', icon: 'Route' },
    { id: 'runs', name: 'Runs', icon: 'PlayCircle' },
    { id: 'replay', name: 'Replay', icon: 'History' },
    { id: 'eval', name: 'Eval', icon: 'BadgeCheck' },
  ],
  dataset: [
    { id: 'sources', name: 'Sources', icon: 'Database' },
    { id: 'transforms', name: 'Transforms', icon: 'Wand2' },
    { id: 'quality', name: 'Quality', icon: 'ShieldCheck' },
    { id: 'versions', name: 'Versions', icon: 'GitCompareArrows' },
    { id: 'exports', name: 'Exports', icon: 'Share2' },
  ],
};

export const TRAINING_DEFAULT_WORKSPACE_TAB: Record<TrainingCategory, TrainingWorkspaceTab> = {
  llm: 'overview',
  agent: 'overview',
  dataset: 'sources',
};

export const TRAINING_SUBMODE_DEFAULT_TAB: Record<TrainingSubmode, TrainingWorkspaceTab> = {
  'example-tuning': 'models',
  'preference-training': 'sandbox',
  distillation: 'runs',
  'learning-mode': 'learning',
  'policy-training': 'policies',
  'agent-distillation': 'runs',
  upload: 'sources',
  synthetic: 'transforms',
  extract: 'transforms',
  quality: 'quality',
};

// --------------------------------------------
// Basis-Modelle
// Verfügbare Modelle für Fine-Tuning
// --------------------------------------------

export const BASE_MODELS = {
  text: [
    {
      id: 'llama-3-8b',
      name: 'Llama 3 8B',
      provider: 'Meta',
      parameters: '8B',
      description: 'Effizientes Modell für allgemeine Aufgaben',
      recommended: true,
    },
    {
      id: 'llama-3-70b',
      name: 'Llama 3 70B',
      provider: 'Meta',
      parameters: '70B',
      description: 'Leistungsstärkstes Open-Source Modell',
      recommended: false,
    },
    {
      id: 'mistral-7b',
      name: 'Mistral 7B',
      provider: 'Mistral AI',
      parameters: '7B',
      description: 'Schnell und effizient',
      recommended: true,
    },
    {
      id: 'gemma-7b',
      name: 'Gemma 7B',
      provider: 'Google',
      parameters: '7B',
      description: 'Googles Open-Source Modell',
      recommended: false,
    },
  ],
  image: [
    {
      id: 'sdxl',
      name: 'Stable Diffusion XL',
      provider: 'Stability AI',
      parameters: '3.5B',
      description: 'Hochauflösende Bildgenerierung',
      recommended: true,
    },
    {
      id: 'flux-dev',
      name: 'FLUX.1 Dev',
      provider: 'Black Forest Labs',
      parameters: '12B',
      description: 'Neueste Bildgenerierung',
      recommended: false,
    },
  ],
  video: [
    {
      id: 'svd',
      name: 'Stable Video Diffusion',
      provider: 'Stability AI',
      parameters: '1.5B',
      description: 'Image-to-Video Generation',
      recommended: true,
    },
  ],
} as const;

// --------------------------------------------
// Default Trainings-Konfigurationen
// --------------------------------------------

export const DEFAULT_TRAINING_CONFIG: TrainingConfig = {
  learningRate: 0.0001,
  epochs: 3,
  batchSize: 4,
  loraRank: 16,
  loraAlpha: 32,
  warmupSteps: 100,
  maxSteps: null,
  gradientAccumulation: 1,
};

export const TRAINING_CONFIG_PRESETS = {
  quick: {
    name: 'Schnell',
    description: 'Für Tests und schnelle Iterationen',
    config: {
      ...DEFAULT_TRAINING_CONFIG,
      epochs: 1,
      loraRank: 8,
    },
  },
  balanced: {
    name: 'Ausgewogen',
    description: 'Gute Balance zwischen Zeit und Qualität',
    config: DEFAULT_TRAINING_CONFIG,
  },
  quality: {
    name: 'Qualität',
    description: 'Beste Ergebnisse, längere Trainingszeit',
    config: {
      ...DEFAULT_TRAINING_CONFIG,
      epochs: 5,
      loraRank: 32,
      loraAlpha: 64,
    },
  },
} as const;

// --------------------------------------------
// Dataset-Typen Beschreibungen
// --------------------------------------------

export const DATASET_TYPE_INFO: Record<DatasetType, {
  name: string;
  description: string;
  fields: string[];
  example: string;
}> = {
  sft: {
    name: 'Supervised Fine-Tuning',
    description: 'Klassische Input/Output Paare für Wissensvermittlung',
    fields: ['input', 'output'],
    example: 'Frage: Was ist LifeOS?\nAntwort: LifeOS ist ein modulares ERP-System...',
  },
  dpo: {
    name: 'Direct Preference Optimization',
    description: 'Bevorzugte vs. abgelehnte Antworten für Verhaltenslernen',
    fields: ['input', 'chosenOutput', 'rejectedOutput'],
    example: 'Prompt: Schreibe eine E-Mail\nGut: Formelle E-Mail\nSchlecht: Zu casual',
  },
  classification: {
    name: 'Klassifizierung',
    description: 'Text-Kategorisierung und Labeling',
    fields: ['input', 'label'],
    example: 'Text: Ihre Bestellung wurde verschickt\nLabel: shipping_notification',
  },
};

// --------------------------------------------
// GPU Provider Informationen
// --------------------------------------------

export const GPU_PROVIDER_INFO: Record<GPUProvider, {
  name: string;
  description: string;
  pricing: string;
  features: string[];
  available: boolean;
}> = {
  mock: {
    name: 'Mock (Simulation)',
    description: 'Simuliertes Training für Entwicklung und Tests',
    pricing: 'Kostenlos',
    features: ['Keine GPU erforderlich', 'Sofortige Ergebnisse', 'Fake Metriken'],
    available: true,
  },
  modal: {
    name: 'Modal',
    description: 'Serverless GPUs mit Pay-per-Second Abrechnung',
    pricing: 'Ab $0.001/Sekunde',
    features: ['A100 GPUs', 'Auto-Scaling', 'Python-native'],
    available: false, // Noch nicht implementiert
  },
  replicate: {
    name: 'Replicate',
    description: 'Einfache API für ML-Modelle',
    pricing: 'Ab $0.0023/Sekunde',
    features: ['Viele vortrainierte Modelle', 'Einfache Integration', 'REST API'],
    available: false,
  },
  runpod: {
    name: 'RunPod',
    description: 'Günstige GPUs mit mehr Kontrolle',
    pricing: 'Ab $0.20/Stunde',
    features: ['Günstige Preise', 'Spot Instances', 'Persistent Storage'],
    available: false,
  },
};

// --------------------------------------------
// Trainings-Methoden Beschreibungen
// --------------------------------------------

export const TRAINING_METHOD_INFO: Record<TrainingMethod, {
  name: string;
  description: string;
  useCase: string;
  requiredDatasetType: DatasetType;
}> = {
  sft: {
    name: 'Supervised Fine-Tuning',
    description: 'Dem Modell neues Wissen und Formate beibringen',
    useCase: 'Neue Fakten, JSON-Outputs, spezifischer Schreibstil',
    requiredDatasetType: 'sft',
  },
  dpo: {
    name: 'Direct Preference Optimization',
    description: 'Das Verhalten des Modells durch Präferenzen steuern',
    useCase: 'Ton anpassen, Halluzinationen reduzieren, Richtlinien einhalten',
    requiredDatasetType: 'dpo',
  },
};

// --------------------------------------------
// Modell-Typ Informationen
// --------------------------------------------

export const MODEL_TYPE_INFO: Record<ModelType, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  text: {
    name: 'Text (LLM)',
    description: 'Sprachmodelle für Chat, Generierung, Analyse',
    icon: 'MessageSquare',
    color: '#8b5cf6',
  },
  image: {
    name: 'Bild',
    description: 'Bildgenerierung und -bearbeitung',
    icon: 'Image',
    color: '#06b6d4',
  },
  video: {
    name: 'Video (Beta)',
    description: 'Videogenerierung - hohe GPU-Kosten!',
    icon: 'Video',
    color: '#f43f5e',
  },
};

// --------------------------------------------
// Sandbox Presets
// Vordefinierte Mock-Daten für Tests
// --------------------------------------------

export const SANDBOX_MOCK_PRESETS = {
  customerService: {
    name: 'Kundenservice',
    description: 'Simulierte Kundenanfragen und -daten',
    mockData: {
      contacts: [
        { id: '1', name: 'Max Mustermann', email: 'max@example.com', company: 'Musterfirma GmbH' },
        { id: '2', name: 'Erika Musterfrau', email: 'erika@example.com', company: 'Example AG' },
      ],
      emails: [
        {
          id: '1',
          from: 'max@example.com',
          subject: 'Problem mit Bestellung #12345',
          body: 'Hallo, meine Bestellung ist seit 5 Tagen nicht angekommen...',
          date: '2024-01-15',
        },
      ],
    },
  },
  salesAssistant: {
    name: 'Vertriebsassistent',
    description: 'CRM-Daten und Lead-Informationen',
    mockData: {
      contacts: [
        { id: '1', name: 'Dr. Schmidt', email: 'schmidt@bigcorp.de', company: 'BigCorp International' },
      ],
      calendar: [
        {
          id: '1',
          title: 'Demo-Call BigCorp',
          start: '2024-01-20T14:00:00',
          end: '2024-01-20T15:00:00',
          location: 'Zoom',
        },
      ],
    },
  },
  contentCreator: {
    name: 'Content Creator',
    description: 'Für Texterstellung und Marketing',
    mockData: {
      customData: {
        brandGuidelines: 'Ton: Professionell aber freundlich. Zielgruppe: B2B.',
        keywords: ['Innovation', 'Effizienz', 'Digitalisierung'],
      },
    },
  },
};

// --------------------------------------------
// UI Konstanten
// --------------------------------------------

export const TRAINING_TABS = [
  { id: 'models', name: 'Modelle', icon: 'Brain' },
  { id: 'datasets', name: 'Datasets', icon: 'Database' },
  { id: 'training', name: 'Training', icon: 'Dumbbell' },
  { id: 'sandbox', name: 'Sandbox', icon: 'FlaskConical' },
] as const;

// Status-Farben
export const STATUS_COLORS = {
  // Modell-Status
  draft: { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af', label: 'Entwurf' },
  training: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24', label: 'Training' },
  ready: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80', label: 'Bereit' },
  failed: { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', label: 'Fehlgeschlagen' },
  archived: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6b7280', label: 'Archiviert' },
  
  // Job-Status
  queued: { bg: 'rgba(107, 114, 128, 0.2)', text: '#9ca3af', label: 'Warteschlange' },
  running: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', label: 'Läuft' },
  completed: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80', label: 'Abgeschlossen' },
  cancelled: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6b7280', label: 'Abgebrochen' },
  
  // Dataset-Status
  processing: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', label: 'Verarbeitung' },
  error: { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', label: 'Fehler' },
  
  // Sandbox-Status
  active: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80', label: 'Aktiv' },
  paused: { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24', label: 'Pausiert' },
  expired: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6b7280', label: 'Abgelaufen' },
} as const;

// Feedback-Rating Farben
export const RATING_COLORS = {
  good: { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80', icon: 'ThumbsUp' },
  bad: { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', icon: 'ThumbsDown' },
  edited: { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', icon: 'Pencil' },
} as const;

// --------------------------------------------
// Kosten-Schätzungen (Mock)
// In echten Cents pro 1000 Tokens/Steps
// --------------------------------------------

export const COST_ESTIMATES = {
  training: {
    mock: 0,
    modal: 50, // $0.50 pro 1000 Steps
    replicate: 75,
    runpod: 30,
  },
  inference: {
    mock: 0,
    modal: 1, // $0.01 pro 1000 Tokens
    replicate: 2,
    runpod: 0.5,
  },
};








