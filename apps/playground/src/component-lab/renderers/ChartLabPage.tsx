import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
  type: 'page',
  body: [
    {
      type: 'chart',
      chartType: 'bar',
      data: '${chartData}',
      xField: 'month',
      series: [
        { dataKey: 'revenue', label: 'Revenue', color: '#6366f1' },
        { dataKey: 'expenses', label: 'Expenses', color: '#f43f5e' }
      ]
    }
  ]
};

export function ChartLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      data={{
        chartData: [
          { month: 'Jan', revenue: 4200, expenses: 2800 },
          { month: 'Feb', revenue: 5100, expenses: 3100 },
          { month: 'Mar', revenue: 4800, expenses: 2600 },
          { month: 'Apr', revenue: 6200, expenses: 3400 },
          { month: 'May', revenue: 5700, expenses: 3000 },
          { month: 'Jun', revenue: 6800, expenses: 3700 }
        ]
      }}
      description="Recharts-based chart renderer with configurable series, axes, and event handlers."
    />
  );
}
