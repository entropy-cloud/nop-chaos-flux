import { useMemo } from 'react';
import type { RefObject } from 'react';
import type { TableColumnSchema, TableSchema } from '../schemas.js';
import {
  createFixedColumnLayout,
  getFixedColumnKey,
  DRAG_COLUMN_KEY,
  DRAG_COLUMN_WIDTH,
  ROW_SAVE_BAR_COLUMN_KEY,
  ROW_SAVE_BAR_COLUMN_WIDTH,
} from './fixed-columns.js';
import { useTableColumnWidths } from './column-width-measure.js';

export interface TableColumnLayoutOptions {
  mainColumns: TableColumnSchema[];
  effectiveMainColumns: TableColumnSchema[];
  visibleColumns: string[];
  showExpandColumn: boolean;
  dragSortActive: boolean;
  /** Raw schema rowSelection config (truthiness drives the helper columns). */
  rowSelection: TableSchema['rowSelection'];
  rowDraftColumnEnabled: boolean;
  resizeWidths: Record<string, number>;
  /** Owned by the caller: the measure root element is routed in its JSX. */
  measureRootRef: RefObject<HTMLDivElement | null>;
}

// Extracted from table-renderer.tsx (check:oversized-code-files 700-line gate):
// the measurement + fixed-column layout + colgroup derivation unit. Pure move,
// no behavior change.
export function useTableColumnLayout(options: TableColumnLayoutOptions) {
  const {
    mainColumns,
    effectiveMainColumns,
    visibleColumns,
    showExpandColumn,
    dragSortActive,
    rowSelection,
    rowDraftColumnEnabled,
    resizeWidths,
    measureRootRef,
  } = options;
  const rowSelectionEnabled = Boolean(rowSelection);
  // The digest array used to be constructed inline, so the stringify memo inside
  // useTableColumnWidths never hit and the full column schemas were deep-
  // serialized on every render (perf P6). Memoizing the digest on its members
  // keeps the remeasure trigger surface identical while skipping the stringify
  // on unrelated renders.
  const measureDigest = useMemo(
    () => [mainColumns, showExpandColumn, rowSelectionEnabled, resizeWidths, visibleColumns],
    [mainColumns, showExpandColumn, rowSelectionEnabled, resizeWidths, visibleColumns],
  );
  const measuredWidths = useTableColumnWidths(measureRootRef, measureDigest);
  const fixedColumnLayout = useMemo(
    () =>
      createFixedColumnLayout(
        {
          rowSelection,
          draggable: dragSortActive,
        },
        mainColumns,
        showExpandColumn,
        measuredWidths,
      ),
    [rowSelection, dragSortActive, mainColumns, showExpandColumn, measuredWidths],
  );

  // [G3-视角5-01]/[G3-R3-视角8-01] helper body columns must pair header th +
  // colgroup col; derive the flags once and share them with header/count.
  const colgroupEntries = useMemo(() => {
    const entries: { key: string; width: number | undefined }[] = [];
    if (dragSortActive) {
      entries.push({ key: DRAG_COLUMN_KEY, width: measuredWidths.get(DRAG_COLUMN_KEY) ?? DRAG_COLUMN_WIDTH });
    }
    if (showExpandColumn) {
      entries.push({ key: '__expand__', width: measuredWidths.get('__expand__') });
    }
    if (rowSelectionEnabled) {
      entries.push({ key: '__selection__', width: measuredWidths.get('__selection__') });
    }
    effectiveMainColumns.forEach((column, index) => {
      const key = getFixedColumnKey(column, index);
      entries.push({ key, width: measuredWidths.get(key) });
    });
    if (rowDraftColumnEnabled) {
      entries.push({
        key: ROW_SAVE_BAR_COLUMN_KEY,
        width: measuredWidths.get(ROW_SAVE_BAR_COLUMN_KEY) ?? ROW_SAVE_BAR_COLUMN_WIDTH,
      });
    }
    return entries;
  }, [effectiveMainColumns, measuredWidths, rowSelectionEnabled, dragSortActive, showExpandColumn, rowDraftColumnEnabled]);

  return { measureRootRef, measuredWidths, fixedColumnLayout, colgroupEntries };
}
