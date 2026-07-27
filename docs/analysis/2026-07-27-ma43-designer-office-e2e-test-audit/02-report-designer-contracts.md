# Report Designer Unit Test Contract Coverage Audit

**Date**: 2026-07-27
**Scope**: `@nop-chaos/report-designer-core` + `@nop-chaos/report-designer-renderers`
**Methodology**: Read public API (`src/index.ts`) for each package, read all test files,
map contracts to test coverage, identify gaps.

---

## 1. Package: `@nop-chaos/report-designer-core`

### 1.1 Stable Contract Checklist

| #   | Contract                                               | Kind       | Source                 |
| --- | ------------------------------------------------------ | ---------- | ---------------------- |
| C1  | `ReportDesignerHostStatusSummary`                      | type       | `types.ts`             |
| C2  | `ReportSelectionTargetKind`                            | type       | `types.ts`             |
| C3  | `ReportSelectionTarget`                                | type       | `types.ts`             |
| C4  | `MetadataBag`                                          | type       | `types.ts`             |
| C5  | `ReportSemanticDocument`                               | type       | `types.ts`             |
| C6  | `RangeMetaDocument`                                    | type       | `types.ts`             |
| C7  | `ReportTemplateDocument`                               | type       | `types.ts`             |
| C8  | `FieldSourceSnapshot`                                  | type       | `types.ts`             |
| C9  | `FieldGroupSnapshot`                                   | type       | `types.ts`             |
| C10 | `FieldItemSnapshot`                                    | type       | `types.ts`             |
| C11 | `FieldDragState`                                       | type       | `types.ts`             |
| C12 | `FieldDragPayload`                                     | type       | `types.ts`             |
| C13 | `InspectorRuntimeState`                                | type       | `types.ts`             |
| C14 | `ReportDesignerRuntimeSnapshot`                        | type       | `types.ts`             |
| C15 | `ReportDesignerConfig`                                 | type       | `types.ts`             |
| F1  | `createDefaultSemantic`                                | function   | `types.ts`             |
| F2  | `createReportTemplateDocument`                         | function   | `types.ts`             |
| F3  | `getDefaultSelectionTarget`                            | function   | `types.ts`             |
| F4  | `getCellMeta` / `setCellMeta` / `updateCellMeta`       | functions  | `types.ts`             |
| F5  | `getRowMeta` / `setRowMeta` / `updateRowMeta`          | functions  | `types.ts`             |
| F6  | `getColumnMeta` / `setColumnMeta` / `updateColumnMeta` | functions  | `types.ts`             |
| F7  | `getSheetMeta` / `setSheetMeta` / `updateSheetMeta`    | functions  | `types.ts`             |
| F8  | `setRangeMeta`                                         | function   | `types.ts`             |
| F9  | `getTargetMeta`                                        | function   | `types.ts`             |
| F10 | `isSameTarget`                                         | function   | `types.ts`             |
| D1  | `ReportDesignerCommand`                                | union type | `commands.ts`          |
| D2  | `DropFieldToTargetCommand`                             | interface  | `commands.ts`          |
| D3  | `UpdateReportMetaCommand`                              | interface  | `commands.ts`          |
| D4  | `ReplaceReportMetaCommand`                             | interface  | `commands.ts`          |
| D5  | `OpenInspectorCommand`                                 | interface  | `commands.ts`          |
| D6  | `CloseInspectorCommand`                                | interface  | `commands.ts`          |
| D7  | `PreviewReportCommand`                                 | interface  | `commands.ts`          |
| D8  | `StopPreviewCommand`                                   | interface  | `commands.ts`          |
| D9  | `UndoCommand` / `RedoCommand`                          | interfaces | `commands.ts`          |
| D10 | `SaveCommand`                                          | interface  | `commands.ts`          |
| D11 | `ImportTemplateCommand`                                | interface  | `commands.ts`          |
| D12 | `ExportTemplateCommand`                                | interface  | `commands.ts`          |
| D13 | `ReportDesignerCommandResult`                          | interface  | `commands.ts`          |
| D14 | `isReportDesignerCommand`                              | function   | `commands.ts`          |
| A1  | `ReportDesignerAdapterContext`                         | interface  | `adapters.ts`          |
| A2  | `FieldSourceProvider`                                  | interface  | `adapters.ts`          |
| A3  | `FieldDropAdapter`                                     | interface  | `adapters.ts`          |
| A4  | `PreviewAdapter`                                       | interface  | `adapters.ts`          |
| A5  | `PreviewResult`                                        | interface  | `adapters.ts`          |
| A6  | `TemplateCodecAdapter`                                 | interface  | `adapters.ts`          |
| A7  | `ExpressionEditorAdapter`                              | interface  | `adapters.ts`          |
| A8  | `ReferencePickerAdapter`                               | interface  | `adapters.ts`          |
| A9  | `ExpressionEditorProps`                                | interface  | `adapters.ts`          |
| A10 | `ExpressionEditorContext`                              | interface  | `adapters.ts`          |
| A11 | `ReferencePickerContext`                               | interface  | `adapters.ts`          |
| A12 | `ReportDesignerAdapterRegistry`                        | interface  | `adapters.ts`          |
| A13 | `ReportDesignerProfile`                                | interface  | `adapters.ts`          |
| AF1 | `createEmptyAdapterRegistry`                           | function   | `adapters.ts`          |
| AF2 | `createStaticFieldSourceProvider`                      | function   | `adapters.ts`          |
| AF3 | `createMetaPatchDropAdapter`                           | function   | `adapters.ts`          |
| AF4 | `createUnsupportedTemplateCodecAdapter`                | function   | `adapters.ts`          |
| R1  | `ReportDesignerCore`                                   | interface  | `core.ts` (15 methods) |
| R2  | `CreateReportDesignerCoreOptions`                      | interface  | `core.ts`              |
| R3  | `createReportDesignerCore`                             | function   | `core.ts`              |

**`ReportDesignerCore` interface methods** (R1):

| Method                      | Kind         |
| --------------------------- | ------------ |
| `getSnapshot()`             | read         |
| `subscribe()`               | read         |
| `initialize()`              | lifecycle    |
| `dispatch()`                | mutation     |
| `getMetadata()`             | read         |
| `setMetadata()`             | mutation     |
| `syncSpreadsheetDocument()` | mutation     |
| `setSelectionTarget()`      | mutation     |
| `refreshFieldSources()`     | async query  |
| `exportDocument()`          | query        |
| `getAdapterRegistry()`      | query        |
| `registerFieldSource()`     | registration |
| `registerFieldDrop()`       | registration |
| `registerPreview()`         | registration |
| `registerCodec()`           | registration |
| `dispose()`                 | lifecycle    |

### 1.2 Contract to Test Mapping

| Contract(s)                                   | Test File(s)                                                                                  | Coverage Detail                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| C1-C15 (types)                                | document-and-metadata.test.ts, designer-core.test.ts                                          | Implicit usage in assertions; no standalone type-level tests |
| F1 (`createDefaultSemantic`)                  | document-and-metadata.test.ts                                                                 | Used as setup, no standalone unit test                       |
| F2 (`createReportTemplateDocument`)           | document-and-metadata.test.ts                                                                 | Lines 26-42: creation, name defaults                         |
| F3 (`getDefaultSelectionTarget`)              | document-and-metadata.test.ts                                                                 | Lines 44-61: sheet vs workbook cases                         |
| F4-F7 (cell/row/column/sheet get/set/update)  | document-and-metadata.test.ts                                                                 | Lines 64-173: full coverage for get/set/update/merge         |
| F8 (`setRangeMeta`)                           | document-and-metadata.test.ts                                                                 | Lines 175-204: add new, update by id                         |
| F9 (`getTargetMeta`)                          | document-and-metadata.test.ts                                                                 | Lines 207-249: workbook/sheet/row/column/cell/undefined      |
| F10 (`isSameTarget`)                          | document-and-metadata.test.ts                                                                 | Lines 252-297: all target kinds, mismatches                  |
| D1-D13 (command types)                        | designer-core.test.ts, designer-core-codec-and-selection.test.ts, designer-core.async.test.ts | Implicit via dispatch calls                                  |
| D14 (`isReportDesignerCommand`)               | **NO TEST**                                                                                   | Zero coverage                                                |
| A1-A12 (adapter types)                        | adapters-and-helpers.test.ts                                                                  | Implicit via factory usage                                   |
| A13 (`ReportDesignerProfile`)                 | designer-core-profile.test.ts                                                                 | Lines 28-265: full profile filtering                         |
| AF1 (`createEmptyAdapterRegistry`)            | adapters-and-helpers.test.ts                                                                  | Lines 292-299: empty maps                                    |
| AF2 (`createStaticFieldSourceProvider`)       | adapters-and-helpers.test.ts                                                                  | Lines 301-308: creation and load                             |
| AF3 (`createMetaPatchDropAdapter`)            | adapters-and-helpers.test.ts                                                                  | Lines 311-338: creation, canHandle, mapDropToMetaPatch       |
| AF4 (`createUnsupportedTemplateCodecAdapter`) | adapters-and-helpers.test.ts                                                                  | Lines 340-344: throws on import/export                       |
| R1 `getSnapshot`                              | designer-core.test.ts                                                                         | Lines 32-40: initial snapshot shape; used throughout         |
| R1 `subscribe`                                | designer-core.test.ts                                                                         | Lines 300-313: notification                                  |
| R1 `initialize`                               | designer-core.async.test.ts                                                                   | Lines 221-260: dedup, loading state, lazy init               |
| R1 `dispatch` (all commands)                  | designer-core.test.ts, designer-core-codec-and-selection.test.ts, designer-core.async.test.ts | Full command dispatch coverage                               |
| R1 `getMetadata`                              | designer-core.test.ts                                                                         | Lines 124-163: cell/workbook/sheet/row/column                |
| R1 `setMetadata`                              | designer-core.test.ts (line 209), designer-core-codec-and-selection.test.ts (line 136)        | Direct + undo participation                                  |
| R1 `syncSpreadsheetDocument`                  | designer-core.test.ts                                                                         | Lines 224-267: sync, seal, source tracking                   |
| R1 `setSelectionTarget`                       | designer-core-codec-and-selection.test.ts                                                     | Lines 103-111                                                |
| R1 `refreshFieldSources`                      | designer-core.async.test.ts                                                                   | Lines 153-156, 262-293                                       |
| R1 `exportDocument`                           | designer-core.test.ts                                                                         | Lines 219-222                                                |
| R1 `getAdapterRegistry`                       | adapters-and-helpers.test.ts                                                                  | Lines 222-231: verify registry contents                      |
| R1 `registerFieldSource`                      | adapters-and-helpers.test.ts                                                                  | Lines 222-231                                                |
| R1 `registerFieldDrop`                        | adapters-and-helpers.test.ts                                                                  | Lines 233-243                                                |
| R1 `registerPreview`                          | **NO DIRECT TEST**                                                                            | Not tested directly; dispatch path exercises it              |
| R1 `registerCodec`                            | adapters-and-helpers.test.ts                                                                  | Lines 38-46: register and dispatch                           |
| R1 `dispose`                                  | designer-core.async.test.ts                                                                   | Lines 196-199, 295-329: abort behavior                       |
| R2 (options)                                  | designer-core.async.test.ts                                                                   | `onError` tested line 331-361; readonly not tested           |
| R3 `createReportDesignerCore`                 | designer-core.test.ts, multiple                                                               | Lines 32-40: creation with valid snapshot                    |

### 1.3 Coverage Gaps

| Gap ID    | Contract                                                                                                                                    | Severity | Description                                                                                                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GC-01** | `isReportDesignerCommand`                                                                                                                   | **P0**   | Exported function with zero test coverage. It is a type-narrowing helper consumers may rely on for runtime command discrimination.                                                                                                                                                                 |
| **GC-02** | `registerPreview` on core                                                                                                                   | **P1**   | Not tested as a direct registration call (unlike registerFieldSource/registerFieldDrop/registerCodec). Only exercised indirectly through preview dispatch path. Missing explicit test: `core.registerPreview({...})` then verify `registry.previews.has(id)`.                                      |
| **GC-03** | Readonly mode guard                                                                                                                         | **P1**   | The `readonly` flag in `CreateReportDesignerCoreOptions` guards `setMetadata`, `syncSpreadsheetDocument`, and mutation dispatch. The guard code is present but there is no test exercising `createReportDesignerCore({ ..., readonly: true })` and verifying that mutations are silently rejected. |
| **GC-04** | `ExpressionEditorAdapter` / `ReferencePickerAdapter` / `ExpressionEditorProps` / `ExpressionEditorContext` / `ReferencePickerContext` types | **P2**   | These adapter types are defined and exported in the public API but have zero test coverage -- no mock implementation is ever created, no usage path is exercised.                                                                                                                                  |
| **GC-05** | `createDefaultSemantic` standalone test                                                                                                     | **P2**   | Function is used as a setup helper but has no dedicated test verifying its default shape (empty workbookMeta, no cell/row/column/sheet meta, no rangeMeta).                                                                                                                                        |
| **GC-06** | `RangeMetaDocument` type                                                                                                                    | **P2**   | Covered only through `setRangeMeta` usage; no test exercises the type structure independently.                                                                                                                                                                                                     |

---

## 2. Package: `@nop-chaos/report-designer-renderers`

### 2.1 Stable Contract Checklist

| #   | Contract                                 | Kind      | Source                          |
| --- | ---------------------------------------- | --------- | ------------------------------- |
| B1  | `ReportDesignerHostSnapshot`             | type      | `bridge.ts`                     |
| B2  | `ReportDesignerBridge`                   | type      | `bridge.ts`                     |
| B3  | `ReportDesignerEvent`                    | type      | `bridge.ts`                     |
| B4  | `ReportDesignerEventEmitter`             | type      | `bridge.ts`                     |
| BF1 | `createEventEmitter`                     | function  | `bridge.ts`                     |
| BF2 | `deriveDesignerHostSnapshot`             | function  | `bridge.ts`                     |
| BF3 | `createReportDesignerBridge`             | function  | `bridge.ts`                     |
| S1  | `ReportDesignerPageSchemaInput`          | type      | `types.ts`                      |
| S2  | `ReportDesignerPageSchema`               | type      | `types.ts`                      |
| SF1 | `defineReportDesignerPageSchema`         | function  | `types.ts`                      |
| SF2 | `reportDesignerRendererDefinitions`      | array     | `renderers.tsx`                 |
| SF3 | `registerReportDesignerRenderers`        | function  | `renderers.tsx`                 |
| M1  | `REPORT_DESIGNER_MANIFEST_V1`            | constant  | `report-designer-manifest.ts`   |
| M2  | `resolveReportDesignerManifest`          | function  | `report-designer-manifest.ts`   |
| M3  | `reportDesignerHostContract`             | constant  | `report-designer-manifest.ts`   |
| M4  | `REPORT_DESIGNER_CAPABILITY_PUBLICATION` | constant  | `report-designer-manifest.ts`   |
| FP1 | `ReportFieldPanelProps`                  | type      | `report-field-panel.tsx`        |
| FP2 | `ReportFieldPanel`                       | component | `report-field-panel.tsx`        |
| FP3 | `REPORT_FIELD_DRAG_MIME`                 | constant  | `report-field-panel.tsx`        |
| FP4 | `createReportFieldDragPayload`           | function  | `report-field-panel.tsx`        |
| FP5 | `writeReportFieldDragPayload`            | function  | `report-field-panel.tsx`        |
| FP6 | `readReportFieldDragPayload`             | function  | `report-field-panel.tsx`        |
| SC1 | `ToolbarItem`                            | type      | `schemas.ts`                    |
| SC2 | `ReportToolbarSchema`                    | type      | `schemas.ts`                    |
| SC3 | `ReportFieldPanelSchema`                 | type      | `schemas.ts`                    |
| SC4 | `ReportInspectorSchema`                  | type      | `schemas.ts`                    |
| HD1 | `ReportDesignerHostData`                 | type      | `host-data.ts`                  |
| HD2 | `createHostData`                         | function  | `host-data.ts`                  |
| HD3 | `buildReportDesignerScopeData`           | function  | `host-data.ts`                  |
| HD4 | `useReportDesignerHostScope`             | hook      | `host-data.ts`                  |
| AP1 | `createReportDesignerActionProvider`     | function  | `host-action-provider.ts`       |
| AP2 | `REPORT_DESIGNER_HOST_METHODS`           | array     | `host-action-provider.ts`       |
| AP3 | `toReportDesignerActionResult`           | function  | `host-action-provider.ts`       |
| IS1 | `ReportInspectorShellSchema`             | type      | `types.ts`                      |
| RC1 | `ReportSpreadsheetCanvas`                | component | `report-spreadsheet-canvas.tsx` |
| RC2 | `ReportSpreadsheetCanvasProps`           | type      | `report-spreadsheet-canvas.tsx` |

### 2.2 Contract to Test Mapping

| Contract(s)                                   | Test File(s)                                               | Coverage Detail                                                                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1-B4 (bridge types)                          | bridge.test.ts                                             | Used implicitly in assertions                                                                                                                                       |
| BF1 (`createEventEmitter`)                    | bridge.test.ts                                             | Lines 27-72: emit, unsubscribe, multiple handlers                                                                                                                   |
| BF2 (`deriveDesignerHostSnapshot`)            | bridge.test.ts                                             | Lines 75-167: dirty, meta, spreadsheet dirty, undo/redo merge                                                                                                       |
| BF3 (`createReportDesignerBridge`)            | bridge.test.ts                                             | Lines 169-302: all bridge methods (snapshot, dispatch, dispatchDesigner, subscribe, getCore/getDesignerCore, metadata update, field drag, preview, inspector state) |
| S1-S2 (page schema types)                     | schemas.test.ts, renderers.integration.test.tsx            | Implicit via defineReportDesignerPageSchema calls                                                                                                                   |
| SF1 (`defineReportDesignerPageSchema`)        | schemas.test.ts                                            | Lines 104-153: with/without toolbar, generic region overrides                                                                                                       |
| SF2 (`reportDesignerRendererDefinitions`)     | renderers.integration.test.tsx                             | Lines 151-209: config shape contract validated                                                                                                                      |
| SF3 (`registerReportDesignerRenderers`)       | Multiple test files                                        | Called as setup in most renderer tests                                                                                                                              |
| M1 (`REPORT_DESIGNER_MANIFEST_V1`)            | host-data.test.ts                                          | Lines 199-239: selection shape in manifest; lines 343-371: structured action results                                                                                |
| M2 (`resolveReportDesignerManifest`)          | **NO TEST**                                                | Zero coverage                                                                                                                                                       |
| M3 (`reportDesignerHostContract`)             | **NO DIRECT TEST**                                         | Only used internally by `renderers.tsx`                                                                                                                             |
| M4 (`REPORT_DESIGNER_CAPABILITY_PUBLICATION`) | **NO TEST**                                                | Zero coverage                                                                                                                                                       |
| FP1 (`ReportFieldPanelProps`)                 | report-field-panel.test.tsx                                | Implicit                                                                                                                                                            |
| FP2 (`ReportFieldPanel`)                      | report-field-panel.test.tsx                                | Lines 23-113: insert, disable, drag payload                                                                                                                         |
| FP3 (`REPORT_FIELD_DRAG_MIME`)                | report-field-panel.test.tsx, field-panel-renderer.test.tsx | Lines 98-99: constant used in assertions                                                                                                                            |
| FP4 (`createReportFieldDragPayload`)          | **NO DIRECT TEST**                                         | Not called directly; payload construction tested via inline                                                                                                         |
| FP5 (`writeReportFieldDragPayload`)           | **NO DIRECT TEST**                                         | Called indirectly through dragStart handlers                                                                                                                        |
| FP6 (`readReportFieldDragPayload`)            | **NO TEST**                                                | Zero coverage -- never exercised                                                                                                                                    |
| SC1-SC4 (schema types)                        | schemas.test.ts                                            | Lines 10-102: all ToolbarItem variants, ReportToolbarSchema                                                                                                         |
| HD1 (`ReportDesignerHostData`)                | host-data.test.ts                                          | Implicit                                                                                                                                                            |
| HD2 (`createHostData`)                        | host-data.test.ts                                          | Lines 304-340: defensive copy, spreadsheet owner                                                                                                                    |
| HD3 (`buildReportDesignerScopeData`)          | host-data.test.ts                                          | Lines 10-302: dirty separation, projection vocabulary, null normalization, active sheet, selection shape, workbook identity, immutability                           |
| HD4 (`useReportDesignerHostScope`)            | **NO TEST**                                                | Zero coverage -- React hook never rendered                                                                                                                          |
| AP1 (`createReportDesignerActionProvider`)    | host-action-provider.test.ts                               | Lines 9-142: error mapping, listMethods, thrown errors, payload validation for openInspector/updateMeta/preview/save/dropFieldToTarget                              |
| AP2 (`REPORT_DESIGNER_HOST_METHODS`)          | host-action-provider.test.ts                               | Lines 56-60: listMethods returns the array                                                                                                                          |
| AP3 (`toReportDesignerActionResult`)          | **NO DIRECT TEST**                                         | Exported but never imported in tests; logic tested only indirectly through action provider                                                                          |
| IS1 (`ReportInspectorShellSchema`)            | report-designer-inspector.test.tsx                         | Lines 105-125: rendered via report-inspector-shell type                                                                                                             |
| RC1 (`ReportSpreadsheetCanvas`)               | report-spreadsheet-canvas.test.tsx                         | Lines 59-284: field drop rollback, cell metadata pass-through                                                                                                       |
| RC2 (`ReportSpreadsheetCanvasProps`)          | report-spreadsheet-canvas.test.tsx                         | Implicit                                                                                                                                                            |

### 2.3 Coverage Gaps

| Gap ID    | Contract                                                       | Severity | Description                                                                                                                                                                                                                                        |
| --------- | -------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GR-01** | `resolveReportDesignerManifest`                                | **P0**   | Exported function with zero test coverage. Resolves a version string to a manifest object. Missing tests: resolved vs unresolvable version, default version aliases.                                                                               |
| **GR-02** | `REPORT_DESIGNER_CAPABILITY_PUBLICATION`                       | **P0**   | Exported constant with zero test coverage. Defines capability publication mode and capable regions. Missing any assertion on its shape.                                                                                                            |
| **GR-03** | `useReportDesignerHostScope`                                   | **P0**   | Exported React hook with zero test coverage. Missing any rendered component test that exercises this hook.                                                                                                                                         |
| **GR-04** | `readReportFieldDragPayload`                                   | **P0**   | Exported function with zero test coverage. No code path exercises deserializing a field drag payload.                                                                                                                                              |
| **GR-05** | `toReportDesignerActionResult`                                 | **P1**   | Exported function not directly tested. Its logic (normalizing error, constructing ActionResult envelope) is only covered indirectly through the action provider. An Error vs string vs object-error normalization branch is not directly asserted. |
| **GR-06** | `createReportFieldDragPayload` / `writeReportFieldDragPayload` | **P1**   | Exported but only exercised indirectly. `createReportFieldDragPayload` is never called directly in tests; the payload is constructed inline. `writeReportFieldDragPayload` is called through dragStart but the function itself is not unit-tested. |
| **GR-07** | `reportDesignerHostContract`                                   | **P2**   | Exported constant with only implicit coverage. Its shape (family, defaultVersion, resolveManifest, capabilityPublication) is not directly asserted in any test.                                                                                    |

---

## 3. Cross-Cutting Findings

### 3.1 P0 Findings (Must Fix)

| ID   | Package                   | Contract                                 | Issue                                                                                                                                                         |
| ---- | ------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | report-designer-core      | `isReportDesignerCommand`                | Zero test coverage on a discriminated-type guard function that consumers rely on for safe runtime command routing.                                            |
| F-02 | report-designer-renderers | `resolveReportDesignerManifest`          | Zero test coverage on a function that resolves versioned manifest lookups -- a contract consumers depend on for capability discovery.                         |
| F-03 | report-designer-renderers | `REPORT_DESIGNER_CAPABILITY_PUBLICATION` | Zero test coverage on a constant that defines the capability publication contract.                                                                            |
| F-04 | report-designer-renderers | `useReportDesignerHostScope`             | Zero test coverage on an exported React hook that is part of the public API surface for renderers consuming host scope.                                       |
| F-05 | report-designer-renderers | `readReportFieldDragPayload`             | Zero test coverage on a function that deserializes drag payloads -- a deserialization path that, if broken, silently corrupts field drag-and-drop operations. |

### 3.2 P1 Findings (Should Fix)

| ID   | Package                   | Contract                                                       | Issue                                                                                                                                                 |
| ---- | ------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-06 | report-designer-core      | `registerPreview` (R1 method)                                  | Registration method not tested directly, unlike sibling methods (registerFieldSource, registerFieldDrop, registerCodec).                              |
| F-07 | report-designer-core      | Readonly mode guard                                            | The `readonly: true` code path guarding `setMetadata`, `syncSpreadsheetDocument`, and mutation `dispatch` has no test that verifies silent rejection. |
| F-08 | report-designer-renderers | `toReportDesignerActionResult`                                 | Error normalization (Error vs string vs object error) only indirectly covered.                                                                        |
| F-09 | report-designer-renderers | `createReportFieldDragPayload` / `writeReportFieldDragPayload` | Payload construction/write functions have no direct unit tests.                                                                                       |

### 3.3 P2 Findings (Minor)

| ID   | Package                   | Contract                                                                                                                          | Issue                                                                                       |
| ---- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| F-10 | report-designer-core      | `ExpressionEditorAdapter`, `ReferencePickerAdapter`, `ExpressionEditorProps`, `ExpressionEditorContext`, `ReferencePickerContext` | Adapter types exist in public API but have no mock implementations or usage paths in tests. |
| F-11 | report-designer-core      | `createDefaultSemantic`                                                                                                           | No standalone test for the default semantic document shape.                                 |
| F-12 | report-designer-core      | `RangeMetaDocument`                                                                                                               | Type structure only exercised through `setRangeMeta` usage.                                 |
| F-13 | report-designer-renderers | `reportDesignerHostContract`                                                                                                      | Shape assertions missing for the complete host contract object.                             |

---

## 4. Summary Statistics

| Metric                           | report-designer-core | report-designer-renderers |
| -------------------------------- | -------------------- | ------------------------- |
| Public contracts                 | ~58                  | ~34                       |
| Test files                       | 8                    | 16                        |
| Fully covered contracts          | ~50 (86%)            | ~24 (71%)                 |
| Partially covered contracts (P1) | 2                    | 3                         |
| Zero-coverage contracts (P0)     | 1                    | 4                         |
| P0 total across both packages    | **5**                |                           |
| P1 total across both packages    | **4**                |                           |
| P2 total across both packages    | **4**                |                           |

### Strong Coverage Areas

- **Core metadata operations** (get/set/update for cell/row/column/sheet/range): Excellent coverage in `document-and-metadata.test.ts` with all branches tested.
- **Core dispatch commands**: All 11 command types are exercised through at least one test path. Commands with the richest coverage: `updateMeta` (multiple targets), `dropFieldToTarget` (cell + range), `importTemplate` (success + error), `exportTemplate` (success + error), `preview` (async lifecycle, abort, stale resolution).
- **Bridge layer**: `createReportDesignerBridge`, `deriveDesignerHostSnapshot`, `createEventEmitter` -- all fully tested with boundary cases.
- **Host data projection**: `buildReportDesignerScopeData` is thoroughly tested with 12 distinct tests covering dirty segregation, null normalization, selection shape, workbook identity, immutability.
- **Host action provider**: Payload validation is thoroughly tested for all method-specific contract checks.
- **Field panel renderer**: 20+ tests covering rendering, accessibility, drag, keyboard insertion, error paths, and styling markers.

### Weak Coverage Areas (Summary)

1. **Orphan exports**: Several functions and constants are exported from the public API but have no direct test coverage (`isReportDesignerCommand`, `resolveReportDesignerManifest`, `REPORT_DESIGNER_CAPABILITY_PUBLICATION`, `useReportDesignerHostScope`, `readReportFieldDragPayload`, `toReportDesignerActionResult`).
2. **Adapter types without usage**: `ExpressionEditorAdapter` and `ReferencePickerAdapter` are defined in the adapter type hierarchy but have no mock implementations or test paths at all.
3. **Readonly mode**: A meaningful feature flag (`readonly` in `CreateReportDesignerCoreOptions`) with zero test coverage on its guard behavior.

---

## 5. Recommendations

1. **P0 gap closure** (highest priority):
   - Add a unit test file for `report-designer-manifest.test.ts` covering `resolveReportDesignerManifest` (valid version, invalid version, default aliases), `REPORT_DESIGNER_CAPABILITY_PUBLICATION` shape, and `reportDesignerHostContract` shape.
   - Add `isReportDesignerCommand` tests covering valid, invalid-suffix, null/undefined, and non-object values.
   - Add `readReportFieldDragPayload` tests covering valid payload, malformed JSON, and missing fields.
   - Add `useReportDesignerHostScope` with a minimal component rendering test.

2. **P1 gap closure**:
   - Add `registerPreview` direct verification test in `adapters-and-helpers.test.ts`.
   - Add a readonly-mode integration test: create core with `readonly: true`, verify `setMetadata` and mutation `dispatch` are rejected.
   - Add `toReportDesignerActionResult` direct tests covering Error error, string error, object error, null error.
   - Add `createReportFieldDragPayload` / `writeReportFieldDragPayload` unit tests.

3. **P2 gap closure**:
   - Add `ExpressionEditorAdapter` and `ReferencePickerAdapter` mock implementations to adapter tests.
   - Add `createDefaultSemantic` standalone test.
