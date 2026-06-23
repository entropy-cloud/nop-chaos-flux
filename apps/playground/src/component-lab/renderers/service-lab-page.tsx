import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const serviceBody = {
  type: 'page',
  body: [
    {
      type: 'service',
      testid: 'demo-service-body',
      items: '${tasks}',
      body: [
        {
          type: 'flex',
          direction: 'column',
          gap: 4,
          body: [{ type: 'text', text: 'Service body — ${tasks?.length ?? 0} tasks.' }],
        },
      ],
    },
  ],
};

const serviceEmpty = {
  type: 'page',
  body: [
    {
      type: 'service',
      testid: 'demo-service-empty',
      items: '${emptyTasks}',
      empty: { type: 'text', text: 'No tasks loaded.' },
      body: [{ type: 'text', text: 'should not render' }],
    },
  ],
};

const serviceLoading = {
  type: 'page',
  body: [
    {
      type: 'service',
      testid: 'demo-service-loading',
      items: '${emptyTasks}',
      loading: { type: 'text', text: 'Loading…' },
      body: [{ type: 'text', text: 'should not render over loading' }],
    },
  ],
};

const serviceError = {
  type: 'page',
  body: [
    {
      type: 'service',
      testid: 'demo-service-error',
      items: '${badData}',
      error: { type: 'text', text: 'Failed to load.' },
      body: [{ type: 'text', text: 'should not render' }],
    },
  ],
};

export function ServiceLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Visual data-composition shell. Reads already-loaded data from scope via the items expression; owns NO request protocol (request-sink contract: api/initFetch/interval/sendOn belong to <data-source>)."
      scenarios={[
        {
          title: 'Body with items',
          description: 'Body region renders when items resolves to N entries.',
          schema: serviceBody,
          data: {
            tasks: [
              { id: 1, title: 'Design' },
              { id: 2, title: 'Build' },
            ],
          },
        },
        {
          title: 'Empty state',
          description: 'Empty region renders when items is an empty array.',
          schema: serviceEmpty,
          data: { emptyTasks: [] },
        },
        {
          title: 'Loading state',
          description: 'Loading region renders when items is null (derived from items resolution, not a request mirror).',
          schema: serviceLoading,
          data: { emptyTasks: null },
        },
        {
          title: 'Error state',
          description: 'Error region renders when items resolves to an Error.',
          schema: serviceError,
          data: { badData: new Error('upstream failed') },
        },
      ]}
    />
  );
}
