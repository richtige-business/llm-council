// ============================================
// Module System Type Definitions
// Re-exports from central types + module-specific types
// ============================================

// Import für lokale Verwendung
import type { Module as ModuleType } from '@/types';

export type {
  Module,
  ModuleContract,
  ModuleCategory,
  Tool,
  ToolContract,
  Widget,
  WidgetContract,
  WidgetSize,
  WidgetProps,
  ToolProps,
  SchemaDefinition,
  SchemaField,
  EventDefinition,
  ExposedAction,
  ExposedEvent,
} from '@/types';

// ============================================
// Registry-specific Types
// ============================================

export interface ModuleRegistryState {
  modules: ModuleType[];
  deletedModuleIds: string[];
  isLoading: boolean;
  error: string | null;
}

export interface ModuleRegistryActions {
  registerModule: (module: ModuleType) => void;
  unregisterModule: (moduleId: string) => void;
  updateModule: (moduleId: string, updates: Partial<ModuleType>) => void;
  getModule: (moduleId: string) => ModuleType | undefined;
  getModulesByCategory: (category: string) => ModuleType[];
  getModulesByBase: (baseId: string) => ModuleType[];
  getSubModules: (moduleId: string) => ModuleType[];
  assignToBase: (moduleId: string, baseId: string) => void;
  removeFromBase: (moduleId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export type ModuleRegistryStore = ModuleRegistryState & ModuleRegistryActions;
