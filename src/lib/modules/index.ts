// ============================================
// Module System Exports
// ============================================

// Types
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
  ModuleRegistryState,
  ModuleRegistryActions,
  ModuleRegistryStore,
} from './types';

// Registry
export {
  useModuleRegistry,
  useModules,
  useActiveModules,
  useModule,
  discoverModules,
  loadModuleComponent,
} from './registry';

// Contracts
export {
  validateModuleContract,
  validateToolContract,
  validateWidgetContract,
  createModuleContract,
  createToolContract,
  createWidgetContract,
  createSchema,
  createEvent,
  parseVersion,
  compareVersions,
  isCompatibleVersion,
} from './contracts';










