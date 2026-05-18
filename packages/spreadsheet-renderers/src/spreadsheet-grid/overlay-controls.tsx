import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@nop-chaos/ui';
import { SpreadsheetGridContextMenu } from './spreadsheet-grid-context-menu.js';

interface ResizeDialogState {
  axis: 'row' | 'column';
  index: number;
  size: string;
}

export interface SpreadsheetGridOverlayControlsProps {
  contextActions: Parameters<typeof SpreadsheetGridContextMenu>[0]['actions'];
  selectedRange: Parameters<typeof SpreadsheetGridContextMenu>[0]['selectedRange'];
  selectionAnchorCell: Parameters<typeof SpreadsheetGridContextMenu>[0]['selectionAnchorCell'];
  activeSheetId: string;
  canSort: boolean;
  canFilter: boolean;
  canMerge: boolean;
  canUnmerge: boolean;
  canFreeze: boolean;
  canUseRowStructureActions: boolean;
  canUseColumnStructureActions: boolean;
  canResizeRow: boolean;
  canResizeColumn: boolean;
  hasActiveRowFilters: boolean;
  readOnly?: boolean;
  selectedRowInfo?: { start: number; count: number } | null;
  selectedColumnInfo?: { start: number; count: number } | null;
  resizeDialog: ResizeDialogState | null;
  setResizeDialog: React.Dispatch<React.SetStateAction<ResizeDialogState | null>>;
  openResizeDialog: (axis: 'row' | 'column', index: number) => void;
  submitResizeDialog: () => Promise<void>;
}

export function SpreadsheetGridOverlayControls({
  contextActions,
  selectedRange,
  selectionAnchorCell,
  activeSheetId,
  canSort,
  canFilter,
  canMerge,
  canUnmerge,
  canFreeze,
  canUseRowStructureActions,
  canUseColumnStructureActions,
  canResizeRow,
  canResizeColumn,
  hasActiveRowFilters,
  readOnly,
  selectedRowInfo,
  selectedColumnInfo,
  resizeDialog,
  setResizeDialog,
  openResizeDialog,
  submitResizeDialog,
}: SpreadsheetGridOverlayControlsProps) {
  return (
    <>
      <SpreadsheetGridContextMenu
        actions={contextActions}
        selectedRange={selectedRange}
        selectionAnchorCell={selectionAnchorCell}
        activeSheetId={activeSheetId}
        canSort={canSort}
        canFilter={canFilter}
        canMerge={canMerge}
        canUnmerge={canUnmerge}
        canFreeze={canFreeze}
        canUseRowStructureActions={canUseRowStructureActions}
        canUseColumnStructureActions={canUseColumnStructureActions}
        canResizeRow={canResizeRow}
        canResizeColumn={canResizeColumn}
        hasActiveRowFilters={hasActiveRowFilters}
        readOnly={readOnly}
        onResizeRowRequest={() => {
          if (selectedRowInfo?.count === 1) {
            openResizeDialog('row', selectedRowInfo.start);
          }
        }}
        onResizeColumnRequest={() => {
          if (selectedColumnInfo?.count === 1) {
            openResizeDialog('column', selectedColumnInfo.start);
          }
        }}
      />
      <Dialog open={resizeDialog != null} onOpenChange={(open) => (!open ? setResizeDialog(null) : undefined)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {resizeDialog?.axis === 'row' ? t('flux.spreadsheet.rowHeight') : t('flux.spreadsheet.columnWidth')}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Input
              type="number"
              aria-label={resizeDialog?.axis === 'row' ? 'Row height' : 'Column width'}
              value={resizeDialog?.size ?? ''}
              onChange={(event) => {
                setResizeDialog((current) => (current ? { ...current, size: event.target.value } : current));
              }}
            />
          </DialogBody>
          <DialogFooter className="bg-transparent">
            <Button variant="ghost" size="sm" onClick={() => setResizeDialog(null)}>
              {t('flux.common.cancel')}
            </Button>
            <Button size="sm" onClick={() => void submitResizeDialog()}>
              {t('flux.common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
