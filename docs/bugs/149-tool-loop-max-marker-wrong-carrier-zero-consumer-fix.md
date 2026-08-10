# 149 Tool Loop Max Marker Wrong Carrier And Zero Renderer Consumption Fix

## Problem

- `maxToolRounds` (default 8) loop termination was invisible: the engine wrote `metadata.toolLoopMaxReached: true` onto the **wrong carrier** and no renderer consumed it.
- The loop-top break recipe targeted `draft.messages[len - 1]` — at break time that index is always the last `role:'tool'` message appended by `executeToolCalls`, NOT the assistant that triggered termination (that assistant, carrying `finishReason:'tool_calls'` + paired `tool_calls`, sits one position earlier).
- Result: a user watching an 8+ round tool workflow saw the loop stop with zero indication; two existing tests pinned the misplaced carrier with misleading comments (`engine-snapshot-write-path.test.ts` `at(-1)` = tool message; `engine-tool-loop.test.ts` comment calling the tool message "Last assistant").

## Diagnostic Method

- The audit (R1-F1, `docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`) originally claimed a "dangling tool_calls + infinite running card" shape on the loop-max path.
- Independent review + live re-check disproved that: the loop-top break runs AFTER the previous round's `executeToolCalls` completed (`rounds` increments after the break check; `tool-execution.ts` appends a paired `role:'tool'` message per call), so `isDanglingToolCallsMessage` returns false for the last assistant and the tool cards render committed terminal states — no dangling shape, no protocol risk.
- What remained true was (1) the marker landing on the tool message instead of the terminating assistant, and (2) zero renderer consumers (grep: only engine write + 2 tests).
- Decisive evidence: a focused engine test asserting the marker on the last assistant turned RED pre-fix (`expected undefined to be true`).

## Root Cause

- `create-engine.ts` loop-top break mutate recipe wrote the marker to the list tail (`len - 1`) instead of locating the terminating assistant (skip the `role:'tool'` tail).
- The renderer had no message-level consumption of `toolLoopMaxReached` — no termination note, no UI signal.

## Fix

- `create-engine.ts`: the loop-top break recipe now locates the **last assistant** by scanning backwards past `role:'tool'` messages, and replaces it with a fresh object carrying the marker (read-old → build-new → replace inside the mutate recipe — snapshot identity discipline preserved).
- `ai-message-list.tsx`: consumes the marker at message level — when the last assistant carries `toolLoopMaxReached`, renders a termination note (`data-slot="ai-message-list-loop-limit"`, i18n `flux.ai.toolLoopMaxReached`, non-error state, no action bar). The auto-scroll trigger includes the marker flag so the note scrolls into view.
- i18n: `flux.ai.toolLoopMaxReached` registered in `en-US.ts` / `zh-CN.ts`.
- Paired `tool_calls` are intentionally NOT stripped — tool results stay user-visible; the loop-max path has no dangling shape.

## Tests

- `engine/__tests__/engine-tool-loop.test.ts` — `tool-loop-max` test now asserts the marker on the last assistant (RED pre-fix) and that the tool tail carries none; new guard test `tool-loop-max: no dangling shape` asserts `isDanglingToolCallsMessage` false for every assistant (pins the corrected ⑩ enumeration: loop-max is NOT a dangling-cleanup surface).
- `engine/__tests__/engine-snapshot-write-path.test.ts` — snapshot-identity test updated to capture the marker-carrier (last assistant) element and assert the fresh-ref write discipline.
- `renderers/__tests__/ai-message-list-loop-termination.test.tsx` — real engine loop-max turn: termination note visible, tool cards in committed terminal status, no running-state illusion, no error affordance.

## Affected Files

- `packages/flux-renderers-ai/src/engine/create-engine.ts`
- `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`
- `packages/flux-i18n/src/locales/en-US.ts`, `zh-CN.ts`
- Tests above.

## Notes For Future Refactors

- The marker's carrier contract is: **the assistant that triggered termination** (last assistant, skipping the tool tail). Both the engine write (`create-engine.ts` loop-top break) and the renderer consumer (`ai-message-list.tsx`) locate it the same way — keep them mirrored.
- If a future refactor makes `executeToolCalls` return early without appending paired `role:'tool'` messages, the `tool-loop-max: no dangling shape` guard test turns red — that is the signal that the loop-max path has become a real dangling-cleanup surface (⑩ fourth surface), not a reason to weaken the guard.
- The termination note is a non-error state: do not give it error styling or a retry action bar.
