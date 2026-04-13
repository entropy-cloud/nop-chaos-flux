# 29 detail-view Confirm Viewer Not Updated Fix

## Problem

- In the playground `detail-view` renderer, clicking Edit, making changes, and clicking Confirm closed the dialog but the viewer slot did not reflect the new values.
- On the second open, the dialog still showed old values (pre-first-confirm data).
- Affected all schemas using `name: 'summary'` or `name: 'user'` on a `detail-view` node (the idiomatic pattern in all playground lab pages).

## Diagnostic Method

- First suspicion: write-back path was not executing. Ruled out by adding `console.log` inside `applyCommitResult` — it was being called.
- Checked `draftForm.scope.read()` — revealed the draft scope was merging parent scope data (including the `summary` key from the parent form) with the draft's own flat values (`title`, `author`, `pages`). This produced a polluted object containing both the original `summary` nested object and the flat edit fields.
- Traced `scopePath` usage in `DetailViewRenderer`: the renderer read `schema.scopePath` only. All playground schemas used `schema.name` (e.g. `name: 'summary'`), which was never consumed, so `scopePath` was always `undefined`.
- With `scopePath = undefined`, `applyCommitResult` fell into the flat-merge branch and wrote `title`, `author`, `pages` as top-level scope keys, while the viewer expressions read `${summary.title}` — different keys entirely.
- Confirmed: switching to `scope.read()` → `scope.readOwn()` was necessary to avoid parent scope contamination in the draft values.
- Confirmed: `$form` meta key (injected by `createReadonlyScopeBinding`) was also present in `readOwn()` and needed to be stripped before writing back to the parent form to prevent data pollution.

## Root Cause

- `DetailViewRenderer` read `schema.scopePath` only and ignored `schema.name`. All lab schemas used `name` as the scope key identifier, so `scopePath` was `undefined` on every render.
- With `scopePath = undefined`, `applyCommitResult` used the flat-merge branch instead of the correct `setValue(scopePath, draftValues)` path.
- `draftForm.scope.read()` returns `{ ...parentScopeData, ...draftOwnValues }`. Using it as the write-back value contaminated the parent field with all ancestor scope keys.
- `readOwn()` (from `createReadonlyScopeBinding`) includes a `$form` meta key that must be stripped before writing back.

## Fix

- `detail-view.tsx:39`: resolved `scopePath` as `schema.scopePath ?? (typeof schema.name === 'string' ? schema.name : undefined)`. This makes `name` a fallback for `scopePath` across all read and write paths.
- `detail-view.tsx` and `detail-field.tsx` `handleConfirm`: replaced `draftForm.scope.read()` with `draftForm.scope.readOwn()` to avoid parent scope contamination.
- Both files: destructured `$form` out of `readOwn()` result before passing to `applyCommitResult` / computing `writeback`.

## Tests

- `packages/flux-renderers-form/src/renderers/detail-view.test.tsx` — "viewer updates after first confirm when using name as scopePath": verifies viewer text reflects changes after first confirm.
- `packages/flux-renderers-form/src/renderers/detail-view.test.tsx` — "second edit dialog is pre-populated with values from first confirm": verifies that re-opening the dialog seeds inputs from the previously confirmed values.
- `packages/flux-renderers-form/src/renderers/detail-field.test.tsx` — "second confirm writes second set of edits to parent form": verifies the second confirm's values appear in the form submit payload.

## Affected Files

- `packages/flux-renderers-form/src/renderers/detail-view.tsx`
- `packages/flux-renderers-form/src/renderers/detail-field.tsx`
- `packages/flux-renderers-form/src/renderers/detail-view.test.tsx`
- `packages/flux-renderers-form/src/renderers/detail-field.test.tsx`

## Notes For Future Refactors

- `detail-view` schemas should use either `scopePath` or `name` interchangeably to identify the scope key. If the `DetailViewSchema` type ever adds `name` as a first-class field (rather than inheriting it from `BaseSchema`), the fallback logic should be revisited.
- Any renderer that creates a draft `FormRuntime` with a `parentScope` must use `scope.readOwn()` (not `scope.read()`) when collecting values to write back — `read()` merges the full ancestor chain.
- Always strip the `$form` key from `readOwn()` before writing draft values into a parent form field.
