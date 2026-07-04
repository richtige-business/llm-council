// ============================================
// agent-meta.ts - Gemeinsame Agent-Metadaten
//
// Zweck: Stellt eingebaute Agenten, Icon-Mapping und
//        wiederverwendbare Auswahloptionen fuer Settings/Tasks bereit
// Verwendet von: AgentSettingsPage, ScheduledTasksPage
// ============================================

import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  BotMessageSquare,
  BrainCircuit,
  Calendar,
  Mail,
  Globe,
  FlaskConical,
  ListChecks,
  Sparkles,
  Search,
  BookOpen,
  MessageSquare,
  Dumbbell,
  Network,
  Users,
  UsersRound,
  Briefcase,
  Shield,
  Zap,
  Target,
  Layers,
  TrendingUp,
} from 'lucide-react';

// --------------------------------------------
// Gemeinsames Icon-Mapping
// Fallback-faehig fuer gespeicherte Lucide-Namen
// --------------------------------------------

export const AGENT_ICON_MAP: Record<string, LucideIcon> = {
  Bot,
  BotMessageSquare,
  BrainCircuit,
  Calendar,
  Mail,
  Globe,
  FlaskConical,
  ListChecks,
  Sparkles,
  Search,
  BookOpen,
  MessageSquare,
  Dumbbell,
  Network,
  Users,
  UsersRound,
  Briefcase,
  Shield,
  Zap,
  Target,
  Layers,
  TrendingUp,
};

// --------------------------------------------
// Wiederverwendbare Icon-Auswahl
// --------------------------------------------

export const AGENT_ICON_OPTIONS = [
  { key: 'Bot', label: 'Assistent' },
  { key: 'BrainCircuit', label: 'Experte' },
  { key: 'Sparkles', label: 'Kreativ' },
  { key: 'ListChecks', label: 'Organisator' },
  { key: 'TrendingUp', label: 'Analyst' },
  { key: 'Users', label: 'Team' },
  { key: 'UsersRound', label: 'Runde' },
  { key: 'Network', label: 'Netzwerk' },
  { key: 'MessageSquare', label: 'Dialog' },
  { key: 'Briefcase', label: 'Projekt' },
  { key: 'Shield', label: 'Schutz' },
  { key: 'Zap', label: 'Aktion' },
  { key: 'Target', label: 'Fokus' },
  { key: 'Layers', label: 'Ebenen' },
  { key: 'FlaskConical', label: 'Lab' },
] as const;

// --------------------------------------------
// Eingebaute Agenten fuer Listen, Analytics und Hierarchie
// --------------------------------------------

export interface BuiltInAgentDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  parentId?: string;
}

export const BUILT_IN_AGENT_DEFINITIONS: BuiltInAgentDefinition[] = [
  {
    id: 'master',
    name: 'Intelligence',
    icon: 'BrainCircuit',
    color: '#0ea5e9',
    description: 'Ueber-Agent fuer Koordination, Routing und Gesamtueberblick.',
  },
  {
    id: 'calendar',
    name: 'Kalender',
    icon: 'Calendar',
    color: '#f87171',
    description: 'Hilft bei Terminen, Events und Zeitplanung.',
    parentId: 'master',
  },
  {
    id: 'inbox',
    name: 'Inbox',
    icon: 'Mail',
    color: '#fbbf24',
    description: 'Unterstuetzt beim Lesen, Schreiben und Strukturieren von Nachrichten.',
    parentId: 'master',
  },
  {
    id: 'lab',
    name: 'Lab',
    icon: 'FlaskConical',
    color: '#14B8A6',
    description: 'Deckt Modulbuilder, Lab-Workflows und Trainingsaufgaben ab.',
    parentId: 'master',
  },
];

