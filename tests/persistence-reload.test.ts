import { beforeEach, describe, expect, it } from 'vitest';
import type { Module } from '@/types';
import { useBaseStore } from '@/lib/bases/store';
import { useModuleRegistry } from '@/lib/modules/registry';

function createMockModule(id: string): Module {
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
  };
}

function readPersistedState<T>(storageKey: string): T {
  const raw = localStorage.getItem(storageKey);
  expect(raw).not.toBeNull();
  const parsed = JSON.parse(raw as string) as { state: T };
  return parsed.state;
}

describe('Persistenz bei Reload', () => {
  beforeEach(() => {
    localStorage.removeItem('lifeos-bases-v1');
    localStorage.removeItem('lifeos-module-registry-v1');

    useBaseStore.setState({ bases: [] });
    useModuleRegistry.setState({ modules: [], deletedModuleIds: [], isLoading: false, error: null });
  });

  it('persistiert Modul-Zuordnung zu Base fuer Reload', () => {
    const baseId = useBaseStore.getState().createBase({ name: 'ERP' });
    const { registerModule, assignToBase } = useModuleRegistry.getState();

    registerModule(createMockModule('calendar'));
    assignToBase('calendar', baseId);

    const persistedBase = readPersistedState<{ bases: Array<{ id: string; moduleIds: string[] }> }>('lifeos-bases-v1');
    const persistedRegistry = readPersistedState<{ modules: Array<{ id: string; baseId?: string }> }>('lifeos-module-registry-v1');

    expect(persistedBase.bases.find((base) => base.id === baseId)?.moduleIds).toContain('calendar');
    expect(persistedRegistry.modules.find((module) => module.id === 'calendar')?.baseId).toBe(baseId);
  });

  it('persistiert komplett geloeschte Module fuer Reload', () => {
    const { registerModule, unregisterModule } = useModuleRegistry.getState();

    registerModule(createMockModule('calendar'));
    unregisterModule('calendar');

    const persistedRegistry = readPersistedState<{ modules: Array<{ id: string }>; deletedModuleIds: string[] }>(
      'lifeos-module-registry-v1'
    );

    expect(persistedRegistry.modules.some((module) => module.id === 'calendar')).toBe(false);
    expect(persistedRegistry.deletedModuleIds).toContain('calendar');
  });
});
