import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('per-slot className props', () => {
  afterEach(() => cleanup());

  it('composes bodyClassName onto the container root on the bare path (plan 641 UR-14 no-wrapper)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          bodyClassName: 'grid grid-cols-2',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    // plan 641 UR-14: bare container (no header/footer/flex props) renders the
    // body directly — bodyClassName composes onto the root element.
    const root = container.querySelector('.nop-container') as HTMLElement;
    expect(root.className).toContain('grid');
    expect(root.className).toContain('grid-cols-2');
    expect(container.querySelector('[data-slot="container-body"]')).toBeNull();
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
          body: [{ type: 'text', text: 'Body' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
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
          body: [{ type: 'text', text: 'Body' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
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
          body: [
            { type: 'text', text: 'A' },
            { type: 'text', text: 'B' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.getAttribute('data-flex')).toBe('');
    expect(body?.getAttribute('data-direction')).toBe('column');
    expect(body?.className).toContain('gap-4');
  });

  it('applies bodyClassName on bare path to the root (no semantic props)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          bodyClassName: 'grid grid-cols-3',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const root = container.querySelector('.nop-container') as HTMLElement;
    expect(root.className).toContain('grid');
    expect(root.className).toContain('grid-cols-3');
    expect(container.querySelector('[data-slot="container-body"]')).toBeNull();
  });

  it('bare path renders no wrapper and no injected style/data-flex (plan 641 UR-14)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(container.querySelector('[data-slot="container-body"]')).toBeNull();
    const root = container.querySelector('.nop-container') as HTMLElement;
    expect(root.hasAttribute('style')).toBe(false);
    expect(root.hasAttribute('data-flex')).toBe(false);
    expect(root.getAttribute('data-container-bare')).toBe('');
  });

  it('does not inject inline default gap on flex-child path without explicit gap', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          direction: 'column',
          body: [
            { type: 'text', text: 'A' },
            { type: 'text', text: 'B' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.getAttribute('data-flex')).toBe('');
    expect(body?.getAttribute('data-direction')).toBe('column');
    expect(body?.hasAttribute('style')).toBe(false);
    const flexRoot = container.querySelector('.nop-container') as HTMLElement;
    expect(flexRoot.hasAttribute('data-container-bare')).toBe(false);
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
          footer: [{ type: 'text', text: 'F' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
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
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
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
          body: [],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
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
          body: [],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const footer = container.querySelector('[data-slot="page-footer"]');
    expect(footer?.className).toContain('border-t');
  });

  it('emits no extra class when slot props are omitted (bare body renders directly)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    // plan 641 UR-14: bare container renders body content directly under the
    // root — no wrapper element exists to carry a class.
    const root = container.querySelector('.nop-container') as HTMLElement;
    const directText = Array.from(root.children).some(
      (child) => child.tagName !== 'DIV' || !child.hasAttribute('data-slot'),
    );
    expect(root.className).toBe('nop-container');
    expect(root.textContent).toContain('A');
    expect(directText || root.children.length >= 1).toBe(true);
  });

  it('coexists className with bodyClassName on the bare-path root', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'container',
          className: 'p-4',
          bodyClassName: 'grid grid-cols-2',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    // plan 641 UR-14: bare path — meta.className and bodyClassName both
    // compose onto the root (body renders directly).
    const root = container.querySelector('.nop-container') as HTMLElement;
    expect(root.className).toContain('p-4');
    expect(root.className).toContain('grid');
    expect(root.className).toContain('grid-cols-2');
    expect(container.querySelector('[data-slot="container-body"]')).toBeNull();
  });

  it('applies contentClassName to tabs-content', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://slot-className"
        schema={{
          type: 'tabs',
          contentClassName: 'p-6',
          items: [{ key: 'a', title: 'A', body: [{ type: 'text', text: 'Tab A' }] }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
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
          body: [
            {
              type: 'tabs',
              toolbarClassName: 'mb-2',
              toolbar: [{ type: 'text', text: 'Toolbar' }],
              items: [{ key: 'a', title: 'A', body: [{ type: 'text', text: 'Tab A' }] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const toolbar = container.querySelector('[data-slot="tabs-toolbar"]');
    expect(toolbar?.className).toContain('mb-2');
  });
});


describe('plan 641 UR-14 author-trap fix (outer layout classes reach content)', () => {
  afterEach(() => cleanup());

  it('bare container with outer flex classes lays out content directly (old wrapper implementation fails this)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://ur14-author-trap"
        schema={{
          type: 'container',
          className: 'flex flex-col gap-2',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const root = container.querySelector('.nop-container') as HTMLElement;
    expect(root.className).toContain('flex');
    expect(root.className).toContain('flex-col');
    expect(root.className).toContain('gap-2');
    expect(root.getAttribute('data-container-bare')).toBe('');
    const content = root.querySelector('.nop-text') as HTMLElement | null;
    expect(content).toBeTruthy();
    expect(content!.parentElement).toBe(root);
    expect(root.querySelector('[data-slot="container-body"]')).toBeNull();
  });
});
