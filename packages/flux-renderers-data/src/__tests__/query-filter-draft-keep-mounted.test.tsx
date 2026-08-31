import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => cleanup());

const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

function renderSchema(schema: unknown) {
  return render(
    <SchemaRenderer
      schemaUrl="test://query-filter-draft-keep-mounted"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('query form draft survives collapse/expand (22-04, keep-mounted)', () => {
  it('query-filter host: keeps the embedded form mounted (hidden) and preserves the draft', () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'query-filter',
          togglable: {},
          body: [
            { type: 'input-text', name: 'keyword', label: 'Keyword', testid: 'qf-kw' },
          ],
        },
      ],
    });

    const inputBefore = (screen.getByTestId('qf-kw') as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement;
    fireEvent.change(inputBefore, { target: { value: 'draft-keep' } });
    expect(inputBefore.value).toBe('draft-keep');

    const collapseBtn = document.querySelector(
      '[data-slot="query-filter-collapse"] button',
    ) as HTMLButtonElement;
    fireEvent.click(collapseBtn);

    // Collapsed: form stays mounted but hidden (draft not dropped).
    const hiddenWhileCollapsed = (screen.getByTestId('qf-kw') as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement;
    expect(hiddenWhileCollapsed).toBe(inputBefore);
    expect(hiddenWhileCollapsed.closest('div[hidden]')).toBeTruthy();

    const expandBtn = document.querySelector(
      '[data-slot="query-filter-collapse"] button',
    ) as HTMLButtonElement;
    fireEvent.click(expandBtn);

    const inputAfter = (screen.getByTestId('qf-kw') as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement;
    expect(inputAfter).toBe(inputBefore);
    expect(inputAfter.closest('div[hidden]')).toBeNull();
    expect(inputAfter.value).toBe('draft-keep');
  });

  it('crud host: keeps the query form region mounted (hidden) and preserves the draft', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'crud',
          id: 'draft-keep-crud',
          source: [{ id: '1', name: 'Alice' }],
          columns: [{ name: 'name', label: 'Name' }],
          queryForm: {
            body: [{ type: 'input-text', name: 'keyword', label: 'Keyword', testid: 'crud-kw' }],
          },
          filterTogglable: {},
        },
      ],
    });
    await waitFor(() =>
      expect(document.querySelector('[data-slot="crud-query"]')).toBeTruthy(),
    );

    const inputBefore = (screen.getByTestId('crud-kw') as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement;
    fireEvent.change(inputBefore, { target: { value: 'crud-draft' } });
    expect(inputBefore.value).toBe('crud-draft');

    const collapseBtn = document.querySelector(
      '[data-slot="crud-query-collapse"] button',
    ) as HTMLButtonElement;
    fireEvent.click(collapseBtn);

    const hiddenWhileCollapsed = (screen.getByTestId('crud-kw') as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement;
    expect(hiddenWhileCollapsed).toBe(inputBefore);
    expect(hiddenWhileCollapsed.closest('div[hidden]')).toBeTruthy();

    const expandBtn = document.querySelector(
      '[data-slot="crud-query-collapse"] button',
    ) as HTMLButtonElement;
    fireEvent.click(expandBtn);

    const inputAfter = (screen.getByTestId('crud-kw') as HTMLElement).querySelector(
      'input',
    ) as HTMLInputElement;
    expect(inputAfter).toBe(inputBefore);
    expect(inputAfter.closest('div[hidden]')).toBeNull();
    expect(inputAfter.value).toBe('crud-draft');
  });
});
