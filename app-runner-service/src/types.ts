// ============================================
// types.ts - Typen für den App Runner Service
// 
// Zweck: Definiert alle Interfaces für Sessions,
//        Apps, VNC-Verbindungen und API Requests/Responses
// Verwendet von: index.ts, vnc-proxy.ts, app-manager.ts
// ============================================

// --------------------------------------------
// Service-Konfiguration
// Alle einstellbaren Parameter des Services
// --------------------------------------------

export interface ServiceConfig {
  port: number;                // Server-Port (Standard: 3002)
  vncHost: string;             // VNC-Server Host (Standard: 127.0.0.1)
  vncPort: number;             // VNC-Server Port (Standard: 5900)
  vncPassword: string | null;  // VNC-Passwort (optional)
  sessionTimeoutMs: number;    // Session-Timeout in Millisekunden
  maxSessions: number;         // Maximale gleichzeitige Sessions
  screenshotDir: string;       // Verzeichnis für Screenshots
}

// Standard-Konfiguration
export const DEFAULT_CONFIG: ServiceConfig = {
  port: 3002,
  vncHost: '127.0.0.1',
  vncPort: 5900,
  vncPassword: null,
  sessionTimeoutMs: 30 * 60 * 1000,  // 30 Minuten
  maxSessions: 5,
  screenshotDir: '/tmp/lifeos-screenshots',
};

// --------------------------------------------
// Session-Typen
// Repräsentiert eine aktive Desktop-Streaming-Session
// --------------------------------------------

export interface DesktopSession {
  id: string;                  // Eindeutige Session-ID
  createdAt: Date;             // Erstellungszeitpunkt
  lastActivityAt: Date;        // Letzte Aktivität (für Timeout)
  isConnected: boolean;        // VNC-Verbindung aktiv?
  activeApp: string | null;    // Aktuell gesteuerte App (oder null)
}

// --------------------------------------------
// App-Typen
// Informationen über laufende macOS-Apps
// --------------------------------------------

export interface RunningApp {
  name: string;                // App-Name (z.B. "Microsoft Excel")
  bundleId: string;            // Bundle-ID (z.B. "com.microsoft.Excel")
  pid: number;                 // Prozess-ID
  isActive: boolean;           // Ist die App im Vordergrund?
}

export interface AppInfo {
  name: string;                // App-Name
  path: string;                // Pfad zur App
  icon?: string;               // Base64-encodiertes Icon (optional)
}

// --------------------------------------------
// API Request-Typen
// Eingehende Anfragen an den Service
// --------------------------------------------

export interface CreateSessionRequest {
  vncPassword?: string;        // VNC-Passwort (überschreibt Config)
}

export interface LaunchAppRequest {
  appName: string;             // Name der zu startenden App
  sessionId: string;           // Zugehörige Session
}

export interface CloseAppRequest {
  appName: string;             // Name der zu beendenden App
  sessionId: string;           // Zugehörige Session
}

export interface ScreenshotRequest {
  sessionId: string;           // Session-ID
  region?: {                   // Optional: Nur einen Bereich erfassen
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// --------------------------------------------
// API Response-Typen
// Antworten des Services
// --------------------------------------------

export interface SessionResponse {
  sessionId: string;
  createdAt: string;
  isConnected: boolean;
  activeApp: string | null;
}

export interface AppListResponse {
  apps: RunningApp[];
}

export interface ScreenshotResponse {
  screenshot: string;          // Base64-encodiertes PNG
  timestamp: string;
  width: number;
  height: number;
}

export interface LaunchAppResponse {
  success: boolean;
  appName: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
}

// --------------------------------------------
// VNC-Proxy-Typen
// WebSocket-Verbindung zwischen Frontend und VNC
// --------------------------------------------

export interface VncProxyConfig {
  targetHost: string;          // VNC-Server Host
  targetPort: number;          // VNC-Server Port
  password: string | null;     // VNC-Passwort
}
