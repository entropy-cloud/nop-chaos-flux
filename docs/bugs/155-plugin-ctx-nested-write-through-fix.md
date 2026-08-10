# 155 Plugin Ctx Nested Write-Through Into Engine History Fix

## Problem

- A plugin shaping the outgoing request per engine.md §8.3 (`ctx.request.messages[i]` mutation) could **write through into engine history at NESTED depth**: `projectWireMessage` (`engine/utils.ts`) assigned `tool_calls` / `content` (array parts) / `reasoning_content` **by reference**, and `metadata` was only shallow-copied (`{ ...message.metadata }`) — so a plugin `push`ing into `ctx.request.messages[i].tool_calls` (or mutating a nested `metadata` object) polluted the engine's message history, the next request payload, and the autoSave snapshot (R1-F2, `docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`).
- The ⑪ write-isolation fix (open P1-1) had only isolated the array + element level; the nested depth was the residual family member.

## Diagnostic Method

- R1-F2 inspected `projectWireMessage`'s projection loop: `WIRE_MESSAGE_KEYS` (including `content`/`tool_calls`/`reasoning_content`) were copied with `out[key] = value` — a plain reference assignment; `metadata` was `{ ...message.metadata }` — a shallow copy. A plugin mutation at depth 1 (tool_calls entries, metadata nested objects) therefore aliased engine state.
- Decisive evidence: RED tests — plugin `push` into `ctx.request.messages[i].tool_calls` and `content` parts, plus in-place mutation of `metadata.nested.counter`, all landed in `engine.getState().messages` (deep-compare failed).

## Root Cause

- `projectWireMessage` never cloned nested values. The wire projection's job was "strip private fields" (P1-5), and its isolation promise (types.ts `MessageEngineContext` comment) claimed more than the implementation delivered — the "never write through" contract was only true at depth 0/1 for plain fields.

## Fix

- `engine/utils.ts` `projectWireMessage`: every whitelisted field and the benign `metadata` are now **deep-cloned** (`deepClone` — element-by-element array/object cloning, the `combineDeltaData` precedent). Wire payload and engine history are fully reference-disconnected at every nesting depth. `types.ts` `MessageEngineContext` + `build-context.ts` comments rewritten to state the isolation depth truthfully.

## Tests

- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants-p1.test.ts` — Invariant ⑪ nested block, 3 members (all RED pre-fix): `tool_calls` push in `onBeforeRequest` (payload shaped to 2, history stays 1); `content` parts push in `onBeforeRequest` (payload 2, history 1); in-place `metadata.nested` mutation + `extra` key add in `onTurnStart` (history untouched).

## Affected Files

- `packages/flux-renderers-ai/src/engine/utils.ts`
- `packages/flux-renderers-ai/src/engine/build-context.ts`
- `packages/flux-renderers-ai/src/engine/types.ts` (comment)
- `packages/flux-renderers-ai/src/engine/__tests__/engine-invariants-p1.test.ts`

## Notes For Future Refactors

- The ⑪ gate family now includes the nested members (gates.md row updated) — any future projection surface (new wire fields, new payload shapes) must deep-isolate or the gate red-lights.
- `sanitizeDanglingToolCalls` still returns shallow copies by design: its only consumers either deep-isolate immediately after (`projectWireMessage` in `buildContext`) or feed the documented O-2 shallow snapshot into storage serialization (no plugin mutation entry point). Do not add deep cloning there without a consumer that needs it.
