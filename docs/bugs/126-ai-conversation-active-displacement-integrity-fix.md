# 126 AI Conversation Active Displacement Integrity (K-⑥ Family, K-⑥-1/2/3)

## Problem

- **K-⑥-1** — same-tick `clearAll()+create(X)+delete(X)` left a **ghost activeId**: the delete's fixup read a stale `conversationsRef` (clearAll never wrote it) and re-selected the cleared `'A'` as active with an empty list + `activeEngine=null`.
- **K-⑥-2** — same-tick `delete(X)+switch(X)` promoted the deleted conversation: the switch's `exists` check read the render closure (X still listed), then rebuilt the engine with no displacement guard.
- **K-⑥-3** — mount bootstrap selected `convs[0]` as active but built **no engine**: the default conversation's stored messages were invisible until a manual switch (and its engine wasn't in the cache, so autoSave never attached — W-⑨-b).
- Probe evidence: `docs/audits/ai-invariants/cycle2-findings.md` K-⑥-1/2/3 (probe C / C2 / P7, RED).

## Diagnostic Method

- Diagnosis difficulty: high — three members sharing two root surfaces (missing `conversationsRef` write on delete/clearAll + missing displacement version bump + missing build-on-demand), each triggered by a same-tick interleaving.
- Investigation path:
  1. The registered-red scanner hits (`scanDisplacementVersionBumps`: create/delete/clearAll never bump `switchVersionRef`) pointed at the displacement surface.
  2. `deleteConversation`'s fixup (`use-conversation.ts:382-388`) was confirmed to read `conversationsRef.current` — but clearAll/delete never maintained that mirror, so the fixup acted on stale data.
  3. `switchConversation`'s first-statement `conversations.some(...)` exemption was confirmed as the K-⑥-2 entry hole (guard must precede `setActiveId`).
  4. Decisive evidence: three RED probes + the 5 registered `it.fails` members (probe-1/1b/1c/B/C).

## Root Cause

- clearAll/deleteConversation did not synchronously maintain the `conversationsRef` mirror (the K4 write-surface contract only covered create/rename).
- No displacement method bumped `switchVersionRef`, so an in-flight switch's post-await promotion was never invalidated; and the switch's entry `exists` check read the render closure, so even the sync path promoted deleted targets.
- Bootstrap never built the selected active's engine (the "null before first switch" contract face).

## Fix

- `use-conversation.ts`:
  1. create/delete/clearAll all `++switchVersionRef.current` (registered red ⑥×3 cleared) + reset `switchTargetRef.current = null`.
  2. deleteConversation/clearAll synchronously write `conversationsRef` (filter / `[]`); bootstrap merge syncs it too — the fixup now reads the freshest mirror (K-⑥-1 ghost root cause).
  3. `switchConversation`'s exists check reads `conversationsRef.current` (K-⑥-2, guard before `setActiveId`); the version guard became **id-aware** (`switchTargetRef`): a newer switch only supersedes an in-flight one when it targets a DIFFERENT conversation — a same-id fast re-switch no longer drops the in-flight hydration wholesale (registered member 4).
  4. Bootstrap + delete-active fixup build the engine on demand via `ensureEngineAndHydrate` (loadMessages + id-aware version guard), mirroring switchConversation (K-⑥-3; also naturally converges W-⑨-b).

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-cycle2.test.ts` — Invariant ⑥ block: 5 registered members flipped `it.fails`→`it` + 3 new members (K-⑥-1 clearAll+create+delete ghost / K-⑥-2 delete+switch / K-⑥-3 bootstrap build-on-demand with stored messages visible); all RED before the fix.

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-cycle2.test.ts`

## Notes For Future Refactors

- Every displacement method (create/delete/clearAll) must bump `switchVersionRef` AND reset `switchTargetRef` — the id-aware guard is unsound without the reset.
- Every list-mutation path (including bootstrap) must sync `conversationsRef` synchronously; same-tick readers rely on it.
- New "promote an engine after an await" paths must use the id-aware version guard (`version !== myVersion && target !== id`).
