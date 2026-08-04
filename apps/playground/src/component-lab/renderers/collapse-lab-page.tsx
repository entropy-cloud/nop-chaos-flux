import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c5c1CollapseSchema } from './data-c5c1-host';

const basicCollapse = {
  type: 'page',
  body: [
    {
      type: 'collapse',
      testid: 'demo-collapse-basic',
      items: [
        { key: 'a', title: 'Panel A', body: [{ type: 'text', text: 'body-A' }] },
        { key: 'b', title: 'Panel B', body: [{ type: 'text', text: 'body-B' }] },
      ],
    },
  ],
};

const singleCollapse = {
  type: 'page',
  body: [
    {
      type: 'collapse',
      testid: 'demo-collapse-single-basic',
      multiple: false,
      items: [
        { key: 'x', title: 'Single X', body: [{ type: 'text', text: 'single-x' }] },
        { key: 'y', title: 'Single Y', body: [{ type: 'text', text: 'single-y' }] },
      ],
    },
  ],
};

export function CollapseLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Collapsible content group with local/controlled/scope expand-state ownership (valueOwnership), multiple/collapsible toggles, and per-item disabled."
      scenarios={[
        {
          title: 'Basic collapse (multiple default)',
          description: 'Two panels; clicking expands and dispatches onChange.',
          schema: basicCollapse,
          data: {},
        },
        {
          title: 'Single-select collapse',
          description: 'multiple=false enforces mutual exclusion.',
          schema: singleCollapse,
          data: {},
        },
        {
          title: 'Host collapse three-way ownership switching (C5.1 Phase 3)',
          description:
            'C5.1 Phase 3: local panels toggle on click; a controlled collapse is driven by external scope value (host buttons, no local mutation); a scope collapse writes its expand state back through valueStatePath.',
          schema: c5c1CollapseSchema,
          data: {},
        },
      ]}
    />
  );
}
