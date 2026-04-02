# Plan 21: NodeRenderer Selective Scope Subscription

> Plan Status: completed
> Last Reviewed: 2026-04-02


> **Implementation Status: ✅ COMPLETED**
> Replaced broad `useSyncExternalStore` with `useSyncExternalStoreWithSelector` in `node-renderer.tsx`. The selector runs `resolveNodeMeta` + `resolveNodeProps` inside the selector callback and uses reference equality to prevent unnecessary re-renders. Static nodes (`flags.isStatic`) bypass the subscription entirely. Both `resolveNodeMeta` and `resolveNodeProps` now return reference-stable cached results when values haven't changed (using `state.resolvedMeta` and `state._staticPropsResult`/`state._lastPropsResult`). The skipped test in `flux-renderers-form/src/index.test.tsx` has been unskipped and passes.
>
> Key changes:
> - `packages/flux-core/src/types.ts`: Added `_staticPropsResult` and `_lastPropsResult` to `CompiledNodeRuntimeState`
> - `packages/flux-runtime/src/node-runtime.ts`: Reference-stable caching for both `resolveNodeMeta` and `resolveNodeProps`
> - `packages/flux-react/src/node-renderer.tsx`: `useSyncExternalStoreWithSelector` + static fast-path
> - `packages/flux-renderers-form/src/index.test.tsx`: Test unskipped
>
> This status was verified on 2026-03-31 (all 131 tests pass, typecheck + build clean).

## Problem

Changing one form field triggers re-renders of ALL sibling NodeRenderers. In a form with 3 fields (input-text, input-email, select), changing the `username` field causes all 3 NodeRenderers to re-render.

### Root Cause

`packages/flux-react/src/node-renderer.tsx` lines 72-75:

```typescript
useSyncExternalStore(
  props.scope.store?.subscribe ?? (() => () => undefined),
  props.scope.store?.getSnapshot ?? (() => null)
);
```

This subscribes to the **entire scope store**. Every NodeRenderer sharing the same scope store re-renders on ANY scope change, regardless of which fields it actually reads.

The `useScopeSelector` hook (in `packages/flux-react/src/hooks.ts`) already uses `useSyncExternalStoreWithSelector` for fine-grained subscriptions, but individual renderer components call this inside their render — by which point the NodeRenderer has already been triggered to re-render.

### Impact

- Unnecessary React re-renders for all form fields on any single field change
- The `monitor.onRenderStart` / `monitor.onRenderEnd` callbacks fire for all nodes
- Performance degrades linearly with the number of fields in a form

### Skipped Test

`packages/flux-renderers-form/src/index.test.tsx` — `it.skip('changing one field does not trigger NodeRenderer re-renders for other fields')`

This test is temporarily skipped until the subscription model is fixed.

## Proposed Solution

Replace the broad `useSyncExternalStore` in NodeRenderer with path-specific subscriptions. Two approaches:

### Approach A: Track consumed paths during render

1. Wrap the render in a "subscription collector" context
2. As child components call `useScopeSelector(selector)`, record which paths they access
3. After the first render, subscribe only to those paths
4. Re-subscribe when the set of consumed paths changes

This is the most correct but complex approach.

### Approach B: Pass subscription info from resolveNodeProps/resolveNodeMeta

1. During `resolveNodeProps` and `resolveNodeMeta`, track which scope paths are read
2. Return the set of consumed paths alongside the resolved values
3. Subscribe to only those paths using a custom subscribe function that filters store updates
4. Fall back to full subscription for nodes that read dynamic paths (expressions)

This is simpler but requires changes to the runtime's resolve functions.

### Approach C: Remove the catch-all subscription, rely on child hooks

1. Remove the `useSyncExternalStore` in NodeRenderer entirely
2. Ensure all data access goes through `useScopeSelector` in child components
3. The NodeRenderer itself doesn't directly consume scope data — it passes scope to children

This is the cleanest but requires auditing all renderer components to ensure they subscribe properly.

## Scope of Change

- `packages/flux-react/src/node-renderer.tsx` — subscription model
- `packages/flux-react/src/hooks.ts` — potentially add helper for path-specific subscription
- `packages/flux-runtime/src/` — scope store may need path-based notification support
- All renderer components — may need to ensure they use `useScopeSelector` instead of direct scope reads

## Prerequisites

- Understand all paths where NodeRenderer directly consumes scope data
- Audit `resolveNodeProps` and `resolveNodeMeta` for scope access patterns
- Ensure the scope store supports efficient path-based change detection

## Status

- [x] Plan approved
- [x] Implementation
- [x] Test un-skipped


