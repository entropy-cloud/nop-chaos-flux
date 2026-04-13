import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const barChart = {
  type: 'page',
  body: [
    {
      type: 'chart',
      chartType: 'bar',
      data: '${chartData}',
      xField: 'month',
      xAxisLabel: 'Month',
      yAxisLabel: 'Amount ($)',
      legend: true,
      series: [
        { dataKey: 'revenue', label: 'Revenue', color: '#6366f1' },
        { dataKey: 'expenses', label: 'Expenses', color: '#f43f5e' }
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
      data: '${chartData}',
      xField: 'month',
      xAxisLabel: 'Month',
      yAxisLabel: 'Amount ($)',
      legend: true,
      series: [
        { dataKey: 'revenue', label: 'Revenue', color: '#6366f1' },
        { dataKey: 'expenses', label: 'Expenses', color: '#f43f5e' }
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
      introDescription="Recharts-based chart renderer with configurable chart type, series, axes, and legend. Supports bar, line, area, and pie chart types."
      scenarios={[
        {
          title: 'Bar chart with axis labels and legend',
          description: 'Monthly revenue vs expenses rendered as a grouped bar chart. xAxisLabel, yAxisLabel, and legend: true are all shown.',
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
