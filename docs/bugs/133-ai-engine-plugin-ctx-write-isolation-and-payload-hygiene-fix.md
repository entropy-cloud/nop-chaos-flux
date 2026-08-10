# 133 AI Engine Plugin Ctx Write Isolation + Request Payload Hygiene (P1-5 + open P1-1)

## Problem

- **open P1-1** — plugin hooks received the LIVE engine message array: `onTurnStart` (fires before the placeholder push) and `onTurnEnd` (fires after the turn) exposed `ctx.request.messages === engine.getState().messages` (same reference). The engine.md §8.3 documented pattern (host pushes a system prompt into `ctx.request.messages`) wrote straight into engine history — bypassing `mutate`/notify — permanently entering history and flowing into the next request payload + autoSave snapshot. The trap sat exactly in the two hooks the docs recommend.
- **P1-5** — `buildContext` put the full message array (including renderer-private `message.state`: editing drafts / toolCall UI / thinking) and `metadata.toolError` (an Error with stack) into `AiConnectorRequest.messages`; playground's `openai-connector.ts:48` forwarded `req.messages` verbatim. Un-submitted edit drafts and Error stacks could hit the wire (design.md §11.5: state is "域内部、不投影").
- Probe evidence: multi-audit `docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` P1-5 + open-audit `docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md` P1-1.

## Diagnostic Method

- Diagnosis difficulty: medium — the reference-aliasing is invisible without capturing the hook ctx; the payload leak needs a message carrying `state`/`toolError` and an inspection of what the connector actually receives.
- Investigation path:
  1. `buildContext` (`:572-599`): `allMessages = adapter.getState().messages` is live; `requestMessages` was `slice(0,-1)` only when a placeholder existed — otherwise the SAME array (identity alias).
  2. `onTurnStart` (`:253-256`) fires before the placeholder push; `onTurnEnd` (`:376`) after the turn — both alias the live array. `onBeforeRequest`/`onAfterRequest`/`onCompletionChunk` were copies only because the placeholder was already pushed.
  3. Decisive evidence: RED regression — `ctx.request.messages.push(...)` in onTurnStart changed `engine.getState().messages.length`; payload messages carried `state.editing.draft` / `metadata.toolError`.

## Root Cause

- `buildContext` handed out the live internal array without an unconditional copy, and projected NO wire whitelist — domain-internal `state`/metadata rode the payload to the model provider.

## Fix

- `create-engine.ts` `buildContext` — unconditional array + element isolation: `sanitizeDanglingToolCalls(requestMessages).map(projectWireMessage)` always produces a NEW array whose elements are NEW objects (never aliases of engine state).
- `utils.ts` — `projectWireMessage` wire whitelist: keeps `{id, role, content, reasoning_content, tool_calls, tool_call_id, name}` + benign metadata (createdAt/model/finishReason); strips `state` and internal `metadata.toolError`/`toolStatus`.
- Whitelist placement decision: strip at the **engine boundary** (buildContext), NOT the connector normalization layer — the engine is the only layer that knows which fields are domain-internal; every connector (factory or fully custom) then receives a clean payload by contract. Public type signatures unchanged (`state` remains on the internal message shape; `getMessages()` still returns it).
- `engine/types.ts` — `MessageEngineContext.state` / `request.messages` documented READ-ONLY (plugins shape the outgoing request only; injection via `systemPrompt` option is the primary path).
- Gate: new invariant family ⑪ — parameterized 5-hook exhaustion (`ctx.request.messages !== engine.getState().messages` + push-not-write-through + payload element isolation) + P1-5 whitelist members.

## Tests

- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants-p1.test.ts` — ⑪ block: 5 hook members + element-isolation member + 2 P1-5 whitelist members.
- RED→GREEN evidence: 5 failed / 3 passed pre-fix (onTurnStart/onTurnEnd + payload arms + element isolation RED; the 3 placeholder-pushed hooks were already copies), 8/8 GREEN post-fix.

## Affected Files

- `packages/flux-renderers-ai/src/engine/create-engine.ts`
- `packages/flux-renderers-ai/src/engine/utils.ts`
- `packages/flux-renderers-ai/src/engine/types.ts` (read-only docs)
- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants-p1.test.ts` (new)

## Notes For Future Refactors

- `buildContext` must always project to NEW arrays/elements — any future payload shaping (systemPrompt, tool schemas, host params) must go through the same isolation or the ⑪ gate will catch the alias on the 5 hooks.
- The wire whitelist lives in ONE place (`projectWireMessage`) — do not add per-connector stripping; new domain-internal message fields must be added to the exclude set there.
- `MessageEngineContext` stays read-only by contract; new plugin hooks must receive the same isolated projection.
