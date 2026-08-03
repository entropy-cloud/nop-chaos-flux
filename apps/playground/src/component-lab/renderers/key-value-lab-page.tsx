import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const httpHeaders = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'keyValueForm',
      data: {
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer <token>' },
          { key: 'Accept', value: 'application/json' },
        ],
      },
      body: [{ type: 'key-value', name: 'headers', label: 'HTTP Headers' }],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const envVars = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'envForm',
      data: {
        env: [
          { key: 'NODE_ENV', value: 'production' },
          { key: 'PORT', value: '3000' },
        ],
      },
      body: [
        {
          type: 'key-value',
          name: 'env',
          label: 'Environment Variables',
          keyPlaceholder: 'VARIABLE_NAME',
          valuePlaceholder: 'value',
        },
      ],
      actions: [{ type: 'button', label: 'Apply', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hostKvSubmit = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.hostKv',
      data: {
        headers: [{ id: 'pair-1', key: 'Content-Type', value: 'application/json' }],
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'key-value',
          name: 'headers',
          label: 'HTTP Headers',
        },
        {
          type: 'text',
          testid: 'le-kv-echo',
          text: '${submitted ? "LE-KV:" + $JSON.stringify(ui.hostKv.headers) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function KeyValueLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Editable list of key-value pairs. Rows can be added and removed. Useful for HTTP headers, environment variables, metadata maps, and similar data."
      scenarios={[
        {
          title: 'HTTP header editing',
          description:
            'Pre-populated with three HTTP headers. Add rows with the + button, edit inline, or remove with the trash icon.',
          schema: httpHeaders,
        },
        {
          title: 'Environment variable editing',
          description:
            'Same structure used for environment variable maps with descriptive placeholders for key and value columns.',
          schema: envVars,
        },
        {
          title: 'Host form key-value row edit + submit (bug 73 pattern)',
          description:
            'Edit a row inline, add a row, then submit; the echo publishes the committed key-value array (row edits reach the store and the submitted shape in a real browser).',
          schema: hostKvSubmit,
        },
      ]}
    />
  );
}
