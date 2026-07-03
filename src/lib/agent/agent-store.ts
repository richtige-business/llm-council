// ============================================
// agent-store.ts - Zustand Store für Agent-Status
// 
// Zweck: Verwaltet den Status des Agent-Systems im Frontend
// Verwendet von: ChatWidget, ChatPage, useAgentExecutor
// ============================================

import { create } from 'zustand';
import type { AgentAction, AgentState } from './types';

// --------------------------------------------
// Agent Store Interface mit Actions
// --------------------------------------------

interface AgentStore extends AgentState {
  // Actions
  setExecuting: (isExecuting: boolean) => void;
  setCurrentAction: (action: AgentAction | null) => void;
  addToHistory: (action: AgentAction) => void;
  clearHistory: () => void;
  addPendingAction: (action: AgentAction) => void;
  removePendingAction: (actionTimestamp: number) => void;
  clearPendingActions: () => void;
  markActionExecuted: (actionTimestamp: number) => void;
}

// --------------------------------------------
// Agent Store erstellen
// --------------------------------------------

export const useAgentStore = create<AgentStore>((set, get) => ({
  // ----------------------------------------
  // Initial State
  // ----------------------------------------
  isExecuting: false,
  currentAction: null,
  actionHistory: [],
  pendingActions: [],

  // ----------------------------------------
  // Actions
  // ----------------------------------------

  // Setzt den Ausführungs-Status
  setExecuting: (isExecuting) => {
    set({ isExecuting });
  },

  // Setzt die aktuelle Aktion
  setCurrentAction: (action) => {
    set({ currentAction: action });
  },

  // Fügt eine Aktion zur History hinzu
  addToHistory: (action) => {
    set((state) => ({
      actionHistory: [
        { ...action, executed: true },
        ...state.actionHistory,
      ].slice(0, 50), // Maximal 50 Einträge behalten
    }));
  },

  // Löscht die History
  clearHistory: () => {
    set({ actionHistory: [] });
  },

  // Fügt eine ausstehende Aktion hinzu
  addPendingAction: (action) => {
    set((state) => ({
      pendingActions: [...state.pendingActions, action],
    }));
  },

  // Entfernt eine ausstehende Aktion
  removePendingAction: (actionTimestamp) => {
    set((state) => ({
      pendingActions: state.pendingActions.filter(
        (a) => a.timestamp !== actionTimestamp
      ),
    }));
  },

  // Löscht alle ausstehenden Aktionen
  clearPendingActions: () => {
    set({ pendingActions: [] });
  },

  // Markiert eine Aktion als ausgeführt
  markActionExecuted: (actionTimestamp) => {
    const { pendingActions, addToHistory, removePendingAction } = get();
    const action = pendingActions.find((a) => a.timestamp === actionTimestamp);
    
    if (action) {
      addToHistory(action);
      removePendingAction(actionTimestamp);
    }
  },
}));

// --------------------------------------------
// Selectors für optimierte Re-Renders
// --------------------------------------------

export const useIsAgentExecuting = () =>
  useAgentStore((state) => state.isExecuting);

export const useCurrentAgentAction = () =>
  useAgentStore((state) => state.currentAction);

export const useAgentActionHistory = () =>
  useAgentStore((state) => state.actionHistory);

export const usePendingAgentActions = () =>
  useAgentStore((state) => state.pendingActions);











