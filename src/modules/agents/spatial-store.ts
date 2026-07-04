// ============================================
// spatial-store.ts - UI-State fuer den 3D-Agents-Raum
//
// Zweck: Haelt Modus, Kamera-Fokus und ausgewaehlte Task
//        zentral fuer Spatial-Szene und Floating-Panels
// Verwendet von: AgentsModuleShell, Spatial-Scene, Task-Panels
// ============================================

import { create } from 'zustand';
import type { AgentsHubView, AgentsSpatialMode } from './spatial-types';

interface AgentsSpatialState {
  mode: AgentsSpatialMode;
  hubView: AgentsHubView;
  cameraTargetId: string | null;
  selectedTaskId: string | null;
  activeGroupRoomId: string | null;
  selectedCouncilSeatId: string | null;
  pendingCouncilSeatRemovalId: string | null;
  openCouncilChatMemberId: string | null; // Welcher Member-Chat gerade geöffnet ist
  speakingCouncilSeatId: string | null; // Welcher Council-Orb gerade tokenweise spricht
  openCouncilSpeechBubbleIds: Record<string, string>; // seatId -> aktuell sichtbare Speech-Bubble-Message
  artifactsPanelOpen: boolean; // Overlay-Panel fuer Council-Ergebnis-Downloads (PDF/DOCX)
}

interface AgentsSpatialActions {
  setMode: (mode: AgentsSpatialMode) => void;
  setHubView: (view: AgentsHubView) => void;
  setArtifactsPanelOpen: (open: boolean) => void;
  focusAgent: (agentId: string | null) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  setActiveGroupRoom: (groupId: string | null) => void;
  setSelectedCouncilSeat: (seatId: string | null) => void;
  requestCouncilSeatRemoval: (seatId: string) => void;
  clearCouncilSeatRemovalRequest: () => void;
  setOpenCouncilChatMember: (seatId: string | null) => void;
  setSpeakingCouncilSeat: (seatId: string | null) => void;
  openCouncilSpeechBubble: (seatId: string, messageId: string) => void;
  closeCouncilSpeechBubble: (seatId: string) => void;
}

type AgentsSpatialStore = AgentsSpatialState & AgentsSpatialActions;

export const useAgentsSpatialStore = create<AgentsSpatialStore>((set) => ({
  mode: 'council',
  hubView: 'councils',
  cameraTargetId: null,
  selectedTaskId: null,
  activeGroupRoomId: null,
  selectedCouncilSeatId: null,
  pendingCouncilSeatRemovalId: null,
  openCouncilChatMemberId: null,
  speakingCouncilSeatId: null,
  openCouncilSpeechBubbleIds: {},
  artifactsPanelOpen: false,

  setMode: (mode) => {
    set({ mode });
  },

  setHubView: (view) => {
    set({ hubView: view });
  },

  setArtifactsPanelOpen: (open) => {
    set({ artifactsPanelOpen: open });
  },

  focusAgent: (agentId) => {
    set({ cameraTargetId: agentId });
  },

  setSelectedTaskId: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  setActiveGroupRoom: (groupId) => {
    set({ activeGroupRoomId: groupId });
  },

  setSelectedCouncilSeat: (seatId) => {
    set({ selectedCouncilSeatId: seatId });
  },

  requestCouncilSeatRemoval: (seatId) => {
    set({ pendingCouncilSeatRemovalId: seatId });
  },

  clearCouncilSeatRemovalRequest: () => {
    set({ pendingCouncilSeatRemovalId: null });
  },

  setOpenCouncilChatMember: (seatId) => {
    set({ openCouncilChatMemberId: seatId });
  },

  setSpeakingCouncilSeat: (seatId) => {
    set({ speakingCouncilSeatId: seatId });
  },

  openCouncilSpeechBubble: (seatId, messageId) => {
    set((state) => ({
      openCouncilSpeechBubbleIds: {
        ...state.openCouncilSpeechBubbleIds,
        [seatId]: messageId,
      },
    }));
  },

  closeCouncilSpeechBubble: (seatId) => {
    set((state) => {
      const nextBubbleIds = { ...state.openCouncilSpeechBubbleIds };
      delete nextBubbleIds[seatId];
      return {
        openCouncilSpeechBubbleIds: nextBubbleIds,
      };
    });
  },
}));
