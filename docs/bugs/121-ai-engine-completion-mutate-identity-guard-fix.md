# 121 AI Engine Completion Mutate Missing Controller Identity Guard (K1)

## Problem

- `abort()` called while a turn is suspended in `plugin.onTurnStart` (try-outer) → synchronous reset (`requestState='aborted'`, `isProcessing=false`) → a new `sendMessage` starts a new turn with a new controller → the stale turn resumes and its completion mutate writes `'completed'`/`isProcessing=false` **over the new turn's in-flight state**; a third send then passes the entry guard and two turns stream concurrently.
- Probe evidence: `docs/audits/ai-invariants/cycle1-findings.md` K1 — probe-A RED (`isProcessing=false, requestState='completed'` while turn-2 mid-stream).

## Diagnostic Method

- Diagnosis difficulty: medium — only visible through an abort→send interleaving window (abort while suspended in a plugin hook that runs outside the `try`).
- Investigation path:
  1. I2 audit walked the full turn lifecycle: `runTurn` catches (`create-engine.ts:340`) / `runOnce` catch (`:490`) / finally (`:354`) all had controller-identity guards, the success-path completion mutate (`:324`) had only the `requestState === 'aborted'` string check.
  2. The catch/finally guards were added for the 1757 P1 abort→send race; the success path was the only unguarded terminal write.
  3. Decisive evidence: probe-A (scripted abort-during-onTurnStart + immediate send) reproduced the clobber.

## Root Cause

- The completion-path mutate (`create-engine.ts:324-334`) relied solely on `draft.requestState === 'aborted'` as its guard. `abort()` resets the state synchronously, so the stale turn's completion saw the NEW turn's `'processing'` state (not `'aborted'`) and proceeded to write `'completed'`.
- The invariant ③ guard pattern (`draft.abortController !== abortController → return`) existed on catch/finally paths but not on the success path — a sibling-instance miss.

## Fix

- Added the additive identity guard to the completion mutate: `if (draft.abortController !== abortController) return;` (kept the existing `requestState === 'aborted'` early return). A stale turn can no longer write `'completed'` over a newer turn's controller/state — parity with the catch/finally paths (`create-engine.ts:330`).
- Category sweep (all terminal-state `adapter.mutate('requestState')` recipes): `:217` connector-missing is a synchronous early-return path with no await before it (no concurrency window — recorded); `:294` tool-no-executor sits between `runOnce` outcome checks with no await (no window — recorded); `:548` abort() always targets the controller it just aborted (safe by construction — recorded); all other recipes carry the identity guard.

## Tests

- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants.test.ts` — "completion-path identity guard: stale turn completion does not clobber a new turn (abort during onTurnStart)" (probe-A scenario, RED before fix) + "completion-path guard preserves aborted terminal state when no new send follows" (guard-preservation assertion).
- `scripts/__tests__/find-ai-engine-invariant-violations.test.ts` — K1 fixture: completion mutate without identity guard → exit 1; clean fixture covers the guarded form.
- `scripts/audit/find-ai-engine-invariant-violations.mjs` — `scanCompletionIdentityGuard` (success-path rule).

## Affected Files

- `packages/flux-renderers-ai/src/engine/create-engine.ts`
- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants.test.ts`
- `scripts/audit/find-ai-engine-invariant-violations.mjs`
- `scripts/__tests__/find-ai-engine-invariant-violations.test.ts`

## Notes For Future Refactors

- Every terminal-state write recipe in `runTurn`/`runOnce` must carry the controller-identity guard — the scanner only covers the `'completed'` recipe statically; new terminal recipes (e.g. a new outcome kind) must follow the same pattern.
- Plugin hooks that run OUTSIDE the try (like `onTurnStart`) are the dangerous suspension points for abort→send races — any new try-outer await needs the same stale-turn analysis.
