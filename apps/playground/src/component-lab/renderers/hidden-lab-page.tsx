import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const hiddenWithVisibleForm = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'hiddenDemo',
      data: { orderId: 'A100' },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        { type: 'hidden', name: 'orderId' },
        { type: 'input-text', name: 'customer', label: 'Customer', placeholder: 'Visible field' },
        {
          type: 'text',
          text: '${submitted ? "Submitted orderId: " + orderId + " / customer: " + customer : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const hiddenSeededValue = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'seededHidden',
      body: [
        { type: 'hidden', name: 'tenantId', value: 'seed' },
        {
          type: 'text',
          text: 'Hidden field value echoed from scope: ${tenantId}',
        },
      ],
    },
  ],
};

const hiddenClearOnPolicy = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'clearPolicy',
      data: { tenantId: 'T1' },
      body: [
        {
          type: 'hidden',
          name: 'tenantId',
          hiddenFieldPolicy: { clearValueWhenHidden: true },
        },
        {
          type: 'text',
          text: 'clearValueWhenHidden policy: tenantId resolves as "${tenantId || "undefined"}"',
        },
      ],
    },
  ],
};

export function HiddenLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Invisible field renderer: renders a native input[type=hidden] carrying a form value with no visible chrome. Hidden fields participate in validation and clearing through hiddenFieldPolicy."
      scenarios={[
        {
          title: 'Hidden field inside submitting form',
          description:
            'The hidden orderId field is carried in the form scope and submitted alongside visible fields without rendering any visible chrome.',
          schema: hiddenWithVisibleForm,
        },
        {
          title: 'Hidden field seeded value',
          description:
            'A hidden field with a schema value seeds the form scope and can be read back by sibling renderers.',
          schema: hiddenSeededValue,
        },
        {
          title: 'hiddenFieldPolicy clearValueWhenHidden',
          description:
            'With clearValueWhenHidden, the hidden field notifies the form owner to clear its scope value on mount.',
          schema: hiddenClearOnPolicy,
        },
      ]}
    />
  );
}
