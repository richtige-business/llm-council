# LifeOS Browser Service

Playwright-basierter Browser-Service für das LifeOS Browser-Modul. Dieser Service ermöglicht die Fernsteuerung eines echten Chromium-Browsers mit Screenshot-Rendering und Interaktions-Support.

## Schnellstart

```bash
# In das Verzeichnis wechseln
cd browser-service

# Abhängigkeiten installieren (Chromium wird automatisch via Playwright installiert)
npm install

# Service starten (Development)
npm run dev
```

Der Service läuft dann auf **http://localhost:3001**.

## Voraussetzungen

- **Node.js** 18 oder höher
- **Chromium** wird automatisch von Playwright installiert (`npx playwright install chromium`)

## Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm run dev` | Startet den Service im Development-Modus mit Hot-Reload |
| `npm run build` | Kompiliert TypeScript zu JavaScript |
| `npm start` | Startet den kompilierten Service |

## Konfiguration

Der Service kann über Umgebungsvariablen konfiguriert werden:

| Variable | Standard | Beschreibung |
|----------|----------|-------------|
| `PORT` | 3001 | Server-Port |
| `HEADLESS` | true | Headless-Modus (true/false) |
| `FRONTEND_URL` | - | Erlaubte Frontend-URL für CORS |

### Beispiel `.env`:

```env
PORT=3001
HEADLESS=true
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Session Management

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/health` | GET | Health Check |
| `/api/session` | POST | Neue Session erstellen |
| `/api/session/:id` | GET | Session abrufen |
| `/api/session/:id` | DELETE | Session beenden |

### Navigation

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/navigate` | POST | Zu URL navigieren |
| `/api/navigate/back` | POST | Zurück navigieren |
| `/api/navigate/forward` | POST | Vorwärts navigieren |
| `/api/navigate/refresh` | POST | Seite neu laden |

### Interaktion

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/interact/click` | POST | Mausklick ausführen |
| `/api/interact/type` | POST | Text eingeben |
| `/api/interact/scroll` | POST | Seite scrollen |
| `/api/interact/keypress` | POST | Taste drücken |
| `/api/interact/hover` | POST | Maus bewegen |

### Screenshot

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/screenshot/:sessionId/:tabId?` | GET | Screenshot abrufen |

### Tab Management

| Endpoint | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/tabs` | POST | Neuen Tab erstellen |
| `/api/tabs/:id` | DELETE | Tab schließen |
| `/api/tabs/:id/activate` | PUT | Tab aktivieren |

## API Beispiele

### Session erstellen

```bash
curl -X POST http://localhost:3001/api/session \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123"}'
```

### Zu URL navigieren

```bash
curl -X POST http://localhost:3001/api/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-id",
    "url": "https://google.com"
  }'
```

### Klick ausführen

```bash
curl -X POST http://localhost:3001/api/interact/click \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-id",
    "x": 500,
    "y": 300
  }'
```

## Sicherheit

- Sessions laufen nach 30 Minuten Inaktivität ab
- Maximal 3 Sessions pro User erlaubt
- CORS ist auf das LifeOS Frontend beschränkt

## Troubleshooting

### "Browser konnte nicht gestartet werden"

Stelle sicher, dass Chromium über Playwright installiert ist:

```bash
npx playwright install chromium
```

### "Session nicht gefunden"

Sessions laufen nach 30 Minuten ab. Erstelle eine neue Session.

### "CORS-Fehler"

Füge die Frontend-URL zur `FRONTEND_URL` Umgebungsvariable hinzu.

## Projektstruktur

```
browser-service/
├── src/
│   ├── index.ts           # Express Server & API Routes
│   ├── session-manager.ts # Playwright Session-Verwaltung
│   └── types.ts           # TypeScript Interfaces
├── package.json
├── tsconfig.json
└── README.md
```

## Integration mit LifeOS

Das Frontend kommuniziert über `src/modules/browser/services/browser-api.ts` mit diesem Service.
