import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const barChart = {
  type: 'page',
  body: [
    {
      type: 'echarts',
      height: 360,
      option: {
        tooltip: {},
        xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
        yAxis: { type: 'value' },
        series: [
          { type: 'bar', name: 'Revenue', data: [4200, 5100, 4800, 6200, 5700, 6800] },
          { type: 'bar', name: 'Expenses', data: [2800, 3100, 2600, 3400, 3000, 3700] },
        ],
      },
    },
  ],
};

const lineChart = {
  type: 'page',
  body: [
    {
      type: 'echarts',
      renderer: 'svg',
      height: 320,
      option: {
        xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
        yAxis: { type: 'value' },
        series: [
          { type: 'line', smooth: true, areaStyle: {}, data: [150, 230, 224, 218, 270] },
        ],
      },
    },
  ],
};

const emptyState = {
  type: 'page',
  body: [{ type: 'echarts', height: 320, option: {} }],
};

export function EChartsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Apache ECharts renderer with native option passthrough for advanced chart types (sankey, treemap, boxplot, gauge, map, custom, ...). ECharts loads as an optional lazy chunk only when an echarts renderer instance mounts; the recharts `chart` renderer stays the default for basic chart scenarios."
      scenarios={[
        {
          title: 'Grouped bar chart (native option, canvas)',
          description:
            'A native ECharts option object passed through as-is: two bar series with tooltip. No schema-level dataset yet — dataset/encode expression binding lands with E2.1.',
          schema: barChart,
          data: {},
        },
        {
          title: 'Smooth line chart (svg renderer)',
          description:
            'renderer:"svg" switches the echarts init mode; option uses native line series with areaStyle.',
          schema: lineChart,
          data: {},
        },
        {
          title: 'Explicit empty state',
          description:
            'An option without series is a valid empty state: the canvas renders with data-empty="true" and never throws (DD1-style explicit-empty contract).',
          schema: emptyState,
          data: {},
        },
      ]}
    />
  );
}
