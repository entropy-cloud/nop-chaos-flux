# 164 ai-bubble user-message edit toggle dead: engine array identity broke the chat context memo

> Fixed: 2026-08-24 (`packages/flux-renderers-ai/src/engine/create-engine.ts`)
> Discovered: e2e for `docs/plans/2026-07-25-2-gantt-ai-e2e-test-coverage-and-fix-plan.md` Phase 2 (2.3 用户消息编辑)

## Symptom

Clicking the pencil (`[data-slot="ai-bubble-edit-toggle"]`) on a user message inside `ai-chat` did nothing: no `[data-slot="ai-bubble-edit-input"]` editor appeared, on both `initialMessages`-seeded chats and post-send chats. Engine-level `setMessageEditing` worked in unit tests.

## Root Cause

`create-engine.ts` `setMessageEditing` mutated the message via `adapter.mutate('messages', draft => { draft.messages[idx] = {...} })` — an **in-place index write** that keeps the `messages` ARRAY identity unchanged. `ai-chat.tsx` stabilizes its context value with:

```ts
const chatContextValue = useMemo(() => ({ ...messages, ... }), [engine, messages, ...]);
```

With the array identity stable, the memo never recomputed, `AiChatProvider` kept the old value, and `ai-message-list` (a context consumer) never re-rendered — the editing UI never mounted.

## Fix

Rebind the array reference inside the mutation recipe (`draft.messages = draft.messages.slice()` before the index write) so the snapshot/context memo sees a new identity. Same fix class as the streaming path (which already replaces the array per chunk).

## Protection

`tests/e2e/ai-bubble-content.spec.ts` "user message edit: toggle → textarea → submit regenerates the reply" and "user message edit cancel via Escape restores the bubble" (this round also added the missing Escape-cancel keydown handler to the edit Textarea — `user-edit.tsx`).
