# 129 AI Conversation Create Metadata Outside Drain (K-K3/④-1)

## Problem

- Same-tick `createConversation(X)+clearAll()`: X's `saveConversation` (a bare fire-and-forget, NOT in the `pendingSavesRef` drain — K3's drain only covered `saveMessages`) landed **after** `storage.clearAll` resolved → **storage ghost conversation** (remount revives X).
- Probe evidence: `docs/audits/ai-invariants/cycle2-findings.md` K-K3/④-1 (round-02 P2, RED: storage.clearAll 之后 X 元数据落盘). P0 (storage corruption — session-level resurrection, aligned with Cycle 1 K3 precedent).

## Diagnostic Method

- Diagnosis difficulty: high — requires async storage with controllable resolve order (IndexedDB/server host).
- Investigation path:
  1. K3/§7.3's drain audit (Cycle 1 I4) had concluded `saveConversation` (create/rename) was a single-shot metadata write "not needing the drain".
  2. The clearAll drain was confirmed to map only `pendingSavesRef`'s saveMessages entries (`use-conversation.ts:452-455`).
  3. Decisive evidence: round-02 P2 RED — gated create-save landing after the storage clear.

## Root Cause

- The create metadata write was outside the K3 drain chain, so `clearAll` (and `deleteConversation`) could not order it; a gated write landed after the storage clear and resurrected the record.

## Fix

- `use-conversation.ts` `createConversation`: `saveConversation` is **chained into `pendingSavesRef`** with the same settlement-time mirror re-check as rename (K-K4/②-2 fix) — a same-tick clearAll/delete drains the chain first (the write is skipped via the re-check, or the storage clear runs after it).
- Category sweep: **rename's `saveConversation` got the identical treatment** (bug note 128) — the two metadata-write call sites now share the drain contract; no sibling blind spot.

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-i4.test.ts` — Invariant ②/④ block: create+clearAll member (gated save released AFTER the clear settles → storage must stay empty); RED before the fix.

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants.test.ts`

## Notes For Future Refactors

- K3/§7.3's "saveConversation 不入排空链" conclusion is **superseded** (recorded in invariant-catalog §10): all storage writes — messages AND metadata — must chain into the per-conversation drain.
- The settlement-time re-check exists to skip writes for records already removed from the mirror; keep it on every chained write.
