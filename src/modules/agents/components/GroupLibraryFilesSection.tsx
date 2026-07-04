// ============================================
// GroupLibraryFilesSection.tsx - Dateien & Ordner einer Gruppe
//
// Zweck: Zeigt die serverseitige Gruppen-Dateiablage inklusive
//        Import kompletter Ordnerbaeume und ZIP-Export
// Verwendet von: GroupSettingsModal, AgentSettingsPage
// ============================================

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Download, FolderTree, HardDriveUpload, Pin, RefreshCw } from 'lucide-react';
import type {
  GroupLibraryData,
  GroupLibraryDocumentData,
  GroupLibraryFolderData,
} from '../types';

interface GroupLibraryFilesSectionProps {
  groupName: string;
  library: GroupLibraryData | null;
  folders: GroupLibraryFolderData[];
  documents: GroupLibraryDocumentData[];
  isLoading?: boolean;
  onEnsureLibrary: () => Promise<unknown>;
  onRefresh: () => Promise<void>;
  onImportFiles: (files: File[], libraryName?: string) => Promise<unknown>;
  onDownloadZip: () => Promise<void>;
  onPinToDashboard?: () => Promise<void>;
}

export function GroupLibraryFilesSection({
  groupName,
  library,
  folders,
  documents,
  isLoading = false,
  onEnsureLibrary,
  onRefresh,
  onImportFiles,
  onDownloadZip,
  onPinToDashboard,
}: GroupLibraryFilesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!directoryInputRef.current) return;
    directoryInputRef.current.setAttribute('webkitdirectory', '');
    directoryInputRef.current.setAttribute('directory', '');
  }, []);

  const sortedFolders = useMemo(
    () => [...folders].sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    [folders]
  );
  const sortedDocuments = useMemo(
    () => [...documents].sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    [documents]
  );

  const handleImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await onEnsureLibrary();
    await onImportFiles(Array.from(files), groupName);
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-white/65" />
            <h3 className="text-sm font-semibold text-white">Files & Ordner</h3>
          </div>
          <p className="mt-1 text-xs text-white/45">
            Persistente Gruppenbibliothek mit echter Baumstruktur, Desktop-Import und ZIP-Export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
          >
            <HardDriveUpload className="h-3.5 w-3.5" />
            Dateien
          </button>
          <button
            type="button"
            onClick={() => directoryInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
          >
            <HardDriveUpload className="h-3.5 w-3.5" />
            Ordner
          </button>
          <button
            type="button"
            onClick={() => void onDownloadZip()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          {onPinToDashboard ? (
            <button
              type="button"
              onClick={() => void onPinToDashboard()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
            >
              <Pin className="h-3.5 w-3.5" />
              Dashboard
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleImport(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={directoryInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleImport(event.target.files);
          event.target.value = '';
        }}
      />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/40">Ordnerbaum</p>
          <div className="mt-3 space-y-2">
            {sortedFolders.length > 0 ? (
              sortedFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <p className="text-sm font-medium text-white">{folder.name}</p>
                  <p className="mt-1 truncate text-[11px] text-white/45">{folder.relativePath || '/'}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-6 text-center text-xs text-white/45">
                {isLoading ? 'Lade Gruppenstruktur...' : 'Noch keine Ordner vorhanden.'}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/40">Dokumente</p>
            <span className="text-[11px] text-white/45">
              {library ? `${sortedDocuments.length} Dateien` : 'Bibliothek noch nicht provisioniert'}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {sortedDocuments.length > 0 ? (
              sortedDocuments.map((document) => (
                <div
                  key={document.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{document.name}</p>
                      <p className="mt-1 truncate text-[11px] text-white/45">{document.relativePath}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-white/55">
                      {document.mimeType.split('/')[0]}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-6 text-center text-xs text-white/45">
                Importiere Dateien oder ganze Ordner, um die Gruppenbibliothek zu fuellen.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
