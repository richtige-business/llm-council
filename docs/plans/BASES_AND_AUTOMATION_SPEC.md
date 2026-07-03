# ============================================
# BASES & AUTOMATION SYSTEM
# Hierarchische Modulstruktur mit n8n-Style Automationen
# ============================================
#
# Zweck: Planungsdokument für das Base-System, den Automation Editor
#        und die intelligente Agent-Integration
# Status: Konzeptphase
# Erstellt: 2026-02-07
# Architektur-Ansatz: Option C (Hybrid – Event Bus + Flow Runner)
# ============================================

---

## Inhaltsverzeichnis

1. [Vision & Ziel](#vision--ziel)
2. [Ist-Zustand](#ist-zustand)
3. [Konzept-Übersicht](#konzept-übersicht)
4. [Datenmodell](#datenmodell)
5. [Phase 1: Base-System & Hierarchie](#phase-1)
6. [Phase 2: "Mein System" Tab](#phase-2)
7. [Phase 3: Automation Editor (n8n-Style)](#phase-3)
8. [Phase 4: Automation Runtime (Hybrid-Engine)](#phase-4)
9. [Phase 5: Agent-Integration (Smart Wiring)](#phase-5)
10. [Phase 6: Sharing & Zugriffsrechte](#phase-6)
11. [Phase 7: Base Dashboards](#phase-7)
12. [Abhängigkeiten & Reihenfolge](#abhängigkeiten)
13. [Tech-Stack Erweiterungen](#tech-stack)
14. [Offene Fragen](#offene-fragen)

---

## Vision & Ziel

LifeOS soll von einer flachen Modul-Sammlung zu einer **hierarchischen App-Plattform**
werden, in der Module intelligent miteinander kommunizieren.

**Drei Kernkonzepte:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. BASES – Gruppierung von Modulen zu Domänen              │
│     (z.B. "ERP", "Personal", "Marketing")                  │
│                                                             │
│  2. AUTOMATIONEN – Verknüpfungen zwischen Modulen           │
│     (Trigger → Bedingung → Aktion, n8n-Style)              │
│                                                             │
│  3. SMART AGENT – KI schlägt Verknüpfungen vor              │
│     und erstellt sie per Prompt im Module Builder           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Kernprinzip:** Der User denkt in Geschäftsprozessen, nicht in Code.
"Wenn ein Großauftrag reinkommt, prüfe den Lagerbestand und plane die Produktion"
→ Das System übersetzt das in Modul-Verknüpfungen.

---

## Ist-Zustand

### Was bereits existiert und genutzt wird

| Komponente | Datei(en) | Status |
|-----------|-----------|--------|
| Event Bus | `src/lib/events/event-bus.ts` | ✅ Funktioniert (emit, subscribe, wildcards) |
| Module Runtime API | `src/lib/lab/module-runtime.ts` | ✅ callModule(), registerAction() |
| Standard Events | `src/lib/events/event-bus.ts` | ✅ calendar.*, inbox.*, data.* |
| Module Registry | `src/lib/modules/registry.ts` | ✅ Zustand Store mit registerModule() |
| Module Contracts | `src/lib/modules/contracts.ts` | ✅ Validierung, Schemas, Versionierung |
| Marketplace Store | `src/lib/marketplace/store.ts` | ✅ Tabs, Filter, Install/Uninstall |
| Dashboard Widgets | `src/components/dashboard/` | ✅ Aber nur ein globales Dashboard |
| Module Builder | `src/app/lab/builder/` | ✅ Vibe Coding mit WebContainer Preview |

### Was NICHT existiert

- Kein Base-Konzept (keine Gruppierung von Modulen)
- Kein Automation Editor (kein visueller Flow-Builder)
- Kein Flow-Runner (keine automatisierte Event-Ketten)
- Kein "Mein System" Tab (keine Systemübersicht)
- Keine Base-spezifischen Dashboards
- Kein Sharing mit Zugriffsrechten (alles lokal)
- Agent kennt die installierten Module nicht beim Bauen

---

## Konzept-Übersicht

### Hierarchie

```
LifeOS
│
├── Base: "ERP"                              ← Eigenes Dashboard
│   ├── Modul: "Stock Management"            ← Zugeordnet zur Base
│   │   ├── Untermodul: "Lagerbestand"       ← Teil des Moduls
│   │   ├── Untermodul: "Bestellungen"
│   │   └── Untermodul: "Lieferanten"
│   ├── Modul: "Produktion"
│   │   ├── Untermodul: "Planung"
│   │   └── Untermodul: "Forecast"
│   ├── Modul: "CRM"
│   └── [Automationen]                       ← Verknüpfungen innerhalb der Base
│       ├── "Großauftrag → Bestand prüfen"
│       └── "Bestand niedrig → Nachbestellen"
│
├── Base: "Personal"
│   ├── Modul: "Kalender"
│   ├── Modul: "Habit Tracker"
│   └── [Automationen]
│       └── "Termin erstellt → Habit erinnern"
│
└── Einzelmodule (keiner Base zugeordnet)
    ├── Expense Tracker
    └── UFC Fan App
```

### Automation-Flow (n8n-Style)

```
┌─────────┐     ┌───────────┐     ┌──────────┐     ┌────────────┐
│ TRIGGER  │────▶│ BEDINGUNG │────▶│  AKTION  │────▶│  AKTION    │
│──────────│     │───────────│     │──────────│     │────────────│
│CRM:      │     │Menge > 50 │     │Stock:    │     │Produktion: │
│Neuer     │     │Stück?     │     │Bestand   │     │Forecast    │
│Auftrag   │     │           │     │prüfen    │     │berechnen   │
└─────────┘     └───────────┘     └──────────┘     └────────────┘
                     │ Nein
                     ▼
              ┌───────────┐
              │  AKTION   │
              │───────────│
              │Notification│
              │"Kleinauf- │
              │ trag"     │
              └───────────┘
```

### Agent-Verhalten im Module Builder

```
User: "Erstelle ein Produktionsplanungs-Modul mit Forecast"

Agent: "Ich erstelle das Modul. Für den Forecast brauche ich
        Bestandsdaten und Auftragsdaten.

        Du hast folgende Module in der Base 'ERP':
        • Stock Management (hat: getBestand(), getArtikel())
        • CRM (hat: getAufträge(), getPipeline())

        ┌─────────────────────────────────────────┐
        │ Wie soll ich die Daten einbinden?        │
        │                                          │
        │ ○ Verknüpfung herstellen                 │
        │   → Event-Subscription zu Stock + CRM    │
        │                                          │
        │ ○ Platzhalter lassen                     │
        │   → Du verknüpfst später im Automation   │
        │     Editor                               │
        │                                          │
        │ ○ Mock-Daten einbauen                    │
        │   → Zum Testen mit Beispieldaten         │
        └─────────────────────────────────────────┘"
```

---

## Datenmodell

### Base

```typescript
// ============================================
// Base – Gruppierung von Modulen zu einer Domäne
// Jede Base hat ein eigenes Dashboard und eigene Automationen
// ============================================

interface Base {
  id: string;                        // z.B. "erp", "personal"
  name: string;                      // z.B. "ERP", "Personal"
  description: string;               // Kurzbeschreibung
  icon: string;                      // Lucide Icon Name
  color: string;                     // Akzentfarbe (Hex)

  // Zugeordnete Module
  moduleIds: string[];               // IDs der Module in dieser Base
  
  // Dashboard-Konfiguration
  dashboard: BaseDashboardConfig;

  // Automationen innerhalb dieser Base
  automationIds: string[];           // IDs der Automationen
  
  // Sharing & Zugriff
  owner: string;                     // User-ID des Erstellers
  sharedWith: SharedAccess[];        // Zugriffsrechte
  isPublished: boolean;              // In Bibliothek veröffentlicht?
  
  // Meta
  createdAt: string;                 // ISO Datum
  updatedAt: string;
}

interface BaseDashboardConfig {
  widgets: DashboardWidget[];        // Widget-Layout
  layout: 'grid' | 'freeform';      // Layout-Typ
  columns: number;                   // Grid-Spalten (default: 3)
}

interface DashboardWidget {
  id: string;                        // Widget-ID
  moduleId: string;                  // Welches Modul liefert das Widget
  widgetId: string;                  // Widget-ID innerhalb des Moduls
  position: { x: number; y: number; w: number; h: number };
}

interface SharedAccess {
  userId: string;
  role: 'viewer' | 'editor' | 'admin';
  grantedAt: string;
}
```

### Erweiterte Module

```typescript
// ============================================
// ModuleContract – Erweitert um Hierarchie-Felder
// Neue Felder: baseId, parentModuleId, subModuleIds,
//              exposedActions, exposedEvents
// ============================================

interface ModuleContractV2 extends ModuleContract {
  // Hierarchie
  baseId?: string;                   // Welcher Base zugeordnet?
  parentModuleId?: string;           // Übergeordnetes Modul (für Untermodule)
  subModuleIds?: string[];           // Untermodule dieses Moduls
  
  // Schnittstelle nach außen (für Automationen)
  exposedActions: ExposedAction[];   // Aktionen die andere Module aufrufen können
  exposedEvents: ExposedEvent[];     // Events die andere Module abonnieren können
}

interface ExposedAction {
  id: string;                        // z.B. "getBestand"
  name: string;                      // z.B. "Bestand abrufen"
  description: string;               // Was macht diese Aktion?
  inputSchema: SchemaDefinition;     // Erwartete Parameter
  outputSchema: SchemaDefinition;    // Rückgabewerte
}

interface ExposedEvent {
  id: string;                        // z.B. "bestand.niedrig"
  name: string;                      // z.B. "Bestand unter Minimum"
  description: string;               // Wann wird dieses Event gefeuert?
  payloadSchema: SchemaDefinition;   // Daten im Event-Payload
}
```

### Automation

```typescript
// ============================================
// Automation – Eine Verknüpfung zwischen Modulen
// Besteht aus Nodes und Edges (Graph-Struktur)
// ============================================

interface Automation {
  id: string;
  name: string;                      // z.B. "Großauftrag → Produktion"
  description: string;
  baseId: string;                    // Gehört zu welcher Base?
  
  // Graph-Struktur
  nodes: AutomationNode[];
  edges: AutomationEdge[];
  
  // Status
  isActive: boolean;                 // Läuft die Automation?
  lastTriggered?: string;            // Wann zuletzt ausgelöst?
  triggerCount: number;              // Wie oft ausgelöst?
  
  // Meta
  createdAt: string;
  updatedAt: string;
  createdBy: 'user' | 'agent';      // Manuell oder vom Agent erstellt?
}

// --------------------------------------------
// Node-Typen
// Jeder Node ist ein Schritt in der Automation
// --------------------------------------------

type AutomationNode =
  | TriggerNode       // Startet die Automation (Event, Zeitplan, Webhook)
  | ConditionNode     // Verzweigung (if/else)
  | ActionNode        // Führt eine Modul-Aktion aus
  | TransformNode     // Daten transformieren (Mapping, Filter)
  | NotificationNode  // Benachrichtigung senden
  | DelayNode;        // Warten (z.B. "5 Minuten nach Trigger")

interface NodeBase {
  id: string;
  type: string;
  position: { x: number; y: number };  // Position im Editor
  label: string;
}

interface TriggerNode extends NodeBase {
  type: 'trigger';
  config: {
    sourceModuleId: string;          // Welches Modul triggert?
    eventId: string;                 // Welches Event?
    // ODER
    schedule?: string;               // Cron-Expression (z.B. "0 9 * * *")
  };
}

interface ConditionNode extends NodeBase {
  type: 'condition';
  config: {
    field: string;                   // z.B. "payload.menge"
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
    value: unknown;                  // Vergleichswert
  };
}

interface ActionNode extends NodeBase {
  type: 'action';
  config: {
    targetModuleId: string;          // Welches Modul?
    actionId: string;                // Welche Aktion?
    inputMapping: Record<string, string>;  // Daten-Mapping (z.B. "artikelId" → "payload.artikelId")
  };
}

interface TransformNode extends NodeBase {
  type: 'transform';
  config: {
    mappings: Array<{
      source: string;                // Input-Pfad
      target: string;                // Output-Pfad
      transform?: string;            // Optionale Transformation (z.B. "toUpperCase")
    }>;
  };
}

interface NotificationNode extends NodeBase {
  type: 'notification';
  config: {
    title: string;
    message: string;                 // Kann Template-Variablen enthalten: {{payload.name}}
    level: 'info' | 'warning' | 'error';
  };
}

interface DelayNode extends NodeBase {
  type: 'delay';
  config: {
    duration: number;                // Millisekunden
    unit: 'seconds' | 'minutes' | 'hours';
  };
}

// --------------------------------------------
// Edge – Verbindung zwischen zwei Nodes
// --------------------------------------------

interface AutomationEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;             // z.B. "true" / "false" bei Conditions
  label?: string;                    // z.B. "Ja", "Nein"
}
```

### Automation-Run (Laufzeit-Protokoll)

```typescript
// ============================================
// AutomationRun – Protokolliert eine Ausführung
// Für Debugging und Monitoring
// ============================================

interface AutomationRun {
  id: string;
  automationId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  
  // Schritt-für-Schritt Protokoll
  nodeResults: Array<{
    nodeId: string;
    status: 'success' | 'failed' | 'skipped';
    input: unknown;
    output: unknown;
    error?: string;
    durationMs: number;
  }>;
  
  // Trigger-Daten
  triggerPayload: unknown;
}
```

---

## Phase 1: Base-System & Hierarchie

### Ziel
Bases als Gruppierungskonzept einführen. Module können Bases zugeordnet werden.
Untermodule können Modulen zugeordnet werden.

### Aufgaben

**1.1 Base Store erstellen**
```
Neue Datei: src/lib/bases/store.ts
```
- Zustand Store mit CRUD für Bases
- Persistierung in localStorage (später DB)
- Actions: `createBase()`, `deleteBase()`, `addModuleToBase()`, `removeModuleFromBase()`

**1.2 ModuleContract erweitern**
```
Ändern: src/lib/modules/contracts.ts
Ändern: src/lib/modules/types.ts
```
- `baseId`, `parentModuleId`, `subModuleIds` hinzufügen
- `exposedActions[]`, `exposedEvents[]` hinzufügen
- Rückwärtskompatibel (alle neuen Felder optional)

**1.3 Module Registry erweitern**
```
Ändern: src/lib/modules/registry.ts
```
- `getModulesByBase(baseId)` – Alle Module einer Base
- `getSubModules(moduleId)` – Untermodule eines Moduls
- `assignToBase(moduleId, baseId)` – Modul einer Base zuordnen

**1.4 Sidebar anpassen**
```
Ändern: src/components/shell/Sidebar.tsx
```
- Module nach Bases gruppiert anzeigen
- Ausklappbare Base-Gruppen
- "Einzelmodule" Sektion für nicht zugeordnete Module

### Geschätzter Aufwand: 2-3 Sessions

---

## Phase 2: "Mein System" Tab

### Ziel
Neuer Tab in der Bibliothek, der die Systemstruktur visualisiert.
Bases, Module, Untermodule und deren Verknüpfungen auf einen Blick.

### Aufgaben

**2.1 Tab in Bibliothek hinzufügen**
```
Ändern: src/app/library/page.tsx
```
- Neuer Tab "Mein System" neben den bestehenden Tabs
- Standardmäßig sichtbar (kein Feature-Flag)

**2.2 System-Graph Komponente**
```
Neue Datei: src/components/system/SystemGraph.tsx
```
- Baumansicht der Bases → Module → Untermodule
- Visuell: Karten mit Icons, verbunden durch Linien
- Klick auf Modul → Details-Panel (Beschreibung, Aktionen, Events)
- Klick auf Base → Base-Dashboard öffnen

**2.3 Base-Management UI**
```
Neue Datei: src/components/system/BaseManager.tsx
```
- Base erstellen / umbenennen / löschen
- Module per Drag & Drop einer Base zuordnen
- Module als Untermodule einem anderen Modul zuordnen

**2.4 Edit-Button bei jedem Modul**
```
Ändern: src/app/library/page.tsx
Ändern: src/components/marketplace/ModuleCard.tsx
```
- Bei JEDEM installierten Modul ein "Bearbeiten" Button
- Klick → Module Builder öffnet sich mit den Modul-Dateien geladen
- Nutzt bestehende Files-Store und Builder-Infrastruktur

### UI-Mockup: "Mein System" Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Bibliothek  │  Marketplace  │  Mein System  ◄             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Base: ERP ─────────────────────────────────────────┐   │
│  │  📦 Stock Management  →  📦 Produktion  →  📦 CRM  │   │
│  │       └ Lagerbestand       └ Planung        └ Kontakte │
│  │       └ Bestellungen       └ Forecast       └ Pipeline │
│  │                                                       │  │
│  │  ⚡ 2 Automationen aktiv              [Editor ▶]     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Base: Personal ────────────────────────────────────┐   │
│  │  📅 Kalender  →  ✅ Habits  →  📓 Journal          │  │
│  │                                                       │  │
│  │  ⚡ 1 Automation aktiv                [Editor ▶]     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Einzelmodule ──────────────────────────────────────┐   │
│  │  💰 Expense Tracker    🥊 UFC Fan App               │  │
│  │  [→ Base zuordnen]     [→ Base zuordnen]            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [+ Neue Base erstellen]                                    │
└─────────────────────────────────────────────────────────────┘
```

### Geschätzter Aufwand: 3-4 Sessions

---

## Phase 3: Automation Editor (n8n-Style)

### Ziel
Visueller Flow-Editor zum Erstellen von Automationen zwischen Modulen.
Nodes für Trigger, Bedingungen, Aktionen. Drag & Drop, Verbindungslinien.

### Aufgaben

**3.1 React Flow Integration**
```
Neue Dependency: @xyflow/react (ehemals reactflow)
```
- React Flow ist die Standard-Library für Node-basierte Editoren
- Wird von n8n, Langflow, Flowise etc. genutzt
- Bietet: Nodes, Edges, Handles, Minimap, Controls

**3.2 Node-Komponenten erstellen**
```
Neue Dateien: src/components/automation/nodes/
  ├── TriggerNode.tsx        # Event-Trigger oder Zeitplan
  ├── ConditionNode.tsx      # If/Else Verzweigung
  ├── ActionNode.tsx         # Modul-Aktion ausführen
  ├── TransformNode.tsx      # Daten-Mapping
  ├── NotificationNode.tsx   # Benachrichtigung senden
  ├── DelayNode.tsx          # Wartezeit
  └── index.ts
```

**3.3 Automation Editor Page**
```
Neue Datei: src/app/automation/[baseId]/page.tsx
Neue Datei: src/components/automation/AutomationEditor.tsx
```
- React Flow Canvas mit Node-Palette (Sidebar)
- Drag & Drop von Node-Typen auf den Canvas
- Nodes verbinden durch Ziehen von Handle zu Handle
- Properties-Panel: Konfiguration des ausgewählten Nodes

**3.4 Node-Konfiguration**
```
Neue Datei: src/components/automation/NodeConfigPanel.tsx
```
- Trigger-Node: Modul + Event auswählen (Dropdown aus exposedEvents)
- Action-Node: Modul + Aktion auswählen (Dropdown aus exposedActions)
- Condition-Node: Feld, Operator, Wert konfigurieren
- Daten-Mapping: Input-Felder des Ziel-Moduls mit Output-Feldern des Quell-Moduls verbinden

**3.5 Automation Store**
```
Neue Datei: src/lib/automation/store.ts
```
- CRUD für Automationen
- Persistierung (localStorage, später DB)
- Verknüpfung mit Base-Store

### UI-Mockup: Automation Editor

```
┌─────────────────────────────────────────────────────────────┐
│  ◀ Zurück zu "ERP"     Automation: "Großauftrag-Flow"      │
├──────────┬──────────────────────────────────────────────────┤
│ NODES    │                                                  │
│──────────│   ┌─────────┐     ┌───────────┐                 │
│ ⚡Trigger │   │ CRM     │────▶│ Menge     │                 │
│ ❓Bedingung│  │ Neuer   │     │ > 50?     │                 │
│ ▶ Aktion  │   │ Auftrag │     │           │                 │
│ 🔄Transform│  └─────────┘     └─────┬─────┘                 │
│ 🔔Notify  │                    Ja ↙     ↘ Nein              │
│ ⏱ Delay   │             ┌──────────┐  ┌───────────┐        │
│           │             │ Stock:   │  │ Notify:   │        │
│           │             │ Bestand  │  │ "Klein-   │        │
│           │             │ prüfen   │  │  auftrag" │        │
│           │             └────┬─────┘  └───────────┘        │
│           │                  │                              │
│           │             ┌────┴──────┐                       │
│           │             │Produktion:│                       │
│           │             │ Forecast  │                       │
│           │             │ berechnen │                       │
│           │             └───────────┘                       │
│           │                                                 │
├──────────┴──────────────────────────────────────────────────┤
│  Node: "Menge > 50?"  │ Typ: Bedingung                     │
│  Feld: payload.menge  │ Operator: >  │ Wert: 50            │
└─────────────────────────────────────────────────────────────┘
```

### Geschätzter Aufwand: 5-7 Sessions

---

## Phase 4: Automation Runtime (Hybrid-Engine)

### Ziel
Engine die Automationen zur Laufzeit ausführt.
Hybrid-Ansatz: Einfache Flows über Event Bus, komplexe über Flow Runner.

### Architektur-Entscheidung: Hybrid (Option C)

```
┌─────────────────────────────────────────────────────┐
│                 AUTOMATION RUNTIME                    │
│                                                       │
│  Einfach (≤3 Nodes, kein Delay):                     │
│  ┌──────────────────────────────────┐                │
│  │ Event Bus (bestehend)            │                │
│  │ Trigger → Action                 │                │
│  │ Trigger → Condition → Action     │                │
│  │ Direkte Subscription, kein State │                │
│  └──────────────────────────────────┘                │
│                                                       │
│  Komplex (>3 Nodes, Delays, Branches):               │
│  ┌──────────────────────────────────┐                │
│  │ Flow Runner (neu)                │                │
│  │ Graph traversal, Node für Node   │                │
│  │ State pro Run, Pause/Resume      │                │
│  │ Run-Protokoll für Debugging      │                │
│  └──────────────────────────────────┘                │
│                                                       │
│  Der Runtime entscheidet automatisch welcher          │
│  Executor genutzt wird.                              │
└─────────────────────────────────────────────────────┘
```

### Aufgaben

**4.1 Simple Executor (Event Bus)**
```
Neue Datei: src/lib/automation/executors/simple-executor.ts
```
- Für Automationen mit: Trigger → (optional Condition) → Action
- Registriert Event-Listener beim Aktivieren der Automation
- Prüft Bedingungen inline
- Ruft Modul-Aktionen direkt auf
- Kein persistenter State nötig

**4.2 Flow Runner (für komplexe Flows)**
```
Neue Datei: src/lib/automation/executors/flow-runner.ts
```
- Graph-Traversal: Startet bei Trigger-Node, folgt Edges
- Pro Node: Input evaluieren → Ausführen → Output an nächsten Node
- Unterstützt: Branches (Condition), Delays, Parallel-Execution
- State pro Run: `AutomationRun` mit Node-Ergebnissen
- Fehlerbehandlung: Retry, Skip, Abort

**4.3 Automation Manager**
```
Neue Datei: src/lib/automation/manager.ts
```
- Entscheidet ob Simple oder Flow Runner:
  - ≤3 Nodes UND kein Delay UND keine Branches → Simple Executor
  - Sonst → Flow Runner
- Aktiviert/Deaktiviert Automationen
- Stellt Trigger her (Event-Subscriptions)

**4.4 Run-Protokoll & Monitoring**
```
Neue Datei: src/lib/automation/run-store.ts
```
- Speichert `AutomationRun[]` pro Automation
- Zeigt im UI: letzte Runs, Erfolg/Fehler, Dauer
- Debug-Modus: Schritt für Schritt durch den Flow gehen

### Geschätzter Aufwand: 5-7 Sessions

---

## Phase 5: Agent-Integration (Smart Wiring)

### Ziel
Der Vibe-Coding-Agent im Module Builder kennt die installierten Module
und kann intelligent Verknüpfungen vorschlagen und erstellen.

### Aufgaben

**5.1 System-Kontext für den Agent**
```
Ändern: src/lib/lab/llm/prompts.ts
Ändern: src/app/api/lab/generate/route.ts
```
- Beim Generieren: Liste der installierten Module + deren exposedActions/Events mitgeben
- System-Prompt erweitern: "Du kennst folgende Module im System des Users..."
- Agent kann gezielt `callModule()` und `subscribe()` im generierten Code nutzen

**5.2 Verknüpfungs-Dialog**
```
Neue Datei: src/app/lab/builder/components/chat/ConnectionDialog.tsx
```
- Wenn der Agent externe Daten braucht, zeigt er einen Dialog:
  - Option 1: "Direkte Verknüpfung herstellen" → Agent generiert callModule/subscribe Code
  - Option 2: "Platzhalter lassen" → Agent generiert Interface mit TODO-Kommentar
  - Option 3: "Mock-Daten" → Agent generiert Testdaten
- Dialog ist interaktiv (User wählt, Agent reagiert)

**5.3 Automation-Generierung per Prompt**
```
Neue Datei: src/lib/automation/agent-generator.ts
```
- User im Automation Editor: "Erstelle eine Automation die..."
- Agent generiert den Flow als JSON (Nodes + Edges)
- Flow wird direkt im Editor dargestellt
- User kann nachbearbeiten vor dem Aktivieren

**5.4 Agent-Tool: Systemwissen**
```
Ändern: src/lib/agent/tools/
```
- Neues Agent-Tool: `getSystemStructure()` – Gibt Bases, Module, Automationen zurück
- Neues Agent-Tool: `getModuleActions(moduleId)` – Gibt exposedActions zurück
- Der globale Intelligence Agent kann damit auch über Automationen Auskunft geben

### Geschätzter Aufwand: 4-5 Sessions

---

## Phase 6: Sharing & Zugriffsrechte

### Ziel
Bases und Modul-Konglomerate können veröffentlicht und mit anderen geteilt werden.
Admin-Rechte für Zugriffskontrolle.

### Aufgaben

**6.1 User-Management (Basis)**
```
Ändern: prisma/schema.prisma
Neue Dateien: src/lib/auth/
```
- User-Tabelle in der Datenbank (falls noch nicht vorhanden)
- Simple Auth (Email + Token oder OAuth)
- User-ID wird an Bases und Module geknüpft

**6.2 Zugriffsrechte-System**
```
Neue Datei: src/lib/bases/permissions.ts
```
- Rollen: `viewer` (nur sehen), `editor` (bearbeiten), `admin` (alles + Rechte vergeben)
- Prüfung bei: Base-Zugriff, Modul-Bearbeitung, Automation-Änderung
- Admin kann Rechte pro Base vergeben

**6.3 Publishing von Bases**
```
Ändern: src/lib/marketplace/store.ts
Ändern: src/app/library/page.tsx
```
- "Base veröffentlichen" → Alle zugehörigen Module + Automationen als Paket
- In der Bibliothek: Bases als installierbare Pakete
- Versionierung: Base v1.0, v1.1 etc.

**6.4 Backend-Persistenz**
```
Ändern: prisma/schema.prisma
Neue Dateien: src/app/api/bases/
Neue Dateien: src/app/api/automation/
```
- Bases, Module, Automationen in PostgreSQL statt localStorage
- API-Routes für CRUD
- Migration bestehender localStorage-Daten

### Geschätzter Aufwand: 6-8 Sessions

---

## Phase 7: Base Dashboards

### Ziel
Jede Base hat ein eigenes, editierbares Dashboard mit Widgets
aus den zugehörigen Modulen.

### Aufgaben

**7.1 Base Dashboard Page**
```
Neue Datei: src/app/base/[baseId]/page.tsx
```
- Zeigt das Dashboard einer Base
- Widgets der zugehörigen Module
- Editierbar: Widgets hinzufügen/entfernen, Layout ändern

**7.2 Dashboard Editor**
```
Neue Datei: src/components/dashboard/DashboardEditor.tsx
```
- Drag & Drop Widgets auf ein Grid
- Widget-Palette: Alle Widgets der Base-Module
- Größe und Position anpassbar
- Speichern in BaseDashboardConfig

**7.3 Sidebar-Integration**
```
Ändern: src/components/shell/Sidebar.tsx
```
- Bases in der Sidebar als ausklappbare Gruppen
- Klick auf Base-Name → Base Dashboard
- Klick auf Modul → Modul öffnen
- Bases haben eigenes Icon + Farbe

**7.4 Cross-Base Widgets**
```
Ändern: src/components/dashboard/
```
- Globales Dashboard zeigt Zusammenfassung aller Bases
- "Automation Status" Widget: Zeigt aktive Automationen + letzte Runs
- "System Health" Widget: Übersicht aller Bases

### Geschätzter Aufwand: 4-5 Sessions

---

## Abhängigkeiten & Reihenfolge

```
Phase 1 ─────────────────────────────────────────────────────────────▶
Base-System & Hierarchie (Fundament für alles)
  │
  ├── Phase 2 ───────────────────────────────────────────────────────▶
  │   "Mein System" Tab (braucht Base-System)
  │     │
  │     └── Phase 7 ─────────────────────────────────────────────────▶
  │         Base Dashboards (braucht "Mein System" + Base-System)
  │
  ├── Phase 3 ───────────────────────────────────────────────────────▶
  │   Automation Editor (braucht Base-System für Kontext)
  │     │
  │     └── Phase 4 ─────────────────────────────────────────────────▶
  │         Automation Runtime (braucht Editor für Flow-Definition)
  │           │
  │           └── Phase 5 ───────────────────────────────────────────▶
  │               Agent-Integration (braucht Runtime für Verknüpfungen)
  │
  └── Phase 6 ───────────────────────────────────────────────────────▶
      Sharing & Zugriffsrechte (braucht alles, kommt zum Schluss)
```

### Empfohlene Reihenfolge

| Reihenfolge | Phase | Warum |
|-------------|-------|-------|
| 1. | Phase 1: Base-System | Fundament – alles andere baut darauf auf |
| 2. | Phase 2: "Mein System" | Gibt visuelles Feedback, motiviert |
| 3. | Phase 7: Base Dashboards | Schneller Mehrwert, relativ einfach |
| 4. | Phase 3: Automation Editor | Der Kern – visueller Flow-Builder |
| 5. | Phase 4: Automation Runtime | Macht den Editor "lebendig" |
| 6. | Phase 5: Agent-Integration | Game-Changer – AI erstellt Verknüpfungen |
| 7. | Phase 6: Sharing | Erst wenn alles stabil ist |

### Parallelisierbar

- Phase 2 + Phase 3 können parallel laufen (unterschiedliche UI-Bereiche)
- Phase 7 kann parallel zu Phase 3 oder 4 laufen

---

## Tech-Stack Erweiterungen

| Technologie | Zweck | Phase |
|-------------|-------|-------|
| `@xyflow/react` | Node-basierter Flow-Editor (React Flow) | Phase 3 |
| `zustand` (erweitert) | Base-Store, Automation-Store | Phase 1 |
| `prisma` (erweitert) | DB-Schema für Bases, Automationen | Phase 6 |
| `cron-parser` | Zeitplan-Trigger parsen | Phase 4 |
| `react-grid-layout` | Dashboard Widget-Layout | Phase 7 |

---

## Offene Fragen

### Architektur

1. **Wo leben Automationen?**
   - Option A: Nur in der Base (Automationen sind Base-spezifisch)
   - Option B: Auch Base-übergreifend (z.B. Personal-Kalender triggert ERP-Aktion)
   - **Empfehlung:** Option B – sonst verliert man Flexibilität

2. **Untermodule: Echte Module oder nur UI-Gruppierung?**
   - Option A: Untermodule sind vollwertige Module mit eigenem Entry-Point
   - Option B: Untermodule sind nur eine visuelle Gruppierung (Tabs innerhalb eines Moduls)
   - **Empfehlung:** Option A – gibt mehr Flexibilität beim Verknüpfen

3. **Automation-Persistenz: localStorage oder DB?**
   - Phase 1-5: localStorage (schnell, kein Backend nötig)
   - Phase 6: Migration zu PostgreSQL (für Sharing)
   - **Empfehlung:** Sofort abstrahieren (Repository-Pattern), damit Migration einfach ist

### UX

4. **Automation Editor: Eigene Seite oder Modal?**
   - Option A: Eigene Seite (`/automation/[baseId]`)
   - Option B: Modal/Panel innerhalb von "Mein System"
   - **Empfehlung:** Option A – Flow-Editoren brauchen Platz

5. **Agent-Dialog: Im Builder oder global?**
   - Wenn der Agent im Builder eine Verknüpfung vorschlägt – soll der User
     dann direkt im Builder bleiben oder zum Automation Editor wechseln?
   - **Empfehlung:** Im Builder bleiben – der Agent generiert den Code direkt.
     Für komplexe Flows kann man danach in den Automation Editor wechseln.

6. **Wie granular sind exposedActions?**
   - Soll jede Funktion im Modul exponiert werden oder nur explizit markierte?
   - **Empfehlung:** Nur explizit markierte (über `module.json` oder Decorator).
     Der Agent kann beim Bauen vorschlagen, welche Aktionen exponiert werden sollen.

---

*Dieses Dokument wird mit dem Fortschritt der Implementierung aktualisiert.*
