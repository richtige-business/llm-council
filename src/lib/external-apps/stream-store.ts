// ============================================
// stream-store.ts - Zustand fuer Stream-Sessions
//
// Zweck: Verwalten aktiver Cloud-Browser-Sessions pro Modul
// Verwendet von: CloudBrowserView, Pre-Warming Hooks
// ============================================

import { create } from 'zustand';
import {
  createStreamSession,
  destroyStreamSession,
  getStreamSession,
  persistStreamSession,
  type StreamSessionResponse,
} from './stream-api';

// --------------------------------------------
// Typen fuer den Session-Store
// --------------------------------------------

export interface StreamSessionState {
  moduleId: string;
  sessionId: string;
  targetUrl: string;
  viewerUrl: string;
  resolution?: string;
  status: StreamSessionResponse['status'];
  createdAt: number;
  lastTouchedAt: number;
}

interface StreamStoreState {
  activeSessions: Record<string, StreamSessionState>;
  isBusy: boolean;
  error: string | null;
}

interface StreamStoreActions {
  createSession: (
    moduleId: string,
    targetUrl: string,
    persistSession?: boolean,
    resolution?: string
  ) => Promise<StreamSessionState>;
  refreshSession: (moduleId: string) => Promise<StreamSessionState | null>;
  getSession: (moduleId: string) => StreamSessionState | null;
  touchSession: (moduleId: string) => void;
  destroySession: (moduleId: string, persistBeforeDestroy?: boolean) => Promise<void>;
  destroyAllSessions: (persistBeforeDestroy?: boolean) => Promise<void>;
  prewarmSessions: (entries: Array<{ moduleId: string; targetUrl: string }>) => Promise<void>;
  clearError: () => void;
}

export type StreamStore = StreamStoreState & StreamStoreActions;

function toStoreSession(
  moduleId: string,
  targetUrl: string,
  response: StreamSessionResponse,
  resolution?: string
): StreamSessionState {
  const now = Date.now();
  return {
    moduleId,
    sessionId: response.sessionId,
    targetUrl,
    viewerUrl: response.viewerUrl,
    resolution,
    status: response.status,
    createdAt: now,
    lastTouchedAt: now,
  };
}

// --------------------------------------------
// Stream-Store
// --------------------------------------------

export const useExternalStreamStore = create<StreamStore>((set, get) => ({
  activeSessions: {},
  isBusy: false,
  error: null,

  createSession: async (moduleId, targetUrl, persistSession = true, resolution) => {
    const existing = get().activeSessions[moduleId];
    if (existing) {
      if (resolution && existing.resolution !== resolution) {
        await get().destroySession(moduleId, true);
      } else {
        set((state) => ({
          activeSessions: {
            ...state.activeSessions,
            [moduleId]: {
              ...existing,
              lastTouchedAt: Date.now(),
            },
          },
        }));
        return get().activeSessions[moduleId];
      }
    }

    set({ isBusy: true, error: null });
    try {
      const response = await createStreamSession({
        moduleId,
        targetUrl,
        persistSession,
        resolution,
      });
      const session = toStoreSession(moduleId, targetUrl, response, resolution);
      set((state) => ({
        activeSessions: {
          ...state.activeSessions,
          [moduleId]: session,
        },
        isBusy: false,
      }));
      return session;
    } catch (error) {
      set({
        isBusy: false,
        error:
          error instanceof Error
            ? error.message
            : 'Stream-Session konnte nicht erstellt werden.',
      });
      throw error;
    }
  },

  refreshSession: async (moduleId) => {
    const current = get().activeSessions[moduleId];
    if (!current) return null;

    try {
      const remote = await getStreamSession(current.sessionId);
      if (!remote) {
        set((state) => {
          const next = { ...state.activeSessions };
          delete next[moduleId];
          return { activeSessions: next };
        });
        return null;
      }

      const refreshed: StreamSessionState = {
        ...current,
        viewerUrl: remote.viewerUrl,
        status: remote.status,
        lastTouchedAt: Date.now(),
      };
      set((state) => ({
        activeSessions: {
          ...state.activeSessions,
          [moduleId]: refreshed,
        },
      }));
      return refreshed;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Stream-Session konnte nicht aktualisiert werden.',
      });
      return current;
    }
  },

  getSession: (moduleId) => get().activeSessions[moduleId] || null,

  touchSession: (moduleId) => {
    const current = get().activeSessions[moduleId];
    if (!current) return;
    set((state) => ({
      activeSessions: {
        ...state.activeSessions,
        [moduleId]: {
          ...current,
          lastTouchedAt: Date.now(),
        },
      },
    }));
  },

  destroySession: async (moduleId, persistBeforeDestroy = true) => {
    const current = get().activeSessions[moduleId];
    if (!current) return;

    try {
      if (persistBeforeDestroy) {
        await persistStreamSession(current.sessionId).catch(() => undefined);
      }
      await destroyStreamSession(current.sessionId);
    } finally {
      set((state) => {
        const next = { ...state.activeSessions };
        delete next[moduleId];
        return { activeSessions: next };
      });
    }
  },

  destroyAllSessions: async (persistBeforeDestroy = true) => {
    const sessions = Object.values(get().activeSessions);
    for (const session of sessions) {
      try {
        if (persistBeforeDestroy) {
          await persistStreamSession(session.sessionId).catch(() => undefined);
        }
        await destroyStreamSession(session.sessionId);
      } catch {
        // Session-Cleanup darf den Ablauf nicht blockieren
      }
    }
    set({ activeSessions: {} });
  },

  prewarmSessions: async (entries) => {
    for (const entry of entries) {
      const exists = get().activeSessions[entry.moduleId];
      if (exists) continue;
      try {
        await get().createSession(entry.moduleId, entry.targetUrl, true);
      } catch {
        // Pre-Warming ist best effort und darf nicht hart fehlschlagen
      }
    }
  },

  clearError: () => set({ error: null }),
}));
