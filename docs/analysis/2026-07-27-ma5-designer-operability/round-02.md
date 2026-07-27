# MA5.1 Designer Operability Audit — Round 02

## Date: 2026-07-27

## Anti-Pattern Hit Count

- F1 (固化缺陷断言): 0
- F2 (边界 mock): 0
- F3 (接线漏接): 1

## New Findings

### [P2] Word Editor `useWordEditorState` exposes stale `savedDocument` data through window probe after cleanup race

- **Category**: §2.2 — Internal state driving rendering
- **Location**: packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:229-247
- **Evidence**:
  ```typescript
  useEffect(() => {
    window.__NOP_WORD_EDITOR_PROBE__ = {
      getState() {
        return {
          document: savedDocument?.data ?? null,
          datasets: datasetStore.getAll(),
          runtime: editorRuntime,
        };
      },
    };
    return () => {
      delete window.__NOP_WORD_EDITOR_PROBE__;
    };
  }, [datasetStore, editorRuntime, savedDocument]);
  ```
  The probe closure captures `savedDocument` (a useState value). Between the cleanup registration and execution, `savedDocument` may update. If the component unmounts while an async save is in-flight that updates `savedDocument` after the last render and before the effect cleanup, a stale capture is harmless (the probe is deleted). But if `savedDocument` changes after the probe effect re-runs but before cleanup triggers, and another effect holds a reference to the probe, the data could be stale. More critically, the `datasetStore.getAll()` call is evaluated at probe-read time, not at effect setup time — this is actually correct. The `savedDocument` value, however, IS captured at effect setup time and will be stale if the probe is read after `savedDocument` changes but before the effect re-runs.
- **Expected Value**: The probe should read `savedDocument` lazily at getState() call time, same as `datasetStore.getAll()` does, instead of capturing it in the closure at effect setup time.
- **User Symptom**: Debugging via `window.__NOP_WORD_EDITOR_PROBE__.getState().document` may return stale document data if queried between a save completion and the next render.
- **Fix Direction**: Change the closure to read `savedDocument` from a ref that is always current: use a `savedDocumentRef = useRef(savedDocument)` with a `useEffect` to keep it in sync, and reference `savedDocumentRef.current` inside the probe's `getState()`.

### [P3] Word Editor renderers package has zero tests

- **Category**: §3.1 — Test completeness
- **Location**: packages/word-editor-renderers/src/ (entire package)
- **Evidence**: `packages/word-editor-renderers/` has 16 source entries including 12 components/hooks (editor-canvas, outline-panel, dataset-panel, field-list, use-word-editor-state, use-word-editor-actions, use-word-editor-save, use-word-editor-shortcuts, etc.) — zero `.test.ts` or `.test.tsx` files exist anywhere in the package. The `__tests__/` directory is absent.
- **Expected Value**: At minimum, the core hooks (`useWordEditorState`, `useWordEditorActions`) and critical UI (`EditorCanvas`, `OutlinePanel`) should have tests verifying their contract, error handling, and interaction with the canvas-editor bridge.
- **User Symptom**: Any refactor or bug fix in word-editor-renderers has no regression safety net.
- **Fix Direction**: Add a test suite for `useWordEditorState` (bridge lifecycle, dirty state propagation, paper settings), `useWordEditorActions` (dataset CRUD, template expression insertion), and `EditorCanvas` (mount/unmount, autosave debouncing, content change subscription cleanup).

### [P3] Word Editor `OutlinePanel` synchronously reads entire document in render body with dead `outlineRevision` state

- **Category**: §1.1 — Rendering structure
- **Location**: packages/word-editor-renderers/src/panels/outline-panel.tsx:103-107
- **Evidence**:
  ```typescript
  const [outlineRevision, setOutlineRevision] = useState(0);
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});
  void outlineRevision;
  const outline = applyExpandedState(readOutline(bridge), expandedState);
  ```
  `readOutline(bridge)` is called synchronously during render, calling `bridge.command.getValue()` which reads the entire document from the canvas-editor instance. The `outlineRevision` state is incremented on content changes (line 131) to trigger re-renders, but the variable itself is never used — `void outlineRevision` suppresses the lint warning. This means every re-render (including unrelated state changes) re-executes `readOutline`, which is potentially expensive for large documents. The `void` pattern also signals the variable is dead code.
- **Expected Value**: `readOutline` should be called inside `useEffect` or `useMemo` with proper dependencies, and `outlineRevision` should be a proper dependency of the memo.
- **User Symptom**: Typing in a large document with the outline panel open causes the full document to be read on every keystroke re-render (though debouncing at line 130-132 mitigates the frequency).
- **Fix Direction**: Move `readOutline` into a `useEffect` that sets outline state, or wrap in `useMemo` with `outlineRevision` as a dependency. Remove the `void outlineRevision` pattern.

### [P3] Word Editor `DatasetPanel` has dead menu button — `handleDatasetMenu` is empty, no delete/edit menu shown

- **Category**: §1.7 — Empty/loading/edge states
- **Location**: packages/word-editor-renderers/src/panels/dataset-panel.tsx:29-31, 136-146
- **Evidence**:
  ```typescript
  const handleDatasetMenu = (datasetId: string, event: React.MouseEvent) => {
    event.stopPropagation();
  };
  ```
  The `MoreVertical` button is rendered (lines 136-146) with `onClick={(e) => handleDatasetMenu(dataset.id, e)}`, but `handleDatasetMenu` only prevents event propagation without opening any menu. There is no `handleDeleteDataset` function or delete UI anywhere in the panel.
- **Expected Value**: The MoreVertical button should either open a dropdown menu with delete/edit options, or be removed if the dataset operation menu is not yet implemented.
- **User Symptom**: Users see a MoreVertical button that appears to offer options but clicking it does nothing.
- **Fix Direction**: Either implement the dataset context menu (delete, rename) or remove the button. If deletion is deferred, add a `@deprecated` comment and remove the button.

### [P3] Word Editor uses direct `lucide-react` imports in 4 files instead of project convention `resolveLucideIcon`

- **Category**: §1.6 — CSS/visual contract compliance
- **Location**: packages/word-editor-renderers/src/word-editor-page.tsx:2 (reported in Round 01), panels/outline-panel.tsx:2, panels/dataset-panel.tsx:2, panels/field-list.tsx:2
- **Evidence**:
  ```
  outline-panel.tsx:  import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
  dataset-panel.tsx:  import { Database, Plus, MoreVertical } from 'lucide-react';
  field-list.tsx:     import { Columns, Copy, Info } from 'lucide-react';
  ```
  Round 01 reported `word-editor-page.tsx`. These 3 additional files have the same issue. All `lucide-react` icons bypass the project's `resolveLucideIcon` wrapper from `@nop-chaos/ui`.
- **Expected Value**: All icon usage should go through `resolveLucideIcon`.
- **User Symptom**: None visible; violations of project-wide icon resolution convention.
- **Fix Direction**: Replace all direct `lucide-react` imports with `resolveLucideIcon` calls.

### [P3] Flow Designer `core-edge-commands` and `core-node-commands` have no direct unit tests

- **Category**: §3.1 — Test completeness
- **Location**: packages/flow-designer-core/src/core-edge-commands.ts, packages/flow-designer-core/src/core-node-commands.ts
- **Evidence**: `grep` for `addEdgeCommand|addNodeCommand|deleteEdgeCommand|deleteNodeCommand|moveNodeCommand|updateNodeCommand|reconnectEdgeCommand` across all `*.test.ts` files in `flow-designer-core` returns zero matches. These modules are tested only indirectly through integration tests in `core.test.ts` and `__tests__/core-graph.test.ts`. The individual functions (`addEdgeCommand`, `addNodeCommand`, `deleteNodeCommand`, `moveNodesCommand`, etc.) have no standalone test coverage. Edge cases like `beforeConnect` hook returning a modified connection, `beforeDelete` redirecting to a different edge/node, or `updateEdgeData` on a non-existent edge have no dedicated tests.
- **Expected Value**: Each command function should have at minimum one test per non-trivial branch (success path, validation rejection, lifecycle hook failure, missing entity).
- **User Symptom**: If a command function's validation logic or hook interaction is broken by a refactor, no direct test catches it.
- **Fix Direction**: Add unit tests for `core-edge-commands.ts` (addEdgeCommand with port args, beforeConnect hook transform, reconnectEdgeCommand with unchanged path, duplicate port check) and `core-node-commands.ts` (addNodeCommand with position clamping, deleteNodeCommand with min-instances guard, moveNodeCommand with non-finite position rejection).

### [P3] Flow Designer xyflow edge sync resets all local edge state on snapshot change, unlike node sync

- **Category**: §2.2 — Internal state driving rendering
- **Location**: packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts:103-105
- **Evidence**:
  ```typescript
  useEffect(() => {
    setLocalEdges(snapshotEdges);
  }, [snapshotEdges, setLocalEdges]);
  ```
  Node sync (lines 93-101) uses `syncLocalNodesWithSnapshot` which preserves local node positions when node structure hasn't changed, using `lastCommittedPositionsRef` to detect user-dragged positions. Edge sync unconditionally replaces the entire local edge set with the snapshot edges, discarding any local edge state (e.g., temporarily selected edge during reconnect, or edge animation state managed by xyflow's internal state).
- **Expected Value**: Edge sync should preserve local interaction state when the edge structure is unchanged, similar to the node sync pattern. At minimum, local edge hover/selection state should survive snapshot updates.
- **User Symptom**: During rapid edge data updates (e.g., label changes from external sources), brief visual flicker or loss of edge hover state may occur.
- **Fix Direction**: Implement a `syncLocalEdgesWithSnapshot` function analogous to `syncLocalNodesWithSnapshot` that preserves local edge state when edge IDs and types are unchanged.

### [P3] Report Designer bridge uses `as never` type assertion that bypasses compile-time safety

- **Category**: §2.4 — Event dispatch / wiring
- **Location**: packages/report-designer-renderers/src/bridge.ts:75-86
- **Evidence**:
  ```typescript
  const runtime = buildAggregatedRuntimeSummary(designer, {
    document: { workbook: spreadsheet.workbook },
    activeSheetId: spreadsheet.activeSheet?.id ?? '',
    selection: { kind: 'none' },
    history: {
      canUndo: spreadsheet.runtime.canUndo,
      canRedo: spreadsheet.runtime.canRedo,
    },
    readonly: spreadsheet.runtime.readonly,
    dirty: spreadsheet.runtime.dirty,
    viewport: spreadsheet.runtime.viewport,
  } as never);
  ```
  The second argument is cast with `as never`, completely bypassing TypeScript type checking. If the `buildAggregatedRuntimeSummary` function changes its parameter type, this call site will not produce a compile error. The object passed contains a mix of fields from multiple types — notably `{ kind: 'none' }` for selection when the actual snapshot may have a different selection kind, and `history` wraps `canUndo`/`canRedo` in an unexpected shape.
- **Expected Value**: The call should use properly typed interfaces. If the function accepts a partial or union type, the argument should match. The `as never` indicates a type hole that future refactors will silently pass through.
- **User Symptom**: None currently, but a change to `buildAggregatedRuntimeSummary` signature could silently produce incorrect runtime aggregate values without compile-time detection.
- **Fix Direction**: Define the exact parameter type expected by `buildAggregatedRuntimeSummary` and construct a properly typed argument instead of using `as never`. If the function needs restructuring, add a type assertion with a specific intermediate type rather than `never`.

### [P3] Spreadsheet `setCellValue` and `setCommentText` in `useSpreadsheetShell` are no-ops

- **Category**: §3.4 — Dead code with tests / §2.6 — Core interaction circuits
- **Location**: packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts:25-35
- **Evidence**:
  ```typescript
  const setCellValue = useCallback((_value: React.SetStateAction<string>) => {}, []);
  const setCommentText = useCallback((_value: React.SetStateAction<string>) => {}, []);
  ```
  These callbacks accept a value but do nothing. They are passed to `useSelection` (`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts:239,241`) where they are called on cell click:
  ```typescript
  setCellValue(String(cell?.value ?? ''));
  setCommentText(typeof comment === 'string' ? comment : (comment?.text ?? ''));
  ```
  The `cellValue` and `commentText` returned by `useSpreadsheetShell` are derived from the snapshot (not local state), so the no-ops don't cause visible data loss — the values update on next render via the snapshot subscription. However, any code path that depends on an _immediate_ synchronous update (same render cycle) after calling these functions will silently fail. The pattern is misleading: the function signatures promise state mutation but deliver none.
- **Expected Value**: Either implement actual state setters that hold local state in `useSpreadsheetShell` (and return the local state), or remove the callbacks entirely and let all consumers read values exclusively from the snapshot.
- **User Symptom**: If a future consumer calls `setCellValue('new value')` expecting `cellValue` to update synchronously before the next render, it will not work.
- **Fix Direction**: Replace with proper `useState` in `useSpreadsheetShell` that initializes from the snapshot, or remove `setCellValue`/`setCommentText` from the return type and refactor `useSelection` to not call them.

### [P3] `useSpreadsheetInteractions.test.ts` is a tautological compile-time contract test

- **Category**: §3.3 — Tautological/zero-assertion tests
- **Location**: packages/spreadsheet-renderers/src/use-spreadsheet-interactions.test.ts:1-104
- **Evidence**:
  ```typescript
  it('SpreadsheetInteractionsReturn covers expected API surface', () => {
    const keys: (keyof SpreadsheetInteractionsReturn)[] = [
      'snapshot',
      'selectedCell' /* ... 93 string literals ... */,
    ];
    expect(keys.length).toBeGreaterThan(70);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
  ```
  The only test in the file verifies that a hardcoded array of string keys (1) has >70 entries, and (2) contains no duplicates. This is a compile-time contract check that provides zero runtime behavioral coverage. The file's own comment (lines 7-10) acknowledges: "Direct render-testing requires a full bridge + React context. This file tests the contract shape and re-exports to catch accidental breakage when sub-hooks are refactored." The test does not instantiate the hook, exercise any callback, or verify any runtime behavior.
- **Expected Value**: The 14+ sub-hooks wired by `useSpreadsheetInteractions` should have individual behavioral tests (most do in `spreadsheet-interactions/`), but the compositor hook itself should have at least one integration test verifying the full wiring.
- **User Symptom**: A refactor that breaks the wiring between sub-hooks (e.g., a prop name mismatch) would not be caught by this test file.
- **Fix Direction**: Add a behavioral integration test for `useSpreadsheetInteractions` that renders it with a real bridge, simulates a user interaction (e.g., cell click), and verifies the returned snapshot/selectedCell/editingCell reflect the interaction.

## No-Findings Sections

### §1.2 — Rendering count and structure

No new findings beyond Round 01's filter gap P2.

### §1.3 — Tick marks/labels/formatting

No findings (verified designer packages have no time-scale formatting).

### §1.4 — Special elements

No findings. DingFlow overlays rely on xyflow viewport portal; no structural issues found.

### §1.5 — Timezone/date calculations

No findings.

### §2.1 — schema→store wiring

No findings. Round 01 coverage holds.

### §2.3 — Controlled/uncontrolled patterns

No findings.

### §2.5 — Handle/region wiring

No findings.

### §2.7 — Degradation and error feedback

No findings. Word Editor's `useWordEditorSave` handles AbortError correctly. `useWordEditorShortcuts` guards against editable targets.

### §3.2 — Integration boundary mock

No findings. Tests use real core instances.

### §3.5 — Environment-sensitive tests

No findings.

### Flow Designer canvas rendering (designer-xyflow-canvas.tsx)

No new findings. The xyflow canvas correctly delegates to DingFlow for tree overlays, properly gates drag/connect per `documentMode`, and handles viewport normalization.

### Spreadsheet table-shell rendering (table-shell.tsx)

No new findings beyond Round 01's filter gap. The `TOP/BOTTOM/LEFT/RIGHT` spacer pattern is well-implemented for virtual scrolling.

## Assessment Update

- **Display Correctness**: still at-risk (Round 01 P2 for filter gap + border styles stand; Round 02 adds minor §1.1 concern about OutlinePanel sync render)
- **Integration Wiring**: still at-risk (Round 01 P2 for auto-open race; Round 02 adds P3 `as never` type bypass in report designer bridge)
- **Test Effectiveness**: **downgrade to at-risk**. Round 02 found:
  - **Word Editor renderers: zero tests** across 12 components/hooks
  - **Flow Designer core-edge-commands + core-node-commands: zero direct tests**
  - **Spreadsheet `useSpreadsheetInteractions.test.ts` is tautological** (only compile-time shape check)
  - These gaps mean 3 of the 8 designer packages have significant test blind spots
- **Code Quality**: new minor findings (no-op callbacks in spreadsheet shell, dead menu button in dataset panel, `as never` type bypass, direct lucide-react imports in 4 word editor files)

**Note**: Round 02 did not find P0 or P1 issues. The P2 finding about the word editor window probe stale-capture is moderate severity (debug-only impact). The most impactful result is the test coverage gap across word-editor-renderers and flow-designer-core command modules, which should be addressed in a MA5.3 coverage improvement round.

## Packages Deep-Dived

- `word-editor-renderers`: editor-canvas.tsx, outline-panel.tsx, dataset-panel.tsx, field-list.tsx, hooks/\* (4 files)
- `word-editor-core`: canvas-editor-bridge.ts, document-io.ts, template-expr.ts, editor-store.ts
- `flow-designer-core`: core-edge-commands.ts, core-node-commands.ts, core.test.ts, **tests**/ (3 test files)
- `flow-designer-renderers`: designer-command-adapter-graph.ts, designer-xyflow-canvas/\* (3 files), tree-commands.ts, designer-command-adapter.test.ts
- `report-designer-renderers`: bridge.ts, report-designer-inspector.tsx, inspector-shell-renderer.tsx, field-panel-renderer.tsx, page-renderer.tsx (lines 1-100)
- `spreadsheet-renderers`: use-spreadsheet-interactions.ts, use-selection.ts, use-spreadsheet-shell.ts, spreadsheet-grid.tsx, spreadsheet-grid/ (viewport.ts, table-shell.tsx), use-sheet-commands.ts, use-snapshot.test.tsx
- `spreadsheet-core`: (verified no new findings beyond Round 01)
