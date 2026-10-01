import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@nop-chaos/spreadsheet-renderers/canvas-styles.css';
import {
  createSpreadsheetCore,
  createEmptyDocument,
  cellAddress,
  type SpreadsheetDocument,
} from '@nop-chaos/spreadsheet-core';
import {
  createSpreadsheetBridge,
  SheetTabBar,
  SpreadsheetToolbar,
  SpreadsheetGrid,
  useSpreadsheetInteractions,
} from '@nop-chaos/spreadsheet-renderers';
import { Button, cn } from '@nop-chaos/ui';

declare global {
  interface Window {
    __SPREADSHEET_DEMO__?: {
      exportDocument: () => SpreadsheetDocument;
    };
  }
}

const ROWS = 200;
const COLS = 26;

function seedCell(address: string, row: number, col: number, value?: unknown, formula?: string) {
  return { address, row, col, value, formula };
}

// 演示数据（ux-r4 SP-3）：季度销售示例表，含 SUM 合计行/列与 AVERAGE+ROUND 均值行，
// 打开即经装载求值呈现公式计算值。
function seedDocument(): SpreadsheetDocument {
  const doc = createEmptyDocument('spreadsheet-demo');
  const sheet = doc.workbook.sheets[0];
  const rows: Array<[string, number, number, unknown?, string?]> = [
    ['A1', 0, 0, 'Region'],
    ['B1', 0, 1, 'Q1'],
    ['C1', 0, 2, 'Q2'],
    ['D1', 0, 3, 'Q3'],
    ['E1', 0, 4, 'Total'],
    ['A2', 1, 0, 'North'],
    ['B2', 1, 1, 120],
    ['C2', 1, 2, 135],
    ['D2', 1, 3, 150],
    ['E2', 1, 4, undefined, '=SUM(B2:D2)'],
    ['A3', 2, 0, 'South'],
    ['B3', 2, 1, 90],
    ['C3', 2, 2, 110],
    ['D3', 2, 3, 95],
    ['E3', 2, 4, undefined, '=SUM(B3:D3)'],
    ['A4', 3, 0, 'East'],
    ['B4', 3, 1, 140],
    ['C4', 3, 2, 125],
    ['D4', 3, 3, 160],
    ['E4', 3, 4, undefined, '=SUM(B4:D4)'],
    ['A5', 4, 0, 'West'],
    ['B5', 4, 1, 100],
    ['C5', 4, 2, 105],
    ['D5', 4, 3, 115],
    ['E5', 4, 4, undefined, '=SUM(B5:D5)'],
    ['A6', 5, 0, 'Total'],
    ['B6', 5, 1, undefined, '=SUM(B2:B5)'],
    ['C6', 5, 2, undefined, '=SUM(C2:C5)'],
    ['D6', 5, 3, undefined, '=SUM(D2:D5)'],
    ['E6', 5, 4, undefined, '=SUM(E2:E5)'],
    ['A7', 6, 0, 'Average'],
    ['B7', 6, 1, undefined, '=ROUND(AVERAGE(B2:B5),1)'],
    ['C7', 6, 2, undefined, '=ROUND(AVERAGE(C2:C5),1)'],
    ['D7', 6, 3, undefined, '=ROUND(AVERAGE(D2:D5),1)'],
  ];
  sheet.cells = Object.fromEntries(
    rows.map(([address, row, col, value, formula]) => [
      address,
      seedCell(address, row, col, value, formula),
    ]),
  );
  return doc;
}

export function SpreadsheetDemo() {
  const documentModel = useMemo(() => seedDocument(), []);
  const core = useMemo(
    () => createSpreadsheetCore({ document: documentModel }),
    [documentModel],
  );
  const bridge = useMemo(() => createSpreadsheetBridge(core), [core]);
  const [logs, setLogs] = useState<{ id: number; text: string }[]>([]);
  const logIdRef = useRef(0);
  const [selectedCellText, setSelectedCellText] = useState('');

  useEffect(() => {
    window.__SPREADSHEET_DEMO__ = {
      exportDocument: () => core.exportDocument(),
    };
    return () => {
      delete window.__SPREADSHEET_DEMO__;
    };
  }, [core]);

  const addLog = useCallback((msg: string) => {
    logIdRef.current += 1;
    const id = logIdRef.current;
    setLogs((prev) => [{ id, text: msg }, ...prev].slice(0, 8));
  }, []);

  const interactions = useSpreadsheetInteractions({
    bridge,
    sheetId: core.getSnapshot().activeSheetId,
    rows: ROWS,
    cols: COLS,
    onLog: addLog,
  });

  const { snapshot, selectedCell, columnWidths, rowHeights, gridRef } = interactions;

  const setFormulaOnSelected = useCallback(async () => {
    const cell = selectedCell ?? { row: 0, col: 0 };
    await bridge.dispatch({
      type: 'spreadsheet:setCellFormula',
      cell: {
        sheetId: core.getSnapshot().activeSheetId,
        address: cellAddress(cell.row, cell.col),
        row: cell.row,
        col: cell.col,
      },
      formula: '=SUM(B1:B2)',
    });
    const addr = cellAddress(cell.row, cell.col);
    addLog(`Formula set on ${addr}`);
    setSelectedCellText(`${addr}: =SUM(B1:B2)`);
  }, [addLog, bridge, core, selectedCell]);

  const cellRef = selectedCell ? cellAddress(selectedCell.row, selectedCell.col) : '';
  const frozen = Boolean(
    snapshot.activeSheet?.frozen &&
      ((snapshot.activeSheet.frozen.row ?? 0) > 0 || (snapshot.activeSheet.frozen.col ?? 0) > 0),
  );

  return (
    <div
      data-testid="spreadsheet-demo-host"
      className="flex h-full min-h-0 flex-col gap-3 p-4"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[var(--nop-text-strong)]">
          {cellRef || 'No selection'}
        </span>
        <Button size="sm" variant="outline" onClick={() => void setFormulaOnSelected()}>
          Set Formula on selected cell
        </Button>
        <span data-testid="spreadsheet-demo-formula" className="text-xs text-[var(--nop-eyebrow)]">
          {selectedCellText}
        </span>
      </div>

      <div
        ref={gridRef}
        data-slot="spreadsheet-default-host"
        role="region"
        tabIndex={-1}
        className="nop-spreadsheet-page flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--nop-border)] bg-[var(--nop-surface)]"
      >
        <div data-slot="spreadsheet-default-toolbar" className="flex-shrink-0 border-b border-[var(--nop-border)]">
          <SpreadsheetToolbar
            selectedCell={selectedCell}
            cellAddress={cellRef}
            cellValue={interactions.cellValue}
            frozen={frozen}
            hasSelection={Boolean(selectedCell)}
            currentCellStyle={interactions.currentCell?.style}
            onUndo={() => void interactions.handleUndo()}
            onRedo={() => void interactions.handleRedo()}
            onCopy={() => void interactions.handleCopy()}
            onCut={() => void interactions.handleCut()}
            onPaste={() => void interactions.handlePaste()}
            onClear={() => void interactions.handleClear()}
            onStyleTool={(tool) => void interactions.handleStyleTool(tool)}
            onMerge={() => void interactions.handleMerge()}
            onUnmerge={() => void interactions.handleUnmerge()}
            onMergeCenter={() => void interactions.handleMergeCenter()}
            onFillDown={() => void interactions.handleFillDown()}
            onFillSeries={(direction) => void interactions.handleFillSeries(direction)}
            onInsertRow={() => void interactions.handleInsertRow()}
            onDeleteRow={() => void interactions.handleDeleteRow()}
            onInsertColumn={() => void interactions.handleInsertColumn()}
            onDeleteColumn={() => void interactions.handleDeleteColumn()}
            onFreeze={() => void interactions.handleFreeze()}
            onUnfreeze={() => void interactions.handleUnfreeze()}
            onCellValueChange={interactions.handleCellValueChange}
            showFindReplace={interactions.showFindReplace}
            onToggleFindReplace={() => interactions.setShowFindReplace((value) => !value)}
            findQuery={interactions.findQuery}
            onFindQueryChange={interactions.setFindQuery}
            replaceText={interactions.replaceText}
            onReplaceTextChange={interactions.setReplaceText}
            findResults={interactions.findResults}
            onFind={() => void interactions.handleFind()}
            onReplace={() => void interactions.handleReplace()}
            onReplaceAll={() => void interactions.handleReplaceAll()}
            showCommentInput={interactions.showCommentInput}
            onToggleCommentInput={() => interactions.setShowCommentInput((value) => !value)}
            commentText={interactions.commentText}
            onCommentTextChange={() => undefined}
            onAddComment={() => void interactions.handleAddComment()}
            onDeleteComment={() => void interactions.handleDeleteComment()}
            hasComment={interactions.hasComment}
            readOnly={snapshot.runtime.readonly}
          />
        </div>

        <SpreadsheetGrid
          snapshot={snapshot}
          bridge={bridge}
          rows={ROWS}
          cols={COLS}
          columnWidths={columnWidths}
          rowHeights={rowHeights}
          selectedCell={selectedCell}
          selection={snapshot.selection}
          editingCell={interactions.editingCell}
          editValue={interactions.editValue}
          editSaveState={interactions.editSaveState}
          fillHandleState={interactions.fillHandleState}
          isInRange={interactions.isInRange}
          isFillPreview={interactions.isFillPreview}
          getSelectedRange={interactions.getSelectedRange}
          getMergeInfo={interactions.getMergeInfo}
          onCellClick={interactions.handleCellClick}
          onCellDoubleClick={interactions.handleCellDoubleClick}
          onCellMouseDown={interactions.handleCellMouseDown}
          onCellMouseEnter={interactions.handleCellMouseEnter}
          onSelectRow={interactions.handleSelectRow}
          onSelectColumn={interactions.handleSelectColumn}
          onSelectAll={interactions.handleSelectAll}
          onColumnResizeStart={interactions.handleColumnResizeStart}
          onRowResizeStart={interactions.handleRowResizeStart}
          onFillHandleMouseDown={interactions.handleFillHandleMouseDown}
          onFillHandleDoubleClick={interactions.handleFillHandleDoubleClick}
          onEditValueChange={interactions.handleEditValueChange}
          onEditSave={() => void interactions.handleEditSave()}
          onEditCancel={interactions.handleEditCancel}
          dropTargetCell={interactions.dropTargetCell}
          draggingField={null}
          onFieldDragOver={interactions.handleFieldDragOver}
          onFieldDragLeave={interactions.handleFieldDragLeave}
          readonly={snapshot.runtime.readonly}
        />

        <SheetTabBar
          sheets={snapshot.workbook.sheets}
          activeSheetId={snapshot.activeSheet?.id ?? ''}
          onSwitchSheet={(nextSheetId) =>
            void bridge.dispatch({ type: 'spreadsheet:setActiveSheet', sheetId: nextSheetId })
          }
          onAddSheet={() => void interactions.handleAddSheet()}
          onRemoveSheet={(nextSheetId) => void interactions.handleRemoveSheet(nextSheetId)}
          onRenameSheet={(nextSheetId, name) =>
            void interactions.handleRenameSheet(nextSheetId, name)
          }
          canRemoveSheet={snapshot.workbook.sheets.length > 1}
          readOnly={snapshot.runtime.readonly}
        />
      </div>

      <details
        data-testid="spreadsheet-demo-log"
        className="rounded-lg border border-[var(--nop-border)] bg-[var(--nop-surface-muted)] px-2 py-1.5 text-xs text-[var(--nop-body-copy)]"
      >
        <summary className="cursor-pointer select-none text-[var(--nop-eyebrow)]">
          Dev Log{logs.length > 0 ? `（${logs.length}）` : ''}
        </summary>
        <div className="mt-1 max-h-24 overflow-auto">
          {logs.length === 0 ? <span>No actions yet.</span> : logs.map((entry, index) => (
            <div key={entry.id} className={cn(index === 0 && 'font-semibold')}>
              {entry.text}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
