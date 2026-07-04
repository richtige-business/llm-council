// ============================================
// dashboard-folder-service.ts - Dashboard Explorer Service
//
// Zweck: Verwaltet verschachtelte Dashboard-Ordner und Dateien
//        inklusive Import kompletter Desktop-Ordnerbaeume.
// Verwendet von: /api/dashboard-folders, /api/dashboard-documents
// ============================================

import { prisma } from '@/lib/db';

export type DashboardSurfaceType = 'home' | 'base';

export interface DashboardFolderPayload {
  id?: string;
  surfaceType: DashboardSurfaceType;
  surfaceId: string;
  parentFolderId?: string | null;
  name: string;
  color?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  linkedGroupId?: string | null;
  linkedGroupFolderId?: string | null;
}

export interface DashboardDocumentPayload {
  id?: string;
  surfaceType: DashboardSurfaceType;
  surfaceId: string;
  folderId?: string | null;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  relativePath?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  contentText?: string | null;
  contentBase64?: string | null;
  source?: string;
}

export interface DashboardFolderRecord {
  id: string;
  userId: string;
  surfaceType: DashboardSurfaceType;
  surfaceId: string;
  parentFolderId: string | null;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  linkedGroupId: string | null;
  linkedGroupFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardDocumentRecord {
  id: string;
  userId: string;
  surfaceType: DashboardSurfaceType;
  surfaceId: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  x: number;
  y: number;
  width: number;
  height: number;
  contentText: string | null;
  contentBase64: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportedDashboardDocumentInput {
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  relativePath?: string;
  contentText?: string | null;
  contentBase64?: string | null;
  source?: string;
}

const DEFAULT_FOLDER_COLOR = '#60a5fa';
const ROOT_FOLDER_WIDTH = 96;
const ROOT_FOLDER_HEIGHT = 96;
const ROOT_FILE_WIDTH = 90;
const ROOT_FILE_HEIGHT = 96;

function iso(value: Date | string | null | undefined): string {
  return value instanceof Date ? value.toISOString() : String(value || new Date().toISOString());
}

function normalizeSurfaceType(surfaceType: DashboardSurfaceType): DashboardSurfaceType {
  return surfaceType === 'base' ? 'base' : 'home';
}

function parentPath(relativePath: string): string {
  const cleanPath = relativePath.replace(/^\/+|\/+$/g, '');
  if (!cleanPath.includes('/')) return '';
  return cleanPath.split('/').slice(0, -1).join('/');
}

function gridPosition(originX: number, originY: number, index: number): { x: number; y: number } {
  const column = index % 5;
  const row = Math.floor(index / 5);
  return {
    x: originX + column * 112,
    y: originY + row * 118,
  };
}

function mapFolder(row: {
  id: string;
  userId: string;
  surfaceType: string;
  surfaceId: string;
  parentFolderId: string | null;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  linkedGroupId: string | null;
  linkedGroupFolderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DashboardFolderRecord {
  return {
    id: row.id,
    userId: row.userId,
    surfaceType: normalizeSurfaceType(row.surfaceType as DashboardSurfaceType),
    surfaceId: row.surfaceId,
    parentFolderId: row.parentFolderId,
    name: row.name,
    color: row.color,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    linkedGroupId: row.linkedGroupId,
    linkedGroupFolderId: row.linkedGroupFolderId,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function mapDocument(row: {
  id: string;
  userId: string;
  surfaceType: string;
  surfaceId: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  x: number;
  y: number;
  width: number;
  height: number;
  contentText: string | null;
  contentBase64: string | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}): DashboardDocumentRecord {
  return {
    id: row.id,
    userId: row.userId,
    surfaceType: normalizeSurfaceType(row.surfaceType as DashboardSurfaceType),
    surfaceId: row.surfaceId,
    folderId: row.folderId,
    name: row.name,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    relativePath: row.relativePath,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    contentText: row.contentText,
    contentBase64: row.contentBase64,
    source: row.source,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export async function listDashboardTree(
  userId: string,
  surfaceType: DashboardSurfaceType,
  surfaceId: string
): Promise<{
  folders: DashboardFolderRecord[];
  documents: DashboardDocumentRecord[];
}> {
  const normalizedSurfaceType = normalizeSurfaceType(surfaceType);
  const [folders, documents] = await Promise.all([
    prisma.dashboardFolder.findMany({
      where: { userId, surfaceType: normalizedSurfaceType, surfaceId },
      orderBy: [{ parentFolderId: 'asc' }, { y: 'asc' }, { x: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.dashboardDocument.findMany({
      where: { userId, surfaceType: normalizedSurfaceType, surfaceId },
      orderBy: [{ folderId: 'asc' }, { y: 'asc' }, { x: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  return {
    folders: folders.map(mapFolder),
    documents: documents.map(mapDocument),
  };
}

export async function createDashboardFolder(
  userId: string,
  payload: DashboardFolderPayload
): Promise<DashboardFolderRecord> {
  const row = await prisma.dashboardFolder.create({
    data: {
      userId,
      surfaceType: normalizeSurfaceType(payload.surfaceType),
      surfaceId: payload.surfaceId.trim() || 'main',
      parentFolderId: payload.parentFolderId || null,
      name: payload.name.trim() || 'Neuer Ordner',
      color: payload.color || DEFAULT_FOLDER_COLOR,
      x: Number.isFinite(payload.x) ? payload.x : 48,
      y: Number.isFinite(payload.y) ? payload.y : 48,
      width: Number.isFinite(payload.width) ? payload.width : ROOT_FOLDER_WIDTH,
      height: Number.isFinite(payload.height) ? payload.height : ROOT_FOLDER_HEIGHT,
      linkedGroupId: payload.linkedGroupId || null,
      linkedGroupFolderId: payload.linkedGroupFolderId || null,
    },
  });

  return mapFolder(row);
}

export async function updateDashboardFolder(
  userId: string,
  folderId: string,
  updates: Partial<DashboardFolderPayload>
): Promise<DashboardFolderRecord> {
  const row = await prisma.dashboardFolder.update({
    where: { id: folderId },
    data: {
      userId,
      ...(updates.name !== undefined ? { name: updates.name.trim() || 'Neuer Ordner' } : {}),
      ...(updates.color !== undefined ? { color: updates.color || DEFAULT_FOLDER_COLOR } : {}),
      ...(updates.x !== undefined ? { x: updates.x } : {}),
      ...(updates.y !== undefined ? { y: updates.y } : {}),
      ...(updates.width !== undefined ? { width: updates.width } : {}),
      ...(updates.height !== undefined ? { height: updates.height } : {}),
      ...(updates.parentFolderId !== undefined ? { parentFolderId: updates.parentFolderId } : {}),
      ...(updates.linkedGroupId !== undefined ? { linkedGroupId: updates.linkedGroupId } : {}),
      ...(updates.linkedGroupFolderId !== undefined
        ? { linkedGroupFolderId: updates.linkedGroupFolderId }
        : {}),
    },
  });

  return mapFolder(row);
}

export async function deleteDashboardFolder(userId: string, folderId: string): Promise<void> {
  await prisma.dashboardFolder.deleteMany({
    where: {
      id: folderId,
      userId,
    },
  });
}

export async function createDashboardDocument(
  userId: string,
  payload: DashboardDocumentPayload
): Promise<DashboardDocumentRecord> {
  const row = await prisma.dashboardDocument.create({
    data: {
      userId,
      surfaceType: normalizeSurfaceType(payload.surfaceType),
      surfaceId: payload.surfaceId.trim() || 'main',
      folderId: payload.folderId || null,
      name: payload.name.trim() || 'Datei',
      mimeType: payload.mimeType || 'application/octet-stream',
      sizeBytes: payload.sizeBytes || 0,
      relativePath: payload.relativePath || payload.name || 'Datei',
      x: Number.isFinite(payload.x) ? payload.x : 48,
      y: Number.isFinite(payload.y) ? payload.y : 48,
      width: Number.isFinite(payload.width) ? payload.width : ROOT_FILE_WIDTH,
      height: Number.isFinite(payload.height) ? payload.height : ROOT_FILE_HEIGHT,
      contentText: payload.contentText || null,
      contentBase64: payload.contentBase64 || null,
      source: payload.source || 'llm-council',
    },
  });

  return mapDocument(row);
}

export async function updateDashboardDocument(
  userId: string,
  documentId: string,
  updates: Partial<DashboardDocumentPayload>
): Promise<DashboardDocumentRecord> {
  const row = await prisma.dashboardDocument.update({
    where: { id: documentId },
    data: {
      userId,
      ...(updates.folderId !== undefined ? { folderId: updates.folderId } : {}),
      ...(updates.name !== undefined ? { name: updates.name.trim() || 'Datei' } : {}),
      ...(updates.mimeType !== undefined ? { mimeType: updates.mimeType || 'application/octet-stream' } : {}),
      ...(updates.sizeBytes !== undefined ? { sizeBytes: updates.sizeBytes || 0 } : {}),
      ...(updates.relativePath !== undefined ? { relativePath: updates.relativePath || '' } : {}),
      ...(updates.x !== undefined ? { x: updates.x } : {}),
      ...(updates.y !== undefined ? { y: updates.y } : {}),
      ...(updates.width !== undefined ? { width: updates.width } : {}),
      ...(updates.height !== undefined ? { height: updates.height } : {}),
      ...(updates.contentText !== undefined ? { contentText: updates.contentText } : {}),
      ...(updates.contentBase64 !== undefined ? { contentBase64: updates.contentBase64 } : {}),
      ...(updates.source !== undefined ? { source: updates.source || 'llm-council' } : {}),
    },
  });

  return mapDocument(row);
}

export async function deleteDashboardDocument(userId: string, documentId: string): Promise<void> {
  await prisma.dashboardDocument.deleteMany({
    where: {
      id: documentId,
      userId,
    },
  });
}

// Einzelnes Dokument per ID laden (fuer Datei-Vorschau in Tabs)
export async function getDashboardDocument(
  userId: string,
  documentId: string
): Promise<DashboardDocumentRecord | null> {
  return prisma.dashboardDocument.findFirst({
    where: { id: documentId, userId },
  }) as Promise<DashboardDocumentRecord | null>;
}

export async function importDashboardEntries(
  userId: string,
  input: {
    surfaceType: DashboardSurfaceType;
    surfaceId: string;
    parentFolderId?: string | null;
    x?: number;
    y?: number;
    files: ImportedDashboardDocumentInput[];
  }
): Promise<{
  foldersCreated: number;
  documentsCreated: number;
}> {
  const normalizedSurfaceType = normalizeSurfaceType(input.surfaceType);
  const surfaceId = input.surfaceId.trim() || 'main';
  const baseX = Number.isFinite(input.x) ? Number(input.x) : 48;
  const baseY = Number.isFinite(input.y) ? Number(input.y) : 48;
  const parentFolderId = input.parentFolderId || null;

  const normalizedFiles = input.files
    .map((file) => ({
      ...file,
      name: (file.name || 'Datei').trim() || 'Datei',
      relativePath: (file.relativePath || file.name || 'Datei').replace(/^\/+|\/+$/g, ''),
    }))
    .filter((file) => Boolean(file.relativePath));

  const folderMap = new Map<string, string>();
  const topLevelOrder: string[] = [];
  normalizedFiles.forEach((file) => {
    const topLevelKey = file.relativePath.split('/')[0] || file.name;
    if (!topLevelOrder.includes(topLevelKey)) {
      topLevelOrder.push(topLevelKey);
    }
  });

  const folderPaths = Array.from(
    new Set(
      normalizedFiles
        .map((file) => parentPath(file.relativePath))
        .filter(Boolean)
        .flatMap((folderPath) => {
          const parts = folderPath.split('/');
          return parts.map((_, index) => parts.slice(0, index + 1).join('/'));
        })
    )
  ).sort((left, right) => left.split('/').length - right.split('/').length);

  let foldersCreated = 0;
  for (const folderPath of folderPaths) {
    const folderName = folderPath.split('/').pop() || 'Ordner';
    const directParentPath = parentPath(folderPath);
    const topLevelKey = folderPath.split('/')[0];
    const topLevelIndex = topLevelOrder.indexOf(topLevelKey);
    const rootPosition = gridPosition(baseX, baseY, Math.max(0, topLevelIndex));

    const createdFolder = await prisma.dashboardFolder.create({
      data: {
        userId,
        surfaceType: normalizedSurfaceType,
        surfaceId,
        parentFolderId: directParentPath ? folderMap.get(directParentPath) || null : parentFolderId,
        name: folderName,
        color: DEFAULT_FOLDER_COLOR,
        x: directParentPath ? 0 : rootPosition.x,
        y: directParentPath ? 0 : rootPosition.y,
        width: ROOT_FOLDER_WIDTH,
        height: ROOT_FOLDER_HEIGHT,
      },
    });

    folderMap.set(folderPath, createdFolder.id);
    foldersCreated += 1;
  }

  let documentsCreated = 0;
  for (const file of normalizedFiles) {
    const directParentPath = parentPath(file.relativePath);
    const topLevelKey = file.relativePath.split('/')[0] || file.name;
    const topLevelIndex = topLevelOrder.indexOf(topLevelKey);
    const rootPosition = gridPosition(baseX, baseY, Math.max(0, topLevelIndex));
    const folderId = directParentPath ? folderMap.get(directParentPath) || null : parentFolderId;

    await prisma.dashboardDocument.create({
      data: {
        userId,
        surfaceType: normalizedSurfaceType,
        surfaceId,
        folderId,
        name: file.name,
        mimeType: file.mimeType || 'application/octet-stream',
        sizeBytes: file.sizeBytes || 0,
        relativePath: file.relativePath,
        x: folderId ? 0 : rootPosition.x,
        y: folderId ? 0 : rootPosition.y,
        width: ROOT_FILE_WIDTH,
        height: ROOT_FILE_HEIGHT,
        contentText: file.contentText || null,
        contentBase64: file.contentBase64 || null,
        source: file.source || 'desktop-import',
      },
    });
    documentsCreated += 1;
  }

  return {
    foldersCreated,
    documentsCreated,
  };
}
