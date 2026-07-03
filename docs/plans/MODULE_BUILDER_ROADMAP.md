# ============================================
# MODULE BUILDER ROADMAP
# Von MVP zu Cursor-Level Coding Platform
# ============================================
#
# Zweck: Vollständiger Entwicklungsplan für den LifeOS Module Builder
# Status: Phasen 1-4 abgeschlossen, Phasen 5-10 geplant
# Erstellt: 2026-02-07
# ============================================

---

## Inhaltsverzeichnis

1. [Vision & Ziel](#vision--ziel)
2. [Ist-Zustand (Phase 1-4 abgeschlossen)](#ist-zustand)
3. [Architektur-Übersicht](#architektur-übersicht)
4. [Phase 5: Real-Time Code Streaming & Monaco Editor](#phase-5)
5. [Phase 6: Developer Tools](#phase-6)
6. [Phase 7: History & Versionierung](#phase-7)
7. [Phase 8: Intelligenz & Kontext](#phase-8)
8. [Phase 9: UX & Polish](#phase-9)
9. [Phase 10: Advanced Features](#phase-10)
10. [Abhängigkeiten & Reihenfolge](#abhängigkeiten)
11. [Tech-Stack Erweiterungen](#tech-stack)

---

## Vision & Ziel

Der LifeOS Module Builder soll eine vollwertige AI-Coding-Plattform werden,
die es ermöglicht, Module für das LifeOS-System visuell zu erstellen,
zu testen und zu veröffentlichen — vergleichbar mit Cursor, Lovable und Bolt.

**Kernprinzip:** Der User soll nie das Gefühl haben, "nur einen Chatbot" zu nutzen.
Er soll sehen, wie der Code entsteht, ihn live bearbeiten können und sofort
das Ergebnis im Preview sehen.

---

## Ist-Zustand

### Abgeschlossene Phasen

| Phase | Name | Status | Beschreibung |
|-------|------|--------|--------------|
| 1 | Streaming & UX | ✅ Fertig | SSE-Streaming, Token-by-Token Chat, Code-Diffing |
| 2 | Sandbox-Execution | ✅ Fertig | WebContainer-Preview, Vite HMR, echte npm-Pakete |
| 3 | Cursor-Style Editing | ✅ Fertig | Patch-basiertes Editing (type="modify"), search/replace |
| 4 | Integration & Publishing | ✅ Fertig | Module aktivieren, Registry, PublishModal |

### Bestehende Architektur

```
Dateien:              ~8.270 Zeilen Code
Komponenten:          15 React-Komponenten
Stores:               5 Zustand-Stores
API-Routes:           4 Endpoints
LLM-Integration:      Anthropic + OpenAI, Streaming, Multi-Segment
Preview:              WebContainer + Vite HMR
Editor:               Textarea (kein Syntax-Highlighting)
```

### Bestehende Dateien

```
src/app/lab/builder/
├── [projectId]/page.tsx          # Hauptseite (1.125 Zeilen)
├── components/
│   ├── BuilderChat.tsx           # Chat-Interface (695 Zeilen)
│   ├── PublishModal.tsx          # Publish-Dialog (311 Zeilen)
│   ├── chat/
│   │   ├── ChatInput.tsx         # Eingabe + Mode-Switcher (513 Zeilen)
│   │   ├── Messages.tsx          # Nachrichten-Rendering (324 Zeilen)
│   │   └── OptionCards.tsx       # Aktions-Karten
│   ├── workbench/
│   │   ├── Workbench.tsx         # Tab-Container (284 Zeilen)
│   │   ├── EditorPanel.tsx       # Code-Editor (265 Zeilen)
│   │   ├── Preview.tsx           # WebContainer-Preview (554 Zeilen)
│   │   ├── DiffPanel.tsx         # Diff-Ansicht (238 Zeilen)
│   │   └── FileTree.tsx          # Dateibaum (253 Zeilen)
│   └── settings/
│       ├── ProjectSettings.tsx   # Projekt-Einstellungen
│       └── LLMTab.tsx            # LLM-Konfiguration
├── stores/
│   ├── projects-store.ts         # Projekte + Persistenz (726 Zeilen)
│   ├── files-store.ts            # Virtuelles Dateisystem (105 Zeilen)
│   ├── workbench-store.ts        # UI-State (139 Zeilen)
│   └── llm-config-store.ts       # LLM-Config
│
src/app/api/lab/
├── generate/route.ts             # Code-Generierung (1.137 Zeilen)
├── compile/route.ts              # esbuild-Kompilierung (419 Zeilen)
├── activate/route.ts             # Modul-Aktivierung (270 Zeilen)
│
src/lib/lab/llm/
├── prompts.ts                    # System-Prompts (372 Zeilen)
├── parser.ts                     # Artifact-Parser (268 Zeilen)
├── stream-text.ts                # Streaming-Utility (123 Zeilen)
├── constants.ts                  # Konstanten (81 Zeilen)
│
src/lib/webcontainer/
├── templates.ts                  # WC-Templates (352 Zeilen)
│
src/app/sandbox/wc/
├── page.tsx                      # WebContainer-Sandbox (411 Zeilen)
```

---

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                    Module Builder UI                         │
│                                                             │
│  ┌──────────────┐  ┌────────────────────────────────────┐  │
│  │              │  │           Workbench                  │  │
│  │   Chat       │  │  ┌──────┐ ┌───────┐ ┌──────────┐  │  │
│  │   Panel      │  │  │Editor│ │Preview│ │ Terminal  │  │  │
│  │              │  │  │Monaco│ │WebCont│ │ xterm.js  │  │  │
│  │  ┌────────┐  │  │  └──────┘ └───────┘ └──────────┘  │  │
│  │  │Streamer│  │  │  ┌──────┐ ┌───────┐ ┌──────────┐  │  │
│  │  │(live   │  │  │  │ Diff │ │Console│ │ Settings │  │  │
│  │  │ edit)  │  │  │  │Panel │ │ Panel │ │          │  │  │
│  │  └────────┘  │  │  └──────┘ └───────┘ └──────────┘  │  │
│  └──────────────┘  └────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Status Bar                         │  │
│  │  [Dateien: 8] [Tokens: 2.4k] [Provider: Claude]     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────┐      ┌──────────────┐     ┌──────────────┐
   │ Generate │      │  WebContainer │     │   Activate   │
   │ API      │      │  (Sandbox)    │     │   API        │
   │ (SSE)    │      │  Vite + npm   │     │   (Publish)  │
   └──────────┘      └──────────────┘     └──────────────┘
```

---

## Phase 5: Real-Time Code Streaming & Monaco Editor
**Priorität: HÖCHSTE — Größter Impact**

### 5.1 Real-Time Code Streaming (Cursor-Style)

**Was:** Während der KI Code generiert, sieht der User in Echtzeit:
- Im Chat: Ein Mini-Fenster pro Datei, das zeigt wie der Code geschrieben wird
- Im Editor: Dateien erscheinen live im Dateibaum
- Im Editor: Der aktive Code wird Zeile für Zeile eingefügt

**Wie es aussehen soll:**

```
┌─ Chat ──────────────────────────────────┐
│ 🤖 Erstelle dein CRM-Modul...          │
│                                          │
│ ┌─ 📄 components/Header.tsx ──────────┐ │
│ │ import React from 'react';          │ │
│ │ import { Users } from 'lucide-rea█  │ │  ← Cursor blinkt
│ │                                     │ │
│ └─────────────────── 12 Zeilen ───────┘ │
│                                          │
│ ┌─ 📄 store/app-store.ts ─ NEU ──────┐ │
│ │ import { create } from 'zustand';   │ │
│ │ █                                   │ │  ← Wird gerade geschrieben
│ └─────────────────── 3 Zeilen ────────┘ │
│                                          │
│ ✅ App.tsx (45 Zeilen)                   │  ← Fertig
│ ✅ module.json                           │  ← Fertig
└──────────────────────────────────────────┘
```

**Technische Umsetzung:**

| Komponente | Beschreibung | Aufwand |
|------------|-------------|---------|
| `StreamingCodeBlock.tsx` | Mini-Code-Fenster im Chat mit Live-Cursor, Syntax-Highlighting, Zeilen-Counter, Collapse/Expand | Mittel |
| `parser.ts` Erweiterung | Streaming-Parser muss partielle `<boltAction>` Blöcke erkennen und Datei-für-Datei Events emittieren: `file:start`, `file:chunk`, `file:complete` | Mittel |
| `files-store.ts` Erweiterung | Live-Updates: Datei wird angelegt sobald `file:start` Event kommt, Content wird chunk-weise appended | Klein |
| `FileTree.tsx` Erweiterung | Animiertes Erscheinen neuer Dateien (fade-in + highlight), "wird geschrieben" Indikator | Klein |
| `EditorPanel.tsx` Integration | Wenn eine Datei gerade gestreamt wird: Read-only Modus, Cursor-Animation am Ende, Auto-Scroll | Klein |

**Detaillierter Flow:**

```
1. User sendet Prompt
2. SSE-Stream beginnt

3. Parser erkennt: <boltAction type="file" filePath="components/Header.tsx">
   → Event: { type: 'file:start', path: 'components/Header.tsx' }
   → Chat: Neuer StreamingCodeBlock erscheint
   → FileTree: Neue Datei mit Spinner-Icon
   → Editor: Wechselt optional zur neuen Datei

4. Weitere Chunks kommen rein: "import React from 'react';\n..."
   → Event: { type: 'file:chunk', path: '...', content: 'import...' }
   → Chat: Code wird Zeile für Zeile angezeigt (mit Cursor)
   → Editor: Content wird live aktualisiert
   → FilesStore: Content wird appended

5. Parser erkennt: </boltAction>
   → Event: { type: 'file:complete', path: '...' }
   → Chat: Block wird "fertig" (grüner Haken, collapse)
   → FileTree: Spinner → normales Icon
   → Editor: Read-only Modus aufgehoben

6. Nächste Datei beginnt → zurück zu Schritt 3

7. Stream endet
   → Alle Blöcke finalisiert
   → Preview wird aktualisiert (WebContainer)
```

**Neue Dateien:**

```
src/app/lab/builder/components/chat/
├── StreamingCodeBlock.tsx        # Live-Code-Fenster im Chat
├── StreamingFileIndicator.tsx    # Datei-Status-Badge (schreibt/fertig)

src/app/lab/builder/hooks/
├── useStreamParser.ts            # Hook für Streaming-Events
```

---

### 5.2 Monaco Editor Integration

**Was:** Professioneller Code-Editor statt Textarea.

**Features:**
- Syntax-Highlighting (TypeScript, JSON, CSS, Markdown)
- Zeilennummern (schon vorhanden, aber besser)
- Code-Folding
- Find & Replace (Ctrl+F / Cmd+F)
- Auto-Indentation
- Bracket-Matching
- Minimap (optional)
- Multi-Cursor (Ctrl+D / Cmd+D)
- Read-Only Modus während Streaming

**Technische Umsetzung:**

| Komponente | Beschreibung | Aufwand |
|------------|-------------|---------|
| `@monaco-editor/react` | npm-Paket, React-Wrapper für Monaco | Klein |
| `EditorPanel.tsx` Umbau | Textarea → Monaco ersetzen, Theme anpassen | Mittel |
| `MonacoTheme.ts` | Custom Dark-Theme passend zu LifeOS Glassmorphism | Klein |
| `StreamingCodeBlock.tsx` | Lightweight Monaco oder Shiki für Syntax-Highlighting im Chat | Klein |

**Monaco-Konfiguration:**

```typescript
// Geplante Monaco-Optionen
const editorOptions = {
  theme: 'lifeos-dark',
  language: 'typescript',           // Auto-detect per Dateiendung
  minimap: { enabled: false },      // Zu klein für Split-View
  fontSize: 13,
  lineNumbers: 'on',
  folding: true,
  bracketPairColorization: true,
  autoIndent: 'full',
  formatOnPaste: true,
  wordWrap: 'on',
  readOnly: false,                  // true während Streaming
  scrollBeyondLastLine: false,
  smoothScrolling: true,
};
```

**Aufwand Phase 5 gesamt: ~3-5 Tage**

---

## Phase 6: Developer Tools
**Priorität: HOCH — Debugging ermöglichen**

### 6.1 Integriertes Terminal

**Was:** Terminal-Panel im Workbench, das WebContainer-Ausgaben zeigt.

**Features:**
- npm install Output live anzeigen
- Vite Build-Fehler sichtbar
- Eigene Befehle ausführen (npm run, node, etc.)
- Farbige Ausgabe (ANSI-Farben)
- Scrollback-Buffer

**Technische Umsetzung:**

| Komponente | Beschreibung | Aufwand |
|------------|-------------|---------|
| `xterm.js` + `@xterm/addon-fit` | Terminal-Emulator im Browser | Klein |
| `TerminalPanel.tsx` | Neue Workbench-Tab-Komponente | Mittel |
| `wc/page.tsx` Erweiterung | stdout/stderr an Parent streamen via postMessage | Klein |
| `workbench-store.ts` | `showTerminal` State (split bottom) | Klein |

**Layout:**

```
┌────────────────────────────────────┐
│  Code │ Preview │ Diff │ Terminal  │   ← Tabs
├────────────────────────────────────┤
│                                    │
│         Editor / Preview           │
│                                    │
├────────────────────────────────────┤  ← Resizable Divider
│ $ npm install                      │
│ added 127 packages in 4.2s        │
│ $ npx vite --host                  │
│ VITE v5.x ready in 340ms          │
│ > Local: http://localhost:5173     │
└────────────────────────────────────┘
```

---

### 6.2 Console-Panel

**Was:** `console.log()` Ausgaben aus dem WebContainer-Preview abfangen und anzeigen.

**Features:**
- Log, Warn, Error, Info unterscheiden (Farben/Icons)
- Objekte expandierbar (JSON-Tree)
- Clear-Button
- Filter nach Level
- Zeitstempel

**Technische Umsetzung:**

| Komponente | Beschreibung | Aufwand |
|------------|-------------|---------|
| `ConsolePanel.tsx` | Console-Ausgabe mit Filtern | Mittel |
| Console-Interceptor | Script im WebContainer-iframe, das console.* überschreibt und via postMessage sendet | Klein |
| `workbench-store.ts` | `consoleLogs: ConsoleEntry[]` State | Klein |

---

### 6.3 Fehler-Diagnostik

**Was:** Build-Fehler und TypeScript-Fehler aus dem WebContainer parsen und im Editor anzeigen.

**Features:**
- Inline-Fehler im Monaco Editor (rote Unterstreichung)
- Error-Liste im Problems-Panel
- Klick auf Fehler → springt zur Zeile
- Vite/TypeScript-Fehler automatisch parsen

**Technische Umsetzung:**

| Komponente | Beschreibung | Aufwand |
|------------|-------------|---------|
| `wc/page.tsx` | Vite-Fehler aus stderr parsen, strukturiert senden | Mittel |
| `ProblemsPanel.tsx` | Fehler-Liste mit Severity-Icons | Mittel |
| Monaco Integration | `editor.setModelMarkers()` für Inline-Fehler | Klein |

**Aufwand Phase 6 gesamt: ~4-6 Tage**

---

## Phase 7: History & Versionierung
**Priorität: HOCH — Sicherheitsnetz für User**

### 7.1 Undo/Redo System

**Was:** Jede Generierung erstellt einen Checkpoint. Der User kann vor und zurück navigieren.

**Features:**
- Undo/Redo Buttons in der Toolbar
- Ctrl+Z / Ctrl+Shift+Z Keyboard-Shortcuts
- Checkpoint pro Generierung (alle Dateien)
- Checkpoint pro manueller Bearbeitung (einzelne Datei)
- Max 50 Checkpoints (ringbuffer)

**Technische Umsetzung:**

| Komponente | Beschreibung | Aufwand |
|------------|-------------|---------|
| `history-store.ts` | Neuer Store: Checkpoint-Stack mit FileMap-Snapshots | Mittel |
| `files-store.ts` | `createCheckpoint()` und `restoreCheckpoint()` Actions | Klein |
| Toolbar-Integration | Undo/Redo Buttons + Keyboard-Handler | Klein |
| Timeline-UI (optional) | Visuelle Timeline aller Checkpoints | Mittel |

**Datenstruktur:**

```typescript
interface Checkpoint {
  id: string;
  timestamp: number;
  label: string;              // "Generierung: CRM-Header" oder "Manuell: App.tsx"
  files: FileMap;             // Kompletter Snapshot aller Dateien
  trigger: 'generation' | 'manual' | 'patch';
}

interface HistoryStore {
  checkpoints: Checkpoint[];  // Max 50
  currentIndex: number;       // Position im Stack
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  createCheckpoint: (label: string, trigger: string) => void;
}
```

---

### 7.2 Datei-Versionierung

**Was:** Pro Datei die letzten N Versionen speichern.

**Features:**
- Rechtsklick auf Datei → "Versionen anzeigen"
- Side-by-side Vergleich zwischen Versionen
- "Diese Version wiederherstellen"
- Automatisch bei jeder Generierung + manueller Speicherung

**Aufwand Phase 7 gesamt: ~2-3 Tage**

---

## Phase 8: Intelligenz & Kontext
**Priorität: MITTEL — Qualität der Generierung verbessern**

### 8.1 Smart Context Windowing

**Was:** Nur relevante Dateien an das LLM senden, statt den gesamten Code.

**Regeln:**
- Datei die der User gerade offen hat → immer senden
- Dateien die importiert werden → senden
- module.json → immer senden
- Große Dateien → nur Signatur (Exports, Types, erste 30 Zeilen)
- Token-Budget: Max 60% des Context-Windows für Code

**Technische Umsetzung:**

| Komponente | Beschreibung | Aufwand |
|------------|-------------|---------|
| `context-builder.ts` | Neue Utility: Baut optimalen Kontext aus FileMap | Mittel |
| Import-Graph | Einfacher Regex-Parser für import/export Statements | Mittel |
| Token-Counter | Approximation: ~4 chars = 1 token | Klein |
| `generate/route.ts` | Context-Builder statt vollständiger Datei-Dump nutzen | Klein |

---

### 8.2 Automatische Fehlerkorrektur

**Was:** Wenn der Preview einen Fehler zeigt, kann die KI ihn automatisch fixen.

**Flow:**
1. WebContainer meldet Fehler (Build oder Runtime)
2. Chat zeigt: "Fehler erkannt: Cannot find module './utils'" + "Auto-Fix" Button
3. Klick → sendet Fehler + relevanten Code an LLM
4. LLM generiert Fix als Patch
5. Patch wird angewendet, Preview aktualisiert

---

### 8.3 Auto-Format (Prettier)

**Was:** Code automatisch formatieren bei Speicherung.

**Umsetzung:** Prettier als npm-Paket im WebContainer installieren,
`npx prettier --write` nach jeder Generierung ausführen.

**Aufwand Phase 8 gesamt: ~3-5 Tage**

---

## Phase 9: UX & Polish
**Priorität: MITTEL — Feinschliff**

### 9.1 Globale Code-Suche

**Was:** Ctrl+Shift+F → Suche über alle Dateien im Projekt.

**Features:**
- Regex-Support
- Ergebnisse mit Datei + Zeile + Kontext
- Klick → springt zur Stelle
- Replace in Files (optional)

---

### 9.2 Keyboard-Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `Ctrl+S` | Datei speichern |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+F` | Suche in Datei |
| `Ctrl+Shift+F` | Suche in Projekt |
| `Ctrl+P` | Quick-Open (Datei nach Name) |
| `Ctrl+B` | Sidebar Toggle |
| `Ctrl+J` | Terminal Toggle |
| `Ctrl+Enter` | Prompt absenden |
| `Escape` | Generierung abbrechen |

---

### 9.3 Drag & Drop

- Dateien im FileTree umsortieren
- Dateien zwischen Ordnern verschieben
- Neue Datei per Drag ins Fenster (Upload)

---

### 9.4 Status Bar

**Was:** Untere Leiste mit Projekt-Infos.

```
┌──────────────────────────────────────────────────────────┐
│ 📁 8 Dateien │ 📝 TypeScript │ ⚡ Claude 4 │ 💰 ~2.4k Tokens │ ✅ Bereit │
└──────────────────────────────────────────────────────────┘
```

**Aufwand Phase 9 gesamt: ~3-4 Tage**

---

## Phase 10: Advanced Features
**Priorität: NIEDRIG — Nice-to-have**

### 10.1 AI Autocomplete

**Was:** Tab-Completion wie in Cursor. Während der User tippt, schlägt die KI Code vor.

**Umsetzung:** 
- Debounced API-Call bei Tastendruck
- Schnelles Modell (GPT-4o-mini oder Claude Haiku)
- Ghost-Text im Monaco Editor
- Tab zum Akzeptieren

**Aufwand:** Hoch (3-5 Tage)

---

### 10.2 Component Library

**Was:** Vorgefertigte UI-Bausteine, die per Klick eingefügt werden können.

**Beispiele:**
- Header mit Navigation
- Card-Grid Layout
- Form mit Validierung
- Data Table mit Sortierung
- Chart-Komponente
- Modal/Dialog

**Aufwand:** Mittel (2-3 Tage)

---

### 10.3 Visual Builder (Lovable-Style)

**Was:** Drag & Drop UI-Editor, der Code generiert.

**Aufwand:** Sehr hoch (2-4 Wochen) — langfristiges Ziel

---

### 10.4 1-Click Deployment

**Was:** Module direkt auf Vercel/Netlify deployen oder als Standalone-App exportieren.

**Aufwand:** Mittel (2-3 Tage)

---

### 10.5 Kollaboration

**Was:** Mehrere User arbeiten gleichzeitig am selben Modul.

**Aufwand:** Sehr hoch (WebSocket, CRDT) — langfristiges Ziel

---

## Abhängigkeiten & Reihenfolge

```
Phase 5 (Editor + Streaming)     ← KEINE Abhängigkeiten, sofort starten
    │
    ├── 5.1 Real-Time Streaming  ← Braucht Parser-Erweiterung
    │       │
    │       └── 5.2 Monaco       ← StreamingCodeBlock profitiert von Highlighting
    │
    ▼
Phase 6 (Dev Tools)              ← Braucht Phase 5 (Monaco für Inline-Fehler)
    │
    ├── 6.1 Terminal             ← Unabhängig
    ├── 6.2 Console              ← Unabhängig
    └── 6.3 Fehler-Diagnostik   ← Braucht Monaco + Terminal
    │
    ▼
Phase 7 (History)                ← Unabhängig, kann parallel zu Phase 6
    │
    ├── 7.1 Undo/Redo           ← Unabhängig
    └── 7.2 Datei-Versionen     ← Braucht 7.1
    │
    ▼
Phase 8 (Intelligenz)           ← Braucht Phase 6.3 (Fehler-Erkennung)
    │
    ├── 8.1 Smart Context       ← Unabhängig
    ├── 8.2 Auto-Fix            ← Braucht 6.3
    └── 8.3 Auto-Format         ← Unabhängig
    │
    ▼
Phase 9 (UX Polish)             ← Braucht Phase 5 (Monaco für Suche etc.)
    │
    ▼
Phase 10 (Advanced)             ← Braucht alles oben
```

**Empfohlene Reihenfolge:**

```
Woche 1-2:  Phase 5 (Real-Time Streaming + Monaco)
Woche 2-3:  Phase 7 (Undo/Redo) — parallel zu Phase 5.2
Woche 3-4:  Phase 6 (Terminal + Console + Diagnostik)
Woche 4-5:  Phase 8 (Smart Context + Auto-Fix)
Woche 5-6:  Phase 9 (UX Polish)
Ab Woche 7: Phase 10 (Advanced Features nach Bedarf)
```

---

## Tech-Stack Erweiterungen

### Neue npm-Pakete

| Paket | Zweck | Phase | Größe |
|-------|-------|-------|-------|
| `@monaco-editor/react` | Code-Editor | 5 | ~2MB |
| `shiki` | Syntax-Highlighting im Chat | 5 | ~1MB |
| `@xterm/xterm` | Terminal-Emulator | 6 | ~500KB |
| `@xterm/addon-fit` | Terminal Auto-Resize | 6 | ~10KB |
| `@xterm/addon-web-links` | Klickbare Links im Terminal | 6 | ~10KB |
| `prettier` | Code-Formatierung (im WC) | 8 | Im WC |
| `isomorphic-git` | Git im Browser (optional) | 10 | ~500KB |

### Bestehende Pakete (werden weiter genutzt)

- `@webcontainer/api` — Preview-Sandbox
- `zustand` — State Management
- `framer-motion` — Animationen
- `lucide-react` — Icons
- `tailwindcss` — Styling

---

## Metriken & Erfolgskriterien

| Metrik | Aktuell | Ziel (Phase 10) |
|--------|---------|-----------------|
| Editor-Qualität | Textarea | Monaco (VS Code Level) |
| Code-Sichtbarkeit während Generierung | Keine | Real-Time Streaming |
| Debugging-Möglichkeiten | Keine | Terminal + Console + Diagnostik |
| Undo/Redo | Nicht vorhanden | 50 Checkpoints |
| Durchschnittliche Generierungszeit | ~15s | ~10s (Smart Context) |
| Fehler nach Generierung | ~30% | ~5% (Auto-Fix) |
| Keyboard-Shortcuts | 2 (Enter, Escape) | 10+ |
| Datei-Suche | Keine | Projekt-weite Regex-Suche |

---

## Zusammenfassung

Der Module Builder hat mit den Phasen 1-4 ein solides Fundament:
WebContainer-Preview, Streaming, Patch-Editing und Publishing funktionieren.

Die **größte Lücke** ist die fehlende Code-Sichtbarkeit während der Generierung
und der primitive Editor. **Phase 5 (Real-Time Streaming + Monaco)** hat den
höchsten Impact und sollte als erstes angegangen werden.

Mit allen 10 Phasen wird der Module Builder auf dem Niveau von Cursor, Lovable
und Bolt sein — mit dem Vorteil der tiefen LifeOS-Integration.
