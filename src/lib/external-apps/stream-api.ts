// ============================================
// stream-api.ts - API Client fuer Stream Manager
//
// Zweck: Kapselt alle HTTP-Calls zum Cloud-Streaming-Backend
// Verwendet von: stream-store.ts, CloudBrowserView.tsx
// ============================================

import {
  STREAM_HEALTH_TIMEOUT,
  STREAM_SERVICE_URL,
} from './constants';

// --------------------------------------------
// Typen fuer Stream-API
// --------------------------------------------

export type StreamSessionStatus =
  | 'starting'
  | 'ready'
  | 'active'
  | 'paused'
  | 'error'
  | 'stopped';

export interface StreamSessionResponse {
  sessionId: string;
  status: StreamSessionStatus;
  viewerUrl: string;
  targetUrl: string;
  moduleId?: string;
  error?: string;
}

export interface StreamPoolStatusResponse {
  warm: number;
  active: number;
  capacity: number;
}

interface CreateSessionPayload {
  moduleId: string;
  targetUrl: string;
  persistSession?: boolean;
  resolution?: string;
}

function buildStreamUrl(path: string): string {
  if (STREAM_SERVICE_URL) {
    return `${STREAM_SERVICE_URL}${path}`;
  }
  return path;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function buildError(response: Response, fallback: string): Error {
  return new Error(`${fallback} (HTTP ${response.status})`);
}

// --------------------------------------------
// API-Aufrufe
// --------------------------------------------

export async function checkStreamServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(buildStreamUrl('/api/streams/health'), {
      signal: AbortSignal.timeout(STREAM_HEALTH_TIMEOUT),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function createStreamSession(
  payload: CreateSessionPayload
): Promise<StreamSessionResponse> {
  const response = await fetch(buildStreamUrl('/api/streams/create'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await safeJson<StreamSessionResponse>(response);
  if (!response.ok || !data) {
    throw buildError(response, 'Stream-Session konnte nicht erstellt werden');
  }
  return data;
}

export async function getStreamSession(sessionId: string): Promise<StreamSessionResponse | null> {
  const response = await fetch(buildStreamUrl(`/api/streams/${sessionId}`));
  if (response.status === 404) return null;
  const data = await safeJson<StreamSessionResponse>(response);
  if (!response.ok || !data) {
    throw buildError(response, 'Stream-Session konnte nicht geladen werden');
  }
  return data;
}

export async function destroyStreamSession(sessionId: string): Promise<void> {
  const response = await fetch(buildStreamUrl(`/api/streams/${sessionId}`), {
    method: 'DELETE',
  });
  if (!response.ok && response.status !== 404) {
    throw buildError(response, 'Stream-Session konnte nicht beendet werden');
  }
}

export async function persistStreamSession(sessionId: string): Promise<void> {
  const response = await fetch(buildStreamUrl(`/api/streams/${sessionId}/persist`), {
    method: 'POST',
  });
  if (!response.ok) {
    throw buildError(response, 'Session-Persistenz fehlgeschlagen');
  }
}

export async function getStreamPoolStatus(): Promise<StreamPoolStatusResponse> {
  const response = await fetch(buildStreamUrl('/api/streams/pool'));
  const data = await safeJson<StreamPoolStatusResponse>(response);
  if (!response.ok || !data) {
    throw buildError(response, 'Pool-Status konnte nicht geladen werden');
  }
  return data;
}
