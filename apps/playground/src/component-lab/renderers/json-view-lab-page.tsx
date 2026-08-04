import { MultiScenarioLabPage } from '../multi-scenario-lab-page';
import { c6c1JsonHostSchema } from './data-c6c1-host';

const basicJson = {
  type: 'page',
  body: [
    {
      type: 'json-view',
      testid: 'demo-json-lab',
      value: { id: 'u-1001', name: 'Alice', roles: ['admin', 'editor'] },
      showCopy: true,
    },
  ],
};

const collapsedJson = {
  type: 'page',
  body: [
    {
      type: 'json-view',
      testid: 'demo-json-lab-collapsed',
      value: { a: { b: { c: 1 } } },
      collapsed: true,
    },
  ],
};

export function JsonViewLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Structured JSON data viewer (ui JsonViewer): empty state for null/undefined, collapsed/expand levels, and a copy button. The value prop is scope-reactive."
      scenarios={[
        {
          title: 'Basic json-view tree',
          description: 'Object value renders an expandable tree with copy toolbar.',
          schema: basicJson,
          data: {},
        },
        {
          title: 'Host json-view null empty + dynamic value update (C6.1)',
          description:
            'C6.1 Phase 3: null value shows the empty state; scope buttons drive the value to an object (tree appears) and back to null (empty state returns) — no errors.',
          schema: c6c1JsonHostSchema,
          data: { jsonValue: null },
        },
        {
          title: 'Collapsed json-view',
          description: 'collapsed:true folds nested keys away.',
          schema: collapsedJson,
          data: {},
        },
      ]}
    />
  );
}
