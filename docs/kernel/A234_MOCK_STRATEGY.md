# 🎯 A-2/A-3/A-4: Start ohne Blocker (Mock-Strategy)

**Problem:** Kernel ist noch nicht fertig (Woche 1-2), aber ihr wollt nicht warten.

**Lösung:** Entwickelt gegen **Fake-Kernel** (Stub-Implementation).

---

## Was ist der Fake-Kernel?

Der Fake-Kernel implementiert die **gleichen TypeScript-Interfaces** wie der echte Kernel, aber alle Funktionen sind **No-Ops** (sie loggen nur und returnen Erfolg).

**Location:** `src/lib/kernel-stub/`

---

## Schritt 1: Import Fake-Kernel (heute)

```typescript
// In euren Modulen (Browser, Inbox, LAB, Agent)
import { kernel } from '@/lib/kernel-stub';
import type { ToolDefinition, ExecutionContext, ToolResult } from '@/lib/kernel-stub/types';

// Nutze die API
const result = await kernel.tools.execute(
  'browser.navigate',
  { url: 'https://example.com' },
  context
);

console.log(result);
// Output: { success: true, data: { fake: true, message: "..." } }
```

---

## Schritt 2: Entwickelt eure Features (Woche 1-2)

Ihr könnt **sofort** eure Features entwickeln:

### A-2 (Browser + Inbox)
```typescript
// Browser-Modul
import { kernel } from '@/lib/kernel-stub';

// Tool registrieren
kernel.tools.register({
  id: 'browser.navigate',
  name: 'Navigate to URL',
  description: 'Opens a URL in the browser',
  inputSchema: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } },
  outputSchema: { type: 'object', properties: { success: { type: 'boolean' } } },
  effects: ['network', 'ui'],
  isIdempotent: false,
  requiresConfirmation: false,
  execute: async (input, context) => {
    // Eure Browser-Logik hier
    const { url } = input as { url: string };
    // ...
    return { success: true, data: { loaded: true } };
  },
});

// Tool aufrufen
await kernel.tools.execute('browser.navigate', { url: '...' }, context);
```

### A-3 (LAB)
```typescript
// LAB Code-Generator
import { kernel } from '@/lib/kernel-stub';

// Events subscriben
kernel.events.subscribe('lab.codeGenerated', (event) => {
  console.log('Code generated:', event.payload);
});

// Code generiert → Event emittieren
kernel.events.publish({
  type: 'lab.codeGenerated',
  payload: { files: [...] },
  timestamp: Date.now(),
  sourceModuleId: 'lab',
  traceId: context.traceId,
});
```

### A-4 (Agent Runtime)
```typescript
// Agent nutzt Tools
import { kernel } from '@/lib/kernel-stub';

async function executeAgentPlan(plan: ToolCall[]) {
  for (const call of plan) {
    const result = await kernel.tools.execute(
      call.toolId,
      call.input,
      context
    );
    
    if (!result.success) {
      // Handle error
    }
  }
}
```

---

## Schritt 3: Woche 3 Migration (nur Import ändern)

Wenn A-1 Kernel v0.1.0 freezed (Ende Woche 2):

```typescript
// VORHER (Woche 1-2)
import { kernel } from '@/lib/kernel-stub';

// NACHHER (Woche 3+)
import { kernel } from '@/kernel';
```

**Das war's!** Euer Code bleibt unverändert.

---

## Wichtig: Nur gegen Interfaces entwickeln

✅ **DO:**
```typescript
const result = await kernel.tools.execute(...);
if (result.success) { /* ... */ }
```

❌ **DON'T:**
```typescript
if (kernel.version === '0.0.0-fake-kernel') { /* ... */ }
```

Nutzt **keine** Implementierungs-Details des Fake-Kernels.

---

## FAQ

**Q: Was wenn ich einen Bug im Fake-Kernel finde?**  
A: Fake-Kernel ist nur für Development (Woche 1-2). Ab Woche 3 nutzt ihr den echten Kernel.

**Q: Muss ich meine Tests gegen Fake-Kernel schreiben?**  
A: Ja, aber die Tests werden auch gegen den echten Kernel laufen (gleiche Interfaces).

**Q: Was wenn die Spec sich ändert?**  
A: A-1 muss ein RFC schreiben. Ihr werdet reviewt. Fake-Kernel wird dann angepasst.

---

## Team-Zuordnung

| Team | Entwickelt gegen Fake | Ab Woche 3 gegen Real |
|------|-----------------------|-----------------------|
| **A-2** | Browser + Inbox | ✅ |
| **A-3** | LAB (Editor, Sandbox) | ✅ |
| **A-4** | Agent Runtime | ✅ |

---

## Nächste Schritte (heute)

1. ✅ Import `kernel` aus `@/lib/kernel-stub`
2. ✅ Lest die API-Docs (`docs/kernel/KERNEL_SPEC.md`)
3. ✅ Startet mit euren Features
4. ✅ Woche 3: Import-Swap

**Ihr verliert KEINE Zeit!** 🚀

---

## Fragen?

Siehe: `src/lib/kernel-stub/README.md` oder fragt in Slack.

