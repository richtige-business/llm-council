// ============================================
// constants.ts - Konstanten fuer externe Apps
//
// Zweck: Zentrale Konfigurationswerte fuer das
//        WebRTC-Web-App-Streaming-System
// Verwendet von: stream-api.ts, stream-store.ts, CloudBrowserView
// ============================================

// --------------------------------------------
// Service-URL des Stream Manager Service
// Der Stream Manager orchestriert WebRTC-Browser-Container auf dem Server
// Kann per Umgebungsvariable ueberschrieben werden
// --------------------------------------------

export const STREAM_SERVICE_URL =
  process.env.NEXT_PUBLIC_STREAM_SERVICE_URL || '';

// --------------------------------------------
// Stream-Manager (Backend-Orchestrator) – Server-zu-Server
// Wird von Next.js API-Routen unter /api/streams/* genutzt.
// Fallback auf 127.0.0.1:3002 fuer lokale Entwicklung.
// --------------------------------------------

export const STREAM_MANAGER_SERVICE_URL =
  process.env.NEXT_PUBLIC_STREAM_MANAGER_SERVICE_URL ||
  process.env.NEXT_PUBLIC_APP_RUNNER_SERVICE_URL ||
  'http://127.0.0.1:3002';

/** Legacy-Alias fuer aeltere Umgebungsvariablen */
export const APP_RUNNER_SERVICE_URL = STREAM_MANAGER_SERVICE_URL;

// --------------------------------------------
// Modul-ID Prefix fuer externe Apps
// Alle externen App-Module beginnen mit diesem Prefix
// z.B. "extapp-notion", "extapp-canva"
// --------------------------------------------

export const EXTERNAL_APP_PREFIX = 'extapp-';

// --------------------------------------------
// Timeouts und Limits
// --------------------------------------------

// Health-Check Timeout (ms)
export const STREAM_HEALTH_TIMEOUT = 5000;

// Maximale Wartezeit bis eine Session bereit ist (ms)
export const SESSION_READY_TIMEOUT = 30000;

// Inaktivitaets-Timeout: nach dieser Zeit wird die Session pausiert (ms)
export const SESSION_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 Minuten

// Maximale Anzahl gleichzeitiger Sessions pro User
export const MAX_SESSIONS_PER_USER = 5;

// Polling-Intervall fuer Session-Status (ms)
export const SESSION_POLL_INTERVAL = 2000;
