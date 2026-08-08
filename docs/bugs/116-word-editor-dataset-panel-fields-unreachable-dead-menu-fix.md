# 116 Word Editor Dataset Panel Fields Unreachable And Dead Menu Fix

## Problem

- In the word-editor left panel, the **Fields tab could never show any fields**: `datasetStore.select` had zero call sites in the renderers, so `selectedDatasetId` stayed `null` forever and `FieldList` always rendered its "no dataset selected" empty state — the field-insertion workflow (click a field → insert `${dataset.field}` into the document) was unreachable from the UI.
- The row "more" (⋮) button was a dead control: `handleDatasetMenu` only called `event.stopPropagation()`, with an aria-label ("Dataset options") promising behavior that did not exist. There was also no way to delete a dataset even though `datasetStore.remove` exists.

## Diagnostic Method

- we-4 dataset audit: `rg "\.select\("` across both packages showed only the definition in `dataset-store.ts`; `dataset-panel.tsx:29-31` had the no-op menu handler (MA5 P3-07 already flagged it).
- The existing e2e suite locked the symptom: `word-editor.spec.ts` and `word-editor-dataset.spec.ts` both assert the Fields tab **empty state** — nobody had ever seen it with content in a real browser.

## Root Cause

- The selection state was modeled (store + selector + Fields consumption) but the panel never wired a selection gesture; the row click opened the edit dialog only, and the second affordance (⋮) was stubbed.

## Fix

- `dataset-panel.tsx`: row click now selects the dataset (`store.select(datasetId)`) **and** opens the edit dialog (existing behavior preserved); the ⋮ button is wired to a `DropdownMenu` with **Edit** and **Delete Dataset** actions; Delete opens a confirm dialog, then calls the new `onDeleteDataset` prop.
- `use-word-editor-actions.ts` + `word-editor-page.tsx`: new `handleDeleteDataset` (removes via `datasetStore.remove`, marks the document dirty on success) passed into the panel.
- New i18n keys `flux.wordEditor.deleteDataset` / `deleteDatasetConfirm` in both locales.

## Tests

- `dataset-panel-menu.test.tsx` — four new cases (would fail against the old code): row click calls `select` + edit; menu Edit opens the dialog; menu Delete → confirm calls the delete handler; Cancel leaves data intact.
- Existing `dataset-panel.test.tsx` cases preserved (mock extended with `select` + the new ui components).

## Affected Files

- `packages/word-editor-renderers/src/panels/dataset-panel.tsx`
- `packages/word-editor-renderers/src/hooks/use-word-editor-actions.ts`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`
- `packages/word-editor-renderers/src/__tests__/dataset-panel-menu.test.tsx`

## Notes For Future Refactors

- State modeled but unwired (store methods with zero consumers) is the same ghost-contract family as schema fields with zero consumers — audit cards should grep for callers of every public store method.
- When a control renders with an aria-label promising a feature, the label itself is a contract; a no-op handler is a defect, not a placeholder.
