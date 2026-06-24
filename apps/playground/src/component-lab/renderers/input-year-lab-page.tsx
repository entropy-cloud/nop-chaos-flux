import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const singleYear = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'yearForm',
      data: { year: '2024' },
      body: [{ type: 'input-year', name: 'year', label: 'Year', clearable: true }],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputYearLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Year field — number input storing YYYY on the shared date底层 token system. Mirrors the date family's owner language (clear/focus handles)."
      scenarios={[
        {
          title: 'single value',
          description: 'Numeric year input; empty value writes undefined.',
          schema: singleYear,
        },
      ]}
    />
  );
}
