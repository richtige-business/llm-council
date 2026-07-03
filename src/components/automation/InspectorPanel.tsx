'use client';

import type {
  ConditionOperator,
  WorkflowActionNode,
  WorkflowNode,
  WorkflowTriggerNode,
  WorkflowTriggerConfig,
} from '@/lib/automation/types';
import type { Module } from '@/types';

export interface AutomationToolItem {
  id: string;
  moduleId: string;
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface InspectorPanelProps {
  workflowName: string;
  isActive: boolean;
  selectedNode: WorkflowNode | null;
  modules: Module[];
  tools: AutomationToolItem[];
  onWorkflowNameChange: (value: string) => void;
  onWorkflowActiveChange: (value: boolean) => void;
  onNodeLabelChange: (nodeId: string, label: string) => void;
  onTriggerConfigChange: (nodeId: string, config: WorkflowTriggerConfig) => void;
  onConditionChange: (
    nodeId: string,
    next: { fieldPath: string; operator: ConditionOperator; value: unknown }
  ) => void;
  onActionChange: (
    nodeId: string,
    next: { moduleId: string; toolId: string; input: Record<string, unknown> }
  ) => void;
}

const CONDITION_OPERATORS: ConditionOperator[] = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains'];

export function InspectorPanel({
  workflowName,
  isActive,
  selectedNode,
  modules,
  tools,
  onWorkflowNameChange,
  onWorkflowActiveChange,
  onNodeLabelChange,
  onTriggerConfigChange,
  onConditionChange,
  onActionChange,
}: InspectorPanelProps) {
  const renderNodeEditor = () => {
    if (!selectedNode) {
      return <div className="text-xs text-slate-300/70">Node auswählen, um Details zu bearbeiten.</div>;
    }

    if (selectedNode.type === 'trigger') {
      const trigger = selectedNode as WorkflowTriggerNode;
      return (
        <div className="space-y-3">
          <label className="block text-xs text-slate-300">
            Name
            <input
              value={selectedNode.label}
              onChange={(event) => onNodeLabelChange(selectedNode.id, event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Trigger
            <select
              value={trigger.config.kind}
              onChange={(event) =>
                onTriggerConfigChange(selectedNode.id, {
                  ...trigger.config,
                  kind: event.target.value === 'event' ? 'event' : 'manual',
                })
              }
              className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
            >
              <option value="manual">Manual</option>
              <option value="event">Event</option>
            </select>
          </label>
          {trigger.config.kind === 'event' && (
            <>
              <label className="block text-xs text-slate-300">
                Source Modul
                <select
                  value={trigger.config.sourceModuleId || ''}
                  onChange={(event) =>
                    onTriggerConfigChange(selectedNode.id, {
                      ...trigger.config,
                      sourceModuleId: event.target.value,
                    })
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
                >
                  <option value="">Modul wählen</option>
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-slate-300">
                Event Name
                <input
                  value={trigger.config.eventName || ''}
                  onChange={(event) =>
                    onTriggerConfigChange(selectedNode.id, {
                      ...trigger.config,
                      eventName: event.target.value,
                    })
                  }
                  placeholder="z.B. calendar.event.created"
                  className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
                />
              </label>
            </>
          )}
        </div>
      );
    }

    if (selectedNode.type === 'condition') {
      return (
        <div className="space-y-3">
          <label className="block text-xs text-slate-300">
            Name
            <input
              value={selectedNode.label}
              onChange={(event) => onNodeLabelChange(selectedNode.id, event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Field Path
            <input
              value={selectedNode.config.fieldPath}
              onChange={(event) =>
                onConditionChange(selectedNode.id, {
                  ...selectedNode.config,
                  fieldPath: event.target.value,
                })
              }
              placeholder="payload.value"
              className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
            />
          </label>
          <label className="block text-xs text-slate-300">
            Operator
            <select
              value={selectedNode.config.operator}
              onChange={(event) =>
                onConditionChange(selectedNode.id, {
                  ...selectedNode.config,
                  operator: event.target.value as ConditionOperator,
                })
              }
              className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
            >
              {CONDITION_OPERATORS.map((operator) => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-300">
            Vergleichswert (JSON)
            <input
              value={JSON.stringify(selectedNode.config.value ?? '')}
              onChange={(event) => {
                const raw = event.target.value;
                let nextValue: unknown = raw;
                try {
                  nextValue = JSON.parse(raw);
                } catch {
                  nextValue = raw;
                }
                onConditionChange(selectedNode.id, {
                  ...selectedNode.config,
                  value: nextValue,
                });
              }}
              className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
            />
          </label>
        </div>
      );
    }

    const actionNode = selectedNode as WorkflowActionNode;
    const moduleTools = tools.filter((tool) => tool.moduleId === actionNode.config.moduleId);
    return (
      <div className="space-y-3">
        <label className="block text-xs text-slate-300">
          Name
          <input
            value={selectedNode.label}
            onChange={(event) => onNodeLabelChange(selectedNode.id, event.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
          />
        </label>
        <label className="block text-xs text-slate-300">
          Modul
          <select
            value={actionNode.config.moduleId}
            onChange={(event) =>
              onActionChange(selectedNode.id, {
                ...actionNode.config,
                moduleId: event.target.value,
                toolId: '',
              })
            }
            className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
          >
            <option value="">Modul wählen</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-300">
          Tool
          <select
            value={actionNode.config.toolId}
            onChange={(event) =>
              onActionChange(selectedNode.id, {
                ...actionNode.config,
                toolId: event.target.value,
              })
            }
            className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
          >
            <option value="">Tool wählen</option>
            {moduleTools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-slate-300">
          Input (JSON)
          <textarea
            value={JSON.stringify(actionNode.config.input || {}, null, 2)}
            onChange={(event) => {
              let input: Record<string, unknown> = {};
              try {
                input = JSON.parse(event.target.value) as Record<string, unknown>;
              } catch {
                return;
              }
              onActionChange(selectedNode.id, {
                ...actionNode.config,
                input,
              });
            }}
            className="mt-1 min-h-[110px] w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 py-2 text-xs text-slate-100"
          />
        </label>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-slate-900/65 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-200">Workflow</div>
        <label className="block text-xs text-slate-300">
          Name
          <input
            value={workflowName}
            onChange={(event) => onWorkflowNameChange(event.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-white/15 bg-slate-900/70 px-2 text-sm text-slate-100"
          />
        </label>
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => onWorkflowActiveChange(event.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
          Aktiv
        </label>
      </div>
      <div className="rounded-xl border border-white/10 bg-slate-900/65 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-200">Inspector</div>
        {renderNodeEditor()}
      </div>
    </div>
  );
}
