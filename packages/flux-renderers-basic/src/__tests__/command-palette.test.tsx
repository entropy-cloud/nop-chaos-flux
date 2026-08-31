import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => cleanup());

function renderSchema(schema: unknown) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://command-palette"
      schema={schema as any}
      env={env}
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

describe('command-palette definition contracts', () => {
  it('registers with surface-family metadata, handle/event contracts, and the dual-track field set', async () => {
    const { basicRendererDefinitions } = await import('../index.js');
    const definition = basicRendererDefinitions.find((d) => d.type === 'command-palette');
    expect(definition).toBeTruthy();
    expect(definition?.category).toBe('layout');
    expect(definition?.displayName).toBe('Command Palette');
    expect(definition?.sourcePackage).toBe('@nop-chaos/flux-renderers-basic');
    expect(definition?.componentCapabilityContracts?.map((c) => c.handle)).toEqual([
      'open',
      'close',
      'toggle',
    ]);
    expect(Object.keys(definition?.eventContracts ?? {})).toEqual([
      'onOpen',
      'onClose',
      'onCommand',
    ]);
    const onCommandPayload = definition?.eventContracts?.onCommand?.payload as {
      fields: Record<string, unknown>;
    };
    expect(Object.keys(onCommandPayload.fields)).toEqual(['id', 'item', 'groupId']);

    const fieldKeys = definition?.fields?.map((f) => f.key);
    for (const key of [
      'items',
      'groups',
      'source',
      'placeholder',
      'shouldFilter',
      'emptyText',
      'hotkey',
      'open',
      'defaultOpen',
      'statusPath',
      'container',
      'closeOnEsc',
      'closeOnOutsideClick',
      'showMask',
      'onOpen',
      'onClose',
      'onCommand',
    ]) {
      expect(fieldKeys).toContain(key);
    }
    const sourceRule = definition?.fields?.find((f) => f.key === 'source');
    expect(sourceRule && 'allowSource' in sourceRule ? sourceRule.allowSource : undefined).toBe(
      true,
    );
    expect(Object.keys(definition?.propContracts ?? {}).sort()).toEqual(
      [
        'closeOnEsc',
        'closeOnOutsideClick',
        'emptyText',
        'hotkey',
        'placeholder',
        'shouldFilter',
        'showMask',
      ].sort(),
    );
  });
});

describe('command-palette open/close matrix', () => {
  it('renders nothing when closed by default', () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'command-palette',
          id: 'closed-palette',
          testid: 'cmdk',
          items: [{ id: 'a', label: 'Alpha' }],
        },
      ],
    });
    expect(queryPalette()).toBeNull();
    expect(queryItems()).toHaveLength(0);
  });

  it('renders open via defaultOpen with static items', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'command-palette',
          id: 'open-palette',
          testid: 'cmdk',
          defaultOpen: true,
          items: [
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
          ],
        },
      ],
    });
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    await waitFor(() => expect(queryItems()).toHaveLength(2));
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
  });

  it('component:open / component:close / component:toggle drive the palette by componentId', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'command-palette',
          id: 'handled-palette',
          testid: 'cmdk',
          items: [{ id: 'a', label: 'Alpha' }],
        },
        {
          type: 'button',
          label: 'OpenBtn',
          testid: 'open-btn',
          onClick: { action: 'component:open', componentId: 'handled-palette' },
        },
        {
          type: 'button',
          label: 'CloseBtn',
          testid: 'close-btn',
          onClick: { action: 'component:close', componentId: 'handled-palette' },
        },
        {
          type: 'button',
          label: 'ToggleBtn',
          testid: 'toggle-btn',
          onClick: { action: 'component:toggle', componentId: 'handled-palette' },
        },
      ],
    });

    expect(queryPalette()).toBeNull();
    fireEvent.click(screen.getByTestId('open-btn'));
    await waitFor(() => expect(queryPalette()).not.toBeNull());

    fireEvent.click(screen.getByTestId('close-btn'));
    await waitFor(() => expect(queryPalette()).toBeNull());

    fireEvent.click(screen.getByTestId('toggle-btn'));
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    fireEvent.click(screen.getByTestId('toggle-btn'));
    await waitFor(() => expect(queryPalette()).toBeNull());
  });

  it('handle open on an already-open palette is a skipped no-op', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'command-palette',
          id: 'idem-palette',
          testid: 'cmdk',
          defaultOpen: true,
          items: [{ id: 'a', label: 'Alpha' }],
        },
        {
          type: 'button',
          label: 'OpenBtn',
          testid: 'open-btn',
          onClick: { action: 'component:open', componentId: 'idem-palette' },
        },
      ],
    });
    await waitFor(() => expect(queryItems()).toHaveLength(1));
    // Skipped open keeps the palette open (still exactly one list).
    fireEvent.click(screen.getByTestId('open-btn'));
    await waitFor(() => expect(queryItems()).toHaveLength(1));
  });

  it('open expression (controlled) drives open and close; external value wins over handles', async () => {
    renderSchema({
      type: 'page',
      data: { cmdkOpen: false },
      body: [
        {
          type: 'command-palette',
          id: 'controlled-palette',
          testid: 'cmdk',
          open: '${cmdkOpen}',
          items: [{ id: 'a', label: 'Alpha' }],
        },
        {
          type: 'button',
          label: 'SetTrueBtn',
          testid: 'set-true-btn',
          onClick: { action: 'setValue', args: { path: 'cmdkOpen', value: true } },
        },
        {
          type: 'button',
          label: 'SetFalseBtn',
          testid: 'set-false-btn',
          onClick: { action: 'setValue', args: { path: 'cmdkOpen', value: false } },
        },
        {
          type: 'button',
          label: 'HandleOpenBtn',
          testid: 'handle-open-btn',
          onClick: { action: 'component:open', componentId: 'controlled-palette' },
        },
      ],
    });

    expect(queryPalette()).toBeNull();
    // External control wins: the handle is a no-op while the expression is false.
    fireEvent.click(screen.getByTestId('handle-open-btn'));
    await waitFor(() => expect(queryPalette()).toBeNull());

    fireEvent.click(screen.getByTestId('set-true-btn'));
    await waitFor(() => expect(queryPalette()).not.toBeNull());

    fireEvent.click(screen.getByTestId('set-false-btn'));
    await waitFor(() => expect(queryPalette()).toBeNull());
  });

  it('user close under controlled mode writes the open path back so an idempotent setValue(open, true) reopens (dialog plan-459 parity)', async () => {
    renderSchema({
      type: 'page',
      data: { cmdkOpen: true },
      body: [
        {
          type: 'command-palette',
          id: 'reopen-palette',
          testid: 'cmdk',
          open: '${cmdkOpen}',
          items: [{ id: 'a', label: 'Alpha' }],
        },
        {
          type: 'button',
          label: 'OpenAgainBtn',
          testid: 'open-again-btn',
          onClick: { action: 'setValue', args: { path: 'cmdkOpen', value: true } },
        },
      ],
    });

    await waitFor(() => expect(queryPalette()).not.toBeNull());

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(queryPalette()).toBeNull());

    // Idempotent reopen: the user close synced cmdkOpen=false into scope, so the
    // same setValue(true) flips false→true and the palette reopens.
    fireEvent.click(screen.getByTestId('open-again-btn'));
    await waitFor(() => expect(queryPalette()).not.toBeNull());
  });

  it('Esc closes and dispatches onClose with the surface payload resolvable in action args', async () => {
    const fetcher = vi.fn(async () => ({ status: 0, data: null })) as unknown as RendererEnv['fetcher'];
    const fetcherMock = vi.mocked(fetcher);
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://command-palette#esc-close"
        schema={{
          type: 'page',
          body: [
            {
              type: 'command-palette',
              id: 'esc-palette',
              testid: 'cmdk',
              defaultOpen: true,
              onClose: {
                action: 'ajax',
                args: { url: '/palette-close-${surfaceId}' },
              },
              items: [{ id: 'a', label: 'Alpha' }],
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(queryPalette()).not.toBeNull());
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(queryPalette()).toBeNull());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    const url = (fetcherMock.mock.calls[0]?.[0] as { url?: string } | undefined)?.url ?? '';
    expect(url).toMatch(/^\/palette-close-.+/);
    expect(url).not.toContain('${surfaceId}');
  });

  it('closeOnEsc: false suppresses the Esc close', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'command-palette',
          id: 'esc-suppressed',
          testid: 'cmdk',
          defaultOpen: true,
          closeOnEsc: false,
          items: [{ id: 'a', label: 'Alpha' }],
        },
      ],
    });
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() => expect(queryPalette()).not.toBeNull());
  });

  it('closeOnOutsideClick: false suppresses the outside-press close', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'command-palette',
          id: 'outside-suppressed',
          testid: 'cmdk',
          defaultOpen: true,
          closeOnOutsideClick: false,
          items: [{ id: 'a', label: 'Alpha' }],
        },
      ],
    });
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(queryPalette()).not.toBeNull());
  });

  it('hotkey opens an uncontrolled palette and the listener is removed on unmount', async () => {
    const { unmount } = renderSchema({
      type: 'page',
      body: [
        {
          type: 'command-palette',
          id: 'hotkey-palette',
          testid: 'cmdk',
          hotkey: 'mod+k',
          items: [{ id: 'a', label: 'Alpha' }],
        },
      ],
    });
    expect(queryPalette()).toBeNull();
    fireEvent.keyDown(window, { key: 'k', metaKey: true, ctrlKey: false });
    await waitFor(() => expect(queryPalette()).not.toBeNull());

    // Already open: hotkey does not close it (open-only channel).
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(queryPalette()).not.toBeNull());

    unmount();
    cleanup();
    renderSchema({
      type: 'page',
      body: [{ type: 'text', text: 'mounted', testid: 'after-unmount' }],
    });
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(queryPalette()).toBeNull();
    expect(screen.getByTestId('after-unmount')).toBeTruthy();
  });

  it('hotkey on a controlled palette is a no-op with a dev warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderSchema({
      type: 'page',
      data: { cmdkOpen: false },
      body: [
        {
          type: 'command-palette',
          id: 'hotkey-controlled',
          testid: 'cmdk',
          hotkey: 'mod+k',
          open: '${cmdkOpen}',
          items: [{ id: 'a', label: 'Alpha' }],
        },
      ],
    });
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(queryPalette()).toBeNull());
    expect(
      warnSpy.mock.calls.some((call) => String(call[0]).includes('hotkey')),
    ).toBe(true);
    warnSpy.mockRestore();
  });

  it('invalid hotkey string warns and binds nothing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'command-palette',
          id: 'hotkey-invalid',
          testid: 'cmdk',
          hotkey: 'mod+',
          items: [{ id: 'a', label: 'Alpha' }],
        },
      ],
    });
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => expect(queryPalette()).toBeNull());
    expect(
      warnSpy.mock.calls.some((call) => String(call[0]).includes('hotkey')),
    ).toBe(true);
    warnSpy.mockRestore();
  });

  it('statusPath publishes the open summary into scope', async () => {
    renderSchema({
      type: 'page',
      data: { paletteStatus: null },
      body: [
        {
          type: 'command-palette',
          id: 'status-palette',
          testid: 'cmdk',
          statusPath: 'paletteStatus',
          items: [{ id: 'a', label: 'Alpha' }],
        },
        {
          type: 'text',
          text: 'status-open=${paletteStatus?.open}',
          testid: 'status-probe',
        },
        {
          type: 'button',
          label: 'OpenBtn',
          testid: 'open-btn',
          onClick: { action: 'component:open', componentId: 'status-palette' },
        },
      ],
    });
    await waitFor(() =>
      expect(screen.getByTestId('status-probe').textContent).toBe('status-open='),
    );
    fireEvent.click(screen.getByTestId('open-btn'));
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    await waitFor(() =>
      expect(screen.getByTestId('status-probe').textContent).toBe('status-open=true'),
    );
  });
});

describe('command-palette schema className merge (10-02)', () => {
  it('merges meta.className into the nop-command-palette root (sibling parity)', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'command-palette',
          id: 'styled-palette',
          testid: 'cmdk',
          className: 'consumer-palette-class',
          defaultOpen: true,
          items: [{ id: 'a', label: 'Alpha' }],
        },
      ],
    });
    await waitFor(() => expect(queryPalette()).not.toBeNull());
    const palette = queryPalette()!;
    expect(palette.className).toContain('nop-command-palette');
    expect(palette.className).toContain('consumer-palette-class');
  });
});
