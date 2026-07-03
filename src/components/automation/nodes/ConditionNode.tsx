'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowConditionNode } from '@/lib/automation/types';

export function ConditionNode({ data }: NodeProps<WorkflowConditionNode>) {
  return (
    <div className="lifeos-flow-node lifeos-flow-node-condition">
      <div className="lifeos-flow-node-title">{data.label || 'Condition'}</div>
      <div className="lifeos-flow-node-meta">Feld: {data.config.fieldPath || '-'}</div>
      <div className="lifeos-flow-node-meta">
        Check: {data.config.operator} {String(data.config.value ?? '')}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" id="true" position={Position.Right} style={{ top: '35%' }} />
      <Handle type="source" id="false" position={Position.Right} style={{ top: '70%' }} />
    </div>
  );
}
