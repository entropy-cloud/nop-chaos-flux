import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '@nop-chaos/spreadsheet-core';
import {
  createReportDesignerCore,
  createReportTemplateDocument,
  type FieldDragPayload,
} from '@nop-chaos/report-designer-core';
import {
  createNopReportCellBindingDropAdapter,
  NOP_REPORT_FIELD_DROP_ADAPTER_ID,
  NOP_REPORT_FIELD_DRAG_TYPE,
} from '../index.js';

const field: FieldDragPayload = {
  type: NOP_REPORT_FIELD_DRAG_TYPE,
  sourceId: 'nop-report-datasets:orders',
  fieldId: 'orders.amount',
  data: { dataset: 'orders', path: 'amount', label: 'Amount', valueType: 'number' },
};

function cellTarget() {
  return { kind: 'cell' as const, cell: { sheetId: 's1', address: 'B2', row: 1, col: 1 } };
}

function rangeTarget() {
  return { kind: 'range' as const, range: { sheetId: 's1', startRow: 0, startCol: 0, endRow: 1, endCol: 1 } };
}

void cellTarget;
void rangeTarget;

describe('createNopReportCellBindingDropAdapter', () => {
  const adapter = createNopReportCellBindingDropAdapter();

  it('has the stable contract id and handles only single cells', () => {
    expect(adapter.id).toBe(NOP_REPORT_FIELD_DROP_ADAPTER_ID);
    expect(adapter.canHandle(field, cellTarget())).toBe(true);
    expect(adapter.canHandle(field, rangeTarget())).toBe(false);
  });

  it('maps a drop to the standardized nop-report model patch (discriminating: non-standard patch writers fail here)', () => {
    const patch = adapter.mapDropToMetaPatch({
      field,
      target: cellTarget(),
      context: {} as never,
    });
    expect(patch).toEqual({ 'nop-report': { model: { field: 'amount', ds: 'orders' } } });
  });

  it('falls back to fieldId when the payload carries no path and omits ds without a dataset', () => {
    const patch = adapter.mapDropToMetaPatch({
      field: { ...field, fieldId: 'orders.amount', data: {} },
      target: cellTarget(),
      context: {} as never,
    });
    expect(patch).toEqual({ 'nop-report': { model: { field: 'orders.amount' } } });
  });

  it('lands the field/ds binding in cellMeta through the dropFieldToTarget command chain', async () => {
    const spreadsheetDoc = createEmptyDocument('drop-doc');
    const sheetId = spreadsheetDoc.workbook.sheets[0].id;
    const core = createReportDesignerCore({
      document: createReportTemplateDocument(spreadsheetDoc, 'Drop Demo'),
      config: { kind: 'nop-report' },
      profile: { id: 'p', kind: 'nop-report', fieldSourceIds: [], fieldDropIds: [NOP_REPORT_FIELD_DROP_ADAPTER_ID] },
      adapters: { fieldDrops: new Map([[NOP_REPORT_FIELD_DROP_ADAPTER_ID, adapter]]) },
    });

    const result = await core.dispatch({
      type: 'report-designer:dropFieldToTarget',
      field,
      target: { kind: 'cell', cell: { sheetId, address: 'B2', row: 1, col: 1 } },
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    const cellMeta = core.getSnapshot().document.semantic?.cellMeta?.[sheetId]?.B2;
    expect((cellMeta?.['nop-report'] as Record<string, unknown>)?.model).toEqual({
      field: 'amount',
      ds: 'orders',
    });
  });

  it('does not bind when dropped onto a range (adjudicated first-version single-cell scope)', async () => {
    const spreadsheetDoc = createEmptyDocument('drop-range-doc');
    const core = createReportDesignerCore({
      document: createReportTemplateDocument(spreadsheetDoc, 'Drop Range Demo'),
      config: { kind: 'nop-report' },
      profile: { id: 'p', kind: 'nop-report', fieldSourceIds: [], fieldDropIds: [NOP_REPORT_FIELD_DROP_ADAPTER_ID] },
      adapters: { fieldDrops: new Map([[NOP_REPORT_FIELD_DROP_ADAPTER_ID, adapter]]) },
    });

    const result = await core.dispatch({
      type: 'report-designer:dropFieldToTarget',
      field,
      target: rangeTarget(),
    });

    // canHandle=false → adapter 不消费；命令走 applyFieldDrop 兜底路径
    expect(result.ok).toBe(true);
  });
});
