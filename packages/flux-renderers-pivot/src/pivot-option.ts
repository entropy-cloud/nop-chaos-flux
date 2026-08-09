import type {
  AggregationRule,
  AggregationType,
  FilterRules,
  IColumnDimension,
  IIndicator,
  IRowDimension,
  PartialTableThemeDefine,
  PivotTableConstructorOptions,
  ShowColumnRowType,
  SortRule,
  SortType,
  Totals,
} from '@visactor/vtable/es/ts-types';
import type {
  PivotAggregationType,
  PivotDimension,
  PivotFilterRuleSchema,
  PivotIndicatorSchema,
  PivotSortRuleSchema,
  PivotTableSchema,
  PivotTotalsSchema,
} from './schemas.js';

const VALID_AGGREGATION_TYPES: readonly PivotAggregationType[] = [
  'SUM',
  'AVG',
  'COUNT',
  'MIN',
  'MAX',
  'NONE',
];

const FALLBACK_THEME_TOKENS: Required<DesignTokenThemeInput> = {
  background: '#ffffff',
  foreground: '#1f2328',
  border: '#d0d7de',
  primary: '#0969da',
};

function devWarn(message: string): void {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[pivot-table] ${message}`);
  }
}

export interface DesignTokenThemeInput {
  background?: string;
  foreground?: string;
  border?: string;
  primary?: string;
}

export interface NormalizedIndicator {
  indicator: IIndicator;
  aggregationType: PivotAggregationType;
}

function normalizeDimension(value: PivotDimension): IRowDimension | IColumnDimension | null {
  if (typeof value === 'string') {
    if (value.length === 0) {
      devWarn(`dimension 字符串为空，已跳过`);
      return null;
    }
    return {
      dimensionKey: value,
      title: value,
      headerType: 'text',
    };
  }
  if (value && typeof value === 'object') {
    const dimensionKey = value.dimensionKey;
    if (typeof dimensionKey !== 'string' || dimensionKey.length === 0) {
      devWarn(`dimension 对象缺少合法 dimensionKey，已跳过`);
      return null;
    }
    return {
      dimensionKey,
      title: value.title ?? dimensionKey,
      headerType: 'text',
      ...(value.headerStyle ? { headerStyle: value.headerStyle } : {}),
    };
  }
  devWarn(`dimension 条目非法（非字符串/非对象），已跳过`);
  return null;
}

function normalizeIndicators(indicators: PivotIndicatorSchema[] | undefined): NormalizedIndicator[] {
  if (!Array.isArray(indicators)) {
    return [];
  }
  const normalized: NormalizedIndicator[] = [];
  for (const entry of indicators) {
    if (!entry || typeof entry !== 'object') {
      devWarn(`indicator 条目非法（非对象），已跳过`);
      continue;
    }
    const field = entry.field;
    if (typeof field !== 'string' || field.length === 0) {
      devWarn(`indicator 缺少合法 field，已跳过`);
      continue;
    }
    let aggregationType: PivotAggregationType = 'SUM';
    if (entry.aggregationType === undefined) {
      aggregationType = 'SUM';
    } else if ((VALID_AGGREGATION_TYPES as readonly string[]).includes(entry.aggregationType)) {
      aggregationType = entry.aggregationType;
    } else {
      devWarn(`indicator "${field}" aggregationType "${String(entry.aggregationType)}" 非法，降级 NONE`);
      aggregationType = 'NONE';
    }
    const cellType = entry.cellType === 'progressbar' || entry.cellType === 'sparkline' ? entry.cellType : 'text';
    const indicator: IIndicator = {
      indicatorKey: field,
      title: entry.title ?? field,
      headerType: 'text',
      cellType,
    } as IIndicator;
    normalized.push({ indicator, aggregationType });
  }
  return normalized;
}

function buildAggregationRules(
  normalized: NormalizedIndicator[],
): AggregationRule<AggregationType>[] {
  return normalized.map(({ indicator, aggregationType }) => {
    const field = (indicator as { indicatorKey?: string }).indicatorKey;
    return {
      indicatorKey: field ?? '',
      field: field ?? '',
      aggregationType,
    } as AggregationRule<AggregationType>;
  });
}

function normalizeTotalsSide(side: PivotTotalsSchema | undefined): Totals['row'] | undefined {
  if (!side) {
    return undefined;
  }
  const result: Totals['row'] = {
    showGrandTotals: side.showGrandTotals === true,
    showSubTotals: side.showSubTotals === true,
  };
  if (Array.isArray(side.subTotalsDimensions)) {
    result.subTotalsDimensions = side.subTotalsDimensions;
  }
  if (typeof side.grandTotalLabel === 'string') {
    result.grandTotalLabel = side.grandTotalLabel;
  }
  if (typeof side.subTotalLabel === 'string') {
    result.subTotalLabel = side.subTotalLabel;
  }
  return result;
}

function buildTotals(schema: PivotOptionInput): Totals | undefined {
  const totals = schema.dataConfig?.totals;
  if (!totals) {
    return undefined;
  }
  const row = normalizeTotalsSide(totals.row);
  const column = normalizeTotalsSide(totals.column);
  if (!row && !column) {
    return undefined;
  }
  return {
    ...(row ? { row } : {}),
    ...(column ? { column } : {}),
  };
}

function normalizeSortRules(rules: PivotSortRuleSchema[] | undefined): SortRule[] {
  if (!Array.isArray(rules)) {
    return [];
  }
  const result: SortRule[] = [];
  for (const rule of rules) {
    if (!rule || typeof rule.field !== 'string' || rule.field.length === 0) {
      devWarn(`sortRule 缺少合法 field，已跳过`);
      continue;
    }
    let sortType: SortType;
    if (rule.sortType === 'DESC') {
      sortType = 'DESC' as SortType;
    } else if (rule.sortType === 'ASC') {
      sortType = 'ASC' as SortType;
    } else {
      if (rule.sortType !== undefined) {
        devWarn(`sortRule "${rule.field}" sortType "${String(rule.sortType)}" 非法，降级 ASC`);
      }
      sortType = 'ASC' as SortType;
    }
    result.push({ sortField: rule.field, sortType });
  }
  return result;
}

function buildFilterPredicate(rule: PivotFilterRuleSchema): ((row: Record<string, unknown>) => boolean) | null {
  const { field, operator, value } = rule;
  switch (operator) {
    case '=':
      return (row) => row[field] === value;
    case '!=':
      return (row) => row[field] !== value;
    case '>':
      return (row) => (row[field] as number) > (value as number);
    case '>=':
      return (row) => (row[field] as number) >= (value as number);
    case '<':
      return (row) => (row[field] as number) < (value as number);
    case '<=':
      return (row) => (row[field] as number) <= (value as number);
    case 'IN':
      return (row) => Array.isArray(value) && (value as unknown[]).includes(row[field]);
    case 'NOT_IN':
      return (row) => Array.isArray(value) && !(value as unknown[]).includes(row[field]);
    case 'LIKE':
      return (row) => String(row[field] ?? '').includes(String(value));
    default:
      return null;
  }
}

function normalizeFilterRules(rules: PivotFilterRuleSchema[] | undefined): FilterRules {
  if (!Array.isArray(rules)) {
    return [];
  }
  const result: FilterRules = [];
  for (const rule of rules) {
    if (!rule || typeof rule.field !== 'string' || rule.field.length === 0) {
      devWarn(`filterRule 缺少合法 field，已跳过`);
      continue;
    }
    const predicate = buildFilterPredicate(rule);
    if (!predicate) {
      devWarn(`filterRule "${rule.field}" operator "${String(rule.operator)}" 非法，已跳过`);
      continue;
    }
    result.push({ filterFunc: predicate });
  }
  return result;
}

function normalizeCorner(schema: PivotOptionInput): { titleOnDimension: ShowColumnRowType } | undefined {
  const value = schema.cornerTitleOnDimension;
  if (value === undefined) {
    return undefined;
  }
  if (value === 'row' || value === 'column' || value === 'none' || value === 'all') {
    return { titleOnDimension: value as ShowColumnRowType };
  }
  devWarn(`cornerTitleOnDimension "${String(value)}" 非法，忽略`);
  return undefined;
}

/** buildPivotOption 所需的 schema 面（与 RendererResolvedProps 兼容，type 可选）。 */
export type PivotOptionInput = Pick<
  PivotTableSchema,
  'indicators' | 'rowDimensions' | 'columnDimensions' | 'dataConfig' | 'cornerTitleOnDimension'
>;

export function buildPivotOption(
  schema: PivotOptionInput,
  records: unknown,
): PivotTableConstructorOptions | null {
  const normalizedIndicators = normalizeIndicators(schema.indicators);
  if (normalizedIndicators.length === 0) {
    devWarn('未配置任何合法 indicators，渲染空态');
    return null;
  }

  const rows: IRowDimension[] = [];
  const columns: IColumnDimension[] = [];
  if (Array.isArray(schema.rowDimensions)) {
    for (const dim of schema.rowDimensions) {
      const normalized = normalizeDimension(dim);
      if (normalized) {
        rows.push(normalized as IRowDimension);
      }
    }
  }
  if (Array.isArray(schema.columnDimensions)) {
    for (const dim of schema.columnDimensions) {
      const normalized = normalizeDimension(dim);
      if (normalized) {
        columns.push(normalized as IColumnDimension);
      }
    }
  }

  const dataConfig: PivotTableConstructorOptions['dataConfig'] = {};
  const aggregationRules = buildAggregationRules(normalizedIndicators);
  if (aggregationRules.length > 0) {
    dataConfig.aggregationRules = aggregationRules;
  }
  const totals = buildTotals(schema);
  if (totals) {
    dataConfig.totals = totals;
  }
  const sortRules = normalizeSortRules(schema.dataConfig?.sortRules);
  if (sortRules.length > 0) {
    dataConfig.sortRules = sortRules;
  }
  const filterRules = normalizeFilterRules(schema.dataConfig?.filterRules);
  if (filterRules.length > 0) {
    dataConfig.filterRules = filterRules;
  }

  const corner = normalizeCorner(schema);

  return {
    records: Array.isArray(records) ? records : [],
    rows,
    columns,
    indicators: normalizedIndicators.map(({ indicator }) => indicator),
    ...(corner ? { corner } : {}),
    ...(Object.keys(dataConfig).length > 0 ? { dataConfig } : {}),
  };
}

/** 读取 flux design token（CSS 变量）→ 解析为色值；缺 document 或变量缺失时回退默认（LIGHT 语义）。 */
export function resolveDesignTokens(): DesignTokenThemeInput {
  if (typeof document === 'undefined') {
    return { ...FALLBACK_THEME_TOKENS };
  }
  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  probe.style.left = '-9999px';
  probe.style.border = '1px solid var(--border)';
  probe.style.background = 'var(--background)';
  probe.style.color = 'var(--foreground)';
  document.body.appendChild(probe);
  try {
    const computed = getComputedStyle(probe);
    const border = computed.borderColor;
    const background = computed.backgroundColor;
    const foreground = computed.color;
    const isResolved = (value: string) =>
      value.length > 0 && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent' && value !== 'initial';
    return {
      background: isResolved(background) ? background : FALLBACK_THEME_TOKENS.background,
      foreground: isResolved(foreground) ? foreground : FALLBACK_THEME_TOKENS.foreground,
      border: isResolved(border) ? border : FALLBACK_THEME_TOKENS.border,
    };
  } catch {
    return { ...FALLBACK_THEME_TOKENS };
  } finally {
    probe.remove();
  }
}

/** design token → VTable theme 映射（纯函数；缺失字段回退默认色）。 */
export function mapDesignTokensToVTableTheme(tokens: DesignTokenThemeInput): PartialTableThemeDefine {
  const background = tokens.background ?? FALLBACK_THEME_TOKENS.background;
  const foreground = tokens.foreground ?? FALLBACK_THEME_TOKENS.foreground;
  const border = tokens.border ?? FALLBACK_THEME_TOKENS.border;
  const style = { bgColor: background, color: foreground, borderColor: border };
  return {
    underlayBackgroundColor: background,
    defaultStyle: style,
    headerStyle: style,
    rowHeaderStyle: style,
    bodyStyle: style,
    frameStyle: { borderColor: border },
  };
}

/**
 * schema `theme` 覆盖合并：按 key 覆盖，section 级对象（defaultStyle/headerStyle/bodyStyle/
 * frameStyle 等）深合并一层——覆盖指定键而保留映射层其余键（VTable 内部同样按 section 合并）。
 */
export function mergeThemeOverrides(
  base: PartialTableThemeDefine,
  overrides: Record<string, unknown>,
): PartialTableThemeDefine {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = merged[key];
    if (
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      merged[key] = { ...baseValue, ...(value as Record<string, unknown>) };
    } else {
      merged[key] = value;
    }
  }
  return merged as PartialTableThemeDefine;
}
