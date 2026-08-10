# 130 AI Engine Plugin Hook Error Isolation (K-⑨-1)

## Problem

- **K-⑨-1** — an aborted turn whose `plugin.onTurnEnd` rejects: the finally's `await plugin.onTurnEnd` propagated the rejection out of `runTurn` → the **host-facing `sendMessage` promise rejected** even though the state had already landed `'aborted'` — `void engine.sendMessage()` = unhandled rejection.
- Sibling members fixed in the same sweep: `onTurnStart` rejection stuck `processing` (hook ran outside the try); a throwing `plugin.onError` skipped the error-state write (hook ran before the mutate and propagated).
- Probe evidence: `docs/audits/ai-invariants/cycle2-findings.md` K-⑨-1 (round-02 P5, RED) + registered members ⑨×3 (probe-4 / probe-E / onTurnEnd static evidence).

## Diagnostic Method

- Diagnosis difficulty: medium — the abort variant needs a gated stream + a rejecting onTurnEnd; the sibling members need hook-throwing plugins.
- Investigation path:
  1. `create-engine.ts:362-364` (`finally { await plugin.onTurnEnd }`) was confirmed unguarded — the only hook call outside any error isolation.
  2. `:247-249` (`onTurnStart` before the try) and `:336-340` (`onError` before the mutate) were confirmed as the sibling gaps.
  3. Decisive evidence: P5 RED (aborted 轮 + onTurnEnd reject → promise reject) + the ⑨×3 registered `it.fails`.

## Root Cause

- Plugin hooks were called with no error isolation: rejections propagated to the host-facing promise and could skip engine state writes; `onTurnStart` sat outside the try/finally cleanup surface.

## Fix

- `create-engine.ts`:
  1. `onTurnStart` moved INSIDE the try — a rejection now settles the turn via the catch path (state write), not by sticking `processing`.
  2. New `callPluginError` helper wraps every `plugin.onError` call site (connector-missing / tool-no-executor / runTurn catch / runOnce catch) — a throwing onError can neither skip the state write nor reject the host promise.
  3. The finally's `onTurnEnd` loop isolates rejections: recorded via `lastError` only when the turn has no prior error (a failed round keeps its original error; an aborted round records the teardown failure without changing its terminal state). **K-⑨-1: the host-facing promise never rejects from onTurnEnd.**
- Registered red ⑧ cleared in the same file: the connector-missing early return now clears `pendingBranchId` before returning (bug note family ⑩ scope, probe-3 leak).

## Tests

- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants.test.ts` — Invariant ⑨ block: 3 registered members flipped `it.fails`→`it` + 1 new abort-variant member (K-⑨-1: aborted turn + onTurnEnd rejection → promise resolves, state 'aborted'); Invariant ⑧ `it.fails` flipped `it`; all RED before the fix.

## Affected Files

- `packages/flux-renderers-ai/src/engine/create-engine.ts`
- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants.test.ts`

## Notes For Future Refactors

- All six plugin hook call sites are now inside the cleanup surface or an isolation wrapper (onTurnStart try-in / onBeforeRequest wrapper / onError helper / onCompletionChunk+onAfterRequest try-in / onTurnEnd isolated). New hook call sites must follow the same pattern.
- `callPluginError` isolates per-plugin — a new plugin loop should reuse it rather than re-inline raw `plugin.onError?.()` calls.
