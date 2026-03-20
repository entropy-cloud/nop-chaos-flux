# 01 Playground Email Input State Reset Fix

## Problem

- in the playground form, the `email` field could accept the first character but often failed to append later characters
- the issue looked like an email validation problem, but the visible symptom was controlled input state falling back to an old value
- unrelated rerenders could also wipe form-local state and make the behavior worse

## Root Cause

- form field renderers were reading values from `scope.get(name)` instead of subscribing to the authoritative live value in `form.store.values`
- after `currentForm.setValue(...)` ran, the input renderer could still receive a stale value on the next render and overwrite the user's typing
- `NodeRenderer` could also recreate `FormRuntime` too easily during rerenders, which reset form-local values and validation state

## Fix

- added `useBoundFieldValue(...)` in `packages/amis-renderers-form/src/field-utils.tsx`
- when a field is inside a form, renderers now read from `useCurrentFormState(...)`; outside a form they still fall back to scope-based reads
- updated `packages/amis-renderers-form/src/renderers/input.tsx` so text-like inputs and related controls bind to the correct live value source
- updated `packages/amis-react/src/index.tsx` so form runtime is preserved across unrelated rerenders and recreated only when real identity inputs change
- tightened node runtime state handling so compiled node runtime state is recreated when node identity changes

## Tests

- `packages/amis-renderers-form/src/index.test.tsx` - verifies `input-email` can progress from `a` to `ab` to `abc@example.com`
- `packages/amis-react/src/index.test.tsx` - verifies host rerenders do not wipe form-local values and page updates do not reset the form

## Affected Files

- `packages/amis-react/src/index.tsx`
- `packages/amis-renderers-form/src/field-utils.tsx`
- `packages/amis-renderers-form/src/renderers/input.tsx`
- `packages/amis-renderers-form/src/index.test.tsx`
- `packages/amis-react/src/index.test.tsx`

## Notes For Future Refactors

- controlled form fields must subscribe to the actual live value source, not just a convenient scope snapshot
- changes to form runtime lifecycle should be reviewed for accidental state recreation on parent rerender
- if an input bug looks like validation, check value subscription and controlled-state flow before changing validation rules
