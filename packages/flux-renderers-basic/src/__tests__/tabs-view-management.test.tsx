import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// G-C view-collection management contract matrix (owner plan
// 2026-08-31-0721-1). Locks: handle matrix (addTab/removeTab/renameTab/moveTab
// precondition + success + event dispatch), active-pointer migration on close,
// the three-sister dead-declaration wiring (closable/draggable/addable), the
// items ownership axis (local managed collection / scope write-back /
// controlled drop), and zero-regression when no flag is declared.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const itemsABC = [
  { key: 'a', title: 'A' },
  { key: 'b', title: 'B' },
  { key: 'c', title: 'C' },
];

function tabValues(scope: ParentNode = document): string[] {
  return Array.from(scope.querySelectorAll('[data-slot="tabs-trigger"]')).map(
    (el) => el.getAttribute('data-tab-value') ?? '',
  );
}

function activeProbeText(): string {
  return screen.getByTestId('active-probe').textContent ?? '';
}

function buildSchema(tabsOverrides: Record<string, unknown>, extraBody: unknown[] = []): any {
  return {
    type: 'page',
    body: [
      {
        type: 'tabs',
        id: 'view-tabs',
        statusPath: 'ui.tabsStatus',
        items: itemsABC,
        ...tabsOverrides,
      },
      ...extraBody,
      { type: 'text', testid: 'active-probe', text: 'active=${ui.tabsStatus?.activeValue}' },
    ],
  };
}

function renderSchema(schema: unknown, data: Record<string, unknown> = { ui: {} }) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://tabs/view-management"
      schema={schema as any}
      data={data}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function handleButton(label: string, method: string, args: Record<string, unknown>) {
  return {
    type: 'button',
    label,
    onClick: { action: `component:${method}`, componentId: 'view-tabs', args },
  };
}

describe('tabs view management — handle matrix', () => {
  it('addTab appends an item, fires onTabAdd with payload, and renders the new tab', async () => {
    renderSchema(
      buildSchema(
        {
          onTabAdd: { action: 'setValue', args: { path: 'ui.lastAdd', value: '${item.title}' } },
        },
        [
          handleButton('Do Add', 'addTab', { item: { key: 'd', title: 'D' } }),
          { type: 'text', testid: 'lastAdd-probe', text: 'lastAdd=${ui.lastAdd}' },
        ],
      ),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Do Add'));

    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c', 'd']));
    await waitFor(() => expect(screen.getByTestId('lastAdd-probe').textContent).toBe('lastAdd=D'));
  });

  it('addTab with an in-range index inserts at that position', async () => {
    renderSchema(
      buildSchema({}, [handleButton('Insert Mid', 'addTab', { item: { key: 'm', title: 'M' }, index: 1 })]),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Insert Mid'));

    await waitFor(() => expect(tabValues()).toEqual(['a', 'm', 'b', 'c']));
  });

  it('addTab generates a value when the item has none', async () => {
    renderSchema(buildSchema({}, [handleButton('Add Bare', 'addTab', { item: { title: 'Bare' } })]));
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Add Bare'));

    await waitFor(() => expect(tabValues()).toHaveLength(4));
    fireEvent.click(screen.getByRole('tab', { name: 'Bare' }));
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Bare' }).getAttribute('aria-selected')).toBe('true'));
  });

  it('addTab is refused under controlled items ownership (no change)', async () => {
    renderSchema(
      buildSchema({ itemsOwnership: 'controlled' }, [
        handleButton('Do Add', 'addTab', { item: { key: 'd', title: 'D' } }),
      ]),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Do Add'));

    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));
  });

  it('addTab without a title or label is refused (handle precondition)', async () => {
    renderSchema(buildSchema({}, [handleButton('Add Nameless', 'addTab', { item: {} })]));
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Add Nameless'));

    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));
  });

  it('removeTab removes by value and fires onTabClose with index and nextActiveValue payload', async () => {
    renderSchema(
      buildSchema(
        {
          onTabClose: {
            action: 'setValue',
            args: { path: 'ui.lastClose', value: '${value}:${index}:${nextActiveValue}' },
          },
        },
        [
          handleButton('Remove B', 'removeTab', { value: 'b' }),
          { type: 'text', testid: 'lastClose-probe', text: 'lastClose=${ui.lastClose}' },
        ],
      ),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Remove B'));

    await waitFor(() => expect(tabValues()).toEqual(['a', 'c']));
    await waitFor(() => expect(screen.getByTestId('lastClose-probe').textContent).toBe('lastClose=b:1:a'));
  });

  it('removeTab with an unknown value is a no-op and fires no event', async () => {
    renderSchema(
      buildSchema(
        {
          onTabClose: { action: 'setValue', args: { path: 'ui.lastClose', value: '${value}' } },
        },
        [
          handleButton('Remove Ghost', 'removeTab', { value: 'ghost' }),
          { type: 'text', testid: 'lastClose-probe', text: 'lastClose=${ui.lastClose}' },
        ],
      ),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Remove Ghost'));

    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));
    expect(screen.getByTestId('lastClose-probe').textContent).toBe('lastClose=');
  });

  it('removeTab refuses to remove the last remaining tab (last-tab guard)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderSchema(
      buildSchema({ items: [{ key: 'only', title: 'Only' }] }, [
        handleButton('Remove Only', 'removeTab', { value: 'only' }),
      ]),
    );
    await waitFor(() => expect(tabValues()).toEqual(['only']));

    fireEvent.click(screen.getByText('Remove Only'));

    await waitFor(() => expect(tabValues()).toEqual(['only']));
    expect(activeProbeText()).toBe('active=only');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('tabs-remove-last'));
  });

  it('renameTab renames in place and fires onTabRename', async () => {
    renderSchema(
      buildSchema(
        {
          onTabRename: {
            action: 'setValue',
            args: { path: 'ui.lastRename', value: '${value}:${title}' },
          },
        },
        [
          handleButton('Rename B', 'renameTab', { value: 'b', title: 'Beta' }),
          { type: 'text', testid: 'lastRename-probe', text: 'lastRename=${ui.lastRename}' },
        ],
      ),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Rename B'));

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Beta' })).toBeTruthy());
    await waitFor(() =>
      expect(screen.getByTestId('lastRename-probe').textContent).toBe('lastRename=b:Beta'),
    );
  });

  it('renameTab with an unknown value is a no-op', async () => {
    renderSchema(
      buildSchema({}, [handleButton('Rename Ghost', 'renameTab', { value: 'ghost', title: 'X' })]),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Rename Ghost'));

    await waitFor(() => expect(screen.getByRole('tab', { name: 'B' })).toBeTruthy());
  });

  it('renameTab with a blank title is a no-op', async () => {
    renderSchema(
      buildSchema({}, [handleButton('Rename Empty', 'renameTab', { value: 'b', title: '  ' })]),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Rename Empty'));

    await waitFor(() => expect(screen.getByRole('tab', { name: 'B' })).toBeTruthy());
  });

  it('moveTab reorders and fires onTabMove with fromIndex/toIndex', async () => {
    renderSchema(
      buildSchema(
        {
          onTabMove: {
            action: 'setValue',
            args: { path: 'ui.lastMove', value: '${value}:${fromIndex}:${toIndex}' },
          },
        },
        [
          handleButton('Move A Last', 'moveTab', { value: 'a', toIndex: 2 }),
          { type: 'text', testid: 'lastMove-probe', text: 'lastMove=${ui.lastMove}' },
        ],
      ),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Move A Last'));

    await waitFor(() => expect(tabValues()).toEqual(['b', 'c', 'a']));
    await waitFor(() =>
      expect(screen.getByTestId('lastMove-probe').textContent).toBe('lastMove=a:0:2'),
    );
  });

  it('moveTab clamps an out-of-range toIndex to the last position', async () => {
    renderSchema(buildSchema({}, [handleButton('Move A Far', 'moveTab', { value: 'a', toIndex: 99 })]));
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Move A Far'));

    await waitFor(() => expect(tabValues()).toEqual(['b', 'c', 'a']));
  });

  it('moveTab with an unknown value is a no-op', async () => {
    renderSchema(buildSchema({}, [handleButton('Move Ghost', 'moveTab', { value: 'ghost', toIndex: 0 })]));
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Move Ghost'));

    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));
  });
});

describe('tabs view management — active pointer migration matrix', () => {
  it('removing the active middle tab migrates active to nearest-right', async () => {
    renderSchema(
      buildSchema({ defaultValue: 'b' }, [handleButton('Remove B', 'removeTab', { value: 'b' })]),
    );
    await waitFor(() => expect(activeProbeText()).toBe('active=b'));

    fireEvent.click(screen.getByText('Remove B'));

    await waitFor(() => expect(activeProbeText()).toBe('active=c'));
    expect(tabValues()).toEqual(['a', 'c']);
  });

  it('removing the active last tab migrates active to nearest-left', async () => {
    renderSchema(
      buildSchema({ defaultValue: 'c' }, [handleButton('Remove C', 'removeTab', { value: 'c' })]),
    );
    await waitFor(() => expect(activeProbeText()).toBe('active=c'));

    fireEvent.click(screen.getByText('Remove C'));

    await waitFor(() => expect(activeProbeText()).toBe('active=b'));
    expect(tabValues()).toEqual(['a', 'b']);
  });

  it('removing a non-active tab keeps the active pointer', async () => {
    renderSchema(
      buildSchema({ defaultValue: 'b' }, [handleButton('Remove A', 'removeTab', { value: 'a' })]),
    );
    await waitFor(() => expect(activeProbeText()).toBe('active=b'));

    fireEvent.click(screen.getByText('Remove A'));

    await waitFor(() => expect(activeProbeText()).toBe('active=b'));
    expect(tabValues()).toEqual(['b', 'c']);
  });
});

describe('tabs view management — dead-declaration wiring and compatibility', () => {
  it('without any management flag the DOM has zero management affordances (compat)', async () => {
    const { container } = renderSchema(buildSchema({}));
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));
    expect(container.querySelectorAll('[data-slot="tabs-trigger-close"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-slot="tabs-trigger-add"]')).toHaveLength(0);
    expect(container.querySelector('[data-slot="tabs-trigger"][draggable="true"]')).toBeNull();
  });

  it('closable renders a close affordance on every tab except the last; clicking removes', async () => {
    renderSchema(buildSchema({ closable: true }));
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    const closeButtons = document.querySelectorAll('[data-slot="tabs-trigger-close"]');
    expect(closeButtons).toHaveLength(2);

    fireEvent.click(closeButtons[0]!);

    await waitFor(() => expect(tabValues()).toEqual(['b', 'c']));
    expect(document.querySelectorAll('[data-slot="tabs-trigger-close"]')).toHaveLength(1);
  });

  it('item-level closable: true opts a tab in when tabs-level is off', async () => {
    const { container } = renderSchema(
      buildSchema({
        closable: false,
        items: [
          { key: 'a', title: 'A', closable: true },
          { key: 'b', title: 'B' },
        ],
      }),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b']));
    expect(container.querySelectorAll('[data-slot="tabs-trigger-close"]')).toHaveLength(1);
    const owner = container
      .querySelectorAll('[data-slot="tabs-trigger-close"]')[0]!
      .closest('[data-slot="tabs-trigger"]');
    expect(owner?.getAttribute('data-tab-value')).toBe('a');
  });

  it('item-level closable: false opts a tab out; the last item shows no close (last guard)', async () => {
    const { container } = renderSchema(
      buildSchema({
        closable: true,
        items: [
          { key: 'a', title: 'A', closable: false },
          { key: 'b', title: 'B' },
          { key: 'c', title: 'C' },
        ],
      }),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));
    expect(container.querySelectorAll('[data-slot="tabs-trigger-close"]')).toHaveLength(1);
    const owner = container
      .querySelectorAll('[data-slot="tabs-trigger-close"]')[0]!
      .closest('[data-slot="tabs-trigger"]');
    expect(owner?.getAttribute('data-tab-value')).toBe('b');
  });

  it('addable renders a trailing add trigger; clicking appends without auto-activation', async () => {
    renderSchema(
      buildSchema(
        {
          addable: true,
          onTabAdd: { action: 'setValue', args: { path: 'ui.lastAdd', value: '${item.title}' } },
        },
        [{ type: 'text', testid: 'lastAdd-probe', text: 'lastAdd=${ui.lastAdd}' }],
      ),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(document.querySelector('[data-slot="tabs-trigger-add"]')!);

    await waitFor(() => expect(tabValues()).toHaveLength(4));
    expect(activeProbeText()).toBe('active=a');
    await waitFor(() => expect(screen.getByTestId('lastAdd-probe').textContent).toBe('lastAdd=新视图'));
  });

  it('draggable reorders via native drag events through the moveTab channel', async () => {
    const dataTransfer = { setData: vi.fn(), getData: vi.fn() };
    renderSchema(buildSchema({ draggable: true }));
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    const triggerA = document.querySelector('[data-slot="tabs-trigger"][data-tab-value="a"]')!;
    const triggerC = document.querySelector('[data-slot="tabs-trigger"][data-tab-value="c"]')!;
    fireEvent.dragStart(triggerA, { dataTransfer });
    fireEvent.dragOver(triggerC, { dataTransfer });
    fireEvent.drop(triggerC, { dataTransfer });

    await waitFor(() => expect(tabValues()).toEqual(['b', 'c', 'a']));
  });
});

describe('tabs view management — items ownership axis', () => {
  it('scope ownership writes collection mutations back to itemsStatePath', async () => {
    renderSchema(
      buildSchema(
        {
          items: '${ui.viewItems}',
          itemsOwnership: 'scope',
          itemsStatePath: 'ui.viewItems',
        },
        [
          handleButton('Remove B', 'removeTab', { value: 'b' }),
          { type: 'text', testid: 'len-probe', text: 'len=${ui.viewItems?.length}' },
        ],
      ),
      { ui: { viewItems: itemsABC } },
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));
    expect(screen.getByTestId('len-probe').textContent).toBe('len=3');

    fireEvent.click(screen.getByText('Remove B'));

    await waitFor(() => expect(tabValues()).toEqual(['a', 'c']));
    await waitFor(() => expect(screen.getByTestId('len-probe').textContent).toBe('len=2'));
  });

  it('local managed collection survives an unrelated schema items change (no re-seed after mutation)', async () => {
    renderSchema(
      buildSchema({ items: '${ui.tabItems}' }, [
        handleButton('Remove B', 'removeTab', { value: 'b' }),
        {
          type: 'button',
          label: 'Mutate Source',
          onClick: {
            action: 'setValue',
            args: {
              path: 'ui.tabItems',
              value: [
                { key: 'a', title: 'A' },
                { key: 'b', title: 'B' },
                { key: 'c', title: 'C' },
                { key: 'z', title: 'Z' },
              ],
            },
          },
        },
      ]),
      { ui: { tabItems: itemsABC } },
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Remove B'));
    await waitFor(() => expect(tabValues()).toEqual(['a', 'c']));

    fireEvent.click(screen.getByText('Mutate Source'));
    await waitFor(() => expect(activeProbeText()).toBe('active=a'));
    expect(tabValues()).toEqual(['a', 'c']);
  });
});
