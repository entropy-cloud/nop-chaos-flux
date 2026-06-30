# Round 02 — selection correctness (`table`) + H1 scope confirmation

> Execution: `2026-06-24-2213-open-ended-adversarial-review-components`
> Lens: _combination-explosion tester_ + _contract archaeologist_.

---

## R2-1 — Table "select all" operates on the raw source, not the filtered view; header checkbox state is computed against the wrong set

- **Where**: `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:68-71` (`normalizedRows = buildTableRowEntries(source, …)` from raw `source`), `:116-124` (`allSelected` uses `normalizedRows`), `:126-132` (`handleSelectAll` selects from `normalizedRows`). The hook is invoked with the raw `source` at `table-renderer.tsx:209` (`useTableSelection(tableSchemaProps, source, …)`), while column filtering is a separate concern (`useTableFilter`, `processTableData(source,…)` at `table-renderer.tsx:225`).
- **What**: Two compounding defects under active column filters/search:
  1. `handleSelectAll(true)` selects the rowKeys of **every row in the unfiltered source**, including rows the user has filtered out and cannot see. A user who filters to "active users" and clicks the header checkbox silently selects inactive users too.
  2. `allSelected` (`:116-124`) returns true only when _every_ row in the full unfiltered source is selected. So with any filter active, the header checkbox can essentially never render "checked" (the visible subset can be fully selected while hidden rows are not). The header receives a filtered `sourceLength`, but its `checked` predicate uses the unfiltered set — an internal inconsistency.
- **Why it matters**: Bulk selection is a primary table interaction; selecting invisible records + a perpetually-unchecked "select all" checkbox is a real correctness/UX bug, and it can leak into downstream `$crud.selectedRowKeys` / `getSelection()` capability results (filtered-out records get submitted).
- **Confidence**: Likely (data flow fully verified; the only uncertainty is whether "select-all-matching-query" is a deliberate product decision — but the header-checkbox-state inconsistency is objectively wrong regardless).

## R2-2 — Table selection keys are never pruned when rows disappear (selection drifts from reality)

- **Where**: `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:32-34` (`localSelectedRowKeys` initialized once from `rowSelection?.selectedRowKeys`), entire 312-line file.
- **What**: `localSelectedRowKeys` is mutated only by `handleSelectAll` / `handleSelectRow` / `setSelectionExternal`. There is **no effect** that intersects `selectedRowKeys` against the current `normalizedRows` and drops stale keys. So when the upstream `source` removes rows (server-side delete, filter change, re-query, pagination without `keepOnPageChange`), the removed rows' keys linger in `selectedRowKeys` forever.
- **Why it matters**: `getSelection()` capability results, `$crud.selectedRowKeys` summaries, and `selectionCount` carry phantom keys that no longer correspond to any row. Downstream actions ("delete selected", "export selected") operate on dead keys. This is the table-side analog of R1's list cross-page key drift — selection correctness is a weak area across both list and table.
- **Confidence**: Likely (verified no pruning path exists; severity depends on how often upstream mutation occurs).

## R2-3 — H1 scope confirmation: the "lying contract" pattern spans all 5 renderer packages and correlates with test coverage

- **Evidence**: `eventContracts:` declarations exist in `flux-renderers-basic` (1), `flux-renderers-form` (1), `flux-renderers-layout` (3), `flux-renderers-data` (4), `flux-renderers-content` (2) — i.e. every renderer package. There is **no automated guard** asserting that each declared `eventContracts` / `kind:'event'` field / `componentCapabilityContracts` entry is referenced by the renderer body or its registered handle.
- **Contrast datapoint**: spot-checked `flux-renderers-form` `form-definition.ts:245-266` — its eventContracts (`initAction`, `submitAction`, `onSubmitSuccess`, `onSubmitError`, `onValidateError`) are standard form-lifecycle events owned by the heavily-tested form runtime; this package appears **clean**. The lying instances found so far (data-source `onSuccess`/`onError`, chart `resize`, pagination ownership, prior-audit cards `onPageChange`/`selectionOwnership`, qrcode `onLoadError`) cluster in the **less-tested** renderers (data, content, layout).
- **Refinement of H1's root-cause fix**: the drift is not "new packages" (Round 1's framing) nor "everywhere" — it correlates with **missing per-renderer contract tests in lower-coverage packages**. The single highest-ROI guard is still an automated "declared contract must be referenced" check, but the contrast with `flux-renderers-form` shows it is precisely the packages that _lack_ the form-style lifecycle test coverage that drift. Prioritising the guard over `flux-renderers-data` + `flux-renderers-content` + `flux-renderers-layout` would catch the known family.

---

## Round 2 overall

Selection correctness is a cross-component weak area: list (R1 P0-4 cross-page key collision), table (R2-1 select-all vs filters, R2-2 stale-key drift). These are independent root causes but the same surface (`selectedKeys` diverging from visible/reality), suggesting a shared "selection-state-vs-visible-data" invariant is unenforced in both. The lying-contract theme (H1) is now confirmed repo-wide and its fix is sharpened.

## Blind-spot self-assessment (cumulative)

- `flux-renderers-basic` and `flux-renderers-form` were only spot-checked (definitions + form eventContracts); a dedicated pass on `dialog`/`drawer`/`tabs`/`page`/`loop` bodies is still open. (I read `use-surface-renderer.ts` fully — it is mature, with careful unmount cleanup + closed-publish dedup; no defect forced there.)
- Did not measure re-render cost (tree O(N)/render, row-scope cache identity churn) — still flagged as likely-but-unmeasured.
