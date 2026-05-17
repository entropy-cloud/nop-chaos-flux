# 56 Dynamic Renderer Ad Hoc Fragment Identity Fix

## Problem

- The component-lab `dynamic-renderer` page could dispatch `loadAction` successfully but remain stuck on the loading placeholder.
- Schema-switch buttons updated local state, but the rendered fragment did not swap to the newly returned schema in the browser.
- The failure appeared as an async action/loading issue, while debugger errors and page errors were empty.

## Diagnostic Method

- Checked the E2E page error channels first: `console.error`, `pageerror`, debugger errors, and debugger failures were all empty.
- Verified that action dispatch returned the expected schema and that local component state changed after the button click.
- Compared DOM state after dispatch and found React kept rendering the old loading fragment even though the compiled schema input had changed.
- The decisive evidence was that forcing a distinct fragment identity made the loaded schema render immediately.

## Root Cause

- `dynamic-renderer` compiled ad hoc fragments under a reused runtime render identity.
- `packages/flux-react` keyed the rendered child path without including the compiled template node identity, so React could preserve the old subtree across schema swaps.
- The issue crossed renderer and React runtime boundaries: the basic renderer produced the new fragment, but the React handoff reused stale component identity.

## Fix

- `packages/flux-renderers-basic/src/dynamic-renderer.tsx` now renders loaded schemas with a distinct `pathSuffix` from the loading placeholder.
- `packages/flux-react/src/render-nodes.tsx` keys `NodeRenderer` by `compiled.templateNodeId` so schema replacement changes React identity.
- `docs/architecture/renderer-runtime.md` now documents the ad hoc fragment identity rule.

## Tests

- `packages/flux-renderers-basic/src/__tests__/basic-dynamic-renderer.test.tsx` verifies loaded dynamic schemas and schema switching.
- `tests/e2e/component-lab/action-logic.spec.ts` verifies browser rendering for loadAction and schema-switching dynamic-renderer flows.

## Affected Files

- `packages/flux-renderers-basic/src/dynamic-renderer.tsx`
- `packages/flux-react/src/render-nodes.tsx`
- `docs/architecture/renderer-runtime.md`
- `tests/e2e/component-lab/action-logic.spec.ts`

## Notes For Future Refactors

- Ad hoc fragments that can change schema must not reuse the same React subtree identity as their placeholder or previous schema.
- Do not treat empty debugger/page error channels as proof that a renderer state transition happened; inspect action result, runtime state, and DOM identity separately.
