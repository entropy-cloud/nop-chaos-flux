/* eslint-disable max-lines */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support';

describe('basicRendererDefinitions page and layout behavior', () => {
  it('renders page title from a plain value', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          title: 'User Profile',
          body: [{ type: 'text', text: 'Page body' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByRole('heading', { name: 'User Profile' })).toBeTruthy();
    expect(screen.getByText('Page body')).toBeTruthy();
    cleanup();
  });

  it('renders page title from a schema fragment', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          title: { type: 'text', text: 'Profile for ${user.name}' } as any,
          body: [{ type: 'text', text: 'Page body' }],
        }}
        data={{ user: { name: 'Alice' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Profile for Alice' })).toBeTruthy();
    expect(screen.getByText('Page body')).toBeTruthy();
    cleanup();
  });

  it('renders text nodes with interpolated values', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{ type: 'page', body: [{ type: 'text', text: 'Welcome, ${user.name}' }] }}
        data={{ user: { name: 'Alice' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Welcome, Alice')).toBeTruthy();
    cleanup();
  });

  it('prefers flex body region over deprecated items region', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'flex',
          body: [{ type: 'text', text: 'Body content' }],
          items: [{ type: 'text', text: 'Deprecated items content' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Body content')).toBeTruthy();
    expect(screen.queryByText('Deprecated items content')).toBeNull();
    cleanup();
  });

  it('falls back to flex items region when body is absent', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{ type: 'flex', items: [{ type: 'text', text: 'Deprecated items fallback' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Deprecated items fallback')).toBeTruthy();
    cleanup();
  });

  it('publishes page status summary through statusPath', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          statusPath: 'pageStatus',
          body: [{ type: 'text', text: '${pageStatus?.refreshTick}' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('0')).toBeTruthy());
    cleanup();
  });

  it('publishes tabs status and supports scope ownership', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              valueOwnership: 'scope',
              valueStatePath: 'ui.activeTab',
              statusPath: 'ui.tabsStatus',
              items: [
                { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
                { key: 'second', title: 'Second', body: [{ type: 'text', text: 'Second body' }] },
              ],
            },
            {
              type: 'text',
              text: '${ui.tabsStatus?.activeValue}:${ui.tabsStatus?.activeIndex}:${ui.activeTab}',
            },
          ],
        }}
        data={{ ui: { activeTab: 'first' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('first:0:first')).toBeTruthy());
    fireEvent.click(screen.getByText('Second'));
    await waitFor(() => {
      expect(screen.getByText('second:1:second')).toBeTruthy();
      expect(screen.getByText('Second body')).toBeTruthy();
    });
    cleanup();
  });

  it('stacks default tabs above the active panel and keeps vertical tabs side by side', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              items: [
                { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.querySelector('[data-slot="tabs-root"]')?.className).toContain('flex-col');

    rerender(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              tabsMode: 'vertical',
              items: [
                { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.querySelector('[data-slot="tabs-root"]')?.className).not.toContain('flex-col');
    cleanup();
  });

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
            { type: 'text', text: '${ui?.dialogStatus?.open}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('true')).toBeTruthy());

    fireEvent.click(document.querySelector('[data-slot="dialog-close"]') as Element);
    await waitFor(() => expect(screen.getByText('false')).toBeTruthy());
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
        { type: 'text', text: '${ui?.dialogStatus?.open}' },
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

    await waitFor(() => expect(screen.getByText('true')).toBeTruthy());

    fireEvent.click(document.querySelector('[data-slot="dialog-close"]') as Element);

    await waitFor(() => {
      expect(screen.getByText('false')).toBeTruthy();
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
      expect(screen.getByText('false')).toBeTruthy();
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
            { type: 'text', text: '${ui.dialogStatus?.active}:${ui.drawerStatus?.active}' },
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
            { type: 'text', text: '${ui.dialogStatus?.active}:${ui.drawerStatus?.active}' },
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
            { type: 'text', text: '${ui.dialogStatus?.active}:${ui.drawerStatus?.active}' },
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

  it('renders page header and footer through normalized regions', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          title: 'Workspace',
          header: [{ type: 'text', text: 'Header tools' }],
          body: [{ type: 'text', text: 'Page body' }],
          footer: [{ type: 'text', text: 'Footer actions' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Workspace' })).toBeTruthy();
    expect(screen.getByText('Header tools')).toBeTruthy();
    expect(screen.getByText('Page body')).toBeTruthy();
    expect(screen.getByText('Footer actions')).toBeTruthy();
    const page = container.querySelector('.nop-page');
    expect(page).toBeTruthy();
    expect(page?.querySelector('[data-slot="page-header"]')).toBeTruthy();
    expect(page?.querySelector('[data-slot="page-toolbar"]')).toBeTruthy();
    expect(page?.querySelector('[data-slot="page-body"]')).toBeTruthy();
    expect(page?.querySelector('[data-slot="page-footer"]')).toBeTruthy();
    cleanup();
  });

  it('renders container header and footer through normalized regions', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'container',
          header: [{ type: 'text', text: 'Container header' }],
          body: [{ type: 'text', text: 'Container body' }],
          footer: [{ type: 'text', text: 'Container footer' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Container header')).toBeTruthy();
    expect(screen.getByText('Container body')).toBeTruthy();
    expect(screen.getByText('Container footer')).toBeTruthy();
    const layout = container.querySelector('.nop-container');
    expect(layout).toBeTruthy();
    expect(layout?.querySelector('[data-slot="container-header"]')).toBeTruthy();
    expect(layout?.querySelector('[data-slot="container-body"]')).toBeTruthy();
    expect(layout?.querySelector('[data-slot="container-footer"]')).toBeTruthy();
    cleanup();
  });

  it('resolves classAliases at page level', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          classAliases: { card: 'bg-white rounded-lg shadow-md p-4' },
          body: [
            {
              type: 'container',
              className: 'card custom-class',
              body: [{ type: 'text', text: 'Card content' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const container = screen.getByText('Card content').closest('.nop-container');
    expect(container?.className).toContain('bg-white');
    expect(container?.className).toContain('rounded-lg');
    expect(container?.className).toContain('shadow-md');
    expect(container?.className).toContain('p-4');
    expect(container?.className).toContain('custom-class');
    cleanup();
  });

  it('supports nested classAliases expansion', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          classAliases: { btn: 'px-4 py-2 rounded', 'btn-primary': 'btn bg-blue-500 text-white' },
          body: [{ type: 'button', label: 'Submit', className: 'btn-primary' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button.className).toContain('px-4');
    expect(button.className).toContain('py-2');
    expect(button.className).toContain('rounded');
    expect(button.className).toContain('bg-blue-500');
    expect(button.className).toContain('text-white');
    cleanup();
  });

  it('inherits classAliases from parent to child', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          classAliases: { card: 'bg-white rounded-lg' },
          body: [
            {
              type: 'container',
              classAliases: { card: 'bg-gray-100 rounded-xl' },
              body: [{ type: 'text', text: 'Nested card', className: 'card' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const text = screen.getByText('Nested card');
    expect(text.className).toContain('bg-gray-100');
    expect(text.className).toContain('rounded-xl');
    expect(text.className).not.toContain('bg-white');
    expect(text.className).not.toContain('rounded-lg');
    cleanup();
  });

  it('uses data-icon for icon identity without a modifier marker class', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{ type: 'page', body: [{ type: 'icon', icon: 'gear', testid: 'settings-icon' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const icon = screen.getByTestId('settings-icon');
    const className = icon.getAttribute('class') ?? '';
    expect(icon.getAttribute('data-icon')).toBe('gear');
    expect(className).toContain('nop-icon');
    expect(className).not.toContain('nop-icon--');
    cleanup();
  });

  it('uses data-slot markers for tabs internal structure instead of nop-tabs region classes', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              items: [
                { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const tabsRoot = document.querySelector('[data-slot="tabs-root"]');
    const tabsContent = document.querySelector('[data-slot="tabs-content"]');

    expect(tabsRoot).toBeTruthy();
    expect(tabsContent).toBeTruthy();
    expect(document.querySelector('.nop-tabs-root')).toBeNull();
    expect(document.querySelector('.nop-tabs-content')).toBeNull();
    cleanup();
  });
});
