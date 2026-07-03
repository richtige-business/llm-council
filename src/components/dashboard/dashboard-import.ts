// ============================================
// dashboard-import.ts - Client-Helfer fuer Desktop-Importe
//
// Zweck: Liest einzelne Dateien, komplette Verzeichnisse und
//        Drag-and-Drop-Ordner fuer das Dashboard ein.
// Verwendet von: DashboardFolderLayer
// ============================================

'use client';

export interface DesktopImportFile {
  name: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  contentText?: string;
  contentBase64?: string;
  source: string;
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath?: string;
}

interface FileSystemFileEntryLike extends FileSystemEntryLike {
  file: (callback: (file: File) => void, errorCallback?: (error: DOMException) => void) => void;
}

interface FileSystemDirectoryEntryLike extends FileSystemEntryLike {
  createReader: () => {
    readEntries: (
      callback: (entries: FileSystemEntryLike[]) => void,
      errorCallback?: (error: DOMException) => void
    ) => void;
  };
}

interface DataTransferItemWithEntry extends DataTransferItem {
  webkitGetAsEntry?: () => FileSystemEntryLike | null;
}

async function fileToImportPayload(file: File, relativePath: string): Promise<DesktopImportFile> {
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

export async function readSelectedFiles(files: File[]): Promise<DesktopImportFile[]> {
  return Promise.all(
    files.map((file) => {
      const relativePath =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim() || file.name;
      return fileToImportPayload(file, relativePath);
    })
  );
}

// --------------------------------------------
// Verzeichnis-Picker (File System Access API)
// Ermoeglicht echte Ordner-Auswahl statt nur Datei-Inputs
// --------------------------------------------

async function readDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  parentPath = ''
): Promise<DesktopImportFile[]> {
  const entries: DesktopImportFile[] = [];

  for await (const [name, childHandle] of handle.entries()) {
    const relativePath = parentPath ? `${parentPath}/${name}` : name;

    if (childHandle.kind === 'file') {
      const file = await childHandle.getFile();
      entries.push(await fileToImportPayload(file, relativePath));
      continue;
    }

    if (childHandle.kind === 'directory') {
      const nested = await readDirectoryHandle(childHandle, relativePath);
      entries.push(...nested);
    }
  }

  return entries;
}

export async function pickDesktopDirectoryFiles(): Promise<DesktopImportFile[]> {
  const pickerWindow = window as Window & {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  };

  if (!pickerWindow.showDirectoryPicker) {
    throw new Error('Ordner-Auswahl wird in diesem Browser nicht unterstuetzt.');
  }

  const rootHandle = await pickerWindow.showDirectoryPicker();
  // Root-Ordnername explizit beibehalten, damit der Import-Service
  // den ausgewaehlten Ordner selbst als oberste Struktur anlegt.
  return readDirectoryHandle(rootHandle, rootHandle.name);
}

function readDirectoryEntries(
  directoryEntry: FileSystemDirectoryEntryLike
): Promise<FileSystemEntryLike[]> {
  return new Promise((resolve, reject) => {
    const reader = directoryEntry.createReader();
    const collected: FileSystemEntryLike[] = [];

    const readBatch = () => {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve(collected);
            return;
          }
          collected.push(...entries);
          readBatch();
        },
        (error) => reject(error)
      );
    };

    readBatch();
  });
}

async function walkEntry(
  entry: FileSystemEntryLike,
  parentPath = ''
): Promise<Array<{ file: File; relativePath: string }>> {
  const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntryLike;
    const file = await new Promise<File>((resolve, reject) => {
      fileEntry.file(resolve, reject);
    });
    return [{ file, relativePath }];
  }

  if (!entry.isDirectory) {
    return [];
  }

  const directoryEntry = entry as FileSystemDirectoryEntryLike;
  const childEntries = await readDirectoryEntries(directoryEntry);
  const children = await Promise.all(
    childEntries.map((childEntry) => walkEntry(childEntry, relativePath))
  );
  return children.flat();
}

export async function collectDroppedDesktopFiles(dataTransfer: DataTransfer): Promise<DesktopImportFile[]> {
  const itemEntries = Array.from(dataTransfer.items || [])
    .map((item) => item as DataTransferItemWithEntry)
    .map((item) => item.webkitGetAsEntry?.() || null)
    .filter((entry): entry is FileSystemEntryLike => Boolean(entry));

  if (itemEntries.length > 0) {
    const nestedFiles = await Promise.all(itemEntries.map((entry) => walkEntry(entry)));
    return Promise.all(
      nestedFiles
        .flat()
        .map(({ file, relativePath }) => fileToImportPayload(file, relativePath))
    );
  }

  const looseFiles = Array.from(dataTransfer.files || []);
  return readSelectedFiles(looseFiles);
}
