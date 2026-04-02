import { useCallback, useMemo, useState } from 'react';
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
  type InspectorProvider,
  type InspectorPanelDescriptor,
  type FieldDropAdapter,
} from '@nop-chaos/report-designer-core';
import {
  createReportDesignerBridge,
  ReportFieldPanel,
} from '@nop-chaos/report-designer-renderers';

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

const cellInspectorProvider: InspectorProvider = {
  id: 'cell-basic-inspector',
  match: (target) => target.kind === 'cell',
  priority: 0,
  getPanels: (context): InspectorPanelDescriptor[] => {
    const cell = context.target.kind === 'cell' ? context.target.cell : undefined;
    if (!cell) return [];
    const meta = context.metadata;
    return [{
      id: 'cell-basic',
      title: 'Cell',
      targetKind: 'cell',
      mode: 'tab',
      order: 0,
      body: {
        address: cell.address,
        row: cell.row + 1,
        col: cell.col + 1,
        metadata: meta ?? {},
      },
    }];
  },
};

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

export function ReportDesignerDemo() {
  const [log, setLog] = useState<string[]>([]);
  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const [draggingField, setDraggingField] = useState<{
    sourceId: string; fieldId: string; label: string;
  } | null>(null);

  const spreadsheetDoc = useMemo(() => createEmptyDocument('demo-spreadsheet'), []);
  const spreadsheetCore = useMemo(() => createSpreadsheetCore({ document: spreadsheetDoc }), [spreadsheetDoc]);
  const spreadsheetBridge = useMemo(() => createSpreadsheetBridge(spreadsheetCore), [spreadsheetCore]);
  const reportDoc = useMemo(() => createReportTemplateDocument(spreadsheetDoc, 'Demo Report'), [spreadsheetDoc]);
  const designerConfig: ReportDesignerConfig = useMemo(() => ({
    kind: 'report-template',
    fieldSources: fieldSources.map(fs => ({ ...fs, provider: undefined })),
  }), []);
  const designerCore = useMemo(() => createReportDesignerCore({ document: reportDoc, config: designerConfig }), [reportDoc, designerConfig]);
  const designerBridge = useMemo(() => createReportDesignerBridge(spreadsheetBridge, designerCore), [spreadsheetBridge, designerCore]);

  useMemo(() => {
    designerCore.registerInspector(cellInspectorProvider);
    designerCore.registerFieldDrop(dropAdapter);
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
  } = useSpreadsheetInteractions({ bridge: spreadsheetBridge, sheetId, rows: ROWS, cols: COLS, onLog: addLog });

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
    addLog(`Bound field "${draggingField.label}" to ${addr}`);
    setDraggingField(null);
  }, [draggingField, dropTargetCell, selectedCell, spreadsheetBridge, designerBridge, sheetId, addLog]);

  const frozen = snapshot.activeSheet?.frozen;

  const currentCellAddr = selectedCell ? cellAddress(selectedCell.row, selectedCell.col) : '';

  const getCellMetadata = useCallback((row: number, col: number) => {
    return designerCore.getMetadata({
      kind: 'cell',
      cell: { sheetId, address: cellAddress(row, col), row, col },
    });
  }, [designerCore, sheetId]);

  return (
    <div className="report-designer-demo">
      <div className="report-designer-demo__header">
        <h2>Report Designer Playground</h2>
        <SpreadsheetToolbar
          selectedCell={selectedCell}
          cellAddress={currentCellAddr}
          cellValue={cellValue}
          frozen={!!frozen}
          hasSelection={!!selectedCell}
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
          onToggleFindReplace={() => setShowFindReplace(v => !v)}
          findQuery={findQuery}
          onFindQueryChange={setFindQuery}
          replaceText={replaceText}
          onReplaceTextChange={setReplaceText}
          findResults={findResults}
          onFind={() => {}}
          onReplace={() => {}}
          onReplaceAll={() => {}}
          showCommentInput={showCommentInput}
          onToggleCommentInput={() => setShowCommentInput(v => !v)}
          commentText={commentText}
          onCommentTextChange={setCommentText}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          hasComment={hasComment}
        />
      </div>

      <div className="report-designer-demo__body">
        <div className="report-designer-demo__field-panel">
          <ReportFieldPanel
            fieldSources={fieldSources}
            onFieldDragStart={(sourceId, fieldId, label) => setDraggingField({ sourceId, fieldId, label })}
          />
        </div>

        <div
          ref={gridRef}
          className="report-designer-demo__canvas"
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
            onColumnResizeStart={handleColumnResizeStart}
            onRowResizeStart={handleRowResizeStart}
            onFillHandleMouseDown={handleFillHandleMouseDown}
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
            onSwitchSheet={(id) => spreadsheetBridge.dispatch({ type: 'spreadsheet:setActiveSheet', sheetId: id })}
            onAddSheet={handleAddSheet}
            onRemoveSheet={handleRemoveSheet}
            onRenameSheet={handleRenameSheet}
            canRemoveSheet={snapshot.workbook.sheets.length > 1}
          />
        </div>

        <div className="report-designer-demo__inspector">
          <h3>Inspector</h3>
          {selectedCell ? (
            <div className="inspector-content">
              <div className="inspector-section">
                <h4>Cell: {currentCellAddr}</h4>
                <div className="inspector-field">
                  <span>Row:</span> <span>{selectedCell.row + 1}</span>
                </div>
                <div className="inspector-field">
                  <span>Col:</span> <span>{selectedCell.col + 1}</span>
                </div>
                <div className="inspector-field">
                  <span>Value:</span> <span>{String(currentCell?.value ?? '(empty)')}</span>
                </div>
              </div>
              <div className="inspector-section">
                <h4>Style</h4>
                <div className="inspector-field">
                  <span>Bold:</span> <span>{currentCell?.style?.fontWeight === 'bold' ? '✓' : '✗'}</span>
                </div>
                <div className="inspector-field">
                  <span>Italic:</span> <span>{currentCell?.style?.fontStyle === 'italic' ? '✓' : '✗'}</span>
                </div>
                <div className="inspector-field">
                  <span>Color:</span>
                  <span className="color-preview" style={{ backgroundColor: currentCell?.style?.fontColor ?? '#000' }} />
                </div>
                <div className="inspector-field">
                  <span>BG:</span>
                  <span className="color-preview" style={{ backgroundColor: currentCell?.style?.backgroundColor ?? 'transparent' }} />
                </div>
                <div className="inspector-field">
                  <span>Align:</span> <span>{currentCell?.style?.textAlign ?? 'left'}</span>
                </div>
              </div>
              {currentCell?.comment && (
                <div className="inspector-section">
                  <h4>Comment</h4>
                  <p className="comment-text">
                    {typeof currentCell.comment === 'string' ? currentCell.comment : currentCell.comment.text}
                  </p>
                </div>
              )}
              {frozen && (
                <div className="inspector-section">
                  <h4>Frozen Panes</h4>
                  <div className="inspector-field">
                    <span>Row:</span> <span>{frozen.row ?? 0}</span>
                  </div>
                  <div className="inspector-field">
                    <span>Col:</span> <span>{frozen.col ?? 0}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="inspector-empty">Click a cell to inspect.</p>
          )}
        </div>
      </div>

      <div className="report-designer-demo__log">
        <h3>Event Log</h3>
        <div className="log-content">
          {log.length === 0 ? (
            <p className="log-empty">Interact with the spreadsheet to see events.</p>
          ) : (
            log.map((entry, i) => (
              <div key={i} className="log-entry">{entry}</div>
            ))
          )}
        </div>
      </div>

      <div className="shortcuts-help">
        <h4>Keyboard Shortcuts</h4>
        <div className="shortcuts-grid">
          <span><kbd>Ctrl+C</kbd> Copy</span>
          <span><kbd>Ctrl+X</kbd> Cut</span>
          <span><kbd>Ctrl+V</kbd> Paste</span>
          <span><kbd>Ctrl+Z</kbd> Undo</span>
          <span><kbd>Ctrl+Y</kbd> Redo</span>
          <span><kbd>Ctrl+B</kbd> Bold</span>
          <span><kbd>Ctrl+I</kbd> Italic</span>
          <span><kbd>Ctrl+U</kbd> Underline</span>
          <span><kbd>Ctrl+F</kbd> Find</span>
          <span><kbd>Delete</kbd> Clear</span>
          <span><kbd>Esc</kbd> Close panels</span>
          <span><kbd>Drag</kbd> Select range</span>
          <span><kbd>DblClick</kbd> Rename sheet</span>
        </div>
      </div>
    </div>
  );
}
