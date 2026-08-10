# 138 useConversation Unmount Cleanup Order Breaks K3 detach-before-abort (multi P2-2)

## Problem

- Unmounting the hook while a turn was in-flight ran `engine.abort()` BEFORE unsubscribing the auto-save listeners: the abort's `requestState` transition (`processing` → `aborted`) fired the still-attached listener, which enqueued an aborted-snapshot `saveMessages` into `pendingSavesRef` — with the hook gone there was no drain surface left, so the write landed in storage.
- Rapid remount + new turn then rehydrated the aborted snapshot as a ghost (cross-mount ghost), and the unmounted hook's `pendingSavesRef` was never drained or cleared.
- Evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P2-2 (unmount `:357-369` vs clearAll's `:579-590` detach-before-abort).

## Diagnostic Method

- Diagnosis difficulty: medium — requires a multi-step timing (in-flight turn + unmount + gated storage write + remount), and the fault is an ORDERING difference against the documented K3 invariant, not a single wrong line.
- Rejected hypotheses: "unmount abort is fine because the engine is being destroyed anyway" — the save chain is promise-owned and the settlement re-check reads the mirror (which outlives the hook), so an abort-enqueued save genuinely lands.
- Decisive evidence: two `it.fails` RED members — (a) unmount during in-flight turn with a gated storage → `saveMessages` called once + aborted snapshot lands (pre-fix), zero after; (b) same + remount + new turn → ghost assistant rehydrated via `loadMessages`.

## Root Cause

- The unmount cleanup aborted before detaching, inverting clearAll's K3 ordering, and neither drained nor cleared `pendingSavesRef` on the unmount path.

## Fix

- `use-conversation.ts` unmount cleanup reordered to detach-before-abort (unsubscribe all auto-save listeners, clear the unsubscribe map, THEN abort processing engines) — an abort-triggered save can no longer be enqueued by a hook that is about to be gone.
- `pendingSavesRef` is cleared on the unmount path: saves chained BEFORE unmount (completed turns) continue to settle on their own (promise-owned, mirror re-check alive via closure); the map is dropped so the unmounted hook has no stale drain surface.

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/use-conversation-storage.test.ts` — multi P2-2 block (2 members: unmount enqueue guard + rapid-remount ghost guard; `it.fails` RED → `it` GREEN; suite 620 green).
- Existing clearAll / detach-before-abort suites (`conversation-invariants.test.ts` K3 timing-guard + `conversation-invariants-i4.test.ts` fan-out) zero regression.

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/use-conversation-storage.test.ts`

## Notes For Future Refactors

- Teardown surface parity (sweep recorded): unmount / evict (`switchConversation`) / delete / clearAll all follow detach-before-abort; pendingSavesRef semantics differ per surface on purpose — evict keeps the pending save (clearAll's drain covers it), delete drains then deletes, clearAll chains the storage clear behind the drain, unmount clears (promise-owned saves finish on their own).
- Any new teardown path in useConversation must keep detach-before-abort, or an abort-triggered save escapes the drain surfaces.
