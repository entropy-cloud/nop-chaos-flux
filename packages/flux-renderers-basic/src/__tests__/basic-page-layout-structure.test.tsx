import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

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

  it('passes tab item slot bindings to title, toolbar, and body regions', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'tabs',
          value: 'second',
          items: [
            {
              key: 'first',
              title: { type: 'text', text: 'title:${$slot.item.key}:${$slot.index}:${$slot.key}' },
              toolbar: {
                type: 'text',
                text: 'toolbar:${$slot.item.key}:${$slot.index}:${$slot.key}',
              },
              body: { type: 'text', text: 'body:${$slot.item.key}:${$slot.index}:${$slot.key}' },
            },
            {
              key: 'second',
              title: { type: 'text', text: 'title:${$slot.item.key}:${$slot.index}:${$slot.key}' },
              toolbar: {
                type: 'text',
                text: 'toolbar:${$slot.item.key}:${$slot.index}:${$slot.key}',
              },
              body: { type: 'text', text: 'body:${$slot.item.key}:${$slot.index}:${$slot.key}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('title:first:0:first')).toBeTruthy();
      expect(screen.getByText('title:second:1:second')).toBeTruthy();
      expect(screen.getByText('toolbar:second:1:second')).toBeTruthy();
      expect(screen.getByText('body:second:1:second')).toBeTruthy();
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
