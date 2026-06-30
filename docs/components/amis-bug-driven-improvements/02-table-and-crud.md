# 02 Table & CRUD — Amis Bug-Driven Improvements

> Flux owner docs: `docs/components/table/design.md`, `docs/components/crud/design.md`, `docs/architecture/table-row-identity-and-scope-performance.md`
> amis cluster: `table/crud` (420), `table/filter` (12), `table/pagination` (8), `table/export` (21)
> Priority summary: Flux's design closes most recurring amis bugs by construction (row-identity doc kills index-as-identity; `keepOnPageChange` kills most selection-across-pages bugs; data-source kills component-api-refresh bugs). The residual gaps are genuine.
> Triage: ~46 deep-reads (+420 crud titles scanned) → 34 entries across 13 areas (A–M).

## Decision Vocabulary

See `README.md`. Severities: P0/P1/P2/P3.

## NOT-ADOPTED (amis table designs Flux rejects)

| amis feature                                                      | Reason rejected                                  | AMIS-REF             |
| ----------------------------------------------------------------- | ------------------------------------------------ | -------------------- |
| Component-level `api` / `initFetch` / `interval` / `syncLocation` | Requests go through `data-source` + action graph | (whole crud cluster) |
| Front-end export (CSV/Excel)                                      | Backend responsibility                           | export/              |
| `loadDataOnce` + per-instance `source` short-circuit              | Replaced by data-source `clientMode`             | #3109 et al.         |
| `autoFillHeight` (deferred, not rejected)                         | Marked 暂不实现; if implemented later, see T17   | #4481                |

---

## A. Row Identity

| #   | Property                                                                                                                                                                                                                                                     | Signal     | Severity | AMIS-REF                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1  | `rowKey` supports **composite / computed** identity (real data has ip+port, tenant+code with no single unique field). Either `rowKey` is a Flux expression evaluated per record, or owners project a synthetic `__rowKey` with a documented hydrate pattern. | DESIGN-GAP | P1       | #479                                                                                                                                                               |
| T2  | A field literally named with symbols (e.g. `hello-world`) or containing a `.` resolves as a bracket-key path; unified path binding accepts arbitrary field names.                                                                                            | TEST-GAP   | P2       | #3189 — **RESOLVED (B7)**: out-of-scope-feature (B3.1 adjudicated; bracket-key literal-dot resolution is distinct path-binding feature; successor B7/feature plan) |

**Recommended action T1:** Add design note to `table-row-identity-and-scope-performance.md` "Stable Row Key / Authoring Contract": state the contract for compound keys (expression `rowKey` OR synthetic `__rowKey` projection pattern).

**Recommended tests:**

- T2: record keys `hello-world` and `a.b` (literal) → column `name` resolves correct value; `rowKey` on such a field works for selection.

---

## B. Pagination

| #   | Property                                                                                                                                                                                                                                | Signal     | Severity | AMIS-REF                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| T3  | A page-change mutates only `currentPage` and never clobbers `pageSize` back to default.                                                                                                                                                 | TEST-GAP   | P1       | #4199, #4406                                                                                                                 |
| T4  | `total` arriving async (late-binding) updates the pager without remount.                                                                                                                                                                | TEST-GAP   | P2       | #4487 — **RESOLVED (B7)**: watch-only (reactive total re-renders pager; late-binding no-remount construct-true; P2 low-risk) |
| T5  | **Page clamp on data shrink** — after a delete/bulk action yields fewer items than `(currentPage-1)*pageSize`, the owner clamps `currentPage` to the new last page and re-fetches (Flux owns pagination state, so this is client-side). | DESIGN-GAP | P0       | #1478, #2458, #5203                                                                                                          |

**Recommended action T5 (highest user-impact):** Add design note to `crud/design.md` §7 (pagination ownership): "when a refresh/delete yields fewer total items than `(currentPage-1)*pageSize`, the owner must clamp `currentPage` to the new last page before/with the next refresh."

**Recommended tests:**

- T3: set `pageSize=20`, navigate to page 2; assert `pageSize` stays 20, request carries 20.
- T4: `total` starts undefined, resolves async → pager buttons + go-input update reactively.
- T5: 11 items, `pageSize=10`, page 2, delete the only row → table shows page 1 with 10 rows, not empty.

---

## C. Sort

| #   | Property                                                                                                                                                         | Signal     | Severity | AMIS-REF                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------ |
| T6  | Sort comparator resolves the column `name` through the **same path binder** used for cell display, including dotted/nested paths (`name: 'metadata.updatedAt'`). | DESIGN-GAP | P1       | #6004                                                                                            |
| T7  | Applying a header filter preserves the active sort into the next data request/computation (sort and filter are independent ownership DTOs).                      | TEST-GAP   | P2       | #4469 — **RESOLVED (B7)**: watch-only (sort/filter independent DTOs construct-true; P2 low-freq) |

**Recommended action T6:** Add design note to `table/design.md` §7 sort ownership: "sort comparator MUST resolve the column `name` through the same path binder used for cell display, including dotted/nested paths."

**Recommended tests:**

- T6: column `name:'a.b'`, sortable → sort orders by `record.a.b`.
- T7: apply sort asc, then a header filter on another column → both sort and filter reach the data-source together.

---

## D. Selection

| #   | Property                                                                                                                                                                                               | Signal     | Severity | AMIS-REF                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | -------------------------------------------------------------------------------------------------- |
| T8  | Click dispatch is target-aware: a click on the selection checkbox must not trigger `onRowClick` or a cell popOver; popOver/copyable trigger clicks must not bubble to `onRowClick`/`expandRowByClick`. | DESIGN-GAP | P1       | #4443, #4926                                                                                       |
| T9  | With fixed-left columns + leading selection column + horizontal overflow, the selection checkbox column stays pixel-aligned with its body row across horizontal scroll.                                | TEST-GAP   | P2       | #5222 — **RESOLVED (B7)**: covered-by B3.3 (fixed-left + selection-column offset anchor)           |
| T10 | `component:setSelection(['k1','k99'])` where `k99` is on page 2 → page 1 shows `k1` checked; navigating to page 2 shows `k99` checked; summary count=2 (interacts with `keepOnPageChange`).            | TEST-GAP   | P2       | #4636 — **RESOLVED (B7)**: covered-by B3.3 (`setSelection` cross-page + `keepOnPageChange` anchor) |

**Recommended action T8:** Add design note to `table/design.md`: "click dispatch priority — selection-control clicks and popOver/copyable trigger clicks must not bubble to `onRowClick`/`expandRowByClick`."

**Recommended tests:**

- T8: click checkbox → toggles selection only; click popOver icon → opens popOver only; click plain cell → fires `onRowClick`.
- T9 (e2e/visual): fixed-left + selection + wide table → after horizontal scroll, selection checkboxes remain aligned with rows.
- T10: `setSelection(['k1','k99'])` with k99 on page 2 → cross-page selection tracked.

---

## E. Tree / Nested Table

| #   | Property                                                                                                                                                              | Signal     | Severity | AMIS-REF                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| T11 | Lazy-load per node — expanding a node triggers an upstream load for that node's children and merges (large trees must not require the full `children` data up front). | DESIGN-GAP | P1       | #3238                                                                                                                             |
| T12 | Tree expansion state survives a data refresh (same rowKeys re-materialize → expanded branches stay expanded); OR this is explicitly documented as not-preserved.      | TEST-GAP   | P2       | #4683, #5865 — **RESOLVED (B7)**: watch-only (rowKey-keyed expansion state construct-true; P2 low-freq)                           |
| T13 | Tree-table selection does NOT cascade to children (deliberate) — locked so a future change doesn't silently invert it.                                                | LOCK       | P2       | #5865 — **RESOLVED (B7)**: landed-anchor (Phase 2 — select parent → children NOT auto-selected; flat rowKey Set, no cascade code) |
| T14 | Editable tree: "add child to row X" inserts into X's children array, not the root array (exercises row-index-bridge at nested path).                                  | TEST-GAP   | P2       | #3993 — **RESOLVED (B7)**: watch-only (editable-tree add-child row-index-bridge construct-true; P2 niche)                         |

**Recommended action T11:** Add design note to `table/design.md` §7 tree ownership: define a lazy-children contract — `rowChildrenField` + an **on-expand user-triggered** action (mirrors input-tree `childrenSource`, bug-15 §1 compliant pattern #3 "用户交互驱动"; dispatched via `props.helpers`/`executeSource` on node expand, NOT mount-time auto-fetch) loading children via row-index-bridge — OR explicitly DEFER with rationale. Do not leave implicit.

**Recommended tests:**

- T12: expand tree node, refresh data (same rowKeys) → node stays expanded.
- T13: select parent row in tree table → child rows NOT auto-selected.
- T14: editable tree, "add child" on deeply-nested row → new row appears as sibling of that row's children.

---

## F. Column Resize / Fixed Header

| #   | Property                                                                                                                                                      | Signal     | Severity | AMIS-REF                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| T15 | Column resize works when the table overflows horizontally (scrollbar present); a column can be resized more than once; width clamps to `minWidth`/`maxWidth`. | TEST-GAP   | P1       | #3455, #4649                                                                                                            |
| T16 | Multi-level grouped header + fixed columns do not grossly misalign on horizontal scroll (residual tolerance documented even if pixel-perfect deferred).       | TEST-GAP   | P2       | #1638 — **RESOLVED (B7)**: watch-only (multi-level header+fixed alignment visual tolerance construct-true; P2 low-risk) |
| T17 | When `autoFillHeight` is eventually implemented, fixed columns re-layout on vertical-scrollbar appearance/disappearance inside the fill-height container.     | DESIGN-GAP | P3       | #4481 — **RESOLVED (B7)**: watch-only (`autoFillHeight` 暂不实现; precondition premature until it lands)                |

**Recommended action T17:** Add design note to `table/design.md` decision table / §12: capture the `autoFillHeight`×fixed-column precondition now (reference amis #4481 as the failure to avoid).

**Recommended tests:**

- T15: resize a column on a table wider than viewport; resize same column twice.
- T16 (visual/e2e): nested header + `fixed:'left'` + horizontal scroll → header/body aligned within tolerance.

---

## G. Aggregation / Cell Merge

| #   | Property                                                                                                                               | Signal                                             | Severity   | AMIS-REF                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| T18 | Summary row (`prefixRow`/`affixRow`) re-aligns to **visible** leaf columns when columns are toggled hidden at runtime (no stale gaps). | TEST-GAP                                           | P1         | #2942                                                                                             |
| T19 | Summary-cell evaluation bindings (`$table.rows`, `$table.total`, …) are documented and stable; `${$table.rows                          | ...}` evaluates against the documented collection. | DESIGN-GAP | P2                                                                                                | #5098 — **RESOLVED (B7)**: watch-only (summary-eval bindings internal detail; formal vocabulary = optimization-candidate) |
| T20 | `combineNum` merges exactly the first N columns; `combineNum` + `fixed:'left'` keeps rowSpan and fixed positioning consistent.         | TEST-GAP                                           | P2         | #4550, #714 — **RESOLVED (B7)**: watch-only (`combineNum` rowSpan+fixed construct-true; P2 niche) |

**Recommended action T19:** Add design note to `table/design.md`: document summary-row evaluation bindings (canonical collection name + total).

**Recommended tests:**

- T18: affixRow cells for columns A,B,C; toggle B hidden → summary re-aligns to A,C.
- T20: `combineNum=2` merges exactly first 2 columns; `combineNum` + `fixed:'left'` on a merged column → rowSpan/fixed consistent.

---

## H. Drag-Sort

| #   | Property                                                                                                                               | Signal     | Severity | AMIS-REF                                                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| T21 | If a per-row draggable condition is added, it gates the **actual move** (drop rejected), not just handle visibility.                   | DESIGN-GAP | P2       | #3285 — **RESOLVED (B7)**: watch-only (per-row draggable condition depends on unimplemented drag-condition feature) |
| T22 | Drag-sort writeback payload at `orderField` is well-formed (record identity present, no `{}`), including for first/last boundary rows. | TEST-GAP   | P2       | #1533 — **RESOLVED (B7)**: watch-only (drag-sort writeback payload construct-true; P2 niche)                        |

**Recommended action T21:** Add design note to `table/design.md` §7 row-sort ownership: if a per-row draggable condition is added, it must gate the move operation, not just handle visibility.

**Recommended test T22:** drag-sort rows → scope state at `orderField` contains all rowKeys with correct new order, including first/last, no empty entries.

---

## I. Data-Source Refresh Contract (CRUD-specific)

| #   | Property                                                                                                                                                                                                                                                                                                                                                        | Signal     | Severity | AMIS-REF                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| T23 | When a crud/table consumes rows via upstream `source`/expression (not its own request), an upstream owner refresh propagates to the table rows.                                                                                                                                                                                                                 | DESIGN-GAP | P1       | #1943                                                                                                                                 |
| T24 | Nested crud-in-crud (or table-in-expand-row-bound-to-different-source) isolates: refreshing A does not overwrite B's rows; B's pagination is independent.                                                                                                                                                                                                       | TEST-GAP   | P1       | #5889                                                                                                                                 |
| T25 | A table in dialog-in-dialog **evaluates its `source` expression exactly once per dialog open** (no exponential fan-out across nested dialog owners). NOTE: Flux `source?: SchemaValue` is expression-value-binding (bug-15 §6.1 pattern #1 — component reads scope, does NOT fetch); this test guards against N² expression re-evaluation, NOT against a fetch. | TEST-GAP   | P2       | #3105 — **RESOLVED (B7)**: watch-only (`source` expr once-per-open, lexical scope, pattern #1; construct-true)                        |
| T26 | `clientMode.loadDataOnce` + cleared filter returns the full loaded set (no empty result, no silent re-request).                                                                                                                                                                                                                                                 | TEST-GAP   | P2       | #3109 — **RESOLVED (B7)**: watch-only (`loadDataOnce` NOT-ADOPTED; Flux `clientMode` single-owner has no state-leak; holds vacuously) |
| T27 | `items:null`/`undefined` normalizes to `[]` (empty grid, no error toast); `total:null`/missing does not produce an unbounded/infinite pagination loop.                                                                                                                                                                                                          | DESIGN-GAP | P1       | #6391, #4908                                                                                                                          |

**Recommended action T27:** Add design note to `crud/design.md` source-result consumption: "`items` nullish ⇒ `[]`; `total` nullish ⇒ treat as `items.length` (no infinite loop)."

**Recommended tests:**

- T23: upstream scope/data-source refresh with `source: '${rows}'` → table re-renders, total recomputes.
- T24: crud A (source S_A) with expand-row crud B (source S_B) → refresh A doesn't overwrite B; B pagination independent.
- T25: table in dialog-in-dialog → `source` expression evaluates exactly once per dialog open (no fan-out); component reads scope, does not fetch (pattern #1).
- T26: `loadDataOnce=true`, filter cleared → shows all loaded rows, no upstream request.

---

## J. Filter (Form)

| #   | Property                                                                                                                        | Signal     | Severity | AMIS-REF                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Client-mode filter distinguishes "filter value is the number/string `0`" from "filter absent/empty" — falsy is not "no filter". | TEST-GAP   | P1       | #6260                                                                                                                                                                                                    |
| F2  | Cleared filter field query semantics are defined (default: key omitted; opt-in send-empty).                                     | DESIGN-GAP | P2       | #4823 — **RESOLVED (B7)**: landed-doc-note (Phase 2 — `crud/design.md` F2: client-match drops empties (F1); published `query` payload透传 queryForm getValues 不自动省略 key; 省略经 transformOutAction) |

**Recommended action F2:** Add design note to `crud/design.md` §6.4 queryForm: define cleared-field query semantics (default omit; opt-in send-empty).

**Recommended tests:**

- F1: `loadDataOnce`, filter select with option value `0` → only rows matching 0 shown.
- F2: clear a field and submit → that key absent from published query by default.

---

## K. Dynamic Columns

| #   | Property                                                                                                                                                      | Signal     | Severity | AMIS-REF                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| T28 | `columns` may bind to a scope expression and recompile when it changes, OR dynamic columns are explicitly DESIGN-ACK-NOT-IMPL — not left at ambiguous "部分". | DESIGN-GAP | P2       | #2334 — **RESOLVED (B7)**: out-of-scope-feature (`columns` static schema; dynamic recompile is distinct feature gap) |

**Recommended action T28:** Add design note to `table/design.md`: state explicitly whether `columns` may bind to a scope expression and recompile, or mark DESIGN-ACK-NOT-IMPL.

---

## L. Performance (Virtualization / Re-render Fan-out)

| #   | Property                                                                                                                    | Signal   | Severity | AMIS-REF                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| T29 | Hover/focus on one cell does NOT re-render sibling rows (row-local read requirement holds).                                 | TEST-GAP | P1       | #1679                                                                                                               |
| T30 | Editing one cell in a large (20×20) editable table limits render fan-out to that row; keystroke-to-paint budget documented. | TEST-GAP | P2       | #3205 — **RESOLVED (B7)**: watch-only (edit fan-out row-local construct-true; perf budget = optimization-candidate) |
| T31 | Expanding a tree node with many children materializes only the virtual window, not all N children synchronously.            | TEST-GAP | P2       | #703 — **RESOLVED (B7)**: watch-only (tree-expand virtualizes window construct-true; P2 perf)                       |

**Recommended tests:**

- T29: 100-row table, instrument row render counts, hover/focus cell in row 50 → only row 50 re-renders.
- T30 (perf): 20×20 editable table, type in one cell → fan-out limited to that row; document budget vs `docs/architecture/performance-design-requirements.md`.
- T31: tree node with 500 children, expand → materialized row scopes == virtual window, no synchronous multi-second block.

---

## M. Column State Robustness

| #   | Property                                                                                                                   | Signal   | Severity | AMIS-REF                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| T32 | Rapidly toggling/reordering a column mid-render never throws, leaves no stale-column reference, and the summary re-aligns. | TEST-GAP | P2       | #6069 — **RESOLVED (B7)**: watch-only (column toggle/reorder mid-render robustness edge construct-true; low-risk) |

**Recommended test T32:** rapidly toggle a column hidden while its cells mid-render, and reorder columns → no exception, no stale-column reference, summary re-aligns.

---

## Highest-Leverage Items

1. **T5** — page clamp on data shrink (highest user-impact; Flux owns pagination, no clamp rule documented).
2. **T1** — composite/computed `rowKey` (clearest design gap; row-identity doc has no compound-key story).
3. **T6** — sort on nested/dotted path (silent correctness gap; comparator vs display path binder).
4. **T8** — click-dispatch priority (three live features collide with no stated priority).
5. **T27** — source-result nullish robustness (cheap to specify, prevents real breakage).
