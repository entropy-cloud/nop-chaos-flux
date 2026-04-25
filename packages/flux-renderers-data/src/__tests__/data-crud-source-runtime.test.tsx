import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support';

describe('CRUD renderer source-owned baseline', () => {
  it('consumes scope-resolved source result objects and preserves total summary', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-source-result-object"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'source-result-crud',
              source: '${pagedUsers}',
              queryForm: {
                body: [{ type: 'input-text', name: 'keyword', label: 'Keyword' }],
              },
              footerToolbar: [{ type: 'text', text: 'Rows: ${$crud.itemCount}/${$crud.total}; Query: ${$crud.query.keyword || "none"}' }],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        data={{
          pagedUsers: {
            items: [
              { id: '1', name: 'Alice' },
              { id: '2', name: 'Bob' },
            ],
            total: 42,
          },
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('Rows: 2/42; Query: none')).toBeTruthy();

    const input = screen.getByLabelText('Keyword') as HTMLInputElement;
    const queryControls = document.querySelector('[data-slot="crud-query-controls"]') as HTMLElement | null;
    expect(queryControls).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Ali' } });
    fireEvent.click(within(queryControls!).getByRole('button', { name: t('flux.common.search') }));

    await waitFor(() => {
      expect(screen.getByText('Rows: 1/42; Query: Ali')).toBeTruthy();
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.queryByText('Bob')).toBeNull();
    });
  });
});
