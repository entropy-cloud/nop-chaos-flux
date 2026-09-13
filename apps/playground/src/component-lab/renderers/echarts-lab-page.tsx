import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const monthRows = [
  { month: 'Jan', revenue: 4200, expenses: 2800 },
  { month: 'Feb', revenue: 5100, expenses: 3100 },
  { month: 'Mar', revenue: 4800, expenses: 2600 },
];

const altMonthRows = [
  { month: 'Apr', revenue: 6200, expenses: 3400 },
  { month: 'May', revenue: 5700, expenses: 3000 },
  { month: 'Jun', revenue: 6800, expenses: 3700 },
];

const datasetBarChart = {
  type: 'page',
  body: [
    {
      type: 'button',
      label: 'Load Apr–Jun batch',
      variant: 'outline',
      onClick: {
        action: 'setValue',
        args: { path: 'monthRows', value: altMonthRows },
      },
    },
    {
      type: 'echarts',
      height: 360,
      dataset: { source: '${monthRows}', dimensions: ['month', 'revenue', 'expenses'] },
      option: {
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0 },
        xAxis: { type: 'category' },
        yAxis: { type: 'value' },
        series: [
          { type: 'bar', name: 'Revenue', encode: { x: 'month', y: 'revenue' } },
          { type: 'bar', name: 'Expenses', encode: { x: 'month', y: 'expenses' } },
        ],
      },
    },
  ],
};

const datasetLineChart = {
  type: 'echarts',
  renderer: 'svg',
  height: 320,
  dataset: { source: '${monthRows}', dimensions: ['month', 'revenue'] },
  option: {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category' },
    yAxis: { type: 'value' },
    series: [{ type: 'line', smooth: true, areaStyle: {}, encode: { x: 'month', y: 'revenue' } }],
  },
};

const clickEventChart = {
  type: 'echarts',
  height: 320,
  dataset: { source: '${monthRows}', dimensions: ['month', 'revenue'] },
  option: {
    tooltip: {},
    xAxis: { type: 'category' },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', encode: { x: 'month', y: 'revenue' } }],
  },
  events: {
    onClick: {
      action: 'showToast',
      args: { level: 'info', message: 'bar clicked: ${event.name}' },
    },
  },
};

const darkThemePieChart = {
  type: 'echarts',
  theme: 'dark',
  height: 320,
  dataset: { source: '${monthRows}', dimensions: ['month', 'revenue'] },
  option: {
    tooltip: {},
    legend: { bottom: 0 },
    series: [{ type: 'pie', radius: '60%', encode: { itemName: 'month', value: 'revenue' } }],
  },
};

const emptyState = {
  type: 'page',
  body: [{ type: 'echarts', height: 320, option: {} }],
};

export function EChartsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Apache ECharts renderer with native option passthrough for advanced chart types (sankey, treemap, boxplot, gauge, map, custom, ...). E2 scope: dataset/encode expression binding to scope data, flux events.* action bridge, and the automatic flux theme mapped from CSS variables. ECharts loads as an optional lazy chunk only when an echarts renderer instance mounts; the recharts `chart` renderer stays the default for basic chart scenarios."
      scenarios={[
        {
          title: 'Dataset binding with a data swap button',
          description:
            'dataset.source binds the scope path monthRows via an expression; the button dispatches setValue on that path and the chart re-sets the composed option (tooltip + legend come from the native option).',
          schema: datasetBarChart,
          data: { monthRows },
        },
        {
          title: 'Dataset-driven smooth line (svg renderer)',
          description:
            'renderer:"svg" switches the echarts init mode; the series has no inline data — it encodes month → x and revenue → y from the dataset.',
          schema: datasetLineChart,
          data: { monthRows },
        },
        {
          title: 'Click event → flux action',
          description:
            'events.onClick maps to the native click event and dispatches a showToast action with the normalized echarts event params (event.name is the clicked bar).',
          schema: clickEventChart,
          data: { monthRows },
        },
        {
          title: 'Explicit theme passthrough (dark) on a dataset pie',
          description:
            'theme:"dark" is passed to echarts.init; without a theme prop the renderer applies the automatic flux theme mapped from CSS variables (--chart-1..5, axis/legend/tooltip tokens).',
          schema: darkThemePieChart,
          data: { monthRows },
        },
        {
          title: 'Explicit empty state',
          description:
            'An option without series is a valid empty state: the canvas renders with data-empty="true" and never throws (DD1-style explicit-empty contract). A bound dataset resolving to an empty array hits the same empty state.',
          schema: emptyState,
          data: {},
        },
      ]}
    />
  );
}
