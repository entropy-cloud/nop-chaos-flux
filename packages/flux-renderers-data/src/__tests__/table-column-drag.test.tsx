import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

const schemaBase = {
  type: 'page',
  body: [
    {
      type: 'table',
      columnSettings: { enabled: true, overlay: false, align: 'left' as const },
      columns: [
        { label: 'Name', name: 'name' },
        { label: 'Email', name: 'email' },
        { label: 'Role', name: 'role' },
      ],
      source: [{ id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' }],
    },
  ],
};

function openInlinePanel(draggable: boolean) {
  const SchemaRenderer = createDataSchemaRenderer();
  const schema = JSON.parse(
    JSON.stringify({
      ...schemaBase,
      body: [{ ...schemaBase.body[0], columnSettings: { ...schemaBase.body[0].columnSettings, draggable } }],
    }),
  );
  render(
    <SchemaRenderer schemaUrl="test://data/table-column-drag" schema={schema} env={env} formulaCompiler={formulaCompiler} />,
  );
  fireEvent.click(screen.getByRole('button', { name: t('flux.table.columns') }));
  return waitFor(() => {
    const panel = document.querySelector('[data-slot="table-column-settings-inline"]') as HTMLElement;
    expect(panel).toBeTruthy();
    return panel!;
  });
}

function headerLabels() {
  return Array.from(document.querySelectorAll('.nop-table thead th')).map(
    (th) => th.textContent?.trim(),
  );
}

describe('table column drag reorder (L4.11a)', () => {
  it('reorders columns via the drag handle and the ordered state channel', async () => {
    const panel = await openInlinePanel(true);

    const handles = panel.querySelectorAll('[data-slot="table-column-settings-drag-handle"]');
    expect(handles.length).toBe(3);
    const nameHandle = handles[0] as HTMLElement;
    const roleRow = panel.querySelectorAll('[data-slot="table-column-settings-item"]')[2] as HTMLElement;

    fireEvent.dragStart(nameHandle, {
      dataTransfer: { setData: (_type: string, _value: string) => {}, effectAllowed: '' },
    });
    fireEvent.dragOver(roleRow, { dataTransfer: { getData: () => 'name', dropEffect: '' } });
    fireEvent.drop(roleRow, {
      dataTransfer: { getData: () => 'name' },
    });

    await waitFor(() => {
      expect(headerLabels()).toEqual(['Email', 'Role', 'Name']);
    });
  });

  it('does not render drag handles when columnSettings.draggable is unset', async () => {
    const panel = await openInlinePanel(false);
    expect(
      panel.querySelectorAll('[data-slot="table-column-settings-drag-handle"]').length,
    ).toBe(0);
  });
});

describe('table column drag reorder — overlay form (QA.1-L4 Minor-2)', () => {
  it('renders drag handles inside the menu content and reorders on drop', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://data/table-column-drag-overlay"
        schema={{
          type: 'page',
          body: [
            {
              type: 'table',
              columnSettings: { enabled: true, overlay: true, draggable: true },
              columns: [
                { label: 'Name', name: 'name' },
                { label: 'Email', name: 'email' },
                { label: 'Role', name: 'role' },
              ],
              source: [{ id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: t('flux.table.columns') }));
    const handles = await waitFor(() => {
      const found = document.querySelectorAll('[data-slot="table-column-settings-drag-handle"]');
      expect(found.length).toBe(3);
      return found;
    });

    const nameHandle = handles[0] as HTMLElement;
    const roleRow = Array.from(
      document.querySelectorAll('[data-slot="table-column-settings-item"]'),
    )[2] as HTMLElement;

    fireEvent.dragStart(nameHandle, { dataTransfer: { setData: () => {}, effectAllowed: '' } });
    fireEvent.dragOver(roleRow, { dataTransfer: { getData: () => 'name', dropEffect: '' } });
    fireEvent.drop(roleRow, { dataTransfer: { getData: () => 'name' } });

    await waitFor(() => {
      expect(headerLabels()).toEqual(['Email', 'Role', 'Name']);
    });
  });
});
