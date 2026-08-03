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

const tableSubmit = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.tableRows',
      data: {
        rows: [
          { sku: 'A1', amount: 3 },
          { sku: 'B2', amount: 5 },
        ],
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'input-table',
          name: 'rows',
          label: 'Line items',
          columns: [{ label: 'SKU' }, { label: 'Amount' }],
          rowKey: 'sku',
          item: [
            { type: 'input-text', name: 'sku', placeholder: 'TSKU' },
            { type: 'input-number', name: 'amount', placeholder: 'TAmount' },
          ],
        },
        {
          type: 'text',
          testid: 'table-echo',
          text: '${submitted ? "Table: " + $JSON.stringify(ui.tableRows.rows) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
    },
  ],
};

const readOnlyTable = {
  type: 'page',
  body: [
    {
      type: 'form',
      valuesPath: 'ui.tableRO',
      data: {
        rows: [
          { sku: 'FIXED-1', amount: 9 },
          { sku: 'FIXED-2', amount: 11 },
        ],
      },
      onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
      body: [
        {
          type: 'input-table',
          name: 'rows',
          label: 'Read-only rows',
          columns: [{ label: 'SKU' }, { label: 'Amount' }],
          readOnly: true,
          item: [
            { type: 'input-text', name: 'sku', placeholder: 'ROSKU' },
            { type: 'input-number', name: 'amount', placeholder: 'ROAmount' },
          ],
        },
        {
          type: 'text',
          testid: 'table-ro-echo',
          text: '${submitted ? "RO: " + $JSON.stringify(ui.tableRO.rows) : ""}',
        },
      ],
      actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
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
        {
          title: 'Table multi-row edit submit (bug 73 pattern)',
          description:
            'Two rows edited in place, one row added and filled, then submit. valuesPath publishes the committed rows; the echo asserts the exact committed shape.',
          schema: tableSubmit,
        },
        {
          title: 'Read-only table submit (unchanged values)',
          description:
            'readOnly: true renders immutable cells, hides the action column and add button, and submit echoes the untouched values.',
          schema: readOnlyTable,
        },
      ]}
    />
  );
}
