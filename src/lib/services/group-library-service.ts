// ============================================
// group-library-service.ts - Serverseitige Gruppen-Datenbank
//
// Zweck: Verwaltet Gruppen-Metadaten, echte Ordnerstrukturen
//        und Dokumente fuer Agent-Gruppen
// Verwendet von: Group-APIs, Group Settings, Dashboard-Links
// ============================================

import { prisma } from '@/lib/db';

export interface GroupLibraryRecord {
  id: string;
  userId: string;
  groupAgentId: string;
  name: string;
  description: string;
  objective: string;
  linkedDashboardFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupFolderRecord {
  id: string;
  userId: string;
  groupLibraryId: string;
  parentFolderId: string | null;
  name: string;
  color: string;
  relativePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupDocumentRecord {
  id: string;
  userId: string;
  groupLibraryId: string;
  folderId: string | null;
  name: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  contentText: string | null;
  contentBase64: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportedDocumentInput {
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  relativePath?: string;
  contentText?: string | null;
  contentBase64?: string | null;
  source?: string;
}

type GroupLibraryDbClient = {
  groupLibrary: {
    findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
    upsert: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  groupFolder: {
    findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
    create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
  groupDocument: {
    findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
    create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    deleteMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value || new Date().toISOString());
}

function mapLibrary(row: Record<string, unknown>): GroupLibraryRecord {
  return {
    id: String(row.id || ''),
    userId: String(row.userId || ''),
    groupAgentId: String(row.groupAgentId || ''),
    name: String(row.name || ''),
    description: String(row.description || ''),
    objective: String(row.objective || ''),
    linkedDashboardFolderId: row.linkedDashboardFolderId ? String(row.linkedDashboardFolderId) : null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function mapFolder(row: Record<string, unknown>): GroupFolderRecord {
  return {
    id: String(row.id || ''),
    userId: String(row.userId || ''),
    groupLibraryId: String(row.groupLibraryId || ''),
    parentFolderId: row.parentFolderId ? String(row.parentFolderId) : null,
    name: String(row.name || ''),
    color: String(row.color || '#14B8A6'),
    relativePath: String(row.relativePath || ''),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function mapDocument(row: Record<string, unknown>): GroupDocumentRecord {
  return {
    id: String(row.id || ''),
    userId: String(row.userId || ''),
    groupLibraryId: String(row.groupLibraryId || ''),
    folderId: row.folderId ? String(row.folderId) : null,
    name: String(row.name || ''),
    mimeType: String(row.mimeType || 'text/plain'),
    sizeBytes: Number(row.sizeBytes || 0),
    relativePath: String(row.relativePath || ''),
    contentText: row.contentText ? String(row.contentText) : null,
    contentBase64: row.contentBase64 ? String(row.contentBase64) : null,
    source: String(row.source || 'lifeos'),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export async function ensureGroupLibrary(
  userId: string,
  input: {
    groupAgentId: string;
    name: string;
    description?: string;
    objective?: string;
  }
): Promise<GroupLibraryRecord> {
  const db = prisma as unknown as GroupLibraryDbClient;
  const row = await db.groupLibrary.upsert({
    where: { groupAgentId: input.groupAgentId },
    update: {
      name: input.name.trim(),
      description: input.description?.trim() || '',
      objective: input.objective?.trim() || '',
      userId,
    },
    create: {
      userId,
      groupAgentId: input.groupAgentId,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      objective: input.objective?.trim() || '',
    },
  });

  return mapLibrary(row);
}

export async function updateGroupLibraryMeta(
  userId: string,
  groupAgentId: string,
  updates: {
    name?: string;
    description?: string;
    objective?: string;
    linkedDashboardFolderId?: string | null;
  }
): Promise<GroupLibraryRecord> {
  const db = prisma as unknown as GroupLibraryDbClient;
  const row = await db.groupLibrary.update({
    where: { groupAgentId },
    data: {
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
      ...(updates.objective !== undefined ? { objective: updates.objective.trim() } : {}),
      ...(updates.linkedDashboardFolderId !== undefined
        ? { linkedDashboardFolderId: updates.linkedDashboardFolderId }
        : {}),
      userId,
    },
  });

  return mapLibrary(row);
}

export async function getGroupLibraryTree(
  userId: string,
  groupAgentId: string
): Promise<{
  library: GroupLibraryRecord | null;
  folders: GroupFolderRecord[];
  documents: GroupDocumentRecord[];
}> {
  const db = prisma as unknown as GroupLibraryDbClient;
  const row = await db.groupLibrary.findUnique({
    where: { groupAgentId },
  });

  if (!row) {
    return { library: null, folders: [], documents: [] };
  }

  const library = mapLibrary(row);
  const [folders, documents] = await Promise.all([
    db.groupFolder.findMany({
      where: { userId, groupLibraryId: library.id },
      orderBy: [{ relativePath: 'asc' }, { createdAt: 'asc' }],
    }),
    db.groupDocument.findMany({
      where: { userId, groupLibraryId: library.id },
      orderBy: [{ relativePath: 'asc' }, { createdAt: 'asc' }],
    }),
  ]);

  return {
    library,
    folders: folders.map(mapFolder),
    documents: documents.map(mapDocument),
  };
}

export async function createGroupFolder(
  userId: string,
  groupLibraryId: string,
  input: {
    name: string;
    color?: string;
    parentFolderId?: string | null;
    relativePath?: string;
  }
): Promise<GroupFolderRecord> {
  const db = prisma as unknown as GroupLibraryDbClient;
  const row = await db.groupFolder.create({
    data: {
      userId,
      groupLibraryId,
      parentFolderId: input.parentFolderId || null,
      name: input.name.trim() || 'Neuer Ordner',
      color: input.color || '#14B8A6',
      relativePath: input.relativePath || '',
    },
  });
  return mapFolder(row);
}

export async function createGroupDocument(
  userId: string,
  groupLibraryId: string,
  input: ImportedDocumentInput & { folderId?: string | null }
): Promise<GroupDocumentRecord> {
  const db = prisma as unknown as GroupLibraryDbClient;
  const row = await db.groupDocument.create({
    data: {
      userId,
      groupLibraryId,
      folderId: input.folderId || null,
      name: input.name.trim() || 'Dokument',
      mimeType: input.mimeType || 'text/plain',
      sizeBytes: input.sizeBytes || 0,
      relativePath: input.relativePath || input.name || '',
      contentText: input.contentText || null,
      contentBase64: input.contentBase64 || null,
      source: input.source || 'lifeos',
    },
  });
  return mapDocument(row);
}

function parentPath(relativePath: string): string {
  const clean = relativePath.replace(/^\/+|\/+$/g, '');
  if (!clean.includes('/')) return '';
  return clean.split('/').slice(0, -1).join('/');
}

export async function importGroupFolderTree(
  userId: string,
  groupAgentId: string,
  libraryName: string,
  files: ImportedDocumentInput[]
): Promise<{
  library: GroupLibraryRecord;
  foldersCreated: number;
  documentsCreated: number;
}> {
  const library = await ensureGroupLibrary(userId, {
    groupAgentId,
    name: libraryName,
  });

  const db = prisma as unknown as GroupLibraryDbClient;
  const folderMap = new Map<string, string>();

  const normalizedFiles = files.map((file) => ({
    ...file,
    relativePath: (file.relativePath || file.name || '').replace(/^\/+|\/+$/g, ''),
  }));

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

  for (const folderPath of folderPaths) {
    const folderName = folderPath.split('/').pop() || 'Ordner';
    const parentFolderPath = parentPath(folderPath);
    const created = await db.groupFolder.create({
      data: {
        userId,
        groupLibraryId: library.id,
        parentFolderId: parentFolderPath ? folderMap.get(parentFolderPath) || null : null,
        name: folderName,
        color: '#14B8A6',
        relativePath: folderPath,
      },
    });
    folderMap.set(folderPath, String(created.id));
  }

  for (const file of normalizedFiles) {
    const folderPath = parentPath(file.relativePath);
    await createGroupDocument(userId, library.id, {
      ...file,
      folderId: folderPath ? folderMap.get(folderPath) || null : null,
    });
  }

  return {
    library,
    foldersCreated: folderPaths.length,
    documentsCreated: normalizedFiles.length,
  };
}
