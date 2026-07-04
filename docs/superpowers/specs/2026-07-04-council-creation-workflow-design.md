# Council Creation Workflow: Preset Library + Goal/Prompt Refinement

## Context

Two follow-up improvements to the council-creation experience (Eldest onboarding was built in a previous session):

1. Right now, adding a "proven useful" council member (e.g. a devil's advocate) requires either manual seat configuration or going through the full Eldest-onboarding chat. The user wants a curated library of 10-15+ standard member archetypes, grouped by category, addable directly from a button in the 3D council room — independent of the onboarding flow.
2. The existing Eldest-onboarding modal jumps straight from a single free-text description to member proposals. The user wants an intermediate step where the Eldest proposes a refined **goal** and **final prompt**, which the user can edit before member proposals are generated — so the council ends up with a clearer target and a better-crafted opening question.

## Part 1 — Preset Library

### Content
`src/modules/agents/council-member-presets.ts` gets a `category: string` field added to `CouncilMemberPreset`. Existing 15 presets are re-sorted into 4 generalist categories, with "The Skeptic" renamed to "Devil's Advocate":

- **Critical Thinking**: Devil's Advocate, Risk Analyst, The Simplifier
- **Strategy & Vision**: The Pragmatist, The Visionary, The Strategist
- **People & Ethics**: The Ethicist, The User Advocate
- **Analysis & Expertise**: The Data Analyst, The Domain Expert, The Historian

12 new presets fill 6 niche categories (2-3 members text drafted during implementation, following the existing preset style — 2-3 sentence `rolePrompt`, rotating `suggestedModel`, distinct `color`):

- **Business & Career**: The Negotiator, The Recruiter, The Career Coach
- **Product & Tech**: The Product Manager, The Security Engineer, The UX Researcher
- **Money & Investing**: The Financial Advisor (moved here), The Investor, The Frugal Budgeter
- **Creative & Communication**: The Creative (stays), The Editor, The Brand Strategist
- **Relationships & Wellbeing**: The Coach (moved here), The Mediator, The Empath
- **Legal & Risk**: The Compliance Advisor (stays), The Contract Reviewer

A `COUNCIL_PRESET_CATEGORIES: string[]` ordered constant drives consistent category grouping/ordering in the dropdown UI.

### Shared seat-allocation util
`getNextAvailableCouncilSeatId` currently lives inline in `CouncilOnboardingModal.tsx`. It's used by two features now (onboarding + library), so it moves to a new shared file `src/modules/agents/lib/council-seats.ts`. Both call sites import from there. Pure extraction, no behavior change.

### UI: room button + categorized dropdown
A new persistent button renders in `AgentsModuleShell.tsx`, visible when `mode === 'council' && !activeCouncilIsRunning` (i.e. during setup/editing, hidden while a deliberation is actively running, reappears after). Positioned near the existing onboarding CTA banner, but not mutually exclusive with it — both can show at once when the council is still empty.

Clicking it opens a new `CouncilPresetLibraryDropdown` component: a scrollable panel grouped by category (collapsible sections, matching the visual pattern of the onboarding modal's preset checklist but as a browse/click-to-add list instead of checkboxes). Clicking a preset immediately calls `getNextAvailableCouncilSeatId` + `upsertActiveCouncilSeatMember` to seat it, then the dropdown stays open so multiple presets can be added in sequence (closes via an explicit close button or clicking outside).

No inline editing in the dropdown. Editing an added member happens through the existing seat-click → `CouncilSeatModalHost` edit flow, unchanged.

## Part 2 — Goal & Prompt Refinement Step

`CouncilOnboardingModal.tsx` gets a new step inserted between `'describe'` and `'propose'`: `'refine'`.

### Flow
1. **Describe** (unchanged): free-text description of what kind of council and question(s) the user wants.
2. **Refine** (new): on submit, call `executeCouncilCompletion` (non-streaming, same pattern as the existing member-proposal call) with a system prompt asking the Eldest to return strict JSON: `{"goal": "...", "finalPrompt": "..."}` — a short council goal/title and a well-crafted opening question derived from the user's description. Render two editable fields pre-filled with the response: "Ziel" (goal) and "Finaler Prompt" (finalPrompt). The user can freely edit either before continuing. A "Zurück" button returns to the describe step (existing pattern).
3. **Propose** (existing, adjusted): the member-proposal system prompt now receives the refined `goal` + `finalPrompt` (instead of just the raw description) as context, so suggested members are grounded in the sharpened target.
4. **Confirm** (existing step, extended): in addition to creating the selected seats, this step now also:
   - Sets the council name to `goal` via `setActiveCouncilDraftName`.
   - Writes `finalPrompt` into a new store field so the council chatbar picks it up.

### Prompt handoff to the chatbar
`CouncilChatBar.tsx` manages its input as local `useState`, with no existing channel for another component to inject a draft. A new field is added to the agents store: `pendingCouncilPromptDraft: string | null` + `setPendingCouncilPromptDraft`. On confirm, the onboarding modal sets this field instead of directly manipulating chatbar state. `CouncilChatBar` reads it once via a `useEffect` (on mount / when it becomes non-null), calls its local `setInput(pendingCouncilPromptDraft)`, then immediately clears the store field (`setPendingCouncilPromptDraft(null)`) so it only fires once and doesn't leak into a later, unrelated council session. The prompt is **not** auto-sent — the user reviews it in the input box and sends manually, same as any other message.

### Error handling
Both the refine step and the propose step can fail to produce parseable JSON. Each gets the same treatment already built for the existing propose step: inline error message + a retry button that re-runs the same request, no silent fallback.

## Files touched

**New:**
- `src/modules/agents/lib/council-seats.ts` (extracted `getNextAvailableCouncilSeatId`)
- `src/modules/agents/components/CouncilPresetLibraryDropdown.tsx`

**Modified:**
- `src/modules/agents/council-member-presets.ts` (categories, rename, 12 new presets)
- `src/modules/agents/components/CouncilOnboardingModal.tsx` (new `'refine'` step, import shared seat util instead of local copy)
- `src/modules/agents/components/AgentsModuleShell.tsx` (new library button + dropdown host)
- `src/modules/agents/store.ts` (`pendingCouncilPromptDraft` field + setter)
- `src/modules/agents/components/CouncilChatBar.tsx` (consume `pendingCouncilPromptDraft` once on mount)
- `src/modules/agents/types.ts` (store type additions if the `AgentsStore` type is hand-maintained there)

## Verification
1. `npx tsc --noEmit` — no new errors (diff-check against baseline as done earlier in this project).
2. Manual: open a fresh council, use the new library button, add 2-3 presets from different categories via the dropdown, confirm they appear as seated members and remain editable via the normal seat-click flow.
3. Manual: confirm the library button disappears while a council run is active (`activeCouncilIsRunning`) and reappears once it finishes.
4. Manual: run the full onboarding flow — describe → verify the refine step shows editable, pre-filled Goal/Prompt fields → edit both → proceed → select some proposed + preset members → confirm → verify the council is renamed to the (possibly edited) goal, and the chatbar input contains the (possibly edited) final prompt without having been sent automatically.
5. Manual: trigger a JSON-parse failure path (e.g. by temporarily forcing an error) for both the refine and propose steps to confirm the retry button works.
