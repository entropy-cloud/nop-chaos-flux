import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicAmount = {
  type: 'page',
  body: [
    { type: 'amount-in-words', testid: 'demo-amount-basic', value: 1234.56 },
  ],
};

const expressionAmount = {
  type: 'page',
  data: { total: 100000001.05 },
  body: [
    { type: 'amount-in-words', testid: 'demo-amount-expr', value: '${total}' },
  ],
};

const fallbackAmount = {
  type: 'page',
  body: [
    { type: 'amount-in-words', testid: 'demo-amount-empty', value: 'N/A', placeholder: '—' },
  ],
};

export function AmountInWordsLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Read-only zh-CN financial uppercase display (plan 785): number/numeric-string to 人民币大写; rounds beyond two decimals to fen, 负 prefix for negatives, empty for non-finite input."
      scenarios={[
        {
          title: 'Basic amount conversion',
          description: 'Numeric value with 角/分 decimals.',
          schema: basicAmount,
          data: {},
        },
        {
          title: 'Expression-bound value',
          description: 'Value resolved from page data (亿 group boundary + 分).',
          schema: expressionAmount,
          data: {},
        },
        {
          title: 'Non-numeric fallback',
          description: 'Non-convertible value renders the placeholder.',
          schema: fallbackAmount,
          data: {},
        },
      ]}
    />
  );
}
