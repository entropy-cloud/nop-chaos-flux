# 154 AutoSave Connector-Missing Turn Silently Lost Fix

## Problem

- `useConversation` + `autoSaveMessages` with a **null connector**: the host sends a user message → the engine's connector-missing branch (`create-engine.ts` runTurn) pushes the message into history and settles `requestState: 'error'` **directly from `idle`** (`isProcessing` never becomes true) → the autoSave trigger predicate (`wasProcessing && isDone`) never fires → the conversation metadata is persisted but the message content stays memory-only → **silently lost on reload** (FIND-12, `docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`).
- Only the connector-missing failure branch was affected: stream-error / tool-no-executor / plugin-throw all pass through `processing` first, so their rounds already persisted.

## Diagnostic Method

- FIND-12 traced the four failure branches of a turn against the autoSave trigger predicate (`use-conversation-autosave.ts:38-44`): `wasProcessing` is seeded from `prevState` at subscription time; the connector-missing branch is the ONLY one whose `requestState` transition skips `processing` entirely (`create-engine.ts:209-231` pushes `incomingMessages` in the same `mutate` that sets `'error'`).
- Decisive evidence: RED tests — null-connector send leaves `saved[convId]` undefined (never saved) and a remount restores no messages.

## Root Cause

- `attachAutoSave`'s trigger predicate conflated "a turn ran" with "a turn passed through `processing`". The connector-missing early return mutates `idle → 'error'` in one step, so `wasProcessing` is false even though the round DID receive and push user messages.

## Fix

- `use-conversation-autosave.ts`: trigger predicate extended to `(wasProcessing && isDone) || (isDone && messagesGrew)` — a per-conversation message-count watermark (`lastSeenCount`, compared against `engine.getMessages().length`) detects "the failed round pushed messages before erroring". The `full` channel is also subscribed so the watermark syncs across non-`requestState` resets (`clear`/`setMessages` only notify `full`) — a clear-then-connector-missing sequence is still detected. The K-⑩-3 vacuous-residue stripping + dangling-tool_calls sanitization apply unchanged, so a no-message vacuous round (e.g. connector-missing `regenerate`) stays unpersisted.

## Tests

- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-p2.test.ts` — FIND-12 pair: (1) null-connector send → `saveMessages` received a snapshot containing the user message (RED pre-fix: never saved); (2) same scenario + remount → the message is restored from storage via the bootstrap hydration (RED pre-fix: nothing to hydrate).

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation-autosave.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/conversation-invariants-p2.test.ts`

## Notes For Future Refactors

- Keep the `full`-channel watermark sync: any new engine-side full-reset (`clear`/`setMessages`-shaped) that doesn't notify `requestState` would silently break connector-missing detection again.
- The trigger predicate is the contract: a failed round that pushed user messages persists; a failed round that pushed nothing (vacuous) does not. Do not re-add an unconditional `isDone` save — it would persist vacuous regenerations.
