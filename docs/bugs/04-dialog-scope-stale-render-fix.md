# 04 Dialog Scope Stale Render Fix

## Problem

- dialog title and body could stay on old values after dialog-local scope updates
- the visible symptom was that a dialog action updated a value in `dialog.scope`, but expressions in the title or body still rendered the previous value
- this looked like an action or expression bug at first, but the real issue was that the dialog host did not rerender when dialog scope changed

## Root Cause

- `packages/amis-runtime/src/page-runtime.ts` stores compiled dialog title/body together with a `dialog.scope`
- `packages/amis-react/src/index.tsx` originally made `DialogHost` subscribe only to the page dialog list, not to each dialog scope store
- dialog content depends on `dialog.scope`, but many renderers only recompute expressions when their parent rerenders, so scope updates inside the dialog could leave the UI stale

## Fix

- split dialog rendering into a dedicated `DialogView` component in `packages/amis-react/src/index.tsx`
- made each `DialogView` subscribe to its own `dialog.scope.store`, so title and body rerender when dialog-local scope data changes
- kept dialog list subscription in `DialogHost`, so dialog add/remove still flows through page state while dialog-local updates stay scoped to each dialog view

## Tests

- `packages/amis-react/src/index.test.tsx` - verifies dialog form state survives host rerenders and page data updates
- `packages/amis-react/src/index.test.tsx` - verifies dialog title and body update after a `setValue` action writes into dialog scope
- `packages/amis-react/src/index.test.tsx` - verifies reopening a dialog gets a fresh scope instead of leaking old dialog-local values

## Affected Files

- `packages/amis-react/src/index.tsx`
- `packages/amis-react/src/index.test.tsx`

## Notes For Future Refactors

- dialog lifecycle state and dialog-local scope reactivity are separate concerns and should not share a single subscription boundary
- compiled dialog content may still need rerender triggers from scope changes even when the dialog list itself is unchanged
- if dialog expressions look frozen, inspect subscription coverage before changing action dispatch or expression evaluation
