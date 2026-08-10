# 128 AI Conversation Rename Re-Saves Deleted/Cleared Records (K-K4/②-1/2)

## Problem

- **K-K4/②-1 (P0)** — same-tick `deleteConversation(X)+renameConversation(X,'T2')`: the rename read a stale mirror (delete never wrote it), found X, and `saveConversation(X)` **re-created the deleted conversation in storage** (ghost re-save; remount revives it). Both orders (delete-first / rename-first) were broken.
- **K-K4/②-2 (P1)** — same-tick `renameConversation('A','T2')+clearAll()`: the rename's fire-and-forget `saveConversation` landed **after** `storage.clearAll` resolved, leaving a `{A: title:'T2'}` metadata ghost.
- Probe evidence: `docs/audits/ai-invariants/cycle2-findings.md` K-K4/②-1/2 (probe D / P1, RED).

## Diagnostic Method

- Diagnosis difficulty: high — async-storage races only reproducible with controllable resolve order (IndexedDB/server hosts).
- Investigation path:
  1. K4/§7.4's write-surface contract was confirmed to cover only create/rename — delete/clearAll never wrote `conversationsRef` (same gap as K-⑥-1).
  2. `renameConversation`'s `saveConversation` was a bare fire-and-forget — not in the K3 drain chain, so delete/clearAll could not order it.
  3. Decisive evidence: probe D (delete+rename re-save) + P1 (gated rename save landing after storage.clearAll).

## Root Cause

- Two missing invariants on the metadata write path: (a) rename's save reads a stale mirror when delete/clearAll don't write it; (b) rename's save is outside the pending-save drain, so a gated write can land after the storage delete/clear.

## Fix

- `use-conversation.ts`:
  1. deleteConversation/clearAll now synchronously write `conversationsRef` (Phase 2 fix ②, shared write-surface contract) — the rename reads the freshest mirror, so delete-first/clearAll-first orders no-op.
  2. Rename's `saveConversation` is **chained into `pendingSavesRef`** (the K3 drain now covers metadata writes) and performs a **settlement-time re-check**: when the chained write actually runs, the target must still exist in the mirror — otherwise the write is skipped (rename-first × delete/clearAll orders).

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-i4.test.ts` — Invariant ②/④ block: delete+rename both orders (K-K4/②-1), rename+clearAll both orders (K-K4/②-2), mirror write-surface member; all RED before the fix (gated metadata storage mock).
- `scripts/audit/find-ai-engine-invariant-violations.mjs` — new `scanMirrorWriteSurface` rule (list mutators must contain a `conversationsRef.current =` write); committed fixtures in `scripts/__tests__/find-ai-engine-invariant-violations.test.ts`.

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants.test.ts`
- `scripts/audit/find-ai-engine-invariant-violations.mjs`
- `scripts/__tests__/find-ai-engine-invariant-violations.test.ts`

## Notes For Future Refactors

- Any metadata write (rename/create) must be chained into `pendingSavesRef` AND re-check the mirror at settlement time — either alone is insufficient (drain ordering vs. gated late landing).
- The `scanMirrorWriteSurface` rule now statically enforces the write surface for all four list mutators — a new list-mutation method must sync `conversationsRef` or CI turns red.
