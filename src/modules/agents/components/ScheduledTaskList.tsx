// ============================================
// ScheduledTaskList.tsx - Linke Task-Liste fuer Scheduled Tasks
//
// Zweck: Zeigt eine Task-Sektion mit Status, Auswahl und
//        Quick Actions in kompakter Form
// Verwendet von: ScheduledTasksPage.tsx
// ============================================

'use client';

import { Play, Copy, Trash2, Pause, CheckCircle2, Clock3, AlertTriangle } from 'lucide-react';
import type { ScheduledAgentTask } from '../types';

interface ScheduledTaskListProps {
  title: string;
  description: string;
  emptyLabel: string;
  tasks: ScheduledAgentTask[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onRunTask: (taskId: string) => void;
  onDuplicateTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskEnabled: (taskId: string) => void;
}

function formatTaskDate(timestamp?: number | null): string {
  if (!timestamp) return 'Kein Termin';
  return new Date(timestamp).toLocaleString('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function getTaskStatusMeta(task: ScheduledAgentTask) {
  if (!task.enabled || task.status === 'paused') {
    return { label: 'Pausiert', Icon: Pause, colorClass: 'text-amber-300' };
  }
  if (task.status === 'error') {
    return { label: 'Fehler', Icon: AlertTriangle, colorClass: 'text-rose-300' };
  }
  if (task.type === 'one-time' && task.lastRunAt && task.status === 'completed') {
    return { label: 'Erledigt', Icon: CheckCircle2, colorClass: 'text-emerald-300' };
  }
  return { label: 'Aktiv', Icon: Clock3, colorClass: 'text-sky-300' };
}

export function ScheduledTaskList({
  title,
  description,
  emptyLabel,
  tasks,
  selectedTaskId,
  onSelectTask,
  onRunTask,
  onDuplicateTask,
  onDeleteTask,
  onToggleTaskEnabled,
}: ScheduledTaskListProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 p-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs text-white/45">{description}</p>
      </div>

      <div className="p-3">
        <div className="space-y-3">
          {tasks.length > 0 ? (
            tasks.map((task) => {
              const isActive = selectedTaskId === task.id;
              const statusMeta = getTaskStatusMeta(task);
              return (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTask(task.id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                    isActive
                      ? 'border-white/20 bg-white/10'
                      : 'border-white/5 bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{task.title}</p>
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                          {task.type}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-white/45">
                        {task.description || task.prompt || 'Keine Beschreibung hinterlegt.'}
                      </p>
                    </div>
                    <statusMeta.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${statusMeta.colorClass}`} />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/45">
                    <span>Naechster Lauf: {formatTaskDate(task.nextRunAt)}</span>
                    <span>{statusMeta.label}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRunTask(task.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/75 hover:bg-white/15"
                    >
                      <Play className="h-3 w-3" />
                      Run now
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleTaskEnabled(task.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/75 hover:bg-white/15"
                    >
                      <Pause className="h-3 w-3" />
                      {task.enabled ? 'Pause' : 'Aktivieren'}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDuplicateTask(task.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/75 hover:bg-white/15"
                    >
                      <Copy className="h-3 w-3" />
                      Duplizieren
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteTask(task.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/75 hover:bg-rose-500/20 hover:text-rose-200"
                    >
                      <Trash2 className="h-3 w-3" />
                      Loeschen
                    </button>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
              <p className="text-sm text-white/55">{emptyLabel}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

