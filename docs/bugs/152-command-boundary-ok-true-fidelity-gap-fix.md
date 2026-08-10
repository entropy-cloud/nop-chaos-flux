# 152 Command Boundary ok:true Fidelity Gap Fix (ai:send / component:sendMessage)

## Problem

- `ai:send` (`ai-action-provider.ts`) and `component:sendMessage` (`ai-component-handle.ts`) returned `{ok:true}` unconditionally after `await engine.sendMessage(...)` — even when the turn FAILED (connector error → engine settles `requestState:'error'` with `lastError`) or when the send was a **busy drop** (a second send while a turn is in-flight: the engine's `runTurn` isProcessing entry guard silently discards the message).
- The command boundary lied about success: hosts routing `ActionResult` to `onError`-style handling never saw failures, and a double-send reported the second send as delivered when the message was never even pushed.

## Diagnostic Method

- FIND-04 (`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`) compared the provider's post-await behavior against the engine's documented void-settle contract (all four failure branches settle into `requestState`/`lastError`) and against the repo precedent (flow-designer `toActionResult`, word-editor provider map failures to `{ok:false}`).
- Decisive evidence: RED unit tests — a `stream`-throwing connector produced `ok:true`; a second send during a slow in-flight turn produced `ok:true` with the message absent from `engine.getState().messages`.

## Root Cause

- The mapping layer ignored the engine state it was awaiting on: `sendMessage` settles void by design, so success must be DERIVED from the post-await state (`requestState`), and the busy drop is only distinguishable BEFORE dispatching (`isProcessing` pre-check) — the engine gives no post-await signal for "your message was discarded".

## Fix

- `ai-action-provider.ts`: `send` now pre-checks `engine.getState().isProcessing` → `fail('engine busy: ...')`; after the await, `requestState === 'error'` → `{ok:false, error: lastError}` (non-Error causes wrapped with `{ cause }`). `clear` got the same busy pre-check (its engine guard silently no-ops while processing).
- `ai-component-handle.ts`: `sendMessage` mirrors the provider semantics (`handleSendSettlement` reads post-await state; busy pre-check); `clear` and `regenerate` got the busy pre-check too (same silent-no-op family).
- The engine `sendMessage` void-settle contract is untouched — only the mapping layer changed.

## Tests

- `renderers/__tests__/action-provider.test.tsx` — FIND-04 pair: failing connector → `ok:false` with `lastError` content; slow in-flight turn + second `ai:send` → `ok:false` `engine busy` + message not pushed. Existing success-path assertions unchanged.
- `renderers/__tests__/component-handle.test.tsx` — FIND-04 pair on the Layer C handle (same two assertions, `ComponentCapabilityResult`).
- Full renderers suite (316 tests) green — zero regression.

## Affected Files

- `packages/flux-renderers-ai/src/adapters/ai-action-provider.ts`
- `packages/flux-renderers-ai/src/adapters/ai-component-handle.ts`
- `packages/flux-renderers-ai/src/renderers/__tests__/action-provider.test.tsx`
- `packages/flux-renderers-ai/src/renderers/__tests__/component-handle.test.tsx`

## Notes For Future Refactors

- Any new adapter-layer command that dispatches into the engine must decide its failure surface: sync parameter validation (pre-call), busy pre-check (`isProcessing`, pre-call), and post-await state read (`requestState`) — never an unconditional `ok:true`.
- The engine's `isProcessing` entry guards are a silent-drop contract by design; every public boundary wrapping them must translate the drop into `{ok:false, error: engine busy}`.
- Do not change `sendMessage` to reject on failure — the void-settle contract is documented and other consumers (renderer sender, useConversation) rely on state-driven outcomes.
