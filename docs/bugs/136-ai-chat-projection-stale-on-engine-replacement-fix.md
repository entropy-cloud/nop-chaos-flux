# 136 AI Chat Projection Snapshot Stale on Engine Replacement (P1-6 + P2-14 same-surface ghost)

## Problem

- After switching sessions (engine swap), `clear()`, or `setMessages` rehydration, the `${messages}` host-scope projection kept showing the PREVIOUS conversation's data indefinitely — header / beforeMessages / afterMessages / footer / emptyState regions bound to `${messages}` were stale until the next turn boundary (possibly never).
- Mechanism: the projection snapshot rebuilt only on the `isProcessing` true→false flip; engine replacement surfaces (session switch / rehydrate / clear) are all double-idle (`prevIsProcessing === isProcessing`) → snapshot never re-cloned.
- Evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P1-6 (+ P2-14 same-surface abort-ghost window).

## Diagnostic Method

- Diagnosis difficulty: low-medium — the trigger condition is a single `if (prevIsProcessing !== isProcessing)`; the missing surfaces are the engine's non-turn message-replacement paths (`setMessages`/`clear`/external engine prop swap). The subtle half is the engine's in-place mutation semantics: `state-adapter.ts` `mutate` runs the recipe on `this.state` directly — `push`/`splice` keep the SAME array reference, only whole-array replacement (`draft.messages = [...]`) changes it.
- Decisive evidence: RED regressions — engine swap (double idle) kept session A's projection; `clear()`/`setMessages` did not refresh.

## Root Cause

- The projection rebuild trigger tracked only the turn-boundary flip; message-replacement surfaces that never flip `isProcessing` left the snapshot permanently stale.

## Fix

- `ai-chat.tsx` projection state extended to `{ prevIsProcessing, prevRequestState, snapSourceRef, snapLength, snap }`; rebuild triggers:
  1. `isProcessing` flip (turn boundary, unchanged);
  2. `requestState` entering a terminal state (completed/aborted/error);
  3. messages ARRAY REFERENCE change while idle (clear/setMessages/engine swap replace the array inside the mutate recipe);
  4. messages LENGTH change while idle — covers in-place `splice` residue drops (`commitOrDropResidue`) that keep the same array ref; this also closes the P2-14 watch-only window: the abort boundary flip can capture the vacuous placeholder, but the subsequent residue-drop notify triggers a second idle rebuild that removes the ghost.
- Cost discipline preserved: streaming chunks never clone (`snapSourceRef`/`snapLength` converge to the live identity each render without cloning, so the guard never re-fires mid-stream); clone cost only at boundary / terminal / idle set change.

## Tests

- `ai-chat-projection.test.tsx` — P1-6 block (4 tests): engine swap (double idle), `clear()`, `setMessages` rehydration, P2-14 abort-ghost (zero-chunk abort-aware connector — final projection has no vacuous assistant placeholder; committed user message kept).
- Test-order note: the new P1-6 suite sits at the file END — running before the existing P1#2 turn-boundary suite polluted it (state leak), an order dependency discovered and worked around.
- RED→GREEN evidence: 3 failed pre-fix (swap / clear / rehydrate) → all green; AI package 70 files / 612 tests.

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-chat-projection.test.tsx`

## Notes For Future Refactors

- The projection is a boundary/terminal/idle-set-change snapshot, NOT a live feed — any new "engine state mirror" in ai-chat must compare against these same signals (requestState terminal / array-ref / length) or it will go stale on engine swap.
- The engine mutates `messages` in place inside `state-adapter` recipes (`splice` keeps the array ref) — reference-identity signals alone miss in-place changes; the idle `length` signal is required and must stay.
- Streaming clone discipline: keep `snapSourceRef`/`snapLength` converging to the live identity each render without cloning — reintroducing per-chunk clones regresses turn-boundary cost.
