// ============================================
// useGroupLibrary.ts - Client-Hook fuer Gruppenbibliotheken
//
// Zweck: Laedt, aktualisiert und importiert die serverseitige
//        Gruppen-Datenbank inklusive echter Ordnerstruktur
// Verwendet von: GroupSettingsModal, ChatHistorySidebar, AgentSettingsPage
// ============================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  GroupLibraryData,
  GroupLibraryDocumentData,
  GroupLibraryFolderData,
} from '../types';

interface GroupLibraryState {
  library: GroupLibraryData | null;
  folders: GroupLibraryFolderData[];
  documents: GroupLibraryDocumentData[];
}

async function readFileForImport(file: File): Promise<{
  name: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  contentText?: string;
  contentBase64?: string;
  source: string;
}> {
  const relativePath =
    (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim() || file.name;

  if (file.type.startsWith('text/') || file.type === 'application/json') {
    const contentText = await file.text();
    return {
      name: file.name,
      mimeType: file.type || 'text/plain',
      sizeBytes: file.size,
      relativePath,
      contentText,
      source: 'desktop-import',
    };
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    relativePath,
    contentBase64: btoa(binary),
    source: 'desktop-import',
  };
}

export function useGroupLibrary(groupAgentId: string | null, defaults?: { name?: string; description?: string; objective?: string }) {
  const [state, setState] = useState<GroupLibraryState>({
    library: null,
    folders: [],
    documents: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!groupAgentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/group-libraries/${encodeURIComponent(groupAgentId)}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gruppenbibliothek konnte nicht geladen werden.');
      }
      setState({
        library: data.library,
        folders: data.folders || [],
        documents: data.documents || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gruppenbibliothek konnte nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, [groupAgentId]);

  const ensureLibrary = useCallback(async () => {
    if (!groupAgentId) return null;
    const response = await fetch(`/api/group-libraries/${encodeURIComponent(groupAgentId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: defaults?.name || groupAgentId,
        description: defaults?.description || '',
        objective: defaults?.objective || '',
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Gruppenbibliothek konnte nicht erstellt werden.');
    }
    await refresh();
    return data.library as GroupLibraryData;
  }, [defaults?.description, defaults?.name, defaults?.objective, groupAgentId, refresh]);

  useEffect(() => {
    if (!groupAgentId) return;
    void refresh();
  }, [groupAgentId, refresh]);

  const updateLibrary = useCallback(
    async (updates: Partial<Pick<GroupLibraryData, 'name' | 'description' | 'objective' | 'linkedDashboardFolderId'>>) => {
      if (!groupAgentId) return null;
      const response = await fetch(`/api/group-libraries/${encodeURIComponent(groupAgentId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gruppenbibliothek konnte nicht aktualisiert werden.');
      }
      setState((prev) => ({ ...prev, library: data.library }));
      return data.library as GroupLibraryData;
    },
    [groupAgentId]
  );

  const importFiles = useCallback(
    async (files: File[], libraryName?: string) => {
      if (!groupAgentId || files.length === 0) return null;
      const payloadFiles = await Promise.all(files.map((file) => readFileForImport(file)));
      const response = await fetch(`/api/group-libraries/${encodeURIComponent(groupAgentId)}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libraryName: libraryName || defaults?.name || groupAgentId,
          files: payloadFiles,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Ordnerstruktur konnte nicht importiert werden.');
      }
      await refresh();
      return data;
    },
    [defaults?.name, groupAgentId, refresh]
  );

  const downloadZip = useCallback(async () => {
    if (!groupAgentId) return;
    const response = await fetch(`/api/group-libraries/${encodeURIComponent(groupAgentId)}/export`);
    if (!response.ok) {
      throw new Error('Gruppenbibliothek konnte nicht exportiert werden.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${state.library?.name || groupAgentId}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [groupAgentId, state.library?.name]);

  const createFolder = useCallback(
    async (name: string, options?: { color?: string; parentFolderId?: string | null; relativePath?: string }) => {
      if (!groupAgentId) return null;
      const response = await fetch(`/api/group-libraries/${encodeURIComponent(groupAgentId)}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color: options?.color,
          parentFolderId: options?.parentFolderId,
          relativePath: options?.relativePath,
          libraryName: defaults?.name || groupAgentId,
          description: defaults?.description || '',
          objective: defaults?.objective || '',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gruppenordner konnte nicht erstellt werden.');
      }
      await refresh();
      return data.folder as GroupLibraryFolderData;
    },
    [defaults?.description, defaults?.name, defaults?.objective, groupAgentId, refresh]
  );

  return {
    library: state.library,
    folders: state.folders,
    documents: state.documents,
    isLoading,
    error,
    refresh,
    ensureLibrary,
    updateLibrary,
    importFiles,
    downloadZip,
    createFolder,
  };
}
