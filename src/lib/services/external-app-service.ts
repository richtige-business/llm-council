// ============================================
// external-app-service.ts - Persistenz externer Apps
//
// Zweck: CRUD-Operationen fuer ExternalAppInstallation
// Verwendet von: /api/external-apps, ModuleProvider Hydration
// ============================================

import { prisma } from '@/lib/db';

export interface ExternalAppInstallationPayload {
  moduleId: string;
  catalogId?: string | null;
  name: string;
  icon?: string;
  color?: string;
  url: string;
  userUrl?: string | null;
}

export interface ExternalAppInstallationRecord {
  id: string;
  userId: string;
  moduleId: string;
  catalogId: string | null;
  name: string;
  icon: string;
  color: string;
  url: string;
  userUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExternalAppInstallationRow {
  id: string;
  userId: string;
  moduleId: string;
  catalogId: string | null;
  name: string;
  icon: string;
  color: string;
  url: string;
  userUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ExternalAppPrismaClient {
  externalAppInstallation: {
    findMany: (args: Record<string, unknown>) => Promise<ExternalAppInstallationRow[]>;
    findUnique: (args: Record<string, unknown>) => Promise<ExternalAppInstallationRow | null>;
    upsert: (args: Record<string, unknown>) => Promise<ExternalAppInstallationRow>;
    update: (args: Record<string, unknown>) => Promise<ExternalAppInstallationRow>;
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
}

function toRecord(row: ExternalAppInstallationRow): ExternalAppInstallationRecord {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listExternalApps(
  userId: string
): Promise<ExternalAppInstallationRecord[]> {
  const db = prisma as unknown as ExternalAppPrismaClient;
  const rows = await db.externalAppInstallation.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((row) => toRecord(row));
}

export async function getExternalApp(
  userId: string,
  moduleId: string
): Promise<ExternalAppInstallationRecord | null> {
  const db = prisma as unknown as ExternalAppPrismaClient;
  const row = await db.externalAppInstallation.findUnique({
    where: { userId_moduleId: { userId, moduleId } },
  });
  return row ? toRecord(row) : null;
}

export async function upsertExternalApp(
  userId: string,
  payload: ExternalAppInstallationPayload
): Promise<ExternalAppInstallationRecord> {
  const db = prisma as unknown as ExternalAppPrismaClient;
  const row = await db.externalAppInstallation.upsert({
    where: { userId_moduleId: { userId, moduleId: payload.moduleId } },
    update: {
      catalogId: payload.catalogId || null,
      name: payload.name,
      icon: payload.icon || 'Globe',
      color: payload.color || '#6366f1',
      url: payload.url,
      userUrl: payload.userUrl || null,
    },
    create: {
      userId,
      moduleId: payload.moduleId,
      catalogId: payload.catalogId || null,
      name: payload.name,
      icon: payload.icon || 'Globe',
      color: payload.color || '#6366f1',
      url: payload.url,
      userUrl: payload.userUrl || null,
    },
  });
  return toRecord(row);
}

export async function updateExternalApp(
  userId: string,
  moduleId: string,
  updates: Partial<Omit<ExternalAppInstallationPayload, 'moduleId'>>
): Promise<ExternalAppInstallationRecord> {
  const db = prisma as unknown as ExternalAppPrismaClient;
  const row = await db.externalAppInstallation.update({
    where: { userId_moduleId: { userId, moduleId } },
    data: {
      ...(updates.catalogId !== undefined ? { catalogId: updates.catalogId } : {}),
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.icon !== undefined ? { icon: updates.icon } : {}),
      ...(updates.color !== undefined ? { color: updates.color } : {}),
      ...(updates.url !== undefined ? { url: updates.url } : {}),
      ...(updates.userUrl !== undefined ? { userUrl: updates.userUrl } : {}),
    },
  });
  return toRecord(row);
}

export async function deleteExternalApp(userId: string, moduleId: string): Promise<void> {
  const db = prisma as unknown as ExternalAppPrismaClient;
  await db.externalAppInstallation.deleteMany({
    where: { userId, moduleId },
  });
}
