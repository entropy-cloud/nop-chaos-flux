import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => cleanup());

function renderSchema(schema: unknown) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://component-handles-surface"
      schema={schema as any}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function queryDialog() {
  return document.querySelector('[data-slot="dialog-surface"]') as HTMLElement | null;
}

function queryDrawer() {
  return document.querySelector('[data-slot="drawer-surface"]') as HTMLElement | null;
}

describe('surface component handles: open / close / toggle (X1 Phase 3)', () => {
  it('component:open opens a declarative dialog by componentId', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'dialog',
          id: 'my-dialog',
          title: 'Target Dialog',
          defaultOpen: false,
          body: [{ type: 'text', text: 'Dialog body' }],
        },
        {
          type: 'button',
          label: 'OpenBtn',
          onClick: { action: 'component:open', componentId: 'my-dialog' },
        },
      ],
    });

    expect(queryDialog()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'OpenBtn' }));
    await waitFor(() => expect(queryDialog()).not.toBeNull());
  });

  it('component:close closes an open declarative dialog (x1-close-not-open)', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'dialog',
          id: 'my-dialog',
          title: 'Target Dialog',
          defaultOpen: true,
          body: [
            { type: 'text', text: 'Dialog body' },
            {
              type: 'button',
              label: 'CloseBtn',
              onClick: { action: 'component:close', componentId: 'my-dialog' },
            },
          ],
        },
      ],
    });

    await waitFor(() => expect(queryDialog()).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'CloseBtn' }));
    await waitFor(() => expect(queryDialog()).toBeNull());
  });

  it('component:close on an already-closed declarative dialog is a no-op', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'dialog',
          id: 'closed-dialog',
          title: 'Closed Dialog',
          defaultOpen: false,
          body: [{ type: 'text', text: 'Dialog body' }],
        },
        {
          type: 'button',
          label: 'CloseBtn',
          onClick: { action: 'component:close', componentId: 'closed-dialog' },
        },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'CloseBtn' }));
    // No change after a flush.
    await waitFor(() => expect(queryDialog()).toBeNull());
  });

  it('component:toggle flips the declarative dialog open then close', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'dialog',
          id: 'tg-dialog',
          title: 'Toggle Dialog',
          defaultOpen: false,
          body: [
            { type: 'text', text: 'Dialog body' },
            {
              type: 'button',
              label: 'ToggleInsideBtn',
              onClick: { action: 'component:toggle', componentId: 'tg-dialog' },
            },
          ],
        },
        {
          type: 'button',
          label: 'ToggleOutsideBtn',
          onClick: { action: 'component:toggle', componentId: 'tg-dialog' },
        },
      ],
    });

    expect(queryDialog()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'ToggleOutsideBtn' }));
    await waitFor(() => expect(queryDialog()).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'ToggleInsideBtn' }));
    await waitFor(() => expect(queryDialog()).toBeNull());
  });

  it('component:open opens a declarative drawer by componentId', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'drawer',
          id: 'my-drawer',
          title: 'Target Drawer',
          defaultOpen: false,
          body: [{ type: 'text', text: 'Drawer body' }],
        },
        {
          type: 'button',
          label: 'OpenBtn',
          onClick: { action: 'component:open', componentId: 'my-drawer' },
        },
      ],
    });

    expect(queryDrawer()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'OpenBtn' }));
    await waitFor(() => expect(queryDrawer()).not.toBeNull());
  });

  it('component:close closes an open declarative drawer', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'drawer',
          id: 'my-drawer',
          title: 'Target Drawer',
          defaultOpen: true,
          body: [
            { type: 'text', text: 'Drawer body' },
            {
              type: 'button',
              label: 'CloseBtn',
              onClick: { action: 'component:close', componentId: 'my-drawer' },
            },
          ],
        },
      ],
    });

    await waitFor(() => expect(queryDrawer()).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'CloseBtn' }));
    await waitFor(() => expect(queryDrawer()).toBeNull());
  });

  it('component:toggle flips the declarative drawer closed then open', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'drawer',
          id: 'tg-drawer',
          title: 'Toggle Drawer',
          defaultOpen: false,
          body: [
            { type: 'text', text: 'Drawer body' },
            {
              type: 'button',
              label: 'ToggleInsideBtn',
              onClick: { action: 'component:toggle', componentId: 'tg-drawer' },
            },
          ],
        },
        {
          type: 'button',
          label: 'ToggleOutsideBtn',
          onClick: { action: 'component:toggle', componentId: 'tg-drawer' },
        },
      ],
    });

    expect(queryDrawer()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'ToggleOutsideBtn' }));
    await waitFor(() => expect(queryDrawer()).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'ToggleInsideBtn' }));
    await waitFor(() => expect(queryDrawer()).toBeNull());
  });

  it('component:open on an unknown componentId is a no-op (x1-open-no-target)', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'dialog',
          id: 'real-dialog',
          title: 'Real',
          defaultOpen: false,
          body: [{ type: 'text', text: 'Dialog body' }],
        },
        {
          type: 'button',
          label: 'OpenMissingBtn',
          onClick: { action: 'component:open', componentId: 'missing-dialog' },
        },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'OpenMissingBtn' }));
    // Allow any pending effects to flush; the real dialog must remain closed.
    await waitFor(() => expect(queryDialog()).toBeNull());
  });

  it('dialog and drawer definitions publish open/close/toggle capability contracts', async () => {
    const { basicRendererDefinitions } = await import('../index.js');
    const dialog = basicRendererDefinitions.find((d) => d.type === 'dialog');
    const drawer = basicRendererDefinitions.find((d) => d.type === 'drawer');
    expect(dialog?.componentCapabilityContracts?.map((c) => c.handle)).toEqual([
      'open',
      'close',
      'toggle',
    ]);
    expect(drawer?.componentCapabilityContracts?.map((c) => c.handle)).toEqual([
      'open',
      'close',
      'toggle',
    ]);
  });
});
