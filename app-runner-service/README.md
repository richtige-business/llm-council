# LifeOS App Runner Service

VNC Gateway & Native-App-Steuerung für das LifeOS Desktop-Runner-Modul. Dieser Service ermöglicht das Streamen des macOS-Desktops in LifeOS-Tabs und die Steuerung nativer Apps.

## Schnellstart

```bash
cd app-runner-service
npm install
npm run dev
```

Der Service läuft dann auf **http://127.0.0.1:3002**.

## Voraussetzungen

- **Node.js** 18 oder höher
- **macOS Bildschirmfreigabe** (VNC) muss aktiviert sein

### macOS VNC einrichten

1. Öffne **Systemeinstellungen** > **Allgemein** > **Freigaben**
2. Aktiviere **Bildschirmfreigabe**
3. Klicke auf das (i)-Symbol und setze ein **VNC-Passwort**
4. Der VNC-Server läuft auf `localhost:5900`

## Konfiguration

| Variable | Standard | Beschreibung |
|----------|----------|-------------|
| `PORT` | 3002 | Server-Port |
| `VNC_HOST` | 127.0.0.1 | VNC-Server Host |
| `VNC_PORT` | 5900 | VNC-Server Port |
| `VNC_PASSWORD` | - | VNC-Passwort |
| `FRONTEND_URL` | - | Erlaubte Frontend-URL für CORS |
| `SCREENSHOT_DIR` | /tmp/lifeos-screenshots | Verzeichnis für Screenshots |

## API Endpoints

### Session Management

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/health` | GET | Health Check |
| `/api/session` | POST | Neue Session erstellen |
| `/api/session/:id` | GET | Session abrufen |
| `/api/session/:id` | DELETE | Session beenden |

### App Management

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/app/launch` | POST | App starten |
| `/api/app/close` | POST | App beenden |
| `/api/app/focus` | POST | App in Vordergrund |
| `/api/apps` | GET | Laufende Apps auflisten |

### Screenshot & VNC

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/screenshot` | GET | Screenshot des Bildschirms |
| `/api/vnc/status` | GET | VNC-Verbindungsstatus |
| `/ws/vnc` | WebSocket | VNC-Proxy (noVNC-kompatibel) |

## Sicherheit

- Service bindet nur auf `127.0.0.1` (nicht erreichbar von außen)
- Sessions laufen nach 30 Minuten ab
- VNC-Passwort sollte gesetzt werden
- Für Remote-Zugriff: VPN (Tailscale/WireGuard) verwenden

## Projektstruktur

```
app-runner-service/
├── src/
│   ├── index.ts           # Express Server & API Routes
│   ├── app-manager.ts     # macOS App-Steuerung (open, osascript)
│   ├── vnc-proxy.ts       # WebSocket <-> VNC TCP Proxy
│   └── types.ts           # TypeScript Interfaces
├── package.json
├── tsconfig.json
└── README.md
```
