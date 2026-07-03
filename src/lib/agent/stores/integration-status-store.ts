// ============================================
// integration-status-store.ts - Globaler Integrationsstatus fuer Agenten
//
// Zweck: Hält den Verbindungsstatus externer Integrationen zentral vor
// Verwendet von: Agent Settings (Behavior Tab), Skill-Guards
// ============================================

'use client';

import { create } from 'zustand';

// --------------------------------------------
// Typen und Konstanten
// Definieren die unterstuetzten Integrationen in V1
// --------------------------------------------

export type AgentIntegrationId = 'gmail' | 'browser';

export interface AgentIntegrationStatus {
  connected: boolean;
  authOk: boolean;
  lastSeen: number | null;
}

const DEFAULT_INTEGRATION_STATUS: Record<AgentIntegrationId, AgentIntegrationStatus> = {
  // Browser gilt in V1 als lokal verfuegbar
  browser: {
    connected: true,
    authOk: true,
    lastSeen: Date.now(),
  },
  // Gmail wird beim Refresh auf Basis verbundener Konten gesetzt
  gmail: {
    connected: false,
    authOk: false,
    lastSeen: null,
  },
};

// --------------------------------------------
// Store-Interface
// Kapselt Statuswerte + Refresh-Logik
// --------------------------------------------

interface IntegrationStatusState {
  statuses: Record<AgentIntegrationId, AgentIntegrationStatus>;
  setIntegrationStatus: (integrationId: AgentIntegrationId, status: Partial<AgentIntegrationStatus>) => void;
  refreshIntegrationStatuses: () => Promise<void>;
}

interface InboxAccountStatusPayload {
  isActive?: boolean;
  lastSyncAt?: string | null;
  createdAt?: string | null;
}

// --------------------------------------------
// Hilfsfunktion: Gmail-Status laden
// Liest aktive Inbox-Accounts aus der API und mappt sie auf Integrationsstatus
// --------------------------------------------

async function loadGmailStatus(): Promise<AgentIntegrationStatus> {
  try {
    const response = await fetch('/api/inbox/accounts', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { connected: false, authOk: false, lastSeen: null };
    }

    const data = (await response.json()) as { accounts?: InboxAccountStatusPayload[] };
    const accounts: InboxAccountStatusPayload[] = Array.isArray(data?.accounts) ? data.accounts : [];
    const activeAccounts = accounts.filter((account) => Boolean(account?.isActive));

    if (activeAccounts.length === 0) {
      return { connected: false, authOk: false, lastSeen: null };
    }

    const lastSeen = activeAccounts.reduce<number | null>((latest, account) => {
      const candidate = account?.lastSyncAt || account?.createdAt;
      const parsed = candidate ? Date.parse(candidate) : NaN;
      if (Number.isNaN(parsed)) return latest;
      if (latest === null) return parsed;
      return Math.max(latest, parsed);
    }, null);

    return {
      connected: true,
      authOk: true,
      lastSeen,
    };
  } catch {
    return { connected: false, authOk: false, lastSeen: null };
  }
}

// --------------------------------------------
// Store-Implementierung
// Zentraler Statuscontainer fuer Integrationen
// --------------------------------------------

export const useIntegrationStatusStore = create<IntegrationStatusState>((set) => ({
  statuses: DEFAULT_INTEGRATION_STATUS,

  setIntegrationStatus: (integrationId, status) => {
    set((state) => ({
      statuses: {
        ...state.statuses,
        [integrationId]: {
          ...state.statuses[integrationId],
          ...status,
        },
      },
    }));
  },

  refreshIntegrationStatuses: async () => {
    const gmailStatus = await loadGmailStatus();

    set((state) => ({
      statuses: {
        ...state.statuses,
        gmail: gmailStatus,
        // Browser wird in V1 als verfügbar angenommen
        browser: {
          connected: true,
          authOk: true,
          lastSeen: Date.now(),
        },
      },
    }));
  },
}));

// --------------------------------------------
// Selektoren
// Kleine Hilfs-Hooks für komponentenseitige Nutzung
// --------------------------------------------

export const useIntegrationStatuses = () =>
  useIntegrationStatusStore((state) => state.statuses);

export const useIntegrationStatus = (integrationId: AgentIntegrationId) =>
  useIntegrationStatusStore((state) => state.statuses[integrationId]);
