import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const basicInputs = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'inputForm',
      body: [
        {
          type: 'input-text',
          name: 'name',
          label: 'Full Name',
          placeholder: 'Enter your name',
          required: true,
        },
        { type: 'input-text', name: 'city', label: 'City', placeholder: 'Optional city' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const constrainedInputs = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'constrainedInputForm',
      body: [
        {
          type: 'input-text',
          name: 'search',
          label: 'Search',
          placeholder: 'Search users...',
        },
        {
          type: 'input-text',
          name: 'bio',
          label: 'Bio (max 100 chars)',
          placeholder: 'Short bio',
          maxLength: 100,
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const familyCompositeForm = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.familyValues',
      data: { name: '', email: '', secret: '', count: 2, notes: '' },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        { type: 'input-text', name: 'name', label: 'Full Name' },
        { type: 'input-email', name: 'email', label: 'Email' },
        { type: 'input-password', name: 'secret', label: 'Password' },
        { type: 'input-number', name: 'count', label: 'Quantity' },
        { type: 'textarea', name: 'notes', label: 'Notes' },
        {
          type: 'text',
          text:
            '${submitted && ui.familyValues ? "Family: " + ui.familyValues.name + " | " + ui.familyValues.email + " | " + ui.familyValues.secret + " | " + ui.familyValues.count + " | " + ui.familyValues.notes : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const SUGGEST_FRUITS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Apricot', value: 'apricot' },
  { label: 'Avocado', value: 'avocado' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
];

const suggestSubmitForm = {
  type: 'page',
  body: [
    {
      type: 'form',
      data: { fruit: '' },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/fruits', params: { q: '${fruit}' } },
          name: 'fruitSuggestions',
          initFetch: false,
          sendOn: 'fruit.length >= 1',
        },
        {
          type: 'input-text',
          name: 'fruit',
          label: 'Fruit (suggest)',
          suggestSource: 'fruitSuggestions',
          suggestDebounce: 100,
          suggestMinInputLength: 2,
          suggestEmpty: 'No matching fruits',
          clearable: true,
        },
        { type: 'text', testid: 'suggest-live', text: '${fruit ? "Fruit: " + fruit : ""}' },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const suggestEnv = {
  fetcher: async <T,>(api: { args?: Record<string, unknown>; data?: unknown }) => {
    const params = ((api.args ?? {}) as { params?: Record<string, unknown> }).params ?? {};
    const q = String(params.q ?? '').toLowerCase();
    const filtered = q
      ? SUGGEST_FRUITS.filter((item) => item.label.toLowerCase().includes(q))
      : SUGGEST_FRUITS;
    return { ok: true, status: 200, data: filtered as T };
  },
};

export function InputTextLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Single-line text input bound to a named form field. Supports placeholder and standard input validation such as maxLength."
      scenarios={[
        {
          title: 'Basic required and optional fields',
          description:
            'The Full Name field is required — submitting empty shows a validation error.',
          schema: basicInputs,
        },
        {
          title: 'Placeholder and maxLength constraints',
          description:
            'The Search field demonstrates placeholder usage. The Bio field applies a 100 character limit.',
          schema: constrainedInputs,
        },
        {
          title: 'Text input family composite submit (bug 73 pattern)',
          description:
            'input-text / input-email / input-password / input-number / textarea in one form: real input into each control, then submit. valuesPath publishes the committed values into the page scope where an outer text echoes all five values.',
          schema: familyCompositeForm,
        },
        {
          title: 'input-text suggestSource writeback in form',
          description:
            'Typing into the suggest field debounce-dispatches refreshSource; the popover opens, selecting an item writes the value back into the input and the live echo.',
          schema: suggestSubmitForm,
          env: suggestEnv,
        },
      ]}
    />
  );
}
