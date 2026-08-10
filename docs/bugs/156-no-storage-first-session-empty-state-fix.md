# 156 No-Storage First Session Empty State Fix

## Problem

- `useConversation` without `storage` + `initialConversations`: the first conversation is selected as active (`activeId` seeds from `initialConversations[0]`), but `activeEngine` stays **null** — a host binding `engine={activeEngine}` (engine.md §8.6 pattern) rendered an "active conversation but empty state" (R1-F3, `docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`).
- The K-⑥-3 build-on-demand fix only covered the storage bootstrap path (`ensureEngineAndHydrateEvent`); the no-storage mount had no build-on-demand path at all.

## Diagnostic Method

- R1-F3 compared the two mount paths: the storage bootstrap builds the engine for the selected active conversation (K-⑥-3), the no-storage path (`use-conversation.ts:125-130` state initializers) only set the active id — `activeEngine`'s initial `useState<MessageEngine | null>(null)` was never touched until the first switch/create.
- Decisive evidence: RED tests — no-storage + `initialConversations` mount: `activeEngine` null (non-null assertion failed), and `activeEngine!.sendMessage` threw.

## Root Cause

- The hook's build-on-demand logic was reachable only from storage bootstrap / switch / delete-fixup; the no-storage mount initializer seeded `activeId` without the corresponding engine construction.

## Fix

- `use-conversation.ts`: mount-time effect — when no storage and an active id exists (`activeIdRef.current` — the `initialConversations[0]` seed) with no cached engine, build the engine (`buildEngineFor`), cache it, and `setActiveEngine`. Same semantics as K-⑥-3 minus the hydrate step (no storage to load from). Idempotent for strict-mode double mount (cache hit).

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-p2.test.ts` — R1-F3 pair (both RED pre-fix): (1) no-storage + `initialConversations` mount → `activeConversationId` is the first conversation and `activeEngine` non-null with empty history; (2) the bound engine sends and reads a message (user + assistant visible in state).

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-p2.test.ts`

## Notes For Future Refactors

- Category sweep (all "activeId points at a conversation but engine missing" faces): storage bootstrap (K-⑥-3), no-storage first session (this fix), `switchConversation` build-on-demand, `deleteConversation` next-fixup (`ensureEngineAndHydrate`) — all four now build on demand. Any new path that sets an active id must build the engine in the same tick.
- The mount-time engine is covered by the connector fan-out effect (hot-swap), so a later `connector` change reaches it like any cached engine.
