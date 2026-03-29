# 08 ValidateForm Destructive Error Merge Fix

## Problem

- `validateForm()` replaced the entire errors map with `store.setErrors(fieldErrors)`, wiping errors for paths not in the validation traversal
- errors set by `setPathErrors` for unrelated paths (e.g., side-effect errors during registered field validation) were lost after `validateForm()` completed
- visible symptom: a field shows an error, then `validateForm()` runs on a different field, and the first error disappears

## Root Cause

- `packages/flux-runtime/src/form-runtime.ts:177` â€” `store.setErrors(fieldErrors)` called `store.setState({ errors: fieldErrors })`, which replaced the entire `errors` object
- `fieldErrors` only contained errors for paths that were validated in the current `validateForm()` call
- any errors set by concurrent `setPathErrors` calls for paths outside the traversal were discarded

## Fix

- changed the final error-setting from replacement to merge:
  ```ts
  store.setErrors({ ...store.getState().errors, ...fieldErrors });
  ```
- this preserves existing errors for paths not touched by the current validation, while still updating errors for validated paths
- corrected `validateForm()` result reconciliation so side-effect errors newly written during validation are also reflected in the returned `errors` and `fieldErrors`
- this keeps `validateForm()` return semantics aligned with the store state, which prevents `submit()` from proceeding while store-visible validation errors still exist

## Tests

- `packages/flux-runtime/src/__tests__/bug-validate-overwrite.test.ts` - 5 tests:
  - errors for paths outside traversal are preserved
  - errors within the sequential loop are correctly collected
  - registered field errors are collected
  - side-effect errors during registered field validate are preserved
  - sequential await prevents races within the loop
- `packages/flux-runtime/src/__tests__/bug-validate-overwrite.test.ts` - also verifies side-effect errors appear in `validateForm()` results and block `submit()`

## Affected Files

- `packages/flux-runtime/src/form-runtime.ts`

## Notes For Future Refactors

- `store.setErrors` always means "replace all" â€” use merge pattern when the caller only knows about a subset of paths
- merge alone is not sufficient; callers must also reconcile returned `errors`/`fieldErrors` with any side-effect writes that become part of the final store state during validation
- if `validateForm` is refactored to run validations in parallel, re-check store/result consistency explicitly instead of assuming the same end-of-pass merge is enough
- any future bulk store update that replaces a map (errors, touched, dirty) should consider whether partial knowledge requires merge semantics

