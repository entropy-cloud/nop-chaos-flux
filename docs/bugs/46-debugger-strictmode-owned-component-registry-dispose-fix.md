# 46 debugger StrictMode Owned Component Registry Dispose Fix

## Problem

- In the live `flux-basic` playground, debugger automation could inspect the `Admin Code` field by `cid`, but the result often degraded to DOM-only data with `metaSummary: undefined` and `explainNodeMeta({ field: 'visible' })` returning `source: 'unknown'`.
- The visible symptom first looked like a flaky Playwright or debugger-controller issue because the field was present in the DOM and had a stable `data-cid`, but debugger explanations still lost resolved meta only in the real browser / `React.StrictMode` path.
- The smallest repro became the new StrictMode page-level regression in `apps/playground/src/pages/flux-basic-page.debugger.test.tsx` and a lower-level `SchemaRenderer` StrictMode regression around form subtree inspectability.

## Diagnostic Method

- Diagnosis was hard because the first failing signal was in `tests/e2e/debugger.spec.ts`, so the bug initially looked like browser timing or debugger event correlation noise rather than a renderer lifecycle failure.
- First ruled out Playwright/browser-launch instability, then reproduced the problem in jsdom with `FluxBasicPage` under `React.StrictMode` to remove browser/network uncertainty.
- Added a lower-level regression in `packages/flux-react/src/__tests__/schema-renderer.test.tsx` and confirmed the real break was deeper than `nop-debugger`: the field DOM still rendered with `data-cid`, but `rootRegistry.inspectCid(cid)` returned `notFound`.
- Rejected an early hypothesis that stale debugger-controller registry selection was the main cause; even direct root-registry inspection failed once the StrictMode regression was isolated inside `flux-react`.
- The decisive evidence was that `form` uses `componentRegistryPolicy: 'new'`, and under StrictMode the form subtree registry was being disposed during effect replay while the next commit kept reusing the same memoized registry object. That left the DOM alive but severed the parent-child registry traversal needed by `inspectCid()`.

## Root Cause

- `packages/flux-react/src/use-node-scopes.ts` created node-owned child component registries with `useMemo`, but its cleanup disposed them immediately.
- React development StrictMode replays effects without guaranteeing a new memoized registry object between the throwaway cleanup and the next committed mount, so the form-owned registry could be destroyed and then reused in an already-disposed state.
- `packages/flux-react/src/schema-renderer.tsx` had the same lifecycle risk for owned root component registries, and `packages/flux-react/src/use-node-debug-data.ts` also depended on a rerender after `debugEnabled` toggled on, which made debug publication easier to miss during the same StrictMode sequence.

## Fix

- Deferred disposal of owned component registries behind a microtask guard in both `packages/flux-react/src/use-node-scopes.ts` and `packages/flux-react/src/schema-renderer.tsx`.
- The guard now only disposes a registry if the component is truly unmounted or a newer registry instance has replaced it, so StrictMode effect replay no longer destroys the registry instance reused by the next commit.
- Updated `packages/flux-react/src/use-node-debug-data.ts` so node debug payload publication subscribes to `debugEnabled` directly and republishes when capture turns on, instead of relying on a separate rerender to re-enter the effect.
- Kept the Playwright fixture aligned with the intended failure scenario by issuing the second search click inside the real debounce-plus-request window, so the live debugger test reliably produces abort evidence.

## Tests

- `packages/flux-react/src/__tests__/schema-renderer.test.tsx` - verifies a form subtree remains inspectable from the root registry in `React.StrictMode`.
- `apps/playground/src/pages/flux-basic-page.debugger.test.tsx` - verifies the real `FluxBasicPage` wiring keeps `Admin Code` inspectable with resolved meta under `React.StrictMode`.
- `packages/nop-debugger/src/controller-inspect-advanced.test.ts` - verifies failure explanation can recover button-triggered request aborts through related interaction trace evidence.
- `tests/e2e/debugger.spec.ts` - verifies live value/meta/failure/async debugger explanations on the playground page.

## Affected Files

- `packages/flux-react/src/use-node-scopes.ts`
- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-react/src/use-node-debug-data.ts`
- `packages/flux-core/src/types/renderer-component.ts`
- `packages/flux-react/src/__tests__/schema-renderer.test.tsx`
- `apps/playground/src/pages/flux-basic-page.debugger.test.tsx`
- `packages/nop-debugger/src/explanations-failure-async.ts`
- `packages/nop-debugger/src/controller-inspect-advanced.test.ts`
- `tests/e2e/debugger.spec.ts`

## Notes For Future Refactors

- Any owned runtime object created with `useMemo` and disposed in effect cleanup must be checked against React development StrictMode replay; immediate cleanup is not always safe.
- When debugger inspect falls back to DOM-only data while the node still has a live `data-cid`, inspect the component-registry ownership chain before changing debugger controller selection logic.
- For renderer subtrees that use `componentRegistryPolicy: 'new'`, parent-child registry linkage is part of debugger correctness, not just an internal implementation detail.
