import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WorkflowConnection, WorkflowRule, WorkflowRunStatus } from '@/lib/automation/types';
import { normalizeWorkflowRule, resolveTriggerConfig } from '@/lib/automation/types';

// --------------------------------------------
// Fetch mit Timeout: haengende DB blockiert Client nicht endlos
// --------------------------------------------

const BASES_FETCH_TIMEOUT_MS = 20_000;

function basesFetchSignal(): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(BASES_FETCH_TIMEOUT_MS);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), BASES_FETCH_TIMEOUT_MS);
  return ctrl.signal;
}

// ============================================
// Base Store - Gruppierung von Modulen in Domänen
// ============================================

// Entferntes natives Desktop-Streaming — weiterhin in alten moduleIds gespeichert
const REMOVED_LEGACY_DESKTOP_RUNNER_MODULE_ID = 'desktop-runner';

export interface DashboardWidget {
  id: string;
  moduleId: string;
  widgetId: string;
  position: { x: number; y: number; w: number; h: number };
}

export type BaseAccessRole = 'owner' | 'editor' | 'viewer';

export interface BaseAccessMember {
  id: string;
  name: string;
  email?: string;
  role: BaseAccessRole;
}

export interface BaseDashboardConfig {
  widgets: DashboardWidget[];
  layout: 'grid' | 'freeform';
  columns: number;
  quickModuleIds: string[];
  activeWidgetIds: string[];
  orbColor: string;
}

export interface BaseConnection {
  id: string;
  sourceModuleId: string;
  targetModuleId: string;
  connectionType: string;
  description: string;
  rule: Record<string, unknown>;
  isActive: boolean;
}

export interface Base {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  moduleIds: string[];
  dashboard: BaseDashboardConfig;
  automationIds: string[];
  backgroundImage: string;
  accessMembers: BaseAccessMember[];
  connections: BaseConnection[];
  createdAt: string;
  updatedAt: string;
}

interface CreateBaseInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface BaseState {
  bases: Base[];
  isServerHydrated: boolean;
  isSyncing: boolean;
  syncError: string | null;
}

interface BaseActions {
  createBase: (input: CreateBaseInput) => string;
  updateBase: (baseId: string, updates: Partial<Omit<Base, 'id' | 'createdAt'>>) => void;
  deleteBase: (baseId: string) => void;
  assignModuleToBase: (moduleId: string, baseId: string) => void;
  removeModuleFromBase: (moduleId: string, baseId?: string) => void;
  getBaseByModuleId: (moduleId: string) => Base | undefined;
  getUnassignedModuleIds: (allModuleIds: string[]) => string[];
  cleanupMissingModules: (validModuleIds: string[]) => void;
  listWorkflows: (baseId: string) => WorkflowConnection[];
  upsertWorkflow: (baseId: string, workflowRule: WorkflowRule) => void;
  deleteWorkflow: (baseId: string, workflowId: string) => void;
  setWorkflowActive: (baseId: string, workflowId: string, isActive: boolean) => void;
  setWorkflowRunState: (
    baseId: string,
    workflowId: string,
    status: WorkflowRunStatus,
    timestamp?: string
  ) => void;
  initializeFromServer: () => Promise<void>;
  syncToServer: () => Promise<void>;
}

export type BaseStore = BaseState & BaseActions;

// Immer in JEDER Navbar (Haupt-Dashboard + alle Base-Dashboards)
export const DEFAULT_NAVBAR_MODULE_IDS = ['inbox', 'calendar', 'browser'] as const;

const DEFAULT_DASHBOARD: BaseDashboardConfig = {
  widgets: [],
  layout: 'grid',
  columns: 3,
  quickModuleIds: [...DEFAULT_NAVBAR_MODULE_IDS],
  activeWidgetIds: [],
  orbColor: '#0ea5e9',
};

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let initializeStarted = false;
let applyingServerSnapshot = false;

function createBaseId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(globalThis.crypto);
  }

  return `base-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeModuleName(moduleId: string): string {
  const clean = moduleId.replace(/[-_]/g, ' ').trim();
  if (!clean) return moduleId;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function unique(values: string[] | undefined): string[] {
  if (!values) return [];
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeConnection(connection: BaseConnection): BaseConnection {
  const normalized: BaseConnection = {
    id: String(connection.id || `conn-${Date.now()}`),
    sourceModuleId: String(connection.sourceModuleId || 'manual'),
    targetModuleId: String(connection.targetModuleId || ''),
    connectionType: String(connection.connectionType || 'link'),
    description: String(connection.description || ''),
    rule:
      connection.rule && typeof connection.rule === 'object' && !Array.isArray(connection.rule)
        ? (connection.rule as Record<string, unknown>)
        : {},
    isActive: connection.isActive !== false,
  };

  if (normalized.connectionType === 'workflow.v1') {
    const workflowRule = normalizeWorkflowRule(normalized.rule);
    if (!workflowRule) {
      normalized.connectionType = 'legacy.invalid-workflow';
      normalized.isActive = false;
      normalized.rule = {};
      return normalized;
    }

    const trigger = resolveTriggerConfig(workflowRule);
    const firstAction = workflowRule.nodes.find(
      (node) => node.type === 'action' && node.config.moduleId.trim().length > 0
    );
    normalized.sourceModuleId =
      trigger.kind === 'event' && trigger.sourceModuleId
        ? trigger.sourceModuleId
        : 'manual';
    normalized.targetModuleId = firstAction?.config.moduleId || normalized.targetModuleId || '';
    normalized.description = (workflowRule.name || normalized.description || 'Neuer Workflow').trim();
    normalized.rule = workflowRule;
    normalized.isActive = workflowRule.isActive;
  }

  return normalized;
}

function buildDescriptionFallback(baseName: string, moduleIds: string[] = []): string {
  const topModules = unique(moduleIds).slice(0, 3).map(normalizeModuleName);
  if (topModules.length === 0) {
    return `${baseName}-Base fuer strukturierte Workflows und interne Automationen.`;
  }
  return `${baseName}-Base fuer ${topModules.join(', ')}. Fokus auf koordinierte Workflows und interne Automationen.`;
}

function normalizeBase(base: Base): Base {
  const name = base.name.trim() || 'Unbenannt';
  const description = base.description.trim() || buildDescriptionFallback(name, base.moduleIds);

  return {
    ...base,
    name,
    description,
    icon: base.icon || 'Folder',
    color: base.color || '#8b5cf6',
    moduleIds: unique(
      (base.moduleIds || []).filter(
        (id) => id !== REMOVED_LEGACY_DESKTOP_RUNNER_MODULE_ID
      )
    ),
    dashboard: base.dashboard || DEFAULT_DASHBOARD,
    automationIds: unique(base.automationIds),
    backgroundImage: base.backgroundImage || '',
    accessMembers: Array.isArray(base.accessMembers) ? base.accessMembers : [],
    connections: Array.isArray(base.connections) ? base.connections.map(normalizeConnection) : [],
  };
}

function deserializeBases(payload: unknown): Base[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => {
      const base = {
        id: String(entry.id || createBaseId()),
        name: String(entry.name || ''),
        description: String(entry.description || ''),
        icon: String(entry.icon || 'Folder'),
        color: String(entry.color || '#8b5cf6'),
        moduleIds: Array.isArray(entry.moduleIds) ? entry.moduleIds.map((item) => String(item)) : [],
        dashboard: (entry.dashboard as BaseDashboardConfig) || DEFAULT_DASHBOARD,
        automationIds: Array.isArray(entry.automationIds) ? entry.automationIds.map((item) => String(item)) : [],
        backgroundImage: String(entry.backgroundImage || ''),
        accessMembers: Array.isArray(entry.accessMembers) ? (entry.accessMembers as BaseAccessMember[]) : [],
        connections: Array.isArray(entry.connections)
          ? (entry.connections as BaseConnection[]).map((connection) => normalizeConnection(connection))
          : [],
        createdAt: String(entry.createdAt || new Date().toISOString()),
        updatedAt: String(entry.updatedAt || new Date().toISOString()),
      } as Base;
      return normalizeBase(base);
    });
}

function toServerPayload(base: Base) {
  return {
    ...base,
    dashboard: base.dashboard || {},
    accessMembers: base.accessMembers || [],
    connections: base.connections || [],
  };
}

function asWorkflowConnection(connection: BaseConnection): WorkflowConnection | null {
  if (connection.connectionType !== 'workflow.v1') return null;
  const workflowRule = normalizeWorkflowRule(connection.rule);
  if (!workflowRule) return null;
  return {
    id: connection.id,
    sourceModuleId: connection.sourceModuleId,
    targetModuleId: connection.targetModuleId,
    connectionType: 'workflow.v1',
    description: connection.description,
    rule: workflowRule,
    isActive: connection.isActive,
  };
}

function buildWorkflowConnection(workflowRule: WorkflowRule, existing?: BaseConnection): BaseConnection {
  const trigger = resolveTriggerConfig(workflowRule);
  const firstActionNode = workflowRule.nodes.find(
    (node) => node.type === 'action' && node.config.moduleId.trim().length > 0
  );
  const sourceModuleId =
    trigger.kind === 'event' && trigger.sourceModuleId ? trigger.sourceModuleId : 'manual';
  const targetModuleId = firstActionNode?.config.moduleId || existing?.targetModuleId || '';
  const description =
    (workflowRule.name || existing?.description || `Workflow ${workflowRule.workflowId.slice(0, 8)}`).trim();

  return normalizeConnection({
    id: existing?.id || `workflow-${workflowRule.workflowId}`,
    sourceModuleId,
    targetModuleId,
    connectionType: 'workflow.v1',
    description,
    rule: workflowRule,
    isActive: workflowRule.isActive,
  });
}

export const useBaseStore = create<BaseStore>()(
  persist(
    (set, get) => {
      const scheduleSync = () => {
        if (applyingServerSnapshot) return;
        if (!get().isServerHydrated) return;
        if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
        syncDebounceTimer = setTimeout(() => {
          void get().syncToServer();
        }, 500);
      };

      return {
        bases: [],
        isServerHydrated: false,
        isSyncing: false,
        syncError: null,

        createBase: ({ name, description = '', icon = 'Folder', color = '#8b5cf6' }) => {
          const baseId = createBaseId();
          const now = new Date().toISOString();
          const trimmedName = name.trim() || 'Unbenannt';
          const ensuredDescription = description.trim() || buildDescriptionFallback(trimmedName, []);

          const newBase: Base = normalizeBase({
            id: baseId,
            name: trimmedName,
            description: ensuredDescription,
            icon,
            color,
            moduleIds: [],
            dashboard: DEFAULT_DASHBOARD,
            automationIds: [],
            backgroundImage: '',
            accessMembers: [],
            connections: [],
            createdAt: now,
            updatedAt: now,
          });

          set((state) => ({
            bases: [...state.bases, newBase],
            syncError: null,
          }));
          scheduleSync();
          return baseId;
        },

        updateBase: (baseId, updates) => {
          const now = new Date().toISOString();

          set((state) => ({
            bases: state.bases.map((base) => {
              if (base.id !== baseId) return base;
              const merged = {
                ...base,
                ...updates,
                description:
                  updates.description !== undefined
                    ? updates.description.trim()
                    : base.description,
                updatedAt: now,
              } as Base;
              return normalizeBase(merged);
            }),
            syncError: null,
          }));
          scheduleSync();
        },

        deleteBase: (baseId) => {
          set((state) => ({
            bases: state.bases.filter((base) => base.id !== baseId),
            syncError: null,
          }));
          scheduleSync();
        },

        assignModuleToBase: (moduleId, baseId) => {
          const now = new Date().toISOString();

          set((state) => {
            let targetFound = false;
            const nextBases = state.bases.map((base) => {
              const withoutModule = base.moduleIds.filter((id) => id !== moduleId);

              if (base.id === baseId) {
                targetFound = true;
                return normalizeBase({
                  ...base,
                  moduleIds: [...withoutModule, moduleId],
                  updatedAt: now,
                });
              }

              if (withoutModule.length !== base.moduleIds.length) {
                return normalizeBase({
                  ...base,
                  moduleIds: withoutModule,
                  updatedAt: now,
                });
              }

              return base;
            });

            if (!targetFound) return state;
            return { bases: nextBases, syncError: null };
          });

          scheduleSync();
        },

        removeModuleFromBase: (moduleId, baseId) => {
          const now = new Date().toISOString();

          set((state) => ({
            bases: state.bases.map((base) => {
              if (baseId && base.id !== baseId) return base;

              const nextModuleIds = base.moduleIds.filter((id) => id !== moduleId);
              if (nextModuleIds.length === base.moduleIds.length) return base;

              return normalizeBase({
                ...base,
                moduleIds: nextModuleIds,
                updatedAt: now,
              });
            }),
            syncError: null,
          }));
          scheduleSync();
        },

        getBaseByModuleId: (moduleId) => {
          return get().bases.find((base) => base.moduleIds.includes(moduleId));
        },

        getUnassignedModuleIds: (allModuleIds) => {
          const assigned = new Set(get().bases.flatMap((base) => base.moduleIds));
          return allModuleIds.filter((moduleId) => !assigned.has(moduleId));
        },

        cleanupMissingModules: (validModuleIds) => {
          const valid = new Set(validModuleIds);
          const now = new Date().toISOString();

          set((state) => {
            let hasChanges = false;

            const nextBases = state.bases.map((base) => {
              const nextModuleIds = base.moduleIds.filter((id) => valid.has(id));
              if (nextModuleIds.length === base.moduleIds.length) return base;
              hasChanges = true;
              return normalizeBase({
                ...base,
                moduleIds: nextModuleIds,
                updatedAt: now,
              });
            });

            if (!hasChanges) return state;
            return { bases: nextBases, syncError: null };
          });

          scheduleSync();
        },

        listWorkflows: (baseId) => {
          const base = get().bases.find((entry) => entry.id === baseId);
          if (!base) return [];
          return base.connections
            .map(asWorkflowConnection)
            .filter((connection): connection is WorkflowConnection => Boolean(connection));
        },

        upsertWorkflow: (baseId, workflowRule) => {
          const now = new Date().toISOString();
          const normalizedRule = normalizeWorkflowRule(workflowRule);
          if (!normalizedRule) return;

          set((state) => ({
            bases: state.bases.map((base) => {
              if (base.id !== baseId) return base;

              const existingConnection = base.connections.find((connection) => {
                if (connection.connectionType !== 'workflow.v1') return false;
                const existingRule = normalizeWorkflowRule(connection.rule);
                return existingRule?.workflowId === normalizedRule.workflowId;
              });

              const nextConnection = buildWorkflowConnection(normalizedRule, existingConnection);
              const nextConnections = existingConnection
                ? base.connections.map((connection) =>
                    connection.id === existingConnection.id ? nextConnection : connection
                  )
                : [...base.connections, nextConnection];

              return normalizeBase({
                ...base,
                connections: nextConnections,
                updatedAt: now,
              });
            }),
            syncError: null,
          }));

          scheduleSync();
        },

        deleteWorkflow: (baseId, workflowId) => {
          const now = new Date().toISOString();
          set((state) => ({
            bases: state.bases.map((base) => {
              if (base.id !== baseId) return base;
              const nextConnections = base.connections.filter((connection) => {
                if (connection.connectionType !== 'workflow.v1') return true;
                const rule = normalizeWorkflowRule(connection.rule);
                return rule?.workflowId !== workflowId;
              });
              return normalizeBase({
                ...base,
                connections: nextConnections,
                updatedAt: now,
              });
            }),
            syncError: null,
          }));
          scheduleSync();
        },

        setWorkflowActive: (baseId, workflowId, isActive) => {
          const now = new Date().toISOString();
          set((state) => ({
            bases: state.bases.map((base) => {
              if (base.id !== baseId) return base;
              const nextConnections = base.connections.map((connection) => {
                const rule = connection.connectionType === 'workflow.v1'
                  ? normalizeWorkflowRule(connection.rule)
                  : null;
                if (!rule || rule.workflowId !== workflowId) return connection;
                const nextRule: WorkflowRule = { ...rule, isActive };
                return buildWorkflowConnection(nextRule, connection);
              });
              return normalizeBase({
                ...base,
                connections: nextConnections,
                updatedAt: now,
              });
            }),
            syncError: null,
          }));
          scheduleSync();
        },

        setWorkflowRunState: (baseId, workflowId, status, timestamp) => {
          const now = new Date().toISOString();
          const runAt = timestamp || now;
          set((state) => ({
            bases: state.bases.map((base) => {
              if (base.id !== baseId) return base;
              const nextConnections = base.connections.map((connection) => {
                const rule = connection.connectionType === 'workflow.v1'
                  ? normalizeWorkflowRule(connection.rule)
                  : null;
                if (!rule || rule.workflowId !== workflowId) return connection;
                const nextRule: WorkflowRule = {
                  ...rule,
                  lastRunAt: runAt,
                  lastRunStatus: status,
                };
                return buildWorkflowConnection(nextRule, connection);
              });
              return normalizeBase({
                ...base,
                connections: nextConnections,
                updatedAt: now,
              });
            }),
            syncError: null,
          }));
          scheduleSync();
        },

        initializeFromServer: async () => {
          if (initializeStarted) return;
          initializeStarted = true;

          try {
            set({ isSyncing: true, syncError: null });

            const localBases = get().bases.map((base) => normalizeBase(base));
            const response = await fetch('/api/bases', {
              cache: 'no-store',
              signal: basesFetchSignal(),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(typeof payload?.message === 'string' ? payload.message : 'Bases konnten nicht geladen werden.');
            }

            const serverBases = deserializeBases(payload?.bases);

            if (serverBases.length === 0 && localBases.length > 0) {
              const importResponse = await fetch('/api/bases/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bases: localBases.map(toServerPayload),
                }),
                signal: basesFetchSignal(),
              });
              const importPayload = await importResponse.json().catch(() => ({}));
              if (!importResponse.ok) {
                throw new Error(typeof importPayload?.message === 'string' ? importPayload.message : 'Base-Import fehlgeschlagen.');
              }
              const importedBases = deserializeBases(importPayload?.bases);
              applyingServerSnapshot = true;
              set({
                bases: importedBases.length > 0 ? importedBases : localBases,
                isServerHydrated: true,
                isSyncing: false,
                syncError: null,
              });
              applyingServerSnapshot = false;
              return;
            }

            applyingServerSnapshot = true;
            set({
              bases: serverBases.length > 0 ? serverBases : localBases,
              isServerHydrated: true,
              isSyncing: false,
              syncError: null,
            });
            applyingServerSnapshot = false;
          } catch (error) {
            initializeStarted = false;
            const syncError =
              error instanceof Error && error.name === 'AbortError'
                ? 'Zeitüberschreitung beim Laden der Bases. Prüfe, ob die Datenbank läuft.'
                : error instanceof Error
                  ? error.message
                  : 'Bases konnten nicht synchronisiert werden.';
            set({
              isSyncing: false,
              isServerHydrated: false,
              syncError,
            });
          }
        },

        syncToServer: async () => {
          if (applyingServerSnapshot) return;
          const currentBases = get().bases.map((base) => normalizeBase(base));

          try {
            set({ isSyncing: true, syncError: null });
            const response = await fetch('/api/bases', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bases: currentBases.map(toServerPayload),
              }),
              signal: basesFetchSignal(),
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(typeof payload?.message === 'string' ? payload.message : 'Bases konnten nicht gespeichert werden.');
            }

            const serverBases = deserializeBases(payload?.bases);
            applyingServerSnapshot = true;
            set({
              bases: serverBases.length > 0 ? serverBases : currentBases,
              isServerHydrated: true,
              isSyncing: false,
              syncError: null,
            });
            applyingServerSnapshot = false;
          } catch (error) {
            set({
              isSyncing: false,
              syncError: error instanceof Error ? error.message : 'Base-Sync fehlgeschlagen.',
            });
          }
        },
      };
    },
    {
      name: 'lifeos-bases-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        bases: state.bases,
      }),
      version: 2,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState as BaseStore;
        const state = persistedState as { bases?: unknown[] };
        if (!state.bases || !Array.isArray(state.bases)) return persistedState as BaseStore;
        return {
          ...persistedState,
          bases: deserializeBases(state.bases),
        };
      },
      merge: (persistedState, currentState) => {
        const merged =
          persistedState && typeof persistedState === 'object'
            ? { ...currentState, ...persistedState }
            : currentState;
        if (Array.isArray(merged.bases)) {
          merged.bases = merged.bases.map((base) => normalizeBase(base));
        }
        return merged;
      },
    }
  )
);

export const useBases = () => useBaseStore((state) => state.bases);
