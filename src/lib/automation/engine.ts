import { actionRegistry } from '@/lib/agent/registry/action-registry';
import type {
  ConditionOperator,
  WorkflowActionNode,
  WorkflowEdge,
  WorkflowNode,
  WorkflowRule,
} from '@/lib/automation/types';

interface WorkflowExecutionOptions {
  baseId: string;
  workflow: WorkflowRule;
  initialPayload?: Record<string, unknown>;
}

export interface WorkflowExecutionResult {
  success: boolean;
  error?: string;
  lastPayload?: Record<string, unknown>;
}

function getByPath(input: unknown, path: string): unknown {
  if (!path.trim()) return undefined;
  const resolve = (candidate: string) =>
    candidate.split('.').reduce<unknown>((value, segment) => {
      if (!segment) return value;
      if (!value || typeof value !== 'object') return undefined;
      return (value as Record<string, unknown>)[segment];
    }, input);

  const exact = resolve(path);
  if (exact !== undefined) return exact;

  if (!path.startsWith('payload.')) return undefined;
  return resolve(path.slice(8));
}

function compareValues(left: unknown, right: unknown, operator: ConditionOperator): boolean {
  switch (operator) {
    case 'eq':
      return left === right;
    case 'neq':
      return left !== right;
    case 'gt':
      return Number(left) > Number(right);
    case 'lt':
      return Number(left) < Number(right);
    case 'gte':
      return Number(left) >= Number(right);
    case 'lte':
      return Number(left) <= Number(right);
    case 'contains':
      if (Array.isArray(left)) return left.includes(right);
      if (typeof left === 'string') return left.includes(String(right));
      return false;
    default:
      return false;
  }
}

function getOutgoingEdges(edges: WorkflowEdge[], nodeId: string): WorkflowEdge[] {
  return edges.filter((edge) => edge.source === nodeId);
}

async function executeActionNode(
  baseId: string,
  workflowId: string,
  node: WorkflowActionNode
): Promise<{ success: boolean; payload?: Record<string, unknown>; error?: string }> {
  if (!node.config.moduleId || !node.config.toolId) {
    return { success: false, error: `Action-Node "${node.id}" ist nicht vollständig konfiguriert.` };
  }

  const response = await fetch('/api/automation/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      baseId,
      workflowId,
      moduleId: node.config.moduleId,
      toolId: node.config.toolId,
      input: node.config.input || {},
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) {
    return {
      success: false,
      error: typeof payload?.message === 'string' ? payload.message : 'Action-Ausführung fehlgeschlagen.',
    };
  }

  if (payload.frontendAction) {
    await actionRegistry.execute(payload.frontendAction);
  }

  return {
    success: true,
    payload: {
      toolResult: payload.toolResult,
      frontendAction: payload.frontendAction,
    },
  };
}

export async function runWorkflow(options: WorkflowExecutionOptions): Promise<WorkflowExecutionResult> {
  const { baseId, workflow, initialPayload = {} } = options;
  const nodesById = new Map(workflow.nodes.map((node) => [node.id, node]));
  const triggerNode = workflow.nodes.find((node) => node.type === 'trigger');
  if (!triggerNode) {
    return { success: false, error: 'Workflow enthält keinen Trigger-Node.' };
  }

  const queue: Array<{ nodeId: string; payload: Record<string, unknown> }> = [{ nodeId: triggerNode.id, payload: initialPayload }];
  let lastPayload: Record<string, unknown> = initialPayload;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = nodesById.get(current.nodeId);
    if (!node) continue;

    if (node.type === 'condition') {
      const left = getByPath(current.payload, node.config.fieldPath);
      const isTrue = compareValues(left, node.config.value, node.config.operator);
      const outgoing = getOutgoingEdges(workflow.edges, node.id);
      const branch = isTrue ? 'true' : 'false';
      const matching = outgoing.filter((edge) => {
        if (!edge.sourceHandle) return isTrue;
        return edge.sourceHandle.toLowerCase() === branch;
      });
      const targets = matching.length > 0 ? matching : outgoing;
      targets.forEach((edge) => {
        queue.push({ nodeId: edge.target, payload: current.payload });
      });
      continue;
    }

    if (node.type === 'action') {
      const actionResult = await executeActionNode(baseId, workflow.workflowId, node);
      if (!actionResult.success) {
        return { success: false, error: actionResult.error, lastPayload };
      }
      lastPayload = {
        ...current.payload,
        [node.id]: actionResult.payload || {},
      };
      const outgoing = getOutgoingEdges(workflow.edges, node.id);
      outgoing.forEach((edge) => {
        queue.push({ nodeId: edge.target, payload: lastPayload });
      });
      continue;
    }

    if (node.type === 'trigger') {
      const outgoing = getOutgoingEdges(workflow.edges, node.id);
      outgoing.forEach((edge) => {
        queue.push({ nodeId: edge.target, payload: current.payload });
      });
    }
  }

  return { success: true, lastPayload };
}

export function workflowHasEventTrigger(workflow: WorkflowRule): boolean {
  return workflow.triggerConfig.kind === 'event'
    && Boolean(workflow.triggerConfig.sourceModuleId)
    && Boolean(workflow.triggerConfig.eventName);
}
