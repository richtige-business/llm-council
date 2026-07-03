export type WorkflowNodeType = 'trigger' | 'condition' | 'action';

export type WorkflowRunStatus = 'idle' | 'running' | 'success' | 'failed';

export type TriggerKind = 'manual' | 'event';

export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains';

export interface WorkflowBaseNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  label: string;
}

export interface WorkflowTriggerConfig {
  kind: TriggerKind;
  sourceModuleId?: string;
  eventName?: string;
}

export interface WorkflowTriggerNode extends WorkflowBaseNode {
  type: 'trigger';
  config: WorkflowTriggerConfig;
}

export interface WorkflowConditionNode extends WorkflowBaseNode {
  type: 'condition';
  config: {
    fieldPath: string;
    operator: ConditionOperator;
    value: unknown;
  };
}

export interface WorkflowActionNode extends WorkflowBaseNode {
  type: 'action';
  config: {
    moduleId: string;
    toolId: string;
    input: Record<string, unknown>;
  };
}

export type WorkflowNode = WorkflowTriggerNode | WorkflowConditionNode | WorkflowActionNode;

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface WorkflowRule {
  version: 1;
  workflowId: string;
  name?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isActive: boolean;
  triggerConfig: WorkflowTriggerConfig;
  lastRunAt?: string;
  lastRunStatus?: WorkflowRunStatus;
}

export interface WorkflowConnection {
  id: string;
  sourceModuleId: string;
  targetModuleId: string;
  connectionType: 'workflow.v1';
  description: string;
  rule: WorkflowRule;
  isActive: boolean;
}

const CONDITION_OPERATORS: ConditionOperator[] = [
  'eq',
  'neq',
  'gt',
  'lt',
  'gte',
  'lte',
  'contains',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseTriggerConfig(value: unknown): WorkflowTriggerConfig {
  if (!isObject(value)) {
    return { kind: 'manual' };
  }

  const kind = value.kind === 'event' ? 'event' : 'manual';
  return {
    kind,
    sourceModuleId: toText(value.sourceModuleId),
    eventName: toText(value.eventName),
  };
}

function parseNode(value: unknown): WorkflowNode | null {
  if (!isObject(value)) return null;

  const id = toText(value.id);
  const type = value.type;
  const label = toText(value.label, 'Node');
  const posRaw = isObject(value.position) ? value.position : {};
  const position = {
    x: toNumber(posRaw.x, 0),
    y: toNumber(posRaw.y, 0),
  };

  if (!id) return null;

  if (type === 'trigger') {
    return {
      id,
      type: 'trigger',
      label,
      position,
      config: parseTriggerConfig(isObject(value.config) ? value.config : {}),
    };
  }

  if (type === 'condition') {
    const config = isObject(value.config) ? value.config : {};
    const operator = CONDITION_OPERATORS.includes(config.operator as ConditionOperator)
      ? (config.operator as ConditionOperator)
      : 'eq';
    return {
      id,
      type: 'condition',
      label,
      position,
      config: {
        fieldPath: toText(config.fieldPath),
        operator,
        value: config.value,
      },
    };
  }

  if (type === 'action') {
    const config = isObject(value.config) ? value.config : {};
    return {
      id,
      type: 'action',
      label,
      position,
      config: {
        moduleId: toText(config.moduleId),
        toolId: toText(config.toolId),
        input: isObject(config.input) ? config.input : {},
      },
    };
  }

  return null;
}

function parseEdge(value: unknown): WorkflowEdge | null {
  if (!isObject(value)) return null;

  const id = toText(value.id);
  const source = toText(value.source);
  const target = toText(value.target);
  if (!id || !source || !target) return null;

  return {
    id,
    source,
    target,
    sourceHandle: toText(value.sourceHandle),
    label: toText(value.label),
  };
}

export function normalizeWorkflowRule(value: unknown): WorkflowRule | null {
  if (!isObject(value)) return null;
  const version = value.version;
  if (version !== 1) return null;

  const workflowId = toText(value.workflowId);
  if (!workflowId) return null;

  const nodesRaw = Array.isArray(value.nodes) ? value.nodes : [];
  const edgesRaw = Array.isArray(value.edges) ? value.edges : [];
  const nodes = nodesRaw.map(parseNode).filter((node): node is WorkflowNode => Boolean(node));
  const edges = edgesRaw.map(parseEdge).filter((edge): edge is WorkflowEdge => Boolean(edge));
  const triggerConfig = parseTriggerConfig(value.triggerConfig);

  return {
    version: 1,
    workflowId,
    name: toText(value.name),
    nodes,
    edges,
    isActive: value.isActive !== false,
    triggerConfig,
    lastRunAt: toText(value.lastRunAt),
    lastRunStatus: ['idle', 'running', 'success', 'failed'].includes(toText(value.lastRunStatus))
      ? (value.lastRunStatus as WorkflowRunStatus)
      : undefined,
  };
}

export function isWorkflowRule(value: unknown): value is WorkflowRule {
  return normalizeWorkflowRule(value) !== null;
}

export function createDefaultWorkflowRule(workflowId: string): WorkflowRule {
  const triggerNodeId = `trigger-${workflowId}`;
  const actionNodeId = `action-${workflowId}`;
  return {
    version: 1,
    workflowId,
    name: 'Neuer Workflow',
    isActive: false,
    triggerConfig: { kind: 'manual' },
    lastRunStatus: 'idle',
    nodes: [
      {
        id: triggerNodeId,
        type: 'trigger',
        label: 'Trigger',
        position: { x: 120, y: 120 },
        config: { kind: 'manual' },
      },
      {
        id: actionNodeId,
        type: 'action',
        label: 'Action',
        position: { x: 420, y: 120 },
        config: {
          moduleId: '',
          toolId: '',
          input: {},
        },
      },
    ],
    edges: [
      {
        id: `edge-${triggerNodeId}-${actionNodeId}`,
        source: triggerNodeId,
        target: actionNodeId,
      },
    ],
  };
}

export function resolveTriggerConfig(rule: WorkflowRule): WorkflowTriggerConfig {
  const triggerNode = rule.nodes.find((node) => node.type === 'trigger') as WorkflowTriggerNode | undefined;
  return triggerNode?.config || rule.triggerConfig || { kind: 'manual' };
}
