// ============================================
// LifeOS Module Builder - Files Store
// 
// Zweck: Verwaltet das virtuelle Dateisystem
// Konvertiert von bolt.diy FilesStore
// ============================================

import { create } from 'zustand';

// --------------------------------------------
// File Typen
// --------------------------------------------

export interface FileEntry {
  type: 'file';
  content: string;
  isBinary?: boolean;
}

export interface FolderEntry {
  type: 'folder';
}

export type DirEntry = FileEntry | FolderEntry;
export type FileMap = Record<string, DirEntry | undefined>;

// --------------------------------------------
// Store State & Actions
// --------------------------------------------

interface FilesState {
  // State
  files: FileMap;
  
  // Actions
  setFile: (path: string, content: string) => void;
  appendFileContent: (path: string, chunk: string) => void;  // Hängt chunk an bestehenden Content an
  setFiles: (files: FileMap) => void;
  deleteFile: (path: string) => void;
  createFolder: (path: string) => void;
  getFile: (path: string) => FileEntry | undefined;
  getFileContent: (path: string) => string | undefined;
  getFilesCount: () => number;
  clearFiles: () => void;
}

// --------------------------------------------
// Store erstellen
// --------------------------------------------

export const useFilesStore = create<FilesState>((set, get) => ({
  // Initial State
  files: {},
  
  // Actions
  setFile: (path, content) => {
    set((state) => ({
      files: {
        ...state.files,
        [path]: { type: 'file', content },
      },
    }));
  },

  // Hängt einen Chunk an den bestehenden Content einer Datei an
  // Wird für Live-Streaming genutzt (statt komplettem Neuschreiben)
  appendFileContent: (path, chunk) => {
    set((state) => {
      const existing = state.files[path];
      const currentContent = existing?.type === 'file' ? existing.content : '';
      return {
        files: {
          ...state.files,
          [path]: { type: 'file', content: currentContent + chunk },
        },
      };
    });
  },
  
  setFiles: (files) => set({ files }),
  
  deleteFile: (path) => {
    set((state) => {
      const newFiles = { ...state.files };
      delete newFiles[path];
      return { files: newFiles };
    });
  },
  
  createFolder: (path) => {
    set((state) => ({
      files: {
        ...state.files,
        [path]: { type: 'folder' },
      },
    }));
  },
  
  getFile: (path) => {
    const entry = get().files[path];
    if (entry?.type === 'file') {
      return entry;
    }
    return undefined;
  },
  
  getFileContent: (path) => {
    const file = get().getFile(path);
    return file?.content;
  },
  
  getFilesCount: () => {
    return Object.values(get().files).filter((f) => f?.type === 'file').length;
  },
  
  clearFiles: () => set({ files: {} }),
}));



