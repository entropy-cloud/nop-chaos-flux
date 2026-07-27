# MA3.3 代码质量审计 — 设计器 + 办公包簇

> **Audit Date**: 2026-07-27
> **Plan Reference**: `docs/plans/2026-07-27-0800-3-ma3-code-quality-audit.md`
> **Target Packages**: `flow-designer-core`, `flow-designer-renderers`, `report-designer-core`, `report-designer-renderers`, `spreadsheet-core`, `spreadsheet-renderers`, `word-editor-core`, `word-editor-renderers`
> **Audit Methodology**: `docs/skills/code-quality-audit-prompt.md`
> **Baseline**: Full verification GREEN at M0 (2026-07-27)

---

## MA3.3-1: `check:audit-suspects` — Filtered Designer + Office

### void-promise-no-catch (50 hits in target packages)

| Location                                                    | Line                                | Pattern                                                                                                                                                                                                                                                                                                                                                                                                                        | Risk                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `report-designer-renderers/src/report-designer-toolbar.tsx` | 139, 164                            | `void handleButtonClick(item)`                                                                                                                                                                                                                                                                                                                                                                                                 | Intentional fire-and-forget in toolbar click handlers; handlers are inherently synchronous within the same event loop                                                                                                                                                                                                                                                                                                                  |
| `spreadsheet-renderers/src/default-page-body.tsx`           | 146, 159-176, 185-193, 229, 244-246 | 27 `void` patterns: `handleEditSave`, `handleUndo`/`Redo`, `handleCopy`/`Cut`/`Paste`, `handleClear`, `handleStyleTool`, `handleMerge`/`Unmerge`/`MergeCenter`, `handleFillDown`/`FillSeries`, `handleInsertRow`/`DeleteRow`/`InsertColumn`/`DeleteColumn`, `handleFreeze`/`Unfreeze`, `handleFind`/`Replace`/`ReplaceAll`, `handleAddComment`/`DeleteComment`, `handleEditSave`, `handleAddSheet`/`RemoveSheet`/`RenameSheet` | **P2 — Consistent systematic void pattern.** All are toolbar/SheetTabBar callback wrappers. The `void` prefix ensures the promise is not awaited in the render cycle. However, 27 occurrences in a single component is a maintenance smell — any handler that starts returning errors will be silently dropped. Recommend a wrapper pattern: `const fire = (fn) => (...args) => void fn(...args)` with a single eslint-ignore comment. |
| `word-editor-renderers/src/word-editor-page.tsx`            | 94                                  | `void handleSave()`                                                                                                                                                                                                                                                                                                                                                                                                            | Intentional — save button click                                                                                                                                                                                                                                                                                                                                                                                                        |

### catch-without-structured-failure-path (24 hits in target packages)

| Location                                                              | Lines              | Pattern                                                         |
| --------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------- |
| `flow-designer-core/src/core-edge-commands.ts`                        | 86, 215            | `catch (err) { ctx.emit({ type: 'lifecycleHookError', ... }) }` |
| `flow-designer-core/src/core-node-commands.ts`                        | 51, 155            | Same lifecycleHookError pattern                                 |
| `flow-designer-renderers/src/designer-page-body.tsx`                  | 194                | `catch { /* silent */ }`                                        |
| `report-designer-core/src/core-dispatch.ts`                           | 216, 343           | `catch (err) { return { ok: false, error: err } }`              |
| `report-designer-renderers/src/report-designer-toolbar.tsx`           | 54                 | Catch without rethrow                                           |
| `report-designer-renderers/src/report-field-panel.tsx`                | 57                 | Catch without structure                                         |
| `report-designer-renderers/src/helpers.ts`                            | 38                 | Catch without structure                                         |
| `spreadsheet-core/src/core-dispatch.ts`                               | 29                 | `catch (err) { return { ok: false, error: err } }`              |
| `spreadsheet-core/src/core/search-operations.ts`                      | 19                 | Catch without structure                                         |
| `spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts` | 93, 124            | Catch without structured failure                                |
| `spreadsheet-renderers/src/canvas-styles.css`                         | Multiple           | CSS catches not applicable to code quality                      |
| `word-editor-core/src/document-io.ts`                                 | 403, 415, 499, 511 | `catch { reportRecoveryLoadError(...) }`                        |
| `word-editor-renderers/src/editor-canvas.tsx`                         | 63                 | Catch without structure                                         |
| `word-editor-renderers/src/hooks/use-word-editor-save.ts`             | 85                 | Catch                                                           |
| `word-editor-renderers/src/panels/outline-panel.tsx`                  | 86, 146            | Catch                                                           |
| `word-editor-renderers/src/toolbar/font-controls.tsx`                 | 29                 | Catch                                                           |
| `word-editor-renderers/src/toolbar/insert-controls.tsx`               | 63                 | Catch                                                           |
| `word-editor-renderers/src/word-editor-page.tsx`                      | 94                 | `catch { // best-effort }`                                      |

**Verdict**: P2 — Widespread but acceptable. Most catches in core dispatch files properly return structured error objects (`{ ok: false, error: err }`). The word-editor files use `reportRecoveryLoadError` which is a structured reporting pattern. The renderer files (toolbar, panel) have bare catches that could swallow errors silently.

---

## MA3.3-2: Manual Code Quality Audit — Live-Code Reading

### Oversized Files (>500 lines, excluding tests and dist)

| File                                                         | Lines | Type     | Assessment                                                                                                                                                        |
| ------------------------------------------------------------ | ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `report-designer-renderers/src/page-renderer.tsx`            | 677   | **OVER** | Hot spot — report designer page component, hosts WorkbenchShell with spreadsheet canvas integration. Contains significant inline JSX and state management.        |
| `flow-designer-core/src/core.ts`                             | 660   | **OVER** | Core orchestrator — manages document, history, selection, transactions, undo/redo, snapshots. Structurally cohesive but large.                                    |
| `flow-designer-renderers/src/designer-page-body.tsx`         | 570   | **OVER** | Main designer page body — hosts WorkbenchShell, palette, canvas, inspector, toolbar, dialog. Responsible for orchestrating all flows in the designer.             |
| `word-editor-core/src/document-io.ts`                        | 543   | **OVER** | Document serialization — normalization, localStorage persistence, recovery. Mostly composed of independent pure functions. Could extract normalization functions. |
| `report-designer-renderers/src/report-designer-manifest.ts`  | 528   | **OVER** | Manifest definitions                                                                                                                                              |
| `report-designer-core/src/core.ts`                           | 517   | **OVER** | Core report designer orchestrator                                                                                                                                 |
| `flow-designer-renderers/src/designer-command-adapter.ts`    | 512   | **OVER** | Command adapter — bridges generic DesignerCommand to core dispatch.                                                                                               |
| `spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx` | 508   | **OVER** | Table shell — the main spreadsheet grid rendering component. Dense rendering logic for cells, headers, merges, editing.                                           |
| `flow-designer-core/src/tree-layout.ts`                      | 505   | **OVER** | Tree layout algorithm                                                                                                                                             |

**Total**: 9 files over the 500-line guideline across the 8 target packages.

### Key File Review

#### `flow-designer-core/src/core-edge-commands.ts` (234 lines)

- **Status**: Clean, well-structured.
- Commands are pure functions operating on `EdgeCommandContext`.
- `catch (err)` at lines 86 and 215 emits structured `lifecycleHookError` events — appropriate.
- Each command has clear preconditions, validation, history push, and event emission.
- Type signature is explicit with proper return types.
- **No issues found.**

#### `flow-designer-renderers/src/designer-canvas.tsx` (412 lines)

- **Status**: Moderate complexity.
- Uses `useCallback` extensively (12 instances) without `eslint-disable react-compiler` annotations — these are **redundant** with React Compiler enabled (see MA3.3-3 below).
- `useMemo` on line 167 (`menuItems`) and line 236 (`nodeTypeSizeMap`) is similarly redundant.
- Manual equality comparator on `useDesignerSnapshotSelector` (lines 84-97) is 12-field deep comparison — this is a performance optimization that React Compiler cannot replace, but the approach is fragile. Recommend a generic shallow equal utility.
- **Finding**: P3 — Redundant `useCallback`/`useMemo` without compiler annotations.

#### `report-designer-core/src/core-dispatch.ts` (346 lines)

- **Status**: Clean, well-organized.
- Centralized `dispatchReportDesignerCommand` with clear `switch` on command type.
- Error handling: top-level `try/catch` at line 343 returns `{ ok: false, error: err }` — structured and appropriate.
- Each command handler wrapped in `withDerivedRefresh` for consistent post-mutation state refresh.
- Preview cancellation uses `AbortSignal` pattern — proper.
- **No issues found.**

#### `spreadsheet-core/src/core-dispatch.ts` (32 lines)

- **Status**: Minimal, clean dispatcher.
- Delegates to `commandHandlers` registry via `createCommandHandlerRegistry()`.
- Readonly check at entry point.
- `catch (err)` at line 29 returns structured error — acceptable.
- **No issues found.**

#### `spreadsheet-renderers/src/default-page-body.tsx` (252 lines)

- **Status**: High fragmentation.
- 27 `void` patterns (documented in MA3.3-1) — systematic, not individual problem but a systemic pattern that bypasses error handling.
- The `useSpreadsheetInteractions` hook returns 70+ destructured variables (lines 57-128). This indicates the hook is a **god object** — it returns everything the page body needs. While the hook itself is in a separate file, this destructuring pattern makes the component hard to understand and maintain.
- **Finding**: P2 — `useSpreadsheetInteractions` hook returns too many bindings (70+), making the component fragile and hard to reason about.

#### `word-editor-core/src/document-io.ts` (543 lines)

- **Status**: Mostly pure normalization functions with repetition.
- Contains multiple normalize\* functions (`normalizeWordElements`, `normalizeDocCharts`, `normalizeDocCodes`, `normalizeWordDocument`, `normalizePaperSettings`, `normalizeDataset`, `normalizeDatasets`) — each is a separate normalization concern but they share the same structural pattern: type guard → map → filter nulls.
- The `collectTemplateAttrs` function (lines 214-263) is a recursive tree walker with nested loops — this is the most complex logic in the file.
- `loadDocument()` and `loadDatasets()` follow the same error-handling pattern: try/catch per step → `reportRecoveryLoadError` → return null/empty.
- **Finding**: P3 — File is over 500 lines but the functionality is coherent (I/O persistence). `collectTemplateAttrs` could be simplified by flattening the recursion into a single-pass visitor, but this is non-critical.

#### `word-editor-renderers/src/word-editor-page.tsx` (364 lines)

- **Status**: Well-structured renderer component.
- Uses `useWordEditorState` hook to centralize state extraction (clean pattern).
- `handleAutosave` at line 90 uses `useCallback` — redundant with React Compiler.
- `collectDocumentText` is a pure utility extracted as module-level function.
- Panel rendering uses conditional slot/content resolution pattern consistent with renderer framework.
- **No significant issues found.**

### React 19 Optimization Candidates (Designer + Office)

**redundant-use-callback** — Most prevalent in `flow-designer-renderers` (50+ instances):

- `designer-canvas.tsx`: 12 useCallback + 2 useMemo
- `designer-page-body.tsx`: 8 useCallback
- `designer-page-inner.tsx`: 1 useCallback
- `designer-palette.tsx`: 2 useCallback
- `designer-toolbar.tsx`: 3 useCallback
- `designer-xyflow-canvas/*`: multiple useCallback
- `report-designer-renderers/page-renderer.tsx`: useCallback instances (lines 238-302)
- `word-editor-renderers/word-editor-page.tsx`: 1 useCallback
- `spreadsheet-renderers/page-renderer.tsx`: multiple useCallback

**redundant-react-memo**:

- `flow-designer-renderers/src/dingflow/ding-flow-edge.tsx:102`: `memo(DingFlowEdgeInner)` — redundant

**derived-state-in-effect** (suggest replacement with render-time derivation):

- `flow-designer-renderers/designer-page-body.tsx:113` — effect-driven state
- `flow-designer-renderers/designer-page-inner.tsx:41,50`
- `flow-designer-renderers/designer-toolbar.tsx:112`
- `flow-designer-renderers/designer-tree-mode.tsx:101,115`
- `spreadsheet-renderers/page-renderer.tsx:137,146,154,173,174`
- `spreadsheet-renderers/spreadsheet-grid.tsx:229`
- `word-editor-renderers/editor-canvas.tsx:48`

**start-transition-on-critical-action**:

- `report-designer-renderers/report-spreadsheet-canvas.tsx:41,147,156`

**Verdict**: P3 — Widespread but low-risk. All `useCallback`/`useMemo` instances are performance-preserving during a transitional period; they become truly redundant only when React Compiler is fully active. The `derived-state-in-effect` patterns are more concerning but are in complex interaction-heavy components (designer, spreadsheet).

---

## MA3.3-3: AI/Scheduling Tail Confirmation

### AI (`packages/flux-renderers-ai`)

- **Last Audit**: `docs/audits/2026-07-25-0707-multi-audit-ai.md` — 2 P1, 6 P2 findings.
- **Open P1s** (per `arm-index.md`):
  - `AI-P1-1`: `deleteConversation` post-await stale-closure race — still open, no fix seen
  - `AI-P1-2`: `ai-citations` HTML double-encoding — still open, no fix seen
- **Commits Since Audit**: 2 (2026-07-25 P2 remediation + editing state migration) — both are P2-level fixes from the same audit cycle. Neither touches the `deleteConversation` or `ai-citations` code paths.
- **Result**: ✅ **No new drift.** All 8 existing findings remain unchanged. No new patterns observed in the audit-suspect results beyond what was already documented.

### Scheduling (`packages/flux-renderers-scheduling`)

- **Last Audit**: `docs/audits/2026-07-23-0714-multi-audit-scheduling.md` — 1 P1 (SCHED-F73), 11 P2, 7 P3.
- **Open P1s** (per `arm-index.md`):
  - `SCHED-F73`: Kanban DnD test silent no-op — still open
- **Commits Since Audit**: 1 (`fix(scheduling): fix Gantt Strict Mode race and add null-safe layout`) — a targeted fix unrelated to the open P1.
- **Result**: ✅ **No new drift.** All 19 existing findings remain unchanged.

---

## MA3.3-4: Findings Summary

### P0 — None

No immediate bugs, security issues, or data corruption risks found.

### P1 — None

No high-probability regression risks or core contract violations found in the target packages. (The existing AI-P1-1, AI-P1-2, and SCHED-F73 are tracked in arm-index separately.)

### P2 — 2 findings

| ID           | Category             | Location                                                                          | Issue                                                                | Risk                                                                                                                                                                                                        | Fix Direction                                                                                                                                            |
| ------------ | -------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MA3-DO-P2-01 | Async Error Handling | `spreadsheet-renderers/src/default-page-body.tsx:146,159-176,185-193,229,244-246` | 27 systematic `void` patterns in toolbar/SheetTabBar callbacks       | Silent error swallowing if any handler starts returning errors. 27 identical patterns in one file makes the component maintenance-heavy and error-prone.                                                    | Extract to a single `fire(fn)` wrapper: `const fire = (fn) => (...args) => void fn(...args)`. Apply a single `eslint-disable` at the wrapper definition. |
| MA3-DO-P2-02 | Component Complexity | `spreadsheet-renderers/src/default-page-body.tsx:57-128`                          | `useSpreadsheetInteractions` hook returns 70+ destructured variables | The component is tightly coupled to the hook's full return surface. Any change to the hook breaks the page body. 70+ bindings in a single destructuring makes it nearly impossible to understand data flow. | Split into domain-specific sub-hooks (e.g., `useSpreadsheetToolbar`, `useSpreadsheetGrid`, `useSpreadsheetSheets`) or create focused selector layers.    |

### P3 — 4 findings

| ID           | Category                                  | Location                                                                                                                                             | Issue                                                                                                                                                                                                                                                                      | Risk                                                                                                                                                                      | Fix Direction                                                                                                        |
| ------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| MA3-DO-P3-01 | Redundant React19 Memoization             | All 8 target packages, concentrated in `flow-designer-renderers`                                                                                     | 50+ `useCallback`, 4+ `useMemo`, 1 `memo` without `eslint-disable react-compiler` annotations                                                                                                                                                                              | Creates noise when React Compiler is enabled. No behavioral risk.                                                                                                         | Remove in bulk during a dedicated React Compiler activation pass.                                                    |
| MA3-DO-P3-02 | Oversized Source Files                    | 9 source files >500 lines (non-test)                                                                                                                 | Files: `page-renderer.tsx` (677), `core.ts` (660), `designer-page-body.tsx` (570), `document-io.ts` (543), `report-designer-manifest.ts` (528), `report-designer-core/core.ts` (517), `designer-command-adapter.ts` (512), `table-shell.tsx` (508), `tree-layout.ts` (505) | Makes maintenance harder as these files continue to absorb new responsibility. The core orchestrator (`flow-designer-core/src/core.ts` at 660 lines) is the highest risk. | Audit and extract cohesive sub-modules. Priority: `flow-designer-core/src/core.ts` → extract transaction management. |
| MA3-DO-P3-03 | Catch-Without-Structured-Path             | `report-designer-renderers/src/report-designer-toolbar.tsx:54`, `report-field-panel.tsx:57`, `helpers.ts:38`, `word-editor-renderers` multiple files | Bare catch blocks that swallow/re-log errors without propagating structured failure info                                                                                                                                                                                   | Inconsistent error handling; some failures may be invisible to the user.                                                                                                  | Add structured error reporting or at minimum `console.error` with context.                                           |
| MA3-DO-P3-04 | Designer Canvas Large Equality Comparator | `flow-designer-renderers/src/designer-canvas.tsx:84-97`                                                                                              | 12-field manual deep equality comparator for snapshot selector                                                                                                                                                                                                             | Fragile — adding a field to the snapshot requires updating the comparator.                                                                                                | Replace with generic shallow equal utility.                                                                          |

---

## MA3.3-5: Conclusions

**Designer + Office code quality is generally solid.** The two core dispatch files (`report-designer-core/src/core-dispatch.ts`, `spreadsheet-core/src/core-dispatch.ts`) are clean, well-structured, and properly handle errors with structured result types. The designer core edge/node commands follow a consistent pattern of validation → mutation → history → event emission.

**Main risks are organizational, not behavioral:**

1. **Systematic void-promise pattern** in `spreadsheet-renderers/default-page-body.tsx` (P2) — the highest-value fix in this audit, easily addressed with a wrapper function.
2. **Hook complexity in spreadsheet-renderers** (P2) — `useSpreadsheetInteractions` returns 70+ bindings, making the component tightly coupled and hard to maintain.
3. **Oversized files** (P3) — 9 files exceed 500 lines. The most actionable is `flow-designer-core/src/core.ts` (660 lines) where transaction management could be extracted.
4. **Widespread redundant React19 memoization** (P3) — low urgency but high volume (50+ instances in `flow-designer-renderers` alone).

**No new drift in AI or Scheduling packages** — both tail confirmations are clean.

**No P0 or P1 findings** in the target packages. The existing AI/Scheduling P1s (AI-P1-1, AI-P1-2, SCHED-F73) remain open under their respective tracking.

---

_Report generated 2026-07-27 as part of MA3.3 audit execution._
