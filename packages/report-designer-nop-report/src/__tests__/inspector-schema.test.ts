import { describe, expect, it } from 'vitest';
import {
  resolveInspectorSchemaForTarget,
  type ReportDesignerConfig,
} from '@nop-chaos/report-designer-core';
import {
  buildNopReportMetaPatch,
  createNopReportInspectorSchemas,
  NOP_REPORT_EXPRESSION_FIELDS,
  NOP_REPORT_EXPRESSION_KIND_MARKER,
  NOP_REPORT_INSPECTOR_SCHEMA_ID,
  NOP_REPORT_XPT_MODEL_FIELDS,
} from '../index.js';

function collectNodes(node: unknown): Record<string, unknown>[] {
  if (typeof node !== 'object' || node === null) {
    return [];
  }
  const record = node as Record<string, unknown>;
  const children = [
    ...((record.body as unknown[] | undefined) ?? []),
    ...((record.actions as unknown[] | undefined) ?? []),
    ...((record.tabs as unknown[] | undefined) ?? []),
  ];
  return [record, ...children.flatMap((child) => collectNodes(child))];
}

describe('createNopReportInspectorSchemas', () => {
  const schemas = createNopReportInspectorSchemas();

  it('generates cell/sheet/workbook schemas and nothing for other kinds', () => {
    expect(schemas.cell).toBeTruthy();
    expect(schemas.sheet).toBeTruthy();
    expect(schemas.workbook).toBeTruthy();
    expect(schemas.row).toBeUndefined();
    expect(schemas.range).toBeUndefined();
  });

  it('cell schema covers Basic fields plus all 13 XPT model fields', () => {
    const nodes = collectNodes(schemas.cell);
    const names = new Set(nodes.map((node) => node.name as string));
    for (const basic of ['basic.value', 'basic.type', 'basic.styleId', 'basic.comment', 'basic.linkUrl', 'basic.protected']) {
      expect(names.has(basic)).toBe(true);
    }
    for (const field of NOP_REPORT_XPT_MODEL_FIELDS) {
      expect(names.has(`xpt.${field}`)).toBe(true);
    }
  });

  it('marks the five expression fields with the expression-kind marker (NRP-4 consumption premise)', () => {
    const nodes = collectNodes(schemas.cell);
    for (const field of NOP_REPORT_EXPRESSION_FIELDS) {
      const node = nodes.find((item) => item.name === `xpt.${field}`);
      expect(node, field).toBeTruthy();
      expect(node?.[NOP_REPORT_EXPRESSION_KIND_MARKER]).toBe(true);
    }
    // 非 expression 字段不带标记
    expect(nodes.find((item) => item.name === 'xpt.field')?.[NOP_REPORT_EXPRESSION_KIND_MARKER]).toBeUndefined();
  });

  it('submit action is the report-designer:updateMeta namespaced action with target binding', () => {
    const nodes = collectNodes(schemas.cell);
    const action = nodes.find(
      (node) => (node.action ?? node.onClick) != null && JSON.stringify(node).includes('updateMeta'),
    );
    expect(action).toBeTruthy();
    const serialized = JSON.stringify(action);
    expect(serialized).toContain('report-designer:updateMeta');
    expect(serialized).toContain('${selectionTarget}');
  });

  it('resolves through resolveInspectorSchemaForTarget via byProfile (and undefined for unconfigured kinds)', () => {
    const config: ReportDesignerConfig = {
      kind: 'nop-report',
      inspector: {
        byProfile: {
          [NOP_REPORT_INSPECTOR_SCHEMA_ID]: {
            cell: schemas.cell,
            sheet: schemas.sheet,
            workbook: schemas.workbook,
          },
        },
      },
    };
    const profile = { id: 'nop-report-default', kind: 'nop-report', fieldSourceIds: [], fieldDropIds: [], inspectorSchemaId: NOP_REPORT_INSPECTOR_SCHEMA_ID };
    expect(resolveInspectorSchemaForTarget({ config, target: { kind: 'cell', cell: { sheetId: 's', address: 'A1', row: 0, col: 0 } }, profile })).toBe(schemas.cell);
    expect(resolveInspectorSchemaForTarget({ config, target: { kind: 'sheet', sheetId: 's' }, profile })).toBe(schemas.sheet);
    expect(resolveInspectorSchemaForTarget({ config, target: { kind: 'workbook' }, profile })).toBe(schemas.workbook);
    // 无 byTarget/body 兜底 → row 无 schema
    expect(resolveInspectorSchemaForTarget({ config, target: { kind: 'row', sheetId: 's', row: 1 }, profile })).toBeUndefined();
  });

  it('buildNopReportMetaPatch maps basic/xpt form values to the metadata patch shape', () => {
    expect(
      buildNopReportMetaPatch({ basic: { value: 'x' }, xpt: { field: 'amount', ds: 'orders' } }),
    ).toEqual({
      basic: { value: 'x' },
      'nop-report': { model: { field: 'amount', ds: 'orders' } },
    });
    expect(buildNopReportMetaPatch({})).toEqual({});
  });
});
