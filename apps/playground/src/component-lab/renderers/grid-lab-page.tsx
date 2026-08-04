import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c5c1GridSchema } from './data-c5c1-host';

const basicGrid = {
  type: 'page',
  body: [
    {
      type: 'grid',
      testid: 'demo-grid-basic',
      columns: 3,
      gap: 12,
      items: [
        { body: [{ type: 'text', text: 'cell-1' }] },
        { body: [{ type: 'text', text: 'cell-2' }] },
        { body: [{ type: 'text', text: 'wide', testid: 'grid-wide-basic' }], colSpan: 2 },
      ],
    },
  ],
};

const rawColumns = {
  type: 'page',
  body: [
    {
      type: 'grid',
      testid: 'demo-grid-raw',
      columns: '1fr 2fr 1fr',
      gap: '1rem',
      items: [
        { body: [{ type: 'text', text: 'a' }] },
        { body: [{ type: 'text', text: 'b' }] },
        { body: [{ type: 'text', text: 'c' }] },
      ],
    },
  ],
};

export function GridLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Explicit 2D grid layout renderer. Layout values (columns/gap/autoFlow/alignItems/justifyItems) come from schema; the root emits only the nop-grid marker plus schema-authored overrides."
      scenarios={[
        {
          title: 'Basic grid with colSpan',
          description: 'columns=3 with a colSpan=2 item; number gap maps to inline px.',
          schema: basicGrid,
          data: {},
        },
        {
          title: 'Raw CSS columns and gap strings',
          description: 'columns as a raw grid-template-columns string; gap string kept as inline CSS.',
          schema: rawColumns,
          data: {},
        },
        {
          title: 'Host nested grid with responsive columns (C5.1 Phase 3)',
          description:
            'C5.1 Phase 3: an outer grid (columns 2, responsiveColumns sm:1/lg:2, gap token "md") hosts a nested 2-column grid inside one cell plus a colSpan=2 item — the marker-only root contract is asserted in the browser.',
          schema: c5c1GridSchema,
          data: {},
        },
      ]}
    />
  );
}
