# LifeOS Kernel v0.1.0 Specification (FINAL)
**Version:** 0.1.0  
**Status:** FREEZE CANDIDATE  
**Änderbarkeit:** Nur per RFC nach Freeze  
**Review-Datum:** 2026-01-16  

---

## 0. Präambel

Der **LifeOS Kernel** ist die minimale, stabile Schicht für Module, Tools und Agents.

### 0.1 Konventionen (verbindlich)

**Event Naming:**
- Format: `"${moduleId}.${eventName}"`
- `moduleId`: kebab-case (z.B. "calendar", "inbox")
- `eventName`: camelCase (z.B. "eventCreated", "emailSent")
- Beispiel: `"calendar.eventCreated"`

**AuditLog Sort Order:**
- `audit.query()` liefert standardmäßig `timestamp ASC` (älteste zuerst)
- Garantiert deterministisches Replay und Debugging (Ursache vor Wirkung)

**Event Source Validation:**
- `event.sourceModuleId` muss mit `event.type` Prefix übereinstimmen
- Beispiel: `type: "calendar.eventCreated"` → `sourceModuleId: "calendar"`
- Verhindert Event-Spoofing zwischen Modulen

### 0.2 Kernel-Garantien

- ✅ **API-Stabilität:** Interfaces ändern sich nicht innerhalb v0.x
- ✅ **Determinismus im Executor:** Gleiche Inputs führen zu gleicher Ablauflogik (Validierung, Permission-Check, Reihenfolge)
- ✅ **Keine Business-Logik:** Kernel kennt keine Module namentlich
- ✅ **Testbarkeit:** Kernel funktioniert ohne UI, ohne Datenbank

### 0.3 Was ist NICHT im Kernel

- ❌ UI-Komponenten
- ❌ LLM-Prompts oder AI-Logik
- ❌ Modul-spezifische Geschäftslogik
- ❌ Datenbank-Schema (außer Kernel-Metadaten)
- ❌ Shared State zwischen Modulen (v0.1 - kommt ggf. v0.2+)

### 0.4 Nicht-deterministische Effects

Tools dürfen nicht-deterministische Effects haben (Zeit, Netzwerk, Random), MÜSSEN diese aber deklarieren:

```typescript
interface ToolDefinition {
  // ...
  effects: ToolEffect[];  // Deklaration der Side-Effects
}

type ToolEffect = 
  | "time"      // Nutzt aktuelle Zeit
  | "network"   // HTTP-Requests
  | "random"    // Zufallszahlen
  | "storage"   // Lesen/Schreiben in DB
  | "ui"        // UI-Änderungen
  ;
```

**Wichtig:** Der Kernel-Executor ist deterministisch (gleiche Ablauflogik), aber Tools nicht zwingend.

---

## 1. Module Contract

### 1.1 Modul-Manifest (`module.json`)

Jedes Modul MUSS eine `module.json` enthalten:

```typescript
interface ModuleManifest {
  // Identität
  id: string;                    // kebab-case (z.B. "advanced-todos")
  name: string;
  version: string;               // SemVer
  kernelVersion: string;         // SemVer range (z.B. ">=0.1.0 <1.0.0")
  
  // Metadata
  description: string;
  author: string;
  license: string;
  icon: string;
  category: ModuleCategory;
  
  // Abhängigkeiten
  dependencies?: string[];       // Andere Modul-IDs
  
  // Berechtigungen
  permissions: Permission[];
}

type ModuleCategory = 
  | "productivity" 
  | "communication" 
  | "finance" 
  | "health" 
  | "utility" 
  | "developer";
```

**Hinweis:** Lifecycle-Hooks (onInstall, etc.) sind **nicht Teil des Kernel-Contracts**. Sie gehören zum Module-Loader (Production Layer).

### 1.2 Modul-Lifecycle

```typescript
interface ModuleLifecycle {
  install(manifest: ModuleManifest): Promise<void>;
  enable(moduleId: string): Promise<void>;
  disable(moduleId: string): Promise<void>;
  uninstall(moduleId: string): Promise<void>;
}
```

**Garantien:**
- Dependencies müssen erfüllt sein vor `enable()`
- Keine Uninstallation wenn andere Module abhängen
- Lifecycle-Operationen sind idempotent

**Persistenz (v0.1):**
- Der Kernel MUSS die Module Registry persistent speichern (für Production)
- Referenz-Implementierung in v0.1 DARF in-memory sein (für Tests/Development)
- Marketplace und Cross-Module-Dependencies erfordern persistente Registry

**Empfohlene Production-Implementierung:**
- Modul-Manifests in DB (z.B. via StorageService)
- Lifecycle-State (enabled/disabled) persistent
- Installation-Timestamps persistent

---

## 2. Tool Interface

### 2.1 Tool-ID-Format (global eindeutig)

**Format:** `${moduleId}.${localToolId}`

Beispiele:
- `calendar.createEvent`
- `inbox.sendEmail`
- `browser.navigate`

**Regel:** Kernel nutzt **ausschließlich** globale Tool-IDs.

### 2.2 Tool-Definition

```typescript
interface ToolDefinition {
  // Identität (global)
  id: string;                    // Format: "moduleId.toolName"
  name: string;
  description: string;
  
  // Schema
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  
  // Effects
  effects: ToolEffect[];
  
  // Metadaten
  isIdempotent: boolean;
  requiresConfirmation: boolean; // ADVISORY: UI/Agent sollte User fragen
                                  // Kernel enforced dies NICHT in v0.1
  
  // Ausführung
  execute: ToolExecutor;
}

type ToolExecutor = (
  input: unknown,
  context: ExecutionContext
) => Promise<ToolResult>;

interface ExecutionContext {
  userId: string;
  requestingModuleId: string;    // Wer ruft das Tool auf?
  traceId: string;               // Für Logging/Debugging
}

// Permissions werden NICHT im Context übergeben.
// Quelle der Wahrheit: kernel.permissions.check(requestingModuleId, permission)

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: ErrorCode;
    message: string;
  };
  events?: Event[];              // Events zum Emittieren
}

type ErrorCode = 
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "TOOL_NOT_FOUND"
  | "EXECUTION_ERROR"
  ;
```

**Hinweis:** `requiresConfirmation` ist ein ADVISORY flag. Der Kernel speichert es, aber enforced es NICHT in v0.1. Agent-Runtime oder UI muss User-Confirmation implementieren.

### 2.3 Tool-Executor-Pipeline

**Ablauf (deterministisch):**

```
1. Tool-ID validieren (existiert?)
2. Input validieren (gegen inputSchema)
3. Permission prüfen
   Required Permission: "tool.execute.${toolId}"
   Check: kernel.permissions.check(requestingModuleId, "tool.execute.calendar.createEvent")
   Bei Denial → PERMISSION_DENIED, Execution stoppt
4. Tool ausführen
5. Output validieren (gegen outputSchema)
6. Events emittieren (falls result.events)
7. Audit-Log schreiben (TraceRecord)
```

**Garantie:** Reihenfolge ist immer gleich, unabhängig vom Tool.

---

## 3. Event Bus

### 3.1 Event-Definition

```typescript
interface Event {
  type: string;                  // Format: "${moduleId}.${eventName}"
                                  // moduleId: kebab-case, eventName: camelCase
                                  // Beispiele: "calendar.eventCreated", "inbox.emailSent"
  payload: unknown;
  timestamp: number;
  sourceModuleId: string;        // Modul-ID (muss mit type prefix übereinstimmen)
  traceId: string;               // REQUIRED: Für Observability/Debugging
}

type EventHandler = (event: Event) => void | Promise<void>;

interface EventBus {
  publish(event: Event): void;
  subscribe(eventType: string, handler: EventHandler): () => void;
}
```

**Event Source Validation:**
- `event.type` muss mit `${sourceModuleId}.` beginnen
- Beispiel: `type: "calendar.eventCreated"` erfordert `sourceModuleId: "calendar"`
- Verhindert Module, fremde Events zu spoofnen

**Wichtig:** `getHistory()` ist **NICHT Teil von v0.1**. History/Replay gehört zu AuditLog (Observability-Layer).

### 3.2 Event-Semantik

- **At-Least-Once:** Events können mehrfach zugestellt werden (Idempotenz empfohlen)
- **Async:** Handler blockieren Publisher nicht
- **No Ordering:** Keine Garantie über Reihenfolge (wenn wichtig → Tool nutzen)
- **Error Isolation:** Handler-Fehler crashen nicht den Bus

---

## 4. Permission System

### 4.1 Permission-Typen (feingranular)

```typescript
type Permission = 
  // Storage
  | "storage.read.self"          // Eigene DB-Partition lesen
  | "storage.write.self"         // Eigene DB-Partition schreiben
  
  // Network
  | "network.request.restricted" // HTTP zu whitelisted domains
  | "network.request.unrestricted" // HTTP zu beliebigen domains
  
  // Events
  | "events.publish.workspace"   // Events publizieren
  | "events.subscribe.workspace" // Events subscriben
  
  // Tools (cross-module access)
  | `tool.execute.${string}`     // Format: "tool.execute.${toolId}"
                                  // Beispiel: "tool.execute.calendar.createEvent"
  
  // System
  | "notifications.send"
  | "clipboard.read"
  | "clipboard.write"
  | "filesystem.read"            // Nur Electron
  | "filesystem.write"           // Nur Electron
  | "camera"
  | "microphone"
  ;
```

**REGEL: Tool-Calls erfordern Permission `tool.execute.${toolId}`**

Beispiel: Um `calendar.createEvent` aufzurufen, braucht `requestingModuleId` die Permission `tool.execute.calendar.createEvent`.

Diese Permission wird im Executor automatisch geprüft (Schritt 3 der Pipeline).

**Cross-Module-Access:** Nicht über `modules:*`, sondern über `tool.execute.*` Permissions.

### 4.2 Permission-Check

```typescript
interface PermissionService {
  check(moduleId: string, permission: Permission): boolean;
  grant(moduleId: string, permission: Permission): void;
  revoke(moduleId: string, permission: Permission): void;
  request(moduleId: string, permissions: Permission[], reason: string): Promise<boolean>;
}
```

**Garantie:** Jeder Tool-Call wird gegen Permissions geprüft. Bei Denial → `PERMISSION_DENIED`.

---

## 5. Storage (module-scoped)

```typescript
interface StorageService {
  // Modul-scoped (automatisch isoliert)
  get<T>(moduleId: string, key: string): Promise<T | null>;
  set<T>(moduleId: string, key: string, value: T): Promise<void>;
  delete(moduleId: string, key: string): Promise<void>;
  
  // Batch
  getMany<T>(moduleId: string, keys: string[]): Promise<Map<string, T>>;
  setMany<T>(moduleId: string, entries: Map<string, T>): Promise<void>;
}
```

**Isolation:**
- Modul A kann **nie** Modul B's Storage lesen
- Cross-module data sharing → Events + Tools

**Hinweis:** Shared State ist **NICHT in v0.1**. Kommt ggf. v0.2+ als bewusstes Feature mit Governance.

---

## 6. Audit Log

```typescript
interface TraceRecord {
  traceId: string;
  timestamp: number;
  userId: string;
  requestingModuleId: string;    // Wer hat das Tool aufgerufen?
  toolId: string;                // Format: "moduleId.toolName" (enthält owning module)
  input: unknown;
  output?: unknown;
  error?: { code: ErrorCode; message: string };
  durationMs: number;
  permissionChecks: { permission: Permission; granted: boolean }[];
}

interface AuditLog {
  write(record: TraceRecord): void;
  query(filter?: TraceFilter): TraceRecord[];
  // Returns records sorted by timestamp ASC (oldest first)
  // Guarantees: Append-order preserved, deterministic replay possible
}
```

**Zweck:**
- Debugging
- Compliance
- Performance-Analyse

**Wichtig:** AuditLog ≠ EventBus. Events sind für Module, Traces sind für Observability.

---

## 7. Kernel-API (vollständig)

```typescript
interface LifeOSKernel {
  // Modul-Lifecycle
  modules: {
    install(manifest: ModuleManifest): Promise<void>;
    enable(moduleId: string): Promise<void>;
    disable(moduleId: string): Promise<void>;
    uninstall(moduleId: string): Promise<void>;
    get(id: string): ModuleManifest | null;
    list(): ModuleManifest[];
  };
  
  // Tool-System
  tools: {
    register(tool: ToolDefinition): void;
    unregister(toolId: string): void;
    execute(
      toolId: string,
      input: unknown,
      context: ExecutionContext
    ): Promise<ToolResult>;
    list(moduleId?: string): ToolDefinition[];
  };
  
  // Event-Bus
  events: {
    publish(event: Event): void;
    subscribe(eventType: string, handler: EventHandler): () => void;
  };
  
  // Permissions
  permissions: {
    check(moduleId: string, permission: Permission): boolean;
    grant(moduleId: string, permission: Permission): void;
    revoke(moduleId: string, permission: Permission): void;
    request(moduleId: string, permissions: Permission[], reason: string): Promise<boolean>;
  };
  
  // Storage
  storage: {
    get<T>(moduleId: string, key: string): Promise<T | null>;
    set<T>(moduleId: string, key: string, value: T): Promise<void>;
    delete(moduleId: string, key: string): Promise<void>;
  };
  
  // Audit
  audit: {
    write(record: TraceRecord): void;
    query(filter?: TraceFilter): TraceRecord[];
  };
  
  // Meta
  version: string;
}
```

---

## 8. Acceptance-Tests (Freeze-Kriterium)

**Der Kernel v0.1 MUSS diese 5 Tests bestehen:**

### Test 1: Tool Schema Validation

```typescript
test("invalid input → VALIDATION_ERROR + audit", async () => {
  const result = await kernel.tools.execute(
    "calendar.createEvent",
    { invalid: "data" },  // Fehlt "title", "startDate"
    context
  );
  
  expect(result.success).toBe(false);
  expect(result.error?.code).toBe("VALIDATION_ERROR");
  
  const trace = kernel.audit.query({ traceId: context.traceId })[0];
  expect(trace.error?.code).toBe("VALIDATION_ERROR");
});
```

### Test 2: Permission Denial

```typescript
test("tool requires permission → denied → PERMISSION_DENIED", async () => {
  // Modul ohne "tool.execute.calendar.createEvent" Permission
  kernel.permissions.revoke("inbox", "tool.execute.calendar.createEvent");
  
  const result = await kernel.tools.execute(
    "calendar.createEvent",
    { title: "Test", startDate: "...", endDate: "..." },
    { ...context, requestingModuleId: "inbox" }
  );
  
  expect(result.success).toBe(false);
  expect(result.error?.code).toBe("PERMISSION_DENIED");
});
```

### Test 3: Deterministic Execution Order

```typescript
test("plan mit 2 tool calls → Reihenfolge garantiert", async () => {
  const result1 = await kernel.tools.execute("tool1", {}, context);
  const result2 = await kernel.tools.execute("tool2", {}, context);
  
  // AuditLog.query liefert standardmäßig timestamp ASC (älteste zuerst)
  const history = kernel.audit.query({ userId: context.userId });
  
  expect(history.length).toBeGreaterThanOrEqual(2);
  expect(history[0].toolId).toBe("tool1");
  expect(history[1].toolId).toBe("tool2");
  expect(history[0].timestamp).toBeLessThan(history[1].timestamp);
});
```

### Test 4: Event Publish/Subscribe

```typescript
test("tool emits event → subscriber gets it", async () => {
  let received: Event | null = null;
  
  kernel.events.subscribe("calendar.eventCreated", (event) => {
    received = event;
  });
  
  await kernel.tools.execute(
    "calendar.createEvent",
    { title: "Meeting", startDate: "...", endDate: "..." },
    context
  );
  
  await waitForAsync();  // Events sind async
  expect(received?.type).toBe("calendar.eventCreated");
  expect(received?.sourceModuleId).toBe("calendar");
});
```

### Test 5: Storage Isolation

```typescript
test("module A storage → module B cannot read", async () => {
  await kernel.storage.set("moduleA", "secret", "my-secret-data");
  
  const value = await kernel.storage.get("moduleB", "secret");
  expect(value).toBeNull();  // Isolation: moduleB sieht moduleA's Daten nicht
});
```

**Freeze-Kriterium:** Alle 5 Tests grün → Kernel v0.1.0 freigegeben.

---

## 9. Versioning & Compatibility

### 9.1 SemVer

```
Kernel-Version: MAJOR.MINOR.PATCH

MAJOR: Breaking Changes (Interface-Änderungen)
MINOR: Neue Features (backwards-compatible)
PATCH: Bugfixes
```

### 9.2 Deprecation-Policy

1. MINOR-Release: Feature als `@deprecated` markieren
2. +6 Monate Warnung in Logs
3. MAJOR-Release: Feature entfernen

### 9.3 RFC-Prozess

Kernel-Änderungen (auch nach Freeze) erfordern RFC:
- RFC-Template siehe `docs/kernel/RFC_TEMPLATE.md`
- Review durch alle Teams (A-1 bis A-6)
- Approval: 2/3 Mehrheit

---

## 10. Implementierungs-Reihenfolge (A-1)

### Tag 1-2: Core Types & Validation

- [ ] `KernelContext`, IDs, Types
- [ ] JSON Schema Validator (ajv)
- [ ] ToolRegistry (in-memory)
- [ ] PermissionService (in-memory grants)

### Tag 3-4: Tool Executor

- [ ] `ToolExecutor` Pipeline (validate → permission → execute → validate → audit)
- [ ] `ExecutionContext` + TraceRecord

### Tag 5: Event Bus

- [ ] `EventBus` (in-memory Pub/Sub)
- [ ] At-least-once Semantik

### Tag 6-7: Storage & Audit

- [ ] `StorageService` (in-memory, adapter interface für DB später)
- [ ] `AuditLog` (in-memory, query interface)

### Tag 8-10: Integration & Migration

- [ ] **5 Acceptance-Tests** implementieren + grün
- [ ] **2 Module migrieren:** Calendar + Inbox (exemplarisch, nicht alle)
- [ ] Docs finalisieren

**Wichtig:** Migration ALLER Module ist zu groß für Woche 2. Proof mit 2 Modulen reicht für Freeze.

---

## 11. Anti-Patterns

❌ **Modul-Namen im Kernel**
```typescript
// FALSCH
if (moduleId === "calendar") { /* special handling */ }
```

❌ **Shared State in v0.1**
```typescript
// FALSCH (nicht in v0.1)
kernel.state.setShared("globalPreferences", {...});
```

❌ **Event History im Bus**
```typescript
// FALSCH
eventBus.getHistory(); // → Gehört zu AuditLog, nicht EventBus
```

❌ **UI im Kernel**
```typescript
// FALSCH
kernel.ui.showNotification("Hello");
```

❌ **Permissions im ExecutionContext**
```typescript
// FALSCH
context.permissions.includes("storage.write.self");

// RICHTIG
kernel.permissions.check(moduleId, "storage.write.self");
```

---

## 12. Code-Mapping (Spec → Implementation)

| Spec Section | Implementierung | Package |
|--------------|-----------------|---------|
| §1 Module Contract | `src/kernel/modules/` | `@lifeos/kernel/modules` |
| §2 Tool Interface | `src/kernel/tools/` | `@lifeos/kernel/tools` |
| §3 Event Bus | `src/kernel/events/` | `@lifeos/kernel/events` |
| §4 Permissions | `src/kernel/permissions/` | `@lifeos/kernel/permissions` |
| §5 Storage | `src/kernel/storage/` | `@lifeos/kernel/storage` |
| §6 Audit Log | `src/kernel/audit/` | `@lifeos/kernel/audit` |
| §7 Kernel API | `src/kernel/index.ts` | `@lifeos/kernel` |

---

**Ende Spezifikation v0.1.0 (FINAL).**

Diese Version ist freeze-ready. Alle 8 Patches integriert. Änderungen nur per RFC.

