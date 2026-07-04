import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useMemo } from 'react';
import type { Module, ModuleRegistryStore } from './types';

// ============================================
// Module Registry Store
// Central registry for LLM Council modules
// ============================================

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const moduleRegistryStorage = createJSONStorage(() =>
  typeof window !== 'undefined' ? localStorage : noopStorage
);

export const useModuleRegistry = create<ModuleRegistryStore>()(
  persist(
    (set, get) => ({
      // Initial State
      modules: [],
      deletedModuleIds: [],
      isLoading: false,
      error: null,

      // Actions
      registerModule: (module: Module) => {
        set((current) => {
          const normalizedModule: Module = {
            ...module,
            isActive: module.isActive ?? true,
            order:
              module.order ??
              current.modules.find((m) => m.id === module.id)?.order ??
              current.modules.length,
          };

          const exists = current.modules.some((m) => m.id === module.id);
          const nextModules = exists
            ? current.modules.map((entry) =>
                entry.id === module.id ? { ...entry, ...normalizedModule } : entry
              )
            : [...current.modules, normalizedModule];

          return {
            modules: nextModules.sort((a, b) => a.order - b.order),
            deletedModuleIds: current.deletedModuleIds.filter((id) => id !== module.id),
          };
        });
      },

      unregisterModule: (moduleId: string) => {
        set((state) => ({
          modules: state.modules.filter((m) => m.id !== moduleId),
          deletedModuleIds: state.deletedModuleIds.includes(moduleId)
            ? state.deletedModuleIds
            : [...state.deletedModuleIds, moduleId],
        }));
      },

      updateModule: (moduleId: string, updates: Partial<Module>) => {
        const current = get().modules.find((m) => m.id === moduleId);
        if (!current) return;

        set((state) => ({
          modules: state.modules.map((m) => (m.id === moduleId ? { ...m, ...updates } : m)),
        }));
      },

      getModule: (moduleId: string) => {
        return get().modules.find((m) => m.id === moduleId);
      },

      getModulesByCategory: (category: string) => {
        return get().modules.filter((m) => m.category === category);
      },

      getModulesByBase: (baseId: string) => {
        return get().modules.filter((m) => m.baseId === baseId);
      },

      getSubModules: (moduleId: string) => {
        return get().modules.filter((m) => m.parentModuleId === moduleId);
      },

      assignToBase: (moduleId: string, baseId: string) => {
        set((state) => ({
          modules: state.modules.map((m) => (m.id === moduleId ? { ...m, baseId } : m)),
        }));
      },

      removeFromBase: (moduleId: string) => {
        set((state) => ({
          modules: state.modules.map((m) => (m.id === moduleId ? { ...m, baseId: undefined } : m)),
        }));
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },
    }),
    {
      name: 'llm-council-module-registry-v1',
      storage: moduleRegistryStorage,
      partialize: (state) => ({
        modules: state.modules,
        deletedModuleIds: state.deletedModuleIds,
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================

export const useModules = () => useModuleRegistry((state) => state.modules);

// Hook für aktive Module - verwendet useMemo für stabile Referenz
export function useActiveModules(): Module[] {
  const modules = useModuleRegistry((state) => state.modules);
  return useMemo(() => modules.filter((m) => m.isActive), [modules]);
}

export const useModule = (moduleId: string) =>
  useModuleRegistry((state) => state.modules.find((m) => m.id === moduleId));

// ============================================
// Module Discovery Hook
// ============================================

export async function discoverModules(): Promise<Module[]> {
  return [];
}

// ============================================
// Initialize Registry (no-op)
// ============================================

export async function initializeModuleRegistry(): Promise<void> {
  // No modules to register in the pure LLM Council app.
}

// ============================================
// Module Loader
// ============================================

export async function loadModuleComponent(moduleId: string, componentPath: string) {
  throw new Error(`Module loading not yet implemented: ${moduleId}/${componentPath}`);
}
