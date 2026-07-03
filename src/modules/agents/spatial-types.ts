// ============================================
// spatial-types.ts - Gemeinsame Typen fuer den 3D-Agents-Raum
//
// Zweck: Definiert Modi, Nodes, Verbindungen und Layoutdaten
//        fuer die persistente Spatial-Oberflaeche des Agents-Moduls
// Verwendet von: Spatial-Store, Scene, Panels, Graph-Builder
// ============================================

export type AgentsSpatialMode = 'idle' | 'chat' | 'settings' | 'tasks' | 'groups' | 'group' | 'council';
export type AgentsHubView = 'agents' | 'groups' | 'councils';

export type SpatialNodeKind = 'agent' | 'task' | 'conversation';
export type SpatialEntityType = 'agent' | 'group';

export interface SpatialVector3 {
  x: number;
  y: number;
  z: number;
}

export interface SpatialConnection {
  id: string;
  fromId: string;
  toId: string;
  kind: 'hierarchy' | 'task' | 'conversation';
}

export interface SpatialNodeBase {
  id: string;
  kind: SpatialNodeKind;
  label: string;
  color: string;
  parentId?: string;
  rootArmId: string;
  depth: number;
  worldPosition: SpatialVector3;
}

export interface SpatialAgentNode extends SpatialNodeBase {
  kind: 'agent';
  entityType: SpatialEntityType;
  icon: string;
  description?: string;
  displayLabel?: string;
  labelMeta?: string | null;
  hideLabel?: boolean;
  isBuiltIn: boolean;
  parentGroupId?: string;
  rootGroupId?: string;
  conversationCount: number;
  taskCount: number;
  childIds: string[];
}

export interface SpatialTaskNode extends SpatialNodeBase {
  kind: 'task';
  targetId: string;
  taskType: 'one-time' | 'recurring';
  status: 'active' | 'paused' | 'completed' | 'error';
}

export interface SpatialConversationNode extends SpatialNodeBase {
  kind: 'conversation';
  conversationId: string;
  targetId: string;
  updatedAt: number;
}

export type SpatialNode = SpatialAgentNode | SpatialTaskNode | SpatialConversationNode;

export interface SpatialGraph {
  nodes: SpatialNode[];
  agentNodes: SpatialAgentNode[];
  taskNodes: SpatialTaskNode[];
  conversationNodes: SpatialConversationNode[];
  connections: SpatialConnection[];
  nodesById: Record<string, SpatialNode>;
}
