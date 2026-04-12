import { SchemaLabPage } from '../SchemaLabPage';

const schema = {
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

export function VariantFieldLabPage() {
  return (
    <SchemaLabPage
      schema={schema}
      description="Discriminated union field. A type selector switches which variant body is rendered."
      notes="Switch the type selector between Email, SMS, and Webhook to see different field sets."
    />
  );
}
