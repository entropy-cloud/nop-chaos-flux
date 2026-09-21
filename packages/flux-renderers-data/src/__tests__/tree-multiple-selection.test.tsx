import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => {
  cleanup();
});

function renderTree(multiple: boolean, url: string) {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl={url}
      schema={{
        type: 'page',
        body: [
          {
            type: 'tree',
            data: '${nodes}',
            multiple,
            initiallyExpanded: true,
          },
        ],
      }}
      data={{
        nodes: [
          { id: 'n1', label: 'Node 1' },
          { id: 'n2', label: 'Node 2' },
          { id: 'n3', label: 'Node 3' },
        ],
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function treeItem(label: string): HTMLElement {
  const row = Array.from(document.querySelectorAll('[data-slot="tree-node-row"]')).find((el) =>
    el.textContent?.includes(label),
  ) as HTMLElement;
  const item = row?.querySelector('[role="treeitem"]') as HTMLElement;
  if (!item) throw new Error(`no treeitem for ${label}`);
  return item;
}

/**
 * [G3-视角9-03] the schema advertises `multiple` (aria-multiselectable) —
 * this pins the backing multi-select behavior: click/Space toggle membership,
 * aria-selected/data-selected reflect the real selection in multiple mode,
 * and single mode keeps the legacy focus-mirroring shape.
 */
describe('[G3-视角9-03] tree multiple selection', () => {
  it('click toggles independent membership; multiple nodes can be selected', async () => {
    renderTree(true, 'test://data/tree-multiple-on');
    await waitFor(() => expect(screen.getByText('Node 1')).toBeTruthy());

    const item1 = treeItem('Node 1');
    const item2 = treeItem('Node 2');

    expect(item1.getAttribute('aria-selected')).toBe('false');

    fireEvent.click(item1);
    await waitFor(() => {
      expect(item1.getAttribute('aria-selected')).toBe('true');
      expect(item1.getAttribute('data-selected')).toBe('true');
    });

    fireEvent.click(item2);
    await waitFor(() => {
      expect(item2.getAttribute('aria-selected')).toBe('true');
      // independent membership: 1 stays selected
      expect(item1.getAttribute('aria-selected')).toBe('true');
    });

    fireEvent.click(item1);
    await waitFor(() => {
      expect(item1.getAttribute('aria-selected')).toBe('false');
      expect(item1.getAttribute('data-selected')).toBeNull();
      expect(item2.getAttribute('aria-selected')).toBe('true');
    });
  });

  it('Space toggles the focused node (keyboard parity)', async () => {
    renderTree(true, 'test://data/tree-multiple-keyboard');
    await waitFor(() => expect(screen.getByText('Node 1')).toBeTruthy());

    const item1 = treeItem('Node 1');
    item1.focus();
    fireEvent.keyDown(item1, { key: ' ' });
    await waitFor(() => {
      expect(item1.getAttribute('aria-selected')).toBe('true');
    });
    fireEvent.keyDown(item1, { key: ' ' });
    await waitFor(() => {
      expect(item1.getAttribute('aria-selected')).toBe('false');
    });
  });

  it('single mode keeps the legacy shape: aria-selected follows the focused node', async () => {
    renderTree(false, 'test://data/tree-multiple-off');
    await waitFor(() => expect(screen.getByText('Node 1')).toBeTruthy());

    const item1 = treeItem('Node 1');
    const item2 = treeItem('Node 2');
    fireEvent.click(item1);
    fireEvent.click(item2);
    await waitFor(() => {
      // single mode: the LAST clicked (focused) node reports selected=true,
      // the earlier one is deselected — the focus-mirroring behavior unchanged.
      expect(item2.getAttribute('aria-selected')).toBe('true');
      expect(item1.getAttribute('aria-selected')).toBe('false');
    });
  });
});
