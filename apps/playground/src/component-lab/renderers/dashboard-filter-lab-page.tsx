import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

/**
 * dashboard-filter 编排约定示例（`docs/components/dashboard-filter/design.md`）：
 * 筛选表单 `valuesPath: 'filter'` → 共享 page scope `filter.*` → 消费端
 * data-source 自动重载 → chart/table 联动。
 */
const MOCK_SALES = [
  { region: '华东', month: '01', revenue: 120, orders: 98 },
  { region: '华东', month: '02', revenue: 156, orders: 121 },
  { region: '华东', month: '03', revenue: 140, orders: 110 },
  { region: '华北', month: '01', revenue: 86, orders: 62 },
  { region: '华北', month: '02', revenue: 92, orders: 71 },
  { region: '华北', month: '03', revenue: 104, orders: 80 },
  { region: '华南', month: '01', revenue: 160, orders: 140 },
  { region: '华南', month: '02', revenue: 175, orders: 152 },
  { region: '华南', month: '03', revenue: 168, orders: 149 },
];

function filterSalesByRegion(url: string) {
  const query = new URLSearchParams(url.includes('?') ? url.slice(url.indexOf('?')) : '');
  const region = query.get('region');
  if (!region || region === '') {
    return MOCK_SALES;
  }
  return MOCK_SALES.filter((row) => row.region === region);
}

const dashboardFilterEnv = {
  fetcher: async <T,>(api: { url?: string }) => {
    const url = api.url ?? '';
    if (url.includes('/api/sales')) {
      return { status: 0, data: filterSalesByRegion(url) as T };
    }
    return { status: 0, data: null as T };
  },
};

const dashboardFilterSchema = {
  type: 'page',
  body: [
    {
      type: 'form',
      id: 'dashboard-filter',
      title: '销售看板筛选',
      valuesPath: 'filter',
      data: { region: '华东', period: '2026-01-01,2026-03-31' },
      mode: 'inline',
      body: [
        {
          type: 'select',
          name: 'region',
          label: '区域',
          options: [
            { label: '华东', value: '华东' },
            { label: '华北', value: '华北' },
            { label: '华南', value: '华南' },
          ],
        },
        {
          type: 'date-range',
          name: 'period',
          label: '周期',
          valueFormat: 'YYYY-MM-DD',
          presets: [
            { label: '近7天', value: { relative: 'last7days' } },
            { label: '近30天', value: { relative: 'last30days' } },
            { label: '本月', value: { relative: 'thisMonth' } },
          ],
        },
      ],
    },
    {
      type: 'data-source',
      action: 'ajax',
      args: {
        url: '/api/sales',
        params: {
          region: '${filter?.region}',
          period: '${filter?.period}',
        },
      },
      name: 'sales',
      initialData: [],
    },
    {
      type: 'card',
      title: '营收走势',
      header: [
        {
          type: 'button',
          label: '刷新',
          onClick: { action: 'refreshSource', targetId: 'sales' },
        },
      ],
      body: [
        {
          type: 'chart',
          chartType: 'bar',
          height: 260,
          source: '${sales}',
          xAxis: { dataKey: 'month', label: '月份' },
          series: [{ name: '营收', dataRegionKey: 'revenue' }],
          colors: ['hsl(var(--chart-1))'],
        },
      ],
    },
    {
      type: 'table',
      title: '销售明细',
      source: '${sales}',
      rowKey: 'id',
      columns: [
        { name: 'region', label: '区域' },
        { name: 'month', label: '月份' },
        { name: 'revenue', label: '营收' },
        { name: 'orders', label: '订单数' },
      ],
    },
  ],
};

const statTileSchema = {
  type: 'page',
  body: [
    {
      type: 'form',
      id: 'dashboard-filter',
      title: 'KPI 看板筛选',
      valuesPath: 'filter',
      data: { region: '华东' },
      mode: 'inline',
      body: [
        {
          type: 'select',
          name: 'region',
          label: '区域',
          options: [
            { label: '华东', value: '华东' },
            { label: '华北', value: '华北' },
            { label: '华南', value: '华南' },
          ],
        },
      ],
    },
    {
      type: 'data-source',
      action: 'ajax',
      args: { url: '/api/sales', params: { region: '${filter?.region}' } },
      name: 'sales',
      initialData: [],
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 4,
      body: [
        {
          type: 'stat-tile',
          label: '营收',
          value: '${SUM(ARRAYMAP(sales, item => item.revenue))}',
          prefix: '¥',
          delta: { value: 12.5, label: '同比 +12.5%', direction: 'up' },
          sparkline: '${ARRAYMAP(sales, item => item.revenue)}',
          formatter: { thousands: true, decimals: 0 },
        },
        {
          type: 'stat-tile',
          label: '订单数',
          value: '${SUM(ARRAYMAP(sales, item => item.orders))}',
          delta: { value: -3.2, label: '同比 -3.2%', direction: 'down' },
          sparkline: '${ARRAYMAP(sales, item => item.orders)}',
        },
      ],
    },
  ],
};

export function DashboardFilterLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="dashboard-filter 编排约定：筛选表单通过 valuesPath 把筛选值发布到共享 page scope 的 filter.* 前缀下；消费端 data-source 的 action args 引用 ${filter?.xxx}（null-safe），scope 写入自动触发重载（无需手动 refresh）。"
      scenarios={[
        {
          title: '筛选联动（select + date-range → data-source → chart + table）',
          description:
            '修改筛选表单值（valuesPath: filter）→ 共享 scope 变更 → data-source 自动重载（请求带 region/period 参数）→ chart/table 联动刷新。面板 header 的"刷新"按钮经 refreshSource 手动重载（携带当前筛选参数）。切换区域观察图表与表格变化。',
          schema: dashboardFilterSchema,
          data: {},
          env: dashboardFilterEnv,
        },
        {
          title: 'KPI stat-tile 联动',
          description:
            'stat-tile 消费同一 data-source 的聚合值（SUM/ARRAYMAP 表达式）+ sparkline 迷你趋势。',
          schema: statTileSchema,
          data: {},
          env: dashboardFilterEnv,
        },
      ]}
    />
  );
}
