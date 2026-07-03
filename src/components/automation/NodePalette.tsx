'use client';

import { Plus } from 'lucide-react';
import type { WorkflowNodeType } from '@/lib/automation/types';

interface NodePaletteProps {
  onAddNode: (type: WorkflowNodeType) => void;
}

const NODE_TYPES: Array<{ type: WorkflowNodeType; label: string; description: string }> = [
  { type: 'trigger', label: 'Trigger', description: 'Startet den Workflow manuell oder per Event.' },
  { type: 'condition', label: 'Condition', description: 'Prüft Daten und verzweigt true/false.' },
  { type: 'action', label: 'Action', description: 'Führt ein Modul-Tool aus.' },
];

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/65 p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-200">
        Nodes
      </div>
      <div className="space-y-2">
        {NODE_TYPES.map((entry) => (
          <button
            key={entry.type}
            type="button"
            onClick={() => onAddNode(entry.type)}
            className="w-full rounded-lg border border-white/10 bg-slate-800/65 p-2 text-left transition hover:border-cyan-300/60 hover:bg-slate-800"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
              <Plus className="h-3.5 w-3.5" />
              {entry.label}
            </div>
            <div className="mt-1 text-xs text-slate-300/70">{entry.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
