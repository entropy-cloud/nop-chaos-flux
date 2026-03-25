# 05 Checkbox Group Value Type Drift Fix

## Problem

- `checkbox-group` could corrupt its own value type while the user interacted with it
- the visible symptom was that non-string option values like `0` or `false` would stop rendering as checked correctly, fail to uncheck cleanly, or submit as the wrong type
- outside a form runtime, the same interaction path could write the field back into scope as a JSON string instead of an array

## Root Cause

- `packages/flux-renderers-form/src/renderers/input.tsx` routed checkbox-group updates through `JSON.stringify(...)` and `JSON.parse(...)` to fit a string-only shared field handler
- `packages/flux-renderers-form/src/field-utils.tsx` also normalized checkbox-group reads to strings, so the UI compared coerced string values against original option values
- this created value-type drift between rendered state, form store state, and plain scope state, which broke checked-state comparisons and polluted stored values

## Fix

- updated shared field handlers in `packages/flux-renderers-form/src/field-utils.tsx` to pass through typed values instead of forcing string-only updates
- updated checkbox-group in `packages/flux-renderers-form/src/renderers/input.tsx` to read the bound raw array value and write arrays directly
- changed checked and removal comparisons to use `Object.is(...)`, so boolean and numeric option values stay stable across interaction and submit paths

## Tests

- `packages/flux-renderers-form/src/index.test.tsx` - verifies non-string checkbox-group values stay intact in form state and submit payloads
- `packages/flux-renderers-form/src/index.test.tsx` - verifies plain scope updates keep checkbox-group values as arrays instead of JSON strings

## Affected Files

- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/flux-renderers-form/src/renderers/input.tsx`
- `packages/flux-renderers-form/src/index.test.tsx`

## Notes For Future Refactors

- shared field handlers must not assume every control can safely round-trip through strings
- multi-value controls should preserve raw value types across render, store, and submit boundaries
- if checkbox-like controls show stale checked state, inspect type coercion before changing validation or option schemas

