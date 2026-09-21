import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const SOURCE = [
  { id: 'r1', name: 'Alice' },
  { id: 'r2', name: 'Bob' },
];

function bodyRows() {
  return Array.from(document.querySelectorAll('tbody [data-slot="table-row"]'));
}

afterEach(cleanup);

/**
 * V12e 族2 (G6-R6-视角3-01, plan 487, proof-first): `data-[state=selected]`
 * consumers had no producer on the PLAIN selection path — rows selected via
 * rowSelection checkbox / toggleOnRowClick emitted no `data-state` unless the
 * author also declared an optionRow contract. The plain path now emits the
 * standard `selected` token WITHOUT the option-row contract attributes
 * (data-option-row/data-selected/aria-selected stay contract-gated —
 * opt-row-compat).
 */
describe('table plain-selection data-state producer (G6-R6-视角3-01)', () => {
  it('rowSelection checkbox selection emits data-state=selected without contract attrs', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://table-plain-selection-state"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              source: SOURCE,
              rowSelection: { type: 'checkbox' },
              columns: [{ label: 'Name', name: 'name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alice')).toBeTruthy());
    const [row1] = bodyRows();
    // Unselected: no token.
    expect(row1!.getAttribute('data-state')).toBeNull();
    expect(row1!.hasAttribute('data-option-row')).toBe(false);

    const checkbox = document.querySelector(
      'tbody [data-slot="table-select-cell"] input, tbody [role="checkbox"]',
    );
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox!);

    await waitFor(() => {
      expect(bodyRows()[0]!.getAttribute('data-state')).toBe('selected');
    });
    // Contract attributes remain optionRow-gated.
    expect(bodyRows()[0]!.hasAttribute('data-option-row')).toBe(false);
    expect(bodyRows()[0]!.hasAttribute('aria-selected')).toBe(false);
  });
});
