// ============================================
// useDashboardFolders.ts - Client-Hook fuer Dashboard Explorer
//
// Zweck: Laedt und verwaltet verschachtelte Dashboard-Ordner
//        sowie Dateien fuer Home-Dashboard und Bases.
// Verwendet von: DashboardFolderLayer
// ============================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DesktopImportFile } from './dashboard-import';

export type DashboardSurfaceType = 'home' | 'base';

export interface DashboardFolder {
  id: string;
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
}

export interface DashboardDocument {
  id: string;
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
}

export function useDashboardFolders(surfaceType: DashboardSurfaceType, surfaceId: string) {
  const [folders, setFolders] = useState<DashboardFolder[]>([]);
  const [documents, setDocuments] = useState<DashboardDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () =>
      `/api/dashboard-folders?surfaceType=${encodeURIComponent(surfaceType)}&surfaceId=${encodeURIComponent(
        surfaceId
      )}`,
    [surfaceId, surfaceType]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(query, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Dashboard-Inhalte konnten nicht geladen werden.');
      }
      setFolders(data.folders || []);
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dashboard-Inhalte konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createFolder = useCallback(
    async (
      payload: Partial<DashboardFolder> & {
        name: string;
        x?: number;
        y?: number;
        parentFolderId?: string | null;
      }
    ) => {
      const response = await fetch('/api/dashboard-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surfaceType,
          surfaceId,
          parentFolderId: payload.parentFolderId,
          name: payload.name,
          color: payload.color,
          x: payload.x,
          y: payload.y,
          width: payload.width,
          height: payload.height,
          linkedGroupId: payload.linkedGroupId,
          linkedGroupFolderId: payload.linkedGroupFolderId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Ordner konnte nicht erstellt werden.');
      }
      setFolders((prev) => [...prev, data.folder]);
      return data.folder as DashboardFolder;
    },
    [surfaceId, surfaceType]
  );

  const updateFolder = useCallback(async (folderId: string, updates: Partial<DashboardFolder>) => {
    // Optimistisch: lokalen State sofort aktualisieren (kein visuelles Zurueckspringen)
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, ...updates } : f)));

    const response = await fetch('/api/dashboard-folders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: folderId, ...updates }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      await refresh();
      throw new Error(data.message || 'Ordner konnte nicht aktualisiert werden.');
    }
    setFolders((prev) => prev.map((f) => (f.id === folderId ? data.folder : f)));
    return data.folder as DashboardFolder;
  }, [refresh]);

  const deleteFolder = useCallback(async (folderId: string) => {
    const response = await fetch('/api/dashboard-folders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: folderId }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ordner konnte nicht geloescht werden.');
    }
    await refresh();
  }, [refresh]);

  const updateDocument = useCallback(async (documentId: string, updates: Partial<DashboardDocument>) => {
    // Optimistisch: lokalen State sofort aktualisieren
    setDocuments((prev) => prev.map((d) => (d.id === documentId ? { ...d, ...updates } : d)));

    const response = await fetch('/api/dashboard-documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: documentId, ...updates }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      await refresh();
      throw new Error(data.message || 'Datei konnte nicht aktualisiert werden.');
    }
    setDocuments((prev) => prev.map((d) => (d.id === documentId ? data.document : d)));
    return data.document as DashboardDocument;
  }, [refresh]);

  const deleteDocument = useCallback(async (documentId: string) => {
    const response = await fetch('/api/dashboard-documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: documentId }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Datei konnte nicht geloescht werden.');
    }
    setDocuments((prev) => prev.filter((document) => document.id !== documentId));
  }, []);

  const importEntries = useCallback(
    async (payload: {
      files: DesktopImportFile[];
      x?: number;
      y?: number;
      parentFolderId?: string | null;
    }) => {
      const response = await fetch('/api/dashboard-folders/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surfaceType,
          surfaceId,
          parentFolderId: payload.parentFolderId,
          x: payload.x,
          y: payload.y,
          files: payload.files,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Import konnte nicht abgeschlossen werden.');
      }
      await refresh();
      return data;
    },
    [refresh, surfaceId, surfaceType]
  );

  return {
    folders,
    documents,
    isLoading,
    error,
    refresh,
    createFolder,
    updateFolder,
    deleteFolder,
    updateDocument,
    deleteDocument,
    importEntries,
  };
}
