# 🚀 A-1 Kickoff: Kernel v0.1.0 Implementation

**Ziel:** Kernel v0.1.0 freeze-candidate in 10 Arbeitstagen.

**Deadline:** [Datum in 2 Wochen eintragen]

---

## Was ihr baut

Den **LifeOS Kernel** - die stabile, minimale Schicht für alle Module, Tools und Agents.

**Spezifikation:** `docs/kernel/KERNEL_SPEC.md` (lest es komplett, ~30 Min)

---

## Regeln (strikt)

1. **Test-First:** Implementiert die 5 Acceptance-Tests ZUERST, dann den Code
2. **No UI:** Kernel funktioniert ohne UI, ohne Browser, nur Node.js
3. **No DB-Zwang:** In-Memory-Implementierung für v0.1 ist OK (Adapter-Interface für später)
4. **No Extra Features:** Nur was in der Spec steht. Keine "Nice-to-Haves"
5. **RFC für Änderungen:** Jede Spec-Änderung (auch in Woche 1-2) → RFC schreiben → Review

---

## Definition of Freeze

Kernel v0.1.0 ist freeze-ready wenn:

- ✅ Alle 5 Acceptance-Tests grün (100% Coverage)
- ✅ 2 Tool-Migrations funktionieren:
  - `calendar.createEvent`
  - `inbox.sendEmail`
- ✅ Dokumentation vollständig (API-Docs, CHANGELOG)
- ✅ Version-Tag erstellt: `v0.1.0`

**Ohne diese 4 Punkte: Kein Freeze.**

---

## Sprint-Plan (10 Tage)

Siehe: `docs/plans/A1_SPRINT_JIRA.md`

**Übersicht:**
- **Tag 1-2:** Core Types + Tool Registry + Permissions
- **Tag 3-4:** Tool Executor Pipeline (7 Schritte)
- **Tag 5:** Event Bus
- **Tag 6-7:** Storage + Audit Log
- **Tag 8-9:** 5 Acceptance-Tests + 2 Migrations
- **Tag 10:** Docs + Freeze

---

## Erste Schritte (Tag 1 morgen)

1. **Lest die Spec** (`docs/kernel/KERNEL_SPEC.md`)
2. **Code-Struktur** ist bereits angelegt (`src/kernel/`)
3. **Story KERN-002 starten:** Core Types & IDs
4. **Daily-Update:** Ende Tag 1 in Slack/Discord posten

---

## Code-Struktur (bereits angelegt)

```
src/kernel/
├── index.ts                 # Export: createKernel + kernel singleton
├── types/
│   ├── ids.ts              # Tool-ID-Parser, etc.
│   ├── schemas.ts          # JSON Schema Types
│   └── kernel.ts           # Kernel Interface
├── modules/
│   ├── registry.ts         # Module Registry
│   └── lifecycle.ts        # Install/Enable/Disable/Uninstall
├── tools/
│   ├── registry.ts         # Tool Registry
│   ├── executor.ts         # 7-Step Pipeline
│   └── validator.ts        # JSON Schema Validation (ajv)
├── permissions/
│   └── service.ts          # Permission Grants & Checks
├── events/
│   └── bus.ts              # Pub/Sub Event Bus
├── storage/
│   └── service.ts          # Module-scoped Storage
└── audit/
    ├── log.ts              # Audit Log Writer & Query
    └── filters.ts          # Query Filter Logic
```

---

## Kommunikation

- **Daily-Updates:** Kurz in Slack (3 Sätze: Was gemacht? Was morgen? Blocker?)
- **Wöchentlich:** Sync mit allen Teams (A-1 bis A-6)
- **Bei Blocker:** Sofort melden, nicht warten

---

## Was passiert nach Freeze?

- Kernel v0.1.0 wird **heilig** - keine Änderungen ohne RFC
- A-2, A-3, A-4 starten Production-Integration
- Ihr (A-1) supportet bei Integration-Problemen
- Nächstes Ziel: Kernel v0.2 (später, nicht jetzt)

---

## Installation (Dependencies)

```bash
cd /Users/karolgenczyk/LifeOS
npm install ajv  # JSON Schema Validator
npm install uuid # TraceID Generator
```

---

## Tests Setup

```bash
# Jest (falls nicht installiert)
npm install --save-dev jest @types/jest ts-jest

# Test-Ordner
mkdir -p tests/kernel
```

---

## Fragen?

Lest die Spec. Wenn danach Fragen → Slack-Thread.

**Go! 🚀**

---

## Team A-1 Kontakt

[Hier eure Namen/Kontakte einfügen]

