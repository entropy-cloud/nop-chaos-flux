# 131 AI Engine Dangling Tool Calls Residue + Late Tool Commit After Abort (P1-1/P1-2)

## Problem

- **P1-2** — a `tool_calls` assistant message with NO paired `role:'tool'` response (abort-in-window / tool-no-executor / abort-mid-executor) was committed in full and flowed into the next request payload and the autoSave snapshot. Strict OpenAI-compatible backends 400 unpaired `tool_calls` → the retry loop failed repeatedly; a remount rehydrated the corrupted history.
- **P1-1** — `executeToolCalls` only checked `abortController.signal.aborted` at the loop top. An abort that fired while the tool executor was suspended committed the late `role:'tool'` result message and per-call UI state AFTER the turn already reached terminal `'aborted'` (signal-aware reject → AbortError, or signal-ignoring resolve → success — both committed).
- Probe evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P1-1/P1-2 + open-audit P1-1-adjacent surface.

## Diagnostic Method

- Diagnosis difficulty: medium — the dangling shape only appears across the three cleanup surfaces; the vacuous-residue predicate (`isVacuousAssistantResidue`, `!finishReason`) did NOT cover it because dangling rounds DO carry `finishReason:'tool_calls'` (content-agnostic gap).
- Investigation path:
  1. `create-engine.ts:531-547` commit order (`onAfterRequest` → `commitOrDropResidue` → abort check) — the abort-in-window assistant survived.
  2. `:289-308` tool-no-executor branch returned with the assistant committed.
  3. `:317-320` runTurn `!shouldContinue` return (Phase 1 fix path) — assistant already committed; this is the only fallback surface where `commitOrDropResidue` (:534) kept it (finishReason='tool_calls' → not vacuous).
  4. Decisive evidence: 5 RED regression tests (abort-in-window / tool-no-executor / payload+autoSave arms / interleaved strip / abort-mid-executor next-turn).

## Root Cause

- The residue predicate was **content-agnostic-blind**: both `isStreamingAssistantPlaceholder` (requires `content===''` + loading) and `isVacuousAssistantResidue` (requires `!finishReason`) miss "assistant + tool_calls + finishReason='tool_calls' + no paired tool response" — including the standard interleaved text+tool_calls shape.
- `executeToolCalls` had no post-await abort check between the executor settlement and its two commit points (UI-state mutate + tool-message push).

## Fix

- `tool-execution.ts` — second abort check AFTER `await toolExecutor(...)` and before both commits; aborted calls skip both commits and short-circuit `false` (calls completed before the abort keep their commits).
- `utils.ts` — new content-agnostic predicate family `isDanglingToolCallsMessage` / `cleanDanglingToolCalls` / `sanitizeDanglingToolCalls`: fully dangling → drop (empty content) or strip `tool_calls` keeping text; partially paired → strip only the unpaired entries (never the whole array — already-committed tool messages stay paired).
- `create-engine.ts` — three cleanup surfaces unified through `cleanDanglingAssistantAt` (runOnce abort branch / tool-no-executor / runTurn abort-mid-executor return); `buildContext` projection + `use-conversation.ts` autoSave arm apply the same predicate. Deliberately NOT placed inside `commitOrDropResidue` (its early execution would strip legitimate tool rounds' owner messages).
- Gate: invariant ⑩ extended with the dangling member (5 members in `engine-invariants-i4.test.ts` + autoSave arm in `conversation-invariants-i4.test.ts`).

## Tests

- `packages/flux-renderers-ai/src/engine/__tests__/engine-tool-loop.test.ts` — late-commit-after-abort regression (both executor behaviors).
- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants-i4.test.ts` — Invariant ⑩ dangling block (5 members).
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-i4.test.ts` — autoSave arm.
- All RED before the fix (5/5), GREEN after; full suite green.

## Affected Files

- `packages/flux-renderers-ai/src/engine/tool-execution.ts`
- `packages/flux-renderers-ai/src/engine/create-engine.ts`
- `packages/flux-renderers-ai/src/engine/utils.ts`
- `packages/flux-renderers-ai/src/adapters/use-conversation.ts` (autoSave strip arm)

## Notes For Future Refactors

- Any new "assistant product commit/cleanup" path must route through the ⑩ predicate family (vacuous + dangling) — a fourth cleanup surface must update both `commitOrDropResidue` call sites AND the `buildContext`/autoSave projection arms.
- `isVacuousAssistantResidue` and the dangling predicates are intentionally separate members (different trigger shapes); do not merge.
