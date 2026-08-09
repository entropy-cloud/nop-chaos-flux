# 123 AI Conversation Save-After-Delete/ClearAll Ghost Re-Landing (K3)

## Problem

- An in-flight `saveMessages` (started before `deleteConversation`/`clearAll`, resolving after the storage deletion) re-wrote the deleted conversation's messages into storage → orphan ghost messages on remount (conversation record gone, messages present).
- `clearAll`'s abort loop ran BEFORE `detachEngine`, so the abort's `requestState` transition fired the still-attached auto-save callback → the aborted snapshot re-landed after the storage fan-out cleared it.
- Probe evidence: `docs/audits/ai-invariants/cycle1-findings.md` K3 — probe-6 RED (delete 后 storage 仍含已删会话消息).

## Diagnostic Method

- Diagnosis difficulty: high — a cross-promise timing bug (save resolves after delete) invisible to the existing storage tests, which used call-counting mocks without controllable resolve ordering.
- Investigation path:
  1. I2 audit compared `attachAutoSave`'s fire-and-forget `saveMessages` against `deleteConversation`/`clearAll` storage deletion timings.
  2. Traced `clearAll` ordering: abort loop (`:394-398`) → `detachEngine` (`:399`) — the abort-triggered subscription callback starts a new save that lands after the storage clear.
  3. Decisive evidence: probe-6 (scripted storage with controllable resolve order) — late save re-landed messages for the deleted conversation (RED).

## Root Cause

- Auto-save was fire-and-forget with no ordering guarantee against storage deletion:
  1. `saveMessages` and `deleteConversation` raced — no drain, so a save that started before the delete could land after it.
  2. `clearAll`'s sync signature (`(): void`) could not await anything, and its abort-before-detach order let the abort-triggered callback start a fresh save of the aborted snapshot.

## Fix

- `use-conversation.ts`:
  1. Per-conversation in-flight save chain: `pendingSavesRef` — `attachAutoSave` chains each `saveMessages` onto the conversation's previous pending promise (a rejection settles first, then the next save runs; errors still route through `reportStorageError`).
  2. Mechanism split by method signature: `deleteConversation` (async) `await Promise.allSettled` on the conversation's pending save **before** `storage.deleteConversation`; `clearAll` (sync `(): void`, API unchanged) chains the storage clear behind the drain (`drain.then(...)`), preserving per-id `.catch` → `reportStorageError` fan-out (invariant ④).
  3. `clearAll` reordered: `detachEngine` (unsubscribe) **before** the abort loop — an abort-triggered auto-save callback can no longer start a new save.

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants.test.ts` — invariant ④ (K3) block: "delete during an in-flight save: the late save never re-lands as a ghost" + "clearAll while a turn is processing: the aborted snapshot never lands, storage ends empty" (both RED before the fix; assert storage final state, not promise ordering).

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants.test.ts`

## Notes For Future Refactors

- Every auto-save must be chained onto `pendingSavesRef` and every storage deletion must either await (async methods) or chain behind (sync methods) that conversation's chain — the drain→delete ordering is the invariant.
- `clearAll` must keep `detachEngine` BEFORE the abort loop; reordering back silently reintroduces aborted-snapshot ghost re-landing.
- The scanner intentionally does not cover this (runtime timing — static false positives high); the runtime parameterized tests are the gate.
