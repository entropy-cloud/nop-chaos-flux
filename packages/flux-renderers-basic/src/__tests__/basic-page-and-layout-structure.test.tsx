import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('basicRendererDefinitions page and layout structure', () => {
  afterEach(() => {
    cleanup();
  });

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
  });

  it('stacks default tabs above the active panel and keeps vertical tabs side by side', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              items: [{ key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(document.querySelector('[data-slot="tabs-root"]')?.getAttribute('data-orientation')).toBe(
      'horizontal',
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
              items: [{ key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() =>
      expect(document.querySelector('[data-slot="tabs-root"]')?.getAttribute('data-orientation')).toBe(
        'vertical',
      ),
    );
    expect(document.querySelector('[data-slot="tabs-root"]')?.className).toContain('flex');
  });
});
