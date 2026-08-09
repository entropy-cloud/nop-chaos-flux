import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildPivotOption,
  mapDesignTokensToVTableTheme,
  resolveDesignTokens,
  type DesignTokenThemeInput,
} from './pivot-option.js';
import type { PivotTableSchema } from './schemas.js';

afterEach(() => {
  vi.restoreAllMocks();
});

function makeSchema(overrides: Partial<PivotTableSchema> = {}): PivotTableSchema {
  return {
    type: 'pivot-table',
    rowDimensions: ['region'],
    columnDimensions: ['category'],
    indicators: [{ field: 'sales' }],
    records: [
      { region: 'North', category: 'A', sales: 10 },
      { region: 'North', category: 'B', sales: 20 },
      { region: 'South', category: 'A', sales: 30 },
    ],
    ...overrides,
  } as PivotTableSchema;
}

describe('buildPivotOption - 三要素映射', () => {
  it('字符串维度归一化为 dimensionKey/title/headerType', () => {
    const option = buildPivotOption(makeSchema(), undefined);
    expect(option).not.toBeNull();
    expect(option!.rows).toEqual([
      { dimensionKey: 'region', title: 'region', headerType: 'text' },
    ]);
    expect(option!.columns).toEqual([
      { dimensionKey: 'category', title: 'category', headerType: 'text' },
    ]);
  });

  it('对象维度保留 title/headerStyle 并归一化 headerType', () => {
    const option = buildPivotOption(
      makeSchema({
        rowDimensions: [{ dimensionKey: 'region', title: '地区', headerStyle: { fontSize: 12 } }],
        columnDimensions: ['category'],
      }),
      undefined,
    );
    expect(option!.rows).toEqual([
      {
        dimensionKey: 'region',
        title: '地区',
        headerType: 'text',
        headerStyle: { fontSize: 12 },
      },
    ]);
  });

  it('indicator 映射为 indicatorKey/title/cellType，缺省 text', () => {
    const option = buildPivotOption(
      makeSchema({
        indicators: [
          { field: 'sales', title: '销售额' },
          { field: 'profit', aggregationType: 'AVG', cellType: 'progressbar' },
          { field: 'trend', cellType: 'sparkline' },
        ],
      }),
      undefined,
    );
    expect(option!.indicators).toEqual([
      { indicatorKey: 'sales', title: '销售额', headerType: 'text', cellType: 'text' },
      {
        indicatorKey: 'profit',
        title: 'profit',
        headerType: 'text',
        cellType: 'progressbar',
      },
      { indicatorKey: 'trend', title: 'trend', headerType: 'text', cellType: 'sparkline' },
    ]);
  });

  it('records 透传到 option.records', () => {
    const records = [{ region: 'North', category: 'A', sales: 10 }];
    const option = buildPivotOption(makeSchema(), records);
    expect(option!.records).toBe(records);
  });
});

describe('buildPivotOption - aggregationRules 映射', () => {
  it.each([
    ['SUM', 'SUM'],
    ['AVG', 'AVG'],
    ['COUNT', 'COUNT'],
    ['MIN', 'MIN'],
    ['MAX', 'MAX'],
    ['NONE', 'NONE'],
  ] as const)('aggregationType %s → aggregationRules aggregationType %s', (schemaType, vtableType) => {
    const option = buildPivotOption(
      makeSchema({ indicators: [{ field: 'sales', aggregationType: schemaType }] }),
      undefined,
    );
    expect(option!.dataConfig?.aggregationRules).toEqual([
      { indicatorKey: 'sales', field: 'sales', aggregationType: vtableType },
    ]);
  });

  it('未声明 aggregationType 缺省按 VTable sum 语义（SUM）', () => {
    const option = buildPivotOption(makeSchema({ indicators: [{ field: 'sales' }] }), undefined);
    expect(option!.dataConfig?.aggregationRules).toEqual([
      { indicatorKey: 'sales', field: 'sales', aggregationType: 'SUM' },
    ]);
  });

  it('非法 aggregationType → dev warn + NONE 降级', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const option = buildPivotOption(
      makeSchema({ indicators: [{ field: 'sales', aggregationType: 'TOTAL' as never }] }),
      undefined,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(option!.dataConfig?.aggregationRules).toEqual([
      { indicatorKey: 'sales', field: 'sales', aggregationType: 'NONE' },
    ]);
  });
});

describe('buildPivotOption - totals 映射', () => {
  it('row/column 小计总计逐字段断言', () => {
    const option = buildPivotOption(
      makeSchema({
        dataConfig: {
          totals: {
            row: {
              showGrandTotals: true,
              showSubTotals: true,
              subTotalsDimensions: ['region'],
              grandTotalLabel: '合计',
              subTotalLabel: '小计',
            },
            column: {
              showGrandTotals: false,
              showSubTotals: true,
              subTotalsDimensions: ['category'],
              grandTotalLabel: 'Total',
              subTotalLabel: 'Sub',
            },
          },
        },
      }),
      undefined,
    );
    expect(option!.dataConfig?.totals).toEqual({
      row: {
        showGrandTotals: true,
        showSubTotals: true,
        subTotalsDimensions: ['region'],
        grandTotalLabel: '合计',
        subTotalLabel: '小计',
      },
      column: {
        showGrandTotals: false,
        showSubTotals: true,
        subTotalsDimensions: ['category'],
        grandTotalLabel: 'Total',
        subTotalLabel: 'Sub',
      },
    });
  });

  it('未声明 show 标志时缺省 false（fail-closed），可选 label 缺省不输出', () => {
    const option = buildPivotOption(
      makeSchema({
        dataConfig: { totals: { row: { showGrandTotals: true } } },
      }),
      undefined,
    );
    expect(option!.dataConfig?.totals).toEqual({
      row: { showGrandTotals: true, showSubTotals: false },
    });
    expect(option!.dataConfig?.totals?.column).toBeUndefined();
  });

  it('无 totals 配置时不输出 dataConfig.totals', () => {
    const option = buildPivotOption(makeSchema(), undefined);
    expect(option!.dataConfig?.totals).toBeUndefined();
  });
});

describe('buildPivotOption - corner 映射', () => {
  it.each([
    ['row', 'row'],
    ['column', 'column'],
    ['none', 'none'],
    ['all', 'all'],
  ] as const)('cornerTitleOnDimension %s → corner.titleOnDimension', (schemaValue, vtableValue) => {
    const option = buildPivotOption(makeSchema({ cornerTitleOnDimension: schemaValue }), undefined);
    expect(option!.corner?.titleOnDimension).toBe(vtableValue);
  });

  it('未声明 cornerTitleOnDimension 时不输出 corner', () => {
    const option = buildPivotOption(makeSchema(), undefined);
    expect(option!.corner).toBeUndefined();
  });
});

describe('buildPivotOption - sortRules 映射', () => {
  it('field/sortType → sortField/sortType，缺省 ASC', () => {
    const option = buildPivotOption(
      makeSchema({
        dataConfig: {
          sortRules: [
            { field: 'region', sortType: 'DESC' },
            { field: 'sales' },
          ],
        },
      }),
      undefined,
    );
    expect(option!.dataConfig?.sortRules).toEqual([
      { sortField: 'region', sortType: 'DESC' },
      { sortField: 'sales', sortType: 'ASC' },
    ]);
  });

  it('非法 sortType → dev warn + ASC；缺 field → dev warn + 跳过', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const option = buildPivotOption(
      makeSchema({
        dataConfig: {
          sortRules: [
            { field: 'region', sortType: 'UP' as never },
            { field: '' },
            { field: 'sales', sortType: 'DESC' },
          ],
        },
      }),
      undefined,
    );
    expect(warn).toHaveBeenCalledTimes(2);
    expect(option!.dataConfig?.sortRules).toEqual([
      { sortField: 'region', sortType: 'ASC' },
      { sortField: 'sales', sortType: 'DESC' },
    ]);
  });
});

describe('buildPivotOption - filterRules 声明式子集映射', () => {
  it('operator 生成对应 filterFunc 谓词', () => {
    const option = buildPivotOption(
      makeSchema({
        dataConfig: {
          filterRules: [
            { field: 'region', operator: '=', value: 'North' },
            { field: 'sales', operator: '>', value: 15 },
            { field: 'category', operator: 'IN', value: ['A', 'C'] },
            { field: 'note', operator: 'LIKE', value: 'x' },
          ],
        },
      }),
      undefined,
    );
    const filters = option!.dataConfig?.filterRules;
    expect(filters).toHaveLength(4);
    expect(filters![0]).toEqual({ filterFunc: expect.any(Function) });
    const [eq, gt, inRule, like] = filters as Array<{ filterFunc: (row: Record<string, unknown>) => boolean }>;
    expect(eq.filterFunc({ region: 'North', sales: 1 })).toBe(true);
    expect(eq.filterFunc({ region: 'South', sales: 1 })).toBe(false);
    expect(gt.filterFunc({ sales: 20 })).toBe(true);
    expect(gt.filterFunc({ sales: 10 })).toBe(false);
    expect(inRule.filterFunc({ category: 'C' })).toBe(true);
    expect(inRule.filterFunc({ category: 'B' })).toBe(false);
    expect(like.filterFunc({ note: 'prefix-x-suffix' })).toBe(true);
    expect(like.filterFunc({ note: 'other' })).toBe(false);
  });

  it('!=/>=/<=/NOT_IN 谓词语义', () => {
    const option = buildPivotOption(
      makeSchema({
        dataConfig: {
          filterRules: [
            { field: 'a', operator: '!=', value: 1 },
            { field: 'b', operator: '>=', value: 5 },
            { field: 'c', operator: '<=', value: 5 },
            { field: 'd', operator: 'NOT_IN', value: [1, 2] },
          ],
        },
      }),
      undefined,
    );
    const filters = option!.dataConfig?.filterRules as Array<{
      filterFunc: (row: Record<string, unknown>) => boolean;
    }>;
    expect(filters[0].filterFunc({ a: 2 })).toBe(true);
    expect(filters[0].filterFunc({ a: 1 })).toBe(false);
    expect(filters[1].filterFunc({ b: 5 })).toBe(true);
    expect(filters[1].filterFunc({ b: 4 })).toBe(false);
    expect(filters[2].filterFunc({ c: 5 })).toBe(true);
    expect(filters[2].filterFunc({ c: 6 })).toBe(false);
    expect(filters[3].filterFunc({ d: 3 })).toBe(true);
    expect(filters[3].filterFunc({ d: 1 })).toBe(false);
  });

  it('非法 operator / 缺 field → dev warn + 跳过', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const option = buildPivotOption(
      makeSchema({
        dataConfig: {
          filterRules: [
            { field: 'a', operator: '~~' as never, value: 1 },
            { field: '', operator: '=', value: 1 },
            { field: 'b', operator: '=', value: 2 },
          ],
        },
      }),
      undefined,
    );
    expect(warn).toHaveBeenCalledTimes(2);
    expect(option!.dataConfig?.filterRules).toHaveLength(1);
  });
});

describe('buildPivotOption - 降级路径', () => {
  it('无任何合法 indicators → 返回 null（走 empty 态）', () => {
    const option = buildPivotOption(makeSchema({ indicators: [] }), undefined);
    expect(option).toBeNull();
    const option2 = buildPivotOption(makeSchema({ indicators: [{ field: '' }] }), undefined);
    expect(option2).toBeNull();
  });

  it('合法 indicator 混入非法项 → 跳过非法项 + dev warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const option = buildPivotOption(
      makeSchema({ indicators: [{ field: '' }, { field: 'sales' }] }),
      undefined,
    );
    expect(warn).toHaveBeenCalled();
    expect(option!.indicators).toEqual([
      { indicatorKey: 'sales', title: 'sales', headerType: 'text', cellType: 'text' },
    ]);
  });

  it('非法维度条目（非字符串/缺 dimensionKey）→ dev warn + 跳过', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const option = buildPivotOption(
      makeSchema({
        rowDimensions: [
          { dimensionKey: '' },
          42 as never,
          { title: 'no-key' } as never,
          'region',
        ],
      }),
      undefined,
    );
    expect(warn).toHaveBeenCalledTimes(3);
    expect(option!.rows).toEqual([
      { dimensionKey: 'region', title: 'region', headerType: 'text' },
    ]);
  });

  it('空维度数组 → rows/columns 空数组（不抛错）', () => {
    const option = buildPivotOption(
      makeSchema({ rowDimensions: [], columnDimensions: [] }),
      undefined,
    );
    expect(option).not.toBeNull();
    expect(option!.rows).toEqual([]);
    expect(option!.columns).toEqual([]);
  });
});

describe('mapDesignTokensToVTableTheme', () => {
  it('token → VTable theme 结构（default/header/body/frame）', () => {
    const tokens: DesignTokenThemeInput = {
      background: '#ffffff',
      foreground: '#1f2328',
      border: '#d0d7de',
      primary: '#0969da',
    };
    const theme = mapDesignTokensToVTableTheme(tokens);
    expect(theme.underlayBackgroundColor).toBe('#ffffff');
    expect(theme.defaultStyle).toEqual({
      bgColor: '#ffffff',
      color: '#1f2328',
      borderColor: '#d0d7de',
    });
    expect(theme.headerStyle).toEqual({
      bgColor: '#ffffff',
      color: '#1f2328',
      borderColor: '#d0d7de',
    });
    expect(theme.bodyStyle).toEqual({
      bgColor: '#ffffff',
      color: '#1f2328',
      borderColor: '#d0d7de',
    });
    expect(theme.frameStyle?.borderColor).toBe('#d0d7de');
  });

  it('缺失 token → 回退默认色（LIGHT 语义）', () => {
    const theme = mapDesignTokensToVTableTheme({});
    expect(theme.defaultStyle?.bgColor).toBe('#ffffff');
    expect(theme.defaultStyle?.color).toBe('#1f2328');
    expect(theme.defaultStyle?.borderColor).toBe('#d0d7de');
  });

  it('resolveDesignTokens 在无 document 环境回退默认值', () => {
    expect(resolveDesignTokens()).toEqual({
      background: '#ffffff',
      foreground: '#1f2328',
      border: '#d0d7de',
    });
  });
});
