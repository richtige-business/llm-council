// ============================================
// input-relay.ts - Input Event Relay zum Swift Helper
//
// Zweck: Empfaengt Input-Events (Maus/Tastatur/Scroll)
//        vom Browser via REST API und leitet sie
//        an den richtigen Swift Helper weiter.
// Verwendet von: index.ts (POST /api/input)
// ============================================
import WebSocket from 'ws';
import { captureManager } from './capture-manager.js';
// --------------------------------------------
// InputRelay
// Haelt WebSocket-Verbindungen zu Helper-Prozessen
// und leitet Input-Events weiter
// --------------------------------------------
class InputRelay {
    // WebSocket-Verbindungen zu Helpern: sessionId -> WebSocket
    helperConnections = new Map();
    // --------------------------------------------
    // Input-Event weiterleiten
    // Verbindet sich bei Bedarf zum Helper und sendet das Event
    //
    // Parameter:
    //   event - Input Event vom Browser
    // Rueckgabe:
    //   true wenn erfolgreich gesendet
    // --------------------------------------------
    async sendInput(event) {
        const session = captureManager.getSession(event.sessionId);
        if (!session || session.status !== 'running') {
            console.warn(`[InputRelay] Keine laufende Session: ${event.sessionId}`);
            return false;
        }
        // WebSocket-Verbindung zum Helper herstellen/wiederverwenden
        let ws = this.helperConnections.get(event.sessionId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            ws = await this.connectToHelper(event.sessionId, session.helperPort);
            if (!ws)
                return false;
        }
        // Input-Event als JSON an den Helper senden
        const message = JSON.stringify({
            type: 'input',
            data: {
                eventType: event.eventType,
                x: 'x' in event ? event.x : undefined,
                y: 'y' in event ? event.y : undefined,
                button: 'button' in event ? event.button : undefined,
                deltaX: 'deltaX' in event ? event.deltaX : undefined,
                deltaY: 'deltaY' in event ? event.deltaY : undefined,
                keyCode: 'keyCode' in event ? event.keyCode : undefined,
                key: 'key' in event ? event.key : undefined,
                modifiers: 'modifiers' in event ? event.modifiers : undefined,
            },
        });
        try {
            ws.send(message);
            return true;
        }
        catch (error) {
            console.error(`[InputRelay] Sendefehler:`, error);
            this.helperConnections.delete(event.sessionId);
            return false;
        }
    }
    // --------------------------------------------
    // Zum Helper-WebSocket verbinden
    // --------------------------------------------
    async connectToHelper(sessionId, port) {
        return new Promise((resolve) => {
            const url = `ws://127.0.0.1:${port}`;
            const ws = new WebSocket(url);
            const timeout = setTimeout(() => {
                ws.close();
                resolve(undefined);
            }, 3000);
            ws.on('open', () => {
                clearTimeout(timeout);
                this.helperConnections.set(sessionId, ws);
                console.log(`[InputRelay] Mit Helper verbunden (Port ${port})`);
                resolve(ws);
            });
            ws.on('error', () => {
                clearTimeout(timeout);
                resolve(undefined);
            });
            ws.on('close', () => {
                this.helperConnections.delete(sessionId);
            });
        });
    }
    // --------------------------------------------
    // Alle Verbindungen schliessen (fuer Shutdown)
    // --------------------------------------------
    shutdown() {
        for (const [, ws] of this.helperConnections) {
            ws.close();
        }
        this.helperConnections.clear();
    }
}
// Singleton exportieren
export const inputRelay = new InputRelay();
// --------------------------------------------
// validateInputEvent - Input-Event validieren
// Prueft ob alle erforderlichen Felder vorhanden sind
//
// Parameter:
//   body - Request Body
// Rueckgabe:
//   Validiertes InputEvent oder null
// --------------------------------------------
export function validateInputEvent(body) {
    const { sessionId, eventType } = body;
    if (typeof sessionId !== 'string' || !sessionId)
        return null;
    if (typeof eventType !== 'string')
        return null;
    switch (eventType) {
        case 'mousedown':
        case 'mouseup':
        case 'mousemove': {
            const x = Number(body.x);
            const y = Number(body.y);
            if (isNaN(x) || isNaN(y))
                return null;
            return {
                sessionId,
                eventType,
                x,
                y,
                button: typeof body.button === 'number' ? body.button : 0,
            };
        }
        case 'scroll': {
            const x = Number(body.x);
            const y = Number(body.y);
            const deltaX = Number(body.deltaX);
            const deltaY = Number(body.deltaY);
            if (isNaN(x) || isNaN(y))
                return null;
            return {
                sessionId,
                eventType,
                x,
                y,
                deltaX: isNaN(deltaX) ? 0 : deltaX,
                deltaY: isNaN(deltaY) ? 0 : deltaY,
            };
        }
        case 'keydown':
        case 'keyup': {
            const keyCode = Number(body.keyCode);
            if (isNaN(keyCode))
                return null;
            return {
                sessionId,
                eventType,
                keyCode,
                key: typeof body.key === 'string' ? body.key : undefined,
                modifiers: Array.isArray(body.modifiers) ? body.modifiers : undefined,
            };
        }
        default:
            return null;
    }
}
//# sourceMappingURL=input-relay.js.map