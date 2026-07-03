# ============================================
# LifeOS Warmwind-Style Workspace Runtime Plan
# Detaillierter Implementierungsplan fuer einen persistenten Cloud-Workspace-Ansatz
# ============================================
#
# Zweck: Beschreibt die vollstaendige Zielarchitektur und die schrittweise
#        Umsetzung eines Warmwind-aehnlichen Modells fuer LifeOS:
#        persistente Remote-Workspaces, servernahe Agent-Runtime,
#        visuelle Browser-Automation und hybrider Zugriff auf native LifeOS-Module
# Status: Konzept- und Umsetzungsplan
# Erstellt: 2026-04-01
# Verwendet von: Produktplanung, Architektur-Entscheidungen, spaetere Implementierungsphasen
# ============================================

---

## Inhaltsverzeichnis

1. [Zielbild](#zielbild)
2. [Warum dieser Ansatz](#warum-dieser-ansatz)
3. [Abgrenzung zum aktuellen Stand](#abgrenzung-zum-aktuellen-stand)
4. [Leitprinzipien](#leitprinzipien)
5. [Zielarchitektur](#zielarchitektur)
6. [Systembausteine](#systembausteine)
7. [Workspace-Modell](#workspace-modell)
8. [Agent Runtime Modell](#agent-runtime-modell)
9. [LifeOS-interne Module vs. Remote-Webapps](#lifeos-interne-module-vs-remote-webapps)
10. [Datenmodell](#datenmodell)
11. [Ausfuehrungsfluesse](#ausfuehrungsfluesse)
12. [Phasenplan fuer die Implementierung](#phasenplan-fuer-die-implementierung)
13. [Infra- und Deployment-Plan](#infra--und-deployment-plan)
14. [Kapazitaet des vorhandenen Servers](#kapazitaet-des-vorhandenen-servers)
15. [Konkrete Repo-Auswirkungen](#konkrete-repo-auswirkungen)
16. [Risiken und Gegenmassnahmen](#risiken-und-gegenmassnahmen)
17. [Definition of Done pro Phase](#definition-of-done-pro-phase)
18. [Offene Entscheidungen](#offene-entscheidungen)
19. [Empfohlene Reihenfolge](#empfohlene-reihenfolge)

---

## Zielbild

LifeOS soll sich von einem System fuer einzelne gestreamte Web-App-Sessions
zu einer **persistenten Cloud-Workspace-Plattform** entwickeln.

Das bedeutet:

- Pro User oder pro Base existiert ein serverseitiger Workspace.
- In diesem Workspace laufen Browser, Login-Sessions, Dateiablage und Agent-Aufgaben weiter.
- Der Browser des Users ist primaer das Fenster auf diese Umgebung, nicht der Ort der Ausfuehrung.
- Agents arbeiten serverseitig nahe an diesem Workspace und koennen zwischen
  LifeOS-internen Daten und externen Webapps wechseln.
- Externe Webapps muessen nicht fuer jede Integration nativ nachgebaut werden.

**Kurzform:**

```text
Heute:
User-Browser -> LifeOS UI -> einzelne Stream-Session fuer einzelne Webapp

Ziel:
User-Browser -> LifeOS Control Plane -> persistenter Cloud-Workspace -> Browser/Apps/Agents laufen dort weiter
```

---

## Warum dieser Ansatz

Der Warmwind-artige Ansatz loest vor allem vier Produktprobleme:

1. **Universelle App-Kompatibilitaet**
   Statt fuer jede Webapp API- oder DOM-Integrationen bauen zu muessen,
   kann nahezu jede Webapp im Remote-Workspace genutzt werden.

2. **Persistente Arbeitskontexte**
   Logins, Cookies, Tabs, Downloads und Agent-Schritte bleiben erhalten.

3. **Serverseitige Fortsetzung**
   Ein Agent kann weiterarbeiten, auch wenn der Nutzer die UI schliesst.

4. **Hybrid-Modell**
   LifeOS-interne Module bleiben nutzbar, waehrend externe Webapps parallel im Workspace laufen.

---

## Abgrenzung zum aktuellen Stand

Der aktuelle Stand im Repo ist bereits eine wichtige Vorstufe, aber noch kein voller Workspace-Ansatz.

### Bereits vorhanden

- `lifeos-app` als zentrale Next.js-Anwendung
- `stream-manager` als Orchestrator fuer Browser-Streams
- `/api/streams/*` als Stream-Fassade
- Agent-API-Routen unter `/api/agent` und `/api/agent/stream`
- Tool-Registry und Orchestrierungslogik fuer Agents
- erstes Task-/Scheduled-Task-Modell in der UI

### Noch nicht vorhanden

- Persistente Workspaces statt kurzlebiger Einzelsessions
- Echte serverseitige Scheduled Task Execution
- Langlebige Agent Runs mit Resume-Mechanik
- Serverseitige Browserprofile mit dauerhaftem State
- Gemeinsame Runtime fuer Browser, Agent und Files pro Workspace
- Saubere Trennung zwischen LifeOS Control Plane und Workspace Runtime

---

## Leitprinzipien

### 1. LifeOS bleibt die Steuerzentrale

LifeOS selbst soll **keine komplett gestreamte Remote-Desktop-App** werden.
Die LifeOS-Oberflaeche bleibt eine normale Web-App, die serverseitig ausgeliefert wird.

### 2. Externe Webapps laufen remote

Nur der Teil, der sich auf fremde Webapps, persistente Browserprofile,
visuelle Automation und Remote-Ausfuehrung bezieht, laeuft im Workspace.

### 3. Agenten laufen serverseitig

Agenten duerfen nicht an localStorage, offene React-Panels oder clientseitige UI-Zustaende gebunden sein.
Sie brauchen serverseitige Tools und serverseitigen Zugriff auf den Workspace.

### 4. Hybrid statt dogmatisch

Was sich nativ in LifeOS modellieren laesst, bleibt nativ.
Was universell sein muss oder keine gute API hat, laeuft im Remote-Workspace.

### 5. Persistent by default

Workspace, Browserprofil, Agent-State und Task-Runs sollen standardmaessig ueber Sitzungen hinweg bestehen bleiben.

---

## Zielarchitektur

```text
┌────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                       │
│  LifeOS Web App (lokaler Browser des Users)                       │
│  - Dashboard / Bases / Agents / Tasks / Workspace Viewer          │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                         CONTROL PLANE                              │
│  Next.js + API + DB + Auth + Scheduling + Agent API               │
│  - User/Bases/Files/Tasks                                          │
│  - Workspace Registry                                              │
│  - Agent Runs / Queue                                              │
│  - Tool Registry fuer LifeOS Tools                                │
└───────────────┬──────────────────────────┬─────────────────────────┘
                │                          │
                ▼                          ▼
┌─────────────────────────────┐   ┌─────────────────────────────────┐
│   AGENT RUNTIME LAYER       │   │    WORKSPACE RUNTIME LAYER      │
│  - Planner                  │   │  - Persistente Browserprofile   │
│  - Executor                 │   │  - Chromium / spaeter mehr Apps │
│  - Queue Workers            │   │  - Stream Viewer / WebRTC       │
│  - Tool Chains              │   │  - Dateisystem / Downloads      │
│  - Vision / DOM Hybrid      │   │  - Login- und Session-State     │
└───────────────┬─────────────┘   └───────────────┬─────────────────┘
                │                                 │
                └──────────────┬──────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                 │
│  PostgreSQL + spaeter Queue/Blob/Vector Store                      │
│  - Users / Bases / Modules / Tasks / Agent Runs                    │
│  - Workspaces / Snapshots / Credentials / Files                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Systembausteine

### A. LifeOS Control Plane

Bleibt in der bestehenden `lifeos-app`, wird aber erweitert um:

- Workspace-Lifecycle-APIs
- Agent-Run-APIs
- Scheduling-/Queue-APIs
- Workspace-Zuordnung zu Usern und Bases
- Serverseitige APIs fuer LifeOS-native Module

### B. Workspace Manager Service

Neuer zentraler Service oder Ausbau des heutigen `stream-manager`.

Aufgaben:

- Workspaces erstellen
- Workspaces starten / stoppen / sleepen / aufwecken
- Browserprofile verwalten
- Stream-Verbindungen aufloesen
- Status, Health und Kapazitaet reporten

### C. Workspace Runtime

Pro Workspace:

- persistenter Browser-Kontext
- Dateiverzeichnis
- Download-/Upload-Ablage
- optionale Session-Snapshots
- Browser-Control-Kanal

### D. Agent Runtime / Worker Layer

Neue Background-Execution-Schicht fuer:

- geplante Tasks
- langlaufende Agent-Runs
- Multi-Step-Plaene
- browsernahe Automation
- Retry-/Resume-Logik

### E. Browser Automation Layer

Hybrid-Ansatz:

- DOM/CDP/Playwright wo moeglich
- Vision-/UI-Actions als Fallback
- spaeter strukturierte "workspace.browser.*" Tools

### F. Persistence Layer

Neben PostgreSQL perspektivisch:

- Queue-Backend
- Blob Storage fuer Screenshots / Artefakte / Files
- optional Vector Store fuer Workspace-/Agent-Memory

---

## Workspace-Modell

### Grundentscheidung

Nicht mehr:

- pro Webapp-Tab eine neue Kurzzeit-Session

Sondern:

- pro User oder pro Base ein persistenter Workspace

### Empfohlene MVP-Regel

**Phase 1 MVP:** `1 Workspace pro User`

Vorteile:

- einfache Zuordnung
- Session-/Cookie-State klar getrennt
- geringere Komplexitaet

**Spaeter optional:** `mehrere Workspaces pro User` oder `Workspace pro Base`

### Workspace-Inhalte

Ein Workspace umfasst mindestens:

- Workspace-ID
- Owner User ID
- Status (`creating`, `running`, `sleeping`, `stopped`, `error`)
- Browserprofilpfad
- Stream-Verbindungsdaten
- laufende Agent-Runs
- letzter Fokus / offene Browserfenster
- Storage-Mount fuer Downloads / Uploads / Artefakte

### Persistenzverhalten

- Workspaces werden nicht bei jedem UI-Wechsel zerstoert
- Stattdessen: Idle Timeout + Sleep-Modus
- Browserprofil bleibt erhalten
- Agent-Tasks koennen im Hintergrund weiterlaufen

---

## Agent Runtime Modell

### Ziel

Agenten sollen direkt neben dem Workspace arbeiten koennen.

Das Modell trennt drei Ebenen:

1. **Planner**
   Erstellt einen Ausfuehrungsplan aus User-Intent, Kontext und Workspace-Status.

2. **Executor**
   Fuehrt Schritte aus, ruft Tools auf, wechselt zwischen LifeOS-internen Tools und Workspace-Browser-Tools.

3. **Run Store**
   Persistiert Zustand, Fortschritt, Artefakte, Fehler und Resume-Informationen.

### Agenten muessen koennen

- serverseitig starten
- ohne offenen Frontend-Tab weiterlaufen
- auf denselben Workspace zugreifen wie der User
- Artefakte persistieren
- pausieren / fortsetzen / abbrechen

### Typen von Agent-Runs

- `interactive-run`
  fuer Chat-nahe Interaktion
- `scheduled-run`
  fuer geplante Tasks
- `orchestration-run`
  fuer Multi-Agent- oder Gruppenprozesse
- `workspace-maintenance-run`
  fuer Cleanup, Refresh, Reconnect, Prefetch

---

## LifeOS-interne Module vs. Remote-Webapps

### Kritische Architekturregel

Ein Agent darf **nicht** auf frontendlokale Modulzustaende angewiesen sein.

Wenn ein Modul heute nur ueber:

- React-Komponenten
- Zustand im Browser
- localStorage

funktioniert, ist es **nicht warmwind-kompatibel**.

### Zielzustand fuer interne Module

Jedes agentenrelevante LifeOS-Modul braucht eine serverseitige Zugriffsschicht:

- API oder Tool
- persistiertes Datenmodell
- klare Aktionen

### Kategorisierung

#### Kategorie A: Bereits relativ serverfreundlich

- Datenbankgestuetzte Module
- API-basierte Module
- Files / Folders / Bases
- alles mit klaren Backend-Endpunkten

#### Kategorie B: Muss entkoppelt werden

- rein UI-zentrierte Stores
- lokale Task-Planung im Browser
- Modulzustand ohne Serverpersistenz

#### Kategorie C: Bleibt bewusst remote

- Notion
- Canva
- Instagram
- beliebige Drittanbieter-Webapps ohne gute API

---

## Datenmodell

### Neue Kernentitaeten

```typescript
// ============================================
// Workspace - Persistente Remote-Arbeitsumgebung
// ============================================

interface Workspace {
  id: string;
  ownerUserId: string;
  baseId?: string | null;
  name: string;
  status: 'creating' | 'running' | 'sleeping' | 'stopped' | 'error';
  runtimeType: 'container';
  browserProfilePath: string;
  storagePath: string;
  lastConnectedAt?: string | null;
  lastAgentActivityAt?: string | null;
  sleepAfterMinutes: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AgentRun - Persistente serverseitige Ausfuehrung
// ============================================

interface AgentRun {
  id: string;
  workspaceId?: string | null;
  userId: string;
  sourceType: 'interactive' | 'scheduled' | 'orchestration' | 'maintenance';
  status: 'queued' | 'running' | 'waiting' | 'paused' | 'success' | 'error' | 'cancelled';
  currentStep?: string | null;
  inputSummary: string;
  resultSummary?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ScheduledJob - Serverseitige Scheduling-Quelle
// ============================================

interface ScheduledJob {
  id: string;
  ownerUserId: string;
  workspaceId?: string | null;
  title: string;
  prompt: string;
  cronExpression?: string | null;
  timezone: string;
  enabled: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Weitere sinnvolle Tabellen

- `WorkspaceCredential`
- `WorkspaceArtifact`
- `WorkspaceFile`
- `WorkspaceSessionSnapshot`
- `AgentRunStep`
- `AgentRunArtifact`
- `WorkspaceConnection`

---

## Ausfuehrungsfluesse

### 1. User oeffnet einen Workspace

```text
User -> LifeOS UI -> /api/workspaces/:id/connect
     -> Control Plane prueft Registry
     -> Workspace existiert? ja/nein
     -> falls sleeping: wake
     -> Stream/Viewer-URL zurueck
     -> UI verbindet sich mit Viewer
```

### 2. User startet Agent-Aufgabe

```text
User -> /api/agent-runs
     -> Planner erstellt Plan
     -> Run in DB / Queue
     -> Worker zieht Run
     -> Run nutzt LifeOS-Tools und Workspace-Browser-Tools
     -> Fortschritt wird in DB und Stream-Events geschrieben
```

### 3. Geplante Aufgabe laeuft ohne offenen Tab

```text
Scheduler -> queue scheduled job
         -> worker startet oder weckt Workspace
         -> AgentRun fuehrt Aufgabe aus
         -> Ergebnis wird gespeichert
         -> User sieht spaeter Verlauf und Artefakte
```

### 4. Agent wechselt zwischen internem Modul und Webapp

```text
1. Agent liest Daten ueber LifeOS-API/Tool
2. Agent entscheidet: externer Schritt in Workspace noetig
3. Agent nutzt Browser-Control-Tool im Workspace
4. Agent speichert Ergebnis / Screenshot / File
5. Agent schreibt Resultat zurueck in LifeOS-Datenmodell
```

---

## Phasenplan fuer die Implementierung

## Phase 0 - Architektur-Hardening und Entscheidungsvorbereitung

### Ziel

Die aktuelle Stream- und Agent-Basis so ordnen, dass der Umbau kontrolliert erfolgen kann.

### Aufgaben

- Begrifflichkeiten vereinheitlichen:
  - `stream-manager` wird logisch zum `workspace-manager`
  - Sessions vs. Workspaces sauber trennen
- Agent-Roadmap gegen aktuellen Code abgleichen
- Betroffene clientseitige Stores identifizieren
- Entscheidung dokumentieren:
  - `1 Workspace pro User` fuer MVP
  - `containerbasiert`, keine MicroVMs in Phase 1

### Ergebnis

- freigegebene Zielarchitektur
- Liste agentenrelevanter clientlastiger Module
- finaler Scope fuer Phase 1

---

## Phase 1 - Persistente Workspace Runtime

### Ziel

Aus kurzlebigen Webapp-Sessions werden persistente Browser-Workspaces.

### Technische Umsetzung

- Workspace Registry in DB statt nur In-Memory
- Persistente Browserprofile und Storage-Verzeichnisse
- Start/Stop/Sleep/Wake-API
- Reconnect-faehiger Viewer
- `stream-manager` erweitert zu `workspace-manager`

### API-Beispiele

- `POST /api/workspaces`
- `GET /api/workspaces/:id`
- `POST /api/workspaces/:id/connect`
- `POST /api/workspaces/:id/sleep`
- `POST /api/workspaces/:id/wake`
- `DELETE /api/workspaces/:id`

### Datenmigration

- Session-Registry schrittweise durch Workspace-Registry ersetzen
- Bestehende Stream-Session-Modelle als Kompatibilitaetspfad beibehalten

### Ergebnis

- User verbindet sich nicht mehr mit einer Einmal-Session, sondern mit seinem Workspace

---

## Phase 2 - Browser Control Layer und Workspace Tools

### Ziel

Neben dem Videostream gibt es einen echten serverseitigen Browser-Zugriff fuer Agents.

### Technische Umsetzung

- Playwright oder CDP an denselben Workspace-Browser anbinden
- Neue Tool-Familie:
  - `workspace.browser.navigate`
  - `workspace.browser.click`
  - `workspace.browser.type`
  - `workspace.browser.extract`
  - `workspace.browser.screenshot`
  - `workspace.browser.download`
- Screenshot-/Artefaktpersistenz
- fallback fuer Vision-basierte Schritte definieren

### Ergebnis

- Agenten steuern denselben Workspace-Browser wie der User

---

## Phase 3 - Serverseitige Agent Runtime und Queue

### Ziel

Agenten laufen als persistente, serverseitige Runs weiter.

### Technische Umsetzung

- neue `AgentRun`-Tabelle
- Queue/Worker-System einbauen
- Run-State persistieren
- Resume-/Retry-Modell
- Status-Streaming zur UI

### Migration vom aktuellen Stand

Der heutige `/api/agent`-Pfad bleibt fuer interaktive Requests bestehen,
wird aber intern langfristig in Run-Erstellung + Worker-Ausfuehrung ueberfuehrt.

### Ergebnis

- Agent-Runs koennen im Hintergrund weiterlaufen

---

## Phase 4 - Scheduled Tasks von Browser-Store auf Server verlagern

### Ziel

Die heutigen lokal persistierten Scheduled Tasks werden in echte serverseitige Jobs ueberfuehrt.

### Ausgangslage

Aktuell ist das Task-System im Browser persistiert und nur als UI-/MVP-Layer modelliert.

### Aufgaben

- Prisma-Modelle fuer Scheduled Jobs
- serverseitiger Scheduler
- Job -> AgentRun Mapping
- UI auf serverseitige Daten umstellen
- bestehende Browser-Tasks einmalig migrieren oder verwerfen

### Ergebnis

- geplante Aufgaben funktionieren ohne offenen Browser-Tab

---

## Phase 5 - LifeOS-native Module agentenfaehig machen

### Ziel

Agenten koennen sauber zwischen internen Modulen und Workspace-Webapps wechseln.

### Aufgaben

- Modul-Audit:
  - Welche Module sind nur clientseitig?
  - Welche brauchen Tool-/API-Schichten?
- pro priorisiertem Modul serverseitige Tools bauen
- Zustandsquellen aus localStorage/Zustand in DB/Server-APIs ueberfuehren, wo notwendig

### Prioritaet fuer die erste Welle

- Files / Folder / Dashboard-Dokumente
- Bases / Libraries
- Tasks / Agent Settings / Runs
- Inbox / Calendar nur falls Agenten direkt darauf zugreifen sollen

### Ergebnis

- Agent kann interne Daten lesen/schreiben, ohne von offenem UI-State abzuhaengen

---

## Phase 6 - Multi-App-Workspace UX

### Ziel

Nicht mehr "eine gestreamte Webapp pro Tab", sondern ein echter Arbeitskontext.

### Aufgaben

- Workspace-Home innerhalb LifeOS
- Liste laufender Workspaces
- "Reconnect to workspace"
- Apps im Workspace oeffnen statt neuen Stream-Container starten
- Downloads, Files und Artefakte sichtbar machen

### Ergebnis

- deutlich naeher am Warmwind-Modell

---

## Phase 7 - Produktreife, Isolation und Skalierung

### Ziel

Stabilitaet, Multi-User-Isolation und operativer Betrieb.

### Aufgaben

- Ressourcenlimits pro Workspace
- Monitoring
- Kosten- und Kapazitaetsgrenzen
- Cleanup-Strategien
- Sicherheitsmodell fuer Credentials
- spaeter: horizontal skalierbare Worker-/Workspace-Nodes

### Ergebnis

- erste belastbare Beta-Faehigkeit

---

## Infra- und Deployment-Plan

### Phase-1 Infra auf vorhandenem Server

Auf dem heutigen Server koennen fuer den MVP laufen:

- `lifeos-app`
- `postgres`
- `workspace-manager` (aus heutigem `stream-manager`)
- `agent-worker`
- `scheduler-worker`
- `caddy`

### Empfohlene zusaetzliche Container

- `agent-worker`
- `scheduler`
- optional `blob-minio` spaeter
- optional `redis` oder anderes Queue-Backend spaeter

### Warum der Server weiterhin notwendig ist

Der Server wird noch zentraler als heute, weil dort laufen:

- die komplette Control Plane
- die Workspaces
- die Browserprofile
- die Agent Runtime
- die Scheduled Jobs

---

## Kapazitaet des vorhandenen Servers

### Einschraenkung

Der aktuelle dedizierte Server ist fuer:

- MVP
- interne Tests
- kleine geschlossene Beta

realistisch ausreichend.

### Wofuer er reicht

- zentrale LifeOS-App
- Postgres
- mehrere persistente Browser-Workspaces
- einige parallele Agent-Runs
- erste reale Nutzerprozesse

### Wofuer er nicht dauerhaft reichen wird

- viele gleichzeitige Live-Streams
- viele hochaufgeloeste visuelle Agents
- groessere Multi-User-Last

### Engpaesse

- CPU fuer Browser + Encoding
- RAM pro aktivem Workspace
- fehlende GPU
- gleichzeitige I/O-Last

---

## Konkrete Repo-Auswirkungen

### Bestehende Bereiche, die ausgebaut werden

- `src/app/api/agent/*`
- `src/modules/agents/*`
- `src/app/api/streams/*`
- `src/lib/external-apps/*`
- `app-runner-service/*`
- `infra/stream-stack/*`

### Neue wahrscheinliche Bereiche

- `src/app/api/workspaces/*`
- `src/lib/workspaces/*`
- `src/lib/agent-runs/*`
- `src/lib/scheduler/*`
- `src/lib/queue/*`
- `src/components/workspace/*`
- `agent-worker/` oder Ausbau als eigener Runtime-Service

### Bestehende Stellen mit bekanntem Anpassungsbedarf

- browserlokale Scheduled Tasks
- in-memory Session-Registry
- clientseitige Modulzustandsinseln
- Stream-API auf Session-Denke

---

## Risiken und Gegenmassnahmen

### Risiko 1: Architektur wird zu gross

**Gegenmassnahme:** strikt phasenweise bauen und bei `1 Workspace pro User` fuer MVP bleiben.

### Risiko 2: Agenten haengen weiterhin am Frontend

**Gegenmassnahme:** pro Phase Modul-Audit und Tool-/API-Schicht erzwingen.

### Risiko 3: Streaming-UX bleibt zu schwerfaellig

**Gegenmassnahme:** Stream als Presentations-Layer behandeln, nicht als primäre Steuerlogik.

### Risiko 4: Zu fruehe Skalierungsoptimierung

**Gegenmassnahme:** zuerst Single-Server-MVP, spaeter horizontalisieren.

### Risiko 5: Security fuer Credentials und Sessions

**Gegenmassnahme:** klare Secret-Storage-Strategie und Workspace-Isolation einplanen, bevor mehrere echte Nutzer onboardet werden.

---

## Definition of Done pro Phase

### Phase 1 ist fertig, wenn

- ein User einen persistierenden Workspace besitzt
- der Workspace reconnectbar ist
- Browserprofil ueber Neustarts hinweg erhalten bleibt

### Phase 2 ist fertig, wenn

- ein Agent denselben Browser serverseitig steuern kann, den der User im Workspace sieht

### Phase 3 ist fertig, wenn

- ein Agent-Run ohne offenen Tab weiterlaufen kann

### Phase 4 ist fertig, wenn

- Scheduled Tasks nicht mehr browserlokal sind

### Phase 5 ist fertig, wenn

- Agenten mindestens die priorisierten LifeOS-Kernmodule serverseitig bedienen koennen

### Phase 6 ist fertig, wenn

- die UX nicht mehr "einzelner Stream", sondern "verbundener Workspace" ist

---

## Offene Entscheidungen

1. `1 Workspace pro User` oder spaeter `1 Workspace pro Base`?
2. Queue-Technologie: leichtgewichtig im App-Server starten oder frueh separieren?
3. Persistentes Browserprofil direkt im Workspace-Container oder ueber gemountetes Volume?
4. Blob Storage lokal auf Server oder frueh externisieren?
5. Vision-Layer direkt in Agent Runtime oder zunaechst DOM/CDP-first?
6. Soll `stream-manager` umgebaut oder ein neuer `workspace-manager` angelegt werden?

---

## Empfohlene Reihenfolge

### Sofort als naechste Planungs-/Implementierungswelle

1. Phase 0 freigeben
2. Workspace-Datenmodell entwerfen
3. `stream-manager` konzeptionell zu `workspace-manager` erweitern
4. serverseitige Agent-Run-Entitaeten einfuehren
5. Scheduled Tasks aus dem Browser loesen

### Noch bewusst nicht sofort angehen

- horizontale Skalierung
- MicroVMs
- perfekte native Cursor-/Viewer-Semantik
- komplette Multi-App-Desktop-Simulation

### Produktfokus fuer MVP

**Nicht versuchen, Warmwind komplett nachzubauen.**

Stattdessen:

- persistenter Browser-Workspace
- serverseitige Agent-Runs
- hybride Steuerung LifeOS intern + Webapps extern
- kleine, belastbare Beta-Architektur

---

## Abschluss

Dieser Plan definiert die vollstaendige Zielrichtung fuer einen Warmwind-artigen Ansatz in LifeOS:

- LifeOS bleibt die Steuerzentrale
- Workspaces werden persistente Remote-Laufzeitumgebungen
- Agenten arbeiten serverseitig nahe am Workspace
- externe Webapps laufen universal im Workspace
- interne LifeOS-Module muessen serverseitig agentenfaehig gemacht werden

Der Plan ist bewusst so aufgebaut, dass er vom heutigen Stand aus schrittweise
umsetzbar ist, ohne die aktuelle Plattform in einem Big-Bang neu schreiben zu muessen.
