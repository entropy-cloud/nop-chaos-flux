import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('basicRendererDefinitions page and layout behavior', () => {
  it('publishes declarative dialog and drawer status summaries through statusPath', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              statusPath: 'ui.dialogStatus',
              open: true,
              body: [{ type: 'text', text: 'Dialog body' }],
            },
            {
              type: 'drawer',
              title: 'Drawer title',
              statusPath: 'ui.drawerStatus',
              open: true,
              body: [{ type: 'text', text: 'Drawer body' }],
            },
            {
              type: 'text',
              text: '${ui?.dialogStatus?.kind}:${ui?.dialogStatus?.open}:${ui?.drawerStatus?.kind}:${ui?.drawerStatus?.open}',
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('dialog:true:drawer:true')).toBeTruthy());

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [{ type: 'text', text: '${ui?.dialogStatus?.open}:${ui?.drawerStatus?.open}' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText('Dialog title')).toBeNull();
      expect(screen.queryByText('Drawer title')).toBeNull();
      expect(screen.getByText('false:false')).toBeTruthy();
    });
    cleanup();
  });

  it('updates declarative dialog statusPath after local close interactions', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              statusPath: 'ui.dialogStatus',
              defaultOpen: true,
              body: [{ type: 'text', text: 'Dialog body' }],
            },
            { type: 'text', text: '${ui?.dialogStatus?.open}', testid: 'dialog-open-status' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('dialog-open-status').textContent).toBe('true'));

    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    await waitFor(() => expect(screen.getByTestId('dialog-open-status').textContent).toBe('false'));
    cleanup();
  });

  it('does not reopen a defaultOpen declarative dialog after runtime close', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const schema = {
      type: 'page',
      body: [
        {
          type: 'dialog',
          title: 'Dialog title',
          statusPath: 'ui.dialogStatus',
          defaultOpen: true,
          body: [{ type: 'text', text: 'Dialog body' }],
        },
        { type: 'text', text: '${ui?.dialogStatus?.open}', testid: 'dialog-open-status' },
      ],
    } as const;
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={schema}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('dialog-open-status').textContent).toBe('true'));

    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(screen.getByTestId('dialog-open-status').textContent).toBe('false');
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={schema}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dialog-open-status').textContent).toBe('false');
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('wraps declarative drawer body content in a drawer-body slot', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'drawer',
          title: 'Drawer title',
          open: true,
          body: [{ type: 'text', text: 'Drawer body' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Drawer body')).toBeTruthy());
    expect(document.querySelector('[data-slot="drawer-body"]')).toBeTruthy();
    cleanup();
  });

  it('keeps declarative surfaces closed by default when open and defaultOpen are omitted', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              statusPath: 'ui.dialogStatus',
              body: [{ type: 'text', text: 'Dialog body' }],
            },
            {
              type: 'drawer',
              title: 'Drawer title',
              statusPath: 'ui.drawerStatus',
              body: [{ type: 'text', text: 'Drawer body' }],
            },
            { type: 'text', text: '${ui?.dialogStatus?.open}:${ui?.drawerStatus?.open}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('false:false')).toBeTruthy());
    cleanup();
  });

  it('marks only the top declarative surface as active', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              statusPath: 'ui.dialogStatus',
              defaultOpen: true,
              body: [{ type: 'text', text: 'Dialog body' }],
            },
            {
              type: 'drawer',
              title: 'Drawer title',
              statusPath: 'ui.drawerStatus',
              defaultOpen: true,
              body: [{ type: 'text', text: 'Drawer body' }],
            },
            { type: 'text', text: '${ui?.dialogStatus?.active}:${ui?.drawerStatus?.active}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('false:true')).toBeTruthy());
    cleanup();
  });

  it('reactivates the next declarative surface when the top one closes', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              statusPath: 'ui.dialogStatus',
              defaultOpen: true,
              body: [{ type: 'text', text: 'Dialog body' }],
            },
            {
              type: 'drawer',
              title: 'Drawer title',
              statusPath: 'ui.drawerStatus',
              defaultOpen: true,
              body: [{ type: 'text', text: 'Drawer body' }],
            },
            { type: 'text', text: '${ui?.dialogStatus?.active}:${ui?.drawerStatus?.active}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('false:true')).toBeTruthy());

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              statusPath: 'ui.dialogStatus',
              defaultOpen: true,
              body: [{ type: 'text', text: 'Dialog body' }],
            },
            {
              type: 'drawer',
              title: 'Drawer title',
              statusPath: 'ui.drawerStatus',
              open: false,
              body: [{ type: 'text', text: 'Drawer body' }],
            },
            { type: 'text', text: '${ui?.dialogStatus?.active}:${ui?.drawerStatus?.active}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('true:false')).toBeTruthy());
    cleanup();
  });

  it('applies declarative dialog data as the child-scope init patch', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              open: true,
              data: { recordId: 7, mode: 'edit' },
              body: [{ type: 'text', text: '${recordId}:${mode}:${pageOnly}:${dialogId}' }],
            },
          ],
        }}
        data={{ pageOnly: 'root' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText(/7:edit:root:/)).toBeTruthy());
    cleanup();
  });

  it('applies declarative drawer data as the child-scope init patch', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'drawer',
              title: 'Drawer title',
              open: true,
              data: { recordId: 8, mode: 'preview' },
              body: [
                {
                  type: 'text',
                  text: '${recordId}:${mode}:${pageOnly}:${dialogId}:${drawerId}',
                },
              ],
            },
          ],
        }}
        data={{ pageOnly: 'root' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText(/8:preview:root:.*:.*/)).toBeTruthy());
    cleanup();
  });

  it('evaluates declarative dialog data expressions once when opening', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              open: true,
              data: {
                recordId: '${currentRecord.id}',
                mode: 'Mode:${currentRecord.mode}',
              },
              body: [{ type: 'text', text: '${recordId}:${mode}:${pageOnly}' }],
            },
          ],
        }}
        data={{ pageOnly: 'root', currentRecord: { id: 11, mode: 'edit' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('11:Mode:edit:root')).toBeTruthy());
    cleanup();
  });

  it('does not rebind declarative dialog data while the surface stays open', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const schema = {
      type: 'page',
      body: [
        {
          type: 'dialog',
          title: 'Dialog title',
          open: true,
          data: {
            recordId: '${currentRecord.id}',
          },
          body: [{ type: 'text', text: '${recordId}' }],
        },
      ],
    } as const;

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={schema}
        data={{ currentRecord: { id: 11 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('11')).toBeTruthy());

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={schema}
        data={{ currentRecord: { id: 22 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('11')).toBeTruthy());
    expect(screen.queryByText('22')).toBeNull();
    cleanup();
  });

  it('re-evaluates declarative dialog data after close and reopen', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const schema = {
      type: 'page',
      body: [
        {
          type: 'dialog',
          title: 'Dialog title',
          open: '${dialogOpen}',
          data: {
            recordId: '${currentRecord.id}',
          },
          body: [{ type: 'text', text: '${recordId}' }],
        },
      ],
    } as const;

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={schema}
        data={{ dialogOpen: true, currentRecord: { id: 11 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('11')).toBeTruthy());

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={schema}
        data={{ dialogOpen: false, currentRecord: { id: 22 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={schema}
        data={{ dialogOpen: true, currentRecord: { id: 22 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('22')).toBeTruthy());
    cleanup();
  });

  it('does not close and immediately reopen a declarative dialog when parent scope churns while open', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const schema = {
      type: 'page',
      body: [
        {
          type: 'dialog',
          title: 'Dialog title',
          open: true,
          data: {
            recordId: '${currentRecord.id}',
          },
          body: [{ type: 'text', text: 'Dialog body' }],
        },
      ],
    } as const;

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#surface-stable"
        schema={schema}
        data={{ currentRecord: { id: 11 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#surface-stable"
        schema={schema}
        data={{ currentRecord: { id: 22 } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByText('Dialog body')).toBeTruthy();
  });

  it('opens a defaultOpen declarative dialog after commit without render-phase scope allocation', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout#surface-default-open"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              defaultOpen: true,
              body: [{ type: 'text', text: 'Dialog body' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(document.querySelector('[data-slot="dialog-body"]')).toBeTruthy();
    cleanup();
  });

  it('calls declarative dialog onClose once when closed from the local close control', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: null })) as RendererEnv['fetcher'];
    const SchemaRenderer = createBasicSchemaRenderer();

    const view = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dialog',
              title: 'Dialog title',
              defaultOpen: true,
              onClose: {
                action: 'ajax',
                args: { url: '/close-once' },
              },
              body: [{ type: 'text', text: 'Dialog body' }],
            },
          ],
        }}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    const closeButton = screen.getByRole('dialog').querySelector('[data-slot="dialog-close"]');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    view.unmount();
    expect(fetcher).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
