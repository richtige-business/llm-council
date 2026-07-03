# src/kernel/ - NICHT IMPLEMENTIERT

## Status: Platzhalter (nicht verwendet)

Dieses Verzeichnis enthält **Typ-Definitionen und Platzhalter-Code** fuer eine geplante Kernel-Architektur (Modul-Lifecycle, Permissions, Event-Bus, etc.).

**Aktuell wird keiner dieser Dateien im Produktivcode importiert oder genutzt.**

## Was stattdessen verwendet wird

Die App nutzt `src/lib/kernel-stub/` als temporaere Fake-Implementation.
Siehe: `src/lib/kernel-stub/README.md`

## Warum existiert dieses Verzeichnis?

Es wurde als Grundlage fuer eine zukuenftige Kernel-Implementation angelegt (basierend auf `docs/kernel/KERNEL_SPEC.md`). Die Migration von `kernel-stub` auf den echten Kernel steht noch aus.

## Fuer externe Entwickler

- Dieses Verzeichnis kann **ignoriert** werden
- Alle relevante Logik liegt in `src/lib/` und `src/modules/`
- Die eigentliche Tool-Registry: `src/lib/agent/registry/tool-registry.ts`
- Der Event-Bus: `src/lib/events/event-bus.ts`

## Dateien (Platzhalter)

```
src/kernel/
├── audit/       # Audit-Log (nicht implementiert)
├── events/      # Event-Bus (nutze stattdessen src/lib/events/)
├── modules/     # Modul-Lifecycle (nutze stattdessen src/lib/modules/)
├── permissions/  # Berechtigungen (nicht implementiert)
├── storage/     # Storage-Service (nicht implementiert)
├── tools/       # Tool-System (nutze stattdessen src/lib/agent/registry/)
├── types/       # Typ-Definitionen
└── index.ts     # Leer
```
