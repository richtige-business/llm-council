// ============================================
// buildGroupSpatialGraph.ts - Spatial-Graph fuer Gruppenraeume
//
// Zweck: Baut fuer eine ausgewaehlte Gruppe einen separaten
//        3D-Raum mit Gruppen-Orchestrator in der Mitte und
//        Teilnehmer-Orbs im Ring darum herum.
// Verwendet von: AgentsSpatialScene, AgentsModuleShell
// ============================================

import type { AgentConfig } from '@/lib/agent/stores/agent-config-store';
import type {
  ChatConversation,
  CustomAgentData,
  GroupChatParticipantRole,
  ScheduledAgentTask,
} from '../../types';
import type {
  SpatialAgentNode,
  SpatialGraph,
  SpatialNode,
} from '../../spatial-types';
import { BUILT_IN_AGENT_DEFINITIONS } from '../../agent-meta';

interface BuildGroupSpatialGraphOptions {
  groupId: string;
  customAgents: CustomAgentData[];
  conversations: ChatConversation[];
  tasks: ScheduledAgentTask[];
  configs: Record<string, AgentConfig>;
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

function buildParticipantNode(
  participant: GroupChatParticipantRole,
  index: number,
  total: number,
  customById: Map<string, CustomAgentData>,
  builtInById: Map<string, (typeof BUILT_IN_AGENT_DEFINITIONS)[number]>,
  conversations: ChatConversation[],
  tasks: ScheduledAgentTask[],
  configs: Record<string, AgentConfig>,
  groupId: string
): SpatialAgentNode {
  const customAgent = customById.get(participant.agentId);
  const builtInAgent = builtInById.get(participant.agentId);
  const resolvedLabel =
    customAgent?.name
    || configs[participant.agentId]?.agentName
    || builtInAgent?.name
    || participant.agentId;
  const resolvedColor =
    customAgent?.color
    || configs[participant.agentId]?.orbColor
    || builtInAgent?.color
    || '#8B5CF6';
  const resolvedIcon =
    customAgent?.icon
    || configs[participant.agentId]?.agentIcon
    || builtInAgent?.icon
    || 'Bot';
  const radius = Math.max(10, 8 + total * 1.1);
  const angle = total > 0 ? -Math.PI / 2 + index * ((Math.PI * 2) / total) : -Math.PI / 2;

  return {
    id: participant.agentId,
    kind: 'agent',
    entityType: 'agent',
    label: resolvedLabel,
    color: resolvedColor,
    icon: resolvedIcon,
    description: participant.role
      ? `${participant.role} im Gruppenraum.`
      : customAgent?.description || builtInAgent?.description,
    isBuiltIn: Boolean(builtInAgent) && !customAgent,
    parentId: groupId,
    parentGroupId: groupId,
    rootGroupId: groupId,
    rootArmId: groupId,
    depth: 1,
    worldPosition: {
      x: Math.cos(angle) * radius,
      y: index % 2 === 0 ? 0.8 : -0.8,
      z: Math.sin(angle) * radius,
    },
    conversationCount: countAgentConversations(conversations, participant.agentId),
    taskCount: tasks.filter((task) => task.targetId === participant.agentId).length,
    childIds: [],
  };
}

function buildAdminNode(
  participant: GroupChatParticipantRole,
  customById: Map<string, CustomAgentData>,
  builtInById: Map<string, (typeof BUILT_IN_AGENT_DEFINITIONS)[number]>,
  conversations: ChatConversation[],
  tasks: ScheduledAgentTask[],
  configs: Record<string, AgentConfig>,
  group: CustomAgentData
): SpatialAgentNode {
  const customAgent = customById.get(participant.agentId);
  const builtInAgent = builtInById.get(participant.agentId);
  const resolvedLabel =
    customAgent?.name
    || configs[participant.agentId]?.agentName
    || builtInAgent?.name
    || participant.agentId;
  const resolvedColor =
    customAgent?.color
    || configs[participant.agentId]?.orbColor
    || builtInAgent?.color
    || '#14B8A6';
  const resolvedIcon =
    customAgent?.icon
    || configs[participant.agentId]?.agentIcon
    || builtInAgent?.icon
    || 'Bot';

  return {
    id: participant.agentId,
    kind: 'agent',
    entityType: 'agent',
    label: resolvedLabel,
    color: resolvedColor,
    icon: resolvedIcon,
    description: `${participant.role || 'Admin'} · Zentrum von ${group.name}.`,
    isBuiltIn: Boolean(builtInAgent) && !customAgent,
    parentId: undefined,
    parentGroupId: group.id,
    rootGroupId: group.id,
    rootArmId: group.id,
    depth: 0,
    worldPosition: { x: 0, y: 0, z: 0 },
    conversationCount: countAgentConversations(conversations, participant.agentId),
    taskCount: tasks.filter((task) => task.targetId === participant.agentId).length,
    childIds: [],
  };
}

export function buildGroupSpatialGraph({
  groupId,
  customAgents,
  conversations,
  tasks,
  configs,
}: BuildGroupSpatialGraphOptions): SpatialGraph {
  const customById = new Map(customAgents.map((agent) => [agent.id, agent]));
  const builtInById = new Map(BUILT_IN_AGENT_DEFINITIONS.map((agent) => [agent.id, agent]));
  const group = customById.get(groupId);

  if (!group || group.type !== 'group') {
    return {
      nodes: [],
      agentNodes: [],
      taskNodes: [],
      conversationNodes: [],
      connections: [],
      nodesById: {},
    };
  }

  const participants = (group.participantRoles || []).filter((participant) => participant.agentId.trim());
  const adminParticipant =
    participants.find((participant) => participant.agentId === group.adminAgentId)
    || participants[0];

  if (!adminParticipant) {
    const groupNode: SpatialAgentNode = {
      id: group.id,
      kind: 'agent',
      entityType: 'group',
      label: group.name,
      color: group.color,
      icon: group.icon,
      description: group.description || 'Leerer Gruppenraum ohne Teilnehmer.',
      isBuiltIn: false,
      parentId: undefined,
      parentGroupId: undefined,
      rootGroupId: group.id,
      rootArmId: group.id,
      depth: 0,
      worldPosition: { x: 0, y: 0, z: 0 },
      conversationCount: countAgentConversations(conversations, group.id),
      taskCount: tasks.filter((task) => task.targetId === group.id).length,
      childIds: [],
    };

    return {
      nodes: [groupNode],
      agentNodes: [groupNode],
      taskNodes: [],
      conversationNodes: [],
      connections: [],
      nodesById: { [groupNode.id]: groupNode },
    };
  }

  const outerParticipants = participants.filter(
    (participant) => participant.agentId !== adminParticipant.agentId
  );

  const participantNodes = outerParticipants.map((participant, index) =>
    buildParticipantNode(
      participant,
      index,
      outerParticipants.length,
      customById,
      builtInById,
      conversations,
      tasks,
      configs,
      groupId
    )
  );

  const adminNode = buildAdminNode(
    adminParticipant,
    customById,
    builtInById,
    conversations,
    tasks,
    configs,
    group
  );
  adminNode.childIds = participantNodes.map((node) => node.id);

  const agentNodes: SpatialAgentNode[] = [adminNode, ...participantNodes];
  const connections = participantNodes.map((node) => ({
    id: `connection-${adminNode.id}-${node.id}`,
    fromId: adminNode.id,
    toId: node.id,
    kind: 'hierarchy' as const,
  }));
  const nodes: SpatialNode[] = [...agentNodes];

  return {
    nodes,
    agentNodes,
    taskNodes: [],
    conversationNodes: [],
    connections,
    nodesById: Object.fromEntries(nodes.map((node) => [node.id, node])),
  };
}
