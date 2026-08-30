import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import type { RendererSchemaValidationContext } from '@nop-chaos/flux-core';
import { validateBatchBarSchema } from '../batch-bar-definition.js';

afterEach(cleanup);

function renderCrudWithBatchBar(batchBarOverrides: Record<string, unknown> = {}) {
  const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

  return render(
    <SchemaRenderer
      schemaUrl="test://data/batch-bar-crud"
      schema={{
        type: 'page',
        body: [
          {
            type: 'crud',
            id: 'bar-crud',
            selection: {},
            source: [
              { id: '1', name: 'Alice' },
              { id: '2', name: 'Bob' },
            ],
            toolbar: [
              {
                type: 'batch-bar',
                testid: 'bar',
                selectionPath: '$crud.selectedRowKeys',
                clearTarget: 'bar-crud',
                ...batchBarOverrides,
              },
            ],
            footerToolbar: [{ type: 'text', text: 'Count: ${$crud.selectionCount}' }],
            columns: [{ name: 'name', label: 'Name' }],
          },
        ],
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function selectRow(index: number) {
  // Checkbox order in a crud table: [0] = header select-all, data rows follow.
  const checkboxes = document.querySelectorAll('[data-slot="checkbox"]');
  fireEvent.click(checkboxes[index + 1] as HTMLElement);
}

describe('batch-bar visibility gate matrix', () => {
  it('renders nothing while the selection is empty and appears once a row is selected', async () => {
    renderCrudWithBatchBar();

    expect(screen.queryByTestId('bar')).toBeNull();
    expect(screen.getByText('Count: 0')).toBeTruthy();

    selectRow(0);

    await waitFor(() => {
      expect(screen.getByTestId('bar')).toBeTruthy();
      expect(screen.getByText('Count: 1')).toBeTruthy();
    });

    const bar = screen.getByTestId('bar');
    expect(bar.getAttribute('data-slot')).toBe('batch-bar');
    expect(bar.className).toContain('nop-batch-bar');
    expect(bar.getAttribute('data-count')).toBe('1');
  });

  it('hides the envelope again when the selection returns to empty', async () => {
    renderCrudWithBatchBar();

    selectRow(0);
    await waitFor(() => expect(screen.getByTestId('bar')).toBeTruthy());

    selectRow(0);
    await waitFor(() => {
      expect(screen.queryByTestId('bar')).toBeNull();
      expect(screen.getByText('Count: 0')).toBeTruthy();
    });
  });

  it('renders nothing and never throws when the bound path is missing', () => {
    renderCrudWithBatchBar({ selectionPath: 'nobody.published.anything.here' });

    expect(screen.queryByTestId('bar')).toBeNull();
  });

  it('ANDs the built-in non-empty gate with schema-level visible', async () => {
    renderCrudWithBatchBar({ visible: false });

    selectRow(0);
    await waitFor(() => expect(screen.getByText('Count: 1')).toBeTruthy());

    expect(screen.queryByTestId('bar')).toBeNull();
  });
});

describe('batch-bar count template matrix', () => {
  it('uses the i18n default count text when countTemplate is absent', async () => {
    renderCrudWithBatchBar({ clearTarget: undefined });

    selectRow(1);
    await waitFor(() => expect(screen.getByTestId('bar')).toBeTruthy());

    expect(screen.getByText('1 selected')).toBeTruthy();
  });

  it('interpolates ${count} in a custom countTemplate', async () => {
    renderCrudWithBatchBar({
      countTemplate: 'Picked ${count} rows',
      clearTarget: undefined,
    });

    selectRow(0);
    selectRow(1);
    await waitFor(() => expect(screen.getByTestId('bar')).toBeTruthy());

    expect(screen.getByText('Picked 2 rows')).toBeTruthy();
  });

  it('falls back to the raw count and warns once when the template fails to evaluate', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderCrudWithBatchBar({
      countTemplate: '${count.x.y} items',
      clearTarget: undefined,
    });

    selectRow(0);
    await waitFor(() => expect(screen.getByTestId('bar')).toBeTruthy());

    const countText = () =>
      screen
        .getByTestId('bar')
        .querySelector('[data-slot="batch-bar-count"]')?.textContent;
    expect(countText()).toBe('1');
    const templateWarns = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('batch-bar-count-expr'),
    );
    expect(templateWarns.length).toBe(1);

    selectRow(1);
    await waitFor(() => expect(countText()).toBe('2'));
    const templateWarnsAfter = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('batch-bar-count-expr'),
    );
    expect(templateWarnsAfter.length).toBe(1);
    warnSpy.mockRestore();
  });
});

describe('batch-bar clear handle resolution matrix', () => {
  it('omits the clear button when clearTarget is not declared', async () => {
    renderCrudWithBatchBar({ clearTarget: undefined });

    selectRow(0);
    await waitFor(() => expect(screen.getByTestId('bar')).toBeTruthy());

    expect(screen.queryByTestId('bar-clear')).toBeNull();
  });

  it('clears a crud selection through the unified clearSelection handle', async () => {
    renderCrudWithBatchBar();

    selectRow(0);
    await waitFor(() => expect(screen.getByTestId('bar')).toBeTruthy());

    fireEvent.click(screen.getByTestId('bar-clear'));

    await waitFor(() => {
      expect(screen.queryByTestId('bar')).toBeNull();
      expect(screen.getByText('Count: 0')).toBeTruthy();
    });
  });

  it('no-ops and warns once when the clear target does not exist', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderCrudWithBatchBar({ clearTarget: 'no-such-component' });

    selectRow(0);
    await waitFor(() => expect(screen.getByTestId('bar')).toBeTruthy());

    fireEvent.click(screen.getByTestId('bar-clear'));
    await waitFor(() => expect(screen.getByText('Count: 1')).toBeTruthy());

    const targetWarns = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('batch-bar-target-invalid'),
    );
    expect(targetWarns.length).toBe(1);

    fireEvent.click(screen.getByTestId('bar-clear'));
    await waitFor(() => expect(screen.getByText('Count: 1')).toBeTruthy());
    const targetWarnsAfter = warnSpy.mock.calls.filter((call) =>
      String(call[0]).includes('batch-bar-target-invalid'),
    );
    expect(targetWarnsAfter.length).toBe(1);
    warnSpy.mockRestore();
  });
});

describe('batch-bar actions region', () => {
  it('renders declared actions and keeps $crud bindings reachable inside the bar scope', async () => {
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://data/batch-bar-actions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'actions-crud',
              selection: {},
              source: [
                { id: '1', name: 'Alice' },
                { id: '2', name: 'Bob' },
              ],
              toolbar: [
                {
                  type: 'batch-bar',
                  testid: 'bar',
                  selectionPath: '$crud.selectedRowKeys',
                  actions: [
                    {
                      type: 'button',
                      label: 'Bulk delete',
                      testid: 'bar-bulk-delete',
                      disabled: '${!$crud.hasSelection}',
                    },
                  ],
                },
              ],
              columns: [{ name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Bulk delete' })).toBeNull();

    selectRow(0);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bulk delete' })).toBeTruthy(),
    );
    expect(
      screen.getByRole('button', { name: 'Bulk delete' }).hasAttribute('disabled'),
    ).toBe(false);
    expect(screen.getByTestId('bar').getAttribute('data-slot')).toBe('batch-bar');
  });
});

describe('batch-bar schema validation', () => {
  it('requires selectionPath', () => {
    const emitted: any[] = [];
    validateBatchBarSchema({
      schema: { type: 'batch-bar' },
      path: 'body[0]',
      emit: (d: unknown) => emitted.push(d),
    } as unknown as RendererSchemaValidationContext<any>);

    expect(emitted).toEqual([
      expect.objectContaining({
        code: 'missing-required-field',
        path: '/body/0/selectionPath',
      }),
    ]);
  });

  it('rejects non-string field shapes', () => {
    const emitted: any[] = [];
    validateBatchBarSchema({
      schema: {
        type: 'batch-bar',
        selectionPath: 42,
        countTemplate: true,
        clearTarget: {},
      },
      path: 'body[0]',
      emit: (d: unknown) => emitted.push(d),
    } as unknown as RendererSchemaValidationContext<any>);

    expect(emitted).toEqual([
      expect.objectContaining({ code: 'invalid-property-shape', path: '/body/0/selectionPath' }),
      expect.objectContaining({ code: 'invalid-property-shape', path: '/body/0/countTemplate' }),
      expect.objectContaining({ code: 'invalid-property-shape', path: '/body/0/clearTarget' }),
    ]);
  });
});
