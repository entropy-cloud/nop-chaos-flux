# 157 Delete-During-Load Ghost Resurrection Fix

## Problem

- `useConversation` with storage: a `deleteConversation(A)` issued while the mount bootstrap `loadConversations` is still pending is **resurrected as a ghost list item** when the load resolves — the K-⑦ merge base is the RAW loaded `convs`, and a delete only filters the in-memory mirror (`conversationsRef`). If A was the sole conversation, it also wrongly re-seeds the active selection (R1-F4, `docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`).
- K-⑦'s guard only covered clearAll-during-load (`listClearedRef`); delete-during-load had no guard.

## Diagnostic Method

- R1-F4 re-read the bootstrap merge (`use-conversation.ts:311-326`): `[...convs, ...conversationsRef.current.filter(...)]` — the loaded base is unfiltered; `deleteConversation`'s synchronous mirror filter (`:501-552` lineage) cannot remove an id from a list that hasn't arrived yet.
- Decisive evidence: RED tests — gated `loadConversations` + delete during the window: post-resolve the deleted conversation is back in the list (ghost), and as sole conversation it is promoted to active.

## Root Cause

- The K-⑦ merge protected "created-during-load must survive" and "clearAll-during-load must not restore", but had no notion of "deleted-during-load must not come back" — the merge base needed a deleted-id filter, mirroring the `listClearedRef` precedent.

## Fix

- `use-conversation.ts`: new `deletedDuringLoadRef` (Set of ids deleted while the load is pending, recorded synchronously in `deleteConversation`); the bootstrap merge filters the loaded base BEFORE the non-empty check (`loaded = convs.filter(c => !deletedDuringLoadRef.current.has(c.id))`), so a sole deleted conversation cannot re-seed the active selection either. The ref is cleared after the one-time merge.

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-p2.test.ts` — R1-F4 pair (both RED pre-fix): (1) load `[A, B]` gated → delete A → resolve → list is `[B]` (no ghost); (2) load `[A]` gated → delete A → resolve → empty list, `activeConversationId` null, `activeEngine` null (no active resurrection).

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-p2.test.ts`

## Notes For Future Refactors

- Category sweep (all bootstrap-merge concurrent-change faces): create-during-load (K-⑦ mirror-append), clearAll-during-load (`listClearedRef`), delete-during-load (this fix), rename-during-load — the last is a no-op at entry (rename of a not-yet-listed id reads the empty mirror; documented unknown-id semantics), and renames of created-during-load conversations are preserved by the mirror-append. No same-family leak remains.
- The deleted-id Set is bounded by deletes during the load window; clearing it after the merge keeps the hook lifetime clean.
