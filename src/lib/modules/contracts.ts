// ============================================
// LifeOS Contracts - Standardized Interfaces
// All modules and tools MUST implement these contracts
// ============================================

import type { 
  ModuleContract, 
  ToolContract, 
  WidgetContract,
  SchemaDefinition,
  EventDefinition 
} from './types';

// ============================================
// Contract Validators
// ============================================

export function validateModuleContract(contract: unknown): contract is ModuleContract {
  if (!contract || typeof contract !== 'object') return false;
  
  const c = contract as Record<string, unknown>;
  
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.description === 'string' &&
    typeof c.version === 'string' &&
    typeof c.icon === 'string' &&
    typeof c.category === 'string'
  );
}

export function validateToolContract(contract: unknown): contract is ToolContract {
  if (!contract || typeof contract !== 'object') return false;
  
  const c = contract as Record<string, unknown>;
  
  return (
    typeof c.id === 'string' &&
    typeof c.moduleId === 'string' &&
    typeof c.name === 'string' &&
    typeof c.description === 'string' &&
    typeof c.version === 'string' &&
    typeof c.icon === 'string' &&
    Array.isArray(c.capabilities) &&
    validateSchema(c.inputs) &&
    validateSchema(c.outputs) &&
    Array.isArray(c.events)
  );
}

export function validateWidgetContract(contract: unknown): contract is WidgetContract {
  if (!contract || typeof contract !== 'object') return false;
  
  const c = contract as Record<string, unknown>;
  
  return (
    typeof c.id === 'string' &&
    typeof c.toolId === 'string' &&
    typeof c.name === 'string' &&
    typeof c.description === 'string' &&
    ['small', 'medium', 'large', 'full'].includes(c.size as string)
  );
}

function validateSchema(schema: unknown): schema is SchemaDefinition {
  if (!schema || typeof schema !== 'object') return false;
  const s = schema as Record<string, unknown>;
  return Array.isArray(s.fields);
}

// ============================================
// Contract Factories
// ============================================

export function createModuleContract(
  config: Omit<ModuleContract, 'version'> & { version?: string }
): ModuleContract {
  return {
    ...config,
    version: config.version ?? '1.0.0',
  };
}

export function createToolContract(
  config: Omit<ToolContract, 'version' | 'inputs' | 'outputs' | 'events'> & {
    version?: string;
    inputs?: SchemaDefinition;
    outputs?: SchemaDefinition;
    events?: EventDefinition[];
  }
): ToolContract {
  return {
    ...config,
    version: config.version ?? '1.0.0',
    inputs: config.inputs ?? { fields: [] },
    outputs: config.outputs ?? { fields: [] },
    events: config.events ?? [],
  };
}

export function createWidgetContract(
  config: Omit<WidgetContract, 'refreshInterval'> & { refreshInterval?: number }
): WidgetContract {
  return {
    ...config,
    refreshInterval: config.refreshInterval,
  };
}

// ============================================
// Schema Helpers
// ============================================

export function createSchema(fields: SchemaDefinition['fields']): SchemaDefinition {
  return { fields };
}

export function createEvent(
  name: string,
  description: string,
  payloadFields: SchemaDefinition['fields'] = []
): EventDefinition {
  return {
    name,
    description,
    payload: { fields: payloadFields },
  };
}

// ============================================
// Version Utilities
// ============================================

export function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);
  return { major, minor, patch };
}

export function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a);
  const vB = parseVersion(b);
  
  if (vA.major !== vB.major) return vA.major - vB.major;
  if (vA.minor !== vB.minor) return vA.minor - vB.minor;
  return vA.patch - vB.patch;
}

export function isCompatibleVersion(required: string, actual: string): boolean {
  const req = parseVersion(required);
  const act = parseVersion(actual);
  
  // Major version must match, actual minor/patch must be >= required
  return (
    act.major === req.major &&
    (act.minor > req.minor || (act.minor === req.minor && act.patch >= req.patch))
  );
}











