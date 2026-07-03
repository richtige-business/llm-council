// ============================================
// vnc-proxy.ts - WebSocket-zu-VNC Proxy
// 
// Zweck: Verbindet den noVNC Web-Client (WebSocket)
//        mit dem nativen VNC-Server (TCP)
//        Protokoll-Translation: WebSocket <-> TCP/RFB
// Verwendet von: index.ts (WebSocket-Upgrade)
// ============================================
import { WebSocket, WebSocketServer } from 'ws';
import { createConnection } from 'net';
// --------------------------------------------
// Klasse: VncProxy
// Leitet WebSocket-Traffic an den VNC-Server weiter
// und umgekehrt (bidirektionaler Proxy)
// --------------------------------------------
export class VncProxy {
    wss;
    config;
    activeConnections = new Map();
    constructor(server, config) {
        this.config = config;
        // WebSocket-Server erstellen mit noServer: true
        // WICHTIG: Nicht direkt an den HTTP-Server binden!
        // Sonst werden alle anderen WebSocket-Pfade gekillt.
        // Das Upgrade wird jetzt zentral in index.ts koordiniert.
        this.wss = new WebSocketServer({ noServer: true });
        // Bei neuer WebSocket-Verbindung: VNC-Proxy starten
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        console.log('[VncProxy] WebSocket-Server gestartet auf /ws/vnc');
    }
    // Upgrade-Request manuell verarbeiten (aufgerufen von index.ts)
    handleUpgrade(request, socket, head) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
        });
    }
    // ----------------------------------------
    // Neue WebSocket-Verbindung verarbeiten
    // Stellt TCP-Verbindung zum VNC-Server her
    // und leitet Daten bidirektional weiter
    // ----------------------------------------
    handleConnection(ws, req) {
        const connectionId = `vnc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const clientIp = req.socket.remoteAddress;
        console.log(`[VncProxy] Neue Verbindung: ${connectionId} von ${clientIp}`);
        // TCP-Verbindung zum VNC-Server aufbauen
        const tcpSocket = createConnection({
            host: this.config.targetHost,
            port: this.config.targetPort,
        });
        // Verbindung speichern für Cleanup
        this.activeConnections.set(connectionId, { ws, tcp: tcpSocket });
        // ---- TCP -> WebSocket (VNC-Server sendet Daten an Client) ----
        tcpSocket.on('data', (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(data);
                }
                catch (error) {
                    console.error(`[VncProxy] Fehler beim Senden an WebSocket (${connectionId}):`, error);
                }
            }
        });
        // ---- WebSocket -> TCP (Client sendet Daten an VNC-Server) ----
        ws.on('message', (data) => {
            if (tcpSocket.writable) {
                try {
                    // WebSocket-Daten können verschiedene Formate haben
                    if (Buffer.isBuffer(data)) {
                        tcpSocket.write(data);
                    }
                    else if (data instanceof ArrayBuffer) {
                        tcpSocket.write(Buffer.from(data));
                    }
                    else if (Array.isArray(data)) {
                        tcpSocket.write(Buffer.concat(data));
                    }
                }
                catch (error) {
                    console.error(`[VncProxy] Fehler beim Senden an TCP (${connectionId}):`, error);
                }
            }
        });
        // ---- Fehlerbehandlung und Cleanup ----
        // TCP-Verbindung erfolgreich hergestellt
        tcpSocket.on('connect', () => {
            console.log(`[VncProxy] TCP-Verbindung zu VNC-Server hergestellt (${connectionId})`);
        });
        // TCP-Fehler -> WebSocket schließen
        tcpSocket.on('error', (error) => {
            console.error(`[VncProxy] TCP-Fehler (${connectionId}):`, error.message);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1011, 'VNC-Server Verbindungsfehler');
            }
            this.cleanup(connectionId);
        });
        // TCP geschlossen -> WebSocket schließen
        tcpSocket.on('close', () => {
            console.log(`[VncProxy] TCP-Verbindung geschlossen (${connectionId})`);
            if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'VNC-Server hat Verbindung geschlossen');
            }
            this.cleanup(connectionId);
        });
        // WebSocket-Fehler -> TCP schließen
        ws.on('error', (error) => {
            console.error(`[VncProxy] WebSocket-Fehler (${connectionId}):`, error.message);
            tcpSocket.destroy();
            this.cleanup(connectionId);
        });
        // WebSocket geschlossen -> TCP schließen
        ws.on('close', () => {
            console.log(`[VncProxy] WebSocket-Verbindung geschlossen (${connectionId})`);
            tcpSocket.destroy();
            this.cleanup(connectionId);
        });
    }
    // ----------------------------------------
    // Verbindung aufräumen
    // Entfernt die Verbindung aus der Map
    // ----------------------------------------
    cleanup(connectionId) {
        const connection = this.activeConnections.get(connectionId);
        if (connection) {
            // Sicherstellen dass beide Seiten geschlossen sind
            if (connection.tcp.writable) {
                connection.tcp.destroy();
            }
            if (connection.ws.readyState === WebSocket.OPEN) {
                connection.ws.close();
            }
            this.activeConnections.delete(connectionId);
        }
    }
    // ----------------------------------------
    // Alle aktiven Verbindungen zählen
    // Für Health-Check und Monitoring
    // ----------------------------------------
    getActiveConnectionCount() {
        return this.activeConnections.size;
    }
    // ----------------------------------------
    // Alle Verbindungen schließen (für Shutdown)
    // ----------------------------------------
    async shutdown() {
        console.log(`[VncProxy] Schließe ${this.activeConnections.size} aktive Verbindungen...`);
        for (const [id, connection] of this.activeConnections) {
            connection.tcp.destroy();
            connection.ws.close(1001, 'Server wird heruntergefahren');
            this.activeConnections.delete(id);
        }
        return new Promise((resolve) => {
            this.wss.close(() => {
                console.log('[VncProxy] WebSocket-Server geschlossen');
                resolve();
            });
        });
    }
}
//# sourceMappingURL=vnc-proxy.js.map