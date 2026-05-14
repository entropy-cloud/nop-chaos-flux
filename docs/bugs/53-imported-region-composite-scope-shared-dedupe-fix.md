# 53 Imported Region Composite Scope Shared Dedupe Fix

## Problem

- Imported `viewer` / region subtrees under `xui:imports` could show partially stale UI after one parent-scope update.
- In the failing `detail-view` flow, hook-based probes updated to the new `summary` values, but sibling schema text nodes in the same imported subtree stayed on the old values.
- The symptom looked like a `detail-view` confirm/writeback bug or a `NodeRendererResolved` invalidation bug, but the underlying issue was lower in scope subscription plumbing.

## Diagnostic Method

- Reproduced the failure first in `detail-view` tests, then reduced it to a `detail-view-like` host so the business logic was no longer part of the reproduction.
- Compared three paths inside the same imported subtree: `useScopeSelector(...)`, direct runtime `resolveNodeProps(...)`, and mounted schema child nodes. That showed data publication and expression evaluation were correct while some mounted subscribers still missed the update.
- Added temporary probes that subscribed in different ways and observed that the first imported subscriber updated, while later sibling subscribers did not.
- Moved investigation from `flux-react` render invalidation into `flux-runtime/src/scope.ts` and found that `createCompositeScopeStore(...)` used one shared `lastVisibleForParent` dedupe cache for all subscribers.
- Confirmed the true cause by changing that dedupe state to be per-subscriber. The previously failing `detail-view` and import-region regressions turned green immediately.

## Root Cause

- `packages/flux-runtime/src/scope.ts` implemented child composite scope parent-change dedupe with a single shared `lastVisibleForParent` variable inside `createCompositeScopeStore(...)`.
- When a parent scope changed, the first child-scope subscriber updated that shared cache. Later sibling subscribers in the same imported subtree then saw `nextVisible === lastVisibleForParent` and were incorrectly short-circuited.
- Because imported region/viewer subtrees often contain multiple independent subscribers, the bug surfaced as "some nodes update, some nodes stay stale" rather than a total refresh failure.

## Fix

- Moved `lastVisibleForParent` from composite-store shared state into each `subscribe(...)` closure in `packages/flux-runtime/src/scope.ts`.
- This preserves parent-change dedupe per subscriber while allowing all imported subtree listeners to observe the same parent update.
- Kept the fix minimal and local to scope subscription behavior; no `detail-view` remount workaround or `NodeRendererResolved` contract change was required.

## Tests

- `packages/flux-runtime/src/__tests__/scope-ownership-lexical-and-nested.test.ts` - verifies one parent update notifies all child composite subscribers.
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view-transform.test.tsx` - verifies imported `detail-view` viewer siblings refresh after confirm-driven multi-field updates without forced remount.
- `packages/flux-react/src/__tests__/scope-and-reactivity-imports.test.tsx` - verifies imported region/viewer schema text nodes and probe nodes both refresh after imported-scope parent updates.

## Affected Files

- `packages/flux-runtime/src/scope.ts`
- `packages/flux-runtime/src/__tests__/scope-ownership-lexical-and-nested.test.ts`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view-transform.test.tsx`
- `packages/flux-react/src/__tests__/scope-and-reactivity-imports.test.tsx`

## Notes For Future Refactors

- Composite scope dedupe state must remain subscriber-local. Shared dedupe caches can silently starve later listeners and produce partial-staleness bugs that look like renderer invalidation failures.
- When imported subtree UI looks stale, compare hook subscribers, direct runtime resolution, and mounted schema nodes before changing renderer lifecycle behavior. If those disagree, inspect scope-store notification semantics first.
- Avoid reintroducing remount-based viewer refresh workarounds for this class of bug unless scope subscription semantics are proven correct first.
