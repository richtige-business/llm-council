'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowTriggerNode } from '@/lib/automation/types';

export function TriggerNode({ data }: NodeProps<WorkflowTriggerNode>) {
  const kind = data.config.kind === 'event' ? 'Event' : 'Manual';
  const source = data.config.sourceModuleId || '-';
  const eventName = data.config.eventName || '-';

  return (
    <div className="lifeos-flow-node lifeos-flow-node-trigger">
      <div className="lifeos-flow-node-title">{data.label || 'Trigger'}</div>
      <div className="lifeos-flow-node-meta">Typ: {kind}</div>
      {data.config.kind === 'event' && (
        <>
          <div className="lifeos-flow-node-meta">Modul: {source}</div>
          <div className="lifeos-flow-node-meta">Event: {eventName}</div>
        </>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
