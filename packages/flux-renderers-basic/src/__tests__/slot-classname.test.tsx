import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support';

describe('per-slot className props', () => {
  afterEach(() => cleanup());

  it('applies bodyClassName to container-body', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          bodyClassName: 'grid grid-cols-2',
          body: [{ type: 'text', text: 'A' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.className).toContain('grid');
    expect(body?.className).toContain('grid-cols-2');
  });

  it('applies headerClassName to container-header', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          headerClassName: 'bg-blue-100',
          header: [{ type: 'text', text: 'Header' }],
          body: [{ type: 'text', text: 'Body' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const header = container.querySelector('[data-slot="container-header"]');
    expect(header?.className).toContain('bg-blue-100');
  });

  it('applies footerClassName to container-footer', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          footerClassName: 'bg-gray-100',
          footer: [{ type: 'text', text: 'Footer' }],
          body: [{ type: 'text', text: 'Body' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const footer = container.querySelector('[data-slot="container-footer"]');
    expect(footer?.className).toContain('bg-gray-100');
  });

  it('applies bodyClassName with flex-child path (direction: column)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          direction: 'column',
          bodyClassName: 'gap-4',
          body: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.className).toContain('flex');
    expect(body?.className).toContain('gap-4');
  });

  it('applies bodyClassName on bare path (no semantic props)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          bodyClassName: 'grid grid-cols-3',
          body: [{ type: 'text', text: 'A' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.className).toContain('grid');
    expect(body?.className).toContain('grid-cols-3');
    expect(body?.hasAttribute('data-flex')).toBe(false);
  });

  it('applies all three slot classNames simultaneously', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          headerClassName: 'hdr',
          bodyClassName: 'bdy',
          footerClassName: 'ftr',
          header: [{ type: 'text', text: 'H' }],
          body: [{ type: 'text', text: 'B' }],
          footer: [{ type: 'text', text: 'F' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    expect(container.querySelector('[data-slot="container-header"]')?.className).toContain('hdr');
    expect(container.querySelector('[data-slot="container-body"]')?.className).toContain('bdy');
    expect(container.querySelector('[data-slot="container-footer"]')?.className).toContain('ftr');
  });

  it('applies bodyClassName to page-body', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'page',
          bodyClassName: 'space-y-4',
          body: [{ type: 'text', text: 'A' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const body = container.querySelector('[data-slot="page-body"]');
    expect(body?.className).toContain('space-y-4');
  });

  it('applies headerClassName to page-header', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'page',
          title: 'Test',
          headerClassName: 'border-b',
          body: []
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const header = container.querySelector('[data-slot="page-header"]');
    expect(header?.className).toContain('border-b');
  });

  it('applies footerClassName to page-footer', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'page',
          footerClassName: 'border-t',
          footer: [{ type: 'text', text: 'Footer' }],
          body: []
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const footer = container.querySelector('[data-slot="page-footer"]');
    expect(footer?.className).toContain('border-t');
  });

  it('emits no extra class when slot props are omitted', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          body: [{ type: 'text', text: 'A' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.getAttribute('class')).toBe('');
  });

  it('coexists className on root with bodyClassName on body', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          className: 'p-4',
          bodyClassName: 'grid grid-cols-2',
          body: [{ type: 'text', text: 'A' }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const root = container.querySelector('.nop-container');
    const body = container.querySelector('[data-slot="container-body"]');
    expect(root?.className).toContain('p-4');
    expect(body?.className).toContain('grid');
    expect(body?.className).toContain('grid-cols-2');
  });

  it('applies contentClassName to tabs-content', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'tabs',
          contentClassName: 'p-6',
          items: [{ key: 'a', title: 'A', body: [{ type: 'text', text: 'Tab A' }] }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const content = container.querySelector('[data-slot="tabs-content"]');
    expect(content?.className).toContain('p-6');
  });

  it('applies toolbarClassName to tabs-toolbar', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'page',
          body: [{
            type: 'tabs',
            toolbarClassName: 'mb-2',
            toolbar: [{ type: 'text', text: 'Toolbar' }],
            items: [{ key: 'a', title: 'A', body: [{ type: 'text', text: 'Tab A' }] }]
          }]
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />
    );
    const toolbar = container.querySelector('[data-slot="tabs-toolbar"]');
    expect(toolbar?.className).toContain('mb-2');
  });
});
