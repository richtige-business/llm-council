// ============================================
// buildGroupsOverviewSpatialGraph.ts - Spatial-Graph fuer den Gruppen-Hub
//
// Zweck: Baut einen gemeinsamen 3D-Ueberblick ueber alle Gruppen,
//        wobei jede Gruppe als eigener isolierter Cluster mit Admin
//        im Zentrum und Teilnehmern im Ring dargestellt wird.
// Verwendet von: AgentsModuleShell, AgentsSpatialScene
// ============================================

import type { AgentConfig } from '@/lib/agent/stores/agent-config-store';
import type {
  ChatConversation,
  CustomAgentData,
  GroupChatParticipantRole,
  ScheduledAgentTask,
} from '../../types';
import type { SpatialAgentNode, SpatialGraph, SpatialNode } from '../../spatial-types';
import { BUILT_IN_AGENT_DEFINITIONS } from '../../agent-meta';

interface BuildGroupsOverviewSpatialGraphOptions {
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

function resolveParticipantVisuals(
  participant: GroupChatParticipantRole,
  customById: Map<string, CustomAgentData>,
  builtInById: Map<string, (typeof BUILT_IN_AGENT_DEFINITIONS)[number]>,
  configs: Record<string, AgentConfig>
) {
  const customAgent = customById.get(participant.agentId);
  const builtInAgent = builtInById.get(participant.agentId);

  return {
    customAgent,
    builtInAgent,
    label:
      customAgent?.name
      || configs[participant.agentId]?.agentName
      || builtInAgent?.name
      || participant.agentId,
    color:
      customAgent?.color
      || configs[participant.agentId]?.orbColor
      || builtInAgent?.color
      || '#8B5CF6',
    icon:
      customAgent?.icon
      || configs[participant.agentId]?.agentIcon
      || builtInAgent?.icon
      || 'Bot',
  };
}

export function buildGroupsOverviewSpatialGraph({
  customAgents,
  conversations,
  tasks,
  configs,
}: BuildGroupsOverviewSpatialGraphOptions): SpatialGraph {
  const groups = customAgents
    .filter((agent) => agent.type === 'group' && !agent.parentGroupId)
    .sort((left, right) => left.name.localeCompare(right.name));

  const customById = new Map(customAgents.map((agent) => [agent.id, agent]));
  const builtInById = new Map(BUILT_IN_AGENT_DEFINITIONS.map((agent) => [agent.id, agent]));
  const agentNodes: SpatialAgentNode[] = [];
  const connections: SpatialGraph['connections'] = [];

  // --------------------------------------------
  // Gruppen als Cluster auf einem lockeren Grid verteilen,
  // damit sie im Top-down-Hub klar voneinander getrennt bleiben.
  // --------------------------------------------
  const columns = Math.max(1, Math.ceil(Math.sqrt(groups.length || 1)));
  const spacing = 42;

  groups.forEach((group, groupIndex) => {
    const participants = (group.participantRoles || []).filter((participant) => participant.agentId.trim());
    const adminParticipant =
      participants.find((participant) => participant.agentId === group.adminAgentId)
      || participants[0];

    const column = groupIndex % columns;
    const row = Math.floor(groupIndex / columns);
    const clusterOffsetX = (column - (columns - 1) / 2) * spacing;
    const rowCount = Math.ceil(groups.length / columns);
    const clusterOffsetZ = (row - (rowCount - 1) / 2) * spacing;

    if (!adminParticipant) {
      agentNodes.push({
        id: `group-overview-${group.id}`,
        kind: 'agent',
        entityType: 'group',
        label: group.name,
        displayLabel: group.name,
        labelMeta: null,
        color: group.color,
        icon: group.icon,
        description: group.description || 'Leerer Gruppenraum ohne Teilnehmer.',
        isBuiltIn: false,
        parentId: undefined,
        parentGroupId: group.id,
        rootGroupId: group.id,
        rootArmId: group.id,
        depth: 0,
        worldPosition: { x: clusterOffsetX, y: 0, z: clusterOffsetZ },
        conversationCount: countAgentConversations(conversations, group.id),
        taskCount: tasks.filter((task) => task.targetId === group.id).length,
        childIds: [],
      });
      return;
    }

    const adminVisuals = resolveParticipantVisuals(adminParticipant, customById, builtInById, configs);
    const adminNodeId = `group-overview-${group.id}-admin-${adminParticipant.agentId}`;
    const outerParticipants = participants.filter((participant) => participant.agentId !== adminParticipant.agentId);

    const adminNode: SpatialAgentNode = {
      id: adminNodeId,
      kind: 'agent',
      entityType: 'agent',
      label: adminVisuals.label,
      displayLabel: group.name,
      labelMeta: null,
      color: adminVisuals.color,
      icon: adminVisuals.icon,
      description: `${group.name} · ${adminParticipant.role || 'Admin'}`,
      isBuiltIn: Boolean(adminVisuals.builtInAgent) && !adminVisuals.customAgent,
      parentId: undefined,
      parentGroupId: group.id,
      rootGroupId: group.id,
      rootArmId: group.id,
      depth: 0,
      worldPosition: { x: clusterOffsetX, y: 0, z: clusterOffsetZ },
      conversationCount: countAgentConversations(conversations, adminParticipant.agentId),
      taskCount: tasks.filter((task) => task.targetId === adminParticipant.agentId).length,
      childIds: [],
    };

    const participantNodes = outerParticipants.map((participant, participantIndex) => {
      const participantVisuals = resolveParticipantVisuals(participant, customById, builtInById, configs);
      const radius = Math.max(8, 7 + outerParticipants.length * 0.9);
      const angle =
        outerParticipants.length > 0
          ? -Math.PI / 2 + participantIndex * ((Math.PI * 2) / outerParticipants.length)
          : -Math.PI / 2;

      return {
        id: `group-overview-${group.id}-participant-${participant.agentId}-${participantIndex}`,
        kind: 'agent',
        entityType: 'agent',
        label: participantVisuals.label,
        displayLabel: participantVisuals.label,
        hideLabel: true,
        color: participantVisuals.color,
        icon: participantVisuals.icon,
        description: participant.role
          ? `${group.name} · ${participant.role}`
          : `${group.name} · Teilnehmer`,
        isBuiltIn: Boolean(participantVisuals.builtInAgent) && !participantVisuals.customAgent,
        parentId: adminNodeId,
        parentGroupId: group.id,
        rootGroupId: group.id,
        rootArmId: group.id,
        depth: 1,
        worldPosition: {
          x: clusterOffsetX + Math.cos(angle) * radius,
          y: participantIndex % 2 === 0 ? 0.8 : -0.8,
          z: clusterOffsetZ + Math.sin(angle) * radius,
        },
        conversationCount: countAgentConversations(conversations, participant.agentId),
        taskCount: tasks.filter((task) => task.targetId === participant.agentId).length,
        childIds: [],
      } satisfies SpatialAgentNode;
    });

    adminNode.childIds = participantNodes.map((node) => node.id);
    agentNodes.push(adminNode, ...participantNodes);

    participantNodes.forEach((node) => {
      connections.push({
        id: `connection-${adminNode.id}-${node.id}`,
        fromId: adminNode.id,
        toId: node.id,
        kind: 'hierarchy',
      });
    });
  });

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
