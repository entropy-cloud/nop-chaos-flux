import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formulaCompiler } from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

afterEach(() => {
  cleanup();
});

// Plan 814 (docs/bugs/171-input-table-required-cell-stale-after-fix.md): a
// required input-table cell that failed one submit must not keep the form
// invalid after the user fixes it. validateForm used to key the
// array-template expansion errors under the template path (`rows.sku`), a
// field state nothing ever re-committed, so every later submit stayed blocked.
function renderRowsForm(rows: Array<{ sku: string }>, fetcher: ReturnType<typeof vi.fn>) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://input-table-revalidate-after-fix"
      schema={{
        type: 'form',
        id: 'f',
        data: { rows },
        submitAction: { action: 'ajax', args: { url: '/submit', method: 'post', data: { rows: '${rows}' } } },
        body: [
          {
            type: 'input-table',
            name: 'rows',
            addable: true,
            columns: [{ label: 'SKU' }],
            item: [{ type: 'input-text', name: 'sku', required: true, placeholder: 'SKU' }],
          },
          { type: 'button', label: 'GO', onClick: { action: 'submitForm' } },
        ],
      } as never}
      env={{ ...env, fetcher } as never}
      formulaCompiler={formulaCompiler}
    />,
  );
}

async function submitBlockedThenFixAndResubmit(fetcher: ReturnType<typeof vi.fn>, rowIndex: number) {
  fireEvent.click(screen.getByText('GO'));
  await new Promise((resolve) => setTimeout(resolve, 150));
  expect(fetcher).toHaveBeenCalledTimes(0);

  fireEvent.change(screen.getAllByPlaceholderText('SKU')[rowIndex], { target: { value: 'B' } });
  await new Promise((resolve) => setTimeout(resolve, 150));
  fireEvent.click(screen.getByText('GO'));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1), { timeout: 2000 });
}

describe('input-table: required cell revalidates after a failed submit', () => {
  it('a pre-existing empty required cell, once fixed, lets the next submit through', async () => {
    const fetcher = vi.fn(async () => ({ status: 0, data: {} }));
    renderRowsForm([{ sku: 'A' }, { sku: '' }], fetcher);
    await waitFor(() => expect(screen.getAllByPlaceholderText('SKU')).toHaveLength(2));

    await submitBlockedThenFixAndResubmit(fetcher, 1);
  });

  it('an added empty row, once filled, lets the next submit through', async () => {
    const fetcher = vi.fn(async () => ({ status: 0, data: {} }));
    renderRowsForm([{ sku: 'A' }], fetcher);
    await waitFor(() => expect(screen.getAllByPlaceholderText('SKU')).toHaveLength(1));
    fireEvent.click(document.querySelector('[data-slot="input-table-add"]')!);
    await waitFor(() => expect(screen.getAllByPlaceholderText('SKU')).toHaveLength(2));

    await submitBlockedThenFixAndResubmit(fetcher, 1);
  });
});
