import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicRating = {
  type: 'page',
  body: [
    {
      type: 'form',
      body: [
        {
          type: 'rating',
          name: 'satisfaction',
          label: 'Overall satisfaction',
          count: 5,
          value: 3,
          description: 'Click a star or focus the group and use arrow keys (Shift+Arrow for half steps).',
        },
        { type: 'text', text: 'You rated: ${satisfaction}' },
      ],
      actions: [{ type: 'button', label: 'Submit rating', onClick: { action: 'submitForm' } }],
    },
  ],
};

const ratingVariants = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'variantsForm',
      body: [
        {
          type: 'rating',
          name: 'halfRating',
          label: 'Half-star rating (allowHalf + allowClear)',
          count: 5,
          allowHalf: true,
          allowClear: true,
        },
        {
          type: 'rating',
          name: 'tenScale',
          label: 'Ten-star scale (count: 10)',
          count: 10,
          value: 7,
        },
        {
          type: 'rating',
          name: 'lockedRating',
          label: 'Read-only rating (bound to 4)',
          count: 5,
          value: 4,
          readOnly: true,
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function RatingLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Star rating bound to a numeric form field (missing-components L1). count/allowHalf/allowClear contracts, keyboard operation, half-star rendering, and read-only presentation."
      scenarios={[
        {
          title: 'Rating with in-form live summary',
          description: 'Click stars or use arrow keys; the summary re-renders from the bound value.',
          schema: basicRating,
        },
        {
          title: 'Half stars, ten-star scale, and read-only',
          description: 'allowHalf + allowClear granularity, a 10-star scale, and a read-only bound rating.',
          schema: ratingVariants,
        },
      ]}
    />
  );
}
