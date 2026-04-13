import { MultiScenarioLabPage } from '../MultiScenarioLabPage';

const notificationVariants = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'variantFieldForm',
      data: {
        config: { type: 'email', address: 'admin@example.com' }
      },
      body: [
        {
          type: 'variant-field',
          name: 'config',
          label: 'Notification Config',
          typeField: 'type',
          variants: [
            {
              value: 'email',
              label: 'Email',
              body: [
                { type: 'input-email', name: 'address', label: 'Email Address', required: true }
              ]
            },
            {
              value: 'sms',
              label: 'SMS',
              body: [
                { type: 'input-text', name: 'phone', label: 'Phone Number', required: true }
              ]
            },
            {
              value: 'webhook',
              label: 'Webhook',
              body: [
                { type: 'input-text', name: 'url', label: 'Webhook URL', required: true },
                { type: 'input-text', name: 'secret', label: 'Secret (optional)' }
              ]
            }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save', onClick: { action: 'submit' } }
      ]
    }
  ]
};

const integrationVariants = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'integrationForm',
      data: {
        integration: { type: 'github', token: '' }
      },
      body: [
        {
          type: 'variant-field',
          name: 'integration',
          label: 'Integration',
          typeField: 'type',
          variants: [
            {
              value: 'github',
              label: 'GitHub',
              body: [
                { type: 'input-text', name: 'token', label: 'Personal Access Token', required: true },
                { type: 'input-text', name: 'org', label: 'Organization (optional)' }
              ]
            },
            {
              value: 'jira',
              label: 'Jira',
              body: [
                { type: 'input-text', name: 'domain', label: 'Jira Domain', placeholder: 'company.atlassian.net', required: true },
                { type: 'input-email', name: 'email', label: 'Account Email', required: true },
                { type: 'input-password', name: 'apiToken', label: 'API Token', required: true }
              ]
            }
          ]
        }
      ],
      actions: [
        { type: 'button', label: 'Save Integration', onClick: { action: 'submit' } }
      ]
    }
  ]
};

export function VariantFieldLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Discriminated union field. A type selector switches which variant body is rendered. Only the active variant's fields are submitted."
      scenarios={[
        {
          title: 'Notification config — email, SMS, or webhook',
          description: 'Switch the type selector between Email, SMS, and Webhook to see different field sets. Starts with email selected.',
          schema: notificationVariants
        },
        {
          title: 'Integration config — GitHub or Jira',
          description: 'Each integration type requires different credentials. Switch the type to see the relevant fields.',
          schema: integrationVariants
        }
      ]}
    />
  );
}
