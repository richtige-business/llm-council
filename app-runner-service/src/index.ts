// ============================================
// index.ts - App Runner Service Express Server
// 
// Zweck: Haupt-Einstiegspunkt für den App Runner Service
//        Stellt REST-API für native App-Steuerung bereit
//        und WebSocket-Proxy für VNC-Streaming
// Verwendet von: LifeOS Frontend (app-runner-api.ts)
// ============================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { AppManager } from './app-manager.js';
import { VncProxy } from './vnc-proxy.js';
import {
  DEFAULT_CONFIG,
  type ServiceConfig,
  type CreateSessionRequest,
  type LaunchAppRequest,
  type CloseAppRequest,
  type SessionResponse,
  type ErrorResponse,
} from './types.js';

// Phase 3: WebRTC Streaming Imports (Legacy, wird durch Container ersetzt)
import { captureManager } from './capture-manager.js';
import { signalingRelay } from './signaling-server.js';
import { inputRelay, validateInputEvent } from './input-relay.js';
import { getWindowInfo, getAllWindows, hideWindow, showWindow, waitForWindow, hideAppWindow } from './window-manager.js';

// Phase 4: Docker Container Streaming
import { containerManager } from './container-manager.js';

// --------------------------------------------
// Konfiguration laden
// Umgebungsvariablen überschreiben Defaults
// --------------------------------------------

const config: ServiceConfig = {
  ...DEFAULT_CONFIG,
  port: parseInt(process.env.PORT || '3002'),
  vncHost: process.env.VNC_HOST || '127.0.0.1',
  vncPort: parseInt(process.env.VNC_PORT || '5900'),
  vncPassword: process.env.VNC_PASSWORD || null,
  screenshotDir: process.env.SCREENSHOT_DIR || '/tmp/lifeos-screenshots',
};
const bindHost = process.env.HOST || '127.0.0.1';

// --------------------------------------------
// Express App und HTTP Server erstellen
// HTTP Server wird benötigt für WebSocket-Upgrade
// --------------------------------------------

const app = express();
const httpServer = createServer(app);

// App Manager für macOS App-Steuerung
const appManager = new AppManager(config.screenshotDir);

// VNC Proxy für WebSocket <-> VNC Streaming (Legacy)
const vncProxy = new VncProxy(httpServer, {
  targetHost: config.vncHost,
  targetPort: config.vncPort,
  password: config.vncPassword,
});

// Phase 3: Signaling Relay fuer WebRTC Streaming
signalingRelay.attachToServer(httpServer);

// --------------------------------------------
// Zentraler WebSocket Upgrade Handler
// Routet WebSocket-Verbindungen an den richtigen Server:
// /ws/vnc -> VNC Proxy
// /ws/stream/:sessionId -> Signaling Relay
// Alle anderen -> Socket zerstoeren
// --------------------------------------------

httpServer.on('upgrade', (request, socket, head) => {
  const url = request.url || '';

  if (url.startsWith('/ws/stream/')) {
    // Phase 3: Stream-Relay zum Swift Helper
    const handled = signalingRelay.handleUpgrade(request, socket, head);
    if (!handled) {
      socket.destroy();
    }
  } else if (url === '/ws/vnc') {
    // Legacy: VNC Proxy
    vncProxy.handleUpgrade(request, socket, head);
  } else {
    // Unbekannter Pfad
    socket.destroy();
  }
});

// --------------------------------------------
// Session-Verwaltung (einfache In-Memory-Map)
// Jede Session repräsentiert eine aktive Desktop-Verbindung
// --------------------------------------------

interface SessionData {
  id: string;
  createdAt: Date;
  lastActivityAt: Date;
  isConnected: boolean;
  activeApp: string | null;
}

const sessions = new Map<string, SessionData>();

// Generiert eine eindeutige Session-ID
function generateSessionId(): string {
  return `desktop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --------------------------------------------
// Middleware
// --------------------------------------------

// CORS für LifeOS Frontend erlauben
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true,
}));

// JSON Body Parser
app.use(express.json());

// Request Logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// --------------------------------------------
// Error Handler Helper
// Einheitliche Fehler-Responses
// --------------------------------------------

function sendError(res: Response, status: number, code: string, message: string): void {
  const error: ErrorResponse = { error: code, message, code };
  res.status(status).json(error);
}

// Aktualisiert den lastActivityAt-Zeitstempel einer Session
function touchSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivityAt = new Date();
  }
}

// --------------------------------------------
// Health Check Endpoint
// GET /health
// Gibt Status des Services und VNC-Proxy zurück
// --------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeSessions: sessions.size,
    activeVncConnections: vncProxy.getActiveConnectionCount(),
    vncTarget: `${config.vncHost}:${config.vncPort}`,
  });
});

// --------------------------------------------
// Session Endpoints
// Erstellen und Verwalten von Desktop-Sessions
// --------------------------------------------

// POST /api/session - Neue Desktop-Session erstellen
app.post('/api/session', (req: Request, res: Response) => {
  try {
    // Maximale Sessions prüfen
    if (sessions.size >= config.maxSessions) {
      return sendError(res, 429, 'MAX_SESSIONS', `Maximale Anzahl Sessions (${config.maxSessions}) erreicht`);
    }

    const sessionId = generateSessionId();
    const session: SessionData = {
      id: sessionId,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      isConnected: true,
      activeApp: null,
    };

    sessions.set(sessionId, session);
    console.log(`[API] Session erstellt: ${sessionId}`);

    const response: SessionResponse = {
      sessionId: session.id,
      createdAt: session.createdAt.toISOString(),
      isConnected: session.isConnected,
      activeApp: session.activeApp,
    };

    res.json(response);
  } catch (error) {
    console.error('[API] Fehler beim Erstellen der Session:', error);
    sendError(res, 500, 'SESSION_ERROR', 'Session konnte nicht erstellt werden');
  }
});

// GET /api/session/:sessionId - Session abrufen
app.get('/api/session/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return sendError(res, 404, 'SESSION_NOT_FOUND', 'Session nicht gefunden');
  }

  const response: SessionResponse = {
    sessionId: session.id,
    createdAt: session.createdAt.toISOString(),
    isConnected: session.isConnected,
    activeApp: session.activeApp,
  };

  res.json(response);
});

// DELETE /api/session/:sessionId - Session beenden
app.delete('/api/session/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const deleted = sessions.delete(sessionId);

  if (!deleted) {
    return sendError(res, 404, 'SESSION_NOT_FOUND', 'Session nicht gefunden');
  }

  console.log(`[API] Session beendet: ${sessionId}`);
  res.json({ success: true });
});

// --------------------------------------------
// App Management Endpoints
// Starten, Beenden und Auflisten von Apps
// --------------------------------------------

// POST /api/app/launch - Native App starten
app.post('/api/app/launch', async (req: Request, res: Response) => {
  try {
    const { appName, sessionId } = req.body as LaunchAppRequest;

    if (!appName || !sessionId) {
      return sendError(res, 400, 'MISSING_PARAMS', 'appName und sessionId sind erforderlich');
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return sendError(res, 404, 'SESSION_NOT_FOUND', 'Session nicht gefunden');
    }

    touchSession(sessionId);

    // App starten über AppManager
    const result = await appManager.launchApp(appName);

    if (result.success) {
      // App in den Vordergrund bringen und in Session speichern
      await appManager.focusApp(appName);
      session.activeApp = appName;
    }

    res.json({
      success: result.success,
      appName,
      message: result.message,
    });
  } catch (error) {
    console.error('[API] Fehler beim Starten der App:', error);
    sendError(res, 500, 'APP_LAUNCH_ERROR', 'App konnte nicht gestartet werden');
  }
});

// POST /api/app/close - Native App beenden
app.post('/api/app/close', async (req: Request, res: Response) => {
  try {
    const { appName, sessionId } = req.body as CloseAppRequest;

    if (!appName || !sessionId) {
      return sendError(res, 400, 'MISSING_PARAMS', 'appName und sessionId sind erforderlich');
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return sendError(res, 404, 'SESSION_NOT_FOUND', 'Session nicht gefunden');
    }

    touchSession(sessionId);

    const result = await appManager.closeApp(appName);

    // Wenn die geschlossene App die aktive war, zurücksetzen
    if (result.success && session.activeApp === appName) {
      session.activeApp = null;
    }

    res.json({
      success: result.success,
      appName,
      message: result.message,
    });
  } catch (error) {
    console.error('[API] Fehler beim Beenden der App:', error);
    sendError(res, 500, 'APP_CLOSE_ERROR', 'App konnte nicht beendet werden');
  }
});

// POST /api/app/focus - App in den Vordergrund bringen
app.post('/api/app/focus', async (req: Request, res: Response) => {
  try {
    const { appName, sessionId } = req.body as LaunchAppRequest;

    if (!appName || !sessionId) {
      return sendError(res, 400, 'MISSING_PARAMS', 'appName und sessionId sind erforderlich');
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return sendError(res, 404, 'SESSION_NOT_FOUND', 'Session nicht gefunden');
    }

    touchSession(sessionId);
    await appManager.focusApp(appName);
    session.activeApp = appName;

    res.json({ success: true, appName });
  } catch (error) {
    console.error('[API] Fehler beim Fokussieren der App:', error);
    sendError(res, 500, 'APP_FOCUS_ERROR', 'App konnte nicht fokussiert werden');
  }
});

// GET /api/apps - Laufende Apps auflisten
app.get('/api/apps', async (_req: Request, res: Response) => {
  try {
    const apps = await appManager.listRunningApps();
    res.json({ apps });
  } catch (error) {
    console.error('[API] Fehler beim Auflisten der Apps:', error);
    sendError(res, 500, 'APP_LIST_ERROR', 'Apps konnten nicht aufgelistet werden');
  }
});

// --------------------------------------------
// Screenshot Endpoint
// Erstellt einen Screenshot des gesamten Bildschirms
// --------------------------------------------

// GET /api/screenshot - Screenshot abrufen
app.get('/api/screenshot', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (sessionId) {
      touchSession(sessionId);
    }

    const result = await appManager.takeScreenshot();

    res.json({
      screenshot: result.screenshot,
      timestamp: new Date().toISOString(),
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error('[API] Fehler beim Screenshot:', error);
    sendError(res, 500, 'SCREENSHOT_ERROR', 'Screenshot konnte nicht erstellt werden');
  }
});

// --------------------------------------------
// Icon-Cache Verzeichnis
// Extrahierte App-Icons werden hier gespeichert
// --------------------------------------------

const ICON_CACHE_DIR = '/tmp/lifeos-app-icons';

// Hilfsfunktion: App-Pfad finden
async function findAppPath(appName: string): Promise<string | null> {
  const { existsSync } = await import('fs');
  const { homedir } = await import('os');
  
  const paths = [
    `/Applications/${appName}.app`,
    `${homedir()}/Applications/${appName}.app`,
  ];
  
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

// Hilfsfunktion: Icon aus einer .app extrahieren und als PNG cachen
async function extractAppIcon(appName: string): Promise<string | null> {
  const { execSync } = await import('child_process');
  const { existsSync, mkdirSync, readFileSync } = await import('fs');
  const { join } = await import('path');
  
  // Cache-Verzeichnis erstellen
  if (!existsSync(ICON_CACHE_DIR)) {
    mkdirSync(ICON_CACHE_DIR, { recursive: true });
  }
  
  // Pruefen ob Icon bereits im Cache liegt
  const safeName = appName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cachedPath = join(ICON_CACHE_DIR, `${safeName}.png`);
  
  if (existsSync(cachedPath)) {
    return cachedPath;
  }
  
  // App-Pfad finden
  const appPath = await findAppPath(appName);
  if (!appPath) return null;
  
  try {
    // Info.plist lesen um den Icon-Dateinamen zu finden
    let iconFileName = 'AppIcon';
    try {
      const plistOutput = execSync(
        `defaults read "${appPath}/Contents/Info" CFBundleIconFile 2>/dev/null || echo ""`,
        { encoding: 'utf-8' }
      ).trim();
      if (plistOutput) {
        // .icns Endung entfernen falls vorhanden
        iconFileName = plistOutput.replace(/\.icns$/, '');
      }
    } catch {
      // Fallback: Standard-Iconname
    }
    
    // Moegliche Icon-Pfade durchgehen
    const iconPaths = [
      `${appPath}/Contents/Resources/${iconFileName}.icns`,
      `${appPath}/Contents/Resources/AppIcon.icns`,
      `${appPath}/Contents/Resources/app.icns`,
    ];
    
    let icnsPath: string | null = null;
    for (const ip of iconPaths) {
      if (existsSync(ip)) {
        icnsPath = ip;
        break;
      }
    }
    
    if (!icnsPath) {
      // Versuche beliebige .icns Datei zu finden
      try {
        const found = execSync(
          `find "${appPath}/Contents/Resources" -name "*.icns" -maxdepth 1 2>/dev/null | head -1`,
          { encoding: 'utf-8' }
        ).trim();
        if (found) icnsPath = found;
      } catch {
        // Kein Icon gefunden
      }
    }
    
    if (!icnsPath) return null;
    
    // Mit sips zu PNG konvertieren (128x128)
    execSync(
      `sips -s format png "${icnsPath}" --out "${cachedPath}" --resampleWidth 128 2>/dev/null`,
      { encoding: 'utf-8' }
    );
    
    if (existsSync(cachedPath)) {
      console.log(`[Icons] Icon extrahiert: ${appName} -> ${cachedPath}`);
      return cachedPath;
    }
    
    return null;
  } catch (error) {
    console.error(`[Icons] Fehler beim Extrahieren des Icons fuer ${appName}:`, error);
    return null;
  }
}

// --------------------------------------------
// System Scanner Endpoint
// Scannt /Applications und ~/Applications nach installierten Apps
// Gibt jetzt auch Icon-URLs pro App zurueck
// --------------------------------------------

app.get('/api/system/installed-apps', async (_req: Request, res: Response) => {
  try {
    const { readdirSync, existsSync } = await import('fs');
    const { homedir } = await import('os');
    
    const apps = new Set<string>();
    
    // Scanne /Applications
    const systemAppsDir = '/Applications';
    if (existsSync(systemAppsDir)) {
      const entries = readdirSync(systemAppsDir);
      for (const entry of entries) {
        if (entry.endsWith('.app')) {
          apps.add(entry.replace(/\.app$/, ''));
        }
      }
    }
    
    // Scanne ~/Applications (User-spezifisch)
    const userAppsDir = `${homedir()}/Applications`;
    if (existsSync(userAppsDir)) {
      const entries = readdirSync(userAppsDir);
      for (const entry of entries) {
        if (entry.endsWith('.app')) {
          apps.add(entry.replace(/\.app$/, ''));
        }
      }
    }
    
    // Sortiere alphabetisch
    const sortedApps = Array.from(apps).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    
    // Fuer jede App Icon-URL generieren
    const appsWithIcons = sortedApps.map((name) => ({
      name,
      iconUrl: `http://127.0.0.1:${config.port}/api/system/app-icon?app=${encodeURIComponent(name)}`,
    }));
    
    console.log(`[API] System-Scan: ${sortedApps.length} Apps gefunden`);
    
    res.json({
      apps: sortedApps,
      appsDetailed: appsWithIcons,
      scannedDirectories: [systemAppsDir, userAppsDir],
      count: sortedApps.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Fehler beim System-Scan:', error);
    sendError(res, 500, 'SCAN_ERROR', 'System konnte nicht gescannt werden');
  }
});

// --------------------------------------------
// App-Icon Endpoint
// Extrahiert das Icon einer macOS-App und liefert es als PNG
// GET /api/system/app-icon?app=Spotify
// --------------------------------------------

app.get('/api/system/app-icon', async (req: Request, res: Response) => {
  try {
    const appName = req.query.app as string;
    if (!appName) {
      return sendError(res, 400, 'MISSING_PARAM', 'Parameter "app" ist erforderlich');
    }
    
    const { existsSync, readFileSync } = await import('fs');
    
    const iconPath = await extractAppIcon(appName);
    
    if (!iconPath || !existsSync(iconPath)) {
      // Kein Icon gefunden - 204 No Content (kein Fehler)
      return res.status(204).send();
    }
    
    // PNG als Response senden
    const iconData = readFileSync(iconPath);
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400'); // 24h Cache
    res.send(iconData);
  } catch (error) {
    console.error('[API] Fehler beim Icon-Abruf:', error);
    sendError(res, 500, 'ICON_ERROR', 'Icon konnte nicht geladen werden');
  }
});

// --------------------------------------------
// VNC-Status Endpoint
// Prüft ob VNC-Server erreichbar ist
// --------------------------------------------

app.get('/api/vnc/status', async (_req: Request, res: Response) => {
  try {
    // Kurze TCP-Verbindung zum VNC-Server testen
    const { createConnection } = await import('net');
    
    const isReachable = await new Promise<boolean>((resolve) => {
      const socket = createConnection({
        host: config.vncHost,
        port: config.vncPort,
        timeout: 2000,
      });

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });

    res.json({
      vncServer: `${config.vncHost}:${config.vncPort}`,
      isReachable,
      activeConnections: vncProxy.getActiveConnectionCount(),
    });
  } catch (error) {
    res.json({
      vncServer: `${config.vncHost}:${config.vncPort}`,
      isReachable: false,
      activeConnections: 0,
    });
  }
});

// --------------------------------------------
// Session-Cleanup: Abgelaufene Sessions entfernen
// Läuft alle 5 Minuten
// --------------------------------------------

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of sessions) {
    if (now - session.lastActivityAt.getTime() > config.sessionTimeoutMs) {
      sessions.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[Cleanup] ${cleaned} abgelaufene Session(s) entfernt`);
  }
}, 5 * 60 * 1000);

// --------------------------------------------
// Server starten
// HTTP-Server (nicht app.listen) weil WebSocket-Upgrade nötig
// --------------------------------------------

// ============================================
// Phase 3: Neue API Endpoints fuer WebRTC Streaming
// Window Management, Capture Control, Input Forwarding
// ============================================

// --------------------------------------------
// Window Management Endpoints
// Ermittelt Window-IDs und steuert Fensterposition
// --------------------------------------------

// GET /api/window/info?appName=... - Fenster-Infos abrufen
app.get('/api/window/info', async (req: Request, res: Response) => {
  const appName = req.query.appName as string;
  if (!appName) {
    return res.status(400).json({ error: 'MISSING_APP_NAME', message: 'appName Query-Parameter fehlt' });
  }

  const info = await getWindowInfo(appName);
  if (!info) {
    return res.status(404).json({ error: 'WINDOW_NOT_FOUND', message: `Kein Fenster fuer "${appName}" gefunden` });
  }

  return res.json(info);
});

// GET /api/window/list?appName=... - Alle Fenster einer App
app.get('/api/window/list', async (req: Request, res: Response) => {
  const appName = req.query.appName as string;
  if (!appName) {
    return res.status(400).json({ error: 'MISSING_APP_NAME', message: 'appName Query-Parameter fehlt' });
  }

  const windows = await getAllWindows(appName);
  return res.json({ windows });
});

// POST /api/window/hide - Fenster off-screen verschieben
app.post('/api/window/hide', async (req: Request, res: Response) => {
  const { appName, sessionId } = req.body;
  if (!appName) {
    return res.status(400).json({ error: 'MISSING_APP_NAME', message: 'appName fehlt' });
  }

  if (sessionId) touchSession(sessionId);

  const success = await hideWindow(appName);
  return res.json({ success, appName });
});

// POST /api/window/show - Fenster zurueck holen
app.post('/api/window/show', async (req: Request, res: Response) => {
  const { appName } = req.body;
  if (!appName) {
    return res.status(400).json({ error: 'MISSING_APP_NAME', message: 'appName fehlt' });
  }

  const success = await showWindow(appName);
  return res.json({ success, appName });
});

// --------------------------------------------
// Capture Management Endpoints
// Starten/Stoppen der Swift Helper Capture-Pipeline
// --------------------------------------------

// POST /api/capture/start - Capture starten
app.post('/api/capture/start', async (req: Request, res: Response) => {
  const { sessionId, windowId, appName, fps, bitrate } = req.body;

  if (!sessionId || !windowId) {
    return res.status(400).json({
      error: 'MISSING_PARAMS',
      message: 'sessionId und windowId sind erforderlich',
    });
  }

  try {
    const session = await captureManager.startCapture(
      sessionId,
      Number(windowId),
      appName || 'Unknown',
      fps ? Number(fps) : 30,
      bitrate ? Number(bitrate) : 5_000_000
    );

    return res.json(session);
  } catch (error) {
    return res.status(500).json({
      error: 'CAPTURE_START_FAILED',
      message: error instanceof Error ? error.message : 'Capture konnte nicht gestartet werden',
    });
  }
});

// POST /api/capture/stop - Capture stoppen
app.post('/api/capture/stop', async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ error: 'MISSING_SESSION_ID', message: 'sessionId fehlt' });
  }

  captureManager.stopCapture(sessionId);
  return res.json({ success: true, sessionId });
});

// GET /api/capture/status?sessionId=... - Capture-Status abfragen
app.get('/api/capture/status', (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (sessionId) {
    const session = captureManager.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Capture-Session nicht gefunden' });
    }
    return res.json(session);
  }

  // Alle Sessions zurueckgeben
  return res.json({ sessions: captureManager.getAllSessions() });
});

// --------------------------------------------
// Input Forwarding Endpoint
// Leitet Maus/Tastatur/Scroll Events an den Swift Helper
// --------------------------------------------

// POST /api/input - Input Event weiterleiten
app.post('/api/input', async (req: Request, res: Response) => {
  const event = validateInputEvent(req.body);
  if (!event) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      message: 'Ungueltiges Input-Event. Erforderlich: sessionId, eventType, und typ-spezifische Felder',
    });
  }

  const success = await inputRelay.sendInput(event);
  return res.json({ success });
});

// --------------------------------------------
// Erweiterter App-Launch mit Window Capture
// POST /api/app/launch-and-stream
// Startet App, versteckt Fenster, startet Capture
// Gibt Capture-Session mit WebSocket-Port zurueck
// --------------------------------------------

app.post('/api/app/launch-and-stream', async (req: Request, res: Response) => {
  const { appName, sessionId, fps, bitrate } = req.body;

  if (!appName || !sessionId) {
    return res.status(400).json({
      error: 'MISSING_PARAMS',
      message: 'appName und sessionId sind erforderlich',
    });
  }

  // Doppelte Calls verhindern (React StrictMode)
  const existingCapture = captureManager.getSession(sessionId);
  if (existingCapture && existingCapture.status === 'running') {
    console.log(`[LaunchAndStream] Session ${sessionId} laeuft bereits, ueberspringe`);
    return res.json({
      success: true,
      appName: existingCapture.appName,
      windowId: existingCapture.windowId,
      windowSize: { width: 1470, height: 856 },
      capture: existingCapture,
      streamUrl: `ws://127.0.0.1:${config.port}/ws/stream/${sessionId}`,
    });
  }

  touchSession(sessionId);

  try {
    // 1. App starten
    console.log(`[LaunchAndStream] Starte "${appName}"...`);
    const launchResult = await appManager.launchApp(appName);
    if (!launchResult.success) {
      return res.status(500).json({
        error: 'LAUNCH_FAILED',
        message: launchResult.message,
      });
    }

    // 2. Warten bis Fenster erscheint (Fenster muss sichtbar bleiben!)
    console.log(`[LaunchAndStream] Warte auf Fenster...`);
    const windowInfo = await waitForWindow(appName, 15000);
    if (!windowInfo) {
      return res.status(500).json({
        error: 'NO_WINDOW',
        message: `Fenster fuer "${appName}" nicht gefunden nach 15s`,
      });
    }
    console.log(`[LaunchAndStream] Fenster gefunden: ID=${windowInfo.windowId}, ${windowInfo.width}x${windowInfo.height}`);

    // 3. Capture starten BEVOR Fenster versteckt wird
    //    ScreenCaptureKit braucht ein aktiv gerendertes Fenster
    console.log(`[LaunchAndStream] Starte Capture...`);
    const captureSession = await captureManager.startCapture(
      sessionId,
      windowInfo.windowId,
      appName,
      fps ? Number(fps) : 30,
      bitrate ? Number(bitrate) : 5_000_000
    );

    // 4. Warten bis Capture stabil laeuft (2 Sekunden)
    console.log(`[LaunchAndStream] Warte auf stabilen Stream...`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Fenster verstecken: Hinter andere Fenster schieben
    //    NICHT off-screen (-10000) – das bricht den Stream!
    //    Stattdessen: App ausblenden (Cmd+H Aequivalent)
    console.log(`[LaunchAndStream] Verstecke Fenster...`);
    await hideAppWindow(appName);

    // 6. Session-Daten aktualisieren
    const session = sessions.get(sessionId);
    if (session) {
      session.activeApp = appName;
      session.lastActivityAt = new Date();
    }

    console.log(`[LaunchAndStream] Fertig! Stream auf Port ${captureSession.helperPort}`);

    return res.json({
      success: true,
      appName,
      windowId: windowInfo.windowId,
      windowSize: { width: windowInfo.width, height: windowInfo.height },
      capture: captureSession,
      streamUrl: `ws://127.0.0.1:${config.port}/ws/stream/${sessionId}`,
    });
  } catch (error) {
    console.error(`[LaunchAndStream] Fehler:`, error);
    return res.status(500).json({
      error: 'LAUNCH_STREAM_FAILED',
      message: error instanceof Error ? error.message : 'Launch-and-Stream fehlgeschlagen',
    });
  }
});

// ============================================
// Phase 4: Container-basiertes Web-App Streaming
// Docker Container mit Chromium + VNC
// ============================================

// --------------------------------------------
// Container starten: Oeffnet eine Web-App im Container
// POST /api/container/start
// Body: { appName, sessionId, url?, resolution? }
// --------------------------------------------

app.post('/api/container/start', async (req: Request, res: Response) => {
  const { appName, sessionId, url, resolution } = req.body;

  if (!appName || !sessionId) {
    return res.status(400).json({
      error: 'MISSING_PARAMS',
      message: 'appName und sessionId sind erforderlich',
    });
  }

  // Doppelte Calls verhindern (React StrictMode)
  const existing = containerManager.getSession(sessionId);
  if (existing && existing.status === 'running') {
    console.log(`[Container] Session ${sessionId} laeuft bereits`);
    return res.json({
      success: true,
      session: existing,
    });
  }

  try {
    console.log(`[Container] Starte "${appName}" (URL: ${url || 'auto'})...`);
    const session = await containerManager.startContainer(
      sessionId,
      appName,
      url,
      resolution || '1920x1080x24'
    );

    if (session.status === 'error') {
      return res.status(500).json({
        error: 'CONTAINER_START_FAILED',
        message: session.lastError,
        dockerAvailable: containerManager.isDockerAvailable(),
      });
    }

    console.log(`[Container] "${appName}" laeuft! VNC: ${session.vncPort}, WS: ${session.wsPort}`);

    return res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('[Container] Start fehlgeschlagen:', error);
    return res.status(500).json({
      error: 'CONTAINER_ERROR',
      message: error instanceof Error ? error.message : 'Container-Start fehlgeschlagen',
    });
  }
});

// --------------------------------------------
// Container stoppen
// POST /api/container/stop
// Body: { sessionId }
// --------------------------------------------

app.post('/api/container/stop', async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'MISSING_PARAMS', message: 'sessionId fehlt' });
  }

  await containerManager.stopContainer(sessionId);
  return res.json({ success: true });
});

// --------------------------------------------
// Container-Status abfragen
// GET /api/container/status/:sessionId
// --------------------------------------------

app.get('/api/container/status/:sessionId', (req: Request, res: Response) => {
  const session = containerManager.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Session nicht gefunden' });
  }
  return res.json({ success: true, session });
});

// --------------------------------------------
// Alle verfuegbaren Apps auflisten
// GET /api/container/apps
// --------------------------------------------

app.get('/api/container/apps', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    apps: containerManager.getAvailableApps(),
    dockerAvailable: containerManager.isDockerAvailable(),
  });
});

// --------------------------------------------
// Alle aktiven Container auflisten
// GET /api/container/sessions
// --------------------------------------------

app.get('/api/container/sessions', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    sessions: containerManager.getAllSessions(),
  });
});

// ============================================
// Server starten
// ============================================

httpServer.listen(config.port, bindHost, () => {
  console.log('');
  console.log('============================================');
  console.log('  LifeOS App Runner Service');
  console.log('============================================');
  console.log(`  Port:         ${config.port}`);
  console.log(`  VNC Target:   ${config.vncHost}:${config.vncPort}`);
  console.log(`  VNC Password: ${config.vncPassword ? '(gesetzt)' : '(nicht gesetzt)'}`);
  console.log(`  Screenshots:  ${config.screenshotDir}`);
  console.log(`  Binding:      ${bindHost}`);
  console.log('============================================');
  console.log('');
  console.log(`Server läuft auf http://${bindHost}:${config.port}`);
  console.log(`Docker:         ${containerManager.isDockerAvailable() ? 'verfuegbar' : 'NICHT VERFUEGBAR'}`);
  console.log(`Container API:  POST /api/container/start`);
  console.log(`VNC WebSocket:  ws://127.0.0.1:${config.port}/ws/vnc`);
  console.log('');
});

// --------------------------------------------
// Graceful Shutdown
// Schließt alle Verbindungen sauber
// --------------------------------------------

async function shutdown(): Promise<void> {
  console.log('\nShutdown wird eingeleitet...');

  // Phase 4: Docker Container stoppen
  await containerManager.stopAll();

  // Phase 3: Capture und Relay stoppen (Legacy)
  captureManager.stopAll();
  signalingRelay.shutdown();
  inputRelay.shutdown();

  // VNC-Proxy schließen (Legacy)
  await vncProxy.shutdown();

  // Dann HTTP-Server
  httpServer.close(() => {
    console.log('HTTP Server geschlossen');
    process.exit(0);
  });

  // Force shutdown nach 10 Sekunden
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Unhandled Errors loggen
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});
