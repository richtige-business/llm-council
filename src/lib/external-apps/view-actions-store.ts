// ============================================
// view-actions-store.ts - Header-Aktionen fuer Stream-Viewer
//
// Zweck: Registriert tab-/modulbezogene UI-Aktionen wie Reload,
//        damit die Fenster-Titlebar sie rendern kann.
// Verwendet von: CloudBrowserView, TabWindow
// ============================================

import { create } from 'zustand';

// --------------------------------------------
// Typen fuer externe View-Aktionen
// --------------------------------------------

export interface ExternalAppViewActions {
  reload?: () => void | Promise<void>;
}

interface ExternalAppViewActionsState {
  actionsByModuleId: Record<string, ExternalAppViewActions>;
  registerActions: (moduleId: string, actions: ExternalAppViewActions) => void;
  clearActions: (moduleId: string) => void;
}

// --------------------------------------------
// Store fuer Header-Aktionen
// Der Store ist bewusst fluechtig und nicht persistiert.
// --------------------------------------------

export const useExternalAppViewActionsStore = create<ExternalAppViewActionsState>((set) => ({
  actionsByModuleId: {},

  registerActions: (moduleId, actions) =>
    set((state) => ({
      actionsByModuleId: {
        ...state.actionsByModuleId,
        [moduleId]: actions,
      },
    })),

  clearActions: (moduleId) =>
    set((state) => {
      const next = { ...state.actionsByModuleId };
      delete next[moduleId];
      return { actionsByModuleId: next };
    }),
}));
