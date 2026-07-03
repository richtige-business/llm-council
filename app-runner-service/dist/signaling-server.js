// ============================================
// signaling-server.ts - WebSocket Relay fuer Browser<->Helper
//
// Zweck: Leitet WebSocket-Nachrichten zwischen dem Browser
//        (Frontend) und dem Swift Helper weiter.
//        Der Browser verbindet sich hier, dieser Server
//        verbindet sich zum Swift Helper's WebSocket.
// Verwendet von: index.ts (WebSocket Upgrade)
// ============================================
import WebSocket, { WebSocketServer } from 'ws';
import { captureManager } from './capture-manager.js';
// --------------------------------------------
// SignalingRelay
// Bidirektionaler WebSocket-Relay:
// Browser <-> Node.js (dieses Modul) <-> Swift Helper
// --------------------------------------------
class SignalingRelay {
    // WebSocket Server (fuer Browser-Verbindungen)
    wss = null;
    // Aktive Relays: sessionId -> { browserWs, helperWs }
    relays = new Map();
    // --------------------------------------------
    // Relay an HTTP-Server binden
    // Lauscht auf WebSocket-Upgrades unter /ws/stream/:sessionId
    //
    // Parameter:
    //   server - HTTP Server Instanz
    // --------------------------------------------
    attachToServer(_server) {
        this.wss = new WebSocketServer({ noServer: true });
        console.log('[SignalingRelay] WebSocket-Server bereit (noServer-Modus)');
    }
    // Upgrade-Request manuell verarbeiten (aufgerufen von index.ts)
    // Gibt true zurueck wenn der Pfad passt und verarbeitet wird
    handleUpgrade(request, socket, head) {
        const url = request.url || '';
        const match = url.match(/^\/ws\/stream\/(.+?)(?:\?.*)?$/);
        if (!match)
            return false;
        const sessionId = match[1];
        console.log(`[SignalingRelay] Upgrade-Request fuer Session ${sessionId}`);
        this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.handleBrowserConnection(ws, sessionId);
        });
        return true;
    }
    // --------------------------------------------
    // Browser-Verbindung verarbeiten
    // Erstellt Relay zum Swift Helper wenn noetig
    // --------------------------------------------
    handleBrowserConnection(browserWs, sessionId) {
        console.log(`[SignalingRelay] Browser verbunden fuer Session ${sessionId}`);
        // Capture-Session pruefen
        const captureSession = captureManager.getSession(sessionId);
        if (!captureSession) {
            console.warn(`[SignalingRelay] Keine Capture-Session fuer ${sessionId}`);
            browserWs.close(4004, 'Keine Capture-Session gefunden');
            return;
        }
        // Relay erstellen oder erweitern
        let relay = this.relays.get(sessionId);
        if (!relay) {
            relay = {
                browserConnections: new Set(),
                helperWs: null,
                helperPort: captureSession.helperPort,
            };
            this.relays.set(sessionId, relay);
        }
        // Browser-Verbindung registrieren
        relay.browserConnections.add(browserWs);
        // Zum Helper verbinden wenn noch nicht geschehen
        if (!relay.helperWs || relay.helperWs.readyState !== WebSocket.OPEN) {
            this.connectToHelper(sessionId, relay);
        }
        // Nachrichten vom Browser an den Helper weiterleiten
        browserWs.on('message', (data) => {
            if (relay?.helperWs?.readyState === WebSocket.OPEN) {
                // Nachricht direkt weiterleiten (Text oder Binary)
                relay.helperWs.send(data);
            }
        });
        // Browser-Verbindung geschlossen
        browserWs.on('close', () => {
            console.log(`[SignalingRelay] Browser getrennt fuer Session ${sessionId}`);
            relay?.browserConnections.delete(browserWs);
            // Wenn keine Browser mehr verbunden: Helper-Verbindung schliessen
            if (relay && relay.browserConnections.size === 0) {
                relay.helperWs?.close();
                this.relays.delete(sessionId);
            }
        });
        browserWs.on('error', (error) => {
            console.error(`[SignalingRelay] Browser-WebSocket-Fehler:`, error);
            relay?.browserConnections.delete(browserWs);
        });
    }
    // --------------------------------------------
    // Zum Swift Helper verbinden
    // Erstellt WebSocket-Verbindung zum Helper-Prozess
    // und leitet Nachrichten an alle Browser weiter
    // --------------------------------------------
    connectToHelper(sessionId, relay) {
        const helperUrl = `ws://127.0.0.1:${relay.helperPort}`;
        console.log(`[SignalingRelay] Verbinde zu Helper: ${helperUrl}`);
        const helperWs = new WebSocket(helperUrl);
        relay.helperWs = helperWs;
        helperWs.binaryType = 'arraybuffer';
        helperWs.on('open', () => {
            console.log(`[SignalingRelay] Mit Helper verbunden (Port ${relay.helperPort})`);
            // Info an alle Browser senden
            const msg = JSON.stringify({
                type: 'helper-connected',
                port: relay.helperPort,
            });
            for (const browser of relay.browserConnections) {
                if (browser.readyState === WebSocket.OPEN) {
                    browser.send(msg);
                }
            }
        });
        // Nachrichten vom Helper an alle Browser weiterleiten
        helperWs.on('message', (data) => {
            for (const browser of relay.browserConnections) {
                if (browser.readyState === WebSocket.OPEN) {
                    // Direkt weiterleiten (Binary Video-Frames oder Text-JSON)
                    browser.send(data);
                }
            }
        });
        helperWs.on('close', () => {
            console.log(`[SignalingRelay] Helper-Verbindung geschlossen`);
            relay.helperWs = null;
            // Info an Browser senden
            const msg = JSON.stringify({ type: 'helper-disconnected' });
            for (const browser of relay.browserConnections) {
                if (browser.readyState === WebSocket.OPEN) {
                    browser.send(msg);
                }
            }
        });
        helperWs.on('error', (error) => {
            console.error(`[SignalingRelay] Helper-WebSocket-Fehler:`, error);
            relay.helperWs = null;
            // Retry nach 2 Sekunden
            setTimeout(() => {
                const currentRelay = this.relays.get(sessionId);
                if (currentRelay && currentRelay.browserConnections.size > 0) {
                    console.log(`[SignalingRelay] Retry Helper-Verbindung...`);
                    this.connectToHelper(sessionId, currentRelay);
                }
            }, 2000);
        });
    }
    // --------------------------------------------
    // Alle Relays schliessen (fuer Shutdown)
    // --------------------------------------------
    shutdown() {
        for (const [, relay] of this.relays) {
            relay.helperWs?.close();
            for (const browser of relay.browserConnections) {
                browser.close();
            }
        }
        this.relays.clear();
        this.wss?.close();
        console.log('[SignalingRelay] Heruntergefahren');
    }
}
// Singleton exportieren
export const signalingRelay = new SignalingRelay();
//# sourceMappingURL=signaling-server.js.map