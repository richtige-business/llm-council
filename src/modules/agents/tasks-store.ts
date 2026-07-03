// ============================================
// tasks-store.ts - Persistenter Store für Scheduled Tasks
//
// Zweck: Verwaltet geplante Agent-Aufgaben und deren Läufe
//        getrennt vom eigentlichen Chat-/Conversation-State
// Verwendet von: ScheduledTasksPage, AgentSettingsPage
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ScheduledAgentTask,
  ScheduledAgentTaskRun,
  ScheduledTaskFrequency,
  ScheduledTaskRecurringConfig,
} from './types';

// --------------------------------------------
// Hilfsfunktionen für Datums-/Zeitberechnung
// Berechnet den nächsten sinnvollen Laufzeitpunkt für die UI
// --------------------------------------------

function combineDateAndTime(date: Date, time: string): Date {
  const [rawHours = '09', rawMinutes = '00'] = time.split(':');
  const next = new Date(date);
  next.setHours(Number(rawHours), Number(rawMinutes), 0, 0);
  return next;
}

function addByFrequency(base: Date, frequency: ScheduledTaskFrequency, interval: number): Date {
  const next = new Date(base);
  if (frequency === 'daily') {
    next.setDate(next.getDate() + interval);
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + interval * 7);
  } else {
    next.setMonth(next.getMonth() + interval);
  }
  return next;
}

function calculateRecurringNextRun(recurring: ScheduledTaskRecurringConfig, now = new Date()): number {
  const interval = Math.max(1, recurring.interval || 1);
  const startBase = recurring.startDate ? new Date(recurring.startDate) : new Date(now);
  let candidate = combineDateAndTime(startBase, recurring.time);

  // Wochentage werden im MVP vereinfacht als nächster passender Tag behandelt.
  if (recurring.frequency === 'weekly' && recurring.weekdays && recurring.weekdays.length > 0) {
    const sortedWeekdays = [...recurring.weekdays].sort((a, b) => a - b);
    const currentDay = candidate.getDay();
    const nextWeekday = sortedWeekdays.find((day) => day >= currentDay) ?? sortedWeekdays[0];
    const diffDays = nextWeekday >= currentDay ? nextWeekday - currentDay : 7 - currentDay + nextWeekday;
    candidate.setDate(candidate.getDate() + diffDays);
  }

  if (recurring.frequency === 'monthly' && recurring.dayOfMonth) {
    candidate.setDate(Math.min(Math.max(1, recurring.dayOfMonth), 28));
  }

  while (candidate.getTime() <= now.getTime()) {
    candidate = addByFrequency(candidate, recurring.frequency, interval);
  }

  const endDate = recurring.endDate ? new Date(recurring.endDate).getTime() : null;
  if (endDate && candidate.getTime() > endDate) {
    return endDate;
  }

  return candidate.getTime();
}

function calculateNextRun(task: ScheduledAgentTask): number | null {
  if (!task.enabled || task.status === 'paused' || task.status === 'completed') {
    return null;
  }

  if (task.type === 'one-time') {
    if (!task.runAt) return null;
    const timestamp = new Date(task.runAt).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (!task.recurring) return null;
  return calculateRecurringNextRun(task.recurring);
}

function createDefaultTask(targetId = 'master'): ScheduledAgentTask {
  const now = Date.now();
  const defaultRunAt = new Date(now + 60 * 60 * 1000);
  return {
    id: crypto.randomUUID(),
    title: 'Neue Scheduled Task',
    description: '',
    targetType: 'agent',
    targetId,
    prompt: '',
    type: 'one-time',
    status: 'active',
    enabled: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin',
    runAt: defaultRunAt.toISOString(),
    outputMode: 'task-log',
    targetConversationId: null,
    retryCount: 0,
    timeoutSeconds: 120,
    lastRunAt: null,
    nextRunAt: defaultRunAt.getTime(),
    createdAt: now,
    updatedAt: now,
  };
}

// --------------------------------------------
// Store-Typen
// --------------------------------------------

interface ScheduledTasksState {
  tasks: ScheduledAgentTask[];
  runs: ScheduledAgentTaskRun[];
}

interface ScheduledTasksActions {
  createTask: (targetId?: string) => string;
  updateTask: (taskId: string, updates: Partial<ScheduledAgentTask>) => void;
  deleteTask: (taskId: string) => void;
  duplicateTask: (taskId: string) => string;
  toggleTaskEnabled: (taskId: string) => void;
  runTaskNow: (taskId: string) => string;
}

type ScheduledTasksStore = ScheduledTasksState & ScheduledTasksActions;

// --------------------------------------------
// Zustand Store
// Persistiert geplante Aufgaben lokal im Browser
// --------------------------------------------

export const useScheduledTasksStore = create<ScheduledTasksStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      runs: [],

      createTask: (targetId = 'master') => {
        const task = createDefaultTask(targetId);
        set((state) => ({
          tasks: [task, ...state.tasks],
        }));
        return task.id;
      },

      updateTask: (taskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const nextTask: ScheduledAgentTask = {
              ...task,
              ...updates,
              updatedAt: Date.now(),
            };
            return {
              ...nextTask,
              nextRunAt: calculateNextRun(nextTask),
            };
          }),
        }));
      },

      deleteTask: (taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
          runs: state.runs.filter((run) => run.taskId !== taskId),
        }));
      },

      duplicateTask: (taskId) => {
        const original = get().tasks.find((task) => task.id === taskId);
        if (!original) return '';
        const now = Date.now();
        const duplicate: ScheduledAgentTask = {
          ...original,
          id: crypto.randomUUID(),
          title: `${original.title} Kopie`,
          status: original.type === 'one-time' ? 'paused' : original.status,
          lastRunAt: null,
          createdAt: now,
          updatedAt: now,
        };
        duplicate.nextRunAt = calculateNextRun(duplicate);
        set((state) => ({
          tasks: [duplicate, ...state.tasks],
        }));
        return duplicate.id;
      },

      toggleTaskEnabled: (taskId) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task;
            const nextTask: ScheduledAgentTask = {
              ...task,
              enabled: !task.enabled,
              status: task.enabled ? 'paused' : 'active',
              updatedAt: Date.now(),
            };
            return {
              ...nextTask,
              nextRunAt: calculateNextRun(nextTask),
            };
          }),
        }));
      },

      runTaskNow: (taskId) => {
        const task = get().tasks.find((entry) => entry.id === taskId);
        if (!task) return '';

        const startedAt = Date.now();
        const runId = crypto.randomUUID();
        const simulatedTokenEstimate = Math.max(32, Math.ceil((task.prompt.length || 1) / 4));

        const run: ScheduledAgentTaskRun = {
          id: runId,
          taskId,
          status: 'success',
          startedAt,
          finishedAt: startedAt,
          resultSummary: 'Manueller Probelauf vorbereitet. Serverseitige Ausfuehrung folgt in Phase 2.',
          estimatedTokens: simulatedTokenEstimate,
        };

        set((state) => ({
          runs: [run, ...state.runs],
          tasks: state.tasks.map((entry) => {
            if (entry.id !== taskId) return entry;
            const nextTask: ScheduledAgentTask = {
              ...entry,
              lastRunAt: startedAt,
              status: entry.enabled ? 'active' : 'paused',
              updatedAt: startedAt,
            };
            return {
              ...nextTask,
              nextRunAt: calculateNextRun(nextTask),
            };
          }),
        }));

        return runId;
      },
    }),
    {
      name: 'llm-council-agents-scheduled-tasks',
    }
  )
);
