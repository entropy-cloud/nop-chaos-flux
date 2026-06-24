import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const contactsCombo = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'comboForm',
      data: {
        contacts: [
          { name: 'Alice', phone: '13800000001' },
          { name: 'Bob', phone: '13800000002' },
        ],
      },
      body: [
        {
          type: 'combo',
          name: 'contacts',
          label: 'Contacts',
          addable: true,
          removable: true,
          reorderable: true,
          items: [
            { type: 'input-text', name: 'name', placeholder: 'Name' },
            { type: 'input-text', name: 'phone', placeholder: 'Phone' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

const lineItems = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'comboItemsForm',
      data: { items: [{ title: 'Ticket', price: 100 }] },
      body: [
        {
          type: 'combo',
          name: 'items',
          label: 'Line items',
          minItems: 1,
          maxItems: 5,
          items: [
            { type: 'input-text', name: 'title', placeholder: 'Title' },
            { type: 'input-number', name: 'price', placeholder: 'Price' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function ComboLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Repeated composite-item field editor. Each item renders its own composite field set via the items region; reuses the array-field staged owner + canonical addItem/removeItem/moveItem handle."
      scenarios={[
        {
          title: 'Contact list with two composite fields per item',
          description:
            'Each card edits name + phone. Items are addable, removable, and reorderable through the canonical composite handle.',
          schema: contactsCombo,
        },
        {
          title: 'Line items with min/max bounds',
          description: 'minItems/maxItems clamp the add/remove buttons and the canonical handle.',
          schema: lineItems,
        },
      ]}
    />
  );
}
