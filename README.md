# LLM Council

Ein Standalone-Workspace, in dem mehrere LLMs als „Council" gemeinsam über eine
Frage beraten – Antworten mehrerer Modelle nebeneinander, orchestriert und
zusammengeführt.

> Fokussierte Council-App: Multi-Model-Deliberation mit Streaming, Gruppen-
> Orchestrierung und personalisierbarem Design-System.

## Highlights

- **LLM Council** – Mehrere Modelle beraten parallel über dieselbe Frage; Antworten
  werden nebeneinander gestreamt und (optional) zu einer Synthese zusammengeführt.
- **Multi-Provider** – Läuft über einen OpenAI-kompatiblen Client, standardmäßig
  gegen [OpenRouter](https://openrouter.ai) (Zugriff auf hunderte Modelle), plus
  direkter Anthropic-Support.
- **Gruppen-Orchestrierung** – Councils als Gruppen aus Agenten mit eigenem
  System-Prompt und Intent-Klassifizierung.
- **Design-System** – 3 Stile (Glassmorphism, Neo-Brutalism, Neomorphism), frei
  konfigurierbare Farben, Schriften und Hintergrund.

## Tech Stack

| Kategorie | Technologie |
|-----------|-------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Sprache | TypeScript |
| Styling | Tailwind CSS 4 + CSS Variables |
| State | Zustand (persistiert) |
| AI | OpenRouter / OpenAI-kompatibel + Anthropic (SSE Streaming) |
| Datenbank | PostgreSQL + Prisma ORM |
| Animationen | Framer Motion |
| Icons | Lucide React |

## Projektstruktur

```
src/
├── app/
│   ├── page.tsx        # Council-Einstieg (rendert den Agents/Council-Shell)
│   ├── agents/         # Council-/Agents-Ansicht
│   ├── settings/       # Design-System-Einstellungen
│   └── api/
│       ├── agent/      # Council-Endpunkte (stream, group-orchestrate, classify-intent)
│       ├── llm/        # Multi-Provider LLM-Client + Modell-Liste
│       ├── memory/     # Agent-Memory
│       ├── dashboard-folders/
│       └── group-libraries/
├── components/         # Shell, Sidebar, Chat-Widget
├── lib/
│   ├── agent/          # Agent-System (Executor, Context, Registry)
│   ├── llm/            # Multi-Provider LLM-Client
│   └── store/          # Globaler App State
└── modules/
    └── agents/         # Das Council-Modul (Spatial Scene, Chat, Councils)
```

## Schnellstart

### Voraussetzungen

- Node.js ≥ 20
- PostgreSQL (lokal oder Cloud)

### Installation

```bash
# Dependencies installieren
npm install

# Prisma Client generieren
npx prisma generate

# Environment einrichten
cp .env.example .env.local
# DATABASE_URL + OPENAI_API_KEY (OpenRouter-Key) eintragen

# Datenbank-Schema pushen
npx prisma db push

# Dev-Server starten
npm run dev
```

→ http://localhost:3000

### Environment Variables

| Variable | Beschreibung |
|----------|--------------|
| `DATABASE_URL` | PostgreSQL Connection String |
| `OPENAI_API_KEY` | OpenRouter-Key (OpenAI-kompatibel) für das Council |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` |
| `LLM_PROVIDER` | Standard-Provider (`openai` für OpenRouter) |
| `ANTHROPIC_API_KEY` | Claude API Key (optional) |
| `ENCRYPTION_KEY` | Token-Verschlüsselung |

## Keyboard Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `⌘/Ctrl + B` | Sidebar ein-/ausklappen |
| `Esc` | Sidebar/Chat schließen |

## Lizenz

MIT
