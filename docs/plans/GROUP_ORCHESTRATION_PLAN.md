# Intelligent Group Orchestration — Implementierungsplan

> **Ziel:** Den Gruppenchat von einem simplen Turn-basierten Multi-Agent-Chat zu einem
> intelligenten, zielorientierten Kollaborationssystem umbauen, in dem ein
> Admin-Orchestrator (und Sub-Admins) Aufgaben verteilt, Diskussionen steuert,
> Break-Outs erstellt und Ergebnisse als Dokumente ablegt.

> **Erstellt:** 2026-04-03
> **Status:** Entwurf
> **Branch:** Test/GroupChat

---

## Inhaltsverzeichnis

1. [Architektur-Übersicht](#1-architektur-übersicht)
2. [Ist-Analyse — Was heute existiert](#2-ist-analyse)
3. [Framework-Bewertung](#3-framework-bewertung)
4. [Phase 1 — Datenmodell-Erweiterung](#4-phase-1--datenmodell-erweiterung)
5. [Phase 2 — LangGraph Orchestration Engine](#5-phase-2--langgraph-orchestration-engine)
6. [Phase 3 — API-Route mit SSE](#6-phase-3--api-route-mit-sse)
7. [Phase 4 — Conversation Modes](#7-phase-4--conversation-modes)
8. [Phase 5 — Channel-Routing (Gruppe vs. Privat)](#8-phase-5--channel-routing)
9. [Phase 6 — Break-Out Sessions](#9-phase-6--break-out-sessions)
10. [Phase 7 — Artefakt-Management](#10-phase-7--artefakt-management)
11. [Phase 8 — Frontend-Anpassungen](#11-phase-8--frontend-anpassungen)
12. [Phase 9 — Council-Merge (optional)](#12-phase-9--council-merge)
13. [Phase 10 — Resilience, Kosten & Operationelles](#13-phase-10--resilience-kosten--operationelles)
14. [Phase 11 — Store-Migration](#14-phase-11--store-migration)
15. [Phase 12 — Scheduled Tasks Integration](#15-phase-12--scheduled-tasks-integration)
16. [Phase 13 — Spatial-View Updates](#16-phase-13--spatial-view-updates)
17. [Datei-Übersicht](#17-datei-übersicht)
18. [Umsetzungsreihenfolge](#18-umsetzungsreihenfolge)

---

## 1. Architektur-Übersicht

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│                                                      │
│  AgentsPage.tsx                                      │
│    └── sendMessage() → POST /api/agent/group-orch.  │
│    └── SSE Stream ← Events (agent_speaking,         │
│                              private_message,        │
│                              breakout_created,       │
│                              artifact_saved, ...)    │
│                                                      │
│  GroupGoalsPanel (NEU)                               │
│  OrchestrationModeIndicator (NEU)                    │
│  BreakoutIndicator (NEU)                             │
│  TaskDelegationPanel (NEU)                           │
│  ArtifactBrowser (existiert als GroupLibrary)        │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              SERVER (Next.js API)                     │
│                                                      │
│  /api/agent/group-orchestrate (NEU)                  │
│    └── GroupOrchestrationEngine                      │
│         ├── LangGraph StateGraph                     │
│         │    ├── OrchestratorNode (Admin-LLM)        │
│         │    ├── SubAdminNode (CMO/CFO-LLM)          │
│         │    ├── AgentExecutionNode (pro Agent)      │
│         │    ├── BroadcastNode (alle parallel)       │
│         │    ├── BreakoutSubGraph                    │
│         │    ├── SynthesisNode                       │
│         │    ├── ArtifactNode                        │
│         │    ├── GoalUpdateNode                      │
│         │    └── RoutingNode (conditional edges)     │
│         │                                            │
│         ├── ChannelRouter (Gruppe/Privat/Breakout)   │
│         ├── GoalTracker                              │
│         └── ArtifactManager (→ GroupLibraryService)  │
│                                                      │
│  /api/group-libraries/... (existiert)                │
│  /api/agent/stream (bleibt für Einzel-Agent-Calls)   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              LLM PROVIDERS                           │
│  Anthropic Claude | OpenAI                           │
│  (bestehende Abstraktion via createLLMClient)        │
└─────────────────────────────────────────────────────┘
```

### Graph-Flow des Orchestrators

```
START
  │
  ▼
OrchestratorNode (Admin-LLM analysiert die Situation)
  │
  ├── Input: User-Nachricht, Ziele, Teilnehmer, History
  │
  ├── Output (structured): OrchestratorDecision
  │     │
  │     ├── mode: 'brainstorming'
  │     │   └─→ BroadcastNode (alle Agents parallel)
  │     │       └─→ SynthesisNode (Orchestrator fasst zusammen)
  │     │           └─→ ArtifactNode (Ergebnisse speichern)
  │     │
  │     ├── mode: 'debate'
  │     │   └─→ AgentExecutionNode (Pro-Agent)
  │     │       └─→ AgentExecutionNode (Contra-Agent)
  │     │           └─→ ... (Runden, max konfigurierbar)
  │     │               └─→ SynthesisNode (Urteil)
  │     │
  │     ├── mode: 'task-delegation'
  │     │   ├─→ Scope-Check: Fällt Task in Sub-Admin-Bereich?
  │     │   │   ├── Ja → SubAdminNode (CMO/CFO übernimmt)
  │     │   │   │        └─→ delegiert an seine subordinateAgents
  │     │   │   └── Nein → OrchestratorNode delegiert direkt
  │     │   └─→ AgentExecutionNode (zugewiesene Agents)
  │     │       └─→ SynthesisNode (Ergebnisse sammeln)
  │     │
  │     ├── mode: 'planning'
  │     │   └─→ BroadcastNode (Input von allen)
  │     │       └─→ SynthesisNode (Ziele formulieren)
  │     │           └─→ GoalUpdateNode (Ziele im Store updaten)
  │     │
  │     ├── action: 'create-breakout'
  │     │   └─→ BreakoutSubGraph (eigener Mini-Orchestrator)
  │     │       └─→ SynthesisNode (Zusammenfassung an Hauptchat)
  │     │
  │     ├── action: 'private-clarification'
  │     │   └─→ ChannelRouter → Privatchat
  │     │       └─→ Pause für diesen Agent, Gruppe läuft weiter
  │     │
  │     └── action: 'respond'
  │         └─→ Direkte Antwort (kein Multi-Agent nötig)
  │
  ▼
RoutingNode (Prüft: Weitere Runden nötig? Ziele erreicht?)
  │
  ├── Ja → zurück zu OrchestratorNode
  └── Nein → END (finale Events ans Frontend)
```

---

## 2. Ist-Analyse

### 2.1 Beteiligte Dateien (Ist-Stand)

| Bereich | Dateien |
|---------|---------|
| **Types** | `src/modules/agents/types.ts` |
| **Store** | `src/modules/agents/store.ts` |
| **Constants** | `src/modules/agents/constants.ts` |
| **Frontend** | `src/modules/agents/components/AgentsPage.tsx` |
| **Gruppen-UI** | `GroupSettingsPanel.tsx`, `GroupSettingsModal.tsx`, `AddParticipantModal.tsx`, `GroupSettingsOrbStrip.tsx`, `GroupLibraryFilesSection.tsx` |
| **Council** | `council-runtime.ts`, `CouncilChatBar.tsx`, `CouncilSeatModalHost.tsx` |
| **API (Stream)** | `src/app/api/agent/stream/route.ts` |
| **API (Tools)** | `src/app/api/agent/route.ts` |
| **Orchestrator** | `src/lib/agent/orchestrator.ts` |
| **LLM Client** | `src/lib/llm/client.ts` (Anthropic + OpenAI) |
| **GroupLibrary** | `src/app/api/group-libraries/[groupAgentId]/...` |
| **Spatial** | `src/modules/agents/components/spatial/...` |

### 2.2 Heutige Architektur

- **Orchestrierung ist clientseitig:** `AgentsPage.tsx` steuert per `while`-Schleife und sequentiellen `fetch`-Calls, welcher Agent wann spricht
- **`adminAgentId` ist nur ein Label:** Existiert als Datenfeld in `CustomAgentData`, steuert aber keinerlei LLM-Orchestrierung
- **Diskussionsmodus per Regex:** `isCollaborationRequest()` prüft mit `COLLABORATION_TRIGGERS`-Patterns ob "brainstorm", "diskutier" etc. vorkommt
- **Turn-basiert mit `[PASS]`:** Agents können mit `[PASS]` aussteigen, Reply-Routing via `An X:`-Prefix
- **Council ist separat:** Eigener UI-Pfad, eigener State, eigene 3-Phasen-Pipeline
- **Privatchats existieren:** `groupParticipantChatId` ermöglicht 1:1-Chats innerhalb einer Gruppe, aber Agents können nicht selbst entscheiden ob sie privat antworten
- **Kein externes Multi-Agent-Framework:** Alles handgebaut

### 2.3 Kernprobleme

1. `adminAgentId` steuert die LLM-Orchestrierung nicht — nur Metadaten/UI
2. Multi-Agent ist clientseitig: viele Roundtrips, kein Checkpointing, fragil
3. `/api/agent/stream` hat keinen Tool-Loop — Gruppenantworten sind rein textuell
4. Duplizierte Prompt-Bausteine zwischen `route.ts` und `stream/route.ts`
5. Kollaborationsmodus an heuristische Regex gebunden
6. Council vs. Gruppenchat sind zwei getrennte UX- und Codepfade
7. Agents können nicht selbst zwischen Gruppe und Privatchat routen
8. Kein Ziel-Tracking, keine Aufgabenverteilung, keine strukturierten Workflows

---

## 3. Framework-Bewertung

### Recherche-Ergebnisse

| Framework | Stars | Sprache | Aktiv? | Bewertung für LifeOS |
|-----------|-------|---------|--------|----------------------|
| **AutoGen** | 54.5k | Python | Maintenance Mode | Veraltet, nicht empfohlen |
| **CrewAI** | 45.9k | Python | Sehr aktiv | Gute Patterns, aber Python-only → Microservice-Overhead |
| **LangGraph** | 28.1k | Python + **TypeScript** | Sehr aktiv | **Beste Wahl** — native TS-Integration |
| **MetaGPT** | 63.6k | Python | Aktiv | SOP-fokussiert, zu starr für freie Diskussion |
| **CAMEL-AI** | 15.2k | Python | Sehr aktiv | Forschungsfokus, nicht produktionsreif |
| **ChatDev** | 31.9k | Python | Aktiv | Software-Dev-fokussiert, zu spezialisiert |
| **AgentScope** | 14.2k | Python | Aktiv | MsgHub-Konzept inspirierend, aber Python-only |
| **LLM Council** | 15.2k | Python | Weekend-Hack | Pattern-Inspiration (Council existiert bereits) |
| **Monju** | — | Python | Aktiv | Brainstorming-Pattern adaptierbar |
| **AIbitat** | — | TypeScript | Inaktiv | "Slack for AI" Konzept gut, Projekt tot |

### Entscheidung

**`@langchain/langgraph`** (TypeScript-SDK) als Orchestrierungs-Backbone.

**Begründung:**
- Native TypeScript-Integration → kein Python-Microservice nötig
- StateGraph mit Checkpointing → robuster als Client-Loop
- Supervisor + Swarm Patterns bereits implementiert
- Conditional Edges → flexible Routing-Logik
- Sub-Graphs → perfekt für Break-Out Sessions
- Breite LLM-Unterstützung via LangChain
- Enterprise-Adoption (Klarna, Uber, LinkedIn)

**Pattern-Inspirationen (als Prompting-Strategien, nicht als Dependencies):**
- **CrewAI:** Rollen-Hierarchie, hierarchische Delegation
- **Monju:** 4-Phasen-Brainstorming (Generate → Filter → Organize → Evaluate)
- **LLM Council / Council of High Intelligence:** Deliberation mit erzwungenem Dissens
- **MAD (Multi-Agents-Debate):** Pro/Contra-Debatte mit Moderator

---

## 4. Phase 1 — Datenmodell-Erweiterung

### 4.1 Rollen-Hierarchie (ersetzt `adminAgentId`)

**Datei: `src/modules/agents/types.ts`**

Heute ist `adminAgentId` ein einzelner String — nur ein Admin pro Gruppe.
Neu: Hierarchische Autoritätsstruktur innerhalb von `GroupChatParticipantRole`.

```typescript
// Hierarchische Autoritätsstufen
type ParticipantAuthority =
  | 'owner'      // CEO: volle Kontrolle, kann alles
  | 'admin'      // CMO/CFO: Admin in ihrem Bereich
  | 'member'     // Normaler Teilnehmer
  | 'observer';  // Nur zuhören, kein aktives Handeln

// Bereichs-Definition für Sub-Admins
interface AuthorityScope {
  domain: string;                  // z.B. "marketing", "finanzen", "technik"
  description?: string;            // Freitext-Beschreibung
  canDelegateInScope: boolean;     // Darf innerhalb des Bereichs Tasks verteilen
  canCreateBreakouts: boolean;     // Darf Breakout-Sessions erstellen
  canManageArtifacts: boolean;     // Darf Ordner/Dokumente verwalten
  subordinateAgentIds?: string[];  // Agents die diesem Sub-Admin unterstehen
}

// Erweiterter Participant (baut auf bestehendem Interface auf)
interface GroupChatParticipantRole {
  agentId: string;
  role: string;                    // Menschenlesbarer Titel (z.B. "CMO")
  authority: ParticipantAuthority; // NEU
  scope?: AuthorityScope;         // NEU — nur für 'owner'/'admin'
  capabilities?: string[];        // NEU — was kann dieser Agent?
}
```

**Migration:** Bestehende Participants ohne `authority` → `'member'`. Bisheriger `adminAgentId` → `authority: 'owner'`.

### 4.2 Erweiterung `CustomAgentData`

```typescript
interface CustomAgentData {
  // ... alle bestehenden Felder bleiben ...
  adminAgentId?: string;         // DEPRECATED — bleibt für Migration
  adminAgentIds?: string[];      // NEU: Alle Agents mit owner/admin Authority
}
```

### 4.3 Ziel-System (GroupObjective)

```typescript
interface GroupObjective {
  id: string;
  groupId: string;
  title: string;
  description: string;
  type: 'short-term' | 'long-term';
  status: 'planned' | 'active' | 'in-progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  subObjectives?: GroupObjective[];
  assignedAgentIds?: string[];
  artifactIds?: string[];           // Referenzen auf GroupLibraryDocumentData
  parentObjectiveId?: string;
  deadline?: string;                // ISO-Datum
  progress?: number;                // 0-100
  createdAt: number;
  updatedAt: number;
}
```

### 4.4 Orchestrator-Session und Tasks

```typescript
// Laufzeit-Zustand einer Gruppenchat-Session
interface GroupOrchestrationSession {
  id: string;
  groupId: string;
  conversationId: string;
  activeMode: OrchestrationMode;
  activeBreakouts: string[];
  pendingTasks: OrchestratorTask[];
  completedTasks: OrchestratorTask[];
  turnHistory: TurnRecord[];
  startedAt: number;
  lastActivityAt: number;
}

type OrchestrationMode =
  | 'free-discussion'    // Offener Chat
  | 'brainstorming'      // Ideen-Generierung
  | 'debate'             // Pro/Contra-Debatte
  | 'task-delegation'    // Aufgaben verteilen und abarbeiten
  | 'review'             // Artefakt/Ergebnis bewerten
  | 'synthesis'          // Ergebnisse zusammenführen
  | 'planning';          // Ziele und Meilensteine planen

interface OrchestratorTask {
  id: string;
  description: string;
  assignedTo: string[];         // Agent-IDs
  delegatedBy: string;          // Admin/Sub-Admin der delegiert hat
  status: 'pending' | 'active' | 'completed' | 'failed';
  result?: string;
  breakoutSessionId?: string;
  artifactIds?: string[];
  createdAt: number;
}

interface TurnRecord {
  agentId: string;
  action: 'spoke' | 'passed' | 'delegated' | 'created-breakout' | 'saved-artifact';
  channel: 'group' | 'private' | 'breakout';
  timestamp: number;
  brief?: string;               // Kurzzusammenfassung für Orchestrator-Kontext
}
```

### 4.5 Channel-Routing

```typescript
// Bestimmt wo eine Nachricht landet
type MessageChannel =
  | { type: 'group' }
  | { type: 'private'; targetUserId: string }
  | { type: 'breakout'; breakoutId: string };

// Geparste Agent-Antwort mit Channel-Split
interface ParsedAgentResponse {
  groupContent: string | null;     // Was in den Gruppenchat kommt
  privateContent: string | null;   // Was in den Privatchat kommt
  isPass: boolean;
}
```

### 4.6 Store-Erweiterungen

**`AgentsState` erweitern:**

```typescript
interface AgentsState {
  // ... bestehende Felder ...
  groupObjectives: GroupObjective[];  // NEU
}
```

**Neue Actions in `AgentsActions`:**

```typescript
addGroupObjective: (groupId: string, objective: Omit<GroupObjective, 'id' | 'createdAt' | 'updatedAt'>) => string;
updateGroupObjective: (objectiveId: string, updates: Partial<GroupObjective>) => void;
deleteGroupObjective: (objectiveId: string) => void;
```

### 4.7 Constants-Erweiterung

**`src/modules/agents/constants.ts`:**

```typescript
export const GROUP_CHAT_ROLE_PRESETS = [
  'CEO / Owner',
  'CTO',
  'CMO',
  'CFO',
  'Admin',
  'Moderator',
  'Koordinator',
  'Fachexperte',
  'Beobachter',
  'Protokoll',
  'Entwickler',
  'Reviewer',
  'Sparringspartner',
  'Researcher',
  'Analyst',
] as const;

export const AUTHORITY_PRESETS: Record<string, ParticipantAuthority> = {
  'CEO / Owner': 'owner',
  'CTO': 'admin',
  'CMO': 'admin',
  'CFO': 'admin',
  'Admin': 'admin',
  'Moderator': 'admin',
};

export const ORCHESTRATION_MODES: Record<OrchestrationMode, {
  label: string;
  description: string;
}> = {
  'free-discussion':  { label: 'Freie Diskussion',    description: 'Offener Austausch ohne feste Struktur' },
  'brainstorming':    { label: 'Brainstorming',        description: 'Ideen sammeln, clustern und bewerten' },
  'debate':           { label: 'Debatte',              description: 'Strukturierte Pro/Contra-Argumentation' },
  'task-delegation':  { label: 'Aufgabenverteilung',   description: 'Tasks zuweisen und Ergebnisse einsammeln' },
  'review':           { label: 'Review',               description: 'Ergebnisse/Dokumente gemeinsam bewerten' },
  'synthesis':        { label: 'Synthese',             description: 'Ergebnisse zusammenführen und Entscheidung treffen' },
  'planning':         { label: 'Planung',              description: 'Ziele definieren und Meilensteine setzen' },
};
```

---

## 5. Phase 2 — LangGraph Orchestration Engine

### 5.1 Dependencies

```bash
npm install @langchain/langgraph @langchain/core
```

Keine weiteren Dependencies nötig. Die bestehende `createLLMClient`-Abstraktion
(Anthropic + OpenAI) wird als Custom-LLM-Adapter für LangGraph eingebunden.

### 5.2 LLM-Adapter

**Neue Datei: `src/lib/agent/langgraph-llm-adapter.ts`**

Brücke zwischen `createLLMClient` und LangGraph-kompatiblem ChatModel-Interface.
Nutzt die bestehende Anthropic/OpenAI-Abstraktion — kein doppelter API-Key-Bedarf.

### 5.3 Graph-State

**Neue Datei: `src/lib/agent/group-orchestrator.ts`**

```typescript
interface GroupGraphState {
  // Input
  userMessage: string;
  groupId: string;
  conversationId: string;
  conversationHistory: ChatMessageData[];
  participants: GroupChatParticipantRole[];
  objectives: GroupObjective[];
  groupContext: GroupContextData;

  // Orchestrator-Entscheidungen
  orchestratorDecision: OrchestratorDecision | null;
  activeMode: OrchestrationMode;

  // Laufzeit-Ergebnisse
  agentResponses: AgentResponseRecord[];
  pendingTasks: OrchestratorTask[];
  completedTasks: OrchestratorTask[];
  breakoutsCreated: string[];
  artifactsSaved: ArtifactRecord[];

  // Channel-Routing
  privateMessages: PrivateMessageRecord[];
  pendingClarifications: ClarificationRequest[];

  // Synthese
  synthesisResult: string | null;
  objectiveUpdates: Partial<GroupObjective>[];

  // Steuerung
  turnCount: number;
  maxTurns: number;              // Guard gegen Endlos-Loops (default: 20)
  shouldContinue: boolean;
  isAborted: boolean;            // User hat abgebrochen
  events: OrchestrationEvent[];

  // Session-Persistenz (LangGraph Checkpointing)
  checkpointId?: string;         // Für Resume nach Abbruch/Fehler

  // Kosten-Tracking
  tokenBudget: number;           // Max. Tokens für diese Session
  tokensUsed: number;            // Bisher verbrauchte Tokens
  costEstimate: number;          // Laufende Kostenschätzung
}
```

### 5.4 Knoten-Definitionen

| Knoten | Aufgabe |
|--------|---------|
| `orchestratorNode` | Admin-LLM entscheidet was als nächstes passiert |
| `subAdminNode` | Sub-Admin übernimmt Steuerung in seinem Scope |
| `agentExecutionNode` | Einzelner Agent führt seinen Turn aus |
| `broadcastNode` | Alle (oder ausgewählte) Agents antworten |
| `breakoutNode` | Sub-Graph für Break-Out Session |
| `artifactNode` | Dokument erstellen/speichern via GroupLibrary API |
| `synthesisNode` | Ergebnisse zusammenführen |
| `goalUpdateNode` | Ziel-Fortschritt aktualisieren |
| `channelRouterNode` | `[PRIVATE]`-Parsing, Message-Routing |
| `routingNode` | Conditional Edge: wohin als nächstes? |

### 5.5 Orchestrator-Entscheidungsschema (Structured Output)

```typescript
type OrchestratorDecision = {
  reasoning: string;
  mode: OrchestrationMode;
  actions: OrchestratorAction[];
};

type OrchestratorAction =
  // Kommunikation
  | { type: 'broadcast'; prompt: string; targetAgentIds?: string[] }
  | { type: 'ask_agent'; agentId: string; question: string }
  | { type: 'ask_sub_admin'; adminId: string; task: string; scope: string }
  | { type: 'private_message'; agentId: string; message: string; reason: string }
  | { type: 'private_clarification'; agentId: string; question: string }
  | { type: 'respond'; message: string }

  // Delegation & Execution
  | { type: 'delegate'; task: string; assignTo: string[]; delegateVia?: string }
  | { type: 'create_breakout'; name: string; participantIds: string[]; task: string;
      mode?: OrchestrationMode }
  | { type: 'synthesize'; fromResponses: string[] }

  // Dynamische Agent-Erstellung
  | { type: 'create_agent'; name: string; role: string; description: string;
      authority?: ParticipantAuthority; scope?: AuthorityScope;
      addToGroup: boolean; temporary?: boolean }
  // → Nutzt intern createCustomAgent + updateGroupAgent
  // → temporary: true = Agent wird nach Session-Ende gelöscht
  // → addToGroup: true = Agent wird automatisch als Teilnehmer hinzugefügt

  // Artefakte & Ordner
  | { type: 'save_artifact'; name: string; folderId?: string; content: string }
  | { type: 'create_folder'; name: string; parentFolderId?: string }
  | { type: 'update_artifact'; documentId: string; content: string }

  // Ziele
  | { type: 'update_objective'; objectiveId: string; updates: Partial<GroupObjective> }
  | { type: 'create_objective'; objective: Partial<GroupObjective> }

  // Session-Steuerung
  | { type: 'change_mode'; newMode: OrchestrationMode; reasoning: string }
  | { type: 'end_session'; summary: string };
```

### 5.6 Sub-Admin-Logik

Wenn ein `delegate`- oder `ask_sub_admin`-Action mit `delegateVia` ankommt,
wird der `subAdminNode` aktiv:

```
OrchestratorNode: "Marketing-Kampagne planen"
  │
  ├── Erkennt: Marketing → CMO ist Sub-Admin für scope "marketing"
  │
  ▼
SubAdminNode (CMO-LLM):
  │
  ├── Input: Task + eigene subordinateAgents
  ├── Output: Sub-Delegation an Marketing-Agents
  │
  ├─→ AgentExecutionNode (Social Media Agent)
  ├─→ AgentExecutionNode (Content Agent)
  │
  ▼
SubAdminSynthesisNode (CMO fasst zusammen)
  │
  ▼
OrchestratorNode (bekommt CMO-Ergebnis, entscheidet weiter)
```

Der Sub-Admin bekommt einen eigenen System-Prompt mit seinem `scope`-Objekt
und darf nur innerhalb seiner `subordinateAgentIds` delegieren.

### 5.7 Orchestrator System-Prompt

**Neue Datei: `src/lib/agent/orchestrator-prompts.ts`**

Dynamischer System-Prompt, gebaut aus Gruppenkontext:

```typescript
function buildOrchestratorSystemPrompt(
  adminAgent: GroupChatParticipantRole,
  allParticipants: GroupChatParticipantRole[],
  objectives: GroupObjective[],
  groupContext: GroupContextData,
): string {
  // Enthält:
  // 1. Identität und Autorität des Admins
  // 2. Alle Teilnehmer mit Rollen, Scopes, Fähigkeiten
  // 3. Sub-Admins und deren Bereiche
  // 4. Aktuelle Ziele und deren Status
  // 5. Verfügbare Aktionen (structured output schema)
  // 6. Regeln für Delegation (wer darf was)
  // 7. Channel-Regeln (Gruppe vs. Privat)
  // 8. Bestehende Ordner und Dokumente
}
```

### 5.8 Prompt-Konsolidierung

**Neue Datei: `src/lib/agent/group-context-builder.ts`**

Konsolidiert die heute duplizierten Funktionen:
- `buildGroupContextPromptBlock` (existiert in `route.ts` UND `stream/route.ts`)
- `buildParticipantPromptBlock` (existiert in `route.ts` UND `stream/route.ts`)

Eine einzige Quelle der Wahrheit, importiert von allen drei Routen.

---

## 6. Phase 3 — API-Route mit SSE

### 6.1 Neue Route: `/api/agent/group-orchestrate/route.ts`

Server-Sent Events statt eines einzelnen Response.

**Request-Body:**

```typescript
interface GroupOrchestrateRequest {
  groupId: string;
  conversationId: string;
  userMessage: string;
  forceMode?: OrchestrationMode;  // User kann Modus erzwingen
  mentionedAgentIds?: string[];   // Explizite @-Mentions
  images?: AttachedImage[];
  files?: AttachedFile[];
}
```

### 6.2 SSE-Event-Typen

```typescript
type OrchestrationEvent =
  // Modus & Steuerung
  | { type: 'mode_selected'; mode: OrchestrationMode; reasoning: string }
  | { type: 'session_end'; summary: string }
  | { type: 'error'; message: string }

  // Agent-Kommunikation (Gruppe)
  | { type: 'agent_speaking'; agentId: string; agentName: string }
  | { type: 'agent_token'; agentId: string; token: string }
  | { type: 'agent_done'; agentId: string; fullContent: string }
  | { type: 'agent_passed'; agentId: string }

  // Channel-Routing (Privat)
  | { type: 'private_message'; agentId: string; agentName: string;
      content: string; conversationId: string }
  | { type: 'private_clarification_needed'; agentId: string; agentName: string;
      question: string; conversationId: string }

  // Task-Management
  | { type: 'task_delegated'; task: OrchestratorTask }
  | { type: 'task_completed'; taskId: string; result: string }
  | { type: 'sub_admin_active'; adminId: string; scope: string }

  // Break-Outs
  | { type: 'breakout_created'; breakoutId: string; name: string; participants: string[] }
  | { type: 'breakout_result'; breakoutId: string; summary: string }

  // Artefakte
  | { type: 'artifact_saved'; name: string; folderId: string }
  | { type: 'folder_created'; folderId: string; name: string }

  // Ziele
  | { type: 'objective_updated'; objectiveId: string; updates: Partial<GroupObjective> }
  | { type: 'objective_created'; objective: GroupObjective }

  // Dynamische Agents
  | { type: 'agent_created'; agentId: string; name: string; role: string; temporary: boolean }

  // Modus-Wechsel (Mid-Session)
  | { type: 'mode_changed'; oldMode: OrchestrationMode; newMode: OrchestrationMode;
      reasoning: string }

  // User-Intervention
  | { type: 'intervention_received'; userMessage: string }
  | { type: 'orchestration_paused'; reason: string }
  | { type: 'orchestration_resumed' }
  | { type: 'orchestration_aborted'; reason: string }

  // Synthese
  | { type: 'synthesis'; content: string }
  | { type: 'orchestrator_message'; content: string };
```

---

## 7. Phase 4 — Conversation Modes

### 7.1 Modus-Erkennung (ersetzt `isCollaborationRequest`)

Statt der Regex-Heuristik in `AgentsPage.tsx` entscheidet der Orchestrator-LLM
via Classification (structured output). Der User kann den Modus auch manuell
erzwingen via Slash-Command oder UI-Dropdown.

### 7.2 Brainstorming-Modus (Monju-Pattern)

```
1. GENERATE  — Alle Agents generieren Ideen (parallel, unabhängig)
2. FILTER    — Orchestrator clustert und dedupliziert
3. ORGANIZE  — Orchestrator erstellt Struktur (Kategorien, Prioritäten)
4. EVALUATE  — Alle Agents bewerten Top-Ideen aus ihrer Fachperspektive
5. DECIDE    — Orchestrator/Sub-Admin trifft Entscheidung
6. SAVE      — Ergebnis als Artefakt ablegen
```

### 7.3 Debatte-Modus (MAD + Council of High Intelligence-Pattern)

```
1. SETUP              — Orchestrator weist Positionen zu (Pro/Contra)
2. OPENING            — Jede Seite legt Position dar
3. CROSS-EXAMINATION  — Strukturierte Runden (max konfigurierbar, default: 3)
4. DISSENT CHECK      — War der Dissens echt? Falls zu harmonisch: provozieren
5. VERDICT            — Synthese mit Begründung
6. SAVE               — Debatte-Protokoll als Artefakt
```

### 7.4 Task-Delegation-Modus (CrewAI-Pattern)

```
1. DECOMPOSE  — Orchestrator zerlegt Ziel in Tasks
2. ASSIGN     — Direkt oder via Sub-Admin an Agents
3. EXECUTE    — Agents arbeiten (parallel oder sequenziell)
4. REPORT     — Sub-Admins fassen Bereichsergebnisse zusammen
5. INTEGRATE  — Orchestrator führt zusammen, prüft gegen Ziele
6. SAVE       — Ergebnisse als Artefakte, Ziel-Fortschritt aktualisieren
```

### 7.5 Review-Modus (Council-Pattern)

```
1. PRESENT     — Artefakt/Ergebnis wird allen vorgelegt
2. INDIVIDUAL  — Jeder Agent bewertet unabhängig
3. ANONYMIZE   — Reviews werden anonymisiert geteilt
4. DISCUSS     — Cross-Examination auf Basis der Reviews
5. SYNTHESIZE  — Orchestrator fasst Konsens zusammen
```

### 7.6 Planning-Modus

```
1. INPUT     — Alle Agents geben Input zu Machbarkeit/Aufwand
2. DRAFT     — Orchestrator erstellt Ziel-Entwurf
3. FEEDBACK  — Agents kommentieren Entwurf
4. FINALIZE  — Ziele + Meilensteine festlegen
5. SAVE      — Als GroupObjectives im Store + Artefakt
```

### 7.7 Slash-Commands für Modus-Wahl

```
/brainstorm [Thema]     → forceMode: 'brainstorming'
/debate [Frage]         → forceMode: 'debate'
/delegate [Aufgabe]     → forceMode: 'task-delegation'
/review [Dokument]      → forceMode: 'review'
/plan [Ziel]            → forceMode: 'planning'
```

---

## 8. Phase 5 — Channel-Routing (Gruppe vs. Privat)

### 8.1 Kernprinzip

Agents posten im Gruppenchat **nur gruppenrelevante Beiträge**.
Für alles, was nur den User betrifft (Rückfragen, persönliche Empfehlungen,
Statusmeldungen), nutzen sie den **Privatchat**.

### 8.2 Agent System-Prompt (Channel-Regeln)

Erweiterung von `buildParticipantPromptBlock`:

```
## CHANNEL RULES — CRITICAL

Du postest im Gruppenchat NUR Beiträge, die für die gesamte Gruppe relevant sind:
- Inhaltliche Beiträge zum aktuellen Thema
- Antworten auf Fragen anderer Teilnehmer
- Ergebnisse deiner Aufgaben
- Fachliche Einschätzungen aus deiner Rolle

Für ALLES ANDERE nutzt du den Privatchat mit dem User:
- Rückfragen, die nur der User beantworten kann
- Persönliche Empfehlungen an den User
- Statusupdates die nur den User betreffen
- Unsicherheiten über den eigenen Auftrag
- Nachfragen zu Kontext, den nur der User kennt

Format:
- Gruppenbeitrag → normal schreiben
- Privat → [PRIVATE] Deine Nachricht
- Beides → Gruppenbeitrag hier.\n[PRIVATE] Private Nachricht hier.
```

### 8.3 Parsing im ChannelRouterNode

```typescript
function parseAgentResponse(rawResponse: string): ParsedAgentResponse {
  const privateMarker = '[PRIVATE]';
  const idx = rawResponse.indexOf(privateMarker);

  if (idx === -1) {
    return {
      groupContent: rawResponse.trim() || null,
      privateContent: null,
      isPass: isPassSignal(rawResponse),
    };
  }

  const groupPart = rawResponse.slice(0, idx).trim();
  const privatePart = rawResponse.slice(idx + privateMarker.length).trim();

  return {
    groupContent: groupPart || null,
    privateContent: privatePart || null,
    isPass: false,
  };
}
```

### 8.4 Orchestrator-Level Channel Awareness

Der Orchestrator System-Prompt enthält:

```
## CHANNEL AWARENESS

Du entscheidest auch, WO Kommunikation stattfindet:

GRUPPENCHAT: Inhaltliche Diskussion, Ergebnisse, Entscheidungen, Aufgabenverteilung
PRIVATCHAT:  Rückfragen an den User, Budget/Präferenzen, individuelle Status, unreife Zwischenergebnisse

Wenn ein Agent eine Rückfrage hat die nur den User betrifft:
→ Nutze action 'private_clarification' statt 'ask_agent'
→ Die Gruppen-Diskussion läuft für andere weiter
→ Sobald die Antwort da ist, integriert der Agent sie in seinen nächsten Gruppenbeitrag
```

### 8.5 Async Clarification Loop

```
Gruppenchat:
  User: "Erstellt mir eine Marketingstrategie für Q3"
  │
  Orchestrator: → Brainstorming-Modus
  │
  CMO (Gruppe): "Ich schlage drei Kanäle vor: Social, SEO, Paid..."
  │
  CFO (Gruppe): "Budget-Rahmen muss klar sein."
  │
  CFO → [PRIVATE]: "Wie hoch ist das Gesamtbudget für Q3?
                     Gibt es Vorgaben vom Board?"
  │
  ┌─── Privatchat (CFO) ───────────────────┐
  │ CFO: "Wie hoch ist das Gesamtbudget?"   │
  │ User: "50k, davon max 60% für Paid"     │
  └─────────────────────────────────────────┘
  │
  CFO (Gruppe): "Budget: 50k, davon max 30k für Paid.
                 Mein Vorschlag für die Verteilung..."
```

**Verhalten:**
1. `private_message` Event → Nachricht in den Privatchat schreiben
2. Im Gruppenchat: dezenter Hinweis *"[CFO] klärt etwas mit dem User..."*
3. Orchestrierung für CFO pausiert (andere Agents laufen weiter)
4. User antwortet im Privatchat
5. Antwort wird als Kontext an den nächsten CFO-Turn übergeben
6. CFO postet Ergebnis im Gruppenchat

---

## 9. Phase 6 — Break-Out Sessions

### 9.1 Erweiterung der bestehenden `createBreakoutSession`

```typescript
interface BreakoutSessionConfig {
  parentGroupId: string;
  name: string;
  participants: GroupChatParticipantRole[];
  task: string;                     // Was soll die Session erreichen?
  mode?: OrchestrationMode;         // Welcher Modus im Breakout?
  maxTurns?: number;
  reportBackTo: string;             // Wem wird berichtet? (Admin/Sub-Admin ID)
  autoSaveArtifacts?: boolean;
  targetFolderId?: string;          // Wo Ergebnisse speichern?
}
```

### 9.2 Breakout als LangGraph Sub-Graph

```typescript
function createBreakoutSubGraph(config: BreakoutSessionConfig) {
  // Eigener StateGraph mit:
  // 1. Mini-Orchestrator (Sub-Admin oder erster Teilnehmer)
  // 2. AgentExecutionNodes für jeden Breakout-Teilnehmer
  // 3. SynthesisNode am Ende
  //
  // Ergebnis fließt als "breakout_result" Event zurück
}
```

### 9.3 Breakout-Lifecycle

```
Orchestrator: "CMO, kümmere dich mit Social Media Agent und Content Agent
               um die Kampagnen-Ideen."
  │
  ├── 1. createBreakoutSession im Store (UI zeigt "Breakout läuft...")
  ├── 2. Sub-Graph startet mit CMO als Mini-Orchestrator
  ├── 3. Events streamen in den Breakout-Chat (eigene Konversation)
  ├── 4. Ergebnis: CMO fasst zusammen
  ├── 5. Zusammenfassung → Hauptchat als System-Message
  ├── 6. Artefakte → Gruppen-Ordner
  └── 7. Orchestrator entscheidet: Breakout-Ergebnis integrieren
```

---

## 10. Phase 7 — Artefakt-Management

### 10.1 Agent-Tools für Dokumentenverwaltung

Baut auf der bestehenden **GroupLibrary-Infrastruktur** auf
(`/api/group-libraries/[groupAgentId]/...`).

```typescript
const GROUP_ARTIFACT_TOOLS = [
  {
    name: 'save_document',
    description: 'Speichert ein Dokument in der Gruppenbibliothek',
    parameters: { name: 'string', content: 'string', folderId: 'string?', mimeType: 'string?' },
  },
  {
    name: 'create_folder',
    description: 'Erstellt einen neuen Ordner in der Gruppenbibliothek',
    parameters: { name: 'string', parentFolderId: 'string?' },
  },
  {
    name: 'read_document',
    description: 'Liest ein Dokument aus der Gruppenbibliothek',
    parameters: { documentId: 'string' },
  },
  {
    name: 'list_documents',
    description: 'Listet Dokumente in einem Ordner oder der gesamten Bibliothek',
    parameters: { folderId: 'string?' },
  },
];
```

Tools werden **serverseitig** im LangGraph-Node ausgeführt.
Der Orchestrator steuert, welche Agents welche Tools nutzen dürfen
(basierend auf `authority` und `scope`).

### 10.2 Auto-Artefakte nach Modus

| Modus | Automatisch gespeichertes Artefakt |
|-------|-------------------------------------|
| Brainstorming | `brainstorm-{datum}-{thema}.md` — Ideen + Bewertungen |
| Debate | `debatte-{datum}-{thema}.md` — Protokoll + Positionen + Urteil |
| Task-Delegation | `tasks-{datum}-{thema}.md` — Aufgaben + Status + Ergebnisse |
| Review | `review-{datum}-{thema}.md` — Bewertungen + Konsens |
| Planning | `plan-{datum}-{thema}.md` — Ziele + Meilensteine |

---

## 11. Phase 8 — Frontend-Anpassungen

### 11.1 AgentsPage.tsx Refactoring

**Was sich ändert:**
- Die `while`-Loop (Diskussionsmodus, ~Zeilen 1088–1215) wird entfernt
- Die sequentielle `for`-Schleife (normaler Multi-Agent, ~Zeilen 1228+) wird entfernt
- `isCollaborationRequest` Regex entfällt komplett
- Ersetzt durch **einen einzigen** SSE-Call an `/api/agent/group-orchestrate`
- `callParticipantStreaming` bleibt für Einzel-Agent-Chats (1:1)

**Neue Funktion:**

```typescript
async function handleGroupOrchestrateStream(
  groupId: string,
  conversationId: string,
  message: string,
  forceMode?: OrchestrationMode,
) {
  const response = await fetch('/api/agent/group-orchestrate', {
    method: 'POST',
    body: JSON.stringify({ groupId, conversationId, userMessage: message, forceMode }),
  });

  const reader = response.body.getReader();
  // SSE-Events parsen und in den Store schreiben:
  // - agent_speaking     → Placeholder-Message im Chat
  // - agent_token        → Message streamen (wie bisher)
  // - agent_done         → Message finalisieren
  // - private_message    → In Privatchat schreiben + Unread-Badge
  // - breakout_created   → Breakout-Indicator zeigen
  // - artifact_saved     → Notification
  // - objective_updated  → GoalPanel updaten
  // - synthesis          → Finale Zusammenfassung als Message
}
```

### 11.2 Neue UI-Komponenten

| Komponente | Zweck |
|-----------|-------|
| **`GroupGoalsPanel.tsx`** | Tab in GroupSettings: Ziele anlegen/tracken, Fortschrittsbalken, Sub-Ziele als Baum |
| **`OrchestrationModeIndicator.tsx`** | Chat-Header: aktiver Modus, Dropdown zum Wechseln, Fortschritt ("Runde 2/3") |
| **`BreakoutIndicator.tsx`** | Im Chat: "Breakout Session läuft...", Klick → Breakout-Chat, Auto-Zusammenfassung |
| **`TaskDelegationPanel.tsx`** | Seitenleiste: aktive Tasks, Zuweisungen, Status, Ergebnisse |
| **`PrivateMessageBadge.tsx`** | Unread-Indicator auf Privatchats in der Sidebar |

### 11.3 GroupSettingsPanel-Erweiterung

- **Authority-Dropdown** pro Teilnehmer (Owner / Admin / Member / Observer)
- **Scope-Editor** für Admins (Domain, Subordinates, Berechtigungen)
- **Capabilities-Tags** pro Agent
- **Ziele-Tab** (GroupGoalsPanel)

### 11.4 Slash-Commands im ChatInput

```
/brainstorm [Thema]     → forceMode: 'brainstorming'
/debate [Frage]         → forceMode: 'debate'
/delegate [Aufgabe]     → forceMode: 'task-delegation'
/review [Dokument]      → forceMode: 'review'
/plan [Ziel]            → forceMode: 'planning'
```

---

## 12. Phase 9 — Council-Merge (optional)

Das bestehende Council-System wird zu einem **Orchestration-Modus** statt eines
separaten Codepfads:

- Council Eldest → `authority: 'owner'` Admin
- Council-Seats → normale `participantRoles`
- 3-Phasen-Flow → `review`-Modus im Orchestrator
- Bestehende UI bleibt als spezielles Layout

**Zeitpunkt:** Optional, als letztes oder separat, da Council aktuell funktioniert
und der Merge komplex ist.

---

## 13. Phase 10 — Resilience, Kosten & Operationelles

### 13.1 Abort/Cancel-Mechanismus

Der User muss eine laufende Orchestrierung jederzeit stoppen können.

**Client-seitig:**

```typescript
// AbortController pro aktiver Orchestrierung
const orchestrationAbortController = useRef<AbortController | null>(null);

// Beim Start:
orchestrationAbortController.current = new AbortController();
fetch('/api/agent/group-orchestrate', {
  signal: orchestrationAbortController.current.signal,
  // ...
});

// Beim Abbruch (Button-Klick oder neue Nachricht):
orchestrationAbortController.current?.abort();
```

**Server-seitig:**

```typescript
// In der group-orchestrate Route:
// 1. Request-Signal wird an den LangGraph-Runner weitergegeben
// 2. Vor jedem Node-Execution wird geprüft: signal.aborted?
// 3. Bei Abort: Aktuelle Ergebnisse als Partial-Summary zurückgeben
// 4. Breakout-Sub-Graphs werden ebenfalls abgebrochen

// Neues SSE-Event:
{ type: 'orchestration_aborted', reason: 'User hat abgebrochen' }
```

**UI:**
- "Stop"-Button im `OrchestrationModeIndicator` (analog zum bestehenden
  "Diskussion stoppen"-Button)
- Bei Abort: Bisherige Ergebnisse bleiben im Chat, Synthese wird übersprungen
- Optional: "Fortsetzen"-Button der beim letzten Checkpoint weitermacht

### 13.2 Mid-Session Intervention

Der User kann mitten in einer laufenden Orchestrierung eingreifen:

```
Laufendes Brainstorming...
  CMO: "Idee 1: Influencer-Kampagne..."
  CTO: "Idee 2: API-Integration..."

  User tippt: "Fokussiert euch auf B2B, nicht B2C"
```

**Ablauf:**
1. Neue User-Nachricht wird als `intervention`-Event an den Server gesendet
2. Der `routingNode` erkennt die Intervention
3. Die Intervention wird dem Orchestrator als neuer Kontext übergeben
4. Der Orchestrator entscheidet: Modus beibehalten mit neuem Fokus, oder Modus wechseln

```typescript
// Neue SSE-Events:
{ type: 'intervention_received', userMessage: '...' }
{ type: 'orchestration_paused', reason: 'User-Nachricht wird verarbeitet' }
{ type: 'orchestration_resumed' }
// ODER:
{ type: 'mode_changed', oldMode: 'brainstorming', newMode: 'task-delegation',
  reasoning: 'User hat konkreten Auftrag gegeben' }
```

**Implementierung:** Zweiter SSE-Kanal oder WebSocket für User→Server-Nachrichten
während die Orchestrierung läuft. Alternativ: Separater POST-Endpoint
`/api/agent/group-orchestrate/intervene` der in den laufenden Graph-State schreibt.

### 13.3 Error-Handling & Resilience

| Fehlerfall | Verhalten |
|------------|-----------|
| Orchestrator liefert ungültiges Structured Output | Retry mit vereinfachtem Schema (max. 2 Retries), dann Fallback auf `free-discussion`-Modus |
| Agent-Execution schlägt fehl (API-Error) | Agent überspringen, `agent_error`-Event senden, Orchestrator informieren |
| Breakout-Sub-Graph hängt | Timeout nach `maxTurns * 30s`, Partial-Summary zurückgeben |
| SSE-Verbindung bricht ab | Client reconnect mit `checkpointId`, Server resumed ab letztem Checkpoint |
| Sub-Admin delegiert an nicht-existenten Agent | Validierung im `subAdminNode`, Fehler an Orchestrator zurückmelden |
| Token-Budget erschöpft | `budget_exhausted`-Event, erzwungene Synthese mit bisherigen Ergebnissen |
| Graph-Loop (RoutingNode sagt immer "weiter") | Hard-Limit `maxTurns` (default: 20), danach erzwungenes `end_session` |

**Neues SSE-Event für Fehler:**

```typescript
| { type: 'agent_error'; agentId: string; error: string; skipped: boolean }
| { type: 'budget_exhausted'; tokensUsed: number; budget: number }
```

### 13.4 Token-Budget & Modell-Strategie

Jede Orchestrierungs-Session hat ein konfigurierbares Token-Budget.

**Modell-Strategie pro Node:**

| Node | Empfohlenes Modell | Begründung |
|------|--------------------|------------|
| `orchestratorNode` (Classification) | Schnelles Modell (z.B. Claude Haiku, GPT-4o-mini) | Entscheidung ist strukturiert, braucht kein Top-Modell |
| `orchestratorNode` (Synthesis) | Starkes Modell (z.B. Claude Sonnet, GPT-4o) | Synthese braucht Tiefe |
| `agentExecutionNode` | Per-Agent konfiguriert (aus `agent-config-store`) | Jeder Agent hat sein eigenes Modell |
| `subAdminNode` | Starkes Modell | Sub-Admin-Entscheidungen sind komplex |
| `breakoutNode` | Per-Agent konfiguriert | Wie Hauptchat |
| `synthesisNode` | Starkes Modell | Finale Zusammenfassung muss hochwertig sein |

**Budget-Tracking:**

```typescript
// Nach jedem LLM-Call im Graph:
state.tokensUsed += response.usage.totalTokens;
state.costEstimate += estimateCost(response.usage, modelId);

// Prüfung vor jedem Node:
if (state.tokensUsed >= state.tokenBudget * 0.9) {
  // Warnung ans Frontend
  emitEvent({ type: 'budget_warning', tokensUsed, budget });
}
if (state.tokensUsed >= state.tokenBudget) {
  // Erzwungene Synthese
  state.shouldContinue = false;
}
```

**Integration mit bestehendem `AgentUsageEvent`:**

Jeder LLM-Call innerhalb der Orchestrierung erzeugt einen `AgentUsageEvent`
mit `sourceType: 'group-orchestration'`. So bleibt das bestehende
Analytics-Dashboard kompatibel.

### 13.5 Session-Persistenz & Long-Term Memory

**Kurzfristig (innerhalb einer Session):**

LangGraph Checkpointing speichert den `GroupGraphState` nach jedem Node.
Bei Verbindungsabbruch kann der Client mit der `checkpointId` reconnecten
und die Session ab dem letzten stabilen Punkt fortsetzen.

```typescript
// LangGraph Checkpointer-Konfiguration
import { MemorySaver } from '@langchain/langgraph';

const checkpointer = new MemorySaver(); // In-Memory für MVP
// Später: PostgresSaver oder SqliteSaver für Persistenz

const graph = new StateGraph({ ... })
  .compile({ checkpointer });
```

**Langfristig (über Sessions hinweg):**

Wenn die Gruppe über Tage/Wochen an langfristigen Zielen arbeitet, braucht
der Orchestrator Kontext aus vergangenen Sessions.

```typescript
interface GroupSessionSummary {
  id: string;
  groupId: string;
  sessionDate: string;            // ISO-Datum
  mode: OrchestrationMode;
  topic: string;                  // Worum ging es?
  keyDecisions: string[];         // Wichtigste Entscheidungen
  openQuestions: string[];         // Was ist noch offen?
  objectiveProgress: {            // Welche Ziele wurden beeinflusst?
    objectiveId: string;
    progressBefore: number;
    progressAfter: number;
    notes: string;
  }[];
  artifactsCreated: string[];     // IDs der erstellten Dokumente
  participantContributions: {     // Wer hat was beigetragen?
    agentId: string;
    summary: string;
  }[];
  createdAt: number;
}
```

**Ablauf:**
1. Am Ende jeder Session (`end_session`-Action) erstellt der `synthesisNode`
   automatisch eine `GroupSessionSummary`
2. Die Summary wird als Artefakt in der Gruppenbibliothek gespeichert
3. Beim Start der nächsten Session lädt der Orchestrator:
   - Die letzten 3–5 Session-Summaries
   - Alle aktiven `GroupObjectives` mit Status
   - Die neuesten Artefakte
4. Diese bilden den "Long-Term Memory"-Kontext im Orchestrator-Prompt

**Store-Erweiterung:**

```typescript
interface AgentsState {
  // ... bestehende Felder ...
  groupObjectives: GroupObjective[];
  groupSessionSummaries: GroupSessionSummary[];  // NEU
}
```

### 13.6 Observer-Rolle im Detail

Participants mit `authority: 'observer'` haben folgendes Verhalten:

- **Sehen:** Alle Gruppenchat-Nachrichten (lesend)
- **Nicht sehen:** Privatchats anderer Agents, Breakout-Sessions an denen sie
  nicht teilnehmen
- **Nicht tun:** Werden nie vom Orchestrator zum Sprechen aufgefordert,
  können keine Tasks delegiert bekommen, keine Artefakte erstellen
- **Können:** Vom User im Privatchat direkt angesprochen werden
  (z.B. "Was hältst du als Beobachter von der Diskussion?")
- **UI:** Grau/gedimmt in der Teilnehmerliste, kein Orb-Glow im Spatial View

**Orchestrator-Prompt:**

```
Observers sind PASSIVE Teilnehmer. Vergib ihnen KEINE Tasks,
fordere sie NICHT zum Sprechen auf. Sie beobachten nur.
Der User kann sie separat im Privatchat befragen.
```

### 13.7 Notifications

Bestimmte Events sollen den User aktiv benachrichtigen, auch wenn er nicht
im Gruppenchat ist:

| Event | Notification |
|-------|-------------|
| `private_message` | Badge auf Privatchat in Sidebar + optional Toast |
| `breakout_result` | Toast: "Breakout ‹Name› abgeschlossen" |
| `objective_updated` (status → completed) | Toast: "Ziel ‹Titel› erreicht!" |
| `private_clarification_needed` | Badge + Toast: "‹Agent› braucht deine Antwort" |
| `budget_exhausted` | Toast-Warnung: "Token-Budget erschöpft" |
| `agent_error` | Dezenter Hinweis im Chat |

**Implementierung:** Nutzt ein einfaches Event-Bus-Pattern im Frontend
(z.B. Zustand Store `notificationsStore` oder bestehende Toast-Logik).

---

## 14. Phase 11 — Store-Migration

### 14.1 Problem

Der Agents-Store persistiert via `zustand/persist` in `localStorage`
(Key: `lifeos-agents-state`). Die neuen Typen (`authority`, `scope`,
`groupObjectives`, `groupSessionSummaries`) existieren in bestehenden
Daten nicht. Ohne Migration brechen bestehende Gruppen.

### 14.2 Migrations-Strategie

```typescript
// In store.ts, innerhalb der persist-Konfiguration:
persist(
  (set, get) => ({ /* ... store ... */ }),
  {
    name: 'lifeos-agents-state',
    version: 2,  // Hochzählen bei Schema-Änderungen
    migrate: (persistedState, version) => {
      const state = persistedState as Record<string, unknown>;

      if (version < 2) {
        // === Migration v1 → v2: Group Orchestration ===

        // 1. GroupObjectives initialisieren
        if (!state.groupObjectives) {
          state.groupObjectives = [];
        }

        // 2. GroupSessionSummaries initialisieren
        if (!state.groupSessionSummaries) {
          state.groupSessionSummaries = [];
        }

        // 3. participantRoles: authority-Feld ergänzen
        const customAgents = (state.customAgents || []) as CustomAgentData[];
        for (const agent of customAgents) {
          if (agent.type !== 'group' || !agent.participantRoles) continue;

          for (const participant of agent.participantRoles) {
            if (!participant.authority) {
              // Bisheriger Admin → owner, alle anderen → member
              participant.authority =
                participant.agentId === agent.adminAgentId
                  ? 'owner'
                  : 'member';
            }
          }

          // adminAgentIds aus adminAgentId ableiten
          if (agent.adminAgentId && !agent.adminAgentIds) {
            agent.adminAgentIds = [agent.adminAgentId];
          }
        }

        // 4. Conversations: participantRoles ebenfalls migrieren
        const conversations = (state.conversations || []) as ChatConversation[];
        for (const conv of conversations) {
          if (!conv.participantRoles) continue;
          const groupAgent = customAgents.find(a => a.id === conv.agentId);
          for (const participant of conv.participantRoles) {
            if (!participant.authority) {
              participant.authority =
                participant.agentId === groupAgent?.adminAgentId
                  ? 'owner'
                  : 'member';
            }
          }
        }
      }

      return state;
    },
  }
);
```

### 14.3 Abwärtskompatibilität

- `adminAgentId` bleibt als Feld erhalten (deprecated), wird aber nicht mehr
  gelesen — alle Logik nutzt `authority: 'owner'` aus `participantRoles`
- Code der auf `adminAgentId` zugreift (UI, Spatial, Prompts) wird auf
  eine Helper-Funktion umgestellt:

```typescript
function getGroupAdmins(group: CustomAgentData): GroupChatParticipantRole[] {
  return (group.participantRoles || []).filter(
    p => p.authority === 'owner' || p.authority === 'admin'
  );
}

function getGroupOwner(group: CustomAgentData): GroupChatParticipantRole | undefined {
  return (group.participantRoles || []).find(p => p.authority === 'owner');
}
```

---

## 15. Phase 12 — Scheduled Tasks Integration

### 15.1 Problem

Das bestehende `ScheduledAgentTask`-System (`tasks-store.ts`) unterstützt
`targetType: 'group'`, aber die Ausführung nutzt heute den normalen
Agent-API-Call — nicht die neue Orchestrierung.

### 15.2 Lösung

Scheduled Group Tasks werden über die neue `/api/agent/group-orchestrate`
Route ausgeführt, mit optionalem `forceMode`:

```typescript
// Erweiterung von ScheduledAgentTask:
interface ScheduledAgentTask {
  // ... bestehende Felder ...
  orchestrationMode?: OrchestrationMode;  // NEU: Welcher Modus beim Start?
}
```

**Beispiel-Szenarien:**

| Geplanter Task | Modus | Was passiert |
|----------------|-------|-------------|
| "Jeden Montag 9:00: Wöchentlicher Review" | `review` | Orchestrator sammelt Status aller Ziele, Agents berichten, Synthese als Artefakt |
| "Täglich 18:00: Tages-Zusammenfassung" | `synthesis` | Orchestrator fasst den Tag zusammen, aktualisiert Ziel-Fortschritt |
| "Jeden Freitag: Sprint-Planung" | `planning` | Nächste Woche planen, Tasks delegieren, Meilensteine setzen |

**Ablauf bei Scheduled Execution:**
1. Task-Runner erkennt `targetType: 'group'`
2. Statt normalem API-Call → POST an `/api/agent/group-orchestrate`
3. `forceMode` aus `task.orchestrationMode` (falls gesetzt)
4. Ergebnis wird gemäß `outputMode` abgelegt (Konversation, Log, Notification)
5. Session-Summary wird automatisch erstellt

### 15.3 UI-Erweiterung

Im bestehenden Task-Editor (ScheduledTaskForm) ein neues Feld:
- **"Orchestrierungs-Modus"** Dropdown (nur sichtbar wenn `targetType: 'group'`)
- Vorauswahl basierend auf Task-Beschreibung (optional, LLM-assisted)

---

## 16. Phase 13 — Spatial-View Updates

### 16.1 Heutiger Stand

Die Spatial-Visualisierung (`buildGroupSpatialGraph.ts`) zeigt:
- Gruppen-Orb im Zentrum
- Admin-Orb hervorgehoben
- Teilnehmer als verbundene Orbs
- Breakout-Sessions als Sub-Cluster

### 16.2 Neue Visualisierungen

| Konzept | Spatial-Darstellung |
|---------|---------------------|
| **Multi-Admin-Hierarchie** | Owner-Orb zentral + größer, Admin-Orbs mit Bereichs-Label, Member-Orbs normal, Observer-Orbs gedimmt/kleiner |
| **Aktiver Modus** | Modus-Icon/Label über dem Gruppen-Orb (z.B. 🧠 Brainstorming) |
| **Laufende Breakouts** | Animierte Sub-Cluster die sich vom Hauptcluster "ablösen" und nach Abschluss wieder "andocken" |
| **Sprechender Agent** | Glow-Animation auf dem Orb des aktuell antwortenden Agents (wie heute bei Council) |
| **Task-Zuweisungen** | Gestrichelte Linien von Admin/Sub-Admin zu zugewiesenen Agents |
| **Scope-Bereiche** | Farbige Hintergrund-Zonen für Sub-Admin-Domains (z.B. Marketing-Zone, Finanz-Zone) |
| **Ziel-Fortschritt** | Fortschrittsring um den Gruppen-Orb |

### 16.3 Änderungen

**Datei: `buildGroupSpatialGraph.ts`**
- Admin-Erkennung von `adminAgentId` auf `getGroupAdmins()` Helper umstellen
- Neue Node-Properties: `authority`, `scope`, `isActive`, `currentTask`
- Scope-Zones als Background-Shapes

**Datei: `AgentOrb3D.tsx`**
- Observer-Orbs: reduzierte Opacity, kleinerer Radius
- Admin-Orbs: Bereichs-Label als Tooltip
- Modus-Indicator über dem Gruppen-Orb

---

## 17. Datei-Übersicht

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/lib/agent/group-orchestrator.ts` | LangGraph StateGraph + Knoten-Definitionen |
| `src/lib/agent/langgraph-llm-adapter.ts` | Brücke zu bestehendem LLM-Client |
| `src/lib/agent/group-context-builder.ts` | Konsolidierte Prompt-Builder (eliminiert Duplikate) |
| `src/lib/agent/orchestrator-prompts.ts` | System-Prompts für Admin/Sub-Admin/Modi |
| `src/lib/agent/orchestrator-tools.ts` | Artifact-Tools + Structured-Output-Schemas |
| `src/app/api/agent/group-orchestrate/route.ts` | Neue SSE-Route für Gruppenorchestrierung |
| `src/app/api/agent/group-orchestrate/intervene/route.ts` | Mid-Session User-Intervention Endpoint |
| `src/modules/agents/components/GroupGoalsPanel.tsx` | Ziel-UI (Tab in GroupSettings) |
| `src/modules/agents/components/OrchestrationModeIndicator.tsx` | Modus-Anzeige + Stop-Button im Chat-Header |
| `src/modules/agents/components/BreakoutIndicator.tsx` | Breakout-Status-Anzeige |
| `src/modules/agents/components/TaskDelegationPanel.tsx` | Task-Übersicht |
| `src/modules/agents/components/PrivateMessageBadge.tsx` | Unread-Badge für Privatchats |

### Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/modules/agents/types.ts` | Neue Typen (Authority, Scope, Objectives, Session, Channel, SessionSummary) |
| `src/modules/agents/constants.ts` | Erweiterte Role-Presets, Authority-Presets, Modi-Definitionen |
| `src/modules/agents/store.ts` | Neue Actions (Objectives, SessionSummaries), Migration v1→v2, `getGroupAdmins` Helper |
| `src/modules/agents/tasks-store.ts` | `orchestrationMode`-Feld für Scheduled Group Tasks |
| `src/modules/agents/components/AgentsPage.tsx` | Diskussions-Loop → SSE-Call, Slash-Commands, Abort-Handler |
| `src/modules/agents/components/GroupSettingsPanel.tsx` | Authority-Dropdown, Scope-Editor, Ziele-Tab |
| `src/modules/agents/components/ChatHistorySidebar.tsx` | Unread-Badge für Privatchats, Notifications |
| `src/modules/agents/components/spatial/buildGroupSpatialGraph.ts` | Multi-Admin, Scope-Zones, Modus-Indicator |
| `src/modules/agents/components/spatial/AgentOrb3D.tsx` | Observer-Dimming, Admin-Labels, Modus-Icon |
| `src/app/api/agent/stream/route.ts` | Import aus group-context-builder, Channel-Regeln im Prompt |
| `src/app/api/agent/route.ts` | Import aus group-context-builder |

---

## 18. Umsetzungsreihenfolge

| # | Phase | Aufwand | Freigeschaltete Fähigkeit |
|---|-------|---------|---------------------------|
| 1 | Types + Store + Migration (Rollen-Hierarchie, Objectives, Channel-Typen, v1→v2) | ~1–2 Tage | Multi-Admin-Datenmodell, Ziel-Tracking, keine Breaking Changes |
| 2 | LangGraph Engine + LLM-Adapter + Kosten-Tracking | ~2–3 Tage | Server-seitige Orchestrierung mit Budget-Guards |
| 3 | API-Route `/group-orchestrate` mit SSE + Abort | ~1–2 Tage | Streaming-Orchestrierung, abbrechbar |
| 4 | AgentsPage.tsx Refactoring | ~1–2 Tage | Frontend nutzt neue Engine |
| 5 | Intelligente Modi (Brainstorm, Debate, Delegate, Plan) | ~2–3 Tage | Strukturierte Workflows |
| 6 | Channel-Routing (Gruppe vs. Privat) + Notifications | ~1–2 Tage | Saubere Privatchat-Trennung |
| 7 | Mid-Session Intervention + Modus-Wechsel | ~1 Tag | User kann laufende Session umlenken |
| 8 | Breakout Sub-Graphs | ~1–2 Tage | Dynamische Untergruppen |
| 9 | Artefakt-Tools + Auto-Save + Session-Summaries | ~1–2 Tage | Dokumente speichern, Long-Term Memory |
| 10 | Dynamic Agent Creation | ~1 Tag | Orchestrator kann Spezialisten-Agents erstellen |
| 11 | UI-Komponenten (Goals, Mode-Indicator, Tasks, Badges) | ~2 Tage | Vollständige UX |
| 12 | Scheduled Tasks Integration | ~1 Tag | Geplante Gruppen-Orchestrierungen |
| 13 | Spatial-View Updates | ~1–2 Tage | Multi-Admin, Scope-Zones, Modus im 3D-View |
| 14 | Council-Merge (optional) | ~2 Tage | Vereinheitlichter Codepfad |
| | **Gesamt** | **~18–25 Tage** | |

### Risiken & Mitigationen

| Risiko | Mitigation |
|--------|-----------|
| LangGraph JS-SDK hat weniger Features als Python | Vor Phase 2: Spike-Evaluation der benötigten Features (Sub-Graphs, Checkpointing, Streaming). Fallback: eigener StateGraph ohne LangGraph |
| Token-Kosten explodieren bei großen Gruppen | Token-Budget + Modell-Strategie (günstigere Modelle für Classification/Routing). MVP: Hard-Limit 50k Tokens pro Session |
| LLM liefert inkonsistentes Structured Output | Schema-Validation + Retry + Fallback auf `free-discussion`. Structured Output mit JSON-Schema statt freiem Text |
| Bestehende Gruppen brechen nach Migration | Store-Migration mit Versionierung. Alle neuen Felder optional mit Defaults. E2E-Test mit bestehenden Gruppen-Daten |
| Orchestrierung fühlt sich langsam an | SSE-Streaming für sofortiges Feedback. Orchestrator-Classification als erster, schneller Call. Agents streamen parallel wo möglich |

### Was NICHT gebraucht wird

- **Kein Python-Microservice** — LangGraph JS deckt alles ab
- **Kein CrewAI/AutoGen als Dependency** — Patterns werden als Prompts adaptiert
- **Kein komplett neues UI** — bestehende Komponenten werden erweitert
- **Kein Open WebUI** — eigenes Frontend ist besser integriert
- **Kein separater Notification-Service** — Event-Bus im Frontend reicht für MVP
