import { cellAddress } from '@nop-chaos/spreadsheet-core';
import type { InspectorPanelDescriptor, InspectorProvider, ReportDesignerConfig } from '@nop-chaos/report-designer-core';

export const DEFAULT_SELECTION_SUMMARY_PROVIDER_ID = 'default-selection-summary';

export function withDefaultSelectionSummaryInspector(config: ReportDesignerConfig): ReportDesignerConfig {
  const providers = config.inspector?.providers ?? [];
  if (providers.some((provider) => provider.id === DEFAULT_SELECTION_SUMMARY_PROVIDER_ID)) {
    return config;
  }

  return {
    ...config,
    inspector: {
      ...config.inspector,
      providers: [
        {
          id: DEFAULT_SELECTION_SUMMARY_PROVIDER_ID,
          label: 'Selection',
          match: { kinds: ['cell', 'row', 'column', 'sheet', 'range'] },
          provider: DEFAULT_SELECTION_SUMMARY_PROVIDER_ID,
          mode: 'tab',
          order: -100,
        },
        ...providers,
      ],
    },
  };
}

export const defaultSelectionSummaryInspectorProvider: InspectorProvider = {
  id: DEFAULT_SELECTION_SUMMARY_PROVIDER_ID,
  match: (target) => ['cell', 'row', 'column', 'sheet', 'range'].includes(target.kind),
  priority: -100,
  getPanels: (context): InspectorPanelDescriptor[] => {
    const { target, spreadsheet, metadata } = context;
    const selection = spreadsheet.selection;
    const selectedRows = selection.kind === 'row' ? [...(selection.rows ?? [])].sort((a, b) => a - b) : [];
    const selectedColumns = selection.kind === 'column' ? [...(selection.columns ?? [])].sort((a, b) => a - b) : [];
    const activeSheetId = spreadsheet.activeSheetId;

    if (target.kind === 'cell') {
      const cell = target.cell;
      const cellDoc = spreadsheet.document.workbook.sheets.find((sheet) => sheet.id === cell.sheetId)?.cells?.[cell.address];
      return [{
        id: 'selection-summary',
        title: 'Selection',
        targetKind: 'cell',
        mode: 'section',
        order: -100,
        body: {
          type: 'container',
          className: 'stack-sm text-sm',
          body: [
            { type: 'text', text: `Cell: ${cell.address}` },
            { type: 'text', text: `Row: ${cell.row + 1}` },
            { type: 'text', text: `Column: ${cell.col + 1}` },
            { type: 'text', text: `Value: ${String(cellDoc?.value ?? '(empty)')}` },
            { type: 'text', text: `Metadata keys: ${Object.keys(metadata ?? {}).length}` },
          ],
        },
      }];
    }

    if (target.kind === 'row') {
      const rows = selectedRows.length ? selectedRows : [target.row];
      return [{
        id: 'selection-summary',
        title: 'Selection',
        targetKind: 'row',
        mode: 'section',
        order: -100,
        body: {
          type: 'container',
          className: 'stack-sm text-sm',
          body: [
            { type: 'text', text: `Sheet: ${target.sheetId}` },
            { type: 'text', text: `Count: ${rows.length}` },
            { type: 'text', text: `Start: ${rows[0]! + 1}` },
            { type: 'text', text: `End: ${rows[rows.length - 1]! + 1}` },
            { type: 'text', text: `Rows: ${rows.map((row) => row + 1).join(', ')}` },
          ],
        },
      }];
    }

    if (target.kind === 'column') {
      const columns = selectedColumns.length ? selectedColumns : [target.col];
      return [{
        id: 'selection-summary',
        title: 'Selection',
        targetKind: 'column',
        mode: 'section',
        order: -100,
        body: {
          type: 'container',
          className: 'stack-sm text-sm',
          body: [
            { type: 'text', text: `Sheet: ${target.sheetId}` },
            { type: 'text', text: `Count: ${columns.length}` },
            { type: 'text', text: `Start: ${cellAddress(0, columns[0]!).replace(/[0-9]/g, '')}` },
            { type: 'text', text: `End: ${cellAddress(0, columns[columns.length - 1]!).replace(/[0-9]/g, '')}` },
            { type: 'text', text: `Columns: ${columns.map((col) => cellAddress(0, col).replace(/[0-9]/g, '')).join(', ')}` },
          ],
        },
      }];
    }

    if (target.kind === 'sheet') {
      return [{
        id: 'selection-summary',
        title: 'Selection',
        targetKind: 'sheet',
        mode: 'section',
        order: -100,
        body: {
          type: 'container',
          className: 'stack-sm text-sm',
          body: [
            { type: 'text', text: `Sheet: ${target.sheetId}` },
            { type: 'text', text: `Active sheet: ${activeSheetId}` },
            { type: 'text', text: `Metadata keys: ${Object.keys(metadata ?? {}).length}` },
          ],
        },
      }];
    }

    if (target.kind === 'range') {
      return [{
        id: 'selection-summary',
        title: 'Selection',
        targetKind: 'range',
        mode: 'section',
        order: -100,
        body: {
          type: 'container',
          className: 'stack-sm text-sm',
          body: [
            { type: 'text', text: `Sheet: ${target.range.sheetId}` },
            { type: 'text', text: `Start: ${cellAddress(target.range.startRow, target.range.startCol)}` },
            { type: 'text', text: `End: ${cellAddress(target.range.endRow, target.range.endCol)}` },
            { type: 'text', text: `Rows: ${target.range.endRow - target.range.startRow + 1}` },
            { type: 'text', text: `Columns: ${target.range.endCol - target.range.startCol + 1}` },
          ],
        },
      }];
    }

    return [];
  },
};
