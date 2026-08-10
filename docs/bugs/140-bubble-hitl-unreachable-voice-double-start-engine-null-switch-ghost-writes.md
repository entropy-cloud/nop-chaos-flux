# 140 Bubble-Path HITL Unreachable + Voice Double-Start + EngineNullSwitch Ghost Writes (multi P2-4 / P2-6 / P2-8)

## Problem

- **multi P2-4**: HITL approval was structurally unreachable on the DEFAULT bubble path. `FallbackToolCallCard` dropped `onApproval`, `BubbleToolRendererProps` had no such field, and — deeper — the whole prop thread was missing: `AiChatContextValue` had no `onApproval`, `AiMessageList` did not forward events, and the message-level tools renderer call site (`ai-bubble/index.tsx`) never received one. A pending tool call inside a bubble hit the `hitl-no-handler` guard → approve/reject buttons permanently disabled with no way for the host to wire them.
- **multi P2-6**: `ai-voice-input` `handleStart` created a new `SpeechRecognition` unconditionally. The `status` state guard is async — two same-tick clicks created TWO recognition instances; the first `continuous:true` instance held the microphone until page unload (unmount cleanup only aborts the ref-held second instance).
- **multi P2-8**: during the engineNullSwitch window (`engine` prop resolved to `null`, e.g. `useConversation.activeEngine` mid-switch), `useMessage` falls back to the self-built engine while the UI renders emptyState — but the Layer C ComponentHandle and the Layer B `ai` namespace provider were bound to that hidden self-engine. Commands dispatched in the window wrote ghost messages that evaporated when the external engine B arrived.
- Evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P2-4 / P2-6 / P2-8.

## Diagnostic Method

- Diagnosis difficulty: low-medium.
- P2-4: full-chain grep — the gap was the ENTIRE prop thread (not a single point): `BubbleToolRendererProps` lacked the field AND the context/message-list/bubble call sites lacked the wiring. RED proof: schema-level spy wrapper (ai-chat-conversation-change.test.tsx pattern) asserting enabled buttons + dispatched `onApproval` through the rendered bubble.
- P2-6: same-tick double `fireEvent.click` inside one `act` — RED asserts exactly one recognition instance.
- P2-8: spied `env.stream` connector + dispatched via the registered component handle AND the `ai` namespace provider during a `engine: null` render — RED asserts `ok: false` and zero stream calls (no ghost write observable at the connector).

## Root Cause

- P2-4: the `onBranchChange` precedent thread was never mirrored for `onApproval`; `FallbackToolCallCard` additionally dropped the prop that `AiToolCallView` already supported.
- P2-6: no in-flight guard around `handleStart`; the state guard was the only gate and it is async.
- P2-8: `ai-chat.tsx` built both bindings from the `useMessage`-derived `engine` (which falls back to the self-engine during the null window) instead of an explicit null binding.

## Fix

- P2-4: threaded `onApproval` end-to-end (onBranchChange precedent): `ai-chat` schema event → `AiChatContextValue.onApproval` → `AiMessageList` → `AiBubbleViewProps` → message-level tools renderer call site → `ToolsContentRendererProps` → both host-registered cards and `FallbackToolCallCard` → `AiToolCallView`. Additive optional fields only: `BubbleToolRendererProps.onApproval`, `BubbleContentRendererProps.onApproval` (only the tools renderer consumes it), `AiChatSchema.onApproval`, `AiBubbleSchema.onApproval`. Standalone `AiBubbleRenderer` wires the event too. The `hitl-no-handler` disabled-guard stays for unwired hosts.
- P2-6: dedicated in-flight ref set in `handleStart`, cleared on `onend` / the stop branch / a throwing `start()` — a restart after a normal stop is never blocked (a bare "ref non-empty" guard would be, since `onend`/stop never null the ref).
- P2-8: both factories accept `engine: MessageEngine | null`; during the window `ai-chat` binds the explicit null (registered handles/providers stay resolvable) and every engine method returns `{ ok: false, error: 'ai-chat engine is not ready (external engine switch in progress)' }`. Conversation actions (controller-bound) keep working.

## Tests

- `packages/flux-renderers-ai/src/renderers/__tests__/ai-bubble-hitl.test.tsx` (new) — bubble-path pending card: buttons ENABLED + approve/reject dispatch `{ type: 'ai:tool-call-approval', action }`; RED pre-fix (buttons disabled).
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-voice-input.test.tsx` — same-tick double click → exactly 1 instance; restart-after-stop allowed; start() throw clears the guard.
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-chat-engine-null-switch.test.tsx` (new) — component-handle arm + `ai` namespace arm: `ok:false` + zero `env.stream` calls during the null window.
- AI package full suite green (74 files / 638 tests at Phase 3 close; plan 1606-2 total 641).

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/tools.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-bubble/types.ts`
- `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`
- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`
- `packages/flux-renderers-ai/src/adapters/ai-chat-context.tsx`
- `packages/flux-renderers-ai/src/adapters/ai-action-provider.ts`
- `packages/flux-renderers-ai/src/adapters/ai-component-handle.ts`
- `packages/flux-renderers-ai/src/renderers/ai-voice-input.tsx`
- `packages/flux-renderers-ai/src/schemas.ts`

## Notes For Future Refactors

- Any NEW per-message card affordance in the bubble path must thread through the same four layers (chat schema events → context → message-list → bubble → message-level tools renderer); the `onBranchChange`/`onApproval` pair are the two precedents.
- The `hitl-no-handler` disabled-guard is the single source of truth for "host did not wire approval" — keep it; hosts who want buttons must wire the schema event.
- The engineNullSwitch null-binding must stay in BOTH factories (component handle + action provider); a future third binding surface (e.g. a new namespace) needs the same null window handling.
- The voice in-flight flag semantics: set on start, cleared on onend/stop/throw — never key the guard off `recognitionRef` non-emptiness (onend/stop do not null it).
