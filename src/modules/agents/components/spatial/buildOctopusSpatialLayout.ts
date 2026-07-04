// ============================================
// buildOctopusSpatialLayout.ts - Oktopus-Layout fuer Agent-Orbs
//
// Zweck: Ordnet Agents radial um Intelligence an, wobei
//        Unter-Agents entlang des jeweiligen Arms weiterwachsen
// Verwendet von: buildSpatialGraph.ts
// ============================================

import type { SpatialVector3 } from '../../spatial-types';

interface OctopusLayoutAgent {
  id: string;
  parentId?: string;
  rootArmId: string;
  depth: number;
  siblingIndex: number;
  siblingCount: number;
}

export function buildOctopusSpatialLayout(
  agents: OctopusLayoutAgent[]
): Record<string, SpatialVector3> {
  const positions: Record<string, SpatialVector3> = {
    master: { x: 0, y: 0, z: 0 },
  };

  const topLevelArms = agents
    .filter((agent) => agent.id !== 'master' && (agent.parentId || 'master') === 'master')
    .sort((left, right) => left.id.localeCompare(right.id));

  const rootAngles = new Map<string, number>();
  const angleStep = (Math.PI * 2) / Math.max(topLevelArms.length, 1);

  topLevelArms.forEach((agent, index) => {
    rootAngles.set(agent.id, -Math.PI / 2 + index * angleStep);
  });

  agents.forEach((agent) => {
    if (agent.id === 'master') {
      return;
    }

    const armId = agent.rootArmId === 'master' ? agent.id : agent.rootArmId;
    const baseAngle = rootAngles.get(armId) ?? -Math.PI / 2;
    const radius = Math.max(8, agent.depth * 10);
    const lateralOffset =
      agent.depth > 1
        ? (agent.siblingIndex - (agent.siblingCount - 1) / 2) * 3.25
        : 0;
    const heightOffset =
      agent.depth > 1
        ? (agent.siblingIndex % 2 === 0 ? 1 : -1) * Math.min(2.5, agent.depth * 0.55)
        : 0;

    const armDirection = {
      x: Math.cos(baseAngle),
      z: Math.sin(baseAngle),
    };
    const perpendicularDirection = {
      x: -Math.sin(baseAngle),
      z: Math.cos(baseAngle),
    };

    positions[agent.id] = {
      x: armDirection.x * radius + perpendicularDirection.x * lateralOffset,
      y: heightOffset,
      z: armDirection.z * radius + perpendicularDirection.z * lateralOffset,
    };
  });

  return positions;
}
