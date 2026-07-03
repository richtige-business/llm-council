// ============================================
// LifeOS Module Builder - Workbench Store
// 
// Zweck: Verwaltet den Workbench-Zustand (Editor, Preview)
// Konvertiert von bolt.diy WorkbenchStore
// ============================================

import { create } from 'zustand';
import type { FileMap } from './files-store';
import type { StructuredPreviewError } from '@/lib/lab/debug/types';

// --------------------------------------------
// View Typen
// --------------------------------------------

export type WorkbenchViewType = 'code' | 'preview' | 'diff';

export interface PreviewInfo {
  port: number;
  ready: boolean;
  url?: string;
}

// --------------------------------------------
// File Snapshot für Diff-Ansicht
// --------------------------------------------

export interface FileSnapshot {
  id: string;
  label: string;
  createdAt: string;
  files: FileMap;
}

// --------------------------------------------
// Store State & Actions
// --------------------------------------------

// --------------------------------------------
// Streaming-Status für Dateien
// Zeigt an, welche Dateien gerade vom LLM geschrieben werden
// --------------------------------------------

export type StreamingFileStatus = 'writing' | 'complete';

interface WorkbenchState {
  // State
  showWorkbench: boolean;
  currentView: WorkbenchViewType;
  selectedFile: string | undefined;
  unsavedFiles: Set<string>;
  previews: PreviewInfo[];
  showTerminal: boolean;
  fileSnapshots: FileSnapshot[];
  previewErrors: StructuredPreviewError[];
  lastPreviewError: StructuredPreviewError | null;
  
  // Streaming-State: Welche Dateien gerade live geschrieben werden
  streamingFiles: Map<string, StreamingFileStatus>;  // Pfad → 'writing' | 'complete'
  activeStreamingFile: string | null;                 // Datei, die gerade aktiv geschrieben wird
  
  // Actions
  setShowWorkbench: (show: boolean) => void;
  setCurrentView: (view: WorkbenchViewType) => void;
  setSelectedFile: (path: string | undefined) => void;
  addUnsavedFile: (path: string) => void;
  removeUnsavedFile: (path: string) => void;
  clearUnsavedFiles: () => void;
  addPreview: (preview: PreviewInfo) => void;
  clearPreviews: () => void;
  setShowTerminal: (show: boolean) => void;
  addFileSnapshot: (label: string, files: FileMap) => void;
  clearFileSnapshots: () => void;
  pushPreviewError: (error: StructuredPreviewError) => void;
  clearPreviewErrors: () => void;
  
  // Streaming-Actions
  setStreamingFile: (path: string, status: StreamingFileStatus) => void;
  clearStreamingFiles: () => void;
  setActiveStreamingFile: (path: string | null) => void;
  
  reset: () => void;
}

// --------------------------------------------
// Store erstellen
// --------------------------------------------

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  // Initial State
  showWorkbench: false,
  currentView: 'code',
  selectedFile: undefined,
  unsavedFiles: new Set(),
  previews: [],
  showTerminal: false,
  fileSnapshots: [],
  previewErrors: [],
  lastPreviewError: null,
  streamingFiles: new Map(),
  activeStreamingFile: null,
  
  // Actions
  setShowWorkbench: (show) => set({ showWorkbench: show }),
  
  setCurrentView: (view) => set({ currentView: view }),
  
  setSelectedFile: (path) => set({ selectedFile: path }),
  
  addUnsavedFile: (path) => {
    set((state) => ({
      unsavedFiles: new Set([...state.unsavedFiles, path]),
    }));
  },
  
  removeUnsavedFile: (path) => {
    set((state) => {
      const newSet = new Set(state.unsavedFiles);
      newSet.delete(path);
      return { unsavedFiles: newSet };
    });
  },
  
  clearUnsavedFiles: () => set({ unsavedFiles: new Set() }),
  
  addPreview: (preview) => {
    set((state) => ({
      previews: [...state.previews, preview],
    }));
  },
  
  clearPreviews: () => set({ previews: [] }),
  
  setShowTerminal: (show) => set({ showTerminal: show }),

  addFileSnapshot: (label, files) => {
    set((state) => ({
      fileSnapshots: [
        ...state.fileSnapshots.slice(-8),
        {
          id: crypto.randomUUID(),
          label,
          createdAt: new Date().toISOString(),
          files: structuredClone(files),
        },
      ],
    }));
  },

  clearFileSnapshots: () => set({ fileSnapshots: [] }),

  pushPreviewError: (error) => {
    set((state) => {
      const next = [...state.previewErrors, error].slice(-25);
      return {
        previewErrors: next,
        lastPreviewError: error,
      };
    });
  },

  clearPreviewErrors: () => set({
    previewErrors: [],
    lastPreviewError: null,
  }),

  // --------------------------------------------
  // Streaming-Actions
  // Steuern den Live-Status während der Code-Generierung
  // --------------------------------------------

  // Setzt den Status einer Datei (writing/complete)
  setStreamingFile: (path, status) => {
    set((state) => {
      const newMap = new Map(state.streamingFiles);
      newMap.set(path, status);
      return { streamingFiles: newMap };
    });
  },

  // Löscht alle Streaming-Status (nach Generierung abgeschlossen)
  clearStreamingFiles: () => set({
    streamingFiles: new Map(),
    activeStreamingFile: null,
  }),

  // Setzt die aktuell aktiv geschriebene Datei
  setActiveStreamingFile: (path) => set({ activeStreamingFile: path }),
  
  reset: () => set({
    showWorkbench: false,
    currentView: 'code',
    selectedFile: undefined,
    unsavedFiles: new Set(),
    previews: [],
    showTerminal: false,
    fileSnapshots: [],
    previewErrors: [],
    lastPreviewError: null,
    streamingFiles: new Map(),
    activeStreamingFile: null,
  }),
}));


