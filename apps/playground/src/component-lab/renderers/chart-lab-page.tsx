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
        { dataRegionKey: 'expenses', name: 'Expenses' }
      ]
    }
  ]
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
        { dataRegionKey: 'expenses', name: 'Expenses' }
      ]
    }
  ]
};

const chartData = [
  { month: 'Jan', revenue: 4200, expenses: 2800 },
  { month: 'Feb', revenue: 5100, expenses: 3100 },
  { month: 'Mar', revenue: 4800, expenses: 2600 },
  { month: 'Apr', revenue: 6200, expenses: 3400 },
  { month: 'May', revenue: 5700, expenses: 3000 },
  { month: 'Jun', revenue: 6800, expenses: 3700 }
];

export function ChartLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Recharts-based chart renderer with configurable chart type, source data, axes, and series. Supports bar, line, pie, and scatter chart types."
      scenarios={[
        {
          title: 'Bar chart with configured axes and series',
          description: 'Monthly revenue vs expenses rendered as a grouped bar chart using source, xAxis, yAxis, and named series.',
          schema: barChart,
          data: { chartData }
        },
        {
          title: 'Line chart — same data, different type',
          description: 'The same revenue/expenses data rendered as a line chart. Only chartType changes.',
          schema: lineChart,
          data: { chartData }
        }
      ]}
    />
  );
}
