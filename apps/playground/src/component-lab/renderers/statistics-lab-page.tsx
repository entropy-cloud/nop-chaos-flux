import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicStatistics = {
  type: 'page',
  body: [
    {
      type: 'statistics',
      testid: 'demo-statistics-basic',
      total: '${totalCount}',
    },
  ],
};

export function StatisticsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Standalone numeric summary display (total count). Total flows in via the total prop."
      scenarios={[
        {
          title: 'Basic statistics',
          description: 'Numeric total summary driven by scope data.',
          schema: basicStatistics,
          data: {
            totalCount: 60,
          },
        },
      ]}
    />
  );
}
