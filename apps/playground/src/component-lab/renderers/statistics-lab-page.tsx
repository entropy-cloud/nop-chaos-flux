import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicStatistics = {
  type: 'page',
  body: [
    {
      type: 'statistics',
      testid: 'demo-statistics-basic',
      source: '${records}',
      statistics: [{ label: 'Total', field: 'value', aggregation: 'sum' }],
    },
  ],
};

export function StatisticsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Inline field-value statistics display with CRUD integration."
      scenarios={[
        {
          title: 'Basic statistics',
          description: 'Inline statistics driven by source data.',
          schema: basicStatistics,
          data: {
            records: [
              { value: 10 },
              { value: 20 },
              { value: 30 },
            ],
          },
        },
      ]}
    />
  );
}
