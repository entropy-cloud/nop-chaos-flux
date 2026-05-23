# Open-Ended Adversarial Review — 2026-05-20 — Round 06

**Execution date**: 2026-05-20
**Result directory**: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/`
**Exploration areas**: Spreadsheet renderer virtualization, scroll-time scale behavior
**Discovery source**: 10x-scale review after excluding the historical pre-virtualization finding

---

## Finding: Spreadsheet virtualization limits DOM size but still recomputes full-grid offset arrays on every scroll render

- **Where**:
  - `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:176-198`
  - `packages/spreadsheet-renderers/src/spreadsheet-grid/viewport.ts:26-90`
  - `packages/spreadsheet-renderers/src/spreadsheet-grid/constants.ts:9-25`
  - historical baseline: `docs/analysis/2026-04-16-performance-audit.md:385-401`
- **What**: the old full-DOM spreadsheet rendering problem has been addressed with a viewport model, but the current viewport builder still does O(total rows + total cols) allocation and prefix-sum recomputation for every render. `handleScroll()` stores `scrollTop` / `scrollLeft` in React state, triggering render; render immediately calls `buildSpreadsheetGridViewport()`, which allocates fresh `rowOffsets` and `colOffsets` arrays with `rows + 1` and `cols + 1` entries before binary-searching the visible window. Virtualization now caps mounted cells, but it does not cap scroll-frame viewport math.
- **Why it matters**: this is a scale ceiling hidden behind a virtualization success. For the current tiny demos, 30x10 and 100x26 make the cost invisible. But the exported `SpreadsheetGrid` accepts arbitrary `rows` / `cols`, and spreadsheet/report-designer evolution naturally trends toward imported workbooks or configurable dimensions. At that point every scroll frame pays full-sheet allocation cost even though only a small visible window is rendered, creating GC churn and frame drops exactly where users expect virtualization to help.
- **Confidence**: High for the cost model, medium for immediate product severity. The implementation is explicit. The impact becomes visible only once sheet dimensions grow beyond today’s small defaults.
- **Non-duplication note**: this is not the April performance audit’s “spreadsheet grid renders the full table with no virtualization” finding; that issue described DOM size before virtualization. This is the residual after virtualization: the virtualized renderer still rebuilds full-grid offset arrays on the hot scroll path.
- **Suggested guardrail**: cache row/column offset state across scroll renders and rebuild only when `rows`, `cols`, `rowHeights`, or `columnWidths` change. For mostly-default dimensions, consider deriving offsets lazily or using default-size arithmetic plus sparse overrides, so scroll-window lookup stays closer to O(log overrides + visible window) instead of O(total sheet dimensions).

## Round Assessment

This round shows a common post-optimization trap: a visible bottleneck was fixed at the DOM layer, but the computational model retained a full-document pass on the interaction hot path.

## Blind-Spot Self-Assessment

This round did not benchmark large sheets or inspect all spreadsheet interactions. It also did not account for merged-cell/frozen-pane constraints that may complicate a sparse-offset structure. The core observation is limited to the current scroll-time viewport calculation.
