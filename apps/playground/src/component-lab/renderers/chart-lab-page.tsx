import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const barChart = {
  type: 'page',
  body: [
    {
      type: 'chart',
      chartType: 'bar',
      source: '${chartData}',
      xAxis: { dataKey: 'month', label: 'Month' },
      yAxis: { label: 'Amount ($)' },
      series: [
        { dataRegionKey: 'revenue', name: 'Revenue' },
        { dataRegionKey: 'expenses', name: 'Expenses' },
      ],
    },
  ],
};

const lineChart = {
  type: 'page',
  body: [
    {
      type: 'chart',
      chartType: 'line',
      source: '${chartData}',
      xAxis: { dataKey: 'month', label: 'Month' },
      yAxis: { label: 'Amount ($)' },
      series: [
        { dataRegionKey: 'revenue', name: 'Revenue' },
        { dataRegionKey: 'expenses', name: 'Expenses' },
      ],
    },
  ],
};

const areaChart = {
  type: 'page',
  body: [
    {
      type: 'chart',
      chartType: 'area',
      source: '${chartData}',
      xAxis: { dataKey: 'month', label: 'Month' },
      yAxis: { label: 'Amount ($)' },
      series: [
        { dataRegionKey: 'revenue', name: 'Revenue' },
        { dataRegionKey: 'expenses', name: 'Expenses' },
      ],
    },
  ],
};

const stackedBarChart = {
  type: 'page',
  body: [
    {
      type: 'chart',
      chartType: 'bar',
      stacked: true,
      source: '${stackedData}',
      xAxis: { dataKey: 'month', label: 'Month' },
      yAxis: { label: 'Users' },
      series: [
        { dataRegionKey: 'newUsers', name: 'New' },
        { dataRegionKey: 'returning', name: 'Returning' },
      ],
    },
  ],
};

const customColorsBarChart = {
  type: 'page',
  body: [
    {
      type: 'chart',
      chartType: 'bar',
      grid: false,
      colors: ['#6366f1', '#ec4899'],
      source: '${chartData}',
      xAxis: { dataKey: 'month', label: 'Month' },
      yAxis: { label: 'Amount ($)' },
      series: [
        { dataRegionKey: 'revenue', name: 'Revenue' },
        { dataRegionKey: 'expenses', name: 'Expenses' },
      ],
    },
  ],
};

const legendToggleChart = {
  type: 'page',
  body: [
    {
      type: 'chart',
      chartType: 'area',
      legend: true,
      source: '${chartData}',
      xAxis: { dataKey: 'month', label: 'Month' },
      yAxis: { label: 'Amount ($)' },
      series: [{ dataRegionKey: 'revenue', name: 'Revenue' }],
    },
  ],
};

const chartData = [
  { month: 'Jan', revenue: 4200, expenses: 2800 },
  { month: 'Feb', revenue: 5100, expenses: 3100 },
  { month: 'Mar', revenue: 4800, expenses: 2600 },
  { month: 'Apr', revenue: 6200, expenses: 3400 },
  { month: 'May', revenue: 5700, expenses: 3000 },
  { month: 'Jun', revenue: 6800, expenses: 3700 },
];

const stackedData = [
  { month: 'Jan', newUsers: 1200, returning: 1800 },
  { month: 'Feb', newUsers: 1500, returning: 2000 },
  { month: 'Mar', newUsers: 1300, returning: 2200 },
  { month: 'Apr', newUsers: 1700, returning: 2400 },
  { month: 'May', newUsers: 1600, returning: 2300 },
  { month: 'Jun', newUsers: 1900, returning: 2600 },
];

export function ChartLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Recharts-based chart renderer with configurable chart type, source data, axes, series, and visual options (area type, legend toggle, stacked, grid, custom colors). Supports bar, line, area, pie, and scatter chart types."
      scenarios={[
        {
          title: 'Bar chart with configured axes and series',
          description:
            'Monthly revenue vs expenses rendered as a grouped bar chart using source, xAxis, yAxis, and named series.',
          schema: barChart,
          data: { chartData },
        },
        {
          title: 'Line chart — same data, different type',
          description:
            'The same revenue/expenses data rendered as a line chart. Only chartType changes.',
          schema: lineChart,
          data: { chartData },
        },
        {
          title: 'Area chart — regional fill under each line',
          description:
            'chartType:"area" renders an AreaChart with monotone area series. Stroke and fill come from the default palette.',
          schema: areaChart,
          data: { chartData },
        },
        {
          title: 'Stacked bar chart — series sum into one column',
          description:
            'stacked:true adds stackId to bar series so New + Returning users stack into total per month.',
          schema: stackedBarChart,
          data: { stackedData },
        },
        {
          title: 'Custom colors and grid off',
          description:
            'colors:["#6366f1","#ec4899"] overrides the default palette per series; grid:false removes the CartesianGrid.',
          schema: customColorsBarChart,
          data: { chartData },
        },
        {
          title: 'Legend toggle on a single series',
          description:
            'legend:true forces the legend to render even for a single series (default heuristic hides it for one series).',
          schema: legendToggleChart,
          data: { chartData },
        },
      ]}
    />
  );
}
