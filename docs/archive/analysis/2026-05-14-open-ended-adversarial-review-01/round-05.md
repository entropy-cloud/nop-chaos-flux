# Open-Ended Adversarial Review — 2026-05-14 — Round 5

This round checked whether the remaining table control candidates were just already-known selection/test gaps or a live data-shaping defect. The issue below is not the previously reported server-side pagination total problem; it is the client-side interaction between filtering and pagination.

## Finding 1: Table Filtering Keeps the Old Page Index and Pagination Totals from the Unfiltered Source

**Where**

- `packages/flux-renderers-data/src/table-renderer/table-data.ts:93-110` filters rows, then slices the filtered result using the current `currentPage` and `pageSize`.
- `packages/flux-renderers-data/src/table-renderer/use-table-filter.ts:75-116`, `120-155`, and `158-190` update filter/search state but never reset or clamp pagination.
- `packages/flux-renderers-data/src/table-renderer.tsx:214-226` feeds the current pagination state into `processTableData(...)` after filtering.
- `packages/flux-renderers-data/src/table-renderer.tsx:246-249` computes `totalPages` from `source.length`, not from the filtered row count.
- `packages/flux-renderers-data/src/table-renderer.tsx:464-473` passes `totalRows={source.length}` to `TablePaginationBar`.
- Existing tests cover a happy-path filtered page-1 slice in `packages/flux-renderers-data/src/__tests__/table-data-and-layout.test.tsx:101-127`, and select-all semantics after filter/sort/pagination in `packages/flux-renderers-data/src/__tests__/use-table-controls.selection.test.tsx:132-160`, but do not cover filtering while already on a later page.

**What**

The table renderer applies client-side filters before pagination, but the pagination owner still behaves as if it were paginating the original source. If a user is on page 3 and applies a filter/search that leaves only one matching row, the filtered array has length 1 and is then sliced with page-3 offsets:

```ts
const startIndex = (currentPage - 1) * pageSize;
data = data.slice(startIndex, startIndex + pageSize);
```

The visible result is an empty table even though matching rows exist. At the same time, the pagination bar still receives `totalRows={source.length}` and `totalPages=Math.ceil(source.length / pageSize)`, so the controls can continue to advertise pages from the unfiltered dataset.

**Why It Matters**

This is a correctness trap in a common table workflow: page forward, then narrow results. Users can interpret the empty body as "no matches" even though the filter did match rows on earlier pages. Schema authors also cannot reliably build summary/status UI around table pagination because the displayed page slice and pagination totals are derived from different row universes.

The fix direction is not just adding a test. The table data pipeline needs a filtered-row count before slicing, and filter/search changes need either to reset page to 1 or clamp the active page to the filtered `totalPages` across local/scope/controlled pagination modes. Without that, table controls remain internally inconsistent even though each individual hook looks locally correct.

This is distinct from the older `2026-05-06` finding where server-side pagination computed total pages from the current page payload. Here the source is a full client-side collection, but the renderer mixes filtered rows for the body with unfiltered rows for pagination state and totals.

**Confidence**: High.

## Round Summary

The table control family still has a cross-axis state problem: filter, search, and pagination are implemented as separate owners, but the rendered body depends on their composition. The missing derived count/page clamp sits at the composition boundary, so isolated hook tests can stay green while the user-visible table lies about available rows.

## Blind-Spot Self-Assessment

I did not run a DOM-level table interaction repro. The data path is direct enough to establish the bug statically, and the absence of a later-page filtered test is visible in the current unit coverage. A follow-up should add a regression around `currentPage > filteredTotalPages` and decide how controlled pagination should be notified when filter changes require page reset/clamping.
