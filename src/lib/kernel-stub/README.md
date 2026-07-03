# Kernel Stub - Fake Implementation für Teams A-2, A-3, A-4

## Was ist das?

Der Kernel-Stub ermöglicht es den Teams **A-2** (Browser/Inbox), **A-3** (LAB) und **A-4** (Agent Runtime), **sofort mit der Entwicklung zu beginnen**, ohne auf den Kernel-Freeze in Woche 2 warten zu müssen.

## Wie funktioniert es?

Der Stub implementiert die **gleichen TypeScript-Interfaces** wie der echte Kernel, aber alle Funktionen sind **No-Ops** (sie loggen nur und returnen Erfolg).

## Nutzung

### In Woche 1-2 (Fake-Kernel)

```typescript
// Import Fake-Kernel
import { kernel } from '@/lib/kernel-stub';

// Nutze die API wie den echten Kernel
await kernel.tools.execute('calendar.createEvent', {
  title: 'Meeting',
  startDate: '2026-01-20T10:00:00Z',
  endDate: '2026-01-20T11:00:00Z',
}, context);

// Output: [FAKE KERNEL] Executing tool: calendar.createEvent
// Return: { success: true, data: { fake: true, message: "Tool ... executed (fake)" } }
```

### Ab Woche 3 (Echter Kernel)

**Nur ein Import ändern:**

```typescript
// VORHER
import { kernel } from '@/lib/kernel-stub';

// NACHHER
import { kernel } from '@/kernel';
```

**Dein Code bleibt unverändert!** Nur der Import muss getauscht werden.

## Garantie

Die Interfaces in `types.ts` sind **identisch** mit dem echten Kernel (kopiert aus `KERNEL_SPEC.md` §7).

Wenn dein Code gegen den Fake-Kernel kompiliert, kompiliert er auch gegen den echten Kernel.

## Was du NICHT tun solltest

❌ **Fake-Kernel-Implementierungs-Details nutzen**
```typescript
// FALSCH
if (kernel.version === '0.0.0-fake-kernel') { /* ... */ }
```

✅ **Nur gegen Interfaces entwickeln**
```typescript
// RICHTIG
const result = await kernel.tools.execute(...);
if (result.success) { /* ... */ }
```

## Team-Zuordnung

| Team | Entwickelt gegen Fake-Kernel | Ab Woche 3 gegen Real |
|------|------------------------------|----------------------|
| A-2 | Browser + Inbox | ✅ |
| A-3 | LAB (Editor, Sandbox) | ✅ |
| A-4 | Agent Runtime | ✅ |

## Fragen?

Siehe: `docs/kernel/KERNEL_SPEC.md` für die vollständige API-Dokumentation.
