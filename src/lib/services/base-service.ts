// ============================================
// base-service.ts - Persistente Base-Verwaltung
//
// Zweck: Validierung, Sync und Kontextaufbereitung fuer Bases
// ============================================

import { prisma } from '@/lib/db';
import { MODULE_TABLE_GROUPS } from '@/lib/database/module-table-groups';

export interface BaseConnectionPayload {
  id?: string;
  sourceModuleId: string;
  targetModuleId: string;
  connectionType: string;
  description?: string;
  rule?: Record<string, unknown> | null;
  isActive?: boolean;
}

export interface BasePayload {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  moduleIds?: string[];
  automationIds?: string[];
  backgroundImage?: string;
  dashboard?: Record<string, unknown>;
  accessMembers?: Array<Record<string, unknown>>;
  connections?: BaseConnectionPayload[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BaseDbRecord {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  moduleIds: string[];
  automationIds: string[];
  backgroundImage: string;
  dashboard: Record<string, unknown>;
  accessMembers: Array<Record<string, unknown>>;
  connections: Array<{
    id: string;
    sourceModuleId: string;
    targetModuleId: string;
    connectionType: string;
    description: string;
    rule: Record<string, unknown>;
    isActive: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface BaseContextOptions {
  tableLimitPerModule?: number;
  rowSampleLimit?: number;
}

type JsonRecord = Record<string, unknown>;
type DynamicTableModel = {
  count: () => Promise<number>;
  findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
};

interface WorkspaceBaseTxClient {
  workspaceBaseConnection: {
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
    createMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
  workspaceBaseModule: {
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
    createMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
  workspaceBase: {
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
    create: (args: Record<string, unknown>) => Promise<unknown>;
  };
}

const DEFAULT_BASE_ICON = 'Folder';
const DEFAULT_BASE_COLOR = '#8b5cf6';
const MAX_STRING_SAMPLE = 240;
const SENSITIVE_KEY_REGEX = /(password|token|secret|api[-_]?key|credential|auth|refresh)/i;

function safeJsonObject(value: unknown, fallback: JsonRecord = {}): JsonRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  return fallback;
}

function safeJsonArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry && typeof entry === 'object') as Array<Record<string, unknown>>;
}

function normalizeModuleName(moduleId: string): string {
  const base = moduleId.replace(/[-_]/g, ' ').trim();
  if (!base) return moduleId;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function uniqueArray(values: string[] | undefined): string[] {
  if (!values || values.length === 0) return [];
  return Array.from(new Set(values.map((entry) => entry.trim()).filter(Boolean)));
}

export function isDescriptionValid(description: string | null | undefined): boolean {
  return Boolean(description && description.trim().length > 0);
}

export function generateBaseDescriptionFallback(baseName: string, moduleIds: string[] = []): string {
  const cleanName = baseName.trim() || 'Unbenannt';
  const topModules = uniqueArray(moduleIds).slice(0, 3).map(normalizeModuleName);
  if (topModules.length === 0) {
    return `${cleanName}-Base fuer strukturierte Workflows und interne Automationen.`;
  }
  return `${cleanName}-Base fuer ${topModules.join(', ')}. Fokus auf koordinierte Workflows und interne Automationen.`;
}

export function normalizeBasePayload(base: BasePayload, withFallbackDescription: boolean): BasePayload {
  const name = (base.name || '').trim();
  const moduleIds = uniqueArray(base.moduleIds || []);
  const hasDescription = isDescriptionValid(base.description);
  const description = hasDescription
    ? base.description.trim()
    : withFallbackDescription
    ? generateBaseDescriptionFallback(name || 'Unbenannt', moduleIds)
    : '';

  return {
    ...base,
    name,
    description,
    moduleIds,
    automationIds: uniqueArray(base.automationIds || []),
    icon: base.icon || DEFAULT_BASE_ICON,
    color: base.color || DEFAULT_BASE_COLOR,
    backgroundImage: base.backgroundImage || '',
    dashboard: safeJsonObject(base.dashboard, {}),
    accessMembers: safeJsonArray(base.accessMembers),
    connections: Array.isArray(base.connections) ? base.connections : [],
  };
}

function sanitizeConnections(connections: BaseConnectionPayload[] | undefined): BaseConnectionPayload[] {
  if (!connections || connections.length === 0) return [];
  return connections
    .map((connection) => ({
      id: connection.id,
      sourceModuleId: connection.sourceModuleId?.trim(),
      targetModuleId: connection.targetModuleId?.trim(),
      connectionType: connection.connectionType?.trim() || 'link',
      description: connection.description?.trim() || '',
      rule: safeJsonObject(connection.rule || {}, {}),
      isActive: connection.isActive ?? true,
    }))
    .filter((connection) => Boolean(connection.sourceModuleId) && Boolean(connection.targetModuleId));
}

export async function listWorkspaceBases(userId: string): Promise<BaseDbRecord[]> {
  const db = prisma as unknown as {
    workspaceBase: {
      findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
    };
  };

  const rows = await db.workspaceBase.findMany({
    where: { userId },
    include: {
      modules: true,
      connections: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((row) => {
    const modules = Array.isArray(row.modules) ? row.modules : [];
    const connections = Array.isArray(row.connections) ? row.connections : [];
    return {
      id: String(row.id),
      name: String(row.name || ''),
      description: String(row.description || ''),
      icon: String(row.icon || DEFAULT_BASE_ICON),
      color: String(row.color || DEFAULT_BASE_COLOR),
      moduleIds: modules
        .map((moduleRow) => (moduleRow && typeof moduleRow === 'object' ? String((moduleRow as JsonRecord).moduleId || '') : ''))
        .filter(Boolean),
      automationIds: Array.isArray(row.automationIds) ? row.automationIds.map((entry) => String(entry)).filter(Boolean) : [],
      backgroundImage: String(row.backgroundImage || ''),
      dashboard: safeJsonObject(row.dashboard, {}),
      accessMembers: safeJsonArray(row.accessMembers),
      connections: connections.map((connectionRow) => {
        const c = safeJsonObject(connectionRow, {});
        return {
          id: String(c.id || ''),
          sourceModuleId: String(c.sourceModuleId || ''),
          targetModuleId: String(c.targetModuleId || ''),
          connectionType: String(c.connectionType || 'link'),
          description: String(c.description || ''),
          rule: safeJsonObject(c.rule, {}),
          isActive: Boolean(c.isActive ?? true),
        };
      }),
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt || new Date().toISOString()),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt || new Date().toISOString()),
    };
  });
}

export async function replaceWorkspaceBases(userId: string, incomingBases: BasePayload[], withFallbackDescription = false) {
  const normalized = incomingBases.map((base) => normalizeBasePayload(base, withFallbackDescription));
  const invalid = normalized.find((base) => !isDescriptionValid(base.description));
  if (invalid) {
    throw new Error(`Base "${invalid.name || invalid.id}" hat keine gueltige Beschreibung.`);
  }

  const db = prisma as unknown as {
    $transaction: <T>(fn: (tx: WorkspaceBaseTxClient) => Promise<T>) => Promise<T>;
  };

  await db.$transaction(async (tx) => {
    await tx.workspaceBaseConnection.deleteMany({
      where: { base: { userId } },
    });
    await tx.workspaceBaseModule.deleteMany({
      where: { base: { userId } },
    });
    await tx.workspaceBase.deleteMany({
      where: { userId },
    });

    for (const base of normalized) {
      const baseId = base.id?.trim();
      if (!baseId) continue;

      const now = new Date();
      const moduleRows = uniqueArray(base.moduleIds).map((moduleId) => ({
        id: crypto.randomUUID(),
        baseId,
        moduleId,
      }));
      const connectionRows = sanitizeConnections(base.connections).map((connection) => ({
        id: connection.id || crypto.randomUUID(),
        baseId,
        sourceModuleId: connection.sourceModuleId,
        targetModuleId: connection.targetModuleId,
        connectionType: connection.connectionType,
        description: connection.description || '',
        rule: safeJsonObject(connection.rule || {}, {}),
        isActive: connection.isActive ?? true,
      }));

      await tx.workspaceBase.create({
        data: {
          id: baseId,
          userId,
          name: base.name,
          description: base.description,
          icon: base.icon || DEFAULT_BASE_ICON,
          color: base.color || DEFAULT_BASE_COLOR,
          dashboard: safeJsonObject(base.dashboard, {}),
          automationIds: uniqueArray(base.automationIds),
          backgroundImage: base.backgroundImage || '',
          accessMembers: safeJsonArray(base.accessMembers),
          createdAt: base.createdAt ? new Date(base.createdAt) : now,
          updatedAt: base.updatedAt ? new Date(base.updatedAt) : now,
        },
      });

      if (moduleRows.length > 0) {
        await tx.workspaceBaseModule.createMany({
          data: moduleRows,
          skipDuplicates: true,
        });
      }
      if (connectionRows.length > 0) {
        await tx.workspaceBaseConnection.createMany({
          data: connectionRows,
          skipDuplicates: true,
        });
      }
    }
  });
}

export async function importWorkspaceBasesIfEmpty(userId: string, incomingBases: BasePayload[]) {
  const db = prisma as unknown as {
    workspaceBase: {
      count: (args: Record<string, unknown>) => Promise<number>;
    };
  };

  const existingCount = await db.workspaceBase.count({ where: { userId } });
  if (existingCount > 0) {
    return { imported: 0, skipped: true };
  }

  await replaceWorkspaceBases(userId, incomingBases, true);
  return { imported: incomingBases.length, skipped: false };
}

function sanitizeSampleValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_REGEX.test(key)) return '[redacted]';
  if (typeof value === 'string') {
    return value.length > MAX_STRING_SAMPLE ? `${value.slice(0, MAX_STRING_SAMPLE)}...` : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 5).map((entry) => sanitizeSampleValue(key, entry));
  }
  if (value && typeof value === 'object') {
    const objectValue: JsonRecord = {};
    for (const [childKey, childValue] of Object.entries(value as JsonRecord)) {
      objectValue[childKey] = sanitizeSampleValue(childKey, childValue);
    }
    return objectValue;
  }
  return value;
}

async function loadTableSnapshot(tableKey: string, rowSampleLimit: number) {
  const model = (prisma as unknown as Record<string, unknown>)[tableKey] as DynamicTableModel | undefined;
  if (!model) return null;

  try {
    const rowCount = await model.count();
    let rows: Array<Record<string, unknown>> = [];

    if (rowCount > 0) {
      rows = await model.findMany({
        take: rowSampleLimit,
        orderBy: { createdAt: 'desc' },
      }).catch(() => model.findMany({ take: rowSampleLimit }));
    }

    const sanitizedRows = rows.map((row) => {
      const safeRow: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        safeRow[key] = sanitizeSampleValue(key, value);
      }
      return safeRow;
    });

    return {
      rowCount,
      columns: sanitizedRows[0] ? Object.keys(sanitizedRows[0]) : [],
      samples: sanitizedRows,
    };
  } catch {
    return null;
  }
}

export async function buildBaseContextForAgent(
  userId: string,
  baseId: string,
  options: BaseContextOptions = {}
) {
  const rowSampleLimit = Math.max(1, Math.min(options.rowSampleLimit ?? 3, 5));
  const tableLimitPerModule = Math.max(1, Math.min(options.tableLimitPerModule ?? 8, 12));
  const bases = await listWorkspaceBases(userId);
  const base = bases.find((entry) => entry.id === baseId);
  if (!base) return null;

  const moduleSnapshots = [];
  for (const moduleId of base.moduleIds) {
    const group = MODULE_TABLE_GROUPS.find((candidate) => candidate.moduleId === moduleId);
    if (!group) continue;

    const tables = [];
    for (const table of group.tables.slice(0, tableLimitPerModule)) {
      const snapshot = await loadTableSnapshot(table.key, rowSampleLimit);
      if (!snapshot) continue;
      tables.push({
        key: table.key,
        displayName: table.displayName,
        rowCount: snapshot.rowCount,
        columns: snapshot.columns,
        samples: snapshot.samples,
      });
    }

    moduleSnapshots.push({
      moduleId,
      moduleLabel: group.label,
      tables,
    });
  }

  return {
    base,
    moduleSnapshots,
  };
}

export function buildBasePromptBlock(input: Awaited<ReturnType<typeof buildBaseContextForAgent>>): string {
  if (!input) return '';

  const { base, moduleSnapshots } = input;
  const lines: string[] = [];
  lines.push('# Base Context');
  lines.push(`Aktive Base: ${base.name} (${base.id})`);
  lines.push(`Beschreibung: ${base.description}`);
  lines.push(`Zugeordnete Module: ${base.moduleIds.join(', ') || '-'}`);

  if (base.connections.length > 0) {
    lines.push('Interne Verbindungen:');
    for (const connection of base.connections.slice(0, 12)) {
      lines.push(
        `- ${connection.sourceModuleId} -> ${connection.targetModuleId} [${connection.connectionType}]${connection.description ? `: ${connection.description}` : ''}`
      );
    }
  }

  if (moduleSnapshots.length > 0) {
    lines.push('Base-Datenbank Snapshot (Schema + Counts + Samples):');
    for (const moduleEntry of moduleSnapshots) {
      lines.push(`## Modul ${moduleEntry.moduleId} (${moduleEntry.moduleLabel})`);
      for (const table of moduleEntry.tables) {
        lines.push(`- Tabelle ${table.displayName} (${table.key}): ${table.rowCount} Zeilen`);
        if (table.columns.length > 0) {
          lines.push(`  Spalten: ${table.columns.join(', ')}`);
        }
        if (table.samples.length > 0) {
          lines.push(`  Samples: ${JSON.stringify(table.samples).slice(0, 1200)}`);
        }
      }
    }
  }

  lines.push('Nutze diesen Kontext fuer base-spezifische Architektur, Verknuepfungen und interne Automationen.');
  return lines.join('\n');
}
