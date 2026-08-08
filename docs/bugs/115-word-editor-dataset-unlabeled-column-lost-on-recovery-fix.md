# 115 Word Editor Dataset With Unlabeled Column Silently Lost On Recovery Fix

## Problem

- In the word-editor dataset dialog, a dataset could be saved with a column that had a name but an **empty label**; the domain model (`validateDataset`) requires every column to have a non-empty label.
- On the next mount, `normalizeDataset` (recovery/import path) ran the same validation, rejected the whole dataset as invalid, and the persisted dataset **silently disappeared** — the user saw their dataset in the panel, saved, and after reload it was gone with no error.
- The failure crossed layers: dialog (permissive save) ↔ domain model (label required) ↔ recovery normalize (fail-closed drop).

## Diagnostic Method

- we-4 dataset audit: compared `dataset-dialog.tsx handleSave` (only checked column _name_ before saving) against `dataset-model.ts validateDataset` (`if (!col.label || col.label.trim() === '')` → error) and `document-io.ts normalizeDataset` (validation failure → `null` → filtered out).
- Round-trip trace: save with empty label succeeds → persisted JSON contains the invalid column → `loadDatasets` drops the dataset → silent data loss on reload.

## Root Cause

- The dialog's save gate did not match the domain validation contract; the domain never degrades silently (fail-closed by design), so the inconsistency manifested as data loss at the recovery boundary.

## Fix

- `dataset-dialog.tsx`: save is now gated by `canSave` = non-empty dataset name **and** every column having both a non-empty name and label; the save button is disabled until the dialog state satisfies the domain contract (same gate as `handleSave`).

## Tests

- `dataset-dialog.test.tsx` — two new cases (red before the fix, green after): a column with empty label keeps Save disabled; filling the label enables Save and the saved payload carries the column.
- Existing e2e (`word-editor-dataset.spec.ts`) creates only column-less datasets, unaffected.

## Affected Files

- `packages/word-editor-renderers/src/dialogs/dataset-dialog.tsx`
- `packages/word-editor-renderers/src/__tests__/dataset-dialog.test.tsx`

## Notes For Future Refactors

- Keep the dialog save gate derived from the same `validateDataset` contract the persistence layer uses; a permissive writer next to a fail-closed reader is a silent-data-loss bug by construction.
- If column labels ever become optional in the domain, `validateDataset` and `normalizeDataset` must change together — not just the dialog.
