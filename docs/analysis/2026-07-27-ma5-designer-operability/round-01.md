# MA5.1 Designer Operability Audit — Round 01

## Date: 2026-07-27

## Target Packages: flow-designer-core, flow-designer-renderers, report-designer-core, report-designer-renderers, spreadsheet-core, spreadsheet-renderers, word-editor-core, word-editor-renderers

## Anti-Pattern Hit Count

- F1 (固化缺陷断言): 0
- F2 (边界 mock): 0
- F3 (接线漏接): 0

## Findings

### [P2] Spreadsheet grid renders filter-gaps as blank rows instead of contiguous remaining rows

- **Category**: §1.2 — Rendering count and structure
- **Location**: packages/spreadsheet-renderers/src/spreadsheet-grid/viewport.ts:91-96
- **Evidence**:
  ```typescript
  const visibleRowIndices: number[] = [];
  for (let r = 0; r < frozenRows; r++) {
    if (!model.snapshot.activeSheet?.rows?.[String(r)]?.filteredOut) visibleRowIndices.push(r);
  }
  for (let r = visStartRow; r <= visEndRow; r++) {
    if (!model.snapshot.activeSheet?.rows?.[String(r)]?.filteredOut) visibleRowIndices.push(r);
  }
  ```
  Filtered rows are simply excluded from the `visibleRowIndices` array, but spacer heights (topSpacerHeight, bottomSpacerHeight) are computed from `visStartRow`/`visEndRow` which are NOT filter-aware. The HTML table rows use their original `rowHeights[row]` and `aria-rowindex`, so filtered rows leave literal blank gaps in the rendered grid. Excel hides filtered rows and closes the gap.
- **Expected Value**: When rows are filtered out (`filteredOut: true`), the remaining visible rows should be rendered contiguously without blank gaps between them, matching Excel behavior.
- **User Symptom**: After applying a filter, remaining rows appear with blank gaps where filtered rows were, instead of being contiguous.
- **Fix Direction**: After filtering, the viewport should either (a) skip filtered rows in spacer calculations and apply a per-row offset remapping, or (b) render a compacted table with positional adjustments and store the row→visual-offset mapping in the offset cache.

### [P2] cell-style-map ignores border-style positional values (outer, inner, top, left, etc.)

- **Category**: §1.6 — CSS marker/visual contract compliance
- **Location**: packages/spreadsheet-renderers/src/cell-style-map.ts:33-39
- **Evidence**:
  ```typescript
  const BORDER_STYLE_MAP: Record<string, string> = {
    all: 'ss-border-solid',
    solid: 'ss-border-solid',
    dashed: 'ss-border-dashed',
    dotted: 'ss-border-dotted',
    double: 'ss-border-double',
  };
  ```
  The `CellStyle.borderStyle` type (`packages/spreadsheet-core/src/types.ts:135-145`) defines values `'none' | 'all' | 'outer' | 'inner' | 'top' | 'right' | 'bottom' | 'left' | 'horizontal' | 'vertical'` — positional styles that describe which edges to style. `BORDER_STYLE_MAP` only maps `all` (which pushes the catch-all `ss-border-solid` class setting `border-style: solid` on all sides). Values `outer`, `inner`, `top`, `right`, `bottom`, `left`, `horizontal`, `vertical` all fall through to `undefined` and produce no CSS class, silently doing nothing.
- **Expected Value**: Positional border styles like `outer`, `top`, `bottom`, `left`, `right`, `horizontal`, `vertical` should render corresponding borders on the correct cell edges.
- **User Symptom**: Setting a cell border style to "outer" or "top" in the UI produces no visible border on the cell.
- **Fix Direction**: Implement per-side CSS class production for each positional border value (e.g., `outer` → only outermost edges get border styles, `top` → only top border), using per-side inline styles or dedicated CSS classes.

### [P2] Report designer inspector auto-open races with action scope registration

- **Category**: §2.4 — Event dispatch
- **Location**: packages/report-designer-renderers/src/page-renderer.tsx:382-402
- **Evidence**:
  ```typescript
  useEffect(() => {
    if (!hasConfiguredInspector(resolvedDesigner)) {
      return;
    }
    if (core.getSnapshot().inspector.open) {
      return;
    }
    void core.dispatch({ type: 'report-designer:openInspector' }).catch((error) => {
      ...
    });
  }, [core, env, props.path, resolvedDesigner]);
  ```
  The auto-open side effect fires in a `useEffect` that depends on `[core, env, props.path, resolvedDesigner]`. It does NOT depend on `actionScope` or the registration of namespaces (which happen in separate `useLayoutEffect` hooks, lines 346-360). If the inspector schema contains `report-designer:*` actions that resolve against the namespace provider, those actions might fire before the namespace is registered, because `useEffect` ordering relative to `useLayoutEffect` is well-defined (layout fires first) but the inspector auto-open decision uses `core.getSnapshot().inspector.open` synchronously — if `.open` is false, the dispatch fires. Since the namespace WAS registered in a `useLayoutEffect` before the `useEffect`, this is likely OK in practice, but the dependency array omission of `actionScope` makes the timing contract fragile against future refactors.
- **Expected Value**: The inspector auto-open dispatch should either (a) include `actionScope` in its dependencies, or (b) be gated by an explicit check that the namespace provider is registered.
- **User Symptom**: In rare timing edge cases (e.g., React concurrent mode, suspense boundaries), the inspector may open but report-designer actions within it may silently fail because the namespace provider hasn't been registered yet.
- **Fix Direction**: Add `actionScope` to the auto-open effect's dependency array and/or gate the dispatch on a `useRef` that is set after `useLayoutEffect` namespace registration completes.

### [P3] Tree projection tests never assert edge `leg` property

- **Category**: §3.1 — Test completeness
- **Location**: packages/flow-designer-core/src/tree-projection.test.ts
- **Evidence**:
  No assertion exists in any test for the `data.leg` value on projected edges. The projection function sets `leg: 'near-target'` on branch edges and `leg: 'near-source'` on merge edges (`tree-projection.ts:108,126`), but tests only check source/target IDs and edge types. The `leg` property is structurally significant for downstream rendering (DingFlow edge styling distinguishes near-target vs near-source legs).
- **Expected Value**: At least one test should verify that branch edges carry `data.leg === 'near-target'` and merge edges carry `data.leg === 'near-source'`.
- **User Symptom**: If the `leg` property is accidentally omitted or inverted by a refactor, DingFlow edge rendering could apply wrong arrow/color per edge leg without test detection.
- **Fix Direction**: Add test cases in `tree-projection.test.ts` that assert `data.leg` values on branch and merge edges.

### [P3] cell-style-map has no test for borderStyle class generation

- **Category**: §3.1 — Test completeness
- **Location**: packages/spreadsheet-renderers/src/cell-style-map.test.ts
- **Evidence**:
  The test suite covers `borderWidth`, `borderColor`, `borderTop` per-side border, and the per-side precedence over borderColor/borderWidth. But there is no test that provides a `borderStyle: 'solid'` (or `'dashed'`, `'dotted'`, `'double'`) value and asserts that the corresponding `ss-border-*` CSS class appears in `result.className`.
- **Expected Value**: A test case verifying that `mapCellStyle({ borderStyle: 'solid' })` returns a className containing `ss-border-solid`.
- **User Symptom**: If `BORDER_STYLE_MAP` is accidentally broken (e.g., the `solid` key is removed during a refactor), no test would catch it.
- **Fix Direction**: Add a test case for each border style value in `cell-style-map.test.ts`.

### [P3] getSelectedAxisInfo returns misleading count for non-contiguous selections

- **Category**: §1.1 — Code clarity (non-functional)
- **Location**: packages/spreadsheet-renderers/src/spreadsheet-grid/constants.ts:119-121
- **Evidence**:
  ```typescript
  return {
    start,
    end,
    count: end - start + 1,
  };
  ```
  For a non-contiguous row selection such as `[1, 2, 5]`, `count` is computed as `5 - 1 + 1 = 5`, but only 3 rows are actually selected. The field name `count` implies "number of selected items", while the computation returns the "span range". The downstream usage (`spreadsheet-grid.tsx:75-76`) checks `count === 1` to determine single-row selection, which happens to work correctly because any multi-row selection (contiguous or not) produces `count > 1`. But the computed value is semantically wrong and could mislead future logic that uses `count` as an actual count.
- **Expected Value**: `count` should reflect the actual number of selected items (`values.length`), not `end - start + 1`.
- **User Symptom**: None currently — the only consumer checks `=== 1` which is unaffected. However, any future code using `count` as item count would compute incorrectly.
- **Fix Direction**: Change `count` to `values.length` (the actual selected items count), and audit any existing `count` consumers.

### [P3] Word editor uses lucide-react import style inconsistent with project conventions

- **Category**: §1.6 — CSS/visual contract compliance (minor)
- **Location**: packages/word-editor-renderers/src/word-editor-page.tsx:2
- **Evidence**:
  ```typescript
  import {
    ArrowLeft,
    Save,
    FileText,
    Database,
    Columns,
    Type,
    ChevronLeft,
    ChevronRight,
  } from 'lucide-react';
  ```
  The rest of the project uses `resolveLucideIcon` from `@nop-chaos/ui` (as seen in `report-designer-renderers/src/page-renderer.tsx:43` and `flow-designer-renderers/src/designer-page-body.tsx`). Direct `lucide-react` imports bypass the icon resolution layer, making it harder to swap icon sets and inconsistent with the project convention.
- **Expected Value**: All icon usage should go through `resolveLucideIcon` from `@nop-chaos/ui` for consistent icon resolution, tree-shaking, and theming.
- **User Symptom**: None visible; icons render correctly. Violation of project-wide icon resolution convention.
- **Fix Direction**: Replace direct `lucide-react` imports in `word-editor-page.tsx` with `resolveLucideIcon` calls from `@nop-chaos/ui`.

### [P3] Flow designer `insertChainNode` in graph mode uses hardcoded `y + 100` offset for new node position

- **Category**: §1.1 — Layout/positioning algorithms
- **Location**: packages/flow-designer-renderers/src/designer-command-adapter.ts:310-313
- **Evidence**:
  ```typescript
  const newNode = core.addNode(
    command.nodeType,
    { x: sourceNode.position.x, y: sourceNode.position.y + 100 },
    command.data,
  );
  ```
  The vertical offset for a new chain node is hardcoded at 100px. This does not account for node height (which varies per `nodeType.appearance`) or the configured `layerSpacing` from `TreeConfig`. The `relayoutAfterTreeMutation(core)` call after insertion should re-layout nodes and correct their positions, so the hardcoded offset is likely overwritten. But `relayoutAfterTreeMutation` is guarded by `autoLayout` — if autoLayout is disabled, nodes will retain the hardcoded offset.
- **Expected Value**: New node position should either read `nodeType.appearance.minHeight` to compute a sensible offset, or always rely on `relayoutAfterTreeMutation` regardless of `autoLayout` state (if this is the intended behavior).
- **User Symptom**: When auto-layout is disabled, inserting a chain node places it at a fixed 100px below the source node regardless of node heights, potentially causing overlap.
- **Fix Direction**: Use `nodeTypeSizeMap` or `NormalizedDesignerConfig` to read the node's minHeight for offset calculation, or ensure `relayoutAfterTreeMutation` always runs after chain node insertion in graph mode.

## No-Findings Sections

### §1.3 — Tick marks/labels/formatting

No findings. The designer packages do not implement time-scale tick marks or date formatting tokens (those are in scheduling renderers). Spreadsheet column labels use `cellAddress` for A1-style formatting, which is correct.

### §1.4 — Special elements (milestones, multi-day splits, today/weekend markers, dependency lines)

No findings. Flow designer handles node/edge rendering through @xyflow/react. Milestone zero-width nodes, edge dependency lines, and tree-mode overlays are all delegated to the xyflow bridge and DingFlow renderers, which are not in scope of this designer-operability audit.

### §1.5 — Timezone/date calculations

No findings. Designer packages do not implement timezone-sensitive date calculations.

### §1.7 — Empty/loading states

No findings. `DesignerPageRenderer` shows i18n fallback messages for missing config/document. `ReportDesignerPageRenderer` creates a fallback empty document when input is invalid. Word editor initializes with empty editor state. All provide graceful degradation.

### §2.1 — schema→store wiring

No findings. All store-accepted fields are properly passed from top-level components (designer-page, report-designer-page, spreadsheet-page). Config, document, readOnly, statusPath are all resolved and forwarded.

### §2.2 — Internal state driving rendering

No findings. Components correctly use hook-derived state (useDesignerSnapshotSelector, useSyncExternalStoreWithSelector) for reactive rendering, not schema static values.

### §2.3 — Controlled/uncontrolled patterns

No findings. readOnly prop consistently gates mutations. StatusPath is consumed via status publication. No ownership/statePath confusion found.

### §2.5 — Handle/region wiring

No findings. Toolbar, inspector, palette, dialogs, body regions are all properly wired with scope and actionScope. Fallback renderers exist for missing custom content.

### §2.6 — Core interaction circuits

No findings. Drag-and-drop (palette→canvas), keyboard navigation (arrow keys in grid, Enter/F2 for editing), connection/reconnection circuits are all properly implemented through the command adapter pipeline.

### §2.7 — Degradation and error feedback

No findings. Lifecycle hook errors are reported via `reportRuntimeHostIssue`. Command failures produce structured `{ok, error, reason}` results. Notifications are shown to users.

### §3.2 — Integration boundary mock

No findings. Tests use real core instances (`createDesignerCore`, `createSpreadsheetCore`, `createReportDesignerCore`). No significant mock boundary issues identified.

### §3.3 — Tautological/zero-assertion tests

No findings. All tests have meaningful assertions beyond `not.toThrow()`.

### §3.4 — Dead code with tests

No findings. All tested code paths in core and renderer packages have production import chains.

### §3.5 — Environment-sensitive tests

No findings. The designer packages do not perform timezone-specific date formatting in tested code paths.

### §4 — Interaction Quality & Visual Fluency

No findings (code-reading only). Cannot assess runtime interaction quality (drag thresholds, ghost preview, animations, performance) without executing the application. These should be evaluated in a runtime MA5.2 audit round with the playground.

## Overall Assessment

- Display Correctness: at-risk (2 P2 findings in cell border CSS mapping and filter gap rendering)
- Integration Wiring: at-risk (1 P2 finding in inspector auto-open timing fragility)
- Test Effectiveness: pass (minor P3 coverage gaps for leg property and borderStyle class)
- Interaction Quality: not assessed (code-reading only)

**Note**: No P0 or P1 findings were identified. The designer packages demonstrate solid architectural foundation and correct wiring. The P2 findings represent real but moderate-severity issues in display correctness (filter gaps, border style mapping) and wiring robustness (inspector auto-open race). These are well within the MA1/MA2/MA3 architecture baseline and do not render any component "unusable in default config."
