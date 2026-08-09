import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, cn } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import { registerPivotRenderers } from '@nop-chaos/flux-renderers-pivot';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerContentRenderers } from '@nop-chaos/flux-renderers-content';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { ArrowLeft, Moon, Sun } from 'lucide-react';

interface PivotTableDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerContentRenderers(registry);
registerPivotRenderers(registry);
const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>(_req: { url: string }) {
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, msg) => console.log(`[${level}] ${msg}`),
};

const SALES_RECORDS = [
  { region: 'North', quarter: 'Q1', category: 'Electronics', sales: 1200, profit: 240 },
  { region: 'North', quarter: 'Q1', category: 'Furniture', sales: 800, profit: 160 },
  { region: 'North', quarter: 'Q2', category: 'Electronics', sales: 1500, profit: 300 },
  { region: 'North', quarter: 'Q2', category: 'Furniture', sales: 900, profit: 135 },
  { region: 'North', quarter: 'Q3', category: 'Electronics', sales: 1350, profit: 270 },
  { region: 'North', quarter: 'Q3', category: 'Furniture', sales: 1100, profit: 220 },
  { region: 'South', quarter: 'Q1', category: 'Electronics', sales: 900, profit: 135 },
  { region: 'South', quarter: 'Q1', category: 'Furniture', sales: 700, profit: 140 },
  { region: 'South', quarter: 'Q2', category: 'Electronics', sales: 1100, profit: 220 },
  { region: 'South', quarter: 'Q2', category: 'Furniture', sales: 850, profit: 170 },
  { region: 'South', quarter: 'Q3', category: 'Electronics', sales: 1000, profit: 150 },
  { region: 'South', quarter: 'Q3', category: 'Furniture', sales: 950, profit: 190 },
  { region: 'East', quarter: 'Q1', category: 'Electronics', sales: 1600, profit: 320 },
  { region: 'East', quarter: 'Q1', category: 'Furniture', sales: 1200, profit: 180 },
  { region: 'East', quarter: 'Q2', category: 'Electronics', sales: 1400, profit: 280 },
  { region: 'East', quarter: 'Q2', category: 'Furniture', sales: 1300, profit: 260 },
  { region: 'East', quarter: 'Q3', category: 'Electronics', sales: 1800, profit: 360 },
  { region: 'East', quarter: 'Q3', category: 'Furniture', sales: 1050, profit: 210 },
  { region: 'West', quarter: 'Q1', category: 'Electronics', sales: 950, profit: 190 },
  { region: 'West', quarter: 'Q1', category: 'Furniture', sales: 600, profit: 90 },
  { region: 'West', quarter: 'Q2', category: 'Electronics', sales: 1150, profit: 230 },
  { region: 'West', quarter: 'Q2', category: 'Furniture', sales: 750, profit: 150 },
  { region: 'West', quarter: 'Q3', category: 'Electronics', sales: 1250, profit: 187.5 },
  { region: 'West', quarter: 'Q3', category: 'Furniture', sales: 820, profit: 164 },
];

const PIVOT_SCHEMA = {
  type: 'pivot-table',
  id: 'demoSalesPivot',
  label: '销售透视（region×quarter 行 / category 列）',
  records: SALES_RECORDS,
  rowDimensions: [
    { dimensionKey: 'region', title: '地区' },
    { dimensionKey: 'quarter', title: '季度' },
  ],
  columnDimensions: [{ dimensionKey: 'category', title: '品类' }],
  indicators: [
    { field: 'sales', title: '销售额', aggregationType: 'SUM', cellType: 'text' },
    { field: 'profit', title: '利润', aggregationType: 'SUM', cellType: 'text' },
  ],
  dataConfig: {
    totals: {
      row: {
        showGrandTotals: true,
        showSubTotals: true,
        subTotalsDimensions: ['region', 'quarter'],
        grandTotalLabel: '总计',
        subTotalLabel: '小计',
      },
      column: {
        showGrandTotals: true,
        showSubTotals: false,
        grandTotalLabel: '合计',
      },
    },
    sortRules: [{ field: 'sales', sortType: 'DESC' }],
    filterRules: [{ field: 'sales', operator: '>', value: 500 }],
  },
  cornerTitleOnDimension: 'all',
  height: 420,
} as const;

const EMPTY_SCHEMA = {
  type: 'pivot-table',
  id: 'demoEmptyPivot',
  label: '空数据',
  records: [],
  rowDimensions: ['region'],
  columnDimensions: ['category'],
  indicators: [{ field: 'sales', title: '销售额', aggregationType: 'SUM' }],
  empty: '暂无销售数据',
  height: 200,
} as const;

const FILTERED_SCHEMA = {
  type: 'pivot-table',
  id: 'demoFilteredPivot',
  label: '仅 Electronics（filterRules IN）',
  records: SALES_RECORDS,
  rowDimensions: ['region'],
  columnDimensions: ['category'],
  indicators: [
    { field: 'sales', title: '销售额', aggregationType: 'SUM' },
    { field: 'profit', title: '利润', aggregationType: 'AVG', cellType: 'progressbar' },
  ],
  dataConfig: {
    filterRules: [{ field: 'category', operator: 'IN', value: ['Electronics'] }],
  },
  height: 260,
} as const;

function DemoSchemaCard(props: {
  title: string;
  description: string;
  schema: unknown;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col', props.className)}>
      <CardHeader>
        <h2 className="text-sm font-medium">{props.title}</h2>
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </CardHeader>
      <CardContent className="min-h-40 flex-1">
        <SchemaRenderer
          schemaUrl={`pivot://demo-${props.title}`}
          schema={props.schema as never}
          registry={registry as never}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </CardContent>
    </Card>
  );
}

export function PivotTableDemoPage({ onBack }: PivotTableDemoPageProps) {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false,
  );

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Pivot Table Demo（VTable PivotTable）</h1>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={toggleTheme}>
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="ml-1">{dark ? '亮色' : '暗色'}</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <DemoSchemaCard
            title="Sales Pivot"
            description="region×quarter 行、category 列、sales/profit 指标、行小计总计 + 列总计、sales DESC 排序、sales>500 过滤、cornerTitleOnDimension=all"
            schema={PIVOT_SCHEMA}
          />
          <DemoSchemaCard
            title="Filtered"
            description="filterRules IN 仅 Electronics + AVG progressbar 指标（cellType progressbar）"
            schema={FILTERED_SCHEMA}
          />
          <DemoSchemaCard
            title="Empty"
            description="records 为空 → empty slot（缺省 noData）"
            schema={EMPTY_SCHEMA}
          />
        </div>
      </div>
    </div>
  );
}
