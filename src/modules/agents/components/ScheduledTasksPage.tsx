// ============================================
// ScheduledTasksPage.tsx - Agentenspezifische Task-Verwaltung
//
// Zweck: Zeigt pro ausgewaehltem Orb nur dessen Tasks,
//        trennt klar zwischen wiederkehrend und einmalig
//        und nutzt den gemeinsamen Modus-Header oben
// Verwendet von: /agents/tasks
// ============================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useThemeStyles } from '@/lib/theme';
import {
  DEFAULT_MODULE_COLORS,
  DEFAULT_AGENT_NAMES,
  useAgentConfigStore,
} from '@/lib/agent/stores/agent-config-store';
import { useAgentsStore, useSelectedAgentId } from '../store';
import { useAgentsSpatialStore } from '../spatial-store';
import type { AgentsSpatialMode } from '../spatial-types';
import { useScheduledTasksStore } from '../tasks-store';
import { BUILT_IN_AGENT_DEFINITIONS } from '../agent-meta';
import { AgentModeHeader } from './AgentModeHeader';
import type { AgentNavigationScope } from './useAgentModeNavigation';
import { ScheduledTaskList } from './ScheduledTaskList';
import { ScheduledTaskEditor } from './ScheduledTaskEditor';
import { ScheduledTaskRunHistory } from './ScheduledTaskRunHistory';
import type { ScheduledTaskTargetType } from '../types';

type TaskFilter = 'all' | 'active' | 'paused' | 'error';

const TASK_FILTERS: Record<TaskFilter, string> = {
  all: 'Alle',
  active: 'Aktiv',
  paused: 'Pausiert',
  error: 'Fehler',
};

interface ScheduledTasksPageProps {
  navigationScope?: AgentNavigationScope;
  embeddedMode?: AgentsSpatialMode;
  onEmbeddedModeChange?: (mode: AgentsSpatialMode) => void;
}

export function ScheduledTasksPage({
  navigationScope = 'global',
  embeddedMode,
  onEmbeddedModeChange,
}: ScheduledTasksPageProps) {
  const tasks = useScheduledTasksStore((state) => state.tasks);
  const runs = useScheduledTasksStore((state) => state.runs);
  const createTask = useScheduledTasksStore((state) => state.createTask);
  const updateTask = useScheduledTasksStore((state) => state.updateTask);
  const deleteTask = useScheduledTasksStore((state) => state.deleteTask);
  const duplicateTask = useScheduledTasksStore((state) => state.duplicateTask);
  const runTaskNow = useScheduledTasksStore((state) => state.runTaskNow);
  const toggleTaskEnabled = useScheduledTasksStore((state) => state.toggleTaskEnabled);

  const selectedAgentId = useSelectedAgentId();
  const customAgents = useAgentsStore((state) => state.customAgents);
  const conversations = useAgentsStore((state) => state.conversations);
  const setSelectedAgent = useAgentsStore((state) => state.setSelectedAgent);
  const configs = useAgentConfigStore((state) => state.configs);
  const { surface } = useThemeStyles();
  const spatialSelectedTaskId = useAgentsSpatialStore((state) => state.selectedTaskId);
  const setSpatialSelectedTaskId = useAgentsSpatialStore((state) => state.setSelectedTaskId);
  const focusAgent = useAgentsSpatialStore((state) => state.focusAgent);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const spatialResolvedTaskId = spatialSelectedTaskId?.replace(/^task-/, '') || null;

  // --------------------------------------------
  // Aktuellen Orb fuer Header und Task-Zuordnung aufloesen
  // --------------------------------------------
  const activeAgentId = selectedAgentId || BUILT_IN_AGENT_DEFINITIONS[0]?.id || 'master';
  const customEntry = customAgents.find((agent) => agent.id === activeAgentId) || null;
  const builtInEntry = BUILT_IN_AGENT_DEFINITIONS.find((agent) => agent.id === activeAgentId) || null;
  const activeAgentName =
    customEntry?.name ||
    configs[activeAgentId]?.agentName ||
    DEFAULT_AGENT_NAMES[activeAgentId] ||
    builtInEntry?.name ||
    activeAgentId;
  const activeAgentColor =
    customEntry?.color ||
    configs[activeAgentId]?.orbColor ||
    DEFAULT_MODULE_COLORS[activeAgentId] ||
    builtInEntry?.color ||
    '#8B5CF6';
  const activeAgentTargetType: ScheduledTaskTargetType =
    customEntry?.type === 'group' ? 'group' : 'agent';

  // --------------------------------------------
  // Nur Tasks des aktuell ausgewaehlten Orbs anzeigen
  // --------------------------------------------
  const agentTasks = useMemo(
    () => tasks.filter((task) => task.targetId === activeAgentId),
    [activeAgentId, tasks]
  );

  const filteredAgentTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return agentTasks.filter((task) => {
      const matchesSearch =
        normalizedSearch === '' ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.description?.toLowerCase().includes(normalizedSearch) ||
        task.prompt.toLowerCase().includes(normalizedSearch);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && task.enabled && task.status === 'active') ||
        (filter === 'paused' && (!task.enabled || task.status === 'paused')) ||
        (filter === 'error' && task.status === 'error');

      return matchesSearch && matchesFilter;
    });
  }, [agentTasks, filter, search]);

  const recurringTasks = useMemo(
    () => filteredAgentTasks.filter((task) => task.type === 'recurring'),
    [filteredAgentTasks]
  );
  const oneTimeTasks = useMemo(
    () => filteredAgentTasks.filter((task) => task.type === 'one-time'),
    [filteredAgentTasks]
  );

  const resolvedSelectedTaskId =
    (selectedTaskId && agentTasks.some((task) => task.id === selectedTaskId) ? selectedTaskId : null) ||
    (spatialResolvedTaskId && agentTasks.some((task) => task.id === spatialResolvedTaskId) ? spatialResolvedTaskId : null) ||
    recurringTasks[0]?.id ||
    oneTimeTasks[0]?.id ||
    agentTasks[0]?.id ||
    null;

  const selectedTask =
    agentTasks.find((task) => task.id === resolvedSelectedTaskId) ||
    recurringTasks[0] ||
    oneTimeTasks[0] ||
    agentTasks[0] ||
    null;

  // --------------------------------------------
  // Editor und Output nur fuer den aktuellen Orb einschränken
  // --------------------------------------------
  const targetOptions = useMemo(
    () => [
      {
        id: activeAgentId,
        name: activeAgentName,
        kind: activeAgentTargetType,
      },
    ],
    [activeAgentId, activeAgentName, activeAgentTargetType]
  );

  const conversationOptions = useMemo(
    () =>
      conversations
        .filter(
          (conversation) =>
            conversation.agentId === activeAgentId ||
            (conversation.participantRoles || []).some((participant) => participant.agentId === activeAgentId)
        )
        .map((conversation) => ({
          id: conversation.id,
          title: conversation.title || 'Unbenannte Konversation',
        })),
    [activeAgentId, conversations]
  );

  const selectedTaskRuns = useMemo(
    () => runs.filter((run) => run.taskId === selectedTask?.id).slice(0, 8),
    [runs, selectedTask?.id]
  );

  const handleCreateTask = () => {
    const nextId = createTask(activeAgentId);
    if (activeAgentTargetType === 'group') {
      updateTask(nextId, { targetType: 'group' });
    }
    setSelectedTaskId(nextId);
    setSpatialSelectedTaskId(`task-${nextId}`);
  };

  const handleDuplicateTask = (taskId: string) => {
    const duplicateId = duplicateTask(taskId);
    if (duplicateId) {
      updateTask(duplicateId, {
        targetId: activeAgentId,
        targetType: activeAgentTargetType,
      });
      setSelectedTaskId(duplicateId);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
    if (spatialSelectedTaskId === `task-${taskId}`) {
      setSpatialSelectedTaskId(null);
    }
  };

  useEffect(() => {
    if (!selectedTask) return;
    setSpatialSelectedTaskId(`task-${selectedTask.id}`);
    setSelectedAgent(activeAgentId);
    focusAgent(activeAgentId);
  }, [activeAgentId, focusAgent, selectedTask, setSelectedAgent, setSpatialSelectedTaskId]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <AgentModeHeader
        mode="tasks"
        agentName={activeAgentName}
        agentColor={activeAgentColor}
        description="Verwalte die geplanten Aufgaben des aktuell ausgewaehlten Orbs mit klarer Trennung zwischen wiederkehrend und einmalig."
        navigationScope={navigationScope}
        embeddedMode={embeddedMode}
        onEmbeddedModeChange={onEmbeddedModeChange}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Tasks von ${activeAgentName} suchen...`}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(TASK_FILTERS) as TaskFilter[]).map((filterId) => (
            <button
              key={filterId}
              type="button"
              onClick={() => setFilter(filterId)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                filter === filterId ? 'bg-white/15 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {TASK_FILTERS[filterId]}
            </button>
          ))}

          <button
            type="button"
            onClick={handleCreateTask}
            data-agent-button="agents-task-create"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Neue Task
          </button>
        </div>
      </div>

      <div
        className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)]"
        style={surface.base}
      >
        <div className="min-h-0 overflow-y-auto border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
          <div className="space-y-4">
            <ScheduledTaskList
              title="Wiederkehrende Tasks"
              description="Alle wiederkehrenden Jobs dieses Agents."
              emptyLabel="Keine wiederkehrenden Tasks fuer diesen Agenten."
              tasks={recurringTasks}
              selectedTaskId={resolvedSelectedTaskId}
              onSelectTask={setSelectedTaskId}
              onRunTask={runTaskNow}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onToggleTaskEnabled={toggleTaskEnabled}
            />

            <ScheduledTaskList
              title="Einmalige Tasks"
              description="Geplante Einmal-Ausfuehrungen fuer diesen Agenten."
              emptyLabel="Keine einmaligen Tasks fuer diesen Agenten."
              tasks={oneTimeTasks}
              selectedTaskId={resolvedSelectedTaskId}
              onSelectTask={setSelectedTaskId}
              onRunTask={runTaskNow}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onToggleTaskEnabled={toggleTaskEnabled}
            />
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <ScheduledTaskEditor
              task={selectedTask}
              targetOptions={targetOptions}
              conversationOptions={conversationOptions}
              lockTargetSelection
              lockedTargetLabel={activeAgentName}
              onSave={updateTask}
            />
            <ScheduledTaskRunHistory runs={selectedTaskRuns} />
          </div>
        </div>
      </div>
    </div>
  );
}

