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
// Input Event Typen
// Definiert die Struktur der Events vom Browser
// --------------------------------------------

export interface MouseInputEvent {
  sessionId: string;
  eventType: 'mousedown' | 'mouseup' | 'mousemove';
  x: number;           // X-Position relativ zum Fenster
  y: number;           // Y-Position relativ zum Fenster
  button?: number;     // 0=links, 1=mitte, 2=rechts
}

export interface ScrollInputEvent {
  sessionId: string;
  eventType: 'scroll';
  x: number;
  y: number;
  deltaX: number;      // Horizontaler Scroll-Betrag
  deltaY: number;      // Vertikaler Scroll-Betrag
}

export interface KeyInputEvent {
  sessionId: string;
  eventType: 'keydown' | 'keyup';
  keyCode: number;     // macOS Virtual Key Code
  key?: string;        // Key-Name (fuer Logging)
  modifiers?: string[]; // ["shift", "ctrl", "alt", "cmd"]
}

export type InputEvent = MouseInputEvent | ScrollInputEvent | KeyInputEvent;

// --------------------------------------------
// InputRelay
// Haelt WebSocket-Verbindungen zu Helper-Prozessen
// und leitet Input-Events weiter
// --------------------------------------------

class InputRelay {
  // WebSocket-Verbindungen zu Helpern: sessionId -> WebSocket
  private helperConnections: Map<string, WebSocket> = new Map();

  // --------------------------------------------
  // Input-Event weiterleiten
  // Verbindet sich bei Bedarf zum Helper und sendet das Event
  //
  // Parameter:
  //   event - Input Event vom Browser
  // Rueckgabe:
  //   true wenn erfolgreich gesendet
  // --------------------------------------------

  async sendInput(event: InputEvent): Promise<boolean> {
    const session = captureManager.getSession(event.sessionId);
    if (!session || session.status !== 'running') {
      console.warn(`[InputRelay] Keine laufende Session: ${event.sessionId}`);
      return false;
    }

    // WebSocket-Verbindung zum Helper herstellen/wiederverwenden
    let ws = this.helperConnections.get(event.sessionId);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      ws = await this.connectToHelper(event.sessionId, session.helperPort);
      if (!ws) return false;
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
    } catch (error) {
      console.error(`[InputRelay] Sendefehler:`, error);
      this.helperConnections.delete(event.sessionId);
      return false;
    }
  }

  // --------------------------------------------
  // Zum Helper-WebSocket verbinden
  // --------------------------------------------

  private async connectToHelper(sessionId: string, port: number): Promise<WebSocket | undefined> {
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

  shutdown(): void {
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

export function validateInputEvent(body: Record<string, unknown>): InputEvent | null {
  const { sessionId, eventType } = body;

  if (typeof sessionId !== 'string' || !sessionId) return null;
  if (typeof eventType !== 'string') return null;

  switch (eventType) {
    case 'mousedown':
    case 'mouseup':
    case 'mousemove': {
      const x = Number(body.x);
      const y = Number(body.y);
      if (isNaN(x) || isNaN(y)) return null;
      return {
        sessionId,
        eventType,
        x,
        y,
        button: typeof body.button === 'number' ? body.button : 0,
      } as MouseInputEvent;
    }

    case 'scroll': {
      const x = Number(body.x);
      const y = Number(body.y);
      const deltaX = Number(body.deltaX);
      const deltaY = Number(body.deltaY);
      if (isNaN(x) || isNaN(y)) return null;
      return {
        sessionId,
        eventType,
        x,
        y,
        deltaX: isNaN(deltaX) ? 0 : deltaX,
        deltaY: isNaN(deltaY) ? 0 : deltaY,
      } as ScrollInputEvent;
    }

    case 'keydown':
    case 'keyup': {
      const keyCode = Number(body.keyCode);
      if (isNaN(keyCode)) return null;
      return {
        sessionId,
        eventType,
        keyCode,
        key: typeof body.key === 'string' ? body.key : undefined,
        modifiers: Array.isArray(body.modifiers) ? body.modifiers : undefined,
      } as KeyInputEvent;
    }

    default:
      return null;
  }
}
