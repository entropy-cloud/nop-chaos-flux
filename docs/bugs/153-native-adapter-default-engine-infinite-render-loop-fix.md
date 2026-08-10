# 153 Native Adapter Default Engine Infinite Render Loop Fix

## Problem

- A host following engine.md §8.5's external-engine path with the DEFAULT engine construction (`createMessageEngine({ connector })` — no `adapter` option) binds a **native-adapter** engine to `ai-chat`/`useEngineView`: the native adapter's `getState()` rebuilds a fresh snapshot object on EVERY call, so `useSyncExternalStore` sees a new reference on every read → **infinite render loop ("Maximum update depth exceeded") — the page crashes on mount**.
- There was no runtime diagnostic: the only protections were a code comment (`use-engine-view.ts:30-35`) and a test-file comment (`ai-chat-external-engine.test.tsx:44`). All in-repo consumers explicitly pass `createReactMessageAdapter`, so the crash was host-only — and the documented "production default" (`create-engine.ts:63` `options.adapter ?? createNativeMessageAdapter()`) actively steered hosts into it.

## Diagnostic Method

- FIND-05 (`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`) traced the `useSyncExternalStore` snapshot-identity contract against both adapters: `react-adapter-identity.test.ts:78-91` already proved the base/native adapter violates reference stability (`expect(a).not.toBe(b)`), and `use-engine-view.ts` bound `engine.getState` directly.
- Decisive evidence: RED tests — native-adapter engine bound via `useEngineView` and via `ai-chat` produced ZERO diagnosable output (React's own uncached-getSnapshot guard / depth limit terminate the loop, but nothing points at the adapter).

## Root Cause

- `useSyncExternalStore(subscribe, getSnapshot)` requires `getSnapshot` to return a stable reference between notifications; the native adapter is optimized for non-React hosts (fresh object per read) and was never meant to back a React binding — but nothing enforced or documented that, and the default construction made it the trap path.

## Fix

- `use-engine-view.ts`: wrapped `getSnapshot` with a runtime snapshot-stability guard — it compares consecutive `getState()` return-value references; **two consecutive mismatches** (a native-adapter signature; the caching React adapter only ever produces isolated mismatches across mutations, so no false positives) trigger a one-time `console.warn` pointing at `createReactMessageAdapter`, backed by a module-level `WeakMap` (once per engine, no ref-during-render surface). Rendering behavior itself is unchanged — React's depth guard still terminates the loop, but the host now receives a diagnosable warning first.
- `engine.md` §8.2: native adapter snapshot-stability limitation (non-React hosts only; React bindings must use `createReactMessageAdapter`); §8.5: external-engine adapter precondition (React adapter required; the guard's diagnostic text references both sections).

## Tests

- `adapters/__tests__/use-engine-view.test.ts` — FIND-05 pair: native-adapter engine → `console.warn` with `createReactMessageAdapter` hint (render-loop crash swallowed by try/catch — the diagnostic fires before React's depth guard); React-adapter engine → zero warnings.
- `renderers/__tests__/ai-chat-external-engine.test.tsx` — host-facing pair: native engine bound through `ai-chat` → warn assertion; React-adapter external engine → renders with zero snapshot-stability warnings.
- Existing external-engine tests (binds/render/send/fallback/not-engine/null-switch) all stay green — zero regression.

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-engine-view.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/use-engine-view.test.ts`
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-chat-external-engine.test.tsx`
- `docs/components/flux-renderers-ai/engine.md` (§8.2/§8.5)

## Notes For Future Refactors

- Any new React binding point must go through `useEngineView` (the single subscribe/snapshot path) so the guard covers it; a second raw `useSyncExternalStore(engine.getState)` binding would reintroduce the silent crash.
- The guard deliberately warns once per engine and never fixes the loop — changing rendering behavior would mask host misconfiguration; the diagnostic + docs are the contract.
- Keep the detection threshold at two CONSECUTIVE mismatches: the React adapter's legit mutation-induced mismatch is always isolated, so a threshold of one would false-positive during streaming.
