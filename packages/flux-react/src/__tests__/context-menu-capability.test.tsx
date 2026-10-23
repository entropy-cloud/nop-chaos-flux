import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import { wrapProbeRenderer } from '../test-support-runtime.js';
import { asReactNode } from '../as-react-node.js';
import type { RegisteredRendererDefinition } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { env, pageRenderer } from '../test-support-core.js';

function querySurface(): HTMLElement | null {
  return document.querySelector('[data-slot="context-menu-surface"]');
}

function renderWithContextMenu(body: Array<Record<string, unknown>>, notify?: ReturnType<typeof vi.fn>) {
  const SchemaRenderer = createSchemaRenderer([pageRenderer, wrapProbeRenderer]);
  const notifyFn = notify ?? vi.fn();
  render(
    <SchemaRenderer
      schemaUrl="test://context-menu-capability"
      schema={{ type: 'page', body } as never}
      env={{ ...env, notify: notifyFn as never }}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
  return notifyFn;
}

function frameRoot(): HTMLElement {
  const root = document.querySelector('.nop-field, [data-testid="wrap-probe-input"]')
    ?.closest('div');
  if (!root) {
    throw new Error('Expected wrap:true frame root');
  }
  return root;
}

afterEach(() => {
  cleanup();
});

describe('contextMenu meta capability (G3I)', () => {
  it('opens the menu on contextmenu and renders items (discriminating: fails without implementation)', async () => {
    renderWithContextMenu([
      {
        type: 'wrap-probe',
        label: 'Probe',
        contextMenu: {
          items: [
            { key: 'edit', label: 'Edit item', icon: 'Pencil' },
            { key: 'del', label: 'Delete item', destructive: true },
            { separator: true },
            { key: 'gone', label: 'Hidden item', visible: false },
          ],
        },
      },
    ]);
    expect(querySurface()).toBeNull();

    const root = frameRoot();
    fireEvent.contextMenu(root);

    const surface = querySurface();
    expect(surface).toBeTruthy();
    expect(surface?.getAttribute('role')).toBe('menu');
    expect(document.body.textContent).toContain('Edit item');
    expect(document.body.textContent).toContain('Delete item');
    // visible:false filtered, separator rendered
    expect(document.body.textContent).not.toContain('Hidden item');
    expect(surface?.querySelector('hr')).toBeTruthy();
    const destructive = [...(surface?.querySelectorAll('[role="menuitem"]') ?? [])].find((el) =>
      el.textContent?.includes('Delete item'),
    );
    expect(destructive?.className).toContain('text-destructive');
    // icon: lucide icon name resolved to an svg
    const editItem = [...(surface?.querySelectorAll('[role="menuitem"]') ?? [])].find((el) =>
      el.textContent?.includes('Edit item'),
    );
    expect(editItem?.querySelector('svg')).toBeTruthy();
  });

  it('dispatches the item action and closes the menu', async () => {
    const notify = vi.fn();
    renderWithContextMenu(
      [
        {
          type: 'wrap-probe',
          label: 'Probe',
          contextMenu: {
            items: [
              {
                key: 'toast',
                label: 'Notify',
                action: { action: 'showToast', args: { level: 'info', message: 'ctx-menu-ok' } },
              },
            ],
          },
        },
      ],
      notify,
    );
    fireEvent.contextMenu(frameRoot());
    const item = [...document.querySelectorAll('[role="menuitem"]')].find((el) =>
      el.textContent?.includes('Notify'),
    ) as HTMLButtonElement;
    expect(item).toBeTruthy();
    fireEvent.click(item);

    await waitFor(() => {
      expect(querySurface()).toBeNull();
      expect(notify).toHaveBeenCalledWith('info', 'ctx-menu-ok');
    });
  });

  it('closes on Escape and on outside pointerdown', async () => {
    renderWithContextMenu([
      {
        type: 'wrap-probe',
        label: 'Probe',
        contextMenu: { items: [{ label: 'Only' }] },
      },
    ]);
    fireEvent.contextMenu(frameRoot());
    expect(querySurface()).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(querySurface()).toBeNull());

    fireEvent.contextMenu(frameRoot());
    expect(querySurface()).toBeTruthy();
    fireEvent.pointerDown(document.body, { bubbles: true });
    await waitFor(() => expect(querySurface()).toBeNull());
  });

  it('opens via Shift+F10 keyboard trigger', async () => {
    renderWithContextMenu([
      { type: 'wrap-probe', label: 'Probe', contextMenu: { items: [{ label: 'Kbd' }] } },
    ]);
    fireEvent.keyDown(frameRoot(), { key: 'F10', shiftKey: true, bubbles: true });
    await waitFor(() => expect(querySurface()).toBeTruthy());
    expect(document.body.textContent).toContain('Kbd');
  });

  it('renders disabled items that do not dispatch', async () => {
    const notify = vi.fn();
    renderWithContextMenu(
      [
        {
          type: 'wrap-probe',
          label: 'Probe',
          contextMenu: {
            items: [
              {
                label: 'Locked',
                disabled: true,
                action: { action: 'showToast', args: { message: 'should-not-fire' } },
              },
            ],
          },
        },
      ],
      notify,
    );
    fireEvent.contextMenu(frameRoot());
    const item = document.querySelector('[role="menuitem"]') as HTMLButtonElement;
    expect(item.disabled).toBe(true);
    fireEvent.click(item);
    await waitFor(() => expect(notify).not.toHaveBeenCalled());
  });

  it('does not open when the node is disabled', async () => {
    renderWithContextMenu([
      {
        type: 'wrap-probe',
        label: 'Probe',
        disabled: true,
        contextMenu: { items: [{ label: 'Nope' }] },
      },
    ]);
    fireEvent.contextMenu(frameRoot());
    expect(querySurface()).toBeNull();
  });

  it('does not attach when contextMenu is not declared (regression guard)', async () => {
    renderWithContextMenu([{ type: 'wrap-probe', label: 'Probe' }]);
    fireEvent.contextMenu(frameRoot());
    expect(querySurface()).toBeNull();
  });

  it('ignores declarations on non-wrapped nodes (wrap:false, ctx-wrap-none)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const SchemaRenderer = createSchemaRenderer([pageRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://context-menu-capability-nowrap"
        schema={
          {
            type: 'page',
            body: [
              { type: 'text', text: 'plain', contextMenu: { items: [{ label: 'X' }] } },
            ],
          } as never
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    fireEvent.contextMenu(document.body);
    expect(querySurface()).toBeNull();
    warn.mockRestore();
  });

  it('innermost contextMenu wins for nested declarations (stopPropagation)', async () => {
    // Local wrap:true host that renders a body region, so a wrap:true node can
    // be nested inside another wrap:true node's frame root.
    const wrappedHostRenderer: RegisteredRendererDefinition = {
      type: 'wrapped-host',
      wrap: true,
      frameRootTag: 'div',
      component: (props: any) => <section>{asReactNode(props.regions.body?.render())}</section>,
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    };
    const SchemaRenderer = createSchemaRenderer([wrappedHostRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://context-menu-capability-nested"
        schema={
          {
            type: 'wrapped-host',
            contextMenu: { items: [{ label: 'Outer item' }] },
            body: [
              {
                type: 'wrapped-host',
                contextMenu: { items: [{ label: 'Inner item' }] },
              },
            ],
          } as never
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const sections = [...document.querySelectorAll('section')];
    const innerSection = sections[sections.length - 1];
    expect(innerSection).toBeTruthy();
    // React synthetic events run the inner handler first; its stopPropagation
    // must prevent the outer frame root handler from opening its menu.
    fireEvent.contextMenu(innerSection!);
    expect(querySurface()?.textContent).toContain('Inner item');
    expect(querySurface()?.textContent).not.toContain('Outer item');
  });

  it('opens via the ContextMenu key', async () => {
    renderWithContextMenu([
      { type: 'wrap-probe', label: 'Probe', contextMenu: { items: [{ label: 'MenuKey' }] } },
    ]);
    fireEvent.keyDown(frameRoot(), { key: 'ContextMenu', bubbles: true });
    await waitFor(() => expect(querySurface()).toBeTruthy());
    expect(document.body.textContent).toContain('MenuKey');
  });

  it('does not attach handlers for an empty items array (ctx-empty-items)', async () => {
    renderWithContextMenu([
      { type: 'wrap-probe', label: 'Probe', contextMenu: { items: [] } },
    ]);
    fireEvent.contextMenu(frameRoot());
    expect(querySurface()).toBeNull();
  });
});
