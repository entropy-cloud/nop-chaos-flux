import type {
  FieldSourceSnapshot,
  ReportSelectionTarget,
} from '@nop-chaos/report-designer-core';

export function joinClassNames(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ');
}

export function getFieldCount(fieldSources: FieldSourceSnapshot[]): number {
  return fieldSources.reduce((total: number, source) => {
    return total + source.groups.reduce((groupTotal: number, group) => groupTotal + group.fields.length, 0);
  }, 0);
}

export function formatSelectionLabel(target: ReportSelectionTarget | undefined) {
  if (!target) return 'none';
  switch (target.kind) {
    case 'workbook':
      return 'workbook';
    case 'sheet':
      return `sheet:${target.sheetId}`;
    case 'row':
      return `row:${target.sheetId}:${target.row}`;
    case 'column':
      return `column:${target.sheetId}:${target.col}`;
    case 'cell':
      return `cell:${target.cell.sheetId}:${target.cell.address}`;
    case 'range':
      return `range:${target.range.sheetId}:R${target.range.startRow}C${target.range.startCol}-R${target.range.endRow}C${target.range.endCol}`;
  }
}

export function formatMetadataValue(value: unknown): string {
  if (value == null) return 'empty';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}
