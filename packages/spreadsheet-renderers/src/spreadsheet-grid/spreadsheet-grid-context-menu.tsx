import { t } from '@nop-chaos/flux-i18n';
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from '@nop-chaos/ui';
import type { ContextMenuActions } from './use-context-menu-actions.js';

export interface SpreadsheetGridContextMenuProps {
  actions: ContextMenuActions;
  selectedRange: unknown;
  selectionAnchorCell: { row: number; col: number } | null;
  activeSheetId: string;
  canSort: boolean;
  canFilter: boolean;
  canMerge: boolean;
  canUnmerge: boolean;
  canFreeze: boolean;
  canUseRowStructureActions: boolean;
  canUseColumnStructureActions: boolean;
  hasActiveRowFilters: boolean;
}

export function SpreadsheetGridContextMenu({
  actions,
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
  hasActiveRowFilters,
}: SpreadsheetGridContextMenuProps) {
  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => void actions.handleContextCopy()} disabled={!selectedRange}>
        {t('flux.spreadsheet.copy')}
        <ContextMenuShortcut>
          {t('flux.spreadsheet.copyShortcut').replace(/^.*\s/, '')}
        </ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onClick={() => void actions.handleContextCut()} disabled={!selectedRange}>
        {t('flux.spreadsheet.cut')}
        <ContextMenuShortcut>
          {t('flux.spreadsheet.cutShortcut').replace(/^.*\s/, '')}
        </ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => void actions.handleContextPaste()}
        disabled={!selectionAnchorCell || !activeSheetId}
      >
        {t('flux.spreadsheet.paste')}
        <ContextMenuShortcut>
          {t('flux.spreadsheet.pasteShortcut').replace(/^.*\s/, '')}
        </ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-clear"
        onClick={() => void actions.handleContextClear()}
        disabled={!selectedRange}
      >
        {t('flux.common.clear')}
        <ContextMenuShortcut>
          {t('flux.spreadsheet.clearShortcut').replace(/^.*\s/, '')}
        </ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        data-testid="spreadsheet-context-sort-asc"
        onClick={() => void actions.handleContextSort('asc')}
        disabled={!canSort}
      >
        {t('flux.spreadsheet.sortAscending')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-sort-desc"
        onClick={() => void actions.handleContextSort('desc')}
        disabled={!canSort}
      >
        {t('flux.spreadsheet.sortDescending')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-filter-by-value"
        onClick={() => void actions.handleContextFilterBySelectedValue()}
        disabled={!canFilter}
      >
        {t('flux.spreadsheet.filterBySelectedValue')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-clear-filter"
        onClick={() => void actions.handleContextClearFilter()}
        disabled={!hasActiveRowFilters}
      >
        {t('flux.spreadsheet.clearFilter')}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        data-testid="spreadsheet-context-merge"
        onClick={() => void actions.handleContextMerge()}
        disabled={!canMerge}
      >
        {t('flux.spreadsheet.mergeCells')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-unmerge"
        onClick={() => void actions.handleContextUnmerge()}
        disabled={!canUnmerge}
      >
        {t('flux.spreadsheet.unmergeCells')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-freeze"
        onClick={() => void actions.handleContextFreeze()}
        disabled={!canFreeze}
      >
        {t('flux.spreadsheet.freezePanes')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-unfreeze"
        onClick={() => void actions.handleContextUnfreeze()}
        disabled={!activeSheetId}
      >
        {t('flux.spreadsheet.unfreezePanes')}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        data-testid="spreadsheet-context-insert-row-above"
        onClick={() => void actions.handleContextInsertRow()}
        disabled={!canUseRowStructureActions || !selectionAnchorCell || !activeSheetId}
      >
        {t('flux.spreadsheet.insertRowAbove')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-insert-row-below"
        onClick={() => void actions.handleContextInsertRowBelow()}
        disabled={!canUseRowStructureActions || !selectionAnchorCell || !activeSheetId}
      >
        {t('flux.spreadsheet.insertRowBelow')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-delete-row"
        onClick={() => void actions.handleContextDeleteRow()}
        disabled={!canUseRowStructureActions || !selectionAnchorCell || !activeSheetId}
      >
        {t('flux.spreadsheet.deleteRow')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-insert-column-left"
        onClick={() => void actions.handleContextInsertColumn()}
        disabled={!canUseColumnStructureActions || !selectionAnchorCell || !activeSheetId}
      >
        {t('flux.spreadsheet.insertColumnLeft')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-insert-column-right"
        onClick={() => void actions.handleContextInsertColumnRight()}
        disabled={!canUseColumnStructureActions || !selectionAnchorCell || !activeSheetId}
      >
        {t('flux.spreadsheet.insertColumnRight')}
      </ContextMenuItem>
      <ContextMenuItem
        data-testid="spreadsheet-context-delete-column"
        onClick={() => void actions.handleContextDeleteColumn()}
        disabled={!canUseColumnStructureActions || !selectionAnchorCell || !activeSheetId}
      >
        {t('flux.spreadsheet.deleteColumn')}
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
