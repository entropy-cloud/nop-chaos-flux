# 03 Fragment Scope Identity Form Reset Fix

## Problem

- forms rendered through fragment helpers with `options.data` could lose in-progress input after an unrelated host rerender
- the visible symptom was that a user typed into a nested form, then a parent-only state change caused the field value to snap back to its initial state
- this did not require changing the form schema or form id; recreating the wrapper scope was enough to trigger the reset

## Root Cause

- `packages/flux-react/src/index.tsx` created a new child scope on every `RenderNodes` pass when `props.options.data` was present
- `NodeRenderer` reuses form runtime only while the parent scope object stays stable, and it treated a new wrapper scope as a new form parent
- once that scope identity changed, `runtime.createFormRuntime(...)` ran again and rebuilt the form store, which cleared live values and validation state

## Fix

- added fragment-scope caching in `packages/flux-react/src/index.tsx` for the `options.data` render path
- when fragment scope identity inputs stay the same, `RenderNodes` now reuses the same child scope object instead of recreating it
- when fragment data changes, the existing scope snapshot is updated in place instead of replacing the whole scope object, so nested forms keep their runtime state

## Tests

- `packages/flux-react/src/index.test.tsx` - verifies a form rendered through fragment helpers keeps its field value after a host rerender recreates the fragment data object

## Affected Files

- `packages/flux-react/src/index.tsx`
- `packages/flux-react/src/index.test.tsx`

## Notes For Future Refactors

- nested form lifetime must not depend on wrapper scope object churn when the semantic parent context is unchanged
- helper-driven fragment rendering should treat scope identity and scope snapshot updates as separate concerns
- if a nested form resets during parent-only rerenders, inspect fragment scope recreation before changing form runtime rules

