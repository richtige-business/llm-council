// ============================================
// buildSpatialGraph.ts - Normalisierung fuer den Agents-Raum
//
// Zweck: Fuehrt Built-ins, Custom-Agents, Tasks und Chats
//        in einen gemeinsamen Spatial-Graphen zusammen
// Verwendet von: AgentsSpatialScene
// ============================================

import type { AgentConfig } from '@/lib/agent/stores/agent-config-store';
import type {
  ChatConversation,
  CustomAgentData,
  ScheduledAgentTask,
} from '../../types';
import {
  type SpatialAgentNode,
  type SpatialConversationNode,
  type SpatialGraph,
  type SpatialNode,
  type SpatialTaskNode,
} from '../../spatial-types';
import { BUILT_IN_AGENT_DEFINITIONS } from '../../agent-meta';
import { buildOctopusSpatialLayout } from './buildOctopusSpatialLayout';

interface BuildSpatialGraphOptions {
  customAgents: CustomAgentData[];
  conversations: ChatConversation[];
  tasks: ScheduledAgentTask[];
  configs: Record<string, AgentConfig>;
}

interface NormalizedAgentInput {
  id: string;
  label: string;
  color: string;
  icon: string;
  description?: string;
  isBuiltIn: boolean;
  parentId?: string;
  parentGroupId?: string;
  rootGroupId?: string;
}

function countAgentConversations(
  conversations: ChatConversation[],
  agentId: string
): number {
  return conversations.filter((conversation) => {
    if (conversation.agentId === agentId) {
      return true;
    }

    if (conversation.isGroupChat) {
      return (conversation.participantRoles || []).some(
        (participant) => participant.agentId === agentId
      );
    }

    return false;
  }).length;
}

function determineRootArmId(
  agentId: string,
  parentMap: Map<string, string | undefined>
): string {
  let currentId = agentId;
  let currentParent = parentMap.get(agentId);

  while (currentParent && currentParent !== 'master') {
    currentId = currentParent;
    currentParent = parentMap.get(currentParent);
  }

  return currentId === 'master' ? agentId : currentId;
}

function determineDepth(
  agentId: string,
  parentMap: Map<string, string | undefined>
): number {
  let depth = 0;
  let currentParent = parentMap.get(agentId);

  while (currentParent) {
    depth += 1;
    if (currentParent === 'master') {
      break;
    }
    currentParent = parentMap.get(currentParent);
  }

  return depth;
}

export function buildSpatialGraph({
  customAgents,
  conversations,
  tasks,
  configs,
}: BuildSpatialGraphOptions): SpatialGraph {
  const hubCustomAgents = customAgents.filter((agent) => agent.type !== 'group');

  const normalizedAgents: NormalizedAgentInput[] = [
    ...BUILT_IN_AGENT_DEFINITIONS.map((agent) => ({
      id: agent.id,
      label: configs[agent.id]?.agentName || agent.name,
      color: configs[agent.id]?.orbColor || agent.color,
      icon: configs[agent.id]?.agentIcon || agent.icon,
      description: agent.description,
      isBuiltIn: true,
      parentId: agent.parentId,
    })),
    ...hubCustomAgents.map((agent) => ({
      id: agent.id,
      label: agent.name,
      color: agent.color,
      icon: agent.icon,
      description: agent.description,
      isBuiltIn: false,
      parentId: agent.parentGroupId || agent.parentAgentId || 'master',
      parentGroupId: agent.parentGroupId,
      rootGroupId: agent.rootGroupId,
    })),
  ];

  const parentMap = new Map<string, string | undefined>(
    normalizedAgents.map((agent) => [agent.id, agent.parentId])
  );

  const childrenByParent = new Map<string, NormalizedAgentInput[]>();

  normalizedAgents.forEach((agent) => {
    if (agent.id === 'master') {
      return;
    }

    const parentId = agent.parentId || 'master';
    const siblings = childrenByParent.get(parentId) || [];
    siblings.push(agent);
    childrenByParent.set(parentId, siblings);
  });

  childrenByParent.forEach((siblings) => {
    siblings.sort((left, right) => left.label.localeCompare(right.label));
  });

  const positionedAgents = normalizedAgents.map((agent) => {
    const parentId = agent.parentId || undefined;
    const siblings = childrenByParent.get(parentId || 'master') || [];
    return {
      ...agent,
      parentId,
      rootArmId:
        agent.id === 'master'
          ? 'master'
          : determineRootArmId(agent.id, parentMap),
      depth: agent.id === 'master' ? 0 : determineDepth(agent.id, parentMap),
      siblingIndex: siblings.findIndex((entry) => entry.id === agent.id),
      siblingCount: siblings.length,
    };
  });

  const positions = buildOctopusSpatialLayout(positionedAgents);

  const agentNodes: SpatialAgentNode[] = positionedAgents.map((agent) => ({
    id: agent.id,
    kind: 'agent',
    entityType: 'agent',
    label: agent.label,
    color: agent.color,
    icon: agent.icon,
    description: agent.description,
    isBuiltIn: agent.isBuiltIn,
    parentId: agent.parentId,
    parentGroupId: agent.parentGroupId,
    rootGroupId: agent.rootGroupId,
    rootArmId: agent.rootArmId,
    depth: agent.depth,
    worldPosition: positions[agent.id] || { x: 0, y: 0, z: 0 },
    conversationCount: countAgentConversations(conversations, agent.id),
    taskCount: tasks.filter((task) => task.targetId === agent.id).length,
    childIds: (childrenByParent.get(agent.id) || []).map((child) => child.id),
  }));

  const agentNodeMap = new Map(agentNodes.map((node) => [node.id, node]));

  const taskNodes: SpatialTaskNode[] = tasks
    .filter((task) => agentNodeMap.has(task.targetId))
    .map((task, index) => {
      const targetNode = agentNodeMap.get(task.targetId)!;
      const orbitAngle = (index % 8) * ((Math.PI * 2) / 8);
      const orbitRadius = 2.5 + (index % 3) * 0.9;

      return {
        id: `task-${task.id}`,
        kind: 'task',
        label: task.title,
        color: task.enabled ? '#F59E0B' : '#6B7280',
        targetId: task.targetId,
        taskType: task.type,
        status: task.status,
        parentId: targetNode.id,
        rootArmId: targetNode.rootArmId,
        depth: targetNode.depth + 1,
        worldPosition: {
          x: targetNode.worldPosition.x + Math.cos(orbitAngle) * orbitRadius,
          y: targetNode.worldPosition.y + 1.8,
          z: targetNode.worldPosition.z + Math.sin(orbitAngle) * orbitRadius,
        },
      };
    });

  const conversationNodes: SpatialConversationNode[] = agentNodes.flatMap((agent) => {
    const relatedConversations = conversations
      .filter((conversation) => conversation.agentId === agent.id)
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, 3);

    return relatedConversations.map((conversation, index) => {
      const orbitAngle = (index / Math.max(relatedConversations.length, 1)) * Math.PI * 2;
      return {
        id: `conversation-${conversation.id}`,
        kind: 'conversation',
        label: conversation.title || 'Konversation',
        color: '#60A5FA',
        conversationId: conversation.id,
        targetId: agent.id,
        parentId: agent.id,
        rootArmId: agent.rootArmId,
        depth: agent.depth + 1,
        updatedAt: conversation.updatedAt,
        worldPosition: {
          x: agent.worldPosition.x + Math.cos(orbitAngle) * 1.6,
          y: agent.worldPosition.y - 1.35,
          z: agent.worldPosition.z + Math.sin(orbitAngle) * 1.6,
        },
      };
    });
  });

  const connections = [
    ...agentNodes
      .filter((agent) => agent.parentId)
      .map((agent) => ({
        id: `connection-${agent.parentId}-${agent.id}`,
        fromId: agent.parentId!,
        toId: agent.id,
        kind: 'hierarchy' as const,
      })),
    ...taskNodes.map((taskNode) => ({
      id: `connection-${taskNode.targetId}-${taskNode.id}`,
      fromId: taskNode.targetId,
      toId: taskNode.id,
      kind: 'task' as const,
    })),
    ...conversationNodes.map((conversationNode) => ({
      id: `connection-${conversationNode.targetId}-${conversationNode.id}`,
      fromId: conversationNode.targetId,
      toId: conversationNode.id,
      kind: 'conversation' as const,
    })),
  ];

  const nodes: SpatialNode[] = [
    ...agentNodes,
    ...taskNodes,
    ...conversationNodes,
  ];

  return {
    nodes,
    agentNodes,
    taskNodes,
    conversationNodes,
    connections,
    nodesById: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}
