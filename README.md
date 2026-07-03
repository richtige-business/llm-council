# LifeOS

Ein KI-Betriebssystem für ein strukturiertes Leben.

> Modulare App-Plattform mit integriertem AI-Agent, Modul-Builder und personalisiertem Design-System.

## Highlights

- **Intelligence Agent** – Claude-basierter Assistent mit modul-spezifischen Agents (Kalender, Postfach, Browser, Aufgaben) + Spracheingabe
- **Modul-Builder (Lab)** – Vibe-Coding-Plattform à la Cursor/Lovable: Real-Time Streaming, WebContainer-Preview, Monaco Editor, Patch-Editing, Multi-Provider LLM
- **Built-in Module** – Kalender, E-Mail (Gmail/Outlook/IMAP), Browser, Chat, Training Center, Expense Tracker, u.v.m.
- **Marketplace & Bibliothek** – Community-Module installieren und teilen
- **Design-System** – 3 Stile (Glassmorphism, Neo-Brutalism, Neomorphism), frei konfigurierbare Farben, Schriften, Hintergründe
- **Dashboard** – Draggable Widgets, Tab-System, Intelligence Orb mit Push-to-Talk

## Tech Stack

| Kategorie | Technologie |
|-----------|-------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Sprache | TypeScript |
| Styling | Tailwind CSS 4 + CSS Variables |
| State | Zustand (persistiert) |
| AI | Anthropic Claude + OpenAI GPT-4 (Multi-Provider, SSE Streaming) |
| Modul-Preview | WebContainers (StackBlitz) + Vite HMR |
| Code-Editor | Monaco Editor (VS Code Engine) |
| Datenbank | PostgreSQL + Prisma ORM |
| Animationen | Framer Motion |
| Icons | Lucide React |

## Projektstruktur

```
src/
├── app/              # Next.js Pages & API Routes
├── components/       # Shell, Agent, Dashboard, Marketplace
├── kernel/           # Modul-Kernel (Registry, Permissions, Events)
├── lib/
│   ├── agent/        # AI Agent System (Executor, Tools, Sandbox)
│   ├── db/           # Prisma Client
│   ├── lab/          # Module Builder Engine (Prompts, Parser, LLM)
│   ├── llm/          # Multi-Provider LLM Client (Anthropic, OpenAI)
│   ├── webcontainer/ # WebContainer Templates & File-Tree Builder
│   └── store/        # Globaler App State
├── modules/          # Built-in & generierte Module
│   ├── calendar/
│   ├── inbox/
│   ├── browser/
│   ├── chat/
│   ├── training/
│   └── ...
├── browser-service/  # Headless Browser Service
└── Module-Builder/   # Standalone Builder App
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
# DATABASE_URL und ANTHROPIC_API_KEY eintragen

# Datenbank erstellen & Schema pushen
createdb lifeos
npx prisma db push

# Dev-Server starten
npm run dev
```

→ http://localhost:3000

### Environment Variables

| Variable | Beschreibung |
|----------|--------------|
| DATABASE_URL | PostgreSQL Connection String |
| ANTHROPIC_API_KEY | Claude API Key |
| GOOGLE_CLIENT_ID | Gmail OAuth (optional) |
| GOOGLE_CLIENT_SECRET | Gmail OAuth (optional) |
| OPENAI_API_KEY | OpenAI API Key (optional, für GPT-4 im Builder) |
| ENCRYPTION_KEY | Token-Verschlüsselung |

## Module

### Built-in

Kalender, Postfach (Gmail/Outlook/IMAP), Browser, Chat, Training Center, Expense Tracker

### Community (via Builder)

Todo-List, Personal CRM, Friends CRM, Chess Game, Mood Tracker, Finance Hub, BMG Fan App, u.v.m.

## Modul-Builder (Lab)

Integrierte AI-Coding-Plattform zum Erstellen eigener LifeOS-Module per natürlicher Sprache.

### Features

- **Real-Time Code Streaming** – Live-Ansicht der Code-Generierung mit Cursor-Style Streaming-Fenstern im Chat
- **WebContainer Preview** – Echter Vite Dev-Server im Browser via StackBlitz WebContainers (kein Mocking, echte npm-Pakete)
- **Multi-Provider LLM** – Zwischen Claude (Anthropic) und GPT-4 (OpenAI) wechselbar, direkt im Chat
- **Patch-basiertes Editing** – Änderungen per Prompt an bestehenden Dateien, ohne Neugenerierung
- **Monaco Editor** – VS Code Engine mit Syntax-Highlighting und Streaming-Status
- **Multi-File Generierung** – Komponenten, Stores, Types, Utils in separaten Dateien
- **One-Click Publishing** – Module direkt in LifeOS aktivieren und in die Sidebar integrieren

### Architektur

```
Chat → LLM (SSE Stream) → ArtifactParser → Files Store → Monaco Editor
                                                ↓
                                WebContainer (Vite HMR) → Live Preview
```

### Unterstützte Modelle

| Provider | Modelle |
|----------|---------|
| Anthropic | Claude 4 Sonnet, Claude 3.5 Sonnet |
| OpenAI | GPT-4o, GPT-4 Turbo |

## Sprachassistent (Web Speech API)

Der Intelligence Orb unterstützt Spracheingabe über die Web Speech API.

- **Kein API-Key nötig** – Transkription läuft im Browser
- **Berechtigung erforderlich** – Mikrofon-Zugriff erlauben
- **Support** – Chrome/Edge zuverlässig; Safari eingeschränkt

## Keyboard Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `⌘/Ctrl + B` | Sidebar ein-/ausklappen |
| `Esc` | Sidebar/Chat schließen |

## Status

- [x] Shell & Dashboard
- [x] AI Agent System (Intelligence Orb)
- [x] Kalender, Postfach, Browser, Chat Module
- [x] Design-System (3 Stile, Custom Colors)
- [x] Module Builder (Lab) – Streaming, WebContainer, Monaco, Patch-Editing, Publishing
- [x] Marketplace & Bibliothek
- [x] Training Center (Datasets, Jobs, Sandbox)
- [x] Kernel v0.1 (Registry, Permissions, Events)
- [ ] RAG / Long-Term Memory
- [ ] Mobile App

## Mitwirken

1. Repository forken
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add some AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request öffnen

### Code-Stil

- TypeScript mit strikten Type-Checks
- Kommentare auf Deutsch (siehe `.cursorrules`)
- Komponenten-Namen: PascalCase
- Funktionen/Variablen: camelCase

## Lizenz

MIT
