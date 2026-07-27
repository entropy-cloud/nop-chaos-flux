# Unit Test Contract Coverage Audit: Spreadsheet & Word Editor Packages

**Audit Date**: 2026-07-27  
**Packages Audited**:

- `@nop-chaos/spreadsheet-core`
- `@nop-chaos/spreadsheet-renderers`
- `@nop-chaos/word-editor-core`
- `@nop-chaos/word-editor-renderers`

**Dedup Sources** (not re-reported):

- MA3.3 P2 findings are already documented
- Catch-without-structured-failure-path findings are already documented

---

## 1. Package: `@nop-chaos/spreadsheet-core`

### 1.1 Public API Contract Checklist

| #   | Contract                                                                                                                                           | Kind     | Test Coverage                                                                                                                                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | `cellAddress(row, col)`                                                                                                                            | function | `types.test.ts` (5 cases)                                                                                                                                                                  |
| C2  | `parseCellAddress(str)`                                                                                                                            | function | `types.test.ts` (5 cases + roundtrip)                                                                                                                                                      |
| C3  | `isSameCellRef(a, b)`                                                                                                                              | function | `types.test.ts` (3 cases)                                                                                                                                                                  |
| C4  | `isRangeEmpty(range)`                                                                                                                              | function | `types.test.ts` (2 cases)                                                                                                                                                                  |
| C5  | `rangeContainsCell(range, cell)`                                                                                                                   | function | `types.test.ts` (4 cases)                                                                                                                                                                  |
| C6  | `normalizeRange(range)`                                                                                                                            | function | `types.test.ts` (2 cases)                                                                                                                                                                  |
| C7  | `rangeSize(range)`                                                                                                                                 | function | `types.test.ts` (2 cases)                                                                                                                                                                  |
| C8  | `createEmptyDocument(id?)`                                                                                                                         | function | `types.test.ts` (2 cases)                                                                                                                                                                  |
| C9  | `createDefaultSelection()`                                                                                                                         | function | **NOT TESTED**                                                                                                                                                                             |
| C10 | `createDefaultViewport()`                                                                                                                          | function | **NOT TESTED**                                                                                                                                                                             |
| C11 | `createDefaultHistory()`                                                                                                                           | function | **NOT TESTED**                                                                                                                                                                             |
| C12 | `createDefaultLayout()`                                                                                                                            | function | **NOT TESTED**                                                                                                                                                                             |
| C13 | `mergeCellStyle()`                                                                                                                                 | function | **NOT TESTED**                                                                                                                                                                             |
| C14 | `getCellsInRange()`                                                                                                                                | function | **NOT TESTED**                                                                                                                                                                             |
| C15 | `rangeIntersects()`                                                                                                                                | function | **NOT TESTED**                                                                                                                                                                             |
| C16 | `createSpreadsheetCore(options)`                                                                                                                   | function | `core-basics.test.ts`, `core-advanced.test.ts`, `types.test.ts`, `new-commands-mutation.test.ts`, `new-commands-undo-edge.test.ts`, `p1-features.test.ts`, `batch-cell-operations.test.ts` |
| C17 | `SpreadsheetCore` API: `getSnapshot`, `dispatch`, `subscribe`, `replaceDocument`, `exportDocument`, `acceptCurrentDocumentAsSaved`, `getClipboard` | methods  | Covered across multiple test files                                                                                                                                                         |
| C18 | `isSpreadsheetCommand(cmd)`                                                                                                                        | function | **NOT TESTED**                                                                                                                                                                             |
| C19 | `SpreadsheetConfig` shape contract                                                                                                                 | type     | `types.test.ts` (1 case)                                                                                                                                                                   |
| C20 | All type exports (SpreadsheetDocument, CellStyle, etc.)                                                                                            | type     | Compile-time only                                                                                                                                                                          |

### 1.2 Command-to-Test Mapping

Exported command types tested via `core.dispatch()`:

| Command                                                                                                                                                                  | Test File(s)                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `setActiveSheet`                                                                                                                                                         | `core-basics.test.ts`                                     |
| `setSelection`                                                                                                                                                           | `core-basics.test.ts`, `bridge.test.ts` (renderers)       |
| `setCellValue`                                                                                                                                                           | `core-basics.test.ts`, multiple                           |
| `setCellFormula`                                                                                                                                                         | `core-basics.test.ts`                                     |
| `setCellStyle`                                                                                                                                                           | `core-basics.test.ts`                                     |
| `mergeRange` / `unmergeRange`                                                                                                                                            | `core-basics.test.ts`                                     |
| `resizeRow` / `resizeColumn`                                                                                                                                             | `core-basics.test.ts`                                     |
| `hideRow` / `hideColumn`                                                                                                                                                 | `core-basics.test.ts`                                     |
| `addSheet` / `removeSheet`                                                                                                                                               | `core-basics.test.ts`, `new-commands-mutation.test.ts`    |
| `renameSheet` / `moveSheet`                                                                                                                                              | `new-commands-mutation.test.ts`                           |
| `copySheet` / `hideSheet` / `protectSheet`                                                                                                                               | `p1-features.test.ts`                                     |
| `setSheetTabColor`                                                                                                                                                       | `p1-features.test.ts`                                     |
| `freezePanes` / `unfreezePanes`                                                                                                                                          | `p1-features.test.ts`                                     |
| `mergeCellsCenter`                                                                                                                                                       | `p1-features.test.ts`                                     |
| `copyCells` / `cutCells` / `pasteCells` / `clearCells`                                                                                                                   | `new-commands-mutation.test.ts`                           |
| `insertRow` / `insertColumn` / `deleteRow` / `deleteColumn`                                                                                                              | `new-commands-mutation.test.ts`                           |
| `selectAll` / `selectRow` / `selectColumn`                                                                                                                               | `new-commands-mutation.test.ts`                           |
| `setCellFontFamily` / `setCellFontSize` / `setCellFontWeight` / `setCellFontColor` / `setCellBackgroundColor` / `setCellBorder` / `setCellTextAlign` / `setCellWrapText` | `new-commands-mutation.test.ts`                           |
| `fillDown` / `fillRight`                                                                                                                                                 | `new-commands-mutation.test.ts`                           |
| `fillSeries`                                                                                                                                                             | `p1-features.test.ts` (8 cases)                           |
| `addComment` / `editComment` / `deleteComment`                                                                                                                           | `new-commands-mutation.test.ts`                           |
| `sortRange`                                                                                                                                                              | `core-basics.test.ts`                                     |
| `filterRowsByCellValue` / `clearRowFilters`                                                                                                                              | `core-basics.test.ts` (multi-column too)                  |
| `find` / `replace` / `replaceAll`                                                                                                                                        | `p1-features.test.ts`                                     |
| `undo` / `redo`                                                                                                                                                          | `core-advanced.test.ts`, `new-commands-undo-edge.test.ts` |
| `beginTransaction` / `commitTransaction` / `rollbackTransaction`                                                                                                         | `core-advanced.test.ts`                                   |
| `applyFillDown` / `applySetCellStyle` (internal)                                                                                                                         | `batch-cell-operations.test.ts`                           |

### 1.3 Coverage Gaps

| #   | Gap                                                                                              | Severity           | Details                                                                     |
| --- | ------------------------------------------------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------- |
| G1  | `FindNextCommand`                                                                                | **P2**             | The `findNext` command type is exported but never dispatched in any test    |
| G2  | `SetCellFontStyleCommand` (italic)                                                               | **P2**             | Tested in renderers `cell-style-map.test.ts` but NOT in core dispatch tests |
| G3  | `SetCellTextDecorationCommand` (underline/strikethrough)                                         | **P2**             | Same as G2 -- tested at style-mapping layer only, not core                  |
| G4  | `SetCellVerticalAlignCommand`                                                                    | **P2**             | No dispatch test for vertical align                                         |
| G5  | `SetCellNumberFormatCommand`                                                                     | **P2**             | No dispatch test for number format                                          |
| G6  | `AutoFitRowCommand` / `AutoFitColumnCommand`                                                     | **P2**             | Auto-fit commands are exported but never dispatched                         |
| G7  | `createDefaultSelection`, `createDefaultViewport`, `createDefaultHistory`, `createDefaultLayout` | **P2**             | Utility factory functions for defaults are untested                         |
| G8  | `mergeCellStyle`, `getCellsInRange`, `rangeIntersects`                                           | **P2**             | Helper functions for cell/style range operations are untested               |
| G9  | `isSpreadsheetCommand`                                                                           | **P3**             | Discriminated union type guard not tested                                   |
| G10 | All type-only exports                                                                            | P3 (informational) | Types are compile-time checked only; no runtime validation tests exist      |

---

## 2. Package: `@nop-chaos/spreadsheet-renderers`

### 2.1 Public API Contract Checklist

| #   | Contract                                    | Test File(s)                                                                                                        |
| --- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| R1  | `deriveHostSnapshot(runtime)`               | `bridge.test.ts` (7 cases), `page-model.test.ts` (1 case)                                                           |
| R2  | `createSpreadsheetBridge(core)`             | `bridge.test.ts` (10 cases)                                                                                         |
| R3  | `SpreadsheetBridge` interface               | `bridge.test.ts`                                                                                                    |
| R4  | `createSpreadsheetActionProvider(dispatch)` | `schema-integration.test.ts` (8 cases)                                                                              |
| R5  | `toSpreadsheetActionResult(result)`         | **NOT TESTED**                                                                                                      |
| R6  | `defineSpreadsheetPageSchema(input)`        | `schema-integration.test.ts` (8 cases)                                                                              |
| R7  | `spreadsheetRendererDefinitions`            | `grid-interactions.test.ts` (definition), `bridge.test.ts` (definition)                                             |
| R8  | `registerSpreadsheetRenderers(registry)`    | `bridge.test.ts`, `schema-integration.test.ts`                                                                      |
| R9  | `mapCellStyle(cellStyle)`                   | `cell-style-map.test.ts` (18 cases)                                                                                 |
| R10 | `SheetTabBar` component                     | `sheet-tab-bar.test.tsx` (3 cases)                                                                                  |
| R11 | `SpreadsheetToolbar` component              | `spreadsheet-toolbar.test.tsx` (7 cases)                                                                            |
| R12 | `SpreadsheetGrid` component                 | Indirect via `default-page-body.test.tsx`, `grid-*.test.tsx`                                                        |
| R13 | `useSpreadsheetInteractions(config)`        | `use-spreadsheet-interactions.test.ts` (contract shape), `grid-interactions.test.tsx`, `default-page-body.test.tsx` |
| R14 | `SPREADSHEET_MANIFEST_V1`                   | `schema-integration.test.ts` (methods check)                                                                        |
| R15 | `resolveSpreadsheetManifest(version)`       | **NOT TESTED**                                                                                                      |
| R16 | `spreadsheetHostContract`                   | **NOT TESTED**                                                                                                      |
| R17 | `SPREADSHEET_CAPABILITY_PUBLICATION`        | **NOT TESTED** (only implicitly)                                                                                    |
| R18 | `DefaultSpreadsheetPageBody` component      | `default-page-body.test.tsx` (6 cases)                                                                              |

### 2.2 Sub-module Test Coverage

| Module                                           | Test File(s)                                      | Status                     |
| ------------------------------------------------ | ------------------------------------------------- | -------------------------- |
| `bridge.ts`                                      | `bridge.test.ts`                                  | Full                       |
| `cell-style-map.ts`                              | `cell-style-map.test.ts`                          | Full                       |
| `sheet-tab-bar.tsx`                              | `sheet-tab-bar.test.tsx`                          | Full                       |
| `spreadsheet-toolbar.tsx`                        | `spreadsheet-toolbar.test.tsx`                    | Full                       |
| `default-page-body.tsx`                          | `default-page-body.test.tsx`                      | Full                       |
| `page-model.ts`                                  | `page-model.test.ts`                              | Full                       |
| `canvas-styles.ts`                               | `canvas-styles.test.ts`                           | CSS contract               |
| `page-renderer.ts` (selector)                    | `page-renderer-selector.test.tsx`                 | Full                       |
| `use-spreadsheet-interactions.ts`                | `use-spreadsheet-interactions.test.ts` (contract) | Partial (shape check only) |
| `spreadsheet-interactions/use-snapshot.ts`       | `use-snapshot.test.tsx`                           | Full                       |
| `spreadsheet-interactions/use-sheet-commands.ts` | `use-sheet-commands.test.tsx`                     | Full                       |
| `spreadsheet-interactions/async-handlers.ts`     | `async-handlers.test.tsx`                         | Full                       |
| `host-action-provider.ts`                        | `schema-integration.test.ts`                      | Full                       |
| `__tests__/grid-interactions.test.tsx`           | Integration                                       | Full                       |
| `__tests__/context-menu-*.test.tsx`              | Integration (5 files)                             | Full                       |
| `__tests__/grid-editing.test.tsx`                | Integration                                       | Full                       |
| `__tests__/grid-selection.test.tsx`              | Integration                                       | Full                       |
| `__tests__/schema-integration.test.tsx`          | Integration                                       | Full                       |

### 2.3 Coverage Gaps

| #   | Gap                                                       | Severity | Details                                                                                                                                                                                      |
| --- | --------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G11 | `toSpreadsheetActionResult(result)`                       | **P2**   | Exported utility function for normalizing spreadsheet results into action results is completely untested                                                                                     |
| G12 | `resolveSpreadsheetManifest(version)`                     | **P1**   | Public API for version-based manifest lookup -- the map lookup logic is never tested                                                                                                         |
| G13 | `spreadsheetHostContract`                                 | **P1**   | The `RendererHostContract` object that ties together family, version, manifest resolution, and capability publication is never directly tested (only its components are tested in isolation) |
| G14 | `SPREADSHEET_CAPABILITY_PUBLICATION`                      | **P2**   | The capability publication attribution is exported but never checked for correct values                                                                                                      |
| G15 | `SpreadsheetGridProps` type + `SpreadsheetGrid` component | P3       | Component is tested only through mocks; no direct unit test for the grid component in isolation                                                                                              |

---

## 3. Package: `@nop-chaos/word-editor-core`

### 3.1 Public API Contract Checklist

| #   | Contract                                                                                                                                                                                                                 | Test File(s)                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| W1  | `WordEditorHostStatusSummary`                                                                                                                                                                                            | Type only -- not tested                                                                       |
| W2  | `RowFlex`, `TitleLevel`, `ListType`, `ListStyle`, `PageMode`, `PaperDirection` (re-exports from canvas-editor)                                                                                                           | **NOT TESTED**                                                                                |
| W3  | All canvas-editor type re-exports                                                                                                                                                                                        | Type only                                                                                     |
| W4  | `CanvasEditorBridge` class + `CanvasEditorBridgeOptions`                                                                                                                                                                 | Not tested in core (tested in renderers via mock)                                             |
| W5  | `createEditorStore()`                                                                                                                                                                                                    | `editor-store.test.ts` (10 cases)                                                             |
| W6  | `EditorStoreApi` / `EditorSelectionState` / `EditorState`                                                                                                                                                                | `editor-store.test.ts`                                                                        |
| W7  | `createDatasetStore()`                                                                                                                                                                                                   | `dataset-store.test.ts`, `dataset-store-crud.test.ts`, `dataset-store-columns.test.ts` (full) |
| W8  | `DatasetStoreApi`                                                                                                                                                                                                        | Full CRUD + column + validation tests                                                         |
| W9  | `captureDocumentSnapshot(bridge, opts?)`                                                                                                                                                                                 | `document-io.test.ts` (3 cases)                                                               |
| W10 | `persistSavedDocument(data)`                                                                                                                                                                                             | `document-io.test.ts` (1 case)                                                                |
| W11 | `saveDocument(bridge)`                                                                                                                                                                                                   | `document-io.test.ts` (4 cases)                                                               |
| W12 | `loadDocument()`                                                                                                                                                                                                         | `document-io.test.ts` (5 cases)                                                               |
| W13 | `clearDocument()`                                                                                                                                                                                                        | `document-io.test.ts` (1 case)                                                                |
| W14 | `saveDatasets(datasets)` / `loadDatasets()`                                                                                                                                                                              | `document-io.test.ts` (4 cases)                                                               |
| W15 | `loadRecoveredState(seedDatasets)`                                                                                                                                                                                       | `document-io.test.ts` (1 case)                                                                |
| W16 | `extractDocChartsFromDocument(doc)` / `extractDocCodesFromDocument(doc)`                                                                                                                                                 | `document-io.test.ts` (1 case each)                                                           |
| W17 | `createSavedDocumentData(data)`                                                                                                                                                                                          | `document-io.test.ts` (3 cases)                                                               |
| W18 | `normalizeWordDocument`, `normalizeDocCharts`, `normalizeDocCodes`, `normalizeDataset`, `normalizeDatasets`                                                                                                              | **NOT TESTED**                                                                                |
| W19 | `DEFAULT_PAPER_SETTINGS` / `PAPER_SIZE_PRESETS`                                                                                                                                                                          | `paper-settings.test.ts` (full)                                                               |
| W20 | `createDataset(input?)` / `createDataColumn(input?)` / `validateDataset(ds)` / `datasetColumnToExpression(dsName, col)`                                                                                                  | `dataset-model.test.ts` (full)                                                                |
| W21 | Template expression functions: `isTemplateUrl`, `parseExprFromUrl`, `exprToUrl`, `parseElExpression`, `buildElExpression`, `parseTagAttributes`, `buildTagOpenString`, `buildTagSelfcloseString`, `buildFieldExpression` | `template-expr.test.ts` (full with roundtrips)                                                |
| W22 | `parseFieldReference`, `validateFieldReference`, `parseTemplate`, `extractFieldReferences`, `hasFieldReferences`                                                                                                         | **NOT TESTED**                                                                                |
| W23 | `BUILTIN_TEMPLATE_TAGS`, `findTagDefinition`, `getOpeningTag`, `getClosingTag`, `getMatchingCloseTag`                                                                                                                    | `template-tags.test.ts` (full)                                                                |
| W24 | `createDocChart(input?)` / `validateDocChart(chart)`                                                                                                                                                                     | `chart-model.test.ts` (full)                                                                  |
| W25 | `createDocCode(input?)` / `validateDocCode(code)`                                                                                                                                                                        | `code-model.test.ts` (full)                                                                   |

### 3.2 Coverage Gaps

| #   | Gap                                                                                                              | Severity | Details                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G16 | `normalizeWordDocument`, `normalizeDocCharts`, `normalizeDocCodes`, `normalizeDataset`, `normalizeDatasets`      | **P1**   | These five normalization functions are exported as part of the public API (`document-io.js`) and are responsible for data integrity during document loading. They are implicitly used by `loadDocument` but never directly tested for edge cases, error handling, or contract compliance |
| G17 | `parseFieldReference`, `validateFieldReference`, `parseTemplate`, `extractFieldReferences`, `hasFieldReferences` | **P2**   | These five template expression utilities from `template-expr.js` are exported but have zero direct tests. They handle field reference parsing and template extraction which are essential for template authoring workflows                                                               |
| G18 | `RowFlex`, `TitleLevel`, `ListType`, `ListStyle`, `PageMode`, `PaperDirection` (re-exported enum-like constants) | **P3**   | These are pass-through re-exports from a third-party library (`@hufe921/canvas-editor`); no test verifies their values or existence                                                                                                                                                      |
| G19 | `WordEditorHostStatusSummary`                                                                                    | P3       | Type-only export; no runtime test needed                                                                                                                                                                                                                                                 |
| G20 | `CanvasEditorBridge` class                                                                                       | P3       | The bridge class is tested indirectly through renderers; no core-level unit test exists                                                                                                                                                                                                  |

---

## 4. Package: `@nop-chaos/word-editor-renderers`

### 4.1 Public API Contract Checklist

| #    | Contract                                | Test File(s)                                                                               |
| ---- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| WE1  | `WordEditorPage` component              | Indirect via host-scope and actions tests                                                  |
| WE2  | `registerWordEditorRenderers(registry)` | `word-editor-page-host-scope.test.tsx`, `word-editor-page-host-scope-projections.test.tsx` |
| WE3  | `wordEditorRendererDefinitions`         | `word-editor-page-host-scope.test.tsx` (definition contracts)                              |
| WE4  | `defineWordEditorPageSchema(input)`     | Integration tests                                                                          |
| WE5  | `WORD_EDITOR_MANIFEST_V1`               | Implicit via action provider validation tests                                              |
| WE6  | `resolveWordEditorManifest(version)`    | **NOT TESTED**                                                                             |
| WE7  | `wordEditorHostContract`                | **NOT TESTED**                                                                             |
| WE8  | `WORD_EDITOR_CAPABILITY_PUBLICATION`    | **NOT TESTED**                                                                             |
| WE9  | `createWordEditorActionProvider(deps)`  | `word-editor-action-provider.test.ts` (13 cases)                                           |
| WE10 | `styles.css` import                     | `styles.test.ts`, `doc-preview-page.test.tsx`                                              |

### 4.2 Sub-module / Component Test Coverage

| Module/Component                              | Test File(s)                                       | Status                                  |
| --------------------------------------------- | -------------------------------------------------- | --------------------------------------- |
| `dialogs/chart-dialog.tsx`                    | `dialog-accessibility.test.tsx`                    | Partial (accessibility + save disabled) |
| `dialogs/dataset-dialog.tsx`                  | `dialog-accessibility.test.tsx`                    | Partial (accessibility)                 |
| `dialogs/code-dialog.tsx`                     | `dialog-accessibility.test.tsx`                    | Partial (accessibility + save disabled) |
| `dialogs/expr-insert-dialog.tsx`              | `expr-insert-dialog.test.tsx`                      | Full                                    |
| `editor-canvas.tsx`                           | `editor-canvas.test.tsx`                           | Full (6 cases)                          |
| `toolbar/insert-controls.tsx`                 | `insert-controls.test.tsx`                         | Full (4 cases)                          |
| `toolbar/search-replace.tsx`                  | `search-replace.test.tsx`                          | Full (8 cases)                          |
| `toolbar/page-controls.tsx`                   | `page-controls.test.tsx`                           | Full (4 cases)                          |
| `toolbar/shared.tsx`                          | `toolbar-shared.test.tsx`                          | Full (10 cases)                         |
| `panels/dataset-panel.tsx`                    | `dataset-panel.test.tsx`                           | Full (11 cases)                         |
| `panels/field-list.tsx`                       | `field-list.test.tsx`                              | Full (8 cases)                          |
| `panels/outline-panel.tsx`                    | `outline-panel.test.tsx`                           | Full (9 cases)                          |
| `panels/template-snippets.tsx`                | `template-snippets.test.tsx`                       | Full (7 cases)                          |
| `preview/doc-preview-page.tsx`                | `doc-preview-page.test.tsx`                        | Full (4 cases)                          |
| `word-editor-action-provider.ts`              | `word-editor-action-provider.test.ts`              | Full (13 cases)                         |
| `hooks/use-word-editor-save.ts`               | `use-word-editor-save.test.tsx`                    | Full (2 cases)                          |
| `word-editor-page` (integration: actions)     | `word-editor-page-actions.test.tsx`                | Full (11 cases)                         |
| `word-editor-page` (integration: host scope)  | `word-editor-page-host-scope.test.tsx`             | Full (5 cases)                          |
| `word-editor-page` (integration: projections) | `word-editor-page-host-scope-projections.test.tsx` | Full (11 cases)                         |

### 4.3 Coverage Gaps

| #   | Gap                                               | Severity | Details                                                                                                                 |
| --- | ------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| G21 | `resolveWordEditorManifest(version)`              | **P1**   | Version-based manifest resolver function is exported from the package but has zero tests                                |
| G22 | `wordEditorHostContract`                          | **P1**   | The complete `RendererHostContract` object for the word editor family is exported but never directly validated in tests |
| G23 | `WORD_EDITOR_CAPABILITY_PUBLICATION`              | **P2**   | Exported capability publication attribution is never tested for correctness                                             |
| G24 | `defineWordEditorPageSchema`                      | P3       | Tested only through integration tests; no isolated unit test for schema generation                                      |
| G25 | `WordEditorPage` component rendering in isolation | P3       | Only tested through integration with full schema renderer context                                                       |

---

## 5. P0/P1 Findings Summary

| ID  | Package               | Severity | Finding                                                                                                                                                                                             |
| --- | --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G12 | spreadsheet-renderers | **P1**   | `resolveSpreadsheetManifest(version)` is exported as public API but has zero tests                                                                                                                  |
| G13 | spreadsheet-renderers | **P1**   | `spreadsheetHostContract` (the main renderer host contract) is never directly tested                                                                                                                |
| G16 | word-editor-core      | **P1**   | Five normalization functions (`normalizeWordDocument`, `normalizeDocCharts`, `normalizeDocCodes`, `normalizeDataset`, `normalizeDatasets`) are untested despite being core data-integrity functions |
| G21 | word-editor-renderers | **P1**   | `resolveWordEditorManifest(version)` is exported as public API but has zero tests                                                                                                                   |
| G22 | word-editor-renderers | **P1**   | `wordEditorHostContract` (the main word editor host contract) is never directly tested                                                                                                              |

### P2 Findings

| ID    | Package               | Severity | Finding                                                                                                                                                               |
| ----- | --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1    | spreadsheet-core      | P2       | `FindNextCommand` not tested                                                                                                                                          |
| G2-G6 | spreadsheet-core      | P2       | Several style commands not individually dispatched (fontStyle, textDecoration, verticalAlign, numberFormat, autoFit)                                                  |
| G7    | spreadsheet-core      | P2       | Default factory functions (`createDefaultSelection`, `createDefaultViewport`, `createDefaultHistory`, `createDefaultLayout`) untested                                 |
| G8    | spreadsheet-core      | P2       | Utility helpers (`mergeCellStyle`, `getCellsInRange`, `rangeIntersects`) untested                                                                                     |
| G11   | spreadsheet-renderers | P2       | `toSpreadsheetActionResult` untested                                                                                                                                  |
| G14   | spreadsheet-renderers | P2       | `SPREADSHEET_CAPABILITY_PUBLICATION` not validated in tests                                                                                                           |
| G17   | word-editor-core      | P2       | Five template-expression utilities (`parseFieldReference`, `validateFieldReference`, `parseTemplate`, `extractFieldReferences`, `hasFieldReferences`) have zero tests |
| G23   | word-editor-renderers | P2       | `WORD_EDITOR_CAPABILITY_PUBLICATION` not validated in tests                                                                                                           |

---

## 6. Summary Statistics

| Package               | Public API Contracts             | Tested | Coverage | P1 Gaps | P2 Gaps | P3 Gaps |
| --------------------- | -------------------------------- | ------ | -------- | ------- | ------- | ------- |
| spreadsheet-core      | 20 contracts + ~55 command types | ~68/75 | ~91%     | 0       | 8       | 2       |
| spreadsheet-renderers | 18 contracts                     | 15/18  | ~83%     | 2       | 2       | 1       |
| word-editor-core      | 25 contracts                     | 20/25  | ~80%     | 1       | 1       | 3       |
| word-editor-renderers | 10 contracts                     | 7/10   | ~70%     | 2       | 1       | 2       |

**Overall**: The word-editor packages have the most significant contract coverage gaps at the manifest/host-contract layer. The spreadsheet-core package has the best command-level test coverage but is missing several utility function tests. Both renderer packages are missing tests for their `resolveManifest` and `hostContract` public API surfaces.
