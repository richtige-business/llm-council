// ============================================
// stream-session-registry.ts - In-Memory Session Registry
//
// Zweck: Speichert aktive Stream-Sessions fuer /api/streams
// Verwendet von: API-Routen unter /api/streams/*
// ============================================

import type { StreamSessionStatus } from '@/lib/external-apps/stream-api';

// --------------------------------------------
// Typen
// --------------------------------------------

export interface StreamSessionRecord {
  sessionId: string;
  moduleId: string;
  targetUrl: string;
  viewerUrl: string;
  status: StreamSessionStatus;
  createdAt: string;
  updatedAt: string;
  lastPersistedAt?: string;
}

// --------------------------------------------
// In-Memory Registry
// --------------------------------------------

const sessionMap = new Map<string, StreamSessionRecord>();

export function upsertStreamSession(
  record: Omit<StreamSessionRecord, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }
): StreamSessionRecord {
  const now = new Date().toISOString();
  const existing = sessionMap.get(record.sessionId);
  const merged: StreamSessionRecord = {
    sessionId: record.sessionId,
    moduleId: record.moduleId,
    targetUrl: record.targetUrl,
    viewerUrl: record.viewerUrl,
    status: record.status,
    createdAt: existing?.createdAt || record.createdAt || now,
    updatedAt: record.updatedAt || now,
    lastPersistedAt: record.lastPersistedAt || existing?.lastPersistedAt,
  };
  sessionMap.set(record.sessionId, merged);
  return merged;
}

export function getStreamSession(sessionId: string): StreamSessionRecord | null {
  return sessionMap.get(sessionId) || null;
}

export function deleteStreamSession(sessionId: string): void {
  sessionMap.delete(sessionId);
}

export function listStreamSessions(): StreamSessionRecord[] {
  return Array.from(sessionMap.values());
}

export function markSessionPersisted(sessionId: string): StreamSessionRecord | null {
  const current = sessionMap.get(sessionId);
  if (!current) return null;
  const updated: StreamSessionRecord = {
    ...current,
    lastPersistedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  sessionMap.set(sessionId, updated);
  return updated;
}
