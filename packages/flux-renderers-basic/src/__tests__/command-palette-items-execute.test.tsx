import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => cleanup());

function renderSchema(schema: unknown, envOverride?: Partial<RendererEnv>) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://command-palette-items"
      schema={schema as any}
      env={{ ...env, ...envOverride }}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function queryPalette(testid = 'cmdk') {
  return document.querySelector(`[data-testid="${testid}"]`) as HTMLElement | null;
}

function queryItems() {
  return Array.from(document.querySelectorAll('[data-slot="command-item"]'));
}

function itemLabels() {
  return queryItems().map((item) => item.textContent ?? '');
}

function queryGroups() {
  return Array.from(document.querySelectorAll('[data-slot="command-group"]'));
}

function queryEmpty() {
  return document.querySelector('[data-slot="command-empty"]');
}

const OPEN_PALETTE = {
  type: 'command-palette',
  id: 'items-palette',
  testid: 'cmdk',
  defaultOpen: true,
};

describe('command-palette items dual-track matrix', () => {
  it('clusters flat items by their group field under headings, first-seen order', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          ...OPEN_PALETTE,
          items: [
            { id: 'n1', label: 'Nav One', group: 'Navigation' },
            { id: 'a1', label: 'Action One', group: 'Actions' },
            { id: 'n2', label: 'Nav Two', group: 'Navigation' },
            { id: 'u1', label: 'Ungrouped One' },
          ],
        },
      ],
    });
    await waitFor(() => expect(queryItems()).toHaveLength(4));
    const groups = queryGroups();
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const headings = Array.from(
      document.querySelectorAll('[cmdk-group-heading]'),
    ).map((h) => h.textContent);
    expect(headings).toEqual(['Navigation', 'Actions']);
    expect(itemLabels()).toEqual(['Nav One', 'Nav Two', 'Action One', 'Ungrouped One']);
  });

  it('renders explicit groups (labelled sections) before flat items', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          ...OPEN_PALETTE,
          groups: [
            { label: 'Suggestions', items: [{ id: 's1', label: 'Suggestion One' }] },
          ],
          items: [{ id: 'f1', label: 'Flat One' }],
        },
      ],
    });
    await waitFor(() => expect(queryItems()).toHaveLength(2));
    const headings = Array.from(
      document.querySelectorAll('[cmdk-group-heading]'),
    ).map((h) => h.textContent);
    expect(headings).toEqual(['Suggestions']);
    expect(itemLabels()).toEqual(['Suggestion One', 'Flat One']);
  });

  it('renders item description, shortcut, and lucide icon affordances', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          ...OPEN_PALETTE,
          items: [
            {
              id: 'rich',
              label: 'Rich Item',
              description: 'Does something useful',
              shortcut: '⌘N',
              icon: 'star',
            },
          ],
        },
      ],
    });
    await waitFor(() => expect(queryItems()).toHaveLength(1));
    expect(screen.getByText('Does something useful')).toBeTruthy();
    expect(screen.getByText('⌘N')).toBeTruthy();
    expect(document.querySelector('[data-slot="command-shortcut"]')).toBeTruthy();
    expect(document.querySelector('svg')).toBeTruthy();
  });

  it('source track appends items after static sections (expression form)', async () => {
    renderSchema({
      type: 'page',
      data: {
        remoteCommands: [
          { id: 'r1', label: 'Remote One' },
          { id: 'r2', label: 'Remote Two' },
        ],
      },
      body: [
        {
          ...OPEN_PALETTE,
          groups: [
            { label: 'Static', items: [{ id: 's1', label: 'Static One' }] },
          ],
          source: '${remoteCommands}',
        },
      ],
    });
    await waitFor(() => expect(itemLabels()).toEqual(['Static One', 'Remote One', 'Remote Two']));
  });

  it('source track resolves a SourceSchema and renders fetched items (happy path)', async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { status: 0, data: [{ id: 'f1', label: 'Fetched One' }] };
    }) as unknown as RendererEnv['fetcher'];
    renderSchema(
      {
        type: 'page',
        body: [
          {
            ...OPEN_PALETTE,
            source: {
              type: 'source',
              action: 'ajax',
              args: { url: '/r/Commands' },
            },
          },
        ],
      },
      { fetcher },
    );
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    await waitFor(() => expect(itemLabels()).toEqual(['Fetched One']));
    expect(queryEmpty()).toBeNull();
  });

  it('a failing source degrades to the empty state without breaking the panel (palette-empty)', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('endpoint down');
    }) as unknown as RendererEnv['fetcher'];
    renderSchema(
      {
        type: 'page',
        body: [
          {
            ...OPEN_PALETTE,
            emptyText: 'Source unavailable',
            source: {
              type: 'source',
              action: 'ajax',
              args: { url: '/r/Commands' },
            },
          },
        ],
      },
      { fetcher },
    );
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    await waitFor(() => expect(queryEmpty()?.textContent).toBe('Source unavailable'));
    expect(queryItems()).toHaveLength(0);
  });

  it('an empty source shows the empty state (palette-empty)', async () => {
    renderSchema({
      type: 'page',
      data: { noCommands: [] },
      body: [
        {
          ...OPEN_PALETTE,
          source: '${noCommands}',
        },
      ],
    });
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    await waitFor(() => expect(queryEmpty()).not.toBeNull());
  });

  it('degraded items render without breaking the list: missing label falls back, non-object entries are skipped (palette-item-invalid)', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          ...OPEN_PALETTE,
          items: [
            { id: 'no-label' },
            { label: 'No Id' },
            'garbage-string' as unknown as Record<string, unknown>,
            null as unknown as Record<string, unknown>,
            { id: 'ok', label: 'Ok Item' },
          ],
        },
      ],
    });
    await waitFor(() => expect(queryItems()).toHaveLength(3));
    expect(itemLabels()).toEqual(['no-label', 'No Id', 'Ok Item']);
  });
});

describe('command-palette filter, keyboard, and empty state', () => {
  const FILTERED = {
    ...OPEN_PALETTE,
    emptyText: 'Nothing here',
    items: [
      { id: 'alpha', label: 'Alpha' },
      { id: 'beta', label: 'Beta' },
      { id: 'alphabet', label: 'Alphabet' },
    ],
  };

  it('built-in filter narrows by label, shows the empty state on no match, and restores on clear', async () => {
    renderSchema({ type: 'page', body: [FILTERED] });
    await waitFor(() => expect(queryItems()).toHaveLength(3));
    const input = document.querySelector('input[data-slot="command-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'alp' } });
    await waitFor(() => expect(itemLabels()).toEqual(['Alpha', 'Alphabet']));
    fireEvent.change(input, { target: { value: 'zzz' } });
    await waitFor(() => expect(queryEmpty()).not.toBeNull());
    expect(queryEmpty()?.textContent).toBe('Nothing here');
    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() => expect(queryItems()).toHaveLength(3));
    expect(queryEmpty()).toBeNull();
  });

  it('emptyText defaults to the i18n no-results message', async () => {
    renderSchema({ type: 'page', body: [{ ...OPEN_PALETTE, items: [] }] });
    await waitFor(() => expect(queryEmpty()).not.toBeNull());
    expect(queryEmpty()?.textContent).toBe('未找到结果');
  });

  it('placeholder defaults to the i18n search message and is schema-overridable', async () => {
    renderSchema({
      type: 'page',
      body: [{ ...OPEN_PALETTE, placeholder: 'Type a command…', items: [] }],
    });
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    const input = document.querySelector('input[data-slot="command-input"]') as HTMLInputElement;
    expect(input.getAttribute('placeholder')).toBe('Type a command…');
  });

  it('ArrowDown moves the data-selected focus pointer and Enter executes the selected item', async () => {
    renderSchema({
      type: 'page',
      body: [FILTERED],
    });
    await waitFor(() => expect(queryItems()).toHaveLength(3));
    const input = document.querySelector('input[data-slot="command-input"]') as HTMLInputElement;
    const selected = () => document.querySelector('[cmdk-item][data-selected="true"]');
    expect(selected()?.textContent).toContain('Alpha');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => expect(selected()?.textContent).toContain('Beta'));
    fireEvent.keyDown(input, { key: 'Enter' });
    // cmdk Enter triggers the selected item's onSelect → the palette closes
    // (面板即关). The dispatched onCommand chain for a plain item without
    // `action`/`onCommand` schema is a no-op — close alone is the assertion.
    await waitFor(() => expect(queryPalette()).toBeNull());
  });

  it('shouldFilter: false keeps all items visible regardless of the query (external filtering candidate)', async () => {
    renderSchema({
      type: 'page',
      body: [{ ...FILTERED, shouldFilter: false }],
    });
    await waitFor(() => expect(queryItems()).toHaveLength(3));
    const input = document.querySelector('input[data-slot="command-input"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'zzz' } });
    await waitFor(() => expect(queryItems()).toHaveLength(3));
  });
});

describe('command-palette execution contract (dual-track, close-then-dispatch)', () => {
  it('clicking an item closes first (onClose), then dispatches item.action with ${id} resolved, then fires onCommand with the payload', async () => {
    const fetcher = vi.fn(async () => ({ status: 0, data: null })) as unknown as RendererEnv['fetcher'];
    renderSchema(
      {
        type: 'page',
        data: { executedId: '', closedSeen: '' },
        body: [
          {
            type: 'command-palette',
            id: 'exec-palette',
            testid: 'cmdk',
            defaultOpen: true,
            onClose: [{ action: 'setValue', args: { path: 'closedSeen', value: 'closed' } }],
            items: [
              {
                id: 'nav',
                label: 'Navigate Item',
                action: { action: 'ajax', args: { url: '/r/Executed?id=${id}' } },
              },
            ],
            onCommand: [{ action: 'setValue', args: { path: 'executedId', value: '${id}' } }],
          },
          {
            type: 'text',
            text: 'executed=${executedId} closed=${closedSeen}',
            testid: 'probe',
          },
        ],
      },
      { fetcher },
    );

    await waitFor(() => expect(queryItems()).toHaveLength(1));
    fireEvent.click(queryItems()[0]!);

    // 面板即关: the palette is gone…
    await waitFor(() => expect(queryPalette()).toBeNull());
    // …onClose ran (close first)…
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toContain('closed=closed'));
    // …onCommand payload resolved ${id}…
    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toContain('executed=nav'),
    );
    // …and the item.action ajax branch really dispatched through the fetcher
    // with the ${id} template resolved (23-01: this assertion dies if the
    // dispatch branch is deleted).
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    expect((vi.mocked(fetcher).mock.calls[0]?.[0] as { url?: string }).url).toBe(
      '/r/Executed?id=nav',
    );
  });

  it('locks the close-then-dispatch order: onClose ajax → item.action ajax (${id} resolved) → onCommand ajax', async () => {
    const fetcher = vi.fn(async () => ({ status: 0, data: null })) as unknown as RendererEnv['fetcher'];
    renderSchema(
      {
        type: 'page',
        body: [
          {
            type: 'command-palette',
            id: 'exec-order-palette',
            testid: 'cmdk',
            defaultOpen: true,
            onClose: [{ action: 'ajax', args: { url: '/r/Closed' } }],
            items: [
              {
                id: 'nav',
                label: 'Navigate Item',
                action: { action: 'ajax', args: { url: '/r/Executed?id=${id}' } },
              },
            ],
            onCommand: [{ action: 'ajax', args: { url: '/r/Command?id=${id}' } }],
          },
        ],
      },
      { fetcher },
    );

    await waitFor(() => expect(queryItems()).toHaveLength(1));
    fireEvent.click(queryItems()[0]!);

    // All three channels ride the same fetcher spy, so a single array
    // equality locks the documented close-then-dispatch order.
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    const urls = vi
      .mocked(fetcher)
      .mock.calls.map((call) => (call[0] as { url?: string }).url);
    expect(urls).toEqual(['/r/Closed', '/r/Executed?id=nav', '/r/Command?id=nav']);
  });

  it('an item without static action still fires onCommand; groupId carries the section heading', async () => {
    renderSchema({
      type: 'page',
      data: { executedId: '', executedGroup: '' },
      body: [
        {
          type: 'command-palette',
          id: 'exec-palette-2',
          testid: 'cmdk',
          defaultOpen: true,
          items: [{ id: 'grouped', label: 'Grouped Item', group: 'Tools' }],
          onCommand: [
            {
              action: 'setValue',
              args: { path: 'executedId', value: '${id}' },
            },
            {
              action: 'setValue',
              args: { path: 'executedGroup', value: '${groupId}' },
            },
          ],
        },
        {
          type: 'text',
          text: 'executed=${executedId} group=${executedGroup}',
          testid: 'probe',
        },
      ],
    });

    await waitFor(() => expect(queryItems()).toHaveLength(1));
    fireEvent.click(queryItems()[0]!);
    await waitFor(() => expect(queryPalette()).toBeNull());
    await waitFor(() => {
      const probe = screen.getByTestId('probe').textContent ?? '';
      expect(probe).toContain('executed=grouped');
      expect(probe).toContain('group=Tools');
    });
  });

  it('keyboard Enter on a selected item executes it (close + payload)', async () => {
    renderSchema({
      type: 'page',
      data: { executedId: '' },
      body: [
        {
          type: 'command-palette',
          id: 'exec-palette-3',
          testid: 'cmdk',
          defaultOpen: true,
          items: [
            { id: 'first', label: 'First Item' },
            { id: 'second', label: 'Second Item' },
          ],
          onCommand: [{ action: 'setValue', args: { path: 'executedId', value: '${id}' } }],
        },
        { type: 'text', text: 'executed=${executedId}', testid: 'probe' },
      ],
    });

    await waitFor(() => expect(queryItems()).toHaveLength(2));
    const input = document.querySelector('input[data-slot="command-input"]') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      const selected = document.querySelector('[cmdk-item][data-selected="true"]');
      expect(selected?.textContent).toContain('Second Item');
    });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(queryPalette()).toBeNull());
    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toContain('executed=second'),
    );
  });

  it('disabled items render disabled, are skipped by arrow selection, and do not execute on click', async () => {
    renderSchema({
      type: 'page',
      data: { executedId: '' },
      body: [
        {
          type: 'command-palette',
          id: 'exec-palette-4',
          testid: 'cmdk',
          defaultOpen: true,
          items: [
            { id: 'off', label: 'Off Item', disabled: true },
            { id: 'on', label: 'On Item' },
          ],
          onCommand: [{ action: 'setValue', args: { path: 'executedId', value: '${id}' } }],
        },
        { type: 'text', text: 'executed=${executedId}', testid: 'probe' },
      ],
    });

    await waitFor(() => expect(queryItems()).toHaveLength(2));
    const disabledItem = queryItems().find((item) => item.textContent === 'Off Item');
    expect(disabledItem?.getAttribute('data-disabled')).toBe('true');
    fireEvent.click(disabledItem!);
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    expect(screen.getByTestId('probe').textContent).toBe('executed=');

    const input = document.querySelector('input[data-slot="command-input"]') as HTMLInputElement;
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await waitFor(() => {
      const selected = document.querySelector('[cmdk-item][data-selected="true"]');
      expect(selected?.textContent).toContain('On Item');
    });
  });
});
