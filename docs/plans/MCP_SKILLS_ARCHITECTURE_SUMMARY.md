# ============================================
# MCP-Server, Skill-System, Document Generation & Agent-Architektur
# Konversations-Summary
#
# Zweck: Detaillierte Zusammenfassung der Architektur-Analyse und
#        strategischen Entscheidungen rund um MCP-Integration,
#        Playwright MCP Browser-Automation, universelles Skill-System,
#        Document Generation Pipeline und automatische Tool-Generierung.
# Erstellt: 2026-04-08
# ============================================

---

## 1. Ausgangsfrage: Welche MCP-Server brauchen wir?

### 1.1 Bestandsaufnahme: MCP in LifeOS heute

LifeOS nutzt **aktuell kein echtes MCP-Protokoll**. Die Begriffe `mcp:gmail` und `mcp:browser` in `tool-metadata.ts` sind rein heuristische Labels fuer die UI – kein Protokoll.

Was existiert:
- **10 native Tool-Module** registriert in `init-server.ts` (Inbox, Calendar, Browser, App, Memory, Lab, Agents, Settings, Marketplace, Lab-Debug)
- **ToolRegistry** als Singleton mit `register()`, `execute()`, `getClaudeTools()`
- **Tool-Scoping** pro Agent via `tool-scope.ts` (master, calendar, inbox, lab, agents)
- **External App Catalog** (`catalog.ts`) mit MCP-Server-URLs fuer Canva, Figma, GitHub, Linear, Slack, Notion – aber **ohne technische Anbindung**
- **Skill-System V1**: Nur Metadaten-Deklarationen (ID, Name, Required-Tools, Required-Integrations), keine eigene Logik/Prompts

### 1.2 Empfohlene MCP-Server (priorisiert)

#### Tier 1 – Sofort hoher Impact

| MCP-Server | Nutzen fuer LifeOS |
|---|---|
| **GitHub MCP** (`https://api.githubcopilot.com/mcp/`) | Lab/Builder-Agents bekommen Repo-/Issue-/PR-Zugriff |
| **Linear MCP** (`https://mcp.linear.app/mcp`) | Task-/Scheduling-System bekommt Projekt-Backend |
| **Notion MCP** (offiziell) | Erweitert Memory-System um externe Dokumente/Wikis |
| **Slack MCP** (offiziell) | Erweitert Inbox ueber Email hinaus auf Team-Kommunikation |

#### Tier 2 – Strategisch wertvoll

| MCP-Server | Nutzen |
|---|---|
| **Google Calendar MCP** | Echte Kalender-Sync |
| **Google Drive / Docs MCP** | Cloud-Dokument-Zugriff |
| **Figma MCP** | Design-Kontext fuer Creative-Workflows |
| **Brave Search / Exa MCP** | Schnelle Web-Recherche ohne Browser-Overhead |
| **Filesystem MCP** | Lab/Builder Dateizugriff als WebContainer-Ergaenzung |

#### Tier 3 – Zukunft

| MCP-Server | Use Case |
|---|---|
| **Postgres MCP** | Direkte DB-Analyse/Reporting |
| **Zapier / Make MCP** | Automation-Erweiterung auf tausende Services |
| **Memory / Knowledge Graph MCP** | Upgrade von Flat-KV zu Graph-Relationen |

---

## 2. MCP-Client-Layer: Brauchen wir das?

### 2.1 Was es ist

Ein **generischer MCP-Client**, der sich zwischen beliebige MCP-Server und die bestehende `ToolRegistry` schaltet. Ein Client fuer alle Server – nicht pro Server ein eigener.

```
MCP-Server (Linear, GitHub, ...) → MCP-Client-Layer → ToolRegistry.register() → Agent nutzt Tools
```

### 2.2 Was es bringt

| Aspekt | Ohne MCP-Client | Mit MCP-Client |
|---|---|---|
| Neue Integration | 300-500 Zeilen pro Service | 3-5 Zeilen Konfiguration |
| Maintenance | Eigene API-Pflege | MCP-Server-Betreiber pflegt |
| Skalierung | Realistisch 5-10 Integrationen | 50+ moeglich |
| Auth | Eigenes OAuth pro Service | MCP-Protokoll hat OAuth eingebaut |
| Time-to-Integration | Tage bis Wochen | Minuten bis Stunden |

### 2.3 Was es NICHT bringt

- Ersetzt **keine nativen Tools** (UI-Steuerung, Memory, Navigation – zu tief mit State verwoben)
- Remote-MCP-Calls sind **langsamer** als lokale Funktionsaufrufe
- Weniger Kontrolle ueber Error-Handling und Retry-Logik

### 2.4 Entscheidung

**Lohnt sich erst bei >2-3 externen Services.** Nicht auf Vorrat bauen. Beim ersten konkreten MCP-Server (GitHub oder Linear empfohlen) den Client direkt generisch bauen. Bestehende Architektur (ToolRegistry, tool-scope, execute) bleibt **komplett unveraendert**.

---

## 3. Playwright MCP: Browser-Automation Upgrade

### 3.1 Aktueller Stand: Eigener browser-service

LifeOS betreibt einen **eigenen Playwright-basierten Express-Server** (`browser-service/`):
- Separater Prozess auf Port 3001
- REST-API fuer: navigate, click(x,y), type, scroll, keypress, hover, screenshot
- Session-/Tab-Management mit Auto-Cleanup (~620 Zeilen Code)
- Agent steuert externe Websites ueber Pixel-Koordinaten

**Hauptproblem:** Der Agent muss Screenshots machen und **pixelweise raten**, wo er klicken soll. Keine strukturelle Seiten-Analyse, kein Netzwerk-/Console-Zugriff.

### 3.2 Was der Playwright MCP-Server bietet

Der [offizielle Playwright MCP-Server](https://github.com/microsoft/playwright-mcp) von Microsoft liefert Browser-Automation ueber das MCP-Protokoll:

| Tool | Funktion |
|---|---|
| `browser_navigate` | URL oeffnen |
| `browser_click` | Element klicken (per **Accessibility-Ref**, nicht x/y) |
| `browser_type` / `browser_fill` | Text eingeben |
| `browser_snapshot` | **Accessibility-Tree als YAML** (strukturiert, nicht nur Screenshot) |
| `browser_screenshot` | Visueller Screenshot |
| `browser_hover`, `browser_scroll` | Interaktion |
| `browser_tab_*` | Tab-Management |
| `browser_console_messages` | JS-Konsole auslesen |
| `browser_network_requests` | Netzwerk-Requests inspizieren |
| `browser_pdf_save` | Seite als PDF speichern |
| `browser_wait` | Auf Seitenaenderungen warten |

### 3.3 Vergleich: browser-service vs. Playwright MCP

| Aspekt | Eigener `browser-service/` | Playwright MCP-Server |
|---|---|---|
| **Interaktion** | Pixel-Koordinaten (x/y Klick) | **Accessibility-Refs** (semantisch, robuster) |
| **Seiten-Verstaendnis** | Nur Screenshot (Agent muss Bild interpretieren) | **Accessibility-Snapshot** (strukturierter YAML-Baum mit Refs) |
| **Protokoll** | Eigene REST-API | Standard MCP-Protokoll |
| **Element-Targeting** | `page.mouse.click(x, y)` | `ref=s3e4` aus Accessibility-Tree |
| **Seiteninhalt lesen** | Nicht implementiert | `browser_snapshot` gibt strukturierten Content |
| **Formular-Ausfuellung** | `page.fill(selector, text)` – braucht CSS-Selector | `browser_fill(ref, text)` – braucht nur Accessibility-Ref |
| **Netzwerk/Console** | Nicht implementiert | Eingebaut |
| **PDF-Export** | Nicht implementiert | `browser_pdf_save` eingebaut |
| **Tab-Management** | Vorhanden (eigen) | Vorhanden (Standard) |
| **Setup** | Eigener Express-Server, eigene Wartung | `npx @playwright/mcp` – fertig |
| **Auth/Cookies** | Manuell | Persistenter User-Data-Dir, wiederverwendbare Sessions |

### 3.4 Kernvorteil: Accessibility-Snapshots statt Screenshot-Parsing

Aktuell: Screenshot → Agent muss **pixelweise raten** → fehleranfaellig, teuer (Vision-API-Calls).

Playwright MCP liefert einen **strukturierten Accessibility-Baum**:

```yaml
- navigation "Hauptmenue":
  - link "Dashboard" [ref=s1e2]
  - link "Einstellungen" [ref=s1e3]
- main:
  - heading "Willkommen" [level=1]
  - textbox "Suche" [ref=s2e1]
  - button "Absenden" [ref=s2e2]
```

Agent sieht: "Suchfeld-Ref ist `s2e1`" → `browser_fill(ref=s2e1, "query")`.
Kein Raten, keine Vision-API, weniger Tokens, **~10x zuverlaessiger**.

### 3.5 Was Playwright MCP NICHT ersetzt

| Bereich | Bleibt wie es ist |
|---|---|
| **Visual Executor** (LifeOS-interne UI) | `dom-actions.ts` + `visual-tool-recipes.ts` steuern die eigene App |
| **Browser-Store / UI-State** | Tab-Zustand im Zustand-Store fuer Frontend |
| **`data-agent-*` Targeting** | Fuer die eigene App weiterhin das bessere System |

### 3.6 Entscheidung

**Playwright MCP ersetzt den eigenen `browser-service/`.**

Vorteile:
- ~620 Zeilen eigener Code + eigene REST-API fallen weg
- Accessibility-basiertes Targeting statt Pixel-Raten
- Netzwerk-Inspektion, Console-Zugriff, PDF-Export gratis
- Gewartet von Microsoft/Playwright-Team
- Wenn MCP-Client-Layer sowieso gebaut wird (fuer Exa etc.), ist Playwright MCP ein natuerlicher zweiter Server

**Aufwand:** ~1 Tag (MCP-Client-Layer bauen + browser-service umverdrahten)

---

## 4. Lokale MCP-Server ohne externe Abhaengigkeiten

### 4.1 Prioritaets-Ranking

| Prio | MCP-Server | Aufwand | Nutzen |
|---|---|---|---|
| **1** | **Playwright MCP** (Browser-Automation) | ~1 Tag | Ersetzt eigenen browser-service, 10x besseres Targeting |
| **2** | **Exa** (Web-Suche fuer AI-Agents) | ~1h Setup | Agent bekommt Weltwissen; Research-Skill wird 10x besser |
| **3** | **Filesystem** (eingeschraenkt) | ~2h | Lab/Builder bekommt echten Dateizugriff |
| **4** | Postgres (read-only) | ~1h | Analyse-Queries ueber alle 19 DB-Tabellen |
| **5** | Memory/Knowledge Graph | ~4h | Upgrade von Flat-KV zu Graph-Relationen |

### 4.2 Playwright MCP vs. Exa: Komplementaer, nicht konkurrierend

Die beiden loesen **komplett verschiedene Probleme**:

| | Playwright MCP | Exa MCP |
|---|---|---|
| **Was es tut** | Echten Browser fernsteuern (klicken, tippen, navigieren) | Semantische Web-Suche mit Volltextantworten |
| **Kategorie** | Browser-Automation | Wissens-/Recherche-API |
| **Use Case** | "Geh auf booking.com und buche ein Hotel" | "Was sind die besten Hotels in Berlin unter 100€?" |
| **Output** | Screenshots, Accessibility-Tree, interaktive Aktionen | Strukturierter Text, Seiteninhalt, URLs |
| **Ersetzt bei uns** | `browser-service/` (~620 Zeilen eigener Code) | Nichts (komplett neue Capability) |
| **Braucht Browser?** | Ja (headless Chromium) | Nein (reine API) |
| **Kosten pro Call** | CPU/RAM fuer Chromium, kein API-Key | API-Key + ~$1/1000 Queries |
| **Latenz** | 2-10 Sekunden | ~200-500ms |

**Beispiel fuer die Komplementaritaet:**

```
Recherche-Task MIT Exa (schnell):
  1. exa.search("beste Projektmanagement-Tools 2026")
  → 500ms, 1 Tool-Call, Inhalt von 10 Seiten

Recherche-Task OHNE Exa (nur Playwright, langsam):
  1. browser_navigate("google.com")          → 2s
  2. browser_fill(Suchfeld, "...")            → 1s
  3. browser_click(Enter)                     → 2s
  4. browser_snapshot()                       → 1s
  5. browser_click(Ergebnis 1)               → 2s
  6. browser_snapshot() → Seiteninhalt lesen  → 1s
  7. Wiederholen fuer 4 weitere Ergebnisse... → 20s
  → Gesamt: ~30-40 Sekunden, 10+ Tool-Calls, fragil

Interaktions-Task (nur Playwright, Exa kann das nicht):
  1. browser_navigate("linear.app")
  2. browser_fill(email), browser_fill(password)
  3. browser_click("New Issue")
  → Echte Web-App-Bedienung
```

**Empfehlung:** Playwright MCP zuerst (ersetzt Code, sofortiger Netto-Gewinn), Exa danach (neue Capability).

### 4.3 Exa vs. Brave Search

**Empfehlung: Exa**, weil:
1. Semantische Suche versteht natuerliche Sprache (passt besser zu LLM-Queries)
2. Gibt **vollen Seiteninhalt** zurueck (kein zweiter Browser-Call noetig)
3. Ein Tool-Call statt 5-10 (spart Tokens, Zeit, Kosten)
4. Browser-Modul deckt tagesaktuelle News ab (komplementaer)

**Brave Search** hat keinen Bezug zum Brave Browser – ist eine eigenstaendige Suchmaschinen-API.

---

## 5. Skill-System: Universeller Umbau

### 5.1 Problem: Aktuelles V1-Skill-System

Ein LifeOS-Skill ist aktuell **nur eine Metadaten-Deklaration**:

```typescript
interface AgentSkillDefinition {
  id: string;
  name: string;
  description: string;
  requiresIntegrations: AgentIntegrationId[];
  requiresTools: string[];
  // KEIN systemPrompt, KEINE steps, KEINE Logik
}
```

Bei Skill-Ausfuehrung passiert: Guard-Check (Integrations/Tools vorhanden?) → Wenn ok → **normaler LLM-Call ohne Skill-spezifisches Verhalten**. Der Skill aendert weder Prompt noch Tools noch Verhalten.

Externe Skills (Clawhub, GitHub, SmitheryAI) sind **nicht importierbar**, weil:
- Andere Tool-IDs (`send_email` vs. `inbox.sendEmail`)
- Andere Formate (Prompt-Templates, LangChain-Chains, MCP-Tool-Bundles)
- Kein Platz fuer Prompts oder Logik im Interface

### 5.2 Neues universelles Skill-Format

```typescript
interface SkillDefinition {
  // Identitaet
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  source?: 'builtin' | 'marketplace' | 'import';

  // Prompt-Layer (NEU – Herzstueck)
  systemPrompt: string;
  userPromptTemplate?: string;
  variables?: SkillVariable[];

  // Step-Definition (NEU – fuer Workflows)
  steps?: SkillStep[];
  mode: 'prompt' | 'workflow';

  // Tool-Anforderungen (erweitert)
  requiredTools: string[];
  requiredCapabilities?: string[];   // Abstrakte Capabilities statt harte IDs
  optionalTools?: string[];

  // Guard-Bedingungen
  requiresIntegrations: string[];

  // Output-Format (NEU)
  outputFormat?: 'text' | 'markdown' | 'json' | 'action';
  outputSchema?: Record<string, unknown>;
}
```

### 5.3 Drei entscheidende Neuerungen

**1. `systemPrompt` – macht Skills portabel**

Der Skill bringt sein Verhalten mit. Das LLM bekommt den Skill-Prompt zusaetzlich zum System-Prompt injiziert.

**2. `requiredCapabilities` – Abstraktion ueber Tool-IDs**

```typescript
const CAPABILITY_MAP: Record<string, string[]> = {
  'email.read':       ['inbox.searchEmails', 'inbox.open'],
  'email.send':       ['inbox.sendEmail', 'inbox.composeEmail'],
  'calendar.read':    ['calendar.listEvents', 'calendar.getStatus'],
  'web.search':       ['browser.search', 'browser.navigate'],
  'memory.read':      ['memory.recall', 'memory.list'],
  'memory.write':     ['memory.save', 'memory.update'],
};
```

Externer Skill sagt `requiredCapabilities: ['email.send']` → LifeOS mappt auf `inbox.sendEmail`. Anderes System mappt auf sein eigenes Tool. Skills werden **portabel zwischen Systemen**.

**3. `steps` – Multi-Step-Workflows**

```typescript
interface SkillStep {
  id: string;
  name: string;
  prompt: string;
  requiredTools?: string[];
  condition?: string;
  outputVariable?: string;
}
```

### 5.4 Import-Format (YAML)

```yaml
id: inbox.zero.daily
name: Inbox Zero Daily
version: 1.2.0
author: community:max-mustermann
mode: prompt
systemPrompt: |
  Du fuehrst den Inbox Zero Prozess durch:
  1. Hole ungelesene Mails (max 20)
  2. Kategorisiere: ACTION_REQUIRED, FYI, DELEGATE, ARCHIVE
  3. Erstelle Antwortentwuerfe fuer ACTION_REQUIRED
requiredCapabilities:
  - email.read
  - email.send
variables:
  - name: maxEmails
    type: number
    default: 20
outputFormat: markdown
```

### 5.5 Runtime-Aenderungen in route.ts

```
Bei skillId im Request:
1. Guard-Check (wie bisher)
2. NEU: Skill-Prompt in System-Prompt injizieren
3. NEU: Tool-Scope auf Skill-Tools einschraenken
4. NEU: Bei mode === 'workflow' → Step-Engine statt normaler LLM-Call
5. Normaler LLM-Call (mit angereichertem Prompt)
```

### 5.6 Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `AgentSkillDefinition` (skill-catalog.ts) | Interface erweitern |
| `skill-guard.ts` | + Capability-Resolution |
| `skill-catalog.ts` | + Importierte Skills, + YAML-Loader |
| `route.ts` | + Skill-Prompt-Injection, + Step-Engine |
| **NEU**: `capability-map.ts` | Abstraktes → konkretes Tool-Mapping |
| **NEU**: `skill-runner.ts` | Step-Engine fuer Workflow-Mode |
| **NEU**: `skill-import.ts` | YAML-Parser + Validierung |

### 5.7 Aufwand

~2 Tage fuer das komplette universelle Skill-System.

---

## 6. Skill Creator im Lab

### 6.1 Zwei Modi

#### Modus 1: Prompt Creator ("Beschreibe deinen Skill")

Funktioniert fast identisch wie der bestehende Module Builder:
- User beschreibt den Skill
- LLM generiert ein `SkillDefinition`-JSON
- User sieht Preview, kann Steps bearbeiten, testet in Sandbox

**Aufwand:** ~2 Tage (Builder-Flow als Template vorhanden)

#### Modus 2: Teaching Mode ("In der UI vormachen")

User fuehrt Aktionen in der UI vor, ein Event-Recorder zeichnet auf, LLM generalisiert zu einem abstrakten Skill.

**Warum machbar:** LifeOS hat bereits:
- `dom-actions.ts` mit findElement, clickElement, fillByAgentInput etc.
- `visual-tool-recipes.ts` mit 1.300 Zeilen UI-Interaktions-Logik
- `data-agent-*` Attribute ueberall in der UI (instrumentiert fuer Agent-Interaktion)

**Drei Phasen:**
1. **Aufzeichnung**: Event-Recorder lauscht auf User-Klicks/Inputs, nutzt `data-agent-*` Attribute zur Erkennung
2. **Generalisierung**: LLM macht aus konkreten Aktionen abstrakte Skill-Steps mit Variablen
3. **Review & Edit**: User passt generierten Skill an, testet in Sandbox

**Aufwand:** ~5 Tage (Event-Recorder + Generalisierung + Recording-UI)

### 6.2 Empfohlene Phasen

- **Phase 1** (4-5 Tage): Prompt-Modus + universelles Skill-Format + Skill-Runtime
- **Phase 2** (4-5 Tage): Teaching Mode draufsetzen

---

## 7. Externe Skills importieren (Clawhub, GitHub etc.)

### 7.1 Direkt importierbar?

**Nein** – externe Skills sind nicht direkt kompatibel, weil:
- Andere Tool-IDs
- Andere Formate (Prompt-Templates, LangChain, CrewAI, MCP-Bundles)
- LifeOS-spezifische Architektur (ModuleTool, ActionHandler, Visual Executor)

### 7.2 Manuelles Anpassen moeglich

Externer Skill → Analyse (Was macht er, welche Tools?) → Mapping auf LifeOS-Tools → `SkillDefinition` schreiben → In `AGENT_SKILL_CATALOG` einfuegen.

### 7.3 Automatischer Import nach Umbau

Mit dem neuen `requiredCapabilities`-System und YAML-Import-Format koennen Skills, die abstrakte Capabilities nutzen, **automatisch importiert** werden. Voraussetzung: `capability-map.ts` muss die externen Capability-IDs auf LifeOS-Tools mappen koennen.

---

## 8. Automatische Tool-Generierung im Module Builder

### 8.1 Aktueller Stand

Der Module Builder generiert **bereits** automatisch Tools:
- `CREATE_MODULE_TOOL` hat ein `tools[]`-Array im Output
- `generateToolsFile()` in `contract.ts` erzeugt Standard-CRUD-Tools (get_all, create, update, delete)
- `ToolsEditor.tsx` zeigt die generierten Tools im Builder

### 8.2 Muss jeder Button ein Tool bekommen?

**Nein.** Drei Schichten von Agent-Steuerung:

| Schicht | Beispiel | Braucht Tool? |
|---|---|---|
| **Daten-Operationen** | Todo erstellen, Event loeschen | **Ja** |
| **Navigation / UI-State** | Modul oeffnen, Tab wechseln | **Nein** – `app.openModule` + Visual Executor |
| **UI-Interaktion** | Button klicken, Scrollen | **Nein** – Computer Use via dom-actions.ts |

### 8.3 Wie der Visual Mode ohne UI-Tools funktioniert

Zwei getrennte Systeme:

```
Tool-Call → execute() → Daten aendern → createAction() → AgentAction
                                                              ↓
                                               Visual Executor (Client)
                                                              ↓
                                               dom-actions.ts klickt UI
```

- **Tools** = WAS soll passieren (Daten-Entscheidung, serverseitig)
- **Visual Executor** = WIE sieht es aus (UI-Animation, clientseitig)
- **`data-agent-*` Attribute** = WO in der UI (Element-Targeting)

### 8.4 Was generierte Module fuer Visual Mode brauchen

1. **`data-agent-*` Attribute** an wichtigen UI-Elementen (LLM muss sie beim Generieren einfuegen)
2. **`createAction()`** zu jedem Tool (Template-Erweiterung)
3. **Generisches Fallback-Recipe** im Visual Executor fuer unbekannte Module

### 8.5 Verbesserungsmoeglichkeiten

**Pragmatisch (wenig Aufwand):**
System-Prompt fuer `create_module` verbessern → LLM leitet domaen-spezifische Tools aus Store-Actions ab (nicht nur generisches CRUD).

**Fortgeschritten (mittlerer Aufwand):**
`ToolAutoGenerator` baut per Regex/AST aus dem generierten Store-Code automatisch Tools – unabhaengig vom LLM.

---

## 9. Document Generation: PDFs, Excel, Markdown & mehr

### 9.1 Ausgangslage

Der Agent kann **Markdown im Chat** anzeigen (via `ChatMarkdown.tsx` mit `react-markdown` + `remarkGfm`),
hat aber **kein Tool** um Dateien zu erzeugen und im System abzulegen.

Vorhandene Speicher-Infrastruktur:
- `DashboardDocument` (Prisma) – Dateien auf dem Home-/Base-Dashboard mit `contentText`, `contentBase64`, `mimeType`
- `GroupDocument` (Prisma) – Dateien in Gruppen-Bibliotheken
- `dashboard-folder-service.ts` – Vollstaendige CRUD-Operationen fuer Ordner und Dokumente
- `group-library-service.ts` – Vollstaendige CRUD-Operationen fuer Gruppen-Dateien

Was **fehlt**: Agent-Tools die Dateien erzeugen und in diese bestehenden Speicherorte ablegen.

### 9.2 Entscheidung: MCP-Server vs. Native Tools vs. Skills

| Anforderung | Loesung | Begruendung |
|---|---|---|
| PDF/Excel/CSV **erstellen** | **Native Tools** | Lokale Libraries, kein externer Service noetig |
| PDF **lesen/extrahieren** | **Native Tools** | Einfache Library (`pdf-parse`), kein MCP-Overhead |
| Komplexe Dokument-Workflows | **Skills** (nutzen die Tools) | "Analysiere alle PDF-Anhaenge und erstelle Report" |

**Kein MCP-Server noetig.** PDF-Parsing und -Erstellung sind Library-Aufrufe, keine externen Services. MCP-Server sind fuer externe APIs (GitHub, Linear, Exa) – nicht fuer lokale Bibliotheken.

### 9.3 Das `documents`-Tool-Modul

Sieben Tools in einem kohaerenten Modul:

| Tool-ID | Kategorie | Was es tut | Library |
|---|---|---|---|
| `documents.create` | write | Textdatei erstellen (MD, TXT, CSV, JSON) | Keine (reiner String) |
| `documents.createPdf` | write | PDF aus Markdown generieren | `pdfkit` oder `md-to-pdf` |
| `documents.createSpreadsheet` | write | Excel/XLSX erstellen | `exceljs` |
| `documents.extractPdf` | read | Text aus PDF extrahieren | `pdf-parse` |
| `documents.list` | read | Dokumente auflisten | Prisma (vorhanden) |
| `documents.read` | read | Dokument-Inhalt lesen | Prisma (vorhanden) |
| `documents.delete` | delete | Dokument loeschen | Prisma (vorhanden) |

### 9.4 Vier Formate im Detail

#### Markdown-Tabellen / Dokumente

Agent generiert Markdown-String → `documents.create` speichert als `DashboardDocument`:

```typescript
documents.create({
  name: "Wochenbericht.md",
  content: "# Wochenbericht KW15\n| Aufgabe | Status |\n|---|---|\n| ...",
  mimeType: "text/markdown",
  target: "dashboard"   // oder "group:group-123"
})
```

Kein Extra-Package noetig. Markdown ist Text.

#### CSV

Ebenfalls nur Text. Agent generiert CSV-String:

```typescript
documents.create({
  name: "ausgaben.csv",
  content: "Name,Betrag,Datum\nMiete,1200,01.04\nStrom,85,03.04",
  mimeType: "text/csv"
})
```

#### Excel (XLSX)

Benoetigt `exceljs` (~2MB). Tool nimmt strukturierte Daten (Headers + Rows):

```typescript
documents.createSpreadsheet({
  name: "Ausgaben-April.xlsx",
  headers: ["Kategorie", "Betrag", "Datum"],
  rows: [["Miete", 1200, "01.04"], ["Strom", 85, "03.04"]],
  sheetName: "April"
})
```

Intern: ExcelJS erzeugt Buffer → Base64 → als `DashboardDocument` mit `contentBase64` gespeichert.

#### PDF

Zwei Optionen:

| Library | Vorteil | Nachteil |
|---|---|---|
| `pdfkit` (~3MB) | Leichtgewichtig, kein Chromium | Markdown muss manuell in PDF-Befehle uebersetzt werden |
| `md-to-pdf` (~5MB) | Agent generiert nur Markdown, Tool macht schoene PDF | Hat Puppeteer/Chromium als Dependency |

**Empfehlung:** `pdfkit` fuer V1 (einfach, keine schweren Dependencies). Spaeter `md-to-pdf` wenn schoenere PDFs gewuenscht.

```typescript
documents.createPdf({
  name: "Briefing.pdf",
  title: "Tages-Briefing 08.04.2026",
  markdown: "## Zusammenfassung\n\nHeute stehen 3 Meetings an..."
})
```

#### PDF-Extraktion

Benoetigt `pdf-parse` (~300KB):

```typescript
documents.extractPdf({
  base64: "JVBERi0xLjQK...",   // oder documentId
})
// → { text: "...", pages: 5, info: { Title: "..." } }
```

### 9.5 Wo Dokumente landen

| Kontext | Speicherort | Prisma-Model |
|---|---|---|
| Allgemeine Anfrage ("Erstelle einen Report") | Home-Dashboard | `DashboardDocument` |
| Agent arbeitet in einer Base | Base-Dashboard | `DashboardDocument` (surfaceType: 'base') |
| Agent arbeitet in einer Gruppe | Gruppen-Bibliothek | `GroupDocument` |
| Agent arbeitet in einem Ordner | Ziel-Ordner | `DashboardDocument` (folderId) |

Tool bekommt optionalen `target`-Parameter:
- `"dashboard"` → Home-Dashboard
- `"base:base-123"` → Spezifische Base
- `"group:group-456"` → Gruppen-Bibliothek
- `"folder:folder-789"` → Spezifischer Ordner

### 9.6 Benoetigte npm-Packages

| Package | Zweck | Groesse |
|---|---|---|
| `exceljs` | XLSX-Erstellung | ~2MB |
| `pdfkit` | PDF-Erstellung | ~3MB |
| `pdf-parse` | PDF-Extraktion | ~300KB |

### 9.7 Integration in das Agent-System

1. Tools werden in einer neuen Datei `src/lib/agent/tools/documents-module-tools.ts` definiert
2. Registrierung in `init-server.ts`: `toolRegistry.register(documentsModuleTools)`
3. Scope in `tool-scope.ts`: `master` und `agents` bekommen `documents`-Scope
4. Capability-Map Erweiterung: `'documents.create': ['documents.create', 'documents.createPdf', 'documents.createSpreadsheet']`

### 9.8 Beispiel: Agent-Flow mit Document Generation

```
User: "Erstelle mir eine Uebersicht meiner Ausgaben als Excel und als PDF"

Agent:
  1. memory.recall("ausgaben")
     → Holt gespeicherte Ausgaben-Daten

  2. documents.createSpreadsheet({
       name: "Ausgaben-April.xlsx",
       headers: ["Kategorie", "Betrag", "Datum"],
       rows: [["Miete", 1200, "01.04"], ...]
     })
     → Excel auf Dashboard abgelegt

  3. documents.createPdf({
       name: "Ausgaben-April.pdf",
       markdown: "# Ausgaben April 2026\n| Kategorie | Betrag | ... |"
     })
     → PDF auf Dashboard abgelegt

  4. Agent antwortet: "Ich habe beide Dateien auf deinem Dashboard abgelegt."
```

### 9.9 Skills die auf Document-Tools aufbauen

Nach Implementierung des universellen Skill-Systems (Kapitel 5) koennen
Document-Skills definiert werden:

```yaml
id: inbox.pdf.analyzer
name: Mail-PDF Analyzer
mode: workflow
systemPrompt: |
  Analysiere PDF-Anhaenge aus ungelesenen Mails und erstelle
  eine strukturierte Uebersicht als Markdown-Dokument.
steps:
  - id: fetch
    prompt: "Hole ungelesene Mails mit Anhaengen"
    requiredTools: ['inbox.searchEmails']
  - id: extract
    prompt: "Extrahiere den Text aus allen PDF-Anhaengen"
    requiredTools: ['documents.extractPdf']
  - id: summarize
    prompt: "Fasse die Inhalte zusammen"
  - id: save
    prompt: "Speichere die Zusammenfassung als PDF auf dem Dashboard"
    requiredTools: ['documents.createPdf']
requiredCapabilities:
  - email.read
  - documents.extract
  - documents.create
```

### 9.10 Aufwand

| Komponente | Aufwand |
|---|---|
| `documents-module-tools.ts` (7 Tools) | ~4h |
| npm-Dependencies einbinden | ~30min |
| Registrierung in `init-server.ts` + `tool-scope.ts` | ~20min |
| Download-/Preview-UI auf dem Dashboard | ~2-3h (optional, fuer User-Interaktion) |
| **Gesamt** | **~1 Tag** |

---

## 10. Gesamtbild: Architektur-Roadmap

```
Phase 1: Document Generation Pipeline
├── documents-module-tools.ts (7 Tools)
├── npm-Dependencies (exceljs, pdfkit, pdf-parse)
├── Registrierung in init-server.ts + tool-scope.ts
├── Optional: Download/Preview UI
└── ~1 Tag

Phase 2: Playwright MCP + Generischer MCP-Client
├── MCP-Client-Layer (generisch, fuer alle MCP-Server nutzbar)
├── Playwright MCP anbinden (erster MCP-Server)
├── browser-service/ ablösen
├── Browser-Tools auf Accessibility-Refs umstellen
└── ~1-2 Tage

Phase 3: Exa MCP (Web-Recherche)
├── Exa ueber bestehenden MCP-Client anbinden
├── Research-Skill Upgrade
├── Kein neuer Client noetig (generischer Client aus Phase 2)
└── ~0.5 Tage

Phase 4: Universelles Skill-System
├── Erweitertes SkillDefinition-Interface
├── Capability-Map
├── Skill-Prompt-Injection in route.ts
├── YAML-Import
└── ~2 Tage

Phase 5: Skill Creator (Lab)
├── Prompt-Modus (wie Module Builder)
├── Skill-Preview & Editor
├── Sandbox-Tester
└── ~3 Tage

Phase 6: Teaching Mode
├── Event-Recorder
├── Generalisierungs-LLM
├── Recording-UI
└── ~5 Tage

Phase 7: Weitere MCP-Server
├── GitHub / Linear / Notion / Slack
├── Externe Skills importieren
├── Marketplace fuer Community-Skills
└── ~0.5 Tage pro Server (dank generischem Client aus Phase 2)
```

### Priorisiertes MCP-Ranking (aktualisiert)

| Rang | MCP-Server | Begruendung |
|---|---|---|
| **1** | **Playwright MCP** | Ersetzt eigenen Code (~620 Zeilen) + massives Quality-Upgrade. Kein API-Key. |
| **2** | **Exa MCP** | Neue Capability (schnelle Recherche). Komplementaer zu Playwright. |
| **3** | **GitHub MCP** | Lab/Builder wird deutlich maechtiger (Repo, Issues, PRs). |
| **4** | **Linear MCP** | Task-Management, aber LifeOS hat schon Scheduled Tasks. |
| **5** | **Filesystem MCP** | Nuetzlich fuer Lab, WebContainer deckt vieles ab. |

---

## 11. Offene Entscheidungen

| Frage | Optionen | Empfehlung |
|---|---|---|
| Erster MCP-Server? | Playwright vs. Exa vs. GitHub | **Playwright** (ersetzt bestehenden Code, sofortiger Netto-Gewinn) |
| Zweiter MCP-Server? | Exa vs. GitHub vs. Linear | **Exa** (komplett neue Capability, nutzt bereits gebauten MCP-Client) |
| browser-service/ nach Migration? | Behalten vs. Loeschen | **Loeschen** (kein Grund fuer Doppelt-Betrieb) |
| Skill-Persistenz? | Prisma-Schema vs. JSON-Files | Haengt vom Marketplace-Plan ab |
| Capability-Standard? | Eigener vs. Community-Standard | Eigener, spaeter Community-kompatibel |
| Tool-Generierung? | LLM-only vs. AST-basiert | LLM-Prompt verbessern, AST spaeter |
| Visual Mode fuer generierte Module? | Generisches Fallback vs. LLM-generierte Recipes | Generisches Fallback zuerst |
| PDF-Library? | `pdfkit` vs. `md-to-pdf` | **`pdfkit`** fuer V1, spaeter `md-to-pdf` fuer schoenere PDFs |
| Dokument-Ziel-Logik? | Automatisch aus Kontext vs. expliziter Parameter | Beides – Standard aus Kontext, ueberschreibbar per `target` |
