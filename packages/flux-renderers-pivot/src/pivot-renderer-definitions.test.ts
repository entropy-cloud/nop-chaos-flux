import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { validateSchema } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { registerPivotRenderers } from './index.js';
import exampleJson from '../../../docs/components/pivot-table/example.json';

function validate(schema: unknown) {
  const registry = createRendererRegistry();
  registerPivotRenderers(registry);
  return validateSchema({
    schema: schema as never,
    registry,
    expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
  });
}

const VALID_SCHEMA = {
  type: 'pivot-table',
  records: [
    { region: 'North', category: 'A', sales: 10 },
    { region: 'North', category: 'B', sales: 20 },
  ],
  rowDimensions: [
    'region',
    { dimensionKey: 'quarter', title: '季度', headerStyle: { fontSize: 12 } },
  ],
  columnDimensions: [{ dimensionKey: 'category', title: '品类' }],
  indicators: [
    { field: 'sales', title: '销售额', aggregationType: 'SUM', cellType: 'text' },
    { field: 'profit', aggregationType: 'AVG', cellType: 'progressbar' },
  ],
  dataConfig: {
    totals: {
      row: { showGrandTotals: true, showSubTotals: true, subTotalsDimensions: ['region'] },
    },
    sortRules: [{ field: 'sales', sortType: 'DESC' }],
    filterRules: [{ field: 'sales', operator: '>', value: 100 }],
  },
  cornerTitleOnDimension: 'all',
  height: 420,
  loading: false,
  empty: '暂无数据',
};

describe('pivot renderer definitions - schema validation', () => {
  it('合法 schema（可选字段省略形态）零 diagnostics（propContracts optional 契约）', () => {
    const diagnostics = validate(VALID_SCHEMA);
    expect(diagnostics).toEqual([]);
  });

  it('非法 aggregationType / cellType / corner 值 → diagnostics 而非抛错', () => {
    const diagnostics = validate({
      ...VALID_SCHEMA,
      indicators: [{ field: 'sales', aggregationType: 'TOTAL' }],
      cornerTitleOnDimension: 'sideways',
    });
    const messages = diagnostics.map((d) => d.message);
    expect(messages.some((m) => m.includes('aggregationType'))).toBe(true);
    expect(messages.some((m) => m.includes('cornerTitleOnDimension'))).toBe(true);
  });

  it('缺 indicator field / 空 dimensionKey → diagnostics', () => {
    const diagnostics = validate({
      ...VALID_SCHEMA,
      indicators: [{ title: 'no field' }, { field: 'sales' }],
      rowDimensions: ['', { title: 'no key' }],
    });
    const messages = diagnostics.map((d) => d.message);
    expect(messages.some((m) => m.includes('non-empty field'))).toBe(true);
    expect(messages.some((m) => m.includes('non-empty dimensionKey'))).toBe(true);
  });

  it('docs/components/pivot-table/example.json 零 diagnostics', () => {
    expect(validate(exampleJson)).toEqual([]);
  });
});
