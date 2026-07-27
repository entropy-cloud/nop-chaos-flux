# MA5.1 UI/UX — 设计器可操作性审计

> **Audit Date**: 2026-07-27
> **Plan Reference**: `docs/plans/2026-07-27-1900-1-ma5-ui-ux-audit.md`
> **Target Packages**: flow-designer-core, flow-designer-renderers, report-designer-core, report-designer-renderers, spreadsheet-core, spreadsheet-renderers, word-editor-core, word-editor-renderers
> **Audit Methodology**: `docs/skills/complex-component-display-operability-audit-prompt.md`
> **Baseline**: Full verification GREEN at M0 (2026-07-27)

---

## Audit Summary

2 rounds of iterative discovery analyzed all 8 designer packages. **17 findings total: 2 P2, 15 P3. No P0 or P1.**

**Anti-pattern hits**: F1 (固化缺陷断言)=0, F2 (边界 mock)=0, F3 (接线漏接)=1

---

## P2 Findings

### [P2-01] Spreadsheet grid renders filter-gaps as blank rows instead of contiguous remaining rows

- **Category**: §1.2 — Rendering count and structure
- **Location**: `packages/spreadsheet-renderers/src/spreadsheet-grid/viewport.ts:91-96`
- **Evidence**: Filtered rows excluded from `visibleRowIndices` but spacer heights not filter-aware → blank gaps
- **User Symptom**: After filter applied, remaining rows appear with blank gaps where filtered rows were
- **Fix Direction**: Apply per-row offset remapping after filtering or render compacted table with positional adjustments

### [P2-02] Word Editor `useWordEditorState` exposes stale `savedDocument` data through window probe after cleanup race

- **Category**: §2.2 — Internal state driving rendering
- **Location**: `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:229-247`
- **Evidence**: `getState()` closure captures `savedDocument` at effect setup time, not lazily at probe-read time
- **User Symptom**: `window.__NOP_WORD_EDITOR_PROBE__.getState().document` may return stale data between save and next render
- **Fix Direction**: Use a ref (`savedDocumentRef.current`) inside getState() for lazy reading

### [P2-03] Report designer inspector auto-open races with action scope registration

- **Category**: §2.4 — Event dispatch
- **Location**: `packages/report-designer-renderers/src/page-renderer.tsx:382-402`
- **Evidence**: useEffect auto-opens inspector without `actionScope` in dependency array
- **User Symptom**: In rare timing edge cases (React concurrent mode/suspense), inspector may open but report-designer actions may silently fail
- **Fix Direction**: Add `actionScope` to useEffect dependencies and/or gate dispatch on a ref set after namespace registration

### [P2-04] cell-style-map ignores border-style positional values (outer, inner, top, left, etc.)

- **Category**: §1.6 — CSS marker/visual contract
- **Location**: `packages/spreadsheet-renderers/src/cell-style-map.ts:33-39`
- **Evidence**: `BORDER_STYLE_MAP` only maps `'all'` and `'solid'`/`'dashed'`/`'dotted'`/`'double'`; positional values (`'outer'`, `'top'`, `'bottom'`, `'left'`, `'right'`, `'horizontal'`, `'vertical'`) fall through to undefined → no CSS class
- **User Symptom**: Setting border to "outer" or "top" in the UI produces no visible border
- **Fix Direction**: Implement per-side CSS class production for each positional border value

---

## P3 Findings

### Test Coverage (7 findings)

| #     | Location                                                                                     | Description                                                                      |
| ----- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P3-01 | `packages/word-editor-renderers/src/`                                                        | Entire package has zero tests (12 components/hooks, no `.test.ts` files)         |
| P3-02 | `packages/flow-designer-core/src/core-edge-commands.ts`, `core-node-commands.ts`             | Zero direct unit tests for command functions                                     |
| P3-03 | `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.test.ts`                    | Tautological test — only checks compile-time key count, no behavioral assertions |
| P3-04 | `packages/flow-designer-core/src/tree-projection.test.ts`                                    | No assertion for `data.leg` property on projected edges                          |
| P3-05 | `packages/spreadsheet-renderers/src/cell-style-map.test.ts`                                  | Missing test for `borderStyle` class generation                                  |
| P3-06 | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts:25-35` | `setCellValue`/`setCommentText` are no-ops (empty callbacks)                     |
| P3-07 | `packages/word-editor-renderers/src/panels/dataset-panel.tsx:29-31`                          | Dead `handleDatasetMenu` — `MoreVertical` button does nothing                    |

### Integration Wiring (3 findings)

| #     | Location                                                                                 | Description                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| P3-08 | `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts:103-105` | Edge sync unconditionally replaces all local edges on snapshot change, unlike node sync which preserves local state      |
| P3-09 | `packages/report-designer-renderers/src/bridge.ts:75-86`                                 | `as never` type assertion bypasses compile-time safety for runtime aggregate                                             |
| P3-10 | `packages/word-editor-renderers/src/panels/outline-panel.tsx:103-107`                    | `readOutline(bridge)` called synchronously in render body; `outlineRevision` state is dead code (`void outlineRevision`) |

### Code Convention (3 findings)

| #     | Location                                                                                                                                           | Description                                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| P3-11 | `packages/word-editor-renderers/src/word-editor-page.tsx:2`, `panels/outline-panel.tsx:2`, `panels/dataset-panel.tsx:2`, `panels/field-list.tsx:2` | Direct `lucide-react` imports in 4 files instead of project convention `resolveLucideIcon`                            |
| P3-12 | `packages/spreadsheet-renderers/src/spreadsheet-grid/constants.ts:119-121`                                                                         | `getSelectedAxisInfo` count returns `end-start+1` (span) instead of actual selected count                             |
| P3-13 | `packages/flow-designer-renderers/src/designer-command-adapter.ts:310-313`                                                                         | `insertChainNode` hardcodes `y+100` offset without accounting for node height, only corrected if `autoLayout` enabled |

---

## Assessment

| Dimension                | Verdict          | Key Issues                                                                                             |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------ |
| Display Correctness (§1) | **at-risk**      | Filter gaps, border style mapping, OutlinePanel sync render                                            |
| Integration Wiring (§2)  | **at-risk**      | Inspector auto-open race, stale window probe capture, `as never` bypass                                |
| Test Effectiveness (§3)  | **at-risk**      | Word editor zero tests, flow designer command modules zero direct tests, tautological spreadsheet test |
| Interaction Quality (§4) | **not assessed** | Code-reading only; runtime evaluation needed                                                           |

**Overall**: No P0/P1. Designer packages demonstrate solid architecture foundation. P2 issues are moderate-severity display/wiring defects. P3 issues are primarily test coverage gaps and minor code quality concerns. Most impactful gaps: word-editor-renderers zero test coverage, filter gap rendering in spreadsheet, and border style mapping in spreadsheet.

---

## Round Artifacts

- `docs/analysis/2026-07-27-ma5-designer-operability/round-01.md` — 7 findings (2 P2, 5 P3)
- `docs/analysis/2026-07-27-ma5-designer-operability/round-02.md` — 10 findings (1 P2, 9 P3) + test effectiveness downgrade to at-risk
