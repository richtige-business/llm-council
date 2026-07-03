// ============================================
// store.ts - AI Training Center Zustand Store
// 
// Zweck: Zentraler State für das Training-Modul
// Verwendet von: Alle Training-Komponenten
// ============================================

import { create } from 'zustand';
import type {
  TrainingStore,
  TrainingState,
  TrainingModel,
  Dataset,
  TrainingJob,
  SandboxSession,
  SandboxPrompt,
} from './types';

// --------------------------------------------
// Initial State
// --------------------------------------------

const initialState: TrainingState = {
  // Modelle
  models: [],
  selectedModelId: null,
  modelsLoading: false,
  
  // Datasets
  datasets: [],
  selectedDatasetId: null,
  datasetsLoading: false,
  
  // Jobs
  jobs: [],
  activeJobId: null,
  jobsLoading: false,
  
  // Sandbox
  sessions: [],
  activeSessionId: null,
  currentPrompts: [],
  sessionsLoading: false,
  
  // UI State
  activeCategory: null,
  activeSubmode: null,
  activeWorkspaceTab: null,
  lastCategory: null,
  lastSubmode: null,
  showEntryOnOpen: true,
  activeTab: 'models',
  error: null,
};

// --------------------------------------------
// Store erstellen
// --------------------------------------------

export const useTrainingStore = create<TrainingStore>((set) => ({
  ...initialState,
  
  // ============================================
  // Modell-Aktionen
  // ============================================
  
  setModels: (models: TrainingModel[]) => {
    set({ models });
  },
  
  addModel: (model: TrainingModel) => {
    set((state) => ({
      models: [...state.models, model],
    }));
  },
  
  updateModel: (id: string, updates: Partial<TrainingModel>) => {
    set((state) => ({
      models: state.models.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },
  
  deleteModel: (id: string) => {
    set((state) => ({
      models: state.models.filter((m) => m.id !== id),
      // Falls das gelöschte Modell ausgewählt war, Auswahl aufheben
      selectedModelId: state.selectedModelId === id ? null : state.selectedModelId,
    }));
  },
  
  selectModel: (id: string | null) => {
    set({ selectedModelId: id });
  },
  
  // ============================================
  // Dataset-Aktionen
  // ============================================
  
  setDatasets: (datasets: Dataset[]) => {
    set({ datasets });
  },
  
  addDataset: (dataset: Dataset) => {
    set((state) => ({
      datasets: [...state.datasets, dataset],
    }));
  },
  
  updateDataset: (id: string, updates: Partial<Dataset>) => {
    set((state) => ({
      datasets: state.datasets.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
  },
  
  deleteDataset: (id: string) => {
    set((state) => ({
      datasets: state.datasets.filter((d) => d.id !== id),
      selectedDatasetId: state.selectedDatasetId === id ? null : state.selectedDatasetId,
    }));
  },
  
  selectDataset: (id: string | null) => {
    set({ selectedDatasetId: id });
  },
  
  // ============================================
  // Job-Aktionen
  // ============================================
  
  setJobs: (jobs: TrainingJob[]) => {
    set({ jobs });
  },
  
  addJob: (job: TrainingJob) => {
    set((state) => ({
      jobs: [job, ...state.jobs], // Neueste zuerst
    }));
  },
  
  updateJob: (id: string, updates: Partial<TrainingJob>) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === id ? { ...j, ...updates } : j
      ),
    }));
  },
  
  setActiveJob: (id: string | null) => {
    set({ activeJobId: id });
  },
  
  // ============================================
  // Sandbox-Aktionen
  // ============================================
  
  setSessions: (sessions: SandboxSession[]) => {
    set({ sessions });
  },
  
  addSession: (session: SandboxSession) => {
    set((state) => ({
      sessions: [session, ...state.sessions],
    }));
  },
  
  updateSession: (id: string, updates: Partial<SandboxSession>) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  },
  
  setActiveSession: (id: string | null) => {
    set({ activeSessionId: id });
  },
  
  setCurrentPrompts: (prompts: SandboxPrompt[]) => {
    set({ currentPrompts: prompts });
  },
  
  addPrompt: (prompt: SandboxPrompt) => {
    set((state) => ({
      currentPrompts: [...state.currentPrompts, prompt],
    }));
  },
  
  updatePrompt: (id: string, updates: Partial<SandboxPrompt>) => {
    set((state) => ({
      currentPrompts: state.currentPrompts.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },
  
  // ============================================
  // UI-Aktionen
  // ============================================
  
  setActiveCategory: (category) => {
    set((state) => ({
      activeCategory: category,
      lastCategory: category ?? state.lastCategory,
      // Beim Bereichswechsel Untermodus und Tab zurücksetzen
      activeSubmode: category === state.activeCategory ? state.activeSubmode : null,
      activeWorkspaceTab: category === state.activeCategory ? state.activeWorkspaceTab : null,
      showEntryOnOpen: category === null,
    }));
  },

  setActiveSubmode: (submode) => {
    set((state) => ({
      activeSubmode: submode,
      lastSubmode: submode ?? state.lastSubmode,
      showEntryOnOpen: state.activeCategory === null,
    }));
  },

  setActiveWorkspaceTab: (tab) => {
    set({ activeWorkspaceTab: tab });
  },

  setShowEntryOnOpen: (show) => {
    set({ showEntryOnOpen: show });
  },

  resetHubNavigation: () => {
    set({
      activeCategory: null,
      activeSubmode: null,
      activeWorkspaceTab: null,
      showEntryOnOpen: true,
    });
  },

  setActiveTab: (tab: TrainingState['activeTab']) => {
    set({ activeTab: tab });
  },
  
  setError: (error: string | null) => {
    set({ error });
  },
  
  setModelsLoading: (loading: boolean) => {
    set({ modelsLoading: loading });
  },
  
  setDatasetsLoading: (loading: boolean) => {
    set({ datasetsLoading: loading });
  },
  
  setJobsLoading: (loading: boolean) => {
    set({ jobsLoading: loading });
  },
  
  setSessionsLoading: (loading: boolean) => {
    set({ sessionsLoading: loading });
  },
}));

// --------------------------------------------
// Selektoren für häufig genutzte Daten
// --------------------------------------------

// Ausgewähltes Modell abrufen
export const useSelectedModel = () => {
  return useTrainingStore((state) => {
    if (!state.selectedModelId) return null;
    return state.models.find((m) => m.id === state.selectedModelId) || null;
  });
};

// Ausgewähltes Dataset abrufen
export const useSelectedDataset = () => {
  return useTrainingStore((state) => {
    if (!state.selectedDatasetId) return null;
    return state.datasets.find((d) => d.id === state.selectedDatasetId) || null;
  });
};

// Aktive Session abrufen
export const useActiveSession = () => {
  return useTrainingStore((state) => {
    if (!state.activeSessionId) return null;
    return state.sessions.find((s) => s.id === state.activeSessionId) || null;
  });
};

// Aktiver Job abrufen
export const useActiveJob = () => {
  return useTrainingStore((state) => {
    if (!state.activeJobId) return null;
    return state.jobs.find((j) => j.id === state.activeJobId) || null;
  });
};

// Laufende Jobs abrufen
export const useRunningJobs = () => {
  return useTrainingStore((state) => 
    state.jobs.filter((j) => j.status === 'running' || j.status === 'queued')
  );
};

// Modelle nach Typ filtern
export const useModelsByType = (type: TrainingModel['type']) => {
  return useTrainingStore((state) => 
    state.models.filter((m) => m.type === type)
  );
};

// Datasets nach Typ filtern
export const useDatasetsByType = (type: Dataset['type']) => {
  return useTrainingStore((state) => 
    state.datasets.filter((d) => d.type === type)
  );
};

// Bereit-Status Datasets (für Training)
export const useReadyDatasets = () => {
  return useTrainingStore((state) => 
    state.datasets.filter((d) => d.status === 'ready')
  );
};

// Aktive Sandbox Sessions
export const useActiveSessions = () => {
  return useTrainingStore((state) => 
    state.sessions.filter((s) => s.status === 'active')
  );
};

// --------------------------------------------
// Hydration für SSR (falls benötigt)
// --------------------------------------------

export const hydrateTrainingStore = (data: Partial<TrainingState>) => {
  useTrainingStore.setState(data);
};








