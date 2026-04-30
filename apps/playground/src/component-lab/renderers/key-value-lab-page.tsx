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
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submit' } }],
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
      actions: [{ type: 'button', label: 'Apply', onClick: { action: 'submit' } }],
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
      ]}
    />
  );
}
