# Agents Visual Tool Gap Plan

> **Ziel:** Alle relevanten `Agents`-Tools so aufraeumen, ergaenzen und visuell ausbauen,
> dass der strict visual mode fuer die wichtigen Benutzeraktionen im `Agents`-Modul
> vollstaendig und verlaesslich funktioniert.

> **Erstellt:** 2026-04-07  
> **Status:** Entwurf

---

## Inhaltsverzeichnis

1. [Zielbild](#1-zielbild)
2. [Ist-Zustand](#2-ist-zustand)
3. [Grundsaetze fuer den Tool-Schnitt](#3-grundsaetze-fuer-den-tool-schnitt)
4. [Bereich A: Agent-Entity-Management](#4-bereich-a-agent-entity-management)
5. [Bereich B: Gruppen-Management](#5-bereich-b-gruppen-management)
6. [Bereich C: Council Runtime](#6-bereich-c-council-runtime)
7. [Bereich D: Group Orchestration und Objectives](#7-bereich-d-group-orchestration-und-objectives)
8. [Bereich E: Scheduled Tasks](#8-bereich-e-scheduled-tasks)
9. [Bereich F: Agent-Settings und Capabilities](#9-bereich-f-agent-settings-und-capabilities)
10. [Bereich G: Analytics und Memory](#10-bereich-g-analytics-und-memory)
11. [Fehlende Tools fuer sichtbare UI-Funktionen](#11-fehlende-tools-fuer-sichtbare-ui-funktionen)
12. [UI-Funktionen ohne eigenes Tool](#12-ui-funktionen-ohne-eigenes-tool)
13. [Benötigte UI-Anker](#13-benoetigte-ui-anker)
14. [Umsetzungsphasen](#14-umsetzungsphasen)
15. [Dateiliste](#15-dateiliste)
16. [Abnahmekriterien](#16-abnahmekriterien)

---

## 1. Zielbild

Der `Agents`-Bereich soll im strict visual mode dieselbe Verlaesslichkeit haben wie manuelle Bedienung:

- Jeder priorisierte Benutzer-Flow bekommt einen vollstaendigen visuellen UI-Pfad.
- Kein Tool darf im Visual Mode mehr als "erfolgreich" erscheinen, wenn die sichtbare UI-Aktion nicht wirklich abgeschlossen wurde.
- Alias-Tools mit gleicher Benutzerintention muessen denselben visuellen Pfad teilen.
- Store-/Domain-Operationen ohne sinnvollen sichtbaren Ablauf bleiben intern oder bekommen keinen strict-visual Anspruch.

---

## 2. Ist-Zustand

### 2.1 Bereits visuell vorhandene Agents-Rezepte

Aktuell werden im `Agents`-Bereich nur sehr wenige Action-Typen ueberhaupt visuell behandelt:

- `agents.createAgent`
- `agents.createGroup`
- `agents.conversation.create`
- `agents.folder.create`
- `agents.message.add`
- `agents.task.`* nur als Teilpfad
- `agents.runCouncil` nur als Teilpfad

### 2.2 Bereits bekannte harte Luecken

- `agents.createGroup` endet bewusst in `fallback_required`
- `agents.runCouncil` endet bewusst in `fallback_required`
- fast alle `agents.council.*` Detail-Tools haben kein visuelles Rezept
- `agents.agent.updateCustom`, `agents.agent.deleteCustom`, `agents.group.update`, `agents.settings.*` haben kein visuelles Rezept
- mehrere sichtbare UI-Funktionen haben noch gar kein dediziertes Tool

### 2.3 Architekturproblem

Der Server-Toolloop liefert dem LLM bereits erfolgreiche Tool-Ergebnisse, bevor die nachgelagerte Frontend-Action im strict visual mode abgeschlossen ist. Dadurch kann das Modell textlich Erfolg behaupten, obwohl der UI-Flow spaeter scheitert.

---

## 3. Grundsaetze fuer den Tool-Schnitt

### 3.1 Was ein echtes Tool sein soll

Ein `Agents`-Tool ist sinnvoll, wenn es:

- eine echte Benutzerintention repraesentiert
- als explizite Agentenfaehigkeit sichtbar sein soll
- einen stabilen UI- oder Domain-Flow besitzt
- sinnvoll durch Prompting aufrufbar ist

### 3.2 Was kein eigenes Tool sein sollte

Nicht jeder klickbare Button braucht ein Tool. Kein eigenes Tool sollten insbesondere bekommen:

- Modal schliessen
- lokale Filter umschalten
- rein visuelle Tabs ohne eigenstaendige Agentenintention
- Icon-/Farb-Swatches
- Dateiauswahl-Buttons ohne klaren agentischen Nutzen
- lokale Ansichtstoggles wie minimieren, Menues oeffnen, reine Hover-/Dropdown-Steuerung

### 3.3 Tool-Strategie

- Alias-Tools mit identischer Absicht werden auf einen gemeinsamen visuellen Flow gemappt.
- Domain-interne Tools ohne robuste UI werden nicht erzwungen visualisiert.
- Erst P0-Flows vollenden, dann P1/P2.

---

## 4. Bereich A: Agent-Entity-Management

### P0: Bestehende Tools ausbauen


| Tool                              | Status heute                             | Bedarf   | Massnahme                                                 |
| --------------------------------- | ---------------------------------------- | -------- | --------------------------------------------------------- |
| `agents.createAgent`              | visueller Flow vorhanden                 | ausbauen | Post-Conditions, Fehlertexte und Erfolgskontrolle haerten |
| `agents.agent.createCustom`       | Tool vorhanden, kein eigener Visual-Pfad | ausbauen | auf denselben Visual-Flow wie `agents.createAgent` mappen |
| `agents.agent.createOrchestrated` | Tool vorhanden, kein eigener Visual-Pfad | ausbauen | Alias auf Create-Flow plus Settings-Poststep              |
| `agents.updateAgent`              | Tool vorhanden, kein Visual-Pfad         | ausbauen | vollstaendigen Edit-Flow ueber Settings bauen             |
| `agents.agent.updateCustom`       | Tool vorhanden, kein Visual-Pfad         | ausbauen | Alias auf denselben Update-Flow mappen                    |
| `agents.deleteAgent`              | Tool vorhanden, kein Visual-Pfad         | ausbauen | Delete-Flow mit Confirm und Post-Check bauen              |
| `agents.agent.deleteCustom`       | Tool vorhanden, kein Visual-Pfad         | ausbauen | Alias auf denselben Delete-Flow mappen                    |
| `agents.agent.select`             | Tool vorhanden, kein Visual-Pfad         | ausbauen | Agent visuell selektieren statt nur Store-Set             |


### Offene UI-Anker in diesem Bereich

- Button/Anchor fuer konkretes Oeffnen eines Custom-Agent-Settings-Dialogs
- Inputs fuer Name, Beschreibung, Ziel, Icon, Farbe in editierbarer Form
- Save-Button fuer Agent-Settings
- Delete-Button und Delete-Confirm
- stabiler Anchor fuer Agent-Selektion in Liste/Tree

---

## 5. Bereich B: Gruppen-Management

### P0: Bestehende Tools ausbauen


| Tool                                     | Status heute                             | Bedarf   | Massnahme                                               |
| ---------------------------------------- | ---------------------------------------- | -------- | ------------------------------------------------------- |
| `agents.createGroup`                     | visueller Teilpfad, endet in Fallback    | ausbauen | Modal vollstaendig ausfuellen und erfolgreich submitten |
| `agents.group.create`                    | Tool vorhanden, kein eigener Visual-Pfad | ausbauen | Alias auf denselben Group-Create-Flow                   |
| `agents.group.update`                    | Tool vorhanden, kein Visual-Pfad         | ausbauen | Group-Settings visuell bearbeiten und speichern         |
| `agents.conversation.updateParticipants` | Tool vorhanden, kein Visual-Pfad         | ausbauen | Teilnehmerverwaltung ueber visuelles Modal              |


### P1: bereits vorhanden, aber zu haerten


| Tool                         | Status heute          | Bedarf   | Massnahme                                        |
| ---------------------------- | --------------------- | -------- | ------------------------------------------------ |
| `agents.conversation.create` | Visual-Pfad vorhanden | ausbauen | Erfolg ueber sichtbare neue Konversation pruefen |
| `agents.folder.create`       | Visual-Pfad vorhanden | ausbauen | Modal/Submit/Post-Check haerten                  |


### P2: Gruppen-Datei- und Ordnerfunktionen


| Tool                                  | Status heute                       | Bedarf   | Massnahme                                               |
| ------------------------------------- | ---------------------------------- | -------- | ------------------------------------------------------- |
| `agents.groupFileFolder.create`       | Tool vorhanden, kein Visual-Pfad   | ausbauen | Group-Library-Dialog visuell anbinden                   |
| `agents.groupFile.add`                | Tool vorhanden, kein Visual-Pfad   | ausbauen | Upload-/Artefakt-Anlage als agentischer Flow definieren |
| `agents.groupFile.move`               | Tool vorhanden, kein Visual-Pfad   | ausbauen | nur falls stabiler sichtbarer Move-Flow existiert       |
| `agents.groupFile.delete`             | Tool vorhanden, kein Visual-Pfad   | ausbauen | Delete-Confirm und Post-Check                           |
| `agents.groupMainConversation.ensure` | Tool vorhanden, interner Charakter | prüfen   | wahrscheinlich intern belassen                          |
| `agents.groupParticipantChats.ensure` | Tool vorhanden, interner Charakter | prüfen   | wahrscheinlich intern belassen                          |


### Offene UI-Anker in diesem Bereich

- Inputs fuer Gruppenbeschreibung und Admin-Auswahl
- stabile Teilnehmer-Row-Anker
- Save-Button fuer Gruppen-Settings
- Delete-/Move-Anker in Group-Library

---

## 6. Bereich C: Council Runtime

### P0: Komplett auszubauen


| Tool                               | Status heute                                       | Bedarf   | Massnahme                                                             |
| ---------------------------------- | -------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `agents.runCouncil`                | visueller Start nur vorbereitet, endet in Fallback | ausbauen | vollen Council-Start inklusive Prompt-Eingabe und Lauf-Start umsetzen |
| `agents.council.draft.create`      | Tool vorhanden, kein Visual-Pfad                   | ausbauen | Council-Draft visuell anlegen                                         |
| `agents.council.open`              | Tool vorhanden, kein Visual-Pfad                   | ausbauen | existierenden Council visuell oeffnen                                 |
| `agents.council.run`               | Tool vorhanden, kein Visual-Pfad                   | ausbauen | eigentlichen Run im Council-UI triggern                               |
| `agents.council.seat.upsert`       | Tool vorhanden, kein Visual-Pfad                   | ausbauen | Seat modal / seat assignment visuell anbinden                         |
| `agents.council.seat.remove`       | Tool vorhanden, kein Visual-Pfad                   | ausbauen | visuelles Entfernen mit Confirm                                       |
| `agents.council.mainMessage.add`   | Tool vorhanden, kein Visual-Pfad                   | ausbauen | Council-Hauptchat visuell beschicken                                  |
| `agents.council.memberMessage.add` | Tool vorhanden, kein Visual-Pfad                   | ausbauen | Member-Threads visuell beschicken                                     |


### P1: Sekundaere Council-Operationen


| Tool                                  | Status heute                     | Bedarf   | Massnahme                                               |
| ------------------------------------- | -------------------------------- | -------- | ------------------------------------------------------- |
| `agents.council.sync`                 | Tool vorhanden, eher intern      | prüfen   | eher intern oder nur indirekt nutzen                    |
| `agents.council.persist`              | Tool vorhanden, eher intern      | prüfen   | eher ueber expliziten Save-UI-Flow statt frei promptbar |
| `agents.council.delete`               | Tool vorhanden, kein Visual-Pfad | ausbauen | Delete-Flow und Post-Check                              |
| `agents.council.mainMessage.update`   | Tool vorhanden, kein Visual-Pfad | ausbauen | nur wenn Edit-UI stabil vorhanden ist                   |
| `agents.council.mainMessage.clear`    | Tool vorhanden, kein Visual-Pfad | ausbauen | nur falls eigener klarer UI-Usecase                     |
| `agents.council.memberMessage.update` | Tool vorhanden, kein Visual-Pfad | ausbauen | nur falls Edit-UI stabil vorhanden ist                  |
| `agents.council.memberMessage.clear`  | Tool vorhanden, kein Visual-Pfad | ausbauen | nur falls klarer Benutzerflow                           |
| `agents.council.abortAndReset`        | Tool vorhanden, kein Visual-Pfad | ausbauen | Abort/Reset nur mit sichtbarem Control                  |


### Offene UI-Anker in diesem Bereich

- Council-Listenitems
- Council-Prompt-Input
- Run/Save/Delete/Abort-Buttons
- Seat-Modal und bestehende Agent-Auswahl
- Main-Chat-Input und Member-Chat-Inputs mit eindeutigen Anchors

---

## 7. Bereich D: Group Orchestration und Objectives

### P1: Echte Benutzerintentionen mit Tool beibehalten und visuell ausbauen


| Tool                                   | Status heute                     | Bedarf   | Massnahme                                           |
| -------------------------------------- | -------------------------------- | -------- | --------------------------------------------------- |
| `agents.objective.add`                 | Tool vorhanden, kein Visual-Pfad | ausbauen | visuelles Ziel-Panel anbinden                       |
| `agents.objective.update`              | Tool vorhanden, kein Visual-Pfad | ausbauen | Bearbeitungs-Flow für Objectives                    |
| `agents.objective.delete`              | Tool vorhanden, kein Visual-Pfad | ausbauen | Delete-Flow                                         |
| `agents.orchestration.mode.change`     | Tool vorhanden, kein Visual-Pfad | ausbauen | sichtbaren Mode-Switch agentisch ansteuerbar machen |
| `agents.orchestration.task.delegate`   | Tool vorhanden, kein Visual-Pfad | ausbauen | Delegations-UI anbinden                             |
| `agents.orchestration.breakout.create` | Tool vorhanden, kein Visual-Pfad | ausbauen | Breakout-Dialog visuell abbilden                    |


### P2: eher daten-/artefaktlastige Tools


| Tool                                   | Status heute                       | Bedarf   | Massnahme                                                |
| -------------------------------------- | ---------------------------------- | -------- | -------------------------------------------------------- |
| `agents.orchestration.artifact.save`   | Tool vorhanden, kein Visual-Pfad   | prüfen   | nur visualisieren wenn Artefakt-UI stabil und promptbar  |
| `agents.orchestration.artifact.update` | Tool vorhanden, kein Visual-Pfad   | prüfen   | evtl. intern belassen                                    |
| `agents.orchestration.folder.create`   | Tool vorhanden, kein Visual-Pfad   | ausbauen | falls Group-Library-Ordner agentisch erzeugbar sein soll |
| `agents.breakout.create`               | Tool vorhanden, kein Visual-Pfad   | ausbauen | Alias zu Breakout-Create                                 |
| `agents.breakout.upsert`               | Tool vorhanden, interner Charakter | prüfen   | vermutlich intern oder Alias nur für spezielle Flows     |


---

## 8. Bereich E: Scheduled Tasks

### P1: auszubauen


| Tool                        | Status heute                          | Bedarf   | Massnahme                                         |
| --------------------------- | ------------------------------------- | -------- | ------------------------------------------------- |
| `agents.task.create`        | visueller Teilpfad, endet in Fallback | ausbauen | Task-Editor komplett visuell befuellen            |
| `agents.task.update`        | Tool vorhanden, kein Visual-Pfad      | ausbauen | Task selektieren, Editor oeffnen, Werte speichern |
| `agents.task.toggleEnabled` | Tool vorhanden, kein Visual-Pfad      | ausbauen | klarer Toggle-Anchor pro Task                     |
| `agents.task.runNow`        | Tool vorhanden, kein Visual-Pfad      | ausbauen | Run-Now-Button plus Post-Feedback                 |
| `agents.task.duplicate`     | Tool vorhanden, kein Visual-Pfad      | ausbauen | Duplikat-Flow plus Nachweis                       |
| `agents.task.delete`        | Tool vorhanden, kein Visual-Pfad      | ausbauen | Delete-Flow mit Confirm                           |


### Offene UI-Anker in diesem Bereich

- Task-List-Item-Selektoren
- per-Task Controls fuer enable, run now, duplicate, delete
- Inputs im Task-Editor
- Save-Button im Task-Editor

---

## 9. Bereich F: Agent-Settings und Capabilities

### P1: auszubauen


| Tool                                     | Status heute                         | Bedarf   | Massnahme                                              |
| ---------------------------------------- | ------------------------------------ | -------- | ------------------------------------------------------ |
| `agents.settings.model.set`              | Tool vorhanden, kein Visual-Pfad     | ausbauen | Model-Tab visuell bedienen                             |
| `agents.settings.prompt.set`             | Tool vorhanden, kein Visual-Pfad     | ausbauen | Prompt-Feld visuell setzen und speichern               |
| `agents.settings.tools.enableDisable`    | Tool vorhanden, kein Visual-Pfad     | ausbauen | Tool-Toggles visuell ansteuern                         |
| `agents.settings.skills.enableDisable`   | Tool vorhanden, kein Visual-Pfad     | ausbauen | Skill-Toggles visuell ansteuern                        |
| `agents.settings.integrations.allowDeny` | Tool vorhanden, kein Visual-Pfad     | ausbauen | Integrationsfreigaben visuell setzen                   |
| `agents.settings.humanInLoop.set`        | Tool vorhanden, kein Visual-Pfad     | ausbauen | Freigabe-Tools visuell konfigurieren                   |
| `agents.settings.multimodal.set`         | Tool vorhanden, kein Visual-Pfad     | ausbauen | Multimodal-Slots visuell konfigurieren                 |
| `agents.integration.status.refresh`      | Tool vorhanden, eher datenorientiert | prüfen   | vermutlich kein eigener strict-visual Tool-Flow noetig |


### Offene UI-Anker in diesem Bereich

- Agent-Settings Tabs
- Save-Buttons je Tab
- Model-Selector Controls
- Prompt-Textarea
- Tool-/Skill-/Integration-Toggles
- Human-in-the-loop Controls
- Multimodal Controls

---

## 10. Bereich G: Analytics und Memory

### P2: stark pruefen, ob ueberhaupt agentische Tools bleiben sollen


| Tool                                       | Status heute                     | Bedarf | Massnahme                                   |
| ------------------------------------------ | -------------------------------- | ------ | ------------------------------------------- |
| `agents.analytics.usage.get`               | Tool vorhanden, kein Visual-Pfad | prüfen | evtl. read-only ohne strict visual Anspruch |
| `agents.analytics.conversationSummary.get` | Tool vorhanden, kein Visual-Pfad | prüfen | evtl. read-only ohne strict visual Anspruch |
| `agents.memory.save`                       | Tool vorhanden, kein Visual-Pfad | prüfen | eher Domain-/Store-Tool statt UI-Tool       |
| `agents.memory.recall`                     | Tool vorhanden, kein Visual-Pfad | prüfen | eher Datenoperation                         |
| `agents.memory.list`                       | Tool vorhanden, kein Visual-Pfad | prüfen | eher Datenoperation                         |


### Empfehlung

Diese Tools sollten nur dann strict-visual werden, wenn es einen echten, stabilen Endnutzer-Workflow im sichtbaren Memory-/Analytics-UI gibt. Sonst besser als nicht-visuelle Domain-Tools behandeln.

---

## 11. Fehlende Tools fuer sichtbare UI-Funktionen

Diese sichtbaren Funktionen existieren in der UI, haben aber aktuell kein sauberes eigenes Tool oder keinen klaren agentischen Schnitt:


| UI-Funktion                                                   | Tool-Status                  | Empfehlung                                                                                            |
| ------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| zwischen Chat / Tasks / Settings wechseln                     | kein dediziertes Tool        | `agents.view.chat`, `agents.view.tasks`, `agents.view.settings` nur falls agentisch wirklich sinnvoll |
| Council-Hub oeffnen                                           | kein klares dediziertes Tool | `agents.council.view` erwaegen                                                                        |
| Group Library an Dashboard pinnen                             | kein klares Tool             | nur wenn Pinning agentisch steuerbar sein soll                                                        |
| Agent-/Group-Library Download/Upload Controls                 | kein dediziertes Tool        | nur wenn Dateifluss wirklich promptbar sein soll                                                      |
| Web Research / Deep Research / Agent Mode Toggles in Chatbars | kein Tool                    | eher lokale UI, normalerweise kein Tool                                                               |


---

## 12. UI-Funktionen ohne eigenes Tool

Diese Funktionen sollen bewusst **kein** eigenes Tool bekommen:

- Modal schliessen
- Kontextmenues auf/zu
- Farbwahl-Swatches
- Icon-Swatches
- lokale Filter in Analytics/Behavior-Tabs
- Minimieren/Expandieren rein visueller Panels
- Dateiauswahl-Buttons ohne konkreten agentischen Dateiflow

---

## 13. Benoetigte UI-Anker

Die aktuelle `data-agent-`*-Abdeckung reicht nur fuer wenige Flows. Fuer die Ausbauphase werden insbesondere gebraucht:

### Agenten

- `agents-select-<agentId>` oder aehnliche stabile Selektoren
- `agents-open-settings-<agentId>`
- `agents-agent-save`
- `agents-agent-delete`
- `agents-agent-delete-confirm`
- editierbare Inputs fuer Name, Beschreibung, Objective, Icon, Color

### Gruppen

- `agents-group-save`
- `agents-group-admin-select`
- `agents-group-participant-add`
- `agents-group-participant-remove-<index>`

### Council

- `agents-council-open-<id>`
- `agents-council-prompt-input`
- `agents-council-run`
- `agents-council-save`
- `agents-council-delete`
- `agents-council-abort`
- `agents-council-seat-open-<seatId>`
- `agents-council-seat-save`
- `agents-council-seat-remove`
- `agents-council-main-input`
- `agents-council-main-send`
- `agents-council-member-input-<seatId>`
- `agents-council-member-send-<seatId>`

### Tasks

- `agents-task-open-<taskId>`
- `agents-task-save`
- `agents-task-toggle-<taskId>`
- `agents-task-run-now-<taskId>`
- `agents-task-duplicate-<taskId>`
- `agents-task-delete-<taskId>`

### Settings

- `agents-settings-tab-model`
- `agents-settings-tab-behavior`
- `agents-settings-tab-integrations`
- `agents-settings-save`
- per-toggle `data-agent-button`/`data-agent-input` Anchors

---

## 14. Umsetzungsphasen

### Phase 1: Agent-Erstellung und Entity-Management

- `agents.createAgent`
- `agents.agent.createCustom`
- `agents.agent.createOrchestrated`
- `agents.agent.select`
- `agents.updateAgent`
- `agents.agent.updateCustom`
- `agents.deleteAgent`
- `agents.agent.deleteCustom`

### Phase 2: Gruppen

- `agents.createGroup`
- `agents.group.create`
- `agents.group.update`
- `agents.conversation.updateParticipants`

### Phase 3: Council

- `agents.runCouncil`
- kompletter `agents.council.*` Kernpfad

### Phase 4: Scheduled Tasks

- kompletter `agents.task.*` Satz

### Phase 5: Settings / Capabilities

- kompletter `agents.settings.*` Satz

### Phase 6: Objectives / Orchestration / Artefakte

- `agents.objective.*`
- `agents.orchestration.*`
- `agents.breakout.*`

### Phase 7: Review der Randbereiche

- Analytics
- Memory
- Group files
- Pin/Download/Upload-Sonderfaelle

---

## 15. Dateiliste

### Sicher betroffen

- `src/lib/agent/computer-use/visual-tool-recipes.ts`
- `src/lib/agent/use-agent-executor.ts`
- `src/lib/agent/tools/agents-tool-specs.ts`
- `src/lib/agent/tools/agents-module-tools.ts`
- `src/lib/agent/tools/runtime-action.ts`

### UI-Dateien mit hoher Anchor-Relevanz

- `src/modules/agents/components/AgentHierarchySidebar.tsx`
- `src/modules/agents/components/AgentSettingsPage.tsx`
- `src/modules/agents/components/GroupSettingsPanel.tsx`
- `src/modules/agents/components/GroupSettingsModal.tsx`
- `src/modules/agents/components/ChatHistorySidebar.tsx`
- `src/modules/agents/components/CouncilChatBar.tsx`
- `src/modules/agents/components/CouncilSeatModalHost.tsx`
- `src/modules/agents/components/ScheduledTasksPage.tsx`
- `src/modules/agents/components/ScheduledTaskEditor.tsx`
- `src/modules/agents/components/AgentModeHeader.tsx`
- `src/modules/agents/components/spatial/FloatingAgentPanel.tsx`

### Optional betroffen

- `src/modules/agents/components/MemoryPanel.tsx`
- `src/modules/agents/components/GroupLibraryFilesSection.tsx`
- `src/modules/agents/components/AgentChatBar.tsx`

---

## 16. Abnahmekriterien

Ein `Agents`-Tool gilt erst dann als "strict visual ready", wenn:

1. es einen echten visuellen UI-Pfad ohne Fast-Fallback gibt
2. der Flow ueber stabile `data-agent-*`-Anker laeuft
3. Erfolg erst gemeldet wird, wenn die UI-Post-Condition sichtbar eingetreten ist
4. Fehlertext und Schritte klar sagen, an welchem visuellen Schritt es scheiterte
5. der Flow sowohl im Sidebar-Modul als auch im Dashboard-Tab funktioniert
6. der Flow nicht nur den Start, sondern den kompletten Abschluss abbildet

### Beispiele fuer Post-Conditions

- Agent ist nach Create sichtbar in der Liste selektierbar
- Gruppe ist nach Create sichtbar und oeffnet den Gruppenkontext
- Council ist nach Create/Run im Council-UI wirklich aktiv
- Task ist nach Save sichtbar in der Task-Liste vorhanden
- Settings sind nach Save sichtbar persistiert

---

## Empfehlung

Die erste Umsetzung sollte **nicht** versuchen, alle `Agents`-Tools auf einmal strict-visual zu machen. Die sinnvollste Reihenfolge ist:

1. Agent-Entity-Management
2. Gruppen
3. Council
4. Tasks
5. Settings

Erst danach sollten Randbereiche wie Memory, Analytics und Group-Library-Dateifunktionen bewertet werden.