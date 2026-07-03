# A-1 Sprint: Kernel v0.1 Implementation (10 Tage)

---

## Epic: KERN-001 - Kernel v0.1 Foundation

**Beschreibung:** Implementierung des LifeOS Kernel v0.1 gemäß KERNEL_SPEC.md

**Akzeptanzkriterium:** Alle 5 Acceptance-Tests grün

**Zeitrahmen:** 10 Arbeitstage

---

## Story: KERN-002 - Core Types & IDs

**Beschreibung:**
Implementiere grundlegende TypeScript-Interfaces und ID-Formate.

**Tasks:**
- [ ] `KernelContext` Interface
- [ ] Tool-ID-Format: `${moduleId}.${toolId}` mit Validator
- [ ] `ModuleManifest` Interface
- [ ] `ToolDefinition` Interface
- [ ] `Event` Interface
- [ ] `Permission` Types

**Files:**
- `src/kernel/types/kernel.ts`
- `src/kernel/types/ids.ts`
- `src/kernel/types/schemas.ts`

**Acceptance:**
- Tool-ID-Parser funktioniert: `"calendar.createEvent"` → `{moduleId: "calendar", toolId: "createEvent"}`
- TypeScript-Types kompilieren
- Keine Linter-Errors

**Estimate:** 1 Tag

---

## Story: KERN-003 - JSON Schema Validation

**Beschreibung:**
Integriere ajv für Input/Output-Validierung.

**Tasks:**
- [ ] ajv installieren (`npm install ajv`)
- [ ] `SchemaValidator` Wrapper
- [ ] Tool Input-Validierung
- [ ] Tool Output-Validierung
- [ ] Fehlermeldungen formatieren

**Files:**
- `src/kernel/tools/validator.ts`

**Acceptance:**
- Invalid Input → `VALIDATION_ERROR` mit Details
- Valid Input → Pass
- Unit-Tests für Validator

**Estimate:** 1 Tag

---

## Story: KERN-004 - Tool Registry

**Beschreibung:**
In-Memory-Registry für Tool-Definitionen.

**Tasks:**
- [ ] `ToolRegistry` Class
- [ ] `register(tool)` - Tool hinzufügen
- [ ] `unregister(toolId)` - Tool entfernen
- [ ] `get(toolId)` - Tool abrufen
- [ ] `list(moduleId?)` - Alle Tools auflisten
- [ ] Duplikat-Check (Tool-ID muss unique sein)

**Files:**
- `src/kernel/tools/registry.ts`

**Acceptance:**
- Register → Get → Success
- Register duplicate → Error
- Unit-Tests für Registry

**Estimate:** 0.5 Tage

---

## Story: KERN-005 - Permission Service

**Beschreibung:**
In-Memory Permission-Grants und Check-Logik.

**Tasks:**
- [ ] `PermissionService` Class
- [ ] `grant(moduleId, permission)` - Permission gewähren
- [ ] `revoke(moduleId, permission)` - Permission entziehen
- [ ] `check(moduleId, permission)` - Prüfen
- [ ] `request(moduleId, permissions, reason)` - User fragen (Mock für v0.1)

**Files:**
- `src/kernel/permissions/service.ts`

**Acceptance:**
- Grant → Check → true
- Revoke → Check → false
- Unit-Tests für Service

**Estimate:** 0.5 Tage

---

## Story: KERN-006 - Tool Executor Pipeline

**Beschreibung:**
Deterministischer Executor mit 7-Schritt-Pipeline.

**Tasks:**
- [ ] `ToolExecutor` Class
- [ ] Step 1: Tool-ID validieren
- [ ] Step 2: Input validieren (gegen inputSchema)
- [ ] Step 3: Permission prüfen
- [ ] Step 4: Tool ausführen (`tool.execute()`)
- [ ] Step 5: Output validieren (gegen outputSchema)
- [ ] Step 6: Events emittieren (falls `result.events`)
- [ ] Step 7: Audit-Log schreiben

**Files:**
- `src/kernel/tools/executor.ts`

**Acceptance:**
- Pipeline-Reihenfolge korrekt (Test)
- Permission-Denial stoppt bei Step 3
- Validation-Error stoppt bei Step 2
- Unit-Tests für Pipeline

**Estimate:** 2 Tage

---

## Story: KERN-007 - Execution Trace

**Beschreibung:**
TraceRecord für jeden Tool-Call.

**Tasks:**
- [ ] `TraceRecord` Interface
- [ ] TraceID-Generator (UUID)
- [ ] TraceRecord-Builder (sammelt Daten während Execution)
- [ ] Duration-Messung (start/end timestamp)

**Files:**
- `src/kernel/audit/log.ts`

**Acceptance:**
- Jeder Tool-Call erzeugt TraceRecord
- TraceRecord enthält Input, Output, Error, Duration
- Unit-Tests

**Estimate:** 0.5 Tage

---

## Story: KERN-008 - Event Bus

**Beschreibung:**
In-Memory Pub/Sub für Module.

**Tasks:**
- [ ] `EventBus` Class
- [ ] `publish(event)` - Event emittieren
- [ ] `subscribe(eventType, handler)` - Handler registrieren
- [ ] Async-Dispatch (Handler blockieren Publisher nicht)
- [ ] Error-Isolation (Handler-Fehler crashen nicht den Bus)
- [ ] Unsubscribe-Funktion
- [ ] Event Source Validation (`sourceModuleId` vs `type` prefix)

**Files:**
- `src/kernel/events/bus.ts`

**Acceptance:**
- Publish → Subscribe → Handler wird aufgerufen
- Handler-Fehler crashen nicht den Bus
- Source-Validation funktioniert
- Unit-Tests

**Estimate:** 1 Tag

---

## Story: KERN-009 - Storage Service

**Beschreibung:**
Module-scoped Storage (in-memory für v0.1).

**Tasks:**
- [ ] `StorageService` Class
- [ ] `get<T>(moduleId, key)` - Lesen
- [ ] `set<T>(moduleId, key, value)` - Schreiben
- [ ] `delete(moduleId, key)` - Löschen
- [ ] Isolation: Modul A kann Modul B nicht lesen
- [ ] Adapter-Interface (für DB später)

**Files:**
- `src/kernel/storage/service.ts`

**Acceptance:**
- ModuleA set → ModuleA get → Success
- ModuleA set → ModuleB get → null (Isolation)
- Unit-Tests

**Estimate:** 1 Tag

---

## Story: KERN-010 - Audit Log

**Beschreibung:**
In-Memory Audit-Log für Traces.

**Tasks:**
- [ ] `AuditLog` Class
- [ ] `write(record)` - TraceRecord speichern
- [ ] `query(filter)` - Traces abfragen (nach userId, moduleId, toolId, timerange)
- [ ] In-Memory-Storage (Array)
- [ ] Query-Filter-Logik
- [ ] Sort Order: timestamp ASC

**Files:**
- `src/kernel/audit/log.ts`
- `src/kernel/audit/filters.ts`

**Acceptance:**
- Write → Query → TraceRecord abrufbar
- Query liefert timestamp ASC
- Unit-Tests

**Estimate:** 0.5 Tage

---

## Story: KERN-011 - Acceptance Test 1 (Validation)

**Beschreibung:**
Test: Invalid Input → VALIDATION_ERROR + Audit

**Tasks:**
- [ ] Test implementieren (`tests/kernel/validation.test.ts`)
- [ ] Tool mit Schema registrieren
- [ ] Invalid Input senden
- [ ] Erwarte `VALIDATION_ERROR`
- [ ] Prüfe Audit-Log enthält Fehler

**Estimate:** 0.5 Tage

---

## Story: KERN-012 - Acceptance Test 2 (Permission)

**Beschreibung:**
Test: Permission Denial → PERMISSION_DENIED

**Tasks:**
- [ ] Test implementieren (`tests/kernel/permissions.test.ts`)
- [ ] Tool registrieren (requires permission)
- [ ] Permission revoken
- [ ] Erwarte `PERMISSION_DENIED`

**Estimate:** 0.5 Tage

---

## Story: KERN-013 - Acceptance Test 3 (Order)

**Beschreibung:**
Test: Deterministische Reihenfolge bei 2 Tool-Calls

**Tasks:**
- [ ] Test implementieren (`tests/kernel/order.test.ts`)
- [ ] 2 Tools nacheinander ausführen
- [ ] Audit-Log prüfen: Reihenfolge korrekt (timestamp ASC)

**Estimate:** 0.5 Tage

---

## Story: KERN-014 - Acceptance Test 4 (Events)

**Beschreibung:**
Test: Event Publish → Subscribe funktioniert

**Tasks:**
- [ ] Test implementieren (`tests/kernel/events.test.ts`)
- [ ] Subscriber registrieren
- [ ] Tool führt aus, emittiert Event
- [ ] Subscriber erhält Event
- [ ] Source-Validation prüfen

**Estimate:** 0.5 Tage

---

## Story: KERN-015 - Acceptance Test 5 (Isolation)

**Beschreibung:**
Test: Storage Isolation zwischen Modulen

**Tasks:**
- [ ] Test implementieren (`tests/kernel/isolation.test.ts`)
- [ ] ModuleA schreibt Daten
- [ ] ModuleB versucht zu lesen
- [ ] Erwarte null (Isolation)

**Estimate:** 0.5 Tage

---

## Story: KERN-016 - Migration: Calendar Tool

**Beschreibung:**
Migriere 1 Calendar-Tool gegen Kernel v0.1.

**Tasks:**
- [ ] `calendar.createEvent` Tool-Definition schreiben
- [ ] Input/Output-Schema definieren
- [ ] Tool gegen `kernel.tools.register()` registrieren
- [ ] Permissions setzen
- [ ] Test: Tool ausführen

**Files:**
- `src/modules/calendar/tools/createEvent.ts` (oder ähnlich)

**Estimate:** 1 Tag

---

## Story: KERN-017 - Migration: Inbox Tool

**Beschreibung:**
Migriere 1 Inbox-Tool gegen Kernel v0.1.

**Tasks:**
- [ ] `inbox.sendEmail` Tool-Definition schreiben
- [ ] Input/Output-Schema definieren
- [ ] Tool registrieren
- [ ] Permissions setzen
- [ ] Test: Tool ausführen

**Files:**
- `src/modules/inbox/tools/sendEmail.ts` (oder ähnlich)

**Estimate:** 1 Tag

---

## Story: KERN-018 - Kernel Index & Export

**Beschreibung:**
Kernel als Singleton und Factory exportieren.

**Tasks:**
- [ ] `src/kernel/index.ts` erstellen
- [ ] `createKernel(config)` Factory-Funktion
- [ ] `kernel` Singleton-Instanz
- [ ] Types re-exportieren
- [ ] JSDoc / TSDoc Comments

**Files:**
- `src/kernel/index.ts`

**Estimate:** 0.5 Tage

---

## Story: KERN-019 - Dokumentation & Freeze

**Beschreibung:**
Finalisiere Kernel-Docs und Release v0.1.0.

**Tasks:**
- [ ] KERNEL_SPEC.md review + finalisieren
- [ ] API-Docs generieren (TSDoc)
- [ ] README für `@lifeos/kernel` Package
- [ ] CHANGELOG.md erstellen
- [ ] Version-Tag: `v0.1.0`

**Acceptance:**
- Alle 5 Acceptance-Tests grün
- 2 Module migriert
- Docs vollständig
- No Linter Errors
- No TypeScript Errors

**Estimate:** 1 Tag

---

## Sprint-Übersicht

| Tag | Stories | Estimate |
|-----|---------|----------|
| 1-2 | KERN-002, KERN-003, KERN-004, KERN-005 | 3 Tage |
| 3-4 | KERN-006, KERN-007 | 2.5 Tage |
| 5   | KERN-008 | 1 Tag |
| 6-7 | KERN-009, KERN-010 | 1.5 Tage |
| 8-9 | KERN-011 bis KERN-015 (Acceptance-Tests) | 2.5 Tage |
| 8-9 | KERN-016, KERN-017 (Migrations) | 2 Tage |
| 10  | KERN-018, KERN-019 (Export + Docs + Freeze) | 1.5 Tage |

**Total:** 14 Story Points

**Puffer:** 4 Tage eingerechnet für Unvorhergesehenes

---

## Definition of Done (Sprint)

- [ ] Alle 19 Stories abgeschlossen
- [ ] Alle 5 Acceptance-Tests grün
- [ ] 2 Module migriert (Calendar + Inbox)
- [ ] Code-Coverage >90%
- [ ] Dokumentation vollständig
- [ ] Keine Linter/TypeScript Errors
- [ ] KERN v0.1.0 Tag erstellt
- [ ] RFC-Prozess dokumentiert

---

## Daily-Standup Format

**3 Fragen:**
1. Was habe ich gestern gemacht?
2. Was mache ich heute?
3. Gibt es Blocker?

**Wo:** Slack/Discord Channel `#a1-kernel`

**Wann:** Ende jeden Arbeitstags (async)

---

## Wöchentliches Sync

**Wann:** Freitag 15:00

**Agenda:**
- Sprint-Progress Review
- Blocker-Diskussion
- RFC-Bedarf?
- Nächste Woche Preview

**Teilnehmer:** A-1 + A-2 bis A-6 (alle Teams)

