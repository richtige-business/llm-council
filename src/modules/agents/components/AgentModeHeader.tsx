// ============================================
// AgentModeHeader.tsx - Gemeinsamer Header fuer Orb-spezifische Ansichten
//
// Zweck: Zeigt die Navigation zwischen Chat, Tasks und Settings
//        sowie den aktuell fokussierten Agenten mit Orb-Farbe
// Verwendet von: ScheduledTasksPage, AgentSettingsPage (Agents-Hub)
// ============================================

'use client';

import { useThemeStyles } from '@/lib/theme';
import type { AgentsSpatialMode } from '../spatial-types';
import {
  useAgentModeNavigation,
  type AgentModeHref,
  type AgentNavigationScope,
} from './useAgentModeNavigation';

interface AgentModeHeaderProps {
  mode: AgentsSpatialMode;
  agentName: string;
  agentColor: string;
  description: string;
  navigationScope?: AgentNavigationScope;
  embeddedMode?: AgentsSpatialMode;
  onEmbeddedModeChange?: (mode: AgentsSpatialMode) => void;
}

export function AgentModeHeader({
  mode,
  agentName,
  agentColor,
  description,
  navigationScope = 'global',
  embeddedMode,
  onEmbeddedModeChange,
}: AgentModeHeaderProps) {
  const { surface } = useThemeStyles();
  const { openMode, isControlActive, showTasksControl } = useAgentModeNavigation({
    navigationScope,
    embeddedMode,
    onEmbeddedModeChange,
  });
  const modeControls: Array<{ href: AgentModeHref; label: string }> = showTasksControl
    ? [
        { href: '/agents/chat', label: 'Chat' },
        { href: '/agents/tasks', label: 'Tasks' },
        { href: '/agents/settings', label: 'Settings' },
      ]
    : [
        { href: '/agents/chat', label: 'Chat' },
        { href: '/agents/settings', label: 'Settings' },
      ];

  return (
    <div className="p-4" style={surface.base}>
      <div className="flex flex-wrap gap-1.5">
        {modeControls.map((control) => (
          <button
            key={control.href}
            type="button"
            onClick={() => openMode(control.href)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isControlActive(control.href)
                ? 'bg-white/15 text-white'
                : 'bg-white/5 text-white/55 hover:bg-white/10 hover:text-white'
            }`}
          >
            {control.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2.5">
        <span
          className="mt-1 inline-flex h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: agentColor, boxShadow: `0 0 8px ${agentColor}55` }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-white">{agentName}</h1>
          <p className="mt-1 text-sm text-white/45">{description}</p>
        </div>
      </div>
    </div>
  );
}
