# 127 AI Conversation Bootstrap Restores Cleared List (K-⑦-1)

## Problem

- `clearAll()` while the mount bootstrap's `loadConversations()` was still pending: the bootstrap's late resolve called `setConversations(convs)` **wholesale**, resurrecting the deliberately cleared list in memory (`[A,B]` back in the list + `activeId=A`) even though storage was already cleared.
- Probe evidence: `docs/audits/ai-invariants/cycle2-findings.md` K-⑦-1 (probe F, RED: clearAll 后 conversations.length=2).

## Diagnostic Method

- Diagnosis difficulty: low-medium — a single bootstrap path with a functional-updater gap.
- Investigation path:
  1. The ⑦ gate's two registered members already pinned the bootstrap's wholesale-overwrite bug for the create case (`setConversations(convs)` non-functional, `use-conversation.ts:242-246`).
  2. The clearAll member differs: `create` during the load must MERGE, `clearAll` during the load must SUPPRESS — a naive functional merge would still resurrect the cleared list.
  3. Decisive evidence: probe F RED (clearAll → bootstrap resolve → list revived).

## Root Cause

- Bootstrap's post-await `setConversations(convs)` replaced the whole list with no awareness of what happened during the await — no merge of same-tick-created conversations and no guard for a same-tick clearAll.

## Fix

- `use-conversation.ts`:
  1. Bootstrap now computes a **merge** against the synchronous `conversationsRef` mirror (`[...convs, ...created-not-in-convs]`) — conversations created during the load stay in the list (registered members 1-2).
  2. New `listClearedRef` marker set by `clearAll`; the bootstrap checks it after the await and **skips the restore entirely** when the list was deliberately cleared (clearAll member).

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-cycle2.test.ts` — Invariant ⑦ block: 2 registered members flipped `it.fails`→`it` + 1 new clearAll member (K-⑦-1: bootstrap in-flight × clearAll → list stays empty); RED before the fix.

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-cycle2.test.ts`

## Notes For Future Refactors

- The `listClearedRef` guard must be consulted BEFORE the bootstrap's merge/build — restoring after a clearAll would also re-run the K-⑥-3 engine build for a cleared list.
- `createConversation` must NOT reset `listClearedRef` — a create after a clearAll (while the load is pending) must still suppress the loaded-list restore.
