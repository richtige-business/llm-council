// ============================================
// capture-manager.ts - Swift Helper Lifecycle Management
//
// Zweck: Startet, ueberwacht und beendet den Swift
//        LifeOSCapture Helper-Prozess. Verwaltet
//        mehrere Capture-Sessions gleichzeitig.
// Verwendet von: index.ts (API Endpoints)
// ============================================
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
// ESM-kompatibler __dirname Ersatz
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --------------------------------------------
// CaptureManager
// Verwaltet Swift Helper Prozesse
// --------------------------------------------
class CaptureManager {
    // Aktive Sessions: sessionId -> CaptureSession + ChildProcess
    sessions = new Map();
    // Pfad zum Swift Helper Binary
    helperPath;
    // Port-Range fuer Helper WebSocket Server (9090-9099)
    nextPort = 9090;
    maxPort = 9099;
    constructor() {
        // Helper Binary suchen
        // 1. Neben dem App Runner Service
        // 2. Im capture-helper Build-Verzeichnis
        const candidates = [
            path.join(__dirname, '..', 'bin', 'LifeOSCapture'),
            path.join(__dirname, '..', 'capture-helper', '.build', 'release', 'LifeOSCapture'),
            path.join(__dirname, '..', 'capture-helper', '.build', 'debug', 'LifeOSCapture'),
        ];
        this.helperPath = candidates.find(p => fs.existsSync(p)) || candidates[0];
        console.log(`[CaptureManager] Helper-Pfad: ${this.helperPath}`);
        // Alte Helper-Prozesse beim Start bereinigen
        this.cleanupOldHelpers();
    }
    // --------------------------------------------
    // Alte Helper-Prozesse killen
    // Verhindert Port-Konflikte beim Neustart
    // --------------------------------------------
    cleanupOldHelpers() {
        try {
            const { execSync } = require('child_process');
            // Alle alten LifeOSCapture Prozesse killen
            execSync('pkill -f LifeOSCapture 2>/dev/null || true', { timeout: 3000 });
            console.log('[CaptureManager] Alte Helper-Prozesse bereinigt');
        }
        catch {
            // Ignorieren – kein alter Prozess vorhanden
        }
    }
    // --------------------------------------------
    // Capture starten
    // Startet den Swift Helper fuer ein bestimmtes Fenster
    //
    // Parameter:
    //   sessionId - Eindeutige Session-ID
    //   windowId - CGWindowID des Zielfensters
    //   appName - Name der App (fuer Logging)
    //   fps - Framerate (Standard: 30)
    //   bitrate - Bitrate in bps (Standard: 5000000)
    // Rueckgabe:
    //   CaptureSession mit Port und Status
    // --------------------------------------------
    async startCapture(sessionId, windowId, appName, fps = 30, bitrate = 5_000_000) {
        // Pruefen ob Session bereits existiert
        if (this.sessions.has(sessionId)) {
            const existing = this.sessions.get(sessionId);
            if (existing.session.status === 'running') {
                return existing.session;
            }
            // Alte Session aufraumen
            this.stopCapture(sessionId);
        }
        // Naechsten freien Port finden
        const port = this.getNextPort();
        // Session erstellen
        const session = {
            sessionId,
            windowId,
            appName,
            helperPort: port,
            helperPid: null,
            status: 'starting',
            startedAt: Date.now(),
            lastError: null,
            fps,
            bitrate,
        };
        // Pruefen ob Helper Binary existiert
        if (!fs.existsSync(this.helperPath)) {
            session.status = 'error';
            session.lastError = `Helper Binary nicht gefunden: ${this.helperPath}. Bitte zuerst bauen: cd capture-helper && swift build -c release`;
            this.sessions.set(sessionId, { session, process: null });
            console.error(`[CaptureManager] ${session.lastError}`);
            return session;
        }
        // Swift Helper Prozess starten
        const helperProcess = spawn(this.helperPath, [
            '--window-id', String(windowId),
            '--port', String(port),
            '--fps', String(fps),
            '--bitrate', String(bitrate),
            '--verbose',
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        session.helperPid = helperProcess.pid || null;
        this.sessions.set(sessionId, { session, process: helperProcess });
        console.log(`[CaptureManager] Helper gestartet: PID=${helperProcess.pid}, Port=${port}, Window=${windowId}`);
        // stdout: Strukturierte JSON-Nachrichten vom Helper
        helperProcess.stdout?.on('data', (data) => {
            const lines = data.toString().split('\n').filter(l => l.trim());
            for (const line of lines) {
                try {
                    const msg = JSON.parse(line);
                    this.handleHelperMessage(sessionId, msg);
                }
                catch {
                    // Keine JSON-Zeile, ignorieren
                }
            }
        });
        // stderr: Log-Nachrichten vom Helper
        helperProcess.stderr?.on('data', (data) => {
            const text = data.toString().trim();
            if (text) {
                console.log(`[Helper:${sessionId.slice(0, 8)}] ${text}`);
            }
        });
        // Prozess-Ende behandeln
        helperProcess.on('exit', (code, signal) => {
            console.log(`[CaptureManager] Helper beendet: code=${code}, signal=${signal}`);
            const entry = this.sessions.get(sessionId);
            if (entry) {
                entry.session.status = code === 0 ? 'stopped' : 'error';
                if (code !== 0) {
                    entry.session.lastError = `Helper beendet mit Code ${code}`;
                }
                entry.process = null;
            }
        });
        helperProcess.on('error', (error) => {
            console.error(`[CaptureManager] Helper-Fehler:`, error);
            const entry = this.sessions.get(sessionId);
            if (entry) {
                entry.session.status = 'error';
                entry.session.lastError = error.message;
            }
        });
        // Warten bis Helper "ready" oder "streaming" meldet (max 10s)
        await this.waitForHelperReady(sessionId, 10000);
        return this.sessions.get(sessionId)?.session || session;
    }
    // --------------------------------------------
    // Capture stoppen
    // Beendet den Swift Helper Prozess
    //
    // Parameter:
    //   sessionId - Session-ID
    // --------------------------------------------
    stopCapture(sessionId) {
        const entry = this.sessions.get(sessionId);
        if (!entry)
            return;
        if (entry.process) {
            console.log(`[CaptureManager] Stoppe Helper fuer Session ${sessionId}`);
            entry.process.kill('SIGTERM');
            // Nach 3s SIGKILL wenn noch nicht beendet
            setTimeout(() => {
                if (entry.process && !entry.process.killed) {
                    entry.process.kill('SIGKILL');
                }
            }, 3000);
        }
        entry.session.status = 'stopped';
        this.sessions.delete(sessionId);
    }
    // --------------------------------------------
    // Session-Status abrufen
    // Rueckgabe: CaptureSession oder null
    // --------------------------------------------
    getSession(sessionId) {
        return this.sessions.get(sessionId)?.session || null;
    }
    // --------------------------------------------
    // Alle Sessions auflisten
    // --------------------------------------------
    getAllSessions() {
        return Array.from(this.sessions.values()).map(e => e.session);
    }
    // --------------------------------------------
    // Alle Sessions beenden (fuer Shutdown)
    // --------------------------------------------
    stopAll() {
        for (const [id] of this.sessions) {
            this.stopCapture(id);
        }
    }
    // --------------------------------------------
    // Helper-Nachricht verarbeiten
    // JSON-Nachrichten die der Helper auf stdout sendet
    // --------------------------------------------
    handleHelperMessage(sessionId, msg) {
        const entry = this.sessions.get(sessionId);
        if (!entry)
            return;
        switch (msg.type) {
            case 'ready':
                console.log(`[CaptureManager] Helper bereit: ${JSON.stringify(msg)}`);
                entry.session.status = 'running';
                break;
            case 'streaming':
                console.log(`[CaptureManager] Helper streamt: ${msg.fps}fps`);
                entry.session.status = 'running';
                break;
            case 'error':
                console.error(`[CaptureManager] Helper-Fehler: ${msg.message}`);
                entry.session.status = 'error';
                entry.session.lastError = msg.message;
                break;
            case 'stopped':
                entry.session.status = 'stopped';
                break;
        }
    }
    // --------------------------------------------
    // Warten bis Helper bereit ist
    // Pollt den Session-Status
    // --------------------------------------------
    async waitForHelperReady(sessionId, timeoutMs) {
        const startTime = Date.now();
        const pollInterval = 200;
        while (Date.now() - startTime < timeoutMs) {
            const entry = this.sessions.get(sessionId);
            if (!entry)
                return;
            if (entry.session.status === 'running')
                return;
            if (entry.session.status === 'error')
                return;
            if (entry.session.status === 'stopped')
                return;
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        console.warn(`[CaptureManager] Timeout beim Warten auf Helper-Ready`);
    }
    // --------------------------------------------
    // Naechsten freien Port finden
    // Einfaches Round-Robin im Range 9090-9099
    // --------------------------------------------
    getNextPort() {
        // Port waehlen und zum naechsten weiter
        const port = this.nextPort;
        this.nextPort = this.nextPort >= this.maxPort ? 9090 : this.nextPort + 1;
        // Pruefen ob Port von einer laufenden Session belegt ist
        for (const [, entry] of this.sessions) {
            if (entry.session.helperPort === port && entry.session.status === 'running') {
                // Port belegt, naechsten versuchen
                return this.getNextPort();
            }
        }
        return port;
    }
}
// Singleton-Instanz exportieren
export const captureManager = new CaptureManager();
//# sourceMappingURL=capture-manager.js.map