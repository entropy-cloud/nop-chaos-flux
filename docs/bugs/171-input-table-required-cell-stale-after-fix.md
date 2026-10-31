# 171 input-table Required Cell Stays Invalid After Fix (stale template-path field state)

## Problem

- A form containing an `input-table` whose row cell is `required` blocks a submit correctly while
  the cell is empty — but after the user fills the cell, **every later submit stays blocked**.
  The field-level red text clears on edit, yet `form.validate()` keeps returning `ok:false`.
- Surfaced by the M3-O1 OCR workbench replication (plan 814): wizard step 3 (`formId` on the
  detail-rows form) refused to advance after a first failed attempt, showing
  `步骤校验未通过` forever. Filling the cell _before_ the first attempt advanced normally.
- Any `submitForm` / wizard `formId` / `validate()` caller over an input-table (or combo) with a
  required row child is affected; plain required fields recover correctly.

## Diagnostic Method

- Difficulty: the visible field error cleared, so the UI suggested the form was valid; only the
  aggregate `validateForm` result disagreed.
- Narrowed in three steps: (1) Playwright probe on the O1 page — sequence _fill-first_ advanced,
  sequence _fail-then-fill_ did not; (2) a vitest reproduction in form-advanced with a control
  matrix — valid data submits, a plain required field recovers after fail→fix, an input-table
  required cell does **not** (pre-existing empty row and added row both fail); (3) a temporary log
  at the end of `validateForm` showed, on the second submit, `errors: []` but
  `preservedErrors` still holding key **`rows.sku`** — the template path.
- Decisive evidence: the stale key was the array **template** path, not any instance path.

## Root Cause

- Array-row child rules compile under the template path (`rows.sku`) and
  `validateArrayTemplateChildInstances` expands them per row, committing each **instance** path
  (`rows.1.sku`) itself (plan 550).
- `validateForm.validateFormPath` stored the failed result as `fieldErrors[path] = result.errors`
  with `path` = the template path. Those errors were merged into `fieldStates['rows.sku']`.
- On the next submit the template validation returned ok, so `fieldErrors['rows.sku']` was not
  set, and the final aggregation loop _preserves_ the existing field-state errors of a validated
  path that produced no new errors. Nothing ever re-commits the template path, so its stale
  errors survived forever.

## Fix

- `assignValidatedPathErrors` (`form-runtime-validation-array-template.ts`): when the validated
  path is an array-template expansion, key the errors by each error's own instance path; other
  paths keep the old `fieldErrors[path] = errors` behaviour. `form-runtime-owner.ts`
  `validateFormPath` calls it (orchestrator line count unchanged).
- Instance paths are committed by the expansion itself, so a fixed row clears on the next
  validation and no template-path field state is ever written.

## Tests

- `packages/flux-renderers-form-advanced/src/__tests__/input-table-revalidate-after-fix.test.tsx`
  — two cases (pre-existing empty row, added empty row): submit blocked → fill → resubmit reaches
  the submit action. Discriminating: both fail on the pre-fix runtime (2 failed), pass after.
- `tests/e2e/replication-doc-ocr-workbench.spec.ts` 交互④⑤ — wizard step 3 blocked by an empty
  added row, then advances after filling it.

## Affected Files

- `packages/flux-runtime/src/form-runtime-validation-array-template.ts`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- `packages/flux-renderers-form-advanced/src/__tests__/input-table-revalidate-after-fix.test.tsx`

## Notes For Future Refactors

- Any new aggregate that records per-path validation results must key array-template expansion
  errors by instance path: template paths never exist in form values and are never re-committed.
