// ============================================
// SpatialConnections.tsx - Verbindungsarme im Agents-Raum
//
// Zweck: Rendert Hierarchie-, Task- und Chat-Verbindungen
//        zwischen den Knoten des räumlichen Graphen
// Verwendet von: AgentsSpatialScene
// ============================================

'use client';

import { Line } from '@react-three/drei';
import type { SpatialGraph } from '../../spatial-types';

interface SpatialConnectionsProps {
  graph: SpatialGraph;
  showTasks: boolean;
  showConversations: boolean;
}

export function SpatialConnections({
  graph,
  showTasks,
  showConversations,
}: SpatialConnectionsProps) {
  return (
    <>
      {graph.connections.map((connection) => {
        if (connection.kind === 'task' && !showTasks) {
          return null;
        }

        if (connection.kind === 'conversation' && !showConversations) {
          return null;
        }

        const fromNode = graph.nodesById[connection.fromId];
        const toNode = graph.nodesById[connection.toId];

        if (!fromNode || !toNode) {
          return null;
        }

        const color =
          connection.kind === 'hierarchy'
            ? 'rgba(148, 163, 184, 0.45)'
            : connection.kind === 'task'
              ? 'rgba(245, 158, 11, 0.45)'
              : 'rgba(96, 165, 250, 0.45)';

        return (
          <Line
            key={connection.id}
            points={[
              [fromNode.worldPosition.x, fromNode.worldPosition.y, fromNode.worldPosition.z],
              [toNode.worldPosition.x, toNode.worldPosition.y, toNode.worldPosition.z],
            ]}
            color={color}
            lineWidth={connection.kind === 'hierarchy' ? 1.3 : 0.9}
            transparent
            opacity={0.8}
          />
        );
      })}
    </>
  );
}
