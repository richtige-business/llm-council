import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Module } from '@/types';
import { BaseManager } from '@/components/system/BaseManager';
import { useBaseStore } from '@/lib/bases/store';
import { useModuleRegistry } from '@/lib/modules/registry';

vi.mock('@/lib/theme', () => ({
  useThemeStyles: () => ({
    container: { base: {} },
    input: { base: {} },
    accentColor: '#8b5cf6',
    designStyle: 'glass',
    textColor: '#ffffff',
    surfaceColor: 'rgba(255,255,255,0.1)',
  }),
}));

function createMockModule(id: string, name: string, order: number): Module {
  return {
    id,
    name,
    description: `${name} module`,
    version: '1.0.0',
    icon: 'Blocks',
    category: 'productivity',
    tools: [],
    widgets: [],
    isActive: true,
    order,
  };
}

describe('BaseManager Drag & Drop', () => {
  beforeEach(() => {
    cleanup();

    useBaseStore.setState({
      bases: [
        {
          id: 'base-personal',
          name: 'Personal',
          description: '',
          icon: 'Folder',
          color: '#8b5cf6',
          moduleIds: [],
          dashboard: { widgets: [], layout: 'grid', columns: 3, quickModuleIds: [], activeWidgetIds: [], orbColor: '#0ea5e9' },
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
      modules: [
        createMockModule('todo-list', 'Todo', 1),
        createMockModule('training', 'Training', 2),
      ],
      deletedModuleIds: [],
      isLoading: false,
      error: null,
    });
  });

  it('erstellt eine Base über Vorschlag', () => {
    render(<BaseManager />);

    fireEvent.click(screen.getByRole('button', { name: /Business/i }));

    const baseNames = useBaseStore.getState().bases.map((base) => base.name);
    expect(baseNames).toContain('Business');
  });

  it('ordnet Modul per Drag&Drop zu und kann es wieder entkoppeln', () => {
    render(<BaseManager />);

    const unassignedSection = screen.getAllByText('Nicht zugeordnete Module')[0]?.closest('section');
    const baseSection = screen.getAllByRole('heading', { name: 'Personal' })[0]?.closest('section');
    const moduleCard = within(unassignedSection!).getByText('Todo').closest('[draggable="true"]');

    expect(moduleCard).toBeTruthy();
    expect(baseSection).toBeTruthy();
    expect(unassignedSection).toBeTruthy();

    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(type: string, value: string) {
        this.data[type] = value;
      },
      getData(type: string) {
        return this.data[type] || '';
      },
      effectAllowed: 'move',
    };

    fireEvent.dragStart(moduleCard!, { dataTransfer });
    fireEvent.dragOver(baseSection!);
    fireEvent.drop(baseSection!, { dataTransfer });

    expect(useBaseStore.getState().bases[0]?.moduleIds).toContain('todo-list');

    const assignedCard = within(baseSection!).getByText('Todo').closest('[draggable="true"]');
    fireEvent.dragStart(assignedCard!, { dataTransfer });
    fireEvent.dragOver(unassignedSection!);
    fireEvent.drop(unassignedSection!, { dataTransfer });

    expect(useBaseStore.getState().bases[0]?.moduleIds).not.toContain('todo-list');
  });

  it('löscht ein Modul komplett über den Modul-Button', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<BaseManager />);

    fireEvent.click(screen.getByRole('button', { name: /Todo löschen/i }));

    const moduleIds = useModuleRegistry.getState().modules.map((module) => module.id);
    expect(moduleIds).not.toContain('todo-list');
  });
});
