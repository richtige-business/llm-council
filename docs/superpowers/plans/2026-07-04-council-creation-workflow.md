# Council Creation Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a categorized standard-member preset library (accessible via a room button while a council is being set up) and a goal/prompt refinement step to the existing Eldest-onboarding modal.

**Architecture:** Two independent-but-related additions on top of the existing council system: (1) a data + UI layer for browsing/adding curated council-member presets by category, sharing a seat-allocation util with the existing onboarding flow; (2) a new intermediate step in `CouncilOnboardingModal` that has the Eldest propose a `{goal, finalPrompt}` pair, lets the user edit it, and hands the final prompt to the chatbar via a new transient store field.

**Tech Stack:** Next.js 16 (App Router), React, Zustand (persisted store), TypeScript, Vitest + jsdom for tests, Tailwind for styling, existing `executeCouncilCompletion` (non-streaming LLM call) for both JSON-producing steps.

## Global Constraints

- All new/modified TypeScript must pass `npx tsc --noEmit` with zero new errors (baseline currently has ~90 pre-existing, unrelated errors — compare counts before/after if unsure whether an error is new).
- Follow existing code style: German comments in `// ---` banner blocks, `'use client'` at the top of client components, Tailwind utility classes matching the existing dark/glass aesthetic (`bg-white/5`, `border-white/10`, `text-white/60` etc. — copy from neighboring code, don't invent a new palette).
- `pendingCouncilPromptDraft` must NOT be added to the store's `partialize()` allowlist (`src/modules/agents/store.ts` around line 2455) — it's transient UI handoff state, not something to persist across reloads, matching the existing precedent of `webResearchEnabled`/`deepResearchEnabled` being excluded.
- Every new pure-logic module (seat allocation, preset catalog, JSON parsing) gets a Vitest test file under `tests/`, following the existing direct-store-access pattern in `tests/bases-store.test.ts` (`useXStore.setState(...)` / `useXStore.getState()`), not deep component rendering tests — this repo's existing test suite favors logic-level tests for stores/registries.

---

### Task 1: Extract shared seat-allocation util

**Files:**
- Create: `src/modules/agents/lib/council-seats.ts`
- Test: `tests/council-seats.test.ts`
- Modify: `src/modules/agents/components/CouncilOnboardingModal.tsx:35-55` (remove local copy, import shared one)

**Interfaces:**
- Produces: `getNextAvailableCouncilSeatId(existingSeatMembers: CouncilSeatMemberData[]): string` — exported function, used by both the onboarding modal (existing) and the new preset library dropdown (Task 5).

- [ ] **Step 1: Write the failing test**

Create `tests/council-seats.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getNextAvailableCouncilSeatId } from '@/modules/agents/lib/council-seats';
import type { CouncilSeatMemberData } from '@/modules/agents/types';

function makeMember(seatId: string): CouncilSeatMemberData {
  return {
    seatId,
    name: 'Test',
    color: '#000000',
    model: 'openai/gpt-4o',
    role: 'Test',
    rolePrompt: '',
    sourceAgentId: null,
    skills: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('getNextAvailableCouncilSeatId', () => {
  it('returns the first base seat when nothing is occupied', () => {
    expect(getNextAvailableCouncilSeatId([])).toBe('arc-left-0');
  });

  it('fills base seats in order before touching extra seats', () => {
    const occupied = [makeMember('arc-left-0'), makeMember('arc-right-0')];
    expect(getNextAvailableCouncilSeatId(occupied)).toBe('arc-left-1');
  });

  it('falls back to alternating extra seats once base seats are full', () => {
    const occupied = [
      makeMember('arc-left-0'),
      makeMember('arc-right-0'),
      makeMember('arc-left-1'),
      makeMember('arc-right-1'),
    ];
    expect(getNextAvailableCouncilSeatId(occupied)).toBe('arc-left-extra-0');
  });

  it('skips extra seat indices that are already occupied', () => {
    const occupied = [
      makeMember('arc-left-0'),
      makeMember('arc-right-0'),
      makeMember('arc-left-1'),
      makeMember('arc-right-1'),
      makeMember('arc-left-extra-0'),
    ];
    expect(getNextAvailableCouncilSeatId(occupied)).toBe('arc-right-extra-0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/council-seats.test.ts`
Expected: FAIL — `Cannot find module '@/modules/agents/lib/council-seats'`

- [ ] **Step 3: Write the implementation**

Create `src/modules/agents/lib/council-seats.ts`:

```typescript
// ============================================
// council-seats.ts - Sitzplatz-Zuteilung fuer Council-Mitglieder
//
// Zweck: Bestimmt den naechsten freien Sitzplatz in fester
//        Reihenfolge (4 Basis-Sitze, dann abwechselnd links/rechts
//        Zusatzsitze). Gemeinsam genutzt von Eldest-Onboarding und
//        der Preset-Bibliothek.
// Verwendet von: CouncilOnboardingModal.tsx, CouncilPresetLibraryDropdown.tsx
// ============================================

import type { CouncilSeatMemberData } from '../types';

const BASE_SEAT_ORDER = ['arc-left-0', 'arc-right-0', 'arc-left-1', 'arc-right-1'];

export function getNextAvailableCouncilSeatId(existingSeatMembers: CouncilSeatMemberData[]): string {
  const usedSeatIds = new Set(existingSeatMembers.map((member) => member.seatId));

  for (const seatId of BASE_SEAT_ORDER) {
    if (!usedSeatIds.has(seatId)) {
      return seatId;
    }
  }

  let extraIndex = 0;
  // Abwechselnd links/rechts weiterfuellen, wie die manuelle "+"-Seat-Erstellung.
  while (true) {
    const leftId = `arc-left-extra-${extraIndex}`;
    if (!usedSeatIds.has(leftId)) return leftId;
    const rightId = `arc-right-extra-${extraIndex}`;
    if (!usedSeatIds.has(rightId)) return rightId;
    extraIndex += 1;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/council-seats.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Remove the local copy from CouncilOnboardingModal.tsx and import the shared one**

In `src/modules/agents/components/CouncilOnboardingModal.tsx`, delete lines 35-55 (the `SEAT_ORDER` constant and the local `getNextAvailableCouncilSeatId` function), and add this import near the top with the other local imports:

```typescript
import { getNextAvailableCouncilSeatId } from '../lib/council-seats';
```

- [ ] **Step 6: Verify no regressions**

Run: `npx tsc --noEmit 2>&1 | grep -E "CouncilOnboardingModal|council-seats"`
Expected: no output (no errors)

- [ ] **Step 7: Commit**

```bash
git add src/modules/agents/lib/council-seats.ts tests/council-seats.test.ts src/modules/agents/components/CouncilOnboardingModal.tsx
git commit -m "refactor: extract shared getNextAvailableCouncilSeatId util"
```

---

### Task 2: Categorized preset catalog (rename Devil's Advocate, add 12 niche presets)

**Files:**
- Modify: `src/modules/agents/council-member-presets.ts` (full rewrite)
- Test: `tests/council-member-presets.test.ts`
- Modify: `src/modules/agents/components/CouncilOnboardingModal.tsx` (no functional change needed here yet — it already imports `COUNCIL_MEMBER_PRESETS`, which keeps working since the shape is additive)

**Interfaces:**
- Produces: `CouncilMemberPreset` (existing shape + new `category: string` field), `COUNCIL_MEMBER_PRESETS: CouncilMemberPreset[]` (now ~27 entries), `COUNCIL_PRESET_CATEGORIES: string[]` (ordered list of the 10 category names, used by Task 5's dropdown for consistent grouping/ordering).

- [ ] **Step 1: Write the failing test**

Create `tests/council-member-presets.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { COUNCIL_MEMBER_PRESETS, COUNCIL_PRESET_CATEGORIES } from '@/modules/agents/council-member-presets';

describe('COUNCIL_MEMBER_PRESETS', () => {
  it('has at least 25 presets across all categories', () => {
    expect(COUNCIL_MEMBER_PRESETS.length).toBeGreaterThanOrEqual(25);
  });

  it('has unique preset names', () => {
    const names = COUNCIL_MEMBER_PRESETS.map((preset) => preset.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('renamed the devil\'s-advocate preset away from "The Skeptic"', () => {
    expect(COUNCIL_MEMBER_PRESETS.some((preset) => preset.name === 'The Skeptic')).toBe(false);
    expect(COUNCIL_MEMBER_PRESETS.some((preset) => preset.name === "Devil's Advocate")).toBe(true);
  });

  it('every preset belongs to a known category', () => {
    for (const preset of COUNCIL_MEMBER_PRESETS) {
      expect(COUNCIL_PRESET_CATEGORIES).toContain(preset.category);
    }
  });

  it('has exactly 10 categories', () => {
    expect(COUNCIL_PRESET_CATEGORIES).toHaveLength(10);
  });

  it('every category has at least 2 presets', () => {
    for (const category of COUNCIL_PRESET_CATEGORIES) {
      const count = COUNCIL_MEMBER_PRESETS.filter((preset) => preset.category === category).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  it('every preset has a non-empty rolePrompt and a valid-looking suggestedModel', () => {
    for (const preset of COUNCIL_MEMBER_PRESETS) {
      expect(preset.rolePrompt.length).toBeGreaterThan(20);
      expect(preset.suggestedModel).toMatch(/\//);
      expect(preset.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/council-member-presets.test.ts`
Expected: FAIL — `COUNCIL_PRESET_CATEGORIES` is not exported yet, and the rename/category assertions fail.

- [ ] **Step 3: Rewrite the implementation**

Replace the entire contents of `src/modules/agents/council-member-presets.ts` with:

```typescript
// ============================================
// council-member-presets.ts - Kuratierte Standard-Ratsmitglieder
//
// Zweck: ~27 generalistische und nischenspezifische Berater-
//        Archetypen, gruppiert in 10 Kategorien. Waehlbar beim
//        Eldest-Onboarding (Checkbox-Liste) und ueber die
//        Preset-Bibliothek im Raum (kategorisiertes Dropdown).
// Verwendet von: CouncilOnboardingModal.tsx, CouncilPresetLibraryDropdown.tsx
// ============================================

export interface CouncilMemberPreset {
  name: string;
  category: string;
  role: string;
  rolePrompt: string;
  suggestedModel: string;
  color: string;
}

export const COUNCIL_PRESET_CATEGORIES = [
  'Critical Thinking',
  'Strategy & Vision',
  'People & Ethics',
  'Analysis & Expertise',
  'Business & Career',
  'Product & Tech',
  'Money & Investing',
  'Creative & Communication',
  'Relationships & Wellbeing',
  'Legal & Risk',
] as const;

const MODEL_ROTATION = [
  'openai/gpt-4o',
  'anthropic/claude-sonnet-4',
  'google/gemini-2.5-pro',
  'openai/gpt-4o-mini',
  'x-ai/grok-4.20',
];

function modelForIndex(index: number): string {
  return MODEL_ROTATION[index % MODEL_ROTATION.length];
}

const PRESET_COLORS = [
  '#F97316', '#EF4444', '#8B5CF6', '#DC2626', '#0EA5E9',
  '#22C55E', '#14B8A6', '#EC4899', '#F59E0B', '#6366F1',
  '#84CC16', '#A855F7', '#EAB308', '#06B6D4', '#F43F5E',
  '#FB7185', '#34D399', '#60A5FA', '#FBBF24', '#C084FC',
  '#4ADE80', '#F472B6', '#38BDF8', '#FACC15', '#A3E635',
  '#FDA4AF', '#7DD3FC',
];

function colorForIndex(index: number): string {
  return PRESET_COLORS[index % PRESET_COLORS.length];
}

export const COUNCIL_MEMBER_PRESETS: CouncilMemberPreset[] = [
  // ---------------------------------
  // Critical Thinking
  // ---------------------------------
  {
    name: "Devil's Advocate",
    category: 'Critical Thinking',
    role: "Devil's advocate",
    rolePrompt:
      'You stress-test assumptions and claims. You actively look for holes in reasoning, unstated risks, and wishful thinking, and you say so directly, even when it is uncomfortable.',
    suggestedModel: modelForIndex(0),
    color: colorForIndex(0),
  },
  {
    name: 'The Risk Analyst',
    category: 'Critical Thinking',
    role: 'Downside & mitigation',
    rolePrompt:
      'You map out failure modes and worst-case scenarios before anyone commits to a plan. For every recommendation, you name the biggest risk and a concrete mitigation.',
    suggestedModel: modelForIndex(1),
    color: colorForIndex(1),
  },
  {
    name: 'The Simplifier',
    category: 'Critical Thinking',
    role: "Clarity & Occam's razor",
    rolePrompt:
      "You cut through unnecessary complexity and push for the simplest solution that actually works. You are quick to call out over-engineering and prefer Occam's razor.",
    suggestedModel: modelForIndex(2),
    color: colorForIndex(2),
  },

  // ---------------------------------
  // Strategy & Vision
  // ---------------------------------
  {
    name: 'The Pragmatist',
    category: 'Strategy & Vision',
    role: 'Practical strategist',
    rolePrompt:
      'You favor practical, actionable next steps over abstract theory. You always ask "what can we actually do about this, starting today?" and push back on plans that sound good but are not executable.',
    suggestedModel: modelForIndex(3),
    color: colorForIndex(3),
  },
  {
    name: 'The Visionary',
    category: 'Strategy & Vision',
    role: 'Big-picture thinker',
    rolePrompt:
      'You focus on long-term upside and opportunities others miss. You think in terms of where this could lead in 5-10 years and push the group to be more ambitious.',
    suggestedModel: modelForIndex(4),
    color: colorForIndex(4),
  },
  {
    name: 'The Strategist',
    category: 'Strategy & Vision',
    role: 'Long-term positioning',
    rolePrompt:
      'You think in terms of long-term planning and competitive positioning. You connect the immediate question to the bigger strategic picture and second-order consequences.',
    suggestedModel: modelForIndex(5),
    color: colorForIndex(5),
  },

  // ---------------------------------
  // People & Ethics
  // ---------------------------------
  {
    name: 'The Ethicist',
    category: 'People & Ethics',
    role: 'Fairness & impact',
    rolePrompt:
      'You consider fairness and the long-term impact on the people affected by a decision, especially those with the least power in the situation. You flag ethical blind spots directly.',
    suggestedModel: modelForIndex(6),
    color: colorForIndex(6),
  },
  {
    name: 'The User Advocate',
    category: 'People & Ethics',
    role: 'End-user perspective',
    rolePrompt:
      'You represent the end-user or customer in every discussion. You constantly ask how a decision actually feels and lands for the person on the receiving end, not just for the decision-maker.',
    suggestedModel: modelForIndex(7),
    color: colorForIndex(7),
  },

  // ---------------------------------
  // Analysis & Expertise
  // ---------------------------------
  {
    name: 'The Data Analyst',
    category: 'Analysis & Expertise',
    role: 'Evidence & metrics',
    rolePrompt:
      'You insist on evidence and quantitative reasoning. You ask what data would confirm or refute a claim, and you are suspicious of conclusions that are not backed by numbers.',
    suggestedModel: modelForIndex(8),
    color: colorForIndex(8),
  },
  {
    name: 'The Domain Expert',
    category: 'Analysis & Expertise',
    role: 'Technical rigor',
    rolePrompt:
      'You bring deep, rigorous subject-matter expertise to the discussion. You correct imprecise claims, cite relevant best practices, and insist on technical correctness over surface-level plausibility.',
    suggestedModel: modelForIndex(9),
    color: colorForIndex(9),
  },
  {
    name: 'The Historian',
    category: 'Analysis & Expertise',
    role: 'Precedent & pattern-matching',
    rolePrompt:
      'You draw on precedent and pattern-match against similar situations from the past. You point out what happened last time something like this was tried, and why.',
    suggestedModel: modelForIndex(10),
    color: colorForIndex(10),
  },

  // ---------------------------------
  // Business & Career
  // ---------------------------------
  {
    name: 'The Negotiator',
    category: 'Business & Career',
    role: 'Deal & leverage',
    rolePrompt:
      'You focus on getting the best achievable terms in any deal or negotiation. You identify leverage, walk-away points, and concessions worth trading, and you push back on accepting the first offer.',
    suggestedModel: modelForIndex(11),
    color: colorForIndex(11),
  },
  {
    name: 'The Recruiter',
    category: 'Business & Career',
    role: 'Hiring-manager perspective',
    rolePrompt:
      'You evaluate people and roles the way an experienced hiring manager would. You weigh fit, track record, and red flags, and you ask what evidence actually supports a hire or a career move.',
    suggestedModel: modelForIndex(12),
    color: colorForIndex(12),
  },
  {
    name: 'The Career Coach',
    category: 'Business & Career',
    role: 'Long-term trajectory',
    rolePrompt:
      'You think in terms of long-term career trajectory rather than the next role alone. You ask how a decision affects skills, reputation, and options 3-5 years out.',
    suggestedModel: modelForIndex(13),
    color: colorForIndex(13),
  },

  // ---------------------------------
  // Product & Tech
  // ---------------------------------
  {
    name: 'The Product Manager',
    category: 'Product & Tech',
    role: 'Prioritization & user value',
    rolePrompt:
      'You weigh user value against effort and prioritize ruthlessly. You ask what problem this actually solves for users and whether it is the highest-leverage thing to build right now.',
    suggestedModel: modelForIndex(14),
    color: colorForIndex(14),
  },
  {
    name: 'The Security Engineer',
    category: 'Product & Tech',
    role: 'Security & privacy',
    rolePrompt:
      'You look for security and privacy risks in any technical decision. You ask what could be exploited or leaked, and you insist on naming a mitigation before something ships.',
    suggestedModel: modelForIndex(15),
    color: colorForIndex(15),
  },
  {
    name: 'The UX Researcher',
    category: 'Product & Tech',
    role: 'Usability & real user behavior',
    rolePrompt:
      'You focus on how real users actually behave, not how they are assumed to behave. You flag confusing flows and push for validating assumptions with real usage instead of guesses.',
    suggestedModel: modelForIndex(16),
    color: colorForIndex(16),
  },

  // ---------------------------------
  // Money & Investing
  // ---------------------------------
  {
    name: 'The Financial Advisor',
    category: 'Money & Investing',
    role: 'Cost & ROI',
    rolePrompt:
      'You evaluate every option through cost, return on investment, and budget trade-offs. You ask what this costs in time and money, and whether the payoff justifies it.',
    suggestedModel: modelForIndex(17),
    color: colorForIndex(17),
  },
  {
    name: 'The Investor',
    category: 'Money & Investing',
    role: 'Growth & risk-adjusted upside',
    rolePrompt:
      'You think like an investor evaluating growth potential and risk-adjusted upside. You ask what the realistic best case, base case, and worst case look like before committing capital.',
    suggestedModel: modelForIndex(18),
    color: colorForIndex(18),
  },
  {
    name: 'The Frugal Budgeter',
    category: 'Money & Investing',
    role: 'Cost discipline',
    rolePrompt:
      'You default to the cheapest option that still works and question every recurring cost. You ask what could be cut or delayed without meaningfully hurting the outcome.',
    suggestedModel: modelForIndex(19),
    color: colorForIndex(19),
  },

  // ---------------------------------
  // Creative & Communication
  // ---------------------------------
  {
    name: 'The Creative',
    category: 'Creative & Communication',
    role: 'Lateral thinker',
    rolePrompt:
      'You generate unconventional, lateral-thinking alternatives that others would not consider. You deliberately challenge the obvious framing of the problem to find fresh angles.',
    suggestedModel: modelForIndex(20),
    color: colorForIndex(20),
  },
  {
    name: 'The Editor',
    category: 'Creative & Communication',
    role: 'Clarity of language',
    rolePrompt:
      'You focus on the clarity, tone, and structure of how something is communicated. You cut filler, tighten arguments, and flag anything that could be misread.',
    suggestedModel: modelForIndex(21),
    color: colorForIndex(21),
  },
  {
    name: 'The Brand Strategist',
    category: 'Creative & Communication',
    role: 'Public perception',
    rolePrompt:
      'You think about how a decision looks and sounds publicly, and whether it fits the intended brand or reputation. You flag anything that could be misread or land badly with an audience.',
    suggestedModel: modelForIndex(22),
    color: colorForIndex(22),
  },

  // ---------------------------------
  // Relationships & Wellbeing
  // ---------------------------------
  {
    name: 'The Coach',
    category: 'Relationships & Wellbeing',
    role: 'Motivation & confidence',
    rolePrompt:
      'You focus on motivation, confidence, and personal growth. You frame the discussion in terms of what would help the person asking actually follow through and feel capable of it.',
    suggestedModel: modelForIndex(23),
    color: colorForIndex(23),
  },
  {
    name: 'The Mediator',
    category: 'Relationships & Wellbeing',
    role: 'Conflict resolution',
    rolePrompt:
      'You look for common ground between conflicting interests or people. You reframe disagreements in terms both sides could accept and suggest compromises that preserve the relationship.',
    suggestedModel: modelForIndex(24),
    color: colorForIndex(24),
  },
  {
    name: 'The Empath',
    category: 'Relationships & Wellbeing',
    role: 'Emotional impact',
    rolePrompt:
      'You focus on the emotional impact and wellbeing implications of a decision, for the user and for anyone else it touches. You name feelings that might otherwise go unacknowledged.',
    suggestedModel: modelForIndex(25),
    color: colorForIndex(25),
  },

  // ---------------------------------
  // Legal & Risk
  // ---------------------------------
  {
    name: 'The Compliance Advisor',
    category: 'Legal & Risk',
    role: 'Legal & regulatory',
    rolePrompt:
      'You flag legal, regulatory, and contractual concerns before they become problems. You ask whether a plan is compliant and what liabilities it creates.',
    suggestedModel: modelForIndex(26),
    color: colorForIndex(26),
  },
  {
    name: 'The Contract Reviewer',
    category: 'Legal & Risk',
    role: 'Terms & fine print',
    rolePrompt:
      'You read the fine print. You flag unfavorable terms, hidden liabilities, and ambiguous clauses in any agreement, and you ask what happens in the failure case the contract does not cover.',
    suggestedModel: modelForIndex(27),
    color: colorForIndex(27),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/council-member-presets.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Verify no regressions in the onboarding modal**

Run: `npx tsc --noEmit 2>&1 | grep -E "council-member-presets|CouncilOnboardingModal"`
Expected: no output (the modal only reads `.name`, `.role`, `.rolePrompt`, `.suggestedModel`, `.color` — all still present, `category` is additive)

- [ ] **Step 6: Commit**

```bash
git add src/modules/agents/council-member-presets.ts tests/council-member-presets.test.ts
git commit -m "feat: categorize council member presets, rename Skeptic to Devil's Advocate, add 12 niche presets"
```

---

### Task 3: Add `pendingCouncilPromptDraft` to the store

**Files:**
- Modify: `src/modules/agents/types.ts:727-730` (state field), `src/modules/agents/types.ts:858-860` (action)
- Modify: `src/modules/agents/store.ts:237-239` (initial state), `src/modules/agents/store.ts:2368-2378` (setter)
- Test: `tests/council-pending-prompt.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `pendingCouncilPromptDraft: string | null` (state field), `setPendingCouncilPromptDraft: (draft: string | null) => void` (action) on `useAgentsStore` — consumed by Task 4 (`CouncilChatBar`) and Task 6/7 (onboarding confirm step).

- [ ] **Step 1: Write the failing test**

Create `tests/council-pending-prompt.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentsStore } from '@/modules/agents/store';

describe('pendingCouncilPromptDraft', () => {
  beforeEach(() => {
    useAgentsStore.setState({ pendingCouncilPromptDraft: null });
  });

  it('defaults to null', () => {
    expect(useAgentsStore.getState().pendingCouncilPromptDraft).toBeNull();
  });

  it('sets and clears the draft', () => {
    const { setPendingCouncilPromptDraft } = useAgentsStore.getState();

    setPendingCouncilPromptDraft('What should our Q3 roadmap be?');
    expect(useAgentsStore.getState().pendingCouncilPromptDraft).toBe('What should our Q3 roadmap be?');

    setPendingCouncilPromptDraft(null);
    expect(useAgentsStore.getState().pendingCouncilPromptDraft).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/council-pending-prompt.test.ts`
Expected: FAIL — `pendingCouncilPromptDraft` is `undefined`, not `null`, and `setPendingCouncilPromptDraft` is not a function.

- [ ] **Step 3: Add the field and action to the type definitions**

In `src/modules/agents/types.ts`, find this block (around line 727):

```typescript
  webResearchEnabled: boolean;          // Web Research aktiv?
  deepResearchEnabled: boolean;         // Deep Research aktiv?
  agentModeEnabled: boolean;            // Agent-Mode aktiv? (UI-only)
}
```

Replace it with:

```typescript
  webResearchEnabled: boolean;          // Web Research aktiv?
  deepResearchEnabled: boolean;         // Deep Research aktiv?
  agentModeEnabled: boolean;            // Agent-Mode aktiv? (UI-only)
  pendingCouncilPromptDraft: string | null; // Vom Eldest-Onboarding vorausgefuellter Chatbar-Entwurf
}
```

Then find this block (around line 858):

```typescript
  setWebResearchEnabled: (enabled: boolean) => void;
  setDeepResearchEnabled: (enabled: boolean) => void;
  setAgentModeEnabled: (enabled: boolean) => void;
}
```

Replace it with:

```typescript
  setWebResearchEnabled: (enabled: boolean) => void;
  setDeepResearchEnabled: (enabled: boolean) => void;
  setAgentModeEnabled: (enabled: boolean) => void;
  setPendingCouncilPromptDraft: (draft: string | null) => void;
}
```

- [ ] **Step 4: Add the initial state and setter to the store**

In `src/modules/agents/store.ts`, find (around line 237):

```typescript
      webResearchEnabled: false,
      deepResearchEnabled: false,
      agentModeEnabled: false,
```

Replace it with:

```typescript
      webResearchEnabled: false,
      deepResearchEnabled: false,
      agentModeEnabled: false,
      pendingCouncilPromptDraft: null,
```

Then find (around line 2368):

```typescript
      setWebResearchEnabled: (enabled) => {
        set({ webResearchEnabled: enabled });
      },

      setDeepResearchEnabled: (enabled) => {
        set({ deepResearchEnabled: enabled });
      },

      setAgentModeEnabled: (enabled) => {
        set({ agentModeEnabled: enabled });
      },
    }),
```

Replace it with:

```typescript
      setWebResearchEnabled: (enabled) => {
        set({ webResearchEnabled: enabled });
      },

      setDeepResearchEnabled: (enabled) => {
        set({ deepResearchEnabled: enabled });
      },

      setAgentModeEnabled: (enabled) => {
        set({ agentModeEnabled: enabled });
      },

      setPendingCouncilPromptDraft: (draft) => {
        set({ pendingCouncilPromptDraft: draft });
      },
    }),
```

Do **not** add `pendingCouncilPromptDraft` to the `partialize(...)` object further down in the same file (around line 2455) — it must stay out of persisted storage (see Global Constraints).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/council-pending-prompt.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Verify no regressions**

Run: `npx tsc --noEmit 2>&1 | grep -E "modules/agents/store\.ts|modules/agents/types\.ts"`
Expected: no output

- [ ] **Step 7: Commit**

```bash
git add src/modules/agents/types.ts src/modules/agents/store.ts tests/council-pending-prompt.test.ts
git commit -m "feat: add pendingCouncilPromptDraft store field for onboarding-to-chatbar handoff"
```

---

### Task 4: Consume the pending draft in CouncilChatBar

**Files:**
- Modify: `src/modules/agents/components/CouncilChatBar.tsx:351-390`

**Interfaces:**
- Consumes: `pendingCouncilPromptDraft`, `setPendingCouncilPromptDraft` from `useAgentsStore` (Task 3).

- [ ] **Step 1: Add the store selectors and a consuming effect**

In `src/modules/agents/components/CouncilChatBar.tsx`, find (around line 365-370):

```typescript
  const webResearchEnabled = useAgentsStore((state) => state.webResearchEnabled);
  const deepResearchEnabled = useAgentsStore((state) => state.deepResearchEnabled);
  const agentModeEnabled = useAgentsStore((state) => state.agentModeEnabled);
  const setWebResearchEnabled = useAgentsStore((state) => state.setWebResearchEnabled);
  const setDeepResearchEnabled = useAgentsStore((state) => state.setDeepResearchEnabled);
  const setAgentModeEnabled = useAgentsStore((state) => state.setAgentModeEnabled);
```

Replace it with:

```typescript
  const webResearchEnabled = useAgentsStore((state) => state.webResearchEnabled);
  const deepResearchEnabled = useAgentsStore((state) => state.deepResearchEnabled);
  const agentModeEnabled = useAgentsStore((state) => state.agentModeEnabled);
  const setWebResearchEnabled = useAgentsStore((state) => state.setWebResearchEnabled);
  const setDeepResearchEnabled = useAgentsStore((state) => state.setDeepResearchEnabled);
  const setAgentModeEnabled = useAgentsStore((state) => state.setAgentModeEnabled);
  const pendingCouncilPromptDraft = useAgentsStore((state) => state.pendingCouncilPromptDraft);
  const setPendingCouncilPromptDraft = useAgentsStore((state) => state.setPendingCouncilPromptDraft);
```

Then find the textarea-height effect (around line 378-383):

```typescript
  // Textarea-Höhe automatisch anpassen
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);
```

Add this new effect directly after it:

```typescript
  // Vorausgefuellten Prompt aus dem Eldest-Onboarding einmalig uebernehmen.
  // Wird sofort danach im Store geleert, damit er nicht in einen spaeteren
  // Council-Lauf durchsickert.
  useEffect(() => {
    if (pendingCouncilPromptDraft === null) {
      return;
    }

    setInput(pendingCouncilPromptDraft);
    setPendingCouncilPromptDraft(null);
  }, [pendingCouncilPromptDraft, setPendingCouncilPromptDraft]);
```

- [ ] **Step 2: Verify no regressions**

Run: `npx tsc --noEmit 2>&1 | grep -E "CouncilChatBar\.tsx"`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/modules/agents/components/CouncilChatBar.tsx
git commit -m "feat: consume pendingCouncilPromptDraft once in CouncilChatBar"
```

---

### Task 5: Preset library room button + categorized dropdown

**Files:**
- Create: `src/modules/agents/components/CouncilPresetLibraryDropdown.tsx`
- Modify: `src/modules/agents/components/AgentsModuleShell.tsx`

**Interfaces:**
- Consumes: `getNextAvailableCouncilSeatId` (Task 1), `COUNCIL_MEMBER_PRESETS`, `COUNCIL_PRESET_CATEGORIES` (Task 2), `useAgentsStore` state: `activeCouncilDraftSeatMembers`, `upsertActiveCouncilSeatMember`, `activeCouncilIsRunning`.
- Produces: `<CouncilPresetLibraryDropdown onClose={() => void} />` component, rendered conditionally from `AgentsModuleShell`.

- [ ] **Step 1: Create the dropdown component**

Create `src/modules/agents/components/CouncilPresetLibraryDropdown.tsx`:

```typescript
// ============================================
// CouncilPresetLibraryDropdown.tsx - Kategorisierte Preset-Bibliothek
//
// Zweck: Zeigt alle kuratierten Standard-Ratsmitglieder gruppiert
//        nach Kategorie. Klick auf ein Preset setzt es sofort auf
//        den naechsten freien Sitzplatz. Bleibt danach offen, damit
//        mehrere Presets nacheinander hinzugefuegt werden koennen.
// Verwendet von: AgentsModuleShell.tsx
// ============================================

'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useAgentsStore } from '../store';
import { getNextAvailableCouncilSeatId } from '../lib/council-seats';
import { COUNCIL_MEMBER_PRESETS, COUNCIL_PRESET_CATEGORIES } from '../council-member-presets';
import { normalizeOpenRouterModelId } from '@/lib/llm/model-catalog';
import type { CouncilSeatMemberData } from '../types';

interface CouncilPresetLibraryDropdownProps {
  onClose: () => void;
}

export function CouncilPresetLibraryDropdown({ onClose }: CouncilPresetLibraryDropdownProps) {
  const activeCouncilDraftSeatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const upsertActiveCouncilSeatMember = useAgentsStore((state) => state.upsertActiveCouncilSeatMember);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());

  const presetsByCategory = useMemo(() => {
    const grouped = new Map<string, typeof COUNCIL_MEMBER_PRESETS>();
    for (const category of COUNCIL_PRESET_CATEGORIES) {
      grouped.set(
        category,
        COUNCIL_MEMBER_PRESETS.filter((preset) => preset.category === category)
      );
    }
    return grouped;
  }, []);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const addPreset = (preset: (typeof COUNCIL_MEMBER_PRESETS)[number]) => {
    const seatId = getNextAvailableCouncilSeatId(activeCouncilDraftSeatMembers);
    const newMember: CouncilSeatMemberData = {
      seatId,
      name: preset.name,
      color: preset.color,
      model: normalizeOpenRouterModelId(preset.suggestedModel),
      role: preset.role,
      rolePrompt: preset.rolePrompt,
      sourceAgentId: null,
      skills: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    upsertActiveCouncilSeatMember(newMember);
    setAddedNames((prev) => new Set(prev).add(preset.name));
  };

  return (
    <div className="absolute inset-0 z-[95] flex items-center justify-center bg-slate-950/72 px-4 py-10 backdrop-blur-md">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="relative z-[1] flex max-h-[85vh] w-full max-w-xl flex-col rounded-[28px] border border-white/10 bg-[#08101d]/96 p-5 shadow-[0_20px_80px_rgba(2,6,23,0.5)] backdrop-blur-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/45">
              Preset-Bibliothek
            </div>
            <h3 className="mt-1 text-xl font-semibold text-white">Standard-Mitglied hinzufügen</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/55 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {COUNCIL_PRESET_CATEGORIES.map((category) => {
            const presets = presetsByCategory.get(category) || [];
            const isCollapsed = collapsedCategories[category] ?? false;

            return (
              <div key={category} className="rounded-2xl border border-white/10 bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
                    {category}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-white/40 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                  />
                </button>

                {!isCollapsed ? (
                  <div className="space-y-2 px-3 pb-3">
                    {presets.map((preset) => {
                      const alreadyAdded = addedNames.has(preset.name);
                      const initial = (preset.name.trim().charAt(0) || '?').toUpperCase();

                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => addPreset(preset)}
                          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: preset.color, boxShadow: `0 0 10px ${preset.color}60` }}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-white">{preset.name}</div>
                            <div className="text-[11px] text-white/45">{preset.role}</div>
                          </div>
                          {alreadyAdded ? (
                            <span className="shrink-0 rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] font-medium text-cyan-200">
                              Hinzugefügt
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the room button and dropdown into AgentsModuleShell**

In `src/modules/agents/components/AgentsModuleShell.tsx`, find the import block that already includes `CouncilOnboardingModal` (added in a previous session):

```typescript
import { CouncilOnboardingModal } from './CouncilOnboardingModal';
```

Add directly after it:

```typescript
import { CouncilPresetLibraryDropdown } from './CouncilPresetLibraryDropdown';
```

Find this existing state declaration:

```typescript
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
```

Add directly after it:

```typescript
  const [presetLibraryOpen, setPresetLibraryOpen] = useState(false);
```

Find this existing selector (around line 134):

```typescript
  const activeCouncilStage = useAgentsStore((state) => state.activeCouncilStage);
```

Add directly after it:

```typescript
  const activeCouncilIsRunning = useAgentsStore((state) => state.activeCouncilIsRunning);
```

Find the existing onboarding CTA block (added in a previous session, currently positioned at `top-44`):

```typescript
        {mode === 'council' && !selectedCouncilSeatId && activeCouncilDraftSeatMembers.length <= 1 ? (
          <div className="pointer-events-none absolute inset-x-0 top-44 z-40 flex justify-center px-4">
            <div
              className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1220]/90 px-4 py-3 shadow-[0_10px_40px_rgba(2,6,23,0.4)] backdrop-blur"
            >
              <span className="text-xs text-white/60">Neuer Council: Sitze manuell anlegen oder</span>
              <button
                type="button"
                onClick={() => setOnboardingModalOpen(true)}
                className="rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-3.5 py-2 text-xs font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20"
              >
                Mit Eldest planen
              </button>
            </div>
          </div>
        ) : null}

        {onboardingModalOpen ? (
          <CouncilOnboardingModal onClose={() => setOnboardingModalOpen(false)} />
        ) : null}
```

Replace it with:

```typescript
        {mode === 'council' && !selectedCouncilSeatId && !activeCouncilIsRunning ? (
          <div className="pointer-events-none absolute inset-x-0 top-44 z-40 flex justify-center px-4">
            <div
              className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1220]/90 px-4 py-3 shadow-[0_10px_40px_rgba(2,6,23,0.4)] backdrop-blur"
            >
              <span className="text-xs text-white/60">
                {activeCouncilDraftSeatMembers.length <= 1
                  ? 'Neuer Council: Sitze manuell anlegen,'
                  : 'Weiteres Mitglied:'}
              </span>
              <button
                type="button"
                onClick={() => setPresetLibraryOpen(true)}
                className="rounded-xl border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-medium text-white/80 transition-colors hover:border-white/20 hover:bg-white/15"
              >
                Aus Bibliothek hinzufügen
              </button>
              {activeCouncilDraftSeatMembers.length <= 1 ? (
                <>
                  <span className="text-xs text-white/60">oder</span>
                  <button
                    type="button"
                    onClick={() => setOnboardingModalOpen(true)}
                    className="rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-3.5 py-2 text-xs font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20"
                  >
                    Mit Eldest planen
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {onboardingModalOpen ? (
          <CouncilOnboardingModal onClose={() => setOnboardingModalOpen(false)} />
        ) : null}

        {presetLibraryOpen ? (
          <CouncilPresetLibraryDropdown onClose={() => setPresetLibraryOpen(false)} />
        ) : null}
```

- [ ] **Step 3: Verify no regressions**

Run: `npx tsc --noEmit 2>&1 | grep -E "CouncilPresetLibraryDropdown|AgentsModuleShell\.tsx\("`
Expected: only the single pre-existing `setTimeout` error on the `useEffect` cleanup around line ~215-220 (confirmed pre-existing in earlier session work via `git stash` diff) — no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/agents/components/CouncilPresetLibraryDropdown.tsx src/modules/agents/components/AgentsModuleShell.tsx
git commit -m "feat: add preset library room button with categorized dropdown"
```

---

### Task 6: Goal/prompt refinement step in the onboarding modal

**Files:**
- Modify: `src/modules/agents/components/CouncilOnboardingModal.tsx` (add `'refine'` step)
- Test: `tests/council-goal-prompt-parsing.test.ts`

**Interfaces:**
- Produces: a `parseGoalAndPrompt(raw: string): { goal: string; finalPrompt: string }` helper (exported for testing), a new `step` value `'refine'` between `'describe'` and `'propose'`.
- Consumes: `executeCouncilCompletion` (existing), `setActiveCouncilDraftName` and `setPendingCouncilPromptDraft` from `useAgentsStore` (Task 3).

- [ ] **Step 1: Write the failing test for the JSON parser**

Create `tests/council-goal-prompt-parsing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseGoalAndPrompt } from '@/modules/agents/components/CouncilOnboardingModal';

describe('parseGoalAndPrompt', () => {
  it('parses a clean JSON object', () => {
    const raw = '{"goal": "Decide on Q3 roadmap", "finalPrompt": "What should we prioritize in Q3?"}';
    expect(parseGoalAndPrompt(raw)).toEqual({
      goal: 'Decide on Q3 roadmap',
      finalPrompt: 'What should we prioritize in Q3?',
    });
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"goal": "Pick a name", "finalPrompt": "What should we name the product?"}\n```';
    expect(parseGoalAndPrompt(raw)).toEqual({
      goal: 'Pick a name',
      finalPrompt: 'What should we name the product?',
    });
  });

  it('throws when goal is missing', () => {
    expect(() => parseGoalAndPrompt('{"finalPrompt": "only a prompt"}')).toThrow();
  });

  it('throws when finalPrompt is missing', () => {
    expect(() => parseGoalAndPrompt('{"goal": "only a goal"}')).toThrow();
  });

  it('throws on invalid JSON', () => {
    expect(() => parseGoalAndPrompt('not json at all')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/council-goal-prompt-parsing.test.ts`
Expected: FAIL — `parseGoalAndPrompt` is not exported from `CouncilOnboardingModal.tsx`.

- [ ] **Step 3: Implement the parser and the new step**

In `src/modules/agents/components/CouncilOnboardingModal.tsx`, find the existing `parseProposedMembers` function and add this new function directly after it:

```typescript
export interface GoalAndPrompt {
  goal: string;
  finalPrompt: string;
}

export function parseGoalAndPrompt(raw: string): GoalAndPrompt {
  const withoutFences = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();

  const parsed = JSON.parse(withoutFences);
  const goal = typeof parsed?.goal === 'string' ? parsed.goal.trim() : '';
  const finalPrompt = typeof parsed?.finalPrompt === 'string' ? parsed.finalPrompt.trim() : '';

  if (!goal) {
    throw new Error('Antwort enthält kein "goal".');
  }
  if (!finalPrompt) {
    throw new Error('Antwort enthält keinen "finalPrompt".');
  }

  return { goal, finalPrompt };
}
```

Find the `step` state declaration:

```typescript
  const [step, setStep] = useState<'describe' | 'propose'>('describe');
```

Replace it with:

```typescript
  const [step, setStep] = useState<'describe' | 'refine' | 'propose'>('describe');
  const [goal, setGoal] = useState('');
  const [finalPrompt, setFinalPrompt] = useState('');
```

Find the `requestProposals` function. Its current body sends the raw `description` straight to the member-proposal call and jumps to `'propose'`. Replace the whole function with two functions — one for the new refine step, one for the (now second) propose step:

```typescript
  const requestGoalAndPrompt = async () => {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const systemPrompt = `You are the "Eldest" / chair of a new LLM council. The user will roughly describe what kind of council they want and what question(s) they plan to ask.

Turn this into a sharp, well-scoped council goal and a single well-crafted opening question to pose to the council.

Respond with STRICT JSON only, no markdown fences, no commentary, in exactly this shape:
{"goal": "a short, clear council goal/title, max ~8 words", "finalPrompt": "the actual opening question to send to the council, written clearly and completely"}`;

      const raw = await executeCouncilCompletion({
        messages: [{ role: 'user', content: trimmedDescription }],
        moduleId: 'master',
        model: DEFAULT_OPENROUTER_MODEL_ID,
        systemPrompt,
      });

      const parsed = parseGoalAndPrompt(raw);
      setGoal(parsed.goal);
      setFinalPrompt(parsed.finalPrompt);
      setStep('refine');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verfeinerung ist fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const requestProposals = async () => {
    const trimmedGoal = goal.trim();
    const trimmedFinalPrompt = finalPrompt.trim();
    if (!trimmedGoal || !trimmedFinalPrompt) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const systemPrompt = `You are the "Eldest" / chair of a new LLM council. The council's goal is: "${trimmedGoal}". The opening question will be: "${trimmedFinalPrompt}".

Propose 4 to 8 well-suited council members. Each member needs a distinct perspective relevant to this goal and question.

Respond with STRICT JSON only, no markdown fences, no commentary, in exactly this shape:
{"members": [{"name": "...", "role": "...", "rolePrompt": "2-3 sentences describing how this member thinks and argues", "suggestedModel": "provider/model-id", "reason": "1 short sentence why this member is useful here"}]}

Use OpenRouter-style model ids for suggestedModel, e.g. "openai/gpt-4o", "anthropic/claude-sonnet-4", "google/gemini-2.5-pro".`;

      const raw = await executeCouncilCompletion({
        messages: [{ role: 'user', content: `${trimmedGoal}\n\n${trimmedFinalPrompt}` }],
        moduleId: 'master',
        model: DEFAULT_OPENROUTER_MODEL_ID,
        systemPrompt,
      });

      const members = parseProposedMembers(raw);
      if (members.length === 0) {
        throw new Error('Es wurden keine Mitglieder vorgeschlagen.');
      }

      setProposedMembers(members);
      setSelectedProposedNames(new Set(members.map((member) => member.name)));
      setStep('propose');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vorschlag ist fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/council-goal-prompt-parsing.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/agents/components/CouncilOnboardingModal.tsx tests/council-goal-prompt-parsing.test.ts
git commit -m "feat: add goal/prompt refinement step to Eldest onboarding"
```

---

### Task 7: Wire the refine step into the modal UI and the confirm handler

**Files:**
- Modify: `src/modules/agents/components/CouncilOnboardingModal.tsx`

**Interfaces:**
- Consumes: `goal`, `finalPrompt`, `setGoal`, `setFinalPrompt`, `requestGoalAndPrompt`, `requestProposals`, `step` (all from Task 6).
- Produces: on confirm, calls `setActiveCouncilDraftName(goal)` and `setPendingCouncilPromptDraft(finalPrompt)` (Task 3/4's store fields) before closing.

- [ ] **Step 1: Pull in the two new store actions**

Find the existing store selectors near the top of the component body:

```typescript
  const activeCouncilDraftSeatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const upsertActiveCouncilSeatMember = useAgentsStore((state) => state.upsertActiveCouncilSeatMember);
```

Replace with:

```typescript
  const activeCouncilDraftSeatMembers = useAgentsStore((state) => state.activeCouncilDraftSeatMembers);
  const upsertActiveCouncilSeatMember = useAgentsStore((state) => state.upsertActiveCouncilSeatMember);
  const setActiveCouncilDraftName = useAgentsStore((state) => state.setActiveCouncilDraftName);
  const setPendingCouncilPromptDraft = useAgentsStore((state) => state.setPendingCouncilPromptDraft);
```

- [ ] **Step 2: Extend confirmSelection to persist the goal and hand off the prompt**

Find the end of the existing `confirmSelection` function:

```typescript
    for (const preset of selectedPresets) {
      const seatId = getNextAvailableCouncilSeatId(seatMembersSoFar);
      const newMember: CouncilSeatMemberData = {
        seatId,
        name: preset.name,
        color: preset.color,
        model: normalizeOpenRouterModelId(preset.suggestedModel),
        role: preset.role,
        rolePrompt: preset.rolePrompt,
        sourceAgentId: null,
        skills: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      upsertActiveCouncilSeatMember(newMember);
      seatMembersSoFar.push(newMember);
    }

    onClose();
  };
```

Replace the closing lines with:

```typescript
    for (const preset of selectedPresets) {
      const seatId = getNextAvailableCouncilSeatId(seatMembersSoFar);
      const newMember: CouncilSeatMemberData = {
        seatId,
        name: preset.name,
        color: preset.color,
        model: normalizeOpenRouterModelId(preset.suggestedModel),
        role: preset.role,
        rolePrompt: preset.rolePrompt,
        sourceAgentId: null,
        skills: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      upsertActiveCouncilSeatMember(newMember);
      seatMembersSoFar.push(newMember);
    }

    setActiveCouncilDraftName(goal.trim());
    setPendingCouncilPromptDraft(finalPrompt.trim());
    onClose();
  };
```

- [ ] **Step 3: Update the header title logic for the new step**

Find:

```typescript
              <h3 className="mt-1 text-xl font-semibold text-white">
                {step === 'describe' ? 'Was für einen Rat brauchst du?' : 'Vorgeschlagene Mitglieder'}
              </h3>
```

Replace with:

```typescript
              <h3 className="mt-1 text-xl font-semibold text-white">
                {step === 'describe'
                  ? 'Was für einen Rat brauchst du?'
                  : step === 'refine'
                    ? 'Ziel & Frage verfeinern'
                    : 'Vorgeschlagene Mitglieder'}
              </h3>
```

- [ ] **Step 4: Add the refine step body**

Find the body's step-conditional rendering:

```typescript
        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === 'describe' ? (
            <div className="space-y-4">
              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">
                  Erzähl mir, was für einen Rat du brauchst und welche Frage(n) du stellen willst.
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={8}
                  placeholder="z.B. Ich will einen Rat, der mir hilft zu entscheiden, ob ich mein Startup weiterführen oder einen Job annehmen soll. Ich werde Fragen zu Risiko, Finanzen und langfristiger Zufriedenheit stellen."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/25"
                />
              </label>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>
          ) : (
```

Replace with:

```typescript
        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === 'describe' ? (
            <div className="space-y-4">
              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">
                  Erzähl mir, was für einen Rat du brauchst und welche Frage(n) du stellen willst.
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={8}
                  placeholder="z.B. Ich will einen Rat, der mir hilft zu entscheiden, ob ich mein Startup weiterführen oder einen Job annehmen soll. Ich werde Fragen zu Risiko, Finanzen und langfristiger Zufriedenheit stellen."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/25"
                />
              </label>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>
          ) : step === 'refine' ? (
            <div className="space-y-4">
              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">Ziel</span>
                <input
                  type="text"
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium text-white/65">Finaler Prompt</span>
                <textarea
                  value={finalPrompt}
                  onChange={(event) => setFinalPrompt(event.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/25"
                />
              </label>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>
          ) : (
```

- [ ] **Step 5: Update the footer buttons per step**

Find the footer button block:

```typescript
        <div className="mt-4 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          {step === 'describe' ? (
            <button
              type="button"
              onClick={requestProposals}
              disabled={loading || !description.trim()}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Eldest überlegt…' : 'Vorschläge holen'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('describe')}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={confirmSelection}
                disabled={selectedCount === 0}
                className="rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {selectedCount} Mitglied{selectedCount === 1 ? '' : 'er'} übernehmen
              </button>
            </>
          )}
        </div>
```

Replace with:

```typescript
        <div className="mt-4 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          {step === 'describe' ? (
            <button
              type="button"
              onClick={requestGoalAndPrompt}
              disabled={loading || !description.trim()}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Eldest überlegt…' : 'Weiter'}
            </button>
          ) : step === 'refine' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('describe')}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={requestProposals}
                disabled={loading || !goal.trim() || !finalPrompt.trim()}
                className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? 'Eldest überlegt…' : 'Mitglieder vorschlagen'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('refine')}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={confirmSelection}
                disabled={selectedCount === 0}
                className="rounded-xl border border-cyan-400/20 bg-cyan-400/15 px-4 py-2.5 text-sm font-medium text-cyan-100 transition-colors hover:border-cyan-300/35 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {selectedCount} Mitglied{selectedCount === 1 ? '' : 'er'} übernehmen
              </button>
            </>
          )}
        </div>
```

- [ ] **Step 6: Verify no regressions**

Run: `npx tsc --noEmit 2>&1 | grep -E "CouncilOnboardingModal"`
Expected: no output

Run: `npx vitest run tests/council-goal-prompt-parsing.test.ts tests/council-seats.test.ts tests/council-member-presets.test.ts tests/council-pending-prompt.test.ts`
Expected: all PASS (18 tests total)

- [ ] **Step 7: Commit**

```bash
git add src/modules/agents/components/CouncilOnboardingModal.tsx
git commit -m "feat: wire refine step into onboarding modal UI and confirm handler"
```

---

### Task 8: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/alexandrarobuste/Desktop/llm-council && PORT=3010 npm run dev`

- [ ] **Step 2: Verify the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the 4 new test files from this plan (18 new assertions total) and all pre-existing tests unaffected.

- [ ] **Step 3: Verify the preset library button and dropdown**

In the browser at `http://localhost:3010`:
1. Start a new council (or use an existing empty one).
2. Confirm the "Aus Bibliothek hinzufügen" button is visible next to "Mit Eldest planen".
3. Click it, confirm all 10 categories render with their presets, collapse/expand a category.
4. Click "Devil's Advocate" under Critical Thinking — confirm it appears as a seated member in the 3D scene and shows "Hinzugefügt" in the dropdown.
5. Start a council run (any prompt) — confirm the library button disappears while `activeCouncilIsRunning` is true, and reappears once the run completes.

- [ ] **Step 4: Verify the goal/prompt refinement flow**

1. Open "Mit Eldest planen" on an empty council.
2. Type a description, click "Weiter".
3. Confirm the "Ziel & Frage verfeinern" step shows editable "Ziel" and "Finaler Prompt" fields, pre-filled from the Eldest's response.
4. Edit both fields, click "Mitglieder vorschlagen" — confirm member proposals appear.
5. Select some members, click "X Mitglieder übernehmen".
6. Confirm the council's name changed to your edited goal, and the chatbar's text input contains your edited final prompt — **not yet sent**.
7. Send the message manually and confirm the council still runs normally.

- [ ] **Step 5: Commit final verification notes (if any fixes were needed)**

If Steps 2-4 required any fixes, commit them individually with descriptive messages before considering this plan complete.
