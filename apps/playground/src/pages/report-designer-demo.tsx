import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createSchemaRenderer,
  createDefaultEnv,
  createDefaultRegistry,
} from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  cellAddress,
} from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  SheetTabBar,
  SpreadsheetToolbar,
  SpreadsheetGrid,
  useSpreadsheetInteractions,
} from '@nop-chaos/spreadsheet-renderers';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  type ReportDesignerConfig,
  type FieldSourceSnapshot,
  type FieldDropAdapter,
} from '@nop-chaos/report-designer-core';
import {
  createReportDesignerBridge,
  ReportFieldPanel,
  buildReportDesignerScopeData,
  registerReportDesignerRenderers,
} from '@nop-chaos/report-designer-renderers';
import { Button } from '@nop-chaos/ui';

const fieldSources: FieldSourceSnapshot[] = [
  {
    id: 'orders',
    label: 'Orders Dataset',
    groups: [
      {
        id: 'basic',
        label: 'Basic Fields',
        expanded: true,
        fields: [
          { id: 'orderId', label: 'Order ID', path: 'orders.orderId', fieldType: 'number' },
          { id: 'customer', label: 'Customer', path: 'orders.customer', fieldType: 'string' },
          { id: 'amount', label: 'Amount', path: 'orders.amount', fieldType: 'number' },
          { id: 'date', label: 'Order Date', path: 'orders.date', fieldType: 'date' },
        ],
      },
    ],
  },
];

const dropAdapter: FieldDropAdapter = {
  id: 'basic-field-drop',
  canHandle: () => true,
  mapDropToMetaPatch: ({ field }) => ({
    binding: {
      type: field.type,
      sourceId: field.sourceId,
      fieldId: field.fieldId,
      label: field.data.label,
    },
  }),
};

const ROWS = 30;
const COLS = 10;
const SchemaRenderer = createSchemaRenderer();
const inspectorRegistry = createDefaultRegistry();
registerBasicRenderers(inspectorRegistry);
registerFormRenderers(inspectorRegistry);
registerFormAdvancedRenderers(inspectorRegistry);
registerDataRenderers(inspectorRegistry);
registerReportDesignerRenderers(inspectorRegistry);
const inspectorEnv = createDefaultEnv();
const inspectorFormulaCompiler = createFormulaCompiler();

export function ReportDesignerDemo() {
  const [draggingField, setDraggingField] = useState<{
    sourceId: string;
    fieldId: string;
    label: string;
  } | null>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);

  const spreadsheetDoc = useMemo(() => createEmptyDocument('demo-spreadsheet'), []);
  const spreadsheetCore = useMemo(
    () => createSpreadsheetCore({ document: spreadsheetDoc }),
    [spreadsheetDoc],
  );
  const spreadsheetBridge = useMemo(
    () => createSpreadsheetBridge(spreadsheetCore),
    [spreadsheetCore],
  );
  const reportDoc = useMemo(
    () => createReportTemplateDocument(spreadsheetDoc, 'Demo Report'),
    [spreadsheetDoc],
  );
  const designerConfig: ReportDesignerConfig = useMemo(
    () => ({
      kind: 'report-template',
      fieldSources: fieldSources.map((fs) => ({ ...fs, provider: undefined })),
      inspector: {
        byTarget: {
          workbook: {
            type: 'container',
            className: 'stack-sm text-sm',
            body: [
              { type: 'text', text: 'Workbook selected' },
              { type: 'text', text: 'Use toolbar actions to edit metadata.' },
            ],
          },
          sheet: {
            type: 'container',
            className: 'stack-sm text-sm',
            body: [
              { type: 'text', text: 'Sheet selected' },
              { type: 'text', text: 'Switch sheets or drop fields onto cells.' },
            ],
          },
          row: {
            type: 'container',
            className: 'stack-sm text-sm',
            body: [
              { type: 'text', text: 'Row selected' },
              {
                type: 'text',
                text: 'Row metadata will be written through report-designer actions.',
              },
            ],
          },
          column: {
            type: 'container',
            className: 'stack-sm text-sm',
            body: [
              { type: 'text', text: 'Column selected' },
              {
                type: 'text',
                text: 'Column metadata will be written through report-designer actions.',
              },
            ],
          },
          range: {
            type: 'container',
            className: 'stack-sm text-sm',
            body: [
              { type: 'text', text: 'Range selected' },
              { type: 'text', text: 'Drop a field onto a range to fill cell bindings.' },
            ],
          },
          cell: {
            type: 'container',
            className: 'stack-sm text-sm',
            body: [
              { type: 'text', text: 'Cell selected' },
              { type: 'text', text: 'Use drop from the field panel to bind a dataset field.' },
            ],
          },
        },
      },
    }),
    [],
  );
  const designerCore = useMemo(
    () => createReportDesignerCore({ document: reportDoc, config: designerConfig }),
    [reportDoc, designerConfig],
  );
  const designerBridge = useMemo(
    () => createReportDesignerBridge(spreadsheetBridge, designerCore),
    [spreadsheetBridge, designerCore],
  );
  const designerSnapshot = useSyncExternalStore(
    designerCore.subscribe,
    designerCore.getSnapshot,
    designerCore.getSnapshot,
  );
  const spreadsheetRuntimeSnapshot = useSyncExternalStore(
    spreadsheetCore.subscribe,
    spreadsheetCore.getSnapshot,
    spreadsheetCore.getSnapshot,
  );

  useEffect(() => {
    designerCore.registerFieldDrop(dropAdapter);
    void designerCore.setSelectionTarget(designerCore.getSnapshot().selectionTarget);
  }, [designerCore]);

  const sheetId = spreadsheetDoc.workbook.sheets[0].id;

  const {
    snapshot,
    selectedCell,
    cellValue,
    getSelectedRange,
    editingCell,
    editValue,
    editingCellRef,
    handleEditSave,
    handleEditCancel,
    handleEditValueChange,
    fillHandleState,
    isFillPreview,
    handleFillHandleMouseDown,
    handleCellClick,
    handleCellDoubleClick,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleSelectRow,
    handleSelectColumn,
    handleSelectAll,
    handleColumnResizeStart,
    handleRowResizeStart,
    columnWidths,
    rowHeights,
    gridRef,
    isInRange,
    getMergeInfo,
    handleCellValueChange,
    handleCopy,
    handleCut,
    handlePaste,
    handleClear,
    handleStyleTool,
    handleInsertRow,
    handleDeleteRow,
    handleInsertColumn,
    handleDeleteColumn,
    handleFillDown,
    handleFillSeries,
    handleAddSheet,
    handleRemoveSheet,
    handleRenameSheet,
    handleMerge,
    handleUnmerge,
    handleMergeCenter,
    handleFreeze,
    handleUnfreeze,
    handleUndo,
    handleRedo,
    showFindReplace,
    setShowFindReplace,
    findQuery,
    setFindQuery,
    replaceText,
    setReplaceText,
    findResults,
    showCommentInput,
    setShowCommentInput,
    commentText,
    setCommentText,
    handleAddComment,
    handleDeleteComment,
    hasComment,
    currentCell,
    dropTargetCell,
    handleFieldDragOver,
    handleFieldDragLeave,
    handleFillHandleDoubleClick,
  } = useSpreadsheetInteractions({ bridge: spreadsheetBridge, sheetId, rows: ROWS, cols: COLS });

  useEffect(() => {
    const selection = snapshot.selection;

    if (selection.kind === 'column' && selection.columns?.length) {
      void designerCore.setSelectionTarget({ kind: 'column', sheetId, col: selection.columns[0]! });
      return;
    }

    if (selection.kind === 'row' && selection.rows?.length) {
      void designerCore.setSelectionTarget({ kind: 'row', sheetId, row: selection.rows[0]! });
      return;
    }

    if (selection.kind === 'sheet') {
      void designerCore.setSelectionTarget({ kind: 'sheet', sheetId });
      return;
    }

    if (selection.kind === 'range' && selection.range) {
      void designerCore.setSelectionTarget({ kind: 'range', range: selection.range });
      return;
    }

    if (selectedCell) {
      void designerCore.setSelectionTarget({
        kind: 'cell',
        cell: {
          sheetId,
          address: cellAddress(selectedCell.row, selectedCell.col),
          row: selectedCell.row,
          col: selectedCell.col,
        },
      });
    }
  }, [designerCore, selectedCell, sheetId, snapshot.selection]);

  const handleFieldDrop = useCallback(async () => {
    const targetCell = dropTargetCell || selectedCell;
    if (!draggingField || !targetCell) return;
    const addr = cellAddress(targetCell.row, targetCell.col);
    await spreadsheetBridge.dispatch({
      type: 'spreadsheet:setCellValue',
      cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
      value: `\${${draggingField.fieldId}}`,
    });
    await designerBridge.dispatchDesigner({
      type: 'report-designer:dropFieldToTarget',
      field: {
        type: 'report-field',
        sourceId: draggingField.sourceId,
        fieldId: draggingField.fieldId,
        data: { label: draggingField.label },
      },
      target: {
        kind: 'cell',
        cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
      },
    });
    setDraggingField(null);
  }, [draggingField, dropTargetCell, selectedCell, spreadsheetBridge, designerBridge, sheetId]);

  const frozen = snapshot.activeSheet?.frozen;

  const currentCellAddr = selectedCell ? cellAddress(selectedCell.row, selectedCell.col) : '';
  const inspectorScopeData = useMemo(
    () => buildReportDesignerScopeData(designerCore, designerSnapshot, spreadsheetRuntimeSnapshot),
    [designerCore, designerSnapshot, spreadsheetRuntimeSnapshot],
  );

  const getCellMetadata = useCallback(
    (row: number, col: number) => {
      return designerCore.getMetadata({
        kind: 'cell',
        cell: { sheetId, address: cellAddress(row, col), row, col },
      });
    },
    [designerCore, sheetId],
  );

  return (
    <div className="report-designer-demo">
      <div data-slot="report-demo-header">
        <h2>Report Designer Playground</h2>
        <SpreadsheetToolbar
          selectedCell={selectedCell}
          cellAddress={currentCellAddr}
          cellValue={cellValue}
          frozen={!!frozen}
          hasSelection={!!selectedCell}
          currentCellStyle={currentCell?.style}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          onClear={handleClear}
          onStyleTool={handleStyleTool}
          onMerge={handleMerge}
          onUnmerge={handleUnmerge}
          onMergeCenter={handleMergeCenter}
          onFillDown={handleFillDown}
          onFillSeries={handleFillSeries}
          onInsertRow={handleInsertRow}
          onDeleteRow={handleDeleteRow}
          onInsertColumn={handleInsertColumn}
          onDeleteColumn={handleDeleteColumn}
          onFreeze={handleFreeze}
          onUnfreeze={handleUnfreeze}
          onCellValueChange={handleCellValueChange}
          showFindReplace={showFindReplace}
          onToggleFindReplace={() => setShowFindReplace((v) => !v)}
          findQuery={findQuery}
          onFindQueryChange={setFindQuery}
          replaceText={replaceText}
          onReplaceTextChange={setReplaceText}
          findResults={findResults}
          onFind={() => {}}
          onReplace={() => {}}
          onReplaceAll={() => {}}
          showCommentInput={showCommentInput}
          onToggleCommentInput={() => setShowCommentInput((v) => !v)}
          commentText={commentText}
          onCommentTextChange={setCommentText}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          hasComment={hasComment}
        />
      </div>

      <div data-slot="report-demo-body">
        <div
          data-slot="report-demo-field-panel-shell"
          data-collapsed={paletteCollapsed || undefined}
        >
          <div data-slot="report-demo-panel-toolbar">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-slot="report-demo-panel-toggle"
              aria-label={paletteCollapsed ? 'Expand palette' : 'Collapse palette'}
              onClick={() => setPaletteCollapsed((value) => !value)}
            >
              {paletteCollapsed ? '>' : '<'}
            </Button>
          </div>
          {!paletteCollapsed ? (
            <div data-slot="report-demo-field-panel">
              <ReportFieldPanel
                fieldSources={fieldSources}
                onFieldDragStart={(sourceId, fieldId, label) =>
                  setDraggingField({ sourceId, fieldId, label })
                }
              />
            </div>
          ) : null}
        </div>

        <div
          ref={gridRef}
          data-slot="report-demo-canvas"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFieldDrop}
          onMouseDown={(e) => {
            if (editingCellRef.current && (e.target as HTMLElement).tagName !== 'INPUT') {
              handleEditSave();
            }
          }}
        >
          <SpreadsheetGrid
            snapshot={snapshot}
            bridge={spreadsheetBridge}
            rows={ROWS}
            cols={COLS}
            columnWidths={columnWidths}
            rowHeights={rowHeights}
            selectedCell={selectedCell}
            selection={snapshot.selection}
            editingCell={editingCell}
            editValue={editValue}
            fillHandleState={fillHandleState}
            isInRange={isInRange}
            isFillPreview={isFillPreview}
            getSelectedRange={getSelectedRange}
            getMergeInfo={getMergeInfo}
            onCellClick={handleCellClick}
            onCellDoubleClick={handleCellDoubleClick}
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
            onSelectRow={handleSelectRow}
            onSelectColumn={handleSelectColumn}
            onSelectAll={handleSelectAll}
            onColumnResizeStart={handleColumnResizeStart}
            onRowResizeStart={handleRowResizeStart}
            onFillHandleMouseDown={handleFillHandleMouseDown}
            onFillHandleDoubleClick={handleFillHandleDoubleClick}
            onEditValueChange={handleEditValueChange}
            onEditSave={handleEditSave}
            onEditCancel={handleEditCancel}
            dropTargetCell={dropTargetCell}
            draggingField={draggingField}
            getCellMetadata={getCellMetadata}
            onFieldDragOver={handleFieldDragOver}
            onFieldDragLeave={handleFieldDragLeave}
          />

          <SheetTabBar
            sheets={snapshot.workbook.sheets}
            activeSheetId={snapshot.activeSheet?.id ?? ''}
            onSwitchSheet={(id) =>
              spreadsheetBridge.dispatch({ type: 'spreadsheet:setActiveSheet', sheetId: id })
            }
            onAddSheet={handleAddSheet}
            onRemoveSheet={handleRemoveSheet}
            onRenameSheet={handleRenameSheet}
            canRemoveSheet={snapshot.workbook.sheets.length > 1}
          />
        </div>

        <div data-slot="report-demo-inspector">
          <SchemaRenderer
            schemaUrl="playground://report-designer/demo-inspector"
            schema={
              {
                type: 'report-inspector-shell',
                title: 'Inspector',
              } as any
            }
            registry={inspectorRegistry}
            env={inspectorEnv}
            formulaCompiler={inspectorFormulaCompiler}
            data={inspectorScopeData}
          />
        </div>
      </div>
    </div>
  );
}
