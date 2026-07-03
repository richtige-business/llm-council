'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { WorkflowActionNode } from '@/lib/automation/types';

export function ActionNode({ data }: NodeProps<WorkflowActionNode>) {
  return (
    <div className="lifeos-flow-node lifeos-flow-node-action">
      <div className="lifeos-flow-node-title">{data.label || 'Action'}</div>
      <div className="lifeos-flow-node-meta">Modul: {data.config.moduleId || '-'}</div>
      <div className="lifeos-flow-node-meta">Tool: {data.config.toolId || '-'}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
