// ============================================
// constants.ts - Konstanten für Agents-Modul
// 
// Zweck: Definiert Standardwerte, Konfigurationen
//        und Kontext-Fenster-Grenzen für das Agents-Modul
// Verwendet von: store.ts, AgentsPage.tsx, ContextTracker
// ============================================

import type { Module } from '@/types';
import type { ContextWindowConfig, OrchestrationMode, ParticipantAuthority } from './types';

// --------------------------------------------
// Standard-Ordner-Farben
// Vordefinierte Farben für Ordner
// --------------------------------------------

export const FOLDER_COLORS = [
  '#3b82f6', // Blau
  '#8b5cf6', // Lila
  '#ec4899', // Pink
  '#f59e0b', // Orange
  '#10b981', // Grün
  '#ef4444', // Rot
  '#6366f1', // Indigo
  '#14b8a6', // Türkis
];

// --------------------------------------------
// Rollen-Vorschläge für Gruppenchats (datalist / Autocomplete)
// Verwendet von: GroupSettingsModal, optional weitere Formulare
// --------------------------------------------

export const GROUP_CHAT_ROLE_PRESETS = [
  'CEO / Owner',
  'CTO',
  'CMO',
  'CFO',
  'Admin',
  'Moderator',
  'Koordinator',
  'Fachexperte',
  'Beobachter',
  'Protokoll',
  'Entwickler',
  'Reviewer',
  'Sparringspartner',
  'Researcher',
  'Analyst',
] as const;

// --------------------------------------------
// Maximale Anzahl von Konversationen
// Verhindert dass zu viele Chats gespeichert werden
// --------------------------------------------

export const MAX_CONVERSATIONS = 100;

// --------------------------------------------
// Maximale Anzahl von Nachrichten pro Konversation
// --------------------------------------------

export const MAX_MESSAGES_PER_CONVERSATION = 1000;

// --------------------------------------------
// Standard-Titel für neue Konversationen
// Wird verwendet bis die erste Nachricht gesendet wurde
// --------------------------------------------

export const DEFAULT_CONVERSATION_TITLE = 'Neuer Chat';

// --------------------------------------------
// Kontext-Fenster Konfiguration pro Modell
// Definiert Token-Limits und Zusammenfassungs-Schwellen
// Approximation: ~4 Zeichen pro Token
// --------------------------------------------

export const CONTEXT_WINDOWS: Record<string, ContextWindowConfig> = {
  // Claude Modelle
  'claude-sonnet-4-20250514': {
    modelId: 'claude-sonnet-4-20250514',
    maxTokens: 200000,
    recommendedMax: 180000,
    summarizeThreshold: 0.8,
  },
  'claude-3-5-sonnet-20241022': {
    modelId: 'claude-3-5-sonnet-20241022',
    maxTokens: 200000,
    recommendedMax: 180000,
    summarizeThreshold: 0.8,
  },
  'claude-3-opus-20240229': {
    modelId: 'claude-3-opus-20240229',
    maxTokens: 200000,
    recommendedMax: 180000,
    summarizeThreshold: 0.8,
  },
  'claude-3-haiku-20240307': {
    modelId: 'claude-3-haiku-20240307',
    maxTokens: 200000,
    recommendedMax: 180000,
    summarizeThreshold: 0.8,
  },
  // OpenAI Modelle
  'gpt-4o': {
    modelId: 'gpt-4o',
    maxTokens: 128000,
    recommendedMax: 115000,
    summarizeThreshold: 0.8,
  },
  'gpt-4-turbo': {
    modelId: 'gpt-4-turbo',
    maxTokens: 128000,
    recommendedMax: 115000,
    summarizeThreshold: 0.8,
  },
  'gpt-4o-mini': {
    modelId: 'gpt-4o-mini',
    maxTokens: 128000,
    recommendedMax: 115000,
    summarizeThreshold: 0.8,
  },
  'o1-preview': {
    modelId: 'o1-preview',
    maxTokens: 128000,
    recommendedMax: 115000,
    summarizeThreshold: 0.8,
  },
  'o1-mini': {
    modelId: 'o1-mini',
    maxTokens: 128000,
    recommendedMax: 115000,
    summarizeThreshold: 0.8,
  },
};

// Standard-Kontext-Fenster (Fallback)
export const DEFAULT_CONTEXT_WINDOW: ContextWindowConfig = {
  modelId: 'default',
  maxTokens: 128000,
  recommendedMax: 115000,
  summarizeThreshold: 0.8,
};

// --------------------------------------------
// Token-Approximation
// Wird verwendet wenn kein tiktoken verfügbar
// --------------------------------------------

export const CHARS_PER_TOKEN = 4;

// --------------------------------------------
// Unterstützte Datei-Typen für Import
// --------------------------------------------

export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

export const SUPPORTED_FILE_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/pdf',
];

// Maximale Dateigröße (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Maximale Bildgröße (5MB)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// --------------------------------------------
// Agents Modul Info
// Metadaten für die Modul-Registry
// --------------------------------------------

export const AGENTS_MODULE_INFO: Omit<Module, 'tools' | 'widgets' | 'isActive' | 'order'> & { color: string } = {
  id: 'agents',
  name: 'Agents',
  description: 'KI-Agenten mit Chat, Web Research, Memory und Multi-Modell-Support',
  version: '2.0.0',
  icon: 'BotMessageSquare',
  category: 'system',
  author: 'LifeOS',
  color: '#8B5CF6',  // Lila - für Agents (vorher Pink für Chat)
};

// --------------------------------------------
// Authority-Presets
// Mapping von Rollennamen auf Autoritaetsstufen
// Rollen die hier nicht gelistet sind → Default 'member'
// --------------------------------------------

export const AUTHORITY_PRESETS: Record<string, ParticipantAuthority> = {
  'CEO / Owner': 'owner',
  'CTO': 'admin',
  'CMO': 'admin',
  'CFO': 'admin',
  'Admin': 'admin',
  'Moderator': 'admin',
};

// --------------------------------------------
// Orchestrierungs-Modi
// Verfuegbare strukturierte Gespraechsmodi
// mit Label und Beschreibung fuer die UI
// --------------------------------------------

export const ORCHESTRATION_MODES: Record<OrchestrationMode, {
  label: string;
  description: string;
}> = {
  'free-discussion':  { label: 'Freie Diskussion',    description: 'Offener Austausch ohne feste Struktur' },
  'brainstorming':    { label: 'Brainstorming',        description: 'Ideen sammeln, clustern und bewerten' },
  'debate':           { label: 'Debatte',              description: 'Strukturierte Pro/Contra-Argumentation' },
  'task-delegation':  { label: 'Aufgabenverteilung',   description: 'Tasks zuweisen und Ergebnisse einsammeln' },
  'review':           { label: 'Review',               description: 'Ergebnisse/Dokumente gemeinsam bewerten' },
  'synthesis':        { label: 'Synthese',             description: 'Ergebnisse zusammenfuehren und Entscheidung treffen' },
  'planning':         { label: 'Planung',              description: 'Ziele definieren und Meilensteine setzen' },
};
