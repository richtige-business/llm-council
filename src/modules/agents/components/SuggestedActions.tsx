'use client';

import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import * as LucideIcons from 'lucide-react';

export interface SuggestedActionData {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

interface SuggestedActionsProps {
  suggestions: SuggestedActionData[];
  onSelect: (prompt: string) => void;
  variant?: 'default' | 'compact';
  title?: string;
}

const BUILT_IN_AGENT_SUGGESTIONS: Record<string, SuggestedActionData[]> = {
  master: [
    { id: 'master-day-overview', label: 'Wie ist mein Tag?', prompt: 'Wie ist mein Tag heute?', icon: 'BrainCircuit' },
    { id: 'master-inbox-summary', label: 'Inbox zusammenfassen', prompt: 'Fasse meine Inbox kurz zusammen.', icon: 'Mail' },
    { id: 'master-focus', label: 'Nächster Fokus', prompt: 'Was sollte mein nächster Fokus heute sein?', icon: 'Target' },
    { id: 'master-upcoming', label: 'Was steht an?', prompt: 'Was steht heute und als Nächstes an?', icon: 'Calendar' },
  ],
  calendar: [
    { id: 'calendar-today', label: 'Termine heute', prompt: 'Zeige meine Termine heute.', icon: 'Calendar' },
    { id: 'calendar-tomorrow', label: 'Morgen planen', prompt: 'Welche Termine habe ich morgen?', icon: 'Clock3' },
    { id: 'calendar-create', label: 'Termin erstellen', prompt: 'Erstelle einen Termin für morgen.', icon: 'PenSquare' },
    { id: 'calendar-free-time', label: 'Freie Zeit finden', prompt: 'Wann habe ich heute freie Zeitfenster?', icon: 'Search' },
  ],
  inbox: [
    { id: 'inbox-new-mail', label: 'Neue E-Mails?', prompt: 'Gibt es neue E-Mails?', icon: 'Mail' },
    { id: 'inbox-unread', label: 'Ungelesene zusammenfassen', prompt: 'Fasse meine ungelesenen E-Mails zusammen.', icon: 'Search' },
    { id: 'inbox-compose', label: 'E-Mail schreiben', prompt: 'Hilf mir, eine E-Mail zu schreiben.', icon: 'PenSquare' },
    { id: 'inbox-replies', label: 'Offene Antworten', prompt: 'Welche offenen Antworten habe ich gerade?', icon: 'Target' },
  ],
  lab: [
    { id: 'lab-status', label: 'Lab-Stand', prompt: 'Wie ist der aktuelle Stand im Lab?', icon: 'FlaskConical' },
    { id: 'lab-next-step', label: 'Nächster Schritt', prompt: 'Was ist der nächste sinnvolle Schritt im Lab?', icon: 'Target' },
    { id: 'lab-builder-summary', label: 'Builder zusammenfassen', prompt: 'Fasse den aktuellen Builder-Stand zusammen.', icon: 'BrainCircuit' },
    { id: 'lab-open-todos', label: 'Offene TODOs', prompt: 'Welche offenen TODOs siehst du im Lab?', icon: 'ListChecks' },
  ],
  agents: [
    { id: 'agents-new-agent', label: 'Neuen Agent erstellen', prompt: 'Hilf mir, einen neuen Agenten zu erstellen.', icon: 'BotMessageSquare' },
    { id: 'agents-groups', label: 'Meine Gruppen', prompt: 'Zeige mir meine Gruppen und wie sie gerade aufgestellt sind.', icon: 'Users' },
    { id: 'agents-conversations', label: 'Offene Agent-Chats', prompt: 'Welche offenen Agent-Konversationen sind gerade wichtig?', icon: 'Mail' },
    { id: 'agents-setup-help', label: 'Agent-Setup-Hilfe', prompt: 'Hilf mir beim Setup meiner Agenten.', icon: 'Sparkles' },
  ],
};

function createFallbackSuggestions(label: string): SuggestedActionData[] {
  return [
    {
      id: `fallback-help-${label}`,
      label: 'Wobei kannst du helfen?',
      prompt: `Wobei kannst du mir im Kontext von ${label} helfen?`,
      icon: 'BrainCircuit',
    },
    {
      id: `fallback-summary-${label}`,
      label: 'Stand zusammenfassen',
      prompt: `Fasse den aktuellen Stand zu ${label} zusammen.`,
      icon: 'FileText',
    },
    {
      id: `fallback-next-${label}`,
      label: 'Nächste Schritte',
      prompt: `Was sind die nächsten sinnvollen Schritte bei ${label}?`,
      icon: 'Target',
    },
    {
      id: `fallback-open-${label}`,
      label: 'Offene Punkte',
      prompt: `Welche offenen Punkte siehst du gerade bei ${label}?`,
      icon: 'Search',
    },
  ];
}

export function getSuggestedActionsForAgent(agentId: string, agentName?: string, max = 4): SuggestedActionData[] {
  const fallbackLabel = agentName?.trim() || 'diesem Bereich';
  return (BUILT_IN_AGENT_SUGGESTIONS[agentId] || createFallbackSuggestions(fallbackLabel)).slice(0, max);
}

export function getSuggestedActionsForOrbModule(moduleId: string, moduleName?: string, max = 3): SuggestedActionData[] {
  const fallbackLabel = moduleName?.trim() || 'diesem Bereich';
  return (BUILT_IN_AGENT_SUGGESTIONS[moduleId] || createFallbackSuggestions(fallbackLabel)).slice(0, max);
}

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, ComponentType<{ className?: string }>>)[name];
  return Icon ? <Icon className={className} /> : null;
}

export function SuggestedActions({
  suggestions,
  onSelect,
  variant = 'default',
  title = 'Schnell starten',
}: SuggestedActionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  const isCompact = variant === 'compact';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={isCompact ? 'w-full max-w-sm' : 'w-full'}
    >
      <p className={`mb-3 font-medium text-white/45 ${isCompact ? 'text-[11px]' : 'text-xs uppercase tracking-[0.2em]'}`}>
        {title}
      </p>
      <div className={`grid gap-2 ${isCompact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={suggestion.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: index * 0.04 }}
            onClick={() => onSelect(suggestion.prompt)}
            className={`group rounded-2xl border border-white/10 bg-white/[0.04] text-left transition-colors hover:bg-white/[0.08] ${
              isCompact ? 'px-3 py-2.5' : 'px-4 py-3.5'
            }`}
          >
            <div className="flex items-start gap-3">
              {suggestion.icon ? (
                <div className={`rounded-xl bg-white/10 text-white/70 ${isCompact ? 'p-2' : 'p-2.5'}`}>
                  <DynamicIcon name={suggestion.icon} className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className={`font-medium text-white transition-colors group-hover:text-white ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  {suggestion.label}
                </p>
                {!isCompact ? (
                  <p className="mt-1 line-clamp-2 text-xs text-white/45">
                    {suggestion.prompt}
                  </p>
                ) : null}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
