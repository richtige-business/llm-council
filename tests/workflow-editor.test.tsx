import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkflowEditor } from '@/components/automation/WorkflowEditor';
import { useBaseStore } from '@/lib/bases/store';
import { useModuleRegistry } from '@/lib/modules/registry';
import type { Module } from '@/types';

const mockRunWorkflowManually = vi.fn();

vi.mock('@/lib/automation/runtime', () => ({
  runWorkflowManually: (...args: unknown[]) => mockRunWorkflowManually(...args),
}));

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: React.PropsWithChildren) => <div data-testid="reactflow">{children}</div>,
  Background: () => <div />,
  Controls: () => <div />,
  MiniMap: () => <div />,
  applyNodeChanges: (_changes: unknown, nodes: unknown) => nodes,
  applyEdgeChanges: (_changes: unknown, edges: unknown) => edges,
  addEdge: (edge: unknown, edges: unknown[]) => [...edges, edge],
}));

function createModule(id: string, name: string): Module {
  return {
    id,
    name,
    description: '',
    version: '1.0.0',
    icon: 'Blocks',
    category: 'productivity',
    tools: [],
    widgets: [],
    isActive: true,
    order: 1,
  };
}

describe('WorkflowEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunWorkflowManually.mockResolvedValue({ success: true });

    useBaseStore.setState({
      bases: [
        {
          id: 'base-1',
          name: 'ERP',
          description: '',
          icon: 'Folder',
          color: '#8b5cf6',
          moduleIds: ['calendar'],
          dashboard: {
            widgets: [],
            layout: 'grid',
            columns: 3,
            quickModuleIds: [],
            activeWidgetIds: [],
            orbColor: '#0ea5e9',
          },
          automationIds: [],
          backgroundImage: '',
          accessMembers: [],
          connections: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });
    useModuleRegistry.setState({
      modules: [createModule('calendar', 'Kalender')],
      deletedModuleIds: [],
      isLoading: false,
      error: null,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, tools: [] }),
    } as unknown as Response);
  });

  it('legt einen Workflow an und kann Run now ausführen', async () => {
    render(<WorkflowEditor baseId="base-1" modules={[createModule('calendar', 'Kalender')]} />);

    fireEvent.click(screen.getByRole('button', { name: /Workflow erstellen/i }));
    expect(useBaseStore.getState().listWorkflows('base-1')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /Run now/i }));
    expect(mockRunWorkflowManually).toHaveBeenCalledTimes(1);
  });
});
