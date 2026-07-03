import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useMemo } from 'react';
import type { Module, ModuleRegistryStore } from './types';
import { useBaseStore } from '@/lib/bases/store';
import { useAppStore } from '@/lib/store/app-store';

// ============================================
// Module Registry Store
// Central registry for all LifeOS modules
// ============================================

// --------------------------------------------
// Entferntes natives Desktop-Streaming-Modul
// Kann noch in aelterem LocalStorage liegen (ohne versionsfeld) —
// merge + Hydration-Cleanup entfernen es zuverlaessig.
// --------------------------------------------

const REMOVED_LEGACY_DESKTOP_RUNNER_ID = 'desktop-runner';

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
            // Re-Publish darf zuvor geloeschte IDs wieder sichtbar machen.
            deletedModuleIds: current.deletedModuleIds.filter((id) => id !== module.id),
          };
        });

        if (module.baseId) {
          get().assignToBase(module.id, module.baseId);
        }
      },

      unregisterModule: (moduleId: string) => {
        useBaseStore.getState().removeModuleFromBase(moduleId);

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

        if ('baseId' in updates) {
          if (typeof updates.baseId === 'string' && updates.baseId.length > 0) {
            useBaseStore.getState().assignModuleToBase(moduleId, updates.baseId);
          } else {
            useBaseStore.getState().removeModuleFromBase(moduleId);
          }
        }

        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === moduleId ? { ...m, ...updates } : m
          ),
        }));
      },

      getModule: (moduleId: string) => {
        return get().modules.find((m) => m.id === moduleId);
      },

      getModulesByCategory: (category: string) => {
        return get().modules.filter((m) => m.category === category);
      },

      getModulesByBase: (baseId: string) => {
        const base = useBaseStore.getState().bases.find((b) => b.id === baseId);
        const baseModuleIds = new Set(base?.moduleIds ?? []);

        return get().modules.filter(
          (m) => m.baseId === baseId || baseModuleIds.has(m.id)
        );
      },

      getSubModules: (moduleId: string) => {
        return get().modules.filter((m) => m.parentModuleId === moduleId);
      },

      assignToBase: (moduleId: string, baseId: string) => {
        const moduleExists = get().modules.some((m) => m.id === moduleId);
        const baseExists = useBaseStore.getState().bases.some((b) => b.id === baseId);

        if (!moduleExists || !baseExists) {
          return;
        }

        useBaseStore.getState().assignModuleToBase(moduleId, baseId);
        useAppStore.getState().addSidebarModule(moduleId);

        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === moduleId ? { ...m, baseId } : m
          ),
        }));
      },

      removeFromBase: (moduleId: string) => {
        const moduleEntry = get().modules.find((m) => m.id === moduleId);
        if (!moduleEntry) return;

        useBaseStore.getState().removeModuleFromBase(moduleId);

        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === moduleId ? { ...m, baseId: undefined } : m
          ),
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
      merge: (persistedState, currentState) => {
        const merged =
          persistedState && typeof persistedState === 'object'
            ? { ...currentState, ...persistedState }
            : currentState;
        if (!Array.isArray(merged.modules)) return merged;
        const hadLegacy = merged.modules.some(
          (m) => m.id === REMOVED_LEGACY_DESKTOP_RUNNER_ID
        );
        if (!hadLegacy) return merged;
        merged.modules = merged.modules.filter(
          (m) => m.id !== REMOVED_LEGACY_DESKTOP_RUNNER_ID
        );
        const dels = new Set(merged.deletedModuleIds ?? []);
        dels.add(REMOVED_LEGACY_DESKTOP_RUNNER_ID);
        merged.deletedModuleIds = Array.from(dels);
        return merged;
      },
    }
  )
);

// ============================================
// Selectors
// ============================================

export const useModules = () => 
  useModuleRegistry((state) => state.modules);

// Hook für aktive Module - verwendet useMemo für stabile Referenz
export function useActiveModules(): Module[] {
  const modules = useModuleRegistry((state) => state.modules);
  return useMemo(() => modules.filter((m) => m.isActive), [modules]);
}

export const useModule = (moduleId: string) => 
  useModuleRegistry((state) => state.modules.find((m) => m.id === moduleId));

// ============================================
// Module Discovery Hook
// Lädt dynamisch Module aus dem Lab-Builder
// ============================================

export async function discoverModules(): Promise<Module[]> {
  // Placeholder for future module discovery
  // This will scan for installed modules and load their manifests
  return [];
}

// ============================================
// Load Generated Modules
// Lädt alle im Lab generierten Module
// ============================================

// Kurzes Timeout: ohne lokalen Lab-Server darf die Registry nicht endlos haengen
async function fetchLabActivateList(): Promise<Response> {
  const ms = 12_000;
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return fetch('/api/lab/activate', { signal: AbortSignal.timeout(ms) });
  }
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch('/api/lab/activate', { signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function loadGeneratedModules(): Promise<Module[]> {
  try {
    const response = await fetchLabActivateList();
    if (!response.ok) {
      console.warn('Could not load generated modules');
      return [];
    }
    
    const data = await response.json();
    
    // Transformiere zu Module-Format
    return (data.modules || []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      name: m.name as string || m.id as string,
      description: m.description as string || '',
      icon: m.icon as string || 'Blocks',
      category: m.category as string || 'productivity',
      baseId: typeof m.baseId === 'string' && m.baseId.trim().length > 0 ? m.baseId as string : undefined,
      isActive: true,
      order: 100, // Generierte Module am Ende
      tools: (m.tools as Array<Record<string, unknown>> || []).map((t) => ({
        id: t.id as string,
        name: t.name as string,
        description: t.description as string || '',
      })),
      widgets: [],
      permissions: m.permissions as string[] || [],
      version: m.version as string || '1.0.0',
    }));
  } catch (error) {
    console.error('Error loading generated modules:', error);
    return [];
  }
}

// ============================================
// Initialize Registry with Generated Modules
// ============================================

export async function initializeModuleRegistry(): Promise<void> {
  const { registerModule, setLoading, setError } = useModuleRegistry.getState();
  
  setLoading(true);
  
  try {
    const generatedModules = await loadGeneratedModules();
    
    for (const generatedModule of generatedModules) {
      registerModule(generatedModule);
    }
  } catch (error) {
    console.error('Failed to initialize module registry:', error);
    setError('Module-Registry konnte nicht initialisiert werden');
  } finally {
    setLoading(false);
  }
}

// ============================================
// Module Loader
// For future: dynamically import module components
// ============================================

export async function loadModuleComponent(moduleId: string, componentPath: string) {
  // Placeholder for dynamic module loading
  // This will lazy-load module components on demand
  throw new Error(`Module loading not yet implemented: ${moduleId}/${componentPath}`);
}
