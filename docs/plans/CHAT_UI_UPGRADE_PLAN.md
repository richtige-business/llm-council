# ============================================
# Chat UI Upgrade Plan – Vercel Chatbot Patterns adaptieren
#
# Quelle: https://github.com/vercel/chatbot (Apache 2.0)
# Ziel:   LifeOS Chat-Interface auf Produktionsniveau heben
# Stand:  08.04.2026
# ============================================

## 1. Zusammenfassung

Dieses Dokument beschreibt einen schrittweisen Plan, um die besten UI/UX-Patterns
aus dem **Vercel Chatbot** (v3.1, Next.js, ~40 Komponenten) gezielt in das bestehende
LifeOS-Chat-System zu adaptieren – **ohne das Repo zu klonen**, sondern durch
selektives Übernehmen und Anpassen einzelner Konzepte.

### Warum Vercel Chatbot als Referenz?

| Kriterium             | Vercel Chatbot          | LifeOS                          |
|-----------------------|-------------------------|----------------------------------|
| Framework             | Next.js App Router      | Next.js App Router               |
| Styling               | Tailwind CSS            | Tailwind CSS                     |
| Animationen           | Framer Motion / Motion  | Framer Motion                    |
| Icons                 | Lucide React            | Lucide React                     |
| Lizenz                | **Apache 2.0** ✅        | -                                |
| Markdown              | `streamdown` + `shiki`  | `react-markdown` + `remark-gfm`  |
| Code-Highlighting     | `shiki` (vollständig)   | ❌ Fehlt komplett                 |
| Streaming             | `ai` SDK native         | SSE-basiert (eigene Impl.)       |
| Message Actions       | Copy, Edit, Vote        | ❌ Fehlt komplett                 |
| Reasoning-Anzeige     | Collapsible + Shimmer   | ❌ Fehlt komplett                 |
| Multimodal Input      | D&D, Paste, File Upload | Textarea-only (trotz Types)      |
| Suggested Actions     | Klickbare Vorschläge    | ❌ Fehlt komplett                 |
| Tool-Visualisierung   | Collapsible Cards       | Minimale Badges                  |

---

## 2. Betroffene LifeOS-Dateien (IST-Zustand)

### Chat-Modul (Agents)
| Datei | Zeilen | Funktion | Bewertung |
|-------|--------|----------|-----------|
| `ChatMarkdown.tsx` | 65 | Markdown-Rendering für Assistenten-Nachrichten | ⚠️ Basic – kein Syntax-Highlighting, kein Streaming |
| `ChatMessage.tsx` | 325 | Einzelne Nachricht (User/Assistant) | ✅ Gut – Reply, Agent-Farben, Tool-Badges, Workspace-Embed |
| `ChatInput.tsx` | 139 | Eingabefeld (Textarea + Send) | ⚠️ Minimal – kein D&D, keine Attachments im UI |
| `ChatPage.tsx` | 237 | Hauptansicht Chat-Modul | ✅ OK – Agent-Integration, Sidebar |

### Globale Chatbar (Orb-Chat)
| Datei | Zeilen | Funktion | Bewertung |
|-------|--------|----------|-----------|
| `ChatWidget.tsx` | 1591 | Intelligence Orb + Chat-Panel | ✅ Umfangreich – aber fehlende Message Actions, kein Markdown-Rendering im Orb-Chat |

### Types
| Datei | Zeilen | Funktion | Bewertung |
|-------|--------|----------|-----------|
| `types.ts` | 871 | Alle Agent/Chat Typen | ✅ Sehr umfangreich – `images`, `files`, `toolCalls` schon vorhanden |

---

## 3. Upgrade-Phasen (6 Phasen)

---

### Phase 1: Code-Highlighting & Markdown-Upgrade ⭐ Höchster Impact

**Ziel:** Assistenten-Nachrichten sehen professionell aus – mit Syntax-Highlighting,
Copy-Button und besserem Rendering.

**Vercel-Referenz:**
- `components/ai-elements/code-block.tsx` (Shiki-basiert, mit Caching, Copy-Button)
- `components/ai-elements/message.tsx` (nutzt `streamdown` für Streaming-Markdown)

**Was zu tun ist:**

1. **Neue Dependency installieren:**
   ```bash
   npm install shiki
   ```

2. **Neue Datei: `src/modules/agents/components/CodeBlock.tsx`**
   Adaptiert von Vercels `code-block.tsx`, vereinfacht für LifeOS:
   - Shiki-Highlighter mit Singleton-Cache (ein Highlighter pro Sprache)
   - Token-Cache für Performance (identischer Code wird nicht neu gehighlightet)
   - Fallback: Raw-Tokens sofort anzeigen, Highlighting asynchron nachladen
   - Copy-to-Clipboard Button (oben rechts im Block, mit Check-Animation)
   - Sprach-Label oben links im Block
   - Dark Theme: `github-dark` (passt zu LifeOS Glassmorphism)
   - Zeilennummern optional (CSS-Counter statt JS)

3. **`ChatMarkdown.tsx` erweitern:**
   - `code`-Renderer: Block-Code an `CodeBlock` delegieren
   - Inline-Code bleibt `<code className="rounded bg-white/10 px-1 py-0.5">`
   - `pre`-Renderer: Sprache aus `className` extrahieren (`language-xyz`)
   - Optional: KaTeX-Support für Math (`$...$` und `$$...$$`) – kann Phase 2+ werden

4. **Anpassungen für LifeOS-Design:**
   - Glassmorphism-Hintergrund für Code-Blöcke: `bg-black/30 backdrop-blur-sm`
   - Rahmen: `border border-white/10`
   - Copy-Button: Accent-Farbe des Theme-Systems nutzen
   - Header-Zeile: Sprach-Badge links, Copy rechts

**Geschätzte neue/geänderte Dateien:** 2 neue, 1 geändert
**Geschätzter Aufwand:** 2–3 Stunden
**Dependencies:** `shiki` (~400KB, tree-shakeable)

---

### Phase 2: Message Actions (Copy, Edit, Regenerate)

**Ziel:** Hover-Aktionen auf jeder Nachricht – wie bei ChatGPT/Claude.

**Vercel-Referenz:**
- `components/chat/message-actions.tsx` (Copy, Edit, Vote Up/Down)
- `components/ai-elements/message.tsx` (`MessageActions`, `MessageAction` mit Tooltips)

**Was zu tun ist:**

1. **Neue Datei: `src/modules/agents/components/ChatMessageActions.tsx`**
   - Container: Erscheint auf Hover (opacity 0 → 1, transition)
   - Position: Über der Nachricht (User: rechts, Assistant: links)
   - Aktionen:
     | Aktion | Icon | Funktion |
     |--------|------|----------|
     | Kopieren | `Copy` / `Check` | Text in Zwischenablage, 2s Check-Animation |
     | Bearbeiten | `Pencil` | Nur für User-Nachrichten – öffnet Edit-Modus |
     | Regenerieren | `RefreshCw` | Nur für letzte Assistenten-Nachricht – erneut generieren |
     | Antworten | `Reply` | Bestehende Reply-Funktion (schon in ChatMessage) |

2. **`ChatMessage.tsx` anpassen:**
   - `<ChatMessageActions>` statt des aktuellen einzelnen Reply-Buttons integrieren
   - `onEdit` Callback für User-Nachrichten hinzufügen
   - `onRegenerate` Callback für letzte Assistenten-Nachricht

3. **`ChatPage.tsx` / `ChatWidget.tsx` anpassen:**
   - Edit-Handler: Nachricht in Input laden, alte Nachricht + Antwort entfernen
   - Regenerate-Handler: Letzte Assistenten-Nachricht löschen, erneut senden

4. **Store-Anpassung (minimal):**
   - `updateMessage` existiert bereits in `AgentsActions`
   - `deleteMessage` existiert bereits
   - Kein neuer Store-Code nötig

**Geschätzte neue/geänderte Dateien:** 1 neue, 3 geändert
**Geschätzter Aufwand:** 2–3 Stunden
**Dependencies:** Keine neuen

---

### Phase 3: Reasoning/Thinking-Anzeige

**Ziel:** Wenn der Agent "nachdenkt" (Tool-Calls, Planung), zeige einen aufklappbaren
"Thinking"-Block wie bei ChatGPT o1/Claude.

**Vercel-Referenz:**
- `components/ai-elements/reasoning.tsx` (Collapsible, Auto-Open/Close, Duration)
- `components/ai-elements/shimmer.tsx` (Animierter "Thinking..." Text)

**Was zu tun ist:**

1. **Neue Datei: `src/modules/agents/components/ThinkingBlock.tsx`**
   Adaptiert von Vercels `reasoning.tsx`:
   - `<Collapsible>` (kann mit Radix UI oder eigener Implementierung)
   - Auto-Open wenn Reasoning-Stream startet
   - Auto-Close 1s nach Stream-Ende (mit Fade-Animation)
   - Trigger zeigt: "Denkt nach..." (streaming) → "Hat X Sekunden nachgedacht" (fertig)
   - Dauer wird live gemessen (Start/Stop Timer)
   - Content: Streaming-Text des Reasoning/Chain-of-Thought

2. **Neue Datei: `src/modules/agents/components/Shimmer.tsx`**
   Adaptiert von Vercels `shimmer.tsx`:
   - CSS-Gradient Animation über Text (wie ein Lichtstreifen)
   - Framer Motion für smooth masking
   - Ersetzt die aktuellen Bouncing-Dots (`●●●`)

3. **`ChatMessage.tsx` / `ChatWidget.tsx` anpassen:**
   - Anstelle der Bouncing-Dots: `<ThinkingBlock isStreaming={true}>`
   - Wenn `toolCalls` vorhanden: Tool-Namen im ThinkingBlock anzeigen
   - Falls der Agent zwischenzeitliche Reasoning-Texte liefert → live anzeigen

4. **Typen-Erweiterung (`types.ts`):**
   ```typescript
   // Neues Feld in ChatMessageData:
   reasoning?: string;          // Chain-of-Thought / Reasoning-Text
   reasoningDuration?: number;  // Dauer des Denkprozesses in Sekunden
   ```

5. **SSE-Stream erweitern (optional, Phase 3b):**
   - Neuer Event-Typ: `{ type: 'reasoning_token', token: string }`
   - `ChatWidget.tsx` sammelt Reasoning-Tokens und zeigt sie im ThinkingBlock

**Geschätzte neue/geänderte Dateien:** 2 neue, 3 geändert
**Geschätzter Aufwand:** 3–4 Stunden
**Dependencies:** Keine neuen (Framer Motion bereits vorhanden)

---

### Phase 4: Multimodal Input (Datei-Upload & Drag-and-Drop)

**Ziel:** Der ChatInput unterstützt Bild- und Datei-Uploads per Klick, Drag-and-Drop
und Einfügen aus der Zwischenablage.

**Vercel-Referenz:**
- `components/chat/multimodal-input.tsx` (24KB, Attachments, Paste, D&D, Previews)
- `components/chat/preview-attachment.tsx` (Bild-/Datei-Vorschauen)

**Wichtig:** Die Datenstrukturen existieren bereits in LifeOS (`AttachedImage`,
`AttachedFile`, `ChatMessageData.images`, `ChatMessageData.files`). Nur das UI fehlt!

**Was zu tun ist:**

1. **`ChatInput.tsx` massiv erweitern (oder neue Datei `ChatMultimodalInput.tsx`):**
   - State für Attachments: `attachments: (AttachedImage | AttachedFile)[]`
   - **Drag-and-Drop Zone:**
     - `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` Handler
     - Visuelles Overlay wenn Datei über dem Input schwebt ("Datei hier ablegen")
     - Dateityp-Erkennung: Bilder → Vision, andere → Textextraktion
   - **Paste-Handler:**
     - `onPaste` Event auf Textarea
     - Bilder aus Zwischenablage erkennen und als Preview hinzufügen
   - **File-Button (Büroklammer-Icon):**
     - Hidden `<input type="file" multiple>` triggern
     - Akzeptierte Typen: `image/*,.pdf,.txt,.md,.csv,.json,.xlsx`
   - **Attachment-Preview-Leiste:**
     - Horizontal scrollbar über dem Input
     - Bilder: Thumbnail (h-16, rounded) mit X-Button zum Entfernen
     - Dateien: Name + Typ-Badge mit X-Button
   - Beim Senden: Attachments in die Nachricht einbetten (`images`, `files`)

2. **Neue Datei: `src/modules/agents/components/AttachmentPreview.tsx`**
   Adaptiert von Vercels `preview-attachment.tsx`:
   - Bild-Thumbnails mit Lade-Animation
   - Datei-Icon + Name + Größe
   - X-Button zum Entfernen (oben rechts)
   - Hover-Effekt mit leichtem Scale

3. **Anpassungen in `ChatPage.tsx`:**
   - `handleSendMessage` erweitern: Attachments mitsenden
   - Agent-Request um `images` und `files` erweitern

4. **Anpassungen in `ChatWidget.tsx` (Orb-Chat):**
   - Kompaktere Version: Nur File-Button (Büroklammer) neben dem Input
   - Keine Drag-and-Drop-Zone (zu klein), aber Paste-Support

**Geschätzte neue/geänderte Dateien:** 1–2 neue, 3 geändert
**Geschätzter Aufwand:** 4–5 Stunden
**Dependencies:** Keine neuen

---

### Phase 5: Suggested Actions & Slash Commands

**Ziel:** Vorgeschlagene Aktionen bei leerem Chat + Slash-Befehle für Power-User.

**Vercel-Referenz:**
- `components/chat/suggested-actions.tsx` (Klickbare Vorschläge, Framer Motion)
- `components/ai-elements/suggestion.tsx` (Suggestion-Button-Komponente)
- `components/chat/slash-commands.tsx` (Dropdown mit Befehlen)

**Was zu tun ist:**

1. **Neue Datei: `src/modules/agents/components/SuggestedActions.tsx`**
   - Wird angezeigt wenn der Chat leer ist (keine Nachrichten)
   - Modul-spezifische Vorschläge je nach aktivem Agent:
     | Agent | Beispiel-Vorschläge |
     |-------|---------------------|
     | Master | "Wie ist mein Tag?", "Fasse meine Inbox zusammen", "Was steht an?" |
     | Calendar | "Zeige meine Termine heute", "Erstelle einen Termin für morgen" |
     | Inbox | "Gibt es neue E-Mails?", "Schreibe eine E-Mail an..." |
     | Agents | "Erstelle einen neuen Agent", "Zeige meine Gruppen" |
   - Animiertes Einblenden (Stagger-Animation via Framer Motion)
   - Klick → Nachricht wird direkt gesendet (kein Eintragen in Input)

2. **Neue Datei: `src/modules/agents/components/SlashCommands.tsx`**
   - Dropdown-Menü das erscheint wenn User `/` tippt
   - Befehle:
     | Befehl | Beschreibung | Aktion |
     |--------|-------------|--------|
     | `/neu` | Neuen Chat erstellen | `createConversation()` |
     | `/leeren` | Chat-Verlauf leeren | Messages löschen |
     | `/agent` | Agent wechseln | Agent-Auswahl öffnen |
     | `/web` | Web Research an/aus | Toggle `webResearchEnabled` |
     | `/deep` | Deep Research an/aus | Toggle `deepResearchEnabled` |
     | `/modell` | Modell wechseln | Modell-Selektor öffnen |
   - Tastatur-Navigation: ↑/↓ für Auswahl, Enter/Tab für Bestätigung, Esc zum Schließen
   - Fuzzy-Filter während Tippen

3. **`ChatInput.tsx` / `ChatMultimodalInput.tsx` anpassen:**
   - Slash-Detection: wenn Input mit `/` beginnt → Dropdown öffnen
   - `onInput` statt `onChange` für Echtzeit-Erkennung

4. **`ChatPage.tsx` anpassen:**
   - `<SuggestedActions>` rendern wenn `activeConversation.messages.length === 0`

5. **`ChatWidget.tsx` anpassen:**
   - Kompakte Version der SuggestedActions im Orb-Chat (2–3 statt 4)

**Geschätzte neue/geänderte Dateien:** 2 neue, 3 geändert
**Geschätzter Aufwand:** 3–4 Stunden
**Dependencies:** Keine neuen

---

### Phase 6: Tool-Visualisierung Upgrade

**Ziel:** Tool-Calls werden als aufklappbare Karten statt als kleine Badges dargestellt.

**Vercel-Referenz:**
- `components/ai-elements/tool.tsx` (Collapsible, Status-Icons, Input/Output-Anzeige)

**Was zu tun ist:**

1. **Neue Datei: `src/modules/agents/components/ToolCallCard.tsx`**
   Adaptiert von Vercels `tool.tsx`:
   - Collapsible Card pro Tool-Call
   - **Header (immer sichtbar):**
     - Tool-Icon (Wrench) + Tool-Name (human-readable formatiert)
     - Status-Badge: Running (Spinner), Completed (✓ grün), Failed (✗ rot)
     - Chevron zum Aufklappen
   - **Content (aufklappbar):**
     - "Parameter": JSON der Eingabe (formatiert in CodeBlock)
     - "Ergebnis": Ausgabe des Tools (formatiert)
     - Bei Fehler: Fehlermeldung rot hervorgehoben
   - Animation: Smooth Expand/Collapse (Framer Motion `AnimatePresence`)

2. **`ChatMessage.tsx` anpassen:**
   - Aktuellen `toolCalls` Bereich ersetzen:
     ```
     VORHER: Kleine grün/rote Badges mit Tool-Name
     NACHHER: <ToolCallCard> pro Tool-Call
     ```
   - Tool-Cards erscheinen über dem Nachrichtentext (wie bei Vercel)

3. **`ChatWidget.tsx` anpassen:**
   - Im Orb-Chat: Kompaktere Version (nur Header, nicht aufklappbar)
   - Oder: Link "X Tools ausgeführt" der zum vollständigen Chat wechselt

4. **Typen-Erweiterung (`types.ts`):**
   ```typescript
   // ToolCall erweitern um Input-Daten:
   toolCalls?: Array<{
     name: string;
     input?: Record<string, unknown>;  // NEU: Was wurde übergeben?
     result: {
       success: boolean;
       message?: string;
       data?: Record<string, unknown>;
       error?: string;
     };
     duration?: number;  // NEU: Wie lange hat der Call gedauert?
   }>;
   ```

**Geschätzte neue/geänderte Dateien:** 1 neue, 3 geändert
**Geschätzter Aufwand:** 2–3 Stunden
**Dependencies:** Keine neuen

---

## 4. Dependency-Übersicht

| Package | Phase | Zweck | Größe | Bereits vorhanden? |
|---------|-------|-------|-------|---------------------|
| `shiki` | 1 | Syntax-Highlighting | ~400KB (tree-shake) | ❌ Neu |
| `react-markdown` | – | Markdown-Rendering | – | ✅ Ja |
| `remark-gfm` | – | GitHub-Flavored MD | – | ✅ Ja |
| `framer-motion` | 3,5,6 | Animationen | – | ✅ Ja |
| `lucide-react` | 2,5,6 | Icons | – | ✅ Ja |

**Einzige neue Dependency: `shiki`** – wird in Phase 1 installiert.

Optional für spätere Erweiterungen:
- `katex` + `remark-math` + `rehype-katex` – für LaTeX-Math-Rendering
- `mermaid` – für Diagramme in Code-Blöcken
- `streamdown` – Vercels eigene Streaming-Markdown-Library (Alternative zu react-markdown)

---

## 5. Zeitplan und Priorisierung

```
Woche 1:  Phase 1 (Markdown/Code)     ████████████  [HÖCHSTER IMPACT]
          Phase 2 (Message Actions)    ████████████  [HÖCHSTER IMPACT]

Woche 2:  Phase 3 (Reasoning)         ████████████  [HOHER IMPACT]
          Phase 5 (Suggestions)        ████████████  [HOHER IMPACT]

Woche 3:  Phase 4 (Multimodal Input)  ████████████  [MITTLERER IMPACT]
          Phase 6 (Tool Cards)         ████████████  [MITTLERER IMPACT]
```

**Empfohlene Reihenfolge:** 1 → 2 → 3 → 5 → 4 → 6

Phase 1+2 zusammen haben den größten visuellen Impact und sind relativ schnell
umsetzbar. Phase 3+5 machen den Chat "intelligent" und interaktiv. Phase 4+6
sind Quality-of-Life Verbesserungen.

---

## 6. Design-Richtlinien für die Adaptation

Alle adaptierten Komponenten müssen sich an das LifeOS-Designsystem halten:

1. **Glassmorphism:** `bg-white/10 backdrop-blur-md` statt harter Hintergründe
2. **Theme-System:** Farben aus `useThemeStyles()` verwenden
3. **Brutal-Mode:** Alle Komponenten müssen `designStyle === 'brutal'` unterstützen
4. **Akzentfarbe:** `accentColor` für Buttons, Highlights, aktive States
5. **Textfarbe:** `textColor` statt hardcoded Weiß
6. **Animationen:** Framer Motion mit kurzen, snappy Übergängen (200-300ms)
7. **Kompaktes Design:** `p-4`, `gap-2`, `text-sm` – nicht zu viel Whitespace
8. **Deutsche Texte:** Alle UI-Strings auf Deutsch

---

## 7. Abgrenzung: Was wir NICHT übernehmen

| Vercel-Feature | Grund |
|---------------|-------|
| Auth.js Integration | LifeOS hat kein Auth-System |
| Neon Postgres / Drizzle | LifeOS nutzt Zustand + Prisma |
| Vercel AI Gateway | LifeOS hat eigenes Agent-System |
| Artifact-System (Code-Editor, Sheet-Editor) | Zu komplex für Phase 1, eigenes Konzept nötig |
| Document versioning / Diff-View | Benötigt DB-Schema-Änderungen |
| Vote-System (Up/Down) | Kein serverseitiges Speichern aktuell |
| Sidebar-History mit Server-Sync | LifeOS nutzt Zustand-Persistenz |
| `streamdown` Library | Evaluieren ob nötig – `react-markdown` reicht evtl. |
| `botid` / Team-Collaboration | Out of Scope |

---

## 8. Dateistruktur nach Upgrade (Ziel)

```
src/modules/agents/components/
├── ChatPage.tsx                    (angepasst: SuggestedActions, ThinkingBlock)
├── ChatMessage.tsx                 (angepasst: MessageActions, ToolCallCard)
├── ChatMarkdown.tsx                (angepasst: CodeBlock-Integration)
├── ChatInput.tsx                   (erweitert: D&D, Paste, File-Button)
├── ChatSidebar.tsx                 (unverändert)
├── ChatHistorySidebar.tsx          (unverändert)
├── ChatFolder.tsx                  (unverändert)
│
├── CodeBlock.tsx                   ★ NEU (Phase 1)
├── ChatMessageActions.tsx          ★ NEU (Phase 2)
├── ThinkingBlock.tsx               ★ NEU (Phase 3)
├── Shimmer.tsx                     ★ NEU (Phase 3)
├── AttachmentPreview.tsx           ★ NEU (Phase 4)
├── SuggestedActions.tsx            ★ NEU (Phase 5)
├── SlashCommands.tsx               ★ NEU (Phase 5)
└── ToolCallCard.tsx                ★ NEU (Phase 6)

src/components/shell/
├── ChatWidget.tsx                  (angepasst: Shimmer, kompakte Actions)
└── IntelligenceOrb.tsx             (unverändert)
```

**Zusammenfassung:** 8 neue Dateien, 5 geänderte Dateien, 1 neue Dependency.
