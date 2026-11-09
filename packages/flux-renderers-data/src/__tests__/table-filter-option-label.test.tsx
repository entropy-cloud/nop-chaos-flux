import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => {
  cleanup();
});

// plan 859 Phase 1 (Proof): the filter-option rows are label+Checkbox pairs
// inside the column-filter popover. No prior test asserted their DOM contract;
// this pins the labelled-checkbox structure the header row renders.
describe('table column filter option rows', () => {
  it('renders each filterable option as a label wrapping a checkbox and toggles the filter', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-filter-option-label"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              itemKey: 'id',
              source: [
                { id: '1', owner: 'Alice' },
                { id: '2', owner: 'Bob' },
              ],
              columns: [
                { name: 'owner', label: 'Owner', filterable: { options: [
                  { label: 'Alice', value: 'Alice' },
                  { label: 'Bob', value: 'Bob' },
                ] } },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: t('flux.table.filter') })[0] as HTMLElement);
    const popup = await waitFor(() => {
      const el = document.querySelector<HTMLElement>('[data-slot="popover-content"]');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });

    const options = Array.from(popup.querySelectorAll<HTMLElement>('[data-slot="table-filter-option"]'));
    expect(options).toHaveLength(2);
    for (const option of options) {
      expect(option.tagName).toBe('LABEL');
      expect(option.querySelector('[data-slot="checkbox"]')).toBeTruthy();
      expect(option.textContent).toMatch(/Alice|Bob/);
    }

    expect(document.querySelector('tbody')?.textContent).toContain('Bob');
    fireEvent.click(within(options[0]).getByRole('checkbox'));
    await waitFor(() => {
      expect(within(popup).getAllByRole('checkbox')[0].getAttribute('aria-checked')).toBe('true');
      expect(document.querySelector('tbody')?.textContent).not.toContain('Bob');
    });
  });
});
