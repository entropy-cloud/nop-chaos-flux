import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support';

describe('CRUD renderer header forwarding', () => {
  it('forwards header search controls and clear behavior through crud into the internal table', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-header-filter-forwarding"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              rowKey: 'id',
              source: [
                { id: '1', name: 'Alpha', owner: 'Alice' },
                { id: '2', name: 'Beta', owner: 'Bob' },
              ],
              columns: [
                { name: 'name', label: 'Name', searchable: true },
                {
                  name: 'owner',
                  label: 'Owner',
                  filterable: {
                    options: [
                      { label: 'Alice', value: 'Alice' },
                      { label: 'Bob', value: 'Bob' },
                    ],
                  },
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: t('flux.table.filter') })[0] as HTMLElement);
    const searchPopup = document.querySelector('[data-slot="dropdown-menu-content"]') as HTMLElement | null;
    expect(searchPopup).toBeTruthy();
    fireEvent.change(within(searchPopup!).getByRole('textbox'), { target: { value: 'Alp' } });

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeTruthy();
      expect(screen.queryByText('Beta')).toBeNull();
    });

    expect(screen.getByRole('button', { name: t('flux.table.filterActive') })).toBeTruthy();
    const activePopup = document.querySelector('[data-slot="dropdown-menu-content"]') as HTMLElement | null;
    expect(activePopup).toBeTruthy();
    fireEvent.click(within(activePopup!).getByRole('button', { name: t('flux.table.clearFilters') }));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: t('flux.table.filter') })).toHaveLength(2);
      expect(screen.getByText('Alpha')).toBeTruthy();
      expect(screen.getByText('Beta')).toBeTruthy();
    });
  });
});
