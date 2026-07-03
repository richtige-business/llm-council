import { beforeEach, describe, expect, it } from 'vitest';
import type { Module } from '@/types';
import { useModuleRegistry } from '@/lib/modules/registry';
import { useBaseStore } from '@/lib/bases/store';

function createMockModule(id: string, overrides: Partial<Module> = {}): Module {
  return {
    id,
    name: id,
    description: `${id} module`,
    version: '1.0.0',
    icon: 'Blocks',
    category: 'productivity',
    tools: [],
    widgets: [],
    isActive: true,
    order: 1,
    ...overrides,
  };
}

describe('Module Registry Base-Erweiterungen', () => {
  beforeEach(() => {
    useBaseStore.setState({ bases: [] });
    useModuleRegistry.setState({ modules: [], deletedModuleIds: [], isLoading: false, error: null });
  });

  it('ordnet Module einer Base zu und liefert sie ueber getModulesByBase', () => {
    const baseId = useBaseStore.getState().createBase({ name: 'ERP' });

    const { registerModule, assignToBase, getModulesByBase } = useModuleRegistry.getState();

    registerModule(createMockModule('calendar'));
    registerModule(createMockModule('inbox'));

    assignToBase('calendar', baseId);

    const byBase = getModulesByBase(baseId).map((module) => module.id);
    expect(byBase).toContain('calendar');
    expect(byBase).not.toContain('inbox');
  });

  it('removeFromBase entfernt Zuordnung in Registry und Base-Store', () => {
    const baseId = useBaseStore.getState().createBase({ name: 'ERP' });
    const { registerModule, assignToBase, removeFromBase } = useModuleRegistry.getState();

    registerModule(createMockModule('calendar'));
    assignToBase('calendar', baseId);

    removeFromBase('calendar');

    const module = useModuleRegistry.getState().getModule('calendar');
    expect(module?.baseId).toBeUndefined();
    expect(useBaseStore.getState().bases.find((base) => base.id === baseId)?.moduleIds).toEqual([]);
  });

  it('getSubModules liefert Kindmodule', () => {
    const { registerModule, getSubModules } = useModuleRegistry.getState();

    registerModule(createMockModule('parent-module'));
    registerModule(createMockModule('child-module', { parentModuleId: 'parent-module' }));
    registerModule(createMockModule('other-child', { parentModuleId: 'parent-module' }));

    const subIds = getSubModules('parent-module').map((module) => module.id);
    expect(subIds).toEqual(['child-module', 'other-child']);
  });
});
