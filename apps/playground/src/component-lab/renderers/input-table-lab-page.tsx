import { MultiScenarioLabPage } from '../multi-scenario-lab-page';

const skuTable = {
  type: 'page',
  body: [
    {
      type: 'form',
      name: 'inputTableForm',
      data: {
        rows: [
          { sku: 'A1', amount: 3 },
          { sku: 'B2', amount: 5 },
        ],
      },
      body: [
        {
          type: 'input-table',
          name: 'rows',
          label: 'Line items',
          columns: [{ label: 'SKU' }, { label: 'Amount' }],
          rowKey: 'sku',
          addable: true,
          removable: true,
          reorderable: true,
          item: [
            { type: 'input-text', name: 'sku', placeholder: 'SKU' },
            { type: 'input-number', name: 'amount', placeholder: 'Amount' },
          ],
        },
      ],
      actions: [{ type: 'button', label: 'Save', onClick: { action: 'submitForm' } }],
    },
  ],
};

export function InputTableLabPage() {
  return (
    <MultiScenarioLabPage
      introDescription="Tabular object-array field editor. Inline row editing with column headers; reuses the array-field staged owner + canonical addItem/removeItem/moveItem handle (addRow/removeRow/moveRow are aliases)."
      scenarios={[
        {
          title: 'SKU + amount table',
          description:
            'Each row edits sku + amount. Rows are addable, removable, and reorderable; rowKey keeps item identity stable.',
          schema: skuTable,
        },
      ]}
    />
  );
}
