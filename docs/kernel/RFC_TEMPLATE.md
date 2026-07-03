# RFC Template: Kernel Change Proposal

**RFC-Nummer:** KERN-RFC-XXX  
**Titel:** [Kurze Zusammenfassung]  
**Autor:** [Name/Team]  
**Datum:** YYYY-MM-DD  
**Status:** DRAFT | REVIEW | APPROVED | REJECTED  

---

## 1. Zusammenfassung (1-2 Sätze)

Was soll geändert werden und warum?

---

## 2. Motivation

Welches Problem wird gelöst? Welche Use Cases werden ermöglicht?

---

## 3. Vorgeschlagene Änderung

### 3.1 API-Änderungen

**Vor:**
```typescript
// Aktuelles Interface
```

**Nach:**
```typescript
// Neues Interface
```

### 3.2 Breaking Changes

Ist die Änderung backwards-compatible? Wenn nein:
- Welche bestehenden Module brechen?
- Wie ist die Migration?

---

## 4. Alternativen

Welche anderen Lösungen wurden erwogen?

---

## 5. Implementierungs-Aufwand

- **Geschätzter Aufwand:** X Tage
- **Betroffene Teams:** A-X, A-Y
- **Blocker:** Ja/Nein

---

## 6. Testing-Strategie

Wie wird die Änderung getestet? Neue Acceptance-Tests?

---

## 7. Rollout-Plan

- **Kernel-Version:** v0.X.0 (MAJOR/MINOR/PATCH)
- **Deprecation:** Ja/Nein
- **Timeline:** X Wochen nach Approval

---

## 8. Review-Kommentare

| Reviewer | Team | Approve/Reject | Kommentar |
|----------|------|----------------|-----------|
| Name 1   | A-1  | ✅ Approve      | ...       |
| Name 2   | A-2  | ❌ Reject       | Begründung |

**Approval-Kriterium:** 2/3 der Teams (min. 4 von 6)

---

## 9. Entscheidung

**Status:** [APPROVED am YYYY-MM-DD | REJECTED]  
**Nächste Schritte:** [Implementation-Ticket oder Close]

