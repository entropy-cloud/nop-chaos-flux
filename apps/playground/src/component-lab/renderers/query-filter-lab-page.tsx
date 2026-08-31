import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicFilter = {
  type: 'page',
  data: { lastQuery: '' },
  body: [
    {
      type: 'query-filter',
      id: 'labBasicFilter',
      columnCount: 3,
      body: [
        { type: 'input-text', name: 'keyword', label: 'Keyword', placeholder: 'Order / customer' },
        {
          type: 'select',
          name: 'status',
          label: 'Status',
          clearable: true,
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Done', value: 'done' },
          ],
        },
        { type: 'input-number', name: 'amount', label: 'Amount' },
      ],
      onSubmit: [{ action: 'setValue', args: { path: 'lastQuery', value: 'searched' } }],
      onReset: [{ action: 'setValue', args: { path: 'lastQuery', value: 'reset' } }],
    },
    { type: 'text', text: 'Last action: ${lastQuery}', testid: 'lab-qf-last-action' },
  ],
};

const inlineFilter = {
  type: 'page',
  body: [
    {
      type: 'query-filter',
      id: 'labInlineFilter',
      mode: 'inline',
      submitLabel: 'Filter',
      resetLabel: 'Clear',
      body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
    },
  ],
};

const togglableFilter = {
  type: 'page',
  body: [
    {
      type: 'query-filter',
      id: 'labTogglableFilter',
      togglable: {
        defaultCollapsed: true,
        collapsedLabel: 'Filters hidden — expand to search',
        expandedLabel: 'Hide filters',
      },
      body: [
        { type: 'input-text', name: 'keyword', label: 'Keyword' },
        { type: 'input-text', name: 'owner', label: 'Owner' },
      ],
    },
  ],
};

export function QueryFilterLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Standalone query-region semantic component: embedded form with search/reset built in, grid layout, and optional expand/collapse. Works outside crud against any data channel."
      scenarios={[
        {
          title: 'Basic query region',
          description:
            'Search runs the embedded form submit pipeline (validation then onSubmit); Reset clears the fields and runs onReset.',
          schema: basicFilter,
        },
        {
          title: 'Inline mode with custom labels',
          description:
            'mode: "inline" compacts labels and inputs onto one line; submitLabel/resetLabel rename the default buttons.',
          schema: inlineFilter,
        },
        {
          title: 'Collapsible filter',
          description:
            'togglable wraps the form in a collapse envelope; defaultCollapsed starts hidden and the labels customize both states.',
          schema: togglableFilter,
        },
      ]}
    />
  );
}
