# Excel Report Designer Research

> Role: this document is a research and decision-support note for a future Excel-based report designer. It is not yet the active architecture contract.

> Research date: 2026-03-21

## Purpose

This document consolidates a code-driven research pass across four input sources:

- `C:/can/sources/springreport`
- `C:/can/sources/univer`
- `C:/can/sources/x-spreadsheet`
- `C:/can/sources/Luckysheet`

It also aligns those findings with the actual target domain model in:

- `C:/can/nop/nop-entropy/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema/excel/workbook.xdef`
- `C:/can/nop/nop-entropy/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema/excel/excel-table.xdef`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/ExcelWorkbook.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/XptWorkbookModel.java`

The immediate goal is to support a simplified Excel editor that is sufficient for a report designer, not a full Excel-compatible spreadsheet product.

## Final Position

The most reasonable implementation direction is:

- build a domain-driven report template editor instead of cloning a general-purpose Excel product
- keep the front-end canonical model close to `ExcelWorkbook + Xpt*Model`
- use a lightweight spreadsheet core with multi-sheet, sparse cells, styles, merges, row/column sizing, selection, editing, and preview-oriented metadata editing
- use the current `nop amis renderer` for the property editor panel
- expose the whole editor as a new AMIS renderer control, such as `type: 'report-designer'`

The strongest reference split is:

- SpringReport for product shape and report-designer workflow
- Univer for runtime layering and command architecture
- x-spreadsheet for a small spreadsheet-core shape
- Luckysheet for feature-boundary awareness and failure modes

## Research Inputs

### SpringReport

Key paths:

- `C:/can/sources/springreport/SpringReport-ui-vue3/src/views/luckyreport/luckyReportDesign.vue`
- `C:/can/sources/springreport/SpringReport-ui-vue3/src/views/luckyreport/luckyReportDesign.js`
- `C:/can/sources/springreport/SpringReport-ui-vue3/src/components/common/api.js`
- `C:/can/sources/springreport/SpringReport/web/src/main/java/com/springreport/controller/reporttpl/ReportTplController.java`
- `C:/can/sources/springreport/SpringReport/service/src/main/java/com/springreport/impl/reporttpl/ReportTplServiceImpl.java`
- `C:/can/sources/springreport/SpringReport/pojo/src/main/java/com/springreport/entity/reporttpl/ReportTpl.java`
- `C:/can/sources/springreport/SpringReport/pojo/src/main/java/com/springreport/entity/reporttplsheet/ReportTplSheet.java`
- `C:/can/sources/springreport/SpringReport/pojo/src/main/java/com/springreport/entity/luckysheetreportcell/LuckysheetReportCell.java`
- `C:/can/sources/springreport/SpringReport/pojo/src/main/java/com/springreport/entity/luckysheetreportblockcell/LuckysheetReportBlockCell.java`

### Univer

Key paths:

- `C:/can/sources/univer/packages/core/src/sheets/workbook.ts`
- `C:/can/sources/univer/packages/core/src/sheets/worksheet.ts`
- `C:/can/sources/univer/packages/core/src/sheets/view-model.ts`
- `C:/can/sources/univer/packages/core/src/sheets/sheet-skeleton.ts`
- `C:/can/sources/univer/packages/core/src/services/command/command.service.ts`
- `C:/can/sources/univer/packages/sheets/src/plugin.ts`
- `C:/can/sources/univer/packages/sheets/src/commands/commands/set-range-values.command.ts`
- `C:/can/sources/univer/packages/sheets/src/commands/mutations/set-range-values.mutation.ts`
- `C:/can/sources/univer/packages/sheets-ui/src/plugin.ts`
- `C:/can/sources/univer/packages/sheets-ui/src/controllers/render-controllers/sheet.render-controller.ts`
- `C:/can/sources/univer/packages/sheets-ui/src/services/sheet-skeleton-manager.service.ts`

### x-spreadsheet and Luckysheet

Key paths:

- `C:/can/sources/x-spreadsheet/src/core/data_proxy.js`
- `C:/can/sources/x-spreadsheet/src/core/row.js`
- `C:/can/sources/x-spreadsheet/src/core/merge.js`
- `C:/can/sources/x-spreadsheet/src/component/sheet.js`
- `C:/can/sources/Luckysheet/src/store/index.js`
- `C:/can/sources/Luckysheet/src/controllers/sheetmanage.js`
- `C:/can/sources/Luckysheet/src/controllers/selection.js`
- `C:/can/sources/Luckysheet/src/controllers/updateCell.js`
- `C:/can/sources/Luckysheet/src/global/api.js`
- `C:/can/sources/Luckysheet/src/demoData/sheetCell.js`

### nop-report target model

Key paths:

- `C:/can/nop/nop-entropy/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema/excel/workbook.xdef`
- `C:/can/nop/nop-entropy/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema/excel/excel-table.xdef`
- `C:/can/nop/nop-entropy/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema/excel/style.xdef`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/ExcelWorkbook.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/ExcelSheet.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/ExcelTable.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/ExcelCell.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/XptWorkbookModel.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/XptSheetModel.java`
- `C:/can/nop/nop-entropy/nop-format/nop-excel/src/main/java/io/nop/excel/model/XptCellModel.java`
- `C:/can/nop/nop-entropy/nop-report/nop-report-core/src/main/java/io/nop/report/core/build/XptModelLoader.java`
- `C:/can/nop/nop-entropy/nop-report/nop-report-core/src/main/java/io/nop/report/core/build/ExcelToXptModelTransformer.java`
- `C:/can/nop/nop-entropy/nop-report/nop-report-core/src/main/java/io/nop/report/core/build/XptModelInitializer.java`
- `C:/can/nop/nop-entropy/nop-report/nop-report-core/src/main/java/io/nop/report/core/engine/ExpandedSheetGenerator.java`

### Current nop amis extension points

Key paths:

- `packages/flux-core/src/index.ts`
- `packages/flux-runtime/src/registry.ts`
- `packages/flux-runtime/src/index.ts`
- `packages/flux-react/src/index.tsx`
- `packages/flux-renderers-basic/src/index.tsx`
- `packages/flux-renderers-form/src/renderers/input.tsx`
- `packages/flux-renderers-form/src/renderers/array-editor.tsx`
- `docs/architecture/renderer-runtime.md`

## SpringReport Findings

### Product shape is worth reusing

SpringReport validates the overall report-designer interaction model:

- left panel for datasets and fields
- center spreadsheet canvas
- right panel for cell and report properties
- bottom sheet tabs
- save and preview through the backend

That structure is directly relevant to the target product.

### Internal implementation is not worth cloning

The Vue-side implementation is highly centralized in:

- `C:/can/sources/springreport/SpringReport-ui-vue3/src/views/luckyreport/luckyReportDesign.js`

Property forms, data source management, canvas coordination, and report-specific editor state are all mixed together. This proves the product shape, but it is not a good modular baseline for a rewrite.

### The useful backend lesson is model separation

SpringReport does not persist only a raw spreadsheet blob. It separates:

- template-level metadata through `ReportTpl`
- sheet-level metadata through `ReportTplSheet`
- report-cell semantics through `LuckysheetReportCell`
- repeated block cells through `LuckysheetReportBlockCell`

This is the most relevant takeaway: spreadsheet display state and report semantics must not collapse into one unstructured JSON object.

### Minimum capabilities implied by SpringReport

The following abilities are clearly essential in a report-designer context:

- multi-sheet editing
- cell content editing
- merge and basic formatting
- dataset binding
- variable versus fixed-value cells
- directional expansion or repeat behavior
- aggregate cells
- preview through backend execution

The following abilities are valuable but not first-version blockers:

- collaboration
- chart editing
- drilldown
- warning rules
- range authorization
- Word and large-screen designer reuse

## Univer Findings

### The most valuable idea is layering

Univer cleanly separates:

- snapshot data model
- runtime workbook and worksheet model
- display and interception layer
- geometry or layout skeleton
- rendering and interaction layer
- commands, mutations, and operations

That architecture is a strong fit for a modern rewrite.

### The pieces worth borrowing

The most reusable concepts are:

- `Workbook -> Worksheet -> sparse cell matrix`
- a distinct display or view-model layer that can overlay display-only changes without mutating persisted cell state
- a centralized layout skeleton for visible range, row and column offsets, merge geometry, and measurement cache
- a command system that separates persistent mutations from transient UI operations

For the target project, this suggests a stack like:

- `WorkbookSnapshot`
- `WorksheetModel`
- `SheetDisplayModel`
- `SheetLayoutSkeleton`
- `CanvasRenderer`

### The parts that are too heavy

The following Univer areas should not be copied into the first version:

- formula engine and formula result application
- document-editor-based cell editing stack
- multi-viewport frozen-pane architecture
- full platform-level scene graph complexity
- very large plugin and service graph

The simplified report designer only needs a smaller subset.

## x-spreadsheet and Luckysheet Findings

### x-spreadsheet is the better structural reference

Useful ideas from x-spreadsheet:

- sparse rows, columns, and cells
- style pool with cell-side style references
- canvas drawing with DOM overlay editors
- small enough code paths to be understandable and replaceable

Its weaknesses are also clear:

- workbook abstraction is thin
- advanced report and print semantics are weak
- many features are only "good enough" rather than well-factored

### Luckysheet is the better cautionary sample

Luckysheet is useful mainly as a feature-boundary reference. It shows the complexity of:

- workbook interactions
- selection modes
- frozen panes
- validations
- complex borders and formatting
- import and export oriented JSON contracts

But its implementation style is not suitable for a modern rewrite because it relies heavily on:

- global mutable store patterns
- jQuery-era DOM coordination
- compact but opaque cell field shapes
- runtime-state and storage-state entanglement

### The right synthesis

The best composite lesson is:

- learn compact spreadsheet-core structure from x-spreadsheet
- learn feature pressure and edge cases from Luckysheet
- do not copy either implementation wholesale

## nop-report Model Constraints

### The target is not a generic spreadsheet model

The real target model is `ExcelWorkbook + Xpt*Model`, not Luckysheet JSON and not a new ad hoc front-end schema.

The most important consequence is that the editor must preserve two layers:

- Excel-like workbook, sheet, row, column, cell, style, merge, print, validation, and media structure
- report semantics on workbook, sheet, row, and cell `model` nodes

### What `workbook.xdef` and `excel-table.xdef` require

The target model includes at least:

- workbook props, styles, default font, sheets, and workbook model hooks
- sheet table, images, charts, conditional styles, annotations, sheet options, sheet protection, data validations, page setup, page margins, and page breaks
- row and column widths, heights, hidden state, style references
- cell id, name, mergeAcross, mergeDown, linkUrl, protected, styleId, type, value, formula, richText, comment, and `model`
- XPT metadata such as `field`, `ds`, `expandType`, `expandExpr`, `valueExpr`, `formatExpr`, `styleIdExpr`, `linkExpr`, `rowParent`, `colParent`, `exportFormula`, `editorId`, and `viewerId`

### What the front end must support in v1

The front-end minimum cannot be only a visible grid editor. It must support:

- multi-sheet workbook state
- sparse cells and style references
- row and column sizing and hiding
- merges
- cell values, types, and passthrough formula storage
- workbook, sheet, and cell report-model metadata editing
- stable cell coordinates for parent and child references
- backend-oriented save and preview flow

### What can be deferred

The following are reasonable defer candidates for the first usable version:

- deep chart authoring
- deep image editing
- full print and page setup UI
- full rich-text cell editing
- full conditional style editing
- collaboration
- formula execution

These may still need passthrough preservation, but not complete visual editors.

## Implications for the Front-End Canonical Model

### The canonical model should stay close to the backend

The front-end should not invent a purely UI-centric spreadsheet model and then try to map it back into `nop-report` later.

The recommended internal structure is:

- `workbook.document`
  - workbook properties
  - global styles
  - workbook-level XPT model
  - sheet ordering and sheet summaries
- `sheet.document`
  - sheet properties
  - sheet-level XPT model
  - validations, print config, images, charts, and other sheet-side passthrough metadata
- `sheet.grid`
  - rows
  - columns
  - cells
  - merge map

### Cell state should be split internally

Each cell should conceptually contain three concerns:

- `base`: value, formula, type, styleId, merge, comment, linkUrl, protected, richText
- `report`: XPT cell-model fields
- `runtimeHint`: selection, hover, parse errors, derived warnings, and other non-persisted UI state

This split is necessary to keep report semantics stable while still allowing efficient editing.

## Current nop amis Integration Feasibility

### A new renderer control is straightforward

Current AMIS integration points already support this direction:

- renderer definition contract in `packages/flux-core/src/index.ts`
- registry creation in `packages/flux-runtime/src/registry.ts`
- runtime creation in `packages/flux-runtime/src/index.ts`
- React host creation in `packages/flux-react/src/index.tsx`

The current renderer model is already based on explicit `RendererDefinition` registration and a root `createSchemaRenderer(...)` host.

### The property editor should remain schema-driven

The recommended integration pattern is:

- build one renderer such as `type: 'report-designer'`
- let that renderer own the spreadsheet canvas and designer shell
- generate property-panel AMIS schema dynamically based on the current selection
- render the property panel by invoking the current schema renderer inside the designer shell

This follows the repo rule in `docs/architecture/renderer-runtime.md`: explicit boundary inputs, ambient runtime by hooks, and local fragment rendering through explicit handles.

### Complex editor controls are already a known pattern

Existing form renderers show two relevant patterns:

- simple bound field controls in `packages/flux-renderers-form/src/renderers/input.tsx`
- richer composite controls with runtime field registration in `packages/flux-renderers-form/src/renderers/array-editor.tsx`

That means the future report designer can be introduced incrementally:

- first as a non-form visual designer renderer
- later, if needed, as a value-producing or form-participating control

## Recommended Architecture for the Rewrite

### 1. Core split

Use two main data planes:

- spreadsheet canvas state
- report semantic state

Do not store report semantics only inside the grid renderer's raw cell objects.

### 2. Runtime layering

Recommended layers:

- `designer-core`
  - workbook and sheet state
  - commands
  - selection model
  - undo and redo
- `designer-layout`
  - row and column offsets
  - visible range
  - merge geometry
  - measurement cache
- `designer-canvas`
  - painting
  - hit testing
  - input bridge
- `designer-meta`
  - workbook, sheet, and cell XPT metadata
  - import and export normalization
- `designer-properties`
  - AMIS schema adapter for the right-side property panel
- `designer-preview`
  - backend preview contract integration

### 3. Command model

Even in a simplified version, keep explicit commands. A minimal command set should include:

- `setCells`
- `setStyle`
- `resizeRow`
- `resizeColumn`
- `mergeCells`
- `unmergeCells`
- `hideRow`
- `hideColumn`
- `activateSheet`
- `setSelection`
- `setWorkbookMeta`
- `setSheetMeta`
- `setCellMeta`

This is the most future-proof way to support undo, redo, property-panel synchronization, and preview preparation.

### 4. Rendering model

The first version should use:

- one main scrollable viewport
- row header overlay
- column header overlay
- selection overlay
- DOM overlay editor for active cell editing

Frozen panes should be treated as a later phase unless the first business slice truly depends on them.

## Minimum Viable Feature Set

### Must ship in v1

- workbook with multiple sheets
- sheet tabs and sheet switching
- sparse cell editing
- row height and column width editing
- basic style application through style references
- merge and unmerge
- hidden row and column support
- selection and range selection
- basic undo and redo
- workbook, sheet, and cell property editing through AMIS
- XPT cell metadata editing for common fields
- load and save through structured JSON or DSL
- backend preview action

### Strongly recommended in v1.1

- one repeat-region model, preferably a simple vertical list region
- `rowParent` and `colParent` visualization and picking
- basic data validation editing
- style library management
- passthrough preservation for images, charts, and print settings

### Explicitly defer

- formula execution engine
- collaborative editing
- full chart designer
- full image designer
- full print-layout editor
- rich-text cell editor
- broad Excel compatibility goals

## Risk Points

### Biggest modeling risk

If the front-end model drifts away from `ExcelWorkbook + Xpt*Model`, later save and preview integration will become increasingly lossy around:

- `rowParent`
- `colParent`
- `expandType`
- `styleIdExpr`
- `exportFormula`
- workbook and sheet lifecycle expressions

### Biggest implementation risk

If the property panel is implemented as hardcoded React forms instead of AMIS-driven schema, it will recreate the same scaling problem seen in SpringReport's large page-controller design.

### Biggest scope risk

If formula compatibility, deep chart editing, collaboration, and print-layout fidelity are included too early, the project will drift from a report-designer rewrite into a spreadsheet-platform rewrite.

## Recommended Next Deliverables

The next artifacts that would make implementation concrete are:

1. a TypeScript interface draft for `WorkbookSnapshot`, `WorksheetSnapshot`, `CellBase`, `CellReportMeta`, `SheetMeta`, and `WorkbookMeta`
2. an AMIS schema model for the property editor, organized by selection target
3. a backend JSON contract draft for load, save, preview, and legacy-template import
4. a package-boundary proposal for where the spreadsheet core and the AMIS renderer wrapper should live in this workspace

## Related Documents

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`
- `docs/references/maintenance-checklist.md`
- `docs/development-log.md`

