'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Plus, Trash2 } from 'lucide-react';
import type {
  ConditionOperator,
  WorkflowActionNode,
  WorkflowConditionNode,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeType,
  WorkflowRule,
  WorkflowTriggerConfig,
} from '@/lib/automation/types';
import { createDefaultWorkflowRule, normalizeWorkflowRule } from '@/lib/automation/types';
import { useBaseStore } from '@/lib/bases/store';
import { runWorkflowManually } from '@/lib/automation/runtime';
import type { Module } from '@/types';
import { NodePalette } from '@/components/automation/NodePalette';
import { InspectorPanel, type AutomationToolItem } from '@/components/automation/InspectorPanel';
import { TriggerNode } from '@/components/automation/nodes/TriggerNode';
import { ConditionNode } from '@/components/automation/nodes/ConditionNode';
import { ActionNode } from '@/components/automation/nodes/ActionNode';
import './workflow-editor.css';

interface WorkflowEditorProps {
  baseId: string;
  modules: Module[];
}

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

function createId(prefix: string): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto);
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toReactFlowNode(node: WorkflowNode): Node<WorkflowNode> {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: node,
  };
}

function toReactFlowEdge(edge: WorkflowEdge): Edge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    label: edge.label,
  };
}

function nodeFromReactFlowNode(node: Node<WorkflowNode>): WorkflowNode {
  const data = node.data;
  return {
    ...data,
    label: data.label,
    position: node.position,
  };
}

function edgeFromReactFlowEdge(edge: Edge): WorkflowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle || undefined,
    label: typeof edge.label === 'string' ? edge.label : undefined,
  };
}

export function WorkflowEditor({ baseId, modules }: WorkflowEditorProps) {
  const bases = useBaseStore((state) => state.bases);
  const upsertWorkflow = useBaseStore((state) => state.upsertWorkflow);
  const deleteWorkflow = useBaseStore((state) => state.deleteWorkflow);
  const setWorkflowActive = useBaseStore((state) => state.setWorkflowActive);
  const workflows = useMemo(() => {
    const base = bases.find((entry) => entry.id === baseId);
    if (!base) return [];
    return base.connections
      .filter((connection) => connection.connectionType === 'workflow.v1')
      .map((connection) => {
        const rule = normalizeWorkflowRule(connection.rule);
        return rule ? { ...connection, rule } : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [baseId, bases]);

  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [flowNodes, setFlowNodes] = useState<Array<Node<WorkflowNode>>>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [tools, setTools] = useState<AutomationToolItem[]>([]);

  useEffect(() => {
    if (!selectedWorkflowId && workflows.length > 0) {
      setSelectedWorkflowId(workflows[0].rule.workflowId);
      return;
    }
    if (selectedWorkflowId && !workflows.some((entry) => entry.rule.workflowId === selectedWorkflowId)) {
      setSelectedWorkflowId(workflows[0]?.rule.workflowId || '');
    }
  }, [selectedWorkflowId, workflows]);

  const selectedWorkflow = useMemo(
    () => workflows.find((entry) => entry.rule.workflowId === selectedWorkflowId) || null,
    [selectedWorkflowId, workflows]
  );

  useEffect(() => {
    if (!selectedWorkflow) {
      setFlowNodes([]);
      setFlowEdges([]);
      setSelectedNodeId(null);
      return;
    }
    setFlowNodes(selectedWorkflow.rule.nodes.map(toReactFlowNode));
    setFlowEdges(selectedWorkflow.rule.edges.map(toReactFlowEdge));
    setSelectedNodeId(null);
  }, [selectedWorkflow]);

  useEffect(() => {
    let active = true;
    const loadTools = async () => {
      const response = await fetch(`/api/automation/tools?baseId=${baseId}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!active) return;
      if (response.ok && payload.success) {
        setTools(Array.isArray(payload.tools) ? (payload.tools as AutomationToolItem[]) : []);
      } else {
        setTools([]);
      }
    };
    void loadTools();
    return () => {
      active = false;
    };
  }, [baseId]);

  const persistWorkflow = useCallback(
    (
      nextNodes: Array<Node<WorkflowNode>>,
      nextEdges: Edge[],
      transform?: (current: WorkflowRule) => WorkflowRule
    ) => {
      if (!selectedWorkflow) return;
      const nextRule: WorkflowRule = {
        ...selectedWorkflow.rule,
        nodes: nextNodes.map(nodeFromReactFlowNode),
        edges: nextEdges.map(edgeFromReactFlowEdge),
      };
      const transformed = transform ? transform(nextRule) : nextRule;
      upsertWorkflow(baseId, transformed);
    },
    [baseId, selectedWorkflow, upsertWorkflow]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const nextNodes = applyNodeChanges(changes, flowNodes);
      setFlowNodes(nextNodes);
      persistWorkflow(nextNodes, flowEdges);
    },
    [flowEdges, flowNodes, persistWorkflow]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const nextEdges = applyEdgeChanges(changes, flowEdges);
      setFlowEdges(nextEdges);
      persistWorkflow(flowNodes, nextEdges);
    },
    [flowEdges, flowNodes, persistWorkflow]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const nextEdges = addEdge(
        {
          ...connection,
          id: createId('edge'),
        },
        flowEdges
      );
      setFlowEdges(nextEdges);
      persistWorkflow(flowNodes, nextEdges);
    },
    [flowEdges, flowNodes, persistWorkflow]
  );

  const addNode = useCallback(
    (type: WorkflowNodeType) => {
      if (!selectedWorkflow) return;
      if (type === 'trigger' && flowNodes.some((node) => node.type === 'trigger')) {
        return;
      }

      const id = createId(type);
      const position = { x: 160 + flowNodes.length * 40, y: 140 + flowNodes.length * 20 };
      let data: WorkflowNode;
      if (type === 'trigger') {
        data = {
          id,
          type: 'trigger',
          label: 'Trigger',
          position,
          config: { kind: 'manual' },
        };
      } else if (type === 'condition') {
        data = {
          id,
          type: 'condition',
          label: 'Condition',
          position,
          config: { fieldPath: 'payload.value', operator: 'eq', value: '' },
        };
      } else {
        data = {
          id,
          type: 'action',
          label: 'Action',
          position,
          config: { moduleId: '', toolId: '', input: {} },
        };
      }

      const nextNodes = [...flowNodes, toReactFlowNode(data)];
      setFlowNodes(nextNodes);
      persistWorkflow(nextNodes, flowEdges);
    },
    [flowEdges, flowNodes, persistWorkflow, selectedWorkflow]
  );

  const updateNode = useCallback(
    (nodeId: string, updater: (node: WorkflowNode) => WorkflowNode) => {
      const nextNodes = flowNodes.map((node) => {
        if (node.id !== nodeId) return node;
        return {
          ...node,
          data: updater(node.data),
        };
      });
      setFlowNodes(nextNodes);
      persistWorkflow(nextNodes, flowEdges);
    },
    [flowEdges, flowNodes, persistWorkflow]
  );

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return flowNodes.find((node) => node.id === selectedNodeId)?.data || null;
  }, [flowNodes, selectedNodeId]);

  const handleCreateWorkflow = () => {
    const workflowId = createId('workflow');
    const template = createDefaultWorkflowRule(workflowId);
    template.name = `Workflow ${workflows.length + 1}`;
    upsertWorkflow(baseId, template);
    setSelectedWorkflowId(workflowId);
  };

  const handleDeleteWorkflow = () => {
    if (!selectedWorkflow) return;
    deleteWorkflow(baseId, selectedWorkflow.rule.workflowId);
  };

  const handleRunNow = async () => {
    if (!selectedWorkflow) return;
    setIsRunning(true);
    setRunMessage(null);
    const result = await runWorkflowManually(baseId, selectedWorkflow.rule.workflowId, {
      payload: {},
    });
    setRunMessage(result.success ? 'Run erfolgreich.' : (result.error || 'Run fehlgeschlagen.'));
    setIsRunning(false);
  };

  return (
    <div className="grid h-[calc(100vh-11rem)] grid-cols-[240px_1fr_320px] gap-4">
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/65 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-200">Workflows</div>
          <div className="space-y-2">
            {workflows.map((workflow) => {
              const isSelected = workflow.rule.workflowId === selectedWorkflowId;
              return (
                <button
                  key={workflow.id}
                  type="button"
                  onClick={() => setSelectedWorkflowId(workflow.rule.workflowId)}
                  className={`w-full rounded-lg border px-2 py-2 text-left text-xs transition ${
                    isSelected
                      ? 'border-cyan-300/70 bg-cyan-500/15 text-cyan-100'
                      : 'border-white/10 bg-slate-800/65 text-slate-200 hover:border-cyan-300/40'
                  }`}
                >
                  <div className="font-medium">{workflow.rule.name || workflow.description}</div>
                  <div className="mt-1 text-[11px] opacity-75">
                    {workflow.rule.isActive ? 'Aktiv' : 'Inaktiv'}
                    {workflow.rule.lastRunStatus ? ` · ${workflow.rule.lastRunStatus}` : ''}
                  </div>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleCreateWorkflow}
            className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-cyan-300/40 bg-cyan-500/15 px-2 py-2 text-xs font-medium text-cyan-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Workflow erstellen
          </button>
          <button
            type="button"
            onClick={handleDeleteWorkflow}
            disabled={!selectedWorkflow}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-red-300/40 bg-red-500/15 px-2 py-2 text-xs font-medium text-red-100 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Workflow löschen
          </button>
          <button
            type="button"
            onClick={handleRunNow}
            disabled={!selectedWorkflow || isRunning}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-emerald-300/40 bg-emerald-500/15 px-2 py-2 text-xs font-medium text-emerald-100 disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" />
            {isRunning ? 'Running...' : 'Run now'}
          </button>
          {runMessage && <div className="mt-2 text-xs text-slate-200/80">{runMessage}</div>}
        </div>
        <NodePalette onAddNode={addNode} />
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background gap={16} size={1} />
        </ReactFlow>
      </div>

      <InspectorPanel
        workflowName={selectedWorkflow?.rule.name || ''}
        isActive={selectedWorkflow?.rule.isActive || false}
        selectedNode={selectedNode}
        modules={modules}
        tools={tools}
        onWorkflowNameChange={(value) => {
          persistWorkflow(flowNodes, flowEdges, (current) => ({ ...current, name: value }));
        }}
        onWorkflowActiveChange={(value) => {
          if (!selectedWorkflow) return;
          setWorkflowActive(baseId, selectedWorkflow.rule.workflowId, value);
        }}
        onNodeLabelChange={(nodeId, label) => {
          updateNode(nodeId, (node) => ({ ...node, label }));
        }}
        onTriggerConfigChange={(nodeId, config) => {
          updateNode(nodeId, (node) => ({
            ...node,
            type: 'trigger',
            config,
          }));
        }}
        onConditionChange={(nodeId, next) => {
          updateNode(nodeId, (node) => ({
            ...(node as WorkflowConditionNode),
            type: 'condition',
            config: next,
          }));
        }}
        onActionChange={(nodeId, next) => {
          updateNode(nodeId, (node) => ({
            ...(node as WorkflowActionNode),
            type: 'action',
            config: next,
          }));
        }}
      />
    </div>
  );
}
