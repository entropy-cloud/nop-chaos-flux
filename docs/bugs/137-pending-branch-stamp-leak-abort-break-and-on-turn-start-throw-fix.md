# 137 PendingBranchId Leak via Abort Break / onTurnStart Throw Paths (multi P2-1, ⑧ gate expansion)

## Problem

- `pendingBranchId` (stamped by `regenerate`) leaked out of a turn that exited BEFORE `runOnce` consumed it, and the next UNRELATED `sendMessage` consumed the stale stamp — its assistant message was wrongly tagged `metadata.branchId` (branch mis-grouping + regenerate sequence shift; metadata-level, no data loss).
- Two leak paths beyond the already-fixed connector-missing early return: (a) abort while the turn hangs in a gated `plugin.onTurnStart` — the while-head `if (signal.aborted) break` exits before `runOnce`; (b) `plugin.onTurnStart` rejection — the catch settles the turn as `error` without clearing the stamp.
- Evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P2-1.

## Diagnostic Method

- Diagnosis difficulty: low-medium — the consumption contract (`pendingBranchId = undefined` inside `runOnce`) is a single write; the audit diff was "which pre-runOnce exit paths exist". The static scanner `scanBranchStampReset` only matched `return;` paths, which is exactly why these two paths were missed.
- Decisive evidence: three `it.fails` RED members — abort-break arm (regenerate → abort during gated onTurnStart → next sendMessage stamped), throw arm (regenerate → onTurnStart rejects → next sendMessage stamped), regenerate-sequence arm (the leaked stamp consumed by an unrelated turn shifts the next regenerate's derived id `branch-1` → `branch-2`).

## Root Cause

- `pendingBranchId` is consumed only by `runOnce` (`create-engine.ts` consumption surface). Any runTurn exit between `regenerate`'s stamp write and the first `runOnce` call leaves the stamp pending; the scanner's `return;`-only rule made break/throw exits invisible to the gate.

## Fix

- `create-engine.ts` reset surface extended to match the invariant: (1) the abort while-head break clears the stamp before `break`; (2) the runTurn catch clears the stamp (covers the onTurnStart throw path; harmless when already consumed). Same semantics as the connector-missing clear.
- ⑧ gate expansion (ratchet monotonic): static scanner `scanBranchStampReset` now enforces three rules — early `return` prefix clear (original), `break` prefix clear (loop-head or break-preceded), and pre-runOnce plugin-await try regions whose catch must clear; runtime parameterized members +3 (`it.fails` → `it` flip).
- Same-surface comment truthfulness (open P2-6): `getMessages`' O-2 comment claimed the engine never in-place mutates nested objects — false during streaming (`applyChunk` → `combineDeltaData` merges the in-flight assistant's nested `tool_calls`/content in place, and after the first per-chunk `commitAssistant` the draft is rebound to the live state element). Comment rewritten to describe the real per-chunk-commit semantics (benign render-consistency-wise) and warn snapshot readers against holding nested refs across turns.

## Tests

- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants-p2.test.ts` — ⑧ multi P2-1 block +3 members (break / throw / regenerate-sequence arms; `it.fails` RED → `it` GREEN; AI package 71 files / 620 tests green).
- `scripts/__tests__/find-ai-engine-invariant-violations.test.ts` — committed fixtures +4 (⑧ break violating/clean + ⑧ throw violating/clean; 13 → 17 cases).
- `pnpm check:ai-engine-invariants` — live zero hits after the fix.

## Affected Files

- `packages/flux-renderers-ai/src/engine/create-engine.ts`
- `scripts/audit/find-ai-engine-invariant-violations.mjs`
- `scripts/__tests__/find-ai-engine-invariant-violations.test.ts`
- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants-p2.test.ts`

## Notes For Future Refactors

- Any NEW pre-runOnce exit path in `runTurn` must clear `pendingBranchId` — the scanner's break/throw rules now catch it statically; keep the rules, never weaken them (ratchet).
- The stamp lifecycle is: writer `regenerate` → consumer `runOnce` (once per turn, tool-loop follow-ups stay untagged) → resets at every pre-runOnce exit. A future refactor moving the consumption point must re-audit all exit paths.
- `getMessages()` nested refs are NOT isolated during streaming — snapshot readers must not hold nested references across turns.
