// ============================================
// FloatingAgentPanel.tsx - Kontextfenster fuer ausgewaehlten Agent
//
// Zweck: Zeigt zum fokussierten Agenten Stats und Navigationslinks
//        unten im Hub; Glass wie linke Hub-Sidebar (container.base, keine Alpha-Aufhellung).
//        damit der Orb im 3D-Raum voll sichtbar bleibt.
// Verwendet von: AgentsModuleShell (ausserhalb des 3D-Canvas)
// ============================================

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import {
  useAgentModeNavigation,
  type AgentModeHref,
  type AgentNavigationScope,
} from '../useAgentModeNavigation';
import type {
  AgentsSpatialMode,
  SpatialAgentNode,
  SpatialConversationNode,
  SpatialTaskNode,
} from '../../spatial-types';

interface FloatingAgentPanelProps {
  node: SpatialAgentNode;
  mode: AgentsSpatialMode;
  modelName?: string;
  relatedTasks: SpatialTaskNode[];
  relatedConversations: SpatialConversationNode[];
  navigationScope?: AgentNavigationScope;
  embeddedMode?: AgentsSpatialMode;
  onEmbeddedModeChange?: (mode: AgentsSpatialMode) => void;
}

export function FloatingAgentPanel({
  node,
  mode,
  modelName,
  relatedTasks,
  relatedConversations,
  navigationScope = 'global',
  embeddedMode,
  onEmbeddedModeChange,
}: FloatingAgentPanelProps) {
  const { container } = useThemeStyles();
  const panelStyle = container.base;
  const isGroupNode = node.entityType === 'group';
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
    <AnimatePresence mode="wait">
      <motion.div
        key={node.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="pointer-events-auto w-full max-w-[34rem] overflow-hidden p-4 sm:max-w-[42rem]"
        style={panelStyle}
      >
        {/* Modus-Navigation ganz oben */}
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

        {/* Header: Mini-Orb links neben dem Namen */}
        <div className="mt-3 flex items-start gap-2.5">
          <span
            className="mt-1 inline-flex h-4 w-4 shrink-0 rounded-full"
            style={{ backgroundColor: node.color, boxShadow: `0 0 8px ${node.color}55` }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-white">{node.label}</h3>
            <p className="line-clamp-2 text-xs leading-snug text-white/45">
              {node.description || (isGroupNode ? 'Ausgewaehlte Gruppe im Gruppenraum.' : 'Ausgewaehlter Agent im Hub.')}
            </p>
          </div>
        </div>

        {/* Stats mit mehr Innenabstand = hoeheres Panel */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/35">{isGroupNode ? 'Mitgl.' : 'Sub'}</p>
            <p className="text-sm font-semibold text-white">{node.childIds.length}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/35">Chat</p>
            <p className="text-sm font-semibold text-white">{node.conversationCount}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
            <p className="text-[10px] uppercase tracking-wide text-white/35">Task</p>
            <p className="text-sm font-semibold text-white">{node.taskCount}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
            <div className="flex items-center gap-0.5 text-[10px] uppercase tracking-wide text-white/35">
              <BrainCircuit className="h-3 w-3" />
            </div>
            <p className="truncate text-xs font-medium leading-snug text-white">{modelName || 'Std.'}</p>
          </div>
        </div>

        {/* Verknuepfungen: etwas hoehere Kacheln */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">Tasks</p>
            <div className="mt-1">
              {relatedTasks.length > 0 ? (
                <p className="truncate text-xs text-white/65">{relatedTasks[0].label}</p>
              ) : (
                <p className="text-xs text-white/30">—</p>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/40">Konv.</p>
            <div className="mt-1">
              {relatedConversations.length > 0 ? (
                <p className="truncate text-xs text-white/65">{relatedConversations[0].label}</p>
              ) : (
                <p className="text-xs text-white/30">—</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
