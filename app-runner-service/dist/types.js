// ============================================
// types.ts - Typen für den App Runner Service
// 
// Zweck: Definiert alle Interfaces für Sessions,
//        Apps, VNC-Verbindungen und API Requests/Responses
// Verwendet von: index.ts, vnc-proxy.ts, app-manager.ts
// ============================================
// Standard-Konfiguration
export const DEFAULT_CONFIG = {
    port: 3002,
    vncHost: '127.0.0.1',
    vncPort: 5900,
    vncPassword: null,
    sessionTimeoutMs: 30 * 60 * 1000, // 30 Minuten
    maxSessions: 5,
    screenshotDir: '/tmp/lifeos-screenshots',
};
//# sourceMappingURL=types.js.map