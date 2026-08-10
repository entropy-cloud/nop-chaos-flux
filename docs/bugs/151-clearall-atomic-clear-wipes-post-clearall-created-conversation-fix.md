# 151 clearAll Atomic-Clear Wipes Post-ClearAll Created Conversation Fix

## Problem

- `useConversation.clearAll()` chained the storage clear behind its pending-save drain; a conversation created right after `clearAll()` in the same tick had its metadata save land BEFORE the drain settled (its save is not part of the drain — `pendingSavesRef` is cleared synchronously), so the deferred atomic `storage.clearAll()` fired LAST and **erased the new conversation's storage record**.
- The in-memory list survived the clear (the create's synchronous mirror write), so the failure looked like "ghost-free-creation in reverse": the list showed the new conversation, but a remount (storage re-read) rehydrated it as missing — real data loss window, no error surfaced.
- The existing K3 guard only covered the forward direction (old writes must drain before delete/clear); the reverse direction (new writes after clear must not be swept) had zero coverage.

## Diagnostic Method

- FIND-02 (`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`) traced the window algebra: `createConversation` chains its save on `Promise.resolve(undefined)` when `pendingSavesRef` was just cleared → the new save is invisible to the drain; the drain's `.then(clearAll)` settles after the slowest pending save, which is after the new fast save.
- Decisive evidence: integration test with an atomic-clear storage + gated `saveMessages` — `clearAll(); createConversation(B)` in one tick, then release the gate → `store` ended up `[]` (B's record wiped) RED; a first draft asserting before the microtask flush stayed GREEN and had to be corrected to await the flush first (the sync `act` does not drain the promise chain).

## Root Cause

- `clearAll` treated `storage.clearAll()` as a safe one-shot optimization, but the atomic clear is order-sensitive: anything written after the clearAll call but before the drain settles is swept. The drain only covers saves registered at clearAll time.
- Per-id `deleteConversation` over the clearAll-time snapshot is naturally immune: it only touches conversations that existed at clearAll time.

## Fix

- `use-conversation.ts` `clearAll`: the storage clear is now a per-id `deleteConversation` fan-out over the clearAll-time `ids` snapshot (engineCache ∪ pendingSavesRef ∪ conversationsRef) — the `storage.clearAll()` branch was removed entirely.
- `ConversationStorageStrategy.clearAll` stays in the interface (public API unchanged) but is now documented as host-invoked only; `storage/types.ts` doc synced.
- Per-id failures still route through `reportStorageError({ phase: 'deleteConversation', conversationId })` (FP-3 unchanged).

## Tests

- `adapters/__tests__/use-conversation-clear-all.test.ts` — FIND-02 case: atomic-clear storage + gated `saveMessages` + same-tick `clearAll(); createConversation(B)` → B's record survives, remount rehydrates B only; RED pre-fix (`store=[]`), GREEN post-fix.
- Existing clear-all tests (per-id fallback, no-clearAll storage, FP-3 rejection fan-out) all stay green — zero regression.

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/storage/types.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/use-conversation-clear-all.test.ts`
- `docs/components/flux-renderers-ai/engine.md` (§8.6 存储/驱逐契约)

## Notes For Future Refactors

- Never reintroduce an atomic `storage.clearAll()` behind the drain: any deferred whole-store clear is a new-write sweep by construction. The snapshot per-id fan-out is the only ordering-safe shape.
- The `ids` snapshot must keep its union source (engineCache ∪ pendingSavesRef ∪ conversationsRef) — shrinking it reopens the FP-2 ghost-rehydration gap (evicted/never-opened sessions escaping the clear).
- A test asserting post-clearAll writes must `await` a real tick (or a storage-side gate) before asserting: sync `act` does not drain the promise chain, so intermediate assertions can pass in both broken and fixed code.
