# 124 AI Conversation RenameConversation Sync Closure Read (K4)

## Problem

- A same-tick `createConversation()` + `renameConversation(id, 'T2')` silently lost the rename: `renameConversation` read the render closure `conversations`, which did not yet contain the new id (the create's `setState` had not re-rendered), so `updated` was `undefined` and `saveConversation` was never called — the in-memory list showed the new title but persistence kept the old one (lost on refresh).
- Probe evidence: `docs/audits/ai-invariants/cycle1-findings.md` K4 — probe-K4 RED (persisted titles = ["initial"], rename 丢失).

## Diagnostic Method

- Diagnosis difficulty: medium — a synchronous closure staleness, distinct from the known post-await stale-closure family; only visible in a same-tick create+rename sequence.
- Investigation path:
  1. I2 audit noted invariant ② only constrained reads AFTER `await`; `renameConversation` is synchronous and reads the closure mid-body.
  2. `conversationsRef` mirror existed (`use-conversation.ts:133-136`) but was only effect-synced — `createConversation` did not update it synchronously (contrast `activeIdRef` which is sync-updated at `:278`).
  3. Decisive evidence: probe-K4 — same-tick create+rename left the renamed title unpersisted (RED).

## Root Cause

- `renameConversation` read the render-closure `conversations` (`:377`) instead of `conversationsRef.current`; `createConversation` did not maintain the `conversationsRef` mirror synchronously, so even the ref path would have been stale in the same-tick case.

## Fix

- `use-conversation.ts`:
  1. `renameConversation` now reads `conversationsRef.current` (and syncs the mirror after `setConversations`).
  2. `createConversation` synchronously prepends to `conversationsRef.current` (parity with the synchronous `activeIdRef` update).
- Category sweep (all list-mutation methods): `create`/`rename`/`delete`/`clearAll` now all maintain `conversationsRef` synchronously; `switchConversation`'s `conversations.some(...)` is the method's FIRST statement (pre-state-change render-snapshot read) — ruled safe, exempted explicitly in the scanner rule.

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants.test.ts` — invariant ② (K4) block: "same-tick create+rename persists the RENAMED title (no stale closure read)" (RED before fix).
- `scripts/__tests__/find-ai-engine-invariant-violations.test.ts` — K4 fixture: rename reading bare `conversations` after `setConversations` → exit 1; clean fixture covers the ref-based form + the `switchConversation` first-statement exemption.
- `scripts/audit/find-ai-engine-invariant-violations.mjs` — `scanAdapterSyncClosureReads` (flags only reads AFTER the first state-change statement of an adapter mutating method).

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants.test.ts`
- `scripts/audit/find-ai-engine-invariant-violations.mjs`
- `scripts/__tests__/find-ai-engine-invariant-violations.test.ts`

## Notes For Future Refactors

- Any new adapter method that reads the conversation list or active id mid-body must read the ref mirrors; the scanner flags bare reads after the first `setConversations`/`setActiveId`/`await`.
- `conversationsRef`/`activeIdRef` are the sync-consistency mirrors — every list/activeId mutation must update them synchronously, never relying on the effect flush for same-tick readers.
