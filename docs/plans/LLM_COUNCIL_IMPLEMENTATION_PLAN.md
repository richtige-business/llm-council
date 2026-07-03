# ============================================
# LifeOS LLM Council Implementation Plan
# Detaillierter Implementierungsplan fuer ein deliberatives Multi-LLM-Council im Agent-Modul
# ============================================
#
# Zweck: Beschreibt die vollstaendige Zielarchitektur und die schrittweise
#        Umsetzung eines LLM Council Systems fuer LifeOS:
#        Auswahl mehrerer Agents/Modelle, strukturierte Deliberation,
#        Review und Ranking, Synthese durch einen Chair sowie immersive
#        Darstellung im 3D-Agentenraum.
# Status: Konzept- und Umsetzungsplan
# Erstellt: 2026-04-01
# Verwendet von: Produktplanung, Architektur-Entscheidungen, Implementierungsphasen
# ============================================

---

## Inhaltsverzeichnis

1. [Zielbild](#zielbild)
2. [Warum ein Council eigener Typ sein muss](#warum-ein-council-eigener-typ-sein-muss)
3. [Abgleich mit dem aktuellen Repo-Stand](#abgleich-mit-dem-aktuellen-repo-stand)
4. [Leitprinzipien](#leitprinzipien)
5. [Produktdefinition des Council-Systems](#produktdefinition-des-council-systems)
6. [Zielarchitektur](#zielarchitektur)
7. [Datenmodell](#datenmodell)
8. [Council-Run-State-Maschine](#council-run-state-maschine)
9. [Deliberation-Pipelines](#deliberation-pipelines)
10. [Backend- und API-Plan](#backend--und-api-plan)
11. [Frontend- und UX-Plan](#frontend--und-ux-plan)
12. [3D-Raum und Council-Szene](#3d-raum-und-council-szene)
13. [Persistenz, Telemetrie und Analytics](#persistenz-telemetrie-und-analytics)
14. [Sicherheit, Kosten und Performance](#sicherheit-kosten-und-performance)
15. [Phasenplan fuer die Implementierung](#phasenplan-fuer-die-implementierung)
16. [Konkrete Repo-Auswirkungen](#konkrete-repo-auswirkungen)
17. [Migration und Rueckwaertskompatibilitaet](#migration-und-rueckwaertskompatibilitaet)
18. [Definition of Done pro Phase](#definition-of-done-pro-phase)
19. [Offene Entscheidungen](#offene-entscheidungen)
20. [Empfohlene Reihenfolge](#empfohlene-reihenfolge)

---

## Zielbild

LifeOS soll neben einzelnen Agents und Gruppen einen neuen erstklassigen
Ausfuehrungstyp erhalten: den **LLM Council**.

Ein Council ist ein deliberatives Multi-Agent-System, in dem mehrere
ausgewaehlte Agents oder Modell-Personas dieselbe Aufgabe bearbeiten,
gegenseitig bewerten, Antworten ranken und daraus eine finale,
qualitativ bessere Antwort erzeugen.

Der Zielzustand ist:

- Ein Council kann wie ein Agent ausgewaehlt werden.
- Ein Council besitzt definierte Mitglieder, Rollen und eine Strategie.
- Ein Prompt startet keinen normalen Chat, sondern einen **Council Run**.
- Ein Run durchlaeuft strukturierte Phasen statt freier Chat-Nachrichten.
- Ergebnisse sind nachvollziehbar: Rohantworten, Reviews, Rankings, Finale.
- Der Council ist im 3D-Raum als eigene szenische Darstellung sichtbar.

**Kurzform:**

```text
Heute:
User -> einzelner Agent oder Gruppenchat -> sequenzielle Antworten

Ziel:
User -> Council -> First Opinions -> Review/Ranking -> Chair Synthesis -> Final Output
```

---

## Warum ein Council eigener Typ sein muss

Ein Council darf in LifeOS **nicht nur als normale Gruppe** modelliert werden.

### Was Gruppen heute sind

Gruppen bilden im aktuellen System vor allem:

- eine Teilnehmerliste mit Rollen
- einen Hauptchat
- optionale Einzelchats pro Teilnehmer
- Diskussionen mit freiem Turn-Taking
- Gruppenkontext, Dateien und Breakout-Sessions

### Was ein Council zusaetzlich braucht

Ein Council braucht eine deutlich staerkere Strukturierung:

- feste Council-Mitglieder mit spezifischer Funktion
- wiederholbare Run-Pipelines
- persistente Zwischenartefakte pro Phase
- Reviews und Rankings pro Antwort
- optional anonyme Review-Phase
- einen Chair oder Synthese-Agent
- Qualitaetsmetadaten wie Score, Confidence, Begruendung
- Ergebnisse, die vom Chat getrennt analysiert werden koennen

### Architekturfolgerung

Ein Council ist konzeptionell kein Chat-Typ, sondern ein
**orchestrierter deliberativer Workflow**.

Deshalb sollte das System einen dritten semantischen Typ erhalten:

- `agent`
- `group`
- `council`

---

## Abgleich mit dem aktuellen Repo-Stand

Das aktuelle Repo bringt bereits sehr gute Vorbedingungen fuer ein Council mit.

### Bereits vorhanden

- hierarchische Agents und Custom Agents
- Gruppen mit Teilnehmerrollen
- participant-spezifisches Prompting in `/api/agent` und `/api/agent/stream`
- Gruppenkontext fuer Files, Rollen und Breakouts
- clientseitige Multi-Agent-Diskussion mit Streaming
- ein 3D-Agentenraum mit Spatial Graph, Fokus und Kamera
- ein Analytics- und Scheduled-Task-Grundgeruest

### Noch nicht vorhanden

- eigenstaendige Council-Entitaet
- serverseitige Council-Orchestrierung
- persistente Council Runs
- Bewertungs- und Ranking-Artefakte
- Council-spezifische UI fuer Stage-Ansichten
- Council-spezifische 3D-Szene mit Sitzordnung

### Zentrale Beobachtung

Das aktuelle System kann bereits mehrere Agenten aus derselben Nachricht
ansprechen, aber die Orchestrierung liegt weitgehend im Frontend.

Fuer ein echtes Council ist das nicht ausreichend, weil:

- Reviews und Rankings persistiert werden muessen
- die Deliberation reproduzierbar sein soll
- dieselbe Logik spaeter auch fuer Tasks, Automationen und Background-Runs
  serverseitig verfuegbar sein sollte

---

## Leitprinzipien

### 1. Council ist Workflow, nicht nur Chat

Die innere Logik eines Councils muss als explizite Pipeline modelliert werden.

### 2. Bestehende Agents bleiben wiederverwendbar

Ein Council soll vorhandene Built-in- und Custom-Agents wiederverwenden,
nicht ein paralleles Modell-Universum aufbauen.

### 3. Deliberation serverseitig

Die Council-Orchestrierung darf nicht hauptsaechlich im React-Client leben.

### 4. Ergebnisse muessen auditierbar sein

Jede Phase erzeugt Artefakte, die angezeigt, gespeichert und spaeter erneut
ausgewertet werden koennen.

### 5. 3D ist Praesentation, nicht Steuerlogik

Der Council-Raum ist ein starker UX-Layer, aber die Ausfuehrung muss unabhaengig
von der 3D-Darstellung funktionieren.

### 6. MVP zuerst strukturiert, dann immersiv

Zuerst Deliberation Engine und Results UI bauen, danach Council Room.

---

## Produktdefinition des Council-Systems

### Kernobjekte

- `Council Definition`
- `Council Member`
- `Council Run`
- `Council Stage`
- `Council Artifact`
- `Council Verdict`

### Typische Council-Rollen

- `member`
  Antwortet in der First-Opinion-Phase.
- `reviewer`
  Bewertet Antworten anderer Mitglieder.
- `judge`
  Erstellt Rankings oder Endbewertungen.
- `chair`
  Erstellt die finale Synthese.
- `observer`
  Optional fuer spaetere passive Rollen ohne aktive Bewertung.

### Unterstuetzte Strategien

#### Strategie A: First Opinions -> Review -> Synthesis

Empfohlener MVP.

- Alle Mitglieder antworten unabhaengig.
- Alle oder ausgewaehlte Reviewer bewerten diese Antworten.
- Ein Chair erzeugt die finale Antwort.

#### Strategie B: Debate -> Vote -> Synthesis

Spaeter.

- Mitglieder diskutieren eine oder mehrere Runden.
- Danach erfolgt Abstimmung oder Ranking.
- Chair erstellt die Endfassung.

#### Strategie C: Judge Panel

Spaeter.

- Einige Agents generieren Kandidatenantworten.
- Andere Agents sind reine Bewerter.
- Finale Antwort basiert primär auf Scores und Reviewer-Kommentaren.

### Council-Typen aus Produktsicht

- `Quality Council`
  Mehrere Experten entwerfen und bewerten Antwortqualitaet.
- `Decision Council`
  Mehrere Rollen beraten eine Entscheidung.
- `Creative Council`
  Generiert alternative Konzepte und waehlt die staerkste Richtung.
- `Audit Council`
  Prueft eine bestehende Antwort auf Fehler, Risiken und Luecken.

---

## Zielarchitektur

```text
┌────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                        │
│  Agents Hub / Council Sidebar / Results View / 3D Council Room    │
└───────────────────────────────┬────────────────────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────────┐
│                         CONTROL PLANE                              │
│  Next.js API + DB + Auth + Council Definitions + Council Runs     │
│  - Council CRUD                                                    │
│  - Council Run APIs                                                │
│  - Result Streaming / Polling                                      │
└───────────────┬──────────────────────────┬─────────────────────────┘
                │                          │
                ▼                          ▼
┌─────────────────────────────┐   ┌─────────────────────────────────┐
│   COUNCIL ORCHESTRATOR      │   │        EXISTING AGENT LAYER      │
│  - Stage Engine             │   │  - Agent Configs                 │
│  - Member Scheduling        │   │  - Tool Registry                 │
│  - Review/Ranking Logic     │   │  - /api/agent and streaming      │
│  - Chair Synthesis          │   │  - Context / prompts / tools     │
└───────────────┬─────────────┘   └───────────────┬─────────────────┘
                │                                 │
                └──────────────┬──────────────────┘
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                 │
│  CouncilDefinition / CouncilMember / CouncilRun / Artifacts        │
│  Reviews / Rankings / Verdicts / Analytics                         │
└────────────────────────────────────────────────────────────────────┘
```

### Zentrale Trennung

#### Bestehende Agent-Layer

Bleiben verantwortlich fuer:

- Modellkonfiguration
- Tools
- Rollen-Prompting
- modulbezogene Ausfuehrung

#### Neuer Council-Orchestrator

Wird verantwortlich fuer:

- Phasensteuerung
- Reihenfolge und Parallelitaet
- Artefaktpersistenz
- Rankinglogik
- Finalisierung

---

## Datenmodell

### Erweiterung bestehender Typen

Der aktuelle `CustomAgentData`-Typ sollte perspektivisch erweitert werden.

Empfohlene Richtung:

```typescript
type CustomEntityType = 'agent' | 'group' | 'council';

interface CouncilMemberConfig {
  agentId: string;
  role: 'member' | 'reviewer' | 'judge' | 'chair';
  weight?: number;
  enabled: boolean;
  canGenerateOpinion: boolean;
  canReview: boolean;
  canVote: boolean;
}

interface CouncilStrategyConfig {
  type: 'first-opinions-review-synthesis' | 'debate-vote-synthesis' | 'judge-panel';
  reviewMode: 'anonymous' | 'named';
  synthesisMode: 'chair' | 'top-ranked' | 'hybrid';
  maxDebateRounds: number;
  maxReviewersPerArtifact?: number;
  topKForSynthesis?: number;
}
```

### Empfohlene neue Kernentitaeten

```typescript
// ============================================
// CouncilDefinition - Konfigurierbares Council
// ============================================

interface CouncilDefinition {
  id: string;
  name: string;
  description?: string;
  objective?: string;
  icon: string;
  color: string;
  type: 'council';
  parentAgentId?: string;
  createdAt: string;
  updatedAt: string;
  strategy: CouncilStrategyConfig;
}

// ============================================
// CouncilMember - Mitglied eines Councils
// ============================================

interface CouncilMember {
  id: string;
  councilId: string;
  agentId: string;
  seatIndex: number;
  role: 'member' | 'reviewer' | 'judge' | 'chair';
  weight: number;
  enabled: boolean;
  canGenerateOpinion: boolean;
  canReview: boolean;
  canVote: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CouncilRun - Ein einzelner deliberativer Lauf
// ============================================

interface CouncilRun {
  id: string;
  councilId: string;
  conversationId?: string | null;
  sourceType: 'interactive-chat' | 'scheduled-task' | 'api';
  status: 'queued' | 'running' | 'completed' | 'error' | 'cancelled';
  currentStage: 'opinions' | 'reviews' | 'ranking' | 'synthesis' | 'done';
  prompt: string;
  inputSummary?: string | null;
  finalArtifactId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt: string;
}

// ============================================
// CouncilArtifact - Persistente Zwischen- und Endartefakte
// ============================================

interface CouncilArtifact {
  id: string;
  councilRunId: string;
  memberAgentId: string;
  stage: 'opinion' | 'review' | 'ranking' | 'synthesis';
  artifactType: 'text' | 'scorecard' | 'verdict';
  targetArtifactId?: string | null;
  content: string;
  score?: number | null;
  confidence?: number | null;
  metadataJson?: string | null;
  createdAt: string;
}
```

### Zusaetzliche Tabellen

- `CouncilRunStageEvent`
  fuer Timeline, Streaming und UI-Status
- `CouncilRunVote`
  fuer explizite Ranking-/Voting-Daten
- `CouncilPreset`
  fuer vorgefertigte Council-Templates
- `CouncilArtifactReference`
  fuer Verknuepfungen zwischen Reviews und Zielantworten

### Empfehlung fuer den bestehenden Store

Kurzfristig:

- `customAgents` um `type: 'council'` erweitern
- Council-Metadaten zunaechst separat halten

Mittelfristig:

- semantische Trennung zwischen `CustomAgentData`, `GroupDefinition`,
  `CouncilDefinition`

---

## Council-Run-State-Maschine

### Ziel

Ein Council Run braucht eine explizite Stage-Maschine statt freier
Konversationslogik.

### Empfohlene Stages

1. `queued`
2. `preparing`
3. `opinions`
4. `reviews`
5. `ranking`
6. `synthesis`
7. `completed`
8. `error`
9. `cancelled`

### Uebergaenge

```text
queued
  -> preparing
  -> opinions
  -> reviews
  -> ranking
  -> synthesis
  -> completed

jede Stage
  -> error
  -> cancelled
```

### Bedeutung pro Stage

#### `preparing`

- Mitglieder und Konfiguration validieren
- Prompt und Kontext aufbereiten
- Artefaktcontainer initialisieren

#### `opinions`

- Erstmeinungen parallel oder limitiert-parallel generieren

#### `reviews`

- Antworten anonymisiert oder benannt an Reviewer verteilen
- qualitative Kritik und Scores erzeugen

#### `ranking`

- Reviews aggregieren
- Top-Antworten bestimmen
- Rankinggruende berechnen

#### `synthesis`

- Chair oder Synthese-Modell erzeugt Endantwort

---

## Deliberation-Pipelines

## MVP-Pipeline: First Opinions -> Review -> Synthesis

### Phase 1: First Opinions

Alle aktivierten `member`-Mitglieder erhalten:

- den User Prompt
- den allgemeinen Council-Kontext
- ihre Rollenbeschreibung
- optional council-spezifische Zielkriterien

Jedes Mitglied erzeugt:

- `opinion`-Text
- optional `confidence`
- optional `short rationale`

### Phase 2: Review

Alle `reviewer` oder `member`-Mitglieder bewerten die generierten Opinions.

Pro Review:

- Zielartefakt
- Score z. B. 1-10
- Begruendung
- benoetigte Verbesserungen

Empfehlung fuer MVP:

- jedes Mitglied reviewed alle anderen
- eigene Antwort wird nicht reviewed
- Review anonymisiert, falls `reviewMode = anonymous`

### Phase 3: Ranking

Die Scores werden serverseitig aggregiert.

Empfohlene Metriken:

- `meanScore`
- `weightedScore`
- `reviewCount`
- `confidenceAdjustedScore`

### Phase 4: Synthesis

Der `chair` oder ein definierter Synthese-Agent bekommt:

- Originalprompt
- Top-K Opinions
- zentrale Reviews
- Rankinggruende
- Council-Zielbeschreibung

Erzeugt:

- finale Antwort
- optionale Begruendung, warum diese Endfassung priorisiert wurde

---

## Spaetere Deliberation-Pipelines

### Debate Pipeline

Zusaetzlich zu den oben genannten Stages:

- `debate-round-1`
- `debate-round-2`
- danach Review und Synthesis

### Critique-and-Revise Pipeline

- Opinions
- Peer Critique
- Revised Opinions
- Ranking
- Synthesis

### Judge Panel Pipeline

- Generatoren erstellen Kandidaten
- Richter bewerten Kandidaten
- Chair fasst den Gewinner zusammen

---

## Backend- und API-Plan

### Neue Backend-Bausteine

Empfohlene neue Bereiche:

- `src/lib/agent/council/*`
- `src/app/api/council/*`
- optional spaeter `src/lib/council/*` falls Council vom Agent-Layer getrennt wird

### Empfohlene Servermodule

#### `src/lib/agent/council/types.ts`

Definiert:

- `CouncilDefinition`
- `CouncilRun`
- `CouncilArtifact`
- `CouncilStageResult`

#### `src/lib/agent/council/prompt-builders.ts`

Erstellt:

- Opinion-Prompts
- Review-Prompts
- Ranking-Prompts
- Chair-Synthesis-Prompts

#### `src/lib/agent/council/scoring.ts`

Verantwortlich fuer:

- Score-Aggregation
- Gewichtung
- Tie-Breaking
- Top-K-Ermittlung

#### `src/lib/agent/council/orchestrator.ts`

Verantwortlich fuer:

- Run initialisieren
- Stages nacheinander ausfuehren
- Artefakte persistieren
- Fehler behandeln
- Resultat finalisieren

#### `src/lib/agent/council/repository.ts`

Abstraktion fuer:

- Run speichern
- Artefakte lesen/schreiben
- Member laden
- Status updaten

### API-Endpunkte

#### Council Definitions

- `GET /api/council`
- `POST /api/council`
- `GET /api/council/[councilId]`
- `PATCH /api/council/[councilId]`
- `DELETE /api/council/[councilId]`

#### Council Members

- `POST /api/council/[councilId]/members`
- `PATCH /api/council/[councilId]/members/[memberId]`
- `DELETE /api/council/[councilId]/members/[memberId]`

#### Council Runs

- `POST /api/council/[councilId]/run`
- `GET /api/council/runs/[runId]`
- `GET /api/council/runs/[runId]/artifacts`
- `POST /api/council/runs/[runId]/cancel`
- optional `GET /api/council/runs/[runId]/stream`

### Ausfuehrungsmodell fuer MVP

Empfehlung:

- interaktiv synchron startbar
- serverseitig orchestriert
- Resultate per Polling oder SSE an die UI

### Ausfuehrungsmodell spaeter

- queuebasiert
- resumable
- backgroundfaehig fuer Scheduled Tasks

---

## Integration mit bestehender Agent-API

### Was wiederverwendet werden kann

- `orchestrateAgentRequest`
- Agent-Konfigurationen aus `agent-config-store`
- bestehende Modellprovider und Tool-Registry
- participant-spezifische Prompt-Bloecke als Muster

### Was **nicht** direkt uebernommen werden sollte

- clientseitige Schleifen in `AgentsPage.tsx`
- freie Gruppendiskussion als Kernmechanismus

### Empfohlene Wiederverwendungsstrategie

Der Council-Orchestrator ruft intern denselben LLM-Layer und dieselben
Agent-Konfigurationen auf, aber nicht ueber freies Chat-Routing,
sondern ueber explizite Stage-Prompts.

### Wichtige Designentscheidung

Ein Council-Mitglied soll aus Sicht der Ausfuehrung weiterhin ein Agent bleiben:

- `member.agentId` verweist auf einen bestehenden Agent
- die Modellwahl kommt aus diesem Agent
- die Council-Rolle kommt zusaetzlich aus der Council-Konfiguration

So entsteht kein Konflikt mit dem bestehenden Agent-System.

---

## Frontend- und UX-Plan

### Ziel

Council muss in der UI als eigenes Konzept sichtbar werden, ohne die heutige
Agent-/Gruppen-Logik zu verwischen.

### Hauptbereiche

#### 1. Sidebar / Hub

Neben `Agents` und `Gruppen` neuer Tab:

- `Council`

Pro Council sichtbar:

- Name
- Farbe
- Icon
- Anzahl Mitglieder
- Strategie

#### 2. Council Creation Flow

Neuer Erstellungsdialog:

- Council-Name
- Beschreibung / Objective
- Mitglieder aus bestehenden Agents waehlen
- Rollen zuweisen
- Chair bestimmen
- Strategie waehlen
- Review anonymisiert ja/nein

#### 3. Council Detail View

Wenn ein Council selektiert ist:

- Header mit Strategie, Chair, Mitgliedern
- Run-Historie
- Start-Action
- Settings

#### 4. Council Run View

Statt normalem Chat zunaechst:

- Eingabefeld fuer Prompt
- Start-Button
- Stage-Timeline
- Panels fuer:
  - Opinions
  - Reviews
  - Rankings
  - Finale Antwort

### Empfohlene Darstellung der Resultate

#### Tab-Struktur

- `Overview`
- `Opinions`
- `Reviews`
- `Ranking`
- `Final`
- `History`

#### Overview

Zeigt:

- aktuellen Run-Status
- Council-Mitglieder
- Gewinnerantwort
- Chair-Fazit

#### Opinions

Grid oder Kartenansicht:

- Mitglied
- Antwort
- Modell
- Laufzeit
- Confidence

#### Reviews

Pro Opinion:

- Reviewer
- Score
- Stärken
- Schwächen

#### Ranking

Sortierte Liste:

- Rang
- Mitglied
- gewichteter Score
- Review-Anzahl
- wichtigste Kritikpunkte

#### Final

- Endantwort
- Verwendete Top-K-Quellen
- optionale Begruendung des Chairs

---

## UX-Details fuer den Chat-Kontext

### Council nicht als normaler Multi-Agent-Chat

Die Eingabe bleibt zwar chatartig, aber die Ausgabe wird
**stage-basiert** praesentiert.

### Optionaler Hybridmodus spaeter

Spaeter kann ein Council zwei Modi unterstuetzen:

- `Council Run`
- `Open Discussion`

Fuer MVP sollte nur der strukturierte `Council Run` vorhanden sein.

### Chat-Historie

Empfehlung:

- pro Council kann es eine Verlaufsliste von Runs geben
- ein Run ist nicht identisch mit einer normalen `ChatConversation`

Falls bestehende Chat-Infrastruktur wiederverwendet werden soll:

- Run kann optional mit `conversationId` verknuepft sein
- aber seine eigentlichen Artefakte leben getrennt

---

## 3D-Raum und Council-Szene

### Produktziel

Die Council-Visualisierung soll den Eindruck erzeugen, dass die ausgewaehlten
Orbs in einem deliberativen Raum auf virtuellen Stuehlen sitzen und der Nutzer
als Beobachter vor dem Rat sitzt.

### Warum das gut passt

Der aktuelle Spatial-Raum besitzt bereits:

- selektierbare Agent-Orbs
- Fokusmodi
- Kamera-Interpolation
- graphbasierte Positionierung

### Council braucht jedoch einen eigenen Layout-Modus

Der heutige Spatial Graph ist ideal fuer Hierarchie.
Ein Council braucht hingegen:

- Halbkreis oder Kreis
- feste Sitzplaetze
- klare Sprecherfokusse
- eventuell einen hervorgehobenen Chair

### Empfohlene neue Konzepte

#### Neuer Spatial-Modus

- `council`

Erweiterung von:

```typescript
type AgentsSpatialMode = 'idle' | 'chat' | 'settings' | 'tasks' | 'council';
```

#### Neue Node-Typen

Optional:

- `council-seat`
- `council-artifact`

MVP-Empfehlung:

- keine neuen generischen Node-Typen erzwingen
- stattdessen eigene Council-Scene-Komponente mit bekannten Agent-Orbs

### Empfohlene neue 3D-Komponenten

- `CouncilSpatialScene.tsx`
- `CouncilSeat3D.tsx`
- `CouncilRoomShell.tsx`
- `buildCouncilSpatialLayout.ts`

### Council-Raum-Merkmale

#### Sitzordnung

- Chair in der Mitte oder leicht erhoeht
- Mitglieder im Halbkreis
- optional zwei Reihen bei groesseren Councils

#### Kamera

- POV des Nutzers frontal auf den Rat
- bei aktivem Sprecher leichter Dolly/Fokus
- in Review-Phase evtl. Wechsel auf Bewertungs-/Ranking-Ansicht

#### Animationen

- aktive Sprecher-Orb pulsiert
- Review-Linien zwischen Reviewer und Zielantwort
- Ranking ueber Halo, Hoehe oder schwebende Score-Badges

#### Overlay

HTML-Overlay fuer:

- Phase
- aktueller Sprecher
- Rangliste
- Final Output

### Wichtige UX-Regel

3D dient der Immersion, aber die inhaltliche Lesbarkeit bleibt im Overlay
oder in der 2D-Results-Ansicht.

---

## Persistenz, Telemetrie und Analytics

### Warum Analytics hier wichtig sind

Council Runs sind teurer und komplexer als Einzelagent-Antworten.

Deshalb sollten mindestens erfasst werden:

- Anzahl Mitglieder
- Modell pro Mitglied
- Latenz pro Stage
- Tokens pro Stage
- Kosten pro Stage
- Gewinner-Mitglied
- Anzahl Reviews

### Integration mit existierenden Usage-Events

Die bestehenden `AgentUsageEvent`-Konzepte sollten erweitert werden um:

- `sourceType: 'council-run'`
- `runId`
- `stage`
- `councilId`

### Zusaetzliche Kennzahlen

- durchschnittlicher Stage-Durchlauf
- haeufige Gewinner-Modelle
- Cost per useful final answer
- Review-Agreement-Rate

### Artefakte persistieren

MVP:

- Textantworten
- Scores
- einfache Metadaten

Spaeter:

- strukturierte JSON-Scorecards
- diffbare Revisionen
- Explainability-Reports

---

## Sicherheit, Kosten und Performance

### Risiken

Ein Council multipliziert die Kosten eines Prompts schnell.

Beispiel:

- 4 Mitglieder
- 4 Reviews
- 1 Chair

ergibt leicht 9 oder mehr Einzelaufrufe pro User Prompt.

### Notwendige Limits

- maximale Mitgliederzahl pro Council
- maximale Reviews pro Opinion
- Token-Budget pro Stage
- Top-K-Begrenzung fuer Synthesis
- harter Abbruch bei Budgetueberschreitung

### Performance-Regeln fuer MVP

- Opinions parallel
- Reviews limitiert-parallel
- Chair erst nach kompletter Aggregation

### Sicherheitsaspekte

- Review-Anonymisierung darf keine Agent-Namen leaken
- Council-Kontext darf keine sensiblen Artefakte unnoetig vervielfaeltigen
- bei Tool-faehigen Agents klar definieren, ob Council-Mitglieder Tools nutzen duerfen

### Empfehlung fuer MVP

Council-Mitglieder in der ersten Version **ohne Tool-Loops** oder mit stark
begrenzt zugelassenen Tools ausfuehren.

Grund:

- Kostenkontrolle
- weniger unvorhersehbare Seiteneffekte
- sauberere Vergleichbarkeit der Antworten

---

## Phasenplan fuer die Implementierung

## Phase 0 - Architekturentscheidung und Scope Fixierung

### Ziel

Council als erstklassigen Typ und als serverseitige Orchestrierung festlegen.

### Aufgaben

- Begriffe finalisieren:
  - `group` vs. `council`
  - `council run`
  - `artifact`
  - `chair`
- MVP-Strategie festlegen:
  - `first-opinions-review-synthesis`
- Council-Run nicht im Client, sondern serverseitig verankern
- UI-Scope fuer MVP festlegen

### Ergebnis

- freigegebene Zielarchitektur
- dokumentiertes Datenmodell
- geklaerte Council-Strategie fuer V1

---

## Phase 1 - Datenmodell und Store-Grundlage

### Ziel

Council als neue Entitaet im Datenmodell verankern.

### Aufgaben

- `type: 'council'` einfuehren
- CouncilDefinition und CouncilMember modellieren
- CouncilRun und CouncilArtifact Tabellen oder persistente Stores anlegen
- bestehende Store-Selektoren und UI-Listen auf neuen Typ vorbereiten

### Ergebnis

- Council-Objekte koennen erstellt, gespeichert und geladen werden

---

## Phase 2 - Council CRUD und Settings UI

### Ziel

Council in der UI erstellen und konfigurieren koennen.

### Aufgaben

- neuer Sidebar-Tab `Council`
- Create/Edit-Modal fuer Councils
- Mitgliederauswahl aus vorhandenen Agents
- Rollenvergabe
- Strategieauswahl
- Chair-Definition

### Ergebnis

- Nutzer kann Councils zusammenstellen

---

## Phase 3 - Serverseitiger Council-Orchestrator

### Ziel

Council Runs serverseitig ausfuehren.

### Aufgaben

- `council/orchestrator.ts` bauen
- Opinion-Stage implementieren
- Review-Stage implementieren
- Ranking-Stage implementieren
- Synthesis-Stage implementieren
- Fehlerbehandlung und Persistenz einbauen

### Ergebnis

- ein Council Run liefert nachvollziehbare Artefakte und eine Endantwort

---

## Phase 4 - Run APIs und Run View

### Ziel

Council Runs aus der UI starten und beobachten.

### Aufgaben

- `POST /api/council/[id]/run`
- `GET /api/council/runs/[runId]`
- `GET /api/council/runs/[runId]/artifacts`
- Run-Timeline in UI
- Stage-Panels fuer Opinions, Reviews, Ranking, Final

### Ergebnis

- interaktiver Council-Flow in der UI nutzbar

---

## Phase 5 - Analytics, Verlauf und Wiederholbarkeit

### Ziel

Runs muessen vergleichbar und historisch nutzbar sein.

### Aufgaben

- Run-Historie
- Usage-Events fuer Council Runs
- Resultatvergleich
- Re-run mit identischer Konfiguration
- Budget- und Performance-Anzeige

### Ergebnis

- Council wird von Demo-Feature zu produktiv auswertbarem System

---

## Phase 6 - Council Room im 3D-Raum

### Ziel

Immersive Darstellung des Council-Prozesses.

### Aufgaben

- neuer Spatial-Modus `council`
- CouncilSeat-Layout
- Chair-Fokus
- Sprecheranimationen
- Stage-Overlay
- Ranking-/Review-Indikatoren

### Ergebnis

- ausgewaehlte Orbs sitzen sichtbar als Rat im 3D-Raum

---

## Phase 7 - Erweiterte Strategien

### Ziel

Council fuer unterschiedliche Aufgabenklassen ausbauen.

### Aufgaben

- Debate-Pipeline
- Judge-Panel-Pipeline
- Revise-after-Review
- abstimmbare Voting-Modelle
- council-spezifische Templates und Presets

### Ergebnis

- flexibel einsetzbares Multi-Agent-Entscheidungssystem

---

## Konkrete Repo-Auswirkungen

### Bestehende Bereiche mit Anpassungsbedarf

- `src/modules/agents/types.ts`
- `src/modules/agents/store.ts`
- `src/modules/agents/components/AgentHierarchySidebar.tsx`
- `src/modules/agents/components/AgentsPage.tsx`
- `src/modules/agents/components/spatial/AgentsSpatialScene.tsx`
- `src/modules/agents/components/spatial/AgentOrb3D.tsx`
- `src/modules/agents/components/spatial/SpatialCameraController.tsx`
- `src/modules/agents/spatial-types.ts`
- `src/modules/agents/agent-meta.ts`
- `src/app/api/agent/route.ts`
- `src/app/api/agent/stream/route.ts`

### Neue wahrscheinliche Bereiche

- `src/lib/agent/council/types.ts`
- `src/lib/agent/council/orchestrator.ts`
- `src/lib/agent/council/prompt-builders.ts`
- `src/lib/agent/council/scoring.ts`
- `src/lib/agent/council/repository.ts`
- `src/app/api/council/route.ts`
- `src/app/api/council/[councilId]/route.ts`
- `src/app/api/council/[councilId]/run/route.ts`
- `src/app/api/council/runs/[runId]/route.ts`
- `src/modules/agents/components/CouncilSettingsPage.tsx`
- `src/modules/agents/components/CouncilRunView.tsx`
- `src/modules/agents/components/CouncilResultsTabs.tsx`
- `src/modules/agents/components/spatial/CouncilSpatialScene.tsx`
- `src/modules/agents/components/spatial/buildCouncilSpatialLayout.ts`

### Optional spaeter

- DB-Migrationen fuer Council-Tabellen
- queue-/workerseitige Council-Runner
- Council-Preset-Katalog

---

## Migration und Rueckwaertskompatibilitaet

### Bestehende Gruppen nicht brechen

Gruppen bleiben Gruppen.

Es soll **keine automatische Migration** von Gruppen zu Councils geben.

### Grund

Gruppen und Councils haben unterschiedliche Semantik:

- Gruppe = offener kollaborativer Raum
- Council = strukturierter deliberativer Workflow

### Kompatibilitaetsstrategie

- bestehende Gruppen-UI unveraendert lassen
- Council erst als separater Pfad einfuehren
- spaeter optional `Gruppe in Council duplizieren`

### Migration vorhandener Konfigurationen

Wenn gewuenscht, spaeter Helferfunktion:

- Mitglieder aus Gruppe uebernehmen
- Rollen in CouncilMember umwandeln
- Strategy Defaults setzen

---

## Definition of Done pro Phase

### Phase 1 ist fertig, wenn

- Council als neuer Typ persistiert werden kann
- Mitglieder und Strategie gespeichert werden

### Phase 2 ist fertig, wenn

- ein Nutzer einen Council vollstaendig in der UI erstellen kann

### Phase 3 ist fertig, wenn

- ein serverseitiger Council Run alle MVP-Stages erfolgreich durchlaeuft

### Phase 4 ist fertig, wenn

- ein Run in der UI gestartet, verfolgt und gelesen werden kann

### Phase 5 ist fertig, wenn

- Council Runs historisch auswertbar sind und Kosten/Latenz sichtbar werden

### Phase 6 ist fertig, wenn

- der Council im 3D-Raum als Sitzszene mit Sprecherfokus visualisiert wird

### Phase 7 ist fertig, wenn

- mindestens eine zweite Deliberation-Strategie produktiv nutzbar ist

---

## Offene Entscheidungen

1. Soll `council` zunaechst nur ein Untertyp von `customAgents` sein oder direkt
   eine getrennte Persistenzschicht erhalten?
2. Sollen Council-Mitglieder im MVP Tools nutzen duerfen oder nur reine Textantworten liefern?
3. Soll Review standardmaessig anonymisiert sein?
4. Soll der `chair` immer ein existierender Agent sein oder darf ein eigenes
   Synthese-Modell ohne sichtbaren Agent existieren?
5. Wie viele Mitglieder sind fuer den MVP erlaubt?
6. Soll ein Council Run an eine `ChatConversation` gekoppelt sein oder vollstaendig
   separat leben?
7. Soll die 3D-Szene schon in Phase 1 des Features entstehen oder bewusst spaeter?

---

## Empfohlene Reihenfolge

### Unmittelbar sinnvoll

1. Council als eigenen Typ definieren
2. Datenmodell fuer CouncilDefinition, Member, Run und Artifact entwerfen
3. serverseitigen Council-Orchestrator fuer MVP-Strategie bauen
4. Run-View mit Stage-Ergebnissen bauen
5. erst danach den Council Room im 3D-Raum umsetzen

### Nicht zuerst bauen

- freie Council-Debatten mit komplexem Turn-Routing
- zu fruehe Worker-/Queue-Verteilung
- zu komplexe 3D-Ranking-Artefakte
- Council mit voller Tool-Autonomie ohne Budgetgrenzen

### Produktfokus fuer MVP

**Zuerst Council als nachvollziehbare Qualitaets-Engine bauen, nicht als Showpiece.**

Das bedeutet:

- strukturierte Stages
- klare Artefakte
- gute Lesbarkeit
- begrenzte Kosten
- serverseitige Robustheit

Danach:

- immersive Council Room UX
- erweiterte Deliberationsstrategien
- tiefere Integration in Scheduling und Automationen

---

## Abschluss

Dieser Plan beschreibt die vollstaendige Zielrichtung fuer ein
`LLM Council` im LifeOS Agent-Modul:

- Council wird ein eigener semantischer Typ neben Agent und Gruppe
- die Orchestrierung wandert fuer dieses Feature auf den Server
- Runs erzeugen persistente, auswertbare Stage-Artefakte
- bestehende Agents und Modellkonfigurationen bleiben wiederverwendbar
- die 3D-Darstellung wird als Council Room auf das neue System aufgesetzt

Die wichtigste Architekturentscheidung lautet:

**Council ist kein normaler Gruppenchat, sondern ein deliberativer Workflow mit eigener Laufzeitlogik.**

Wenn diese Entscheidung beibehalten wird, laesst sich dein Ansatz sauber,
skalierbar und spaeter auch fuer Tasks, Audits und Entscheidungsprozesse nutzen.
