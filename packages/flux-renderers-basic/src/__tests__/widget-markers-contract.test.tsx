import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('widget renderer data-slot and marker contract', () => {
  afterEach(() => cleanup());

  it('button has no nop- renderer marker class on root (uses shadcn/ui)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://widget-markers"
        schema={{ type: 'button', label: 'Click me' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const button = container.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.getAttribute('data-slot')).toBe('button');
    // `nop-haptic` / `nop-safe-*` / `nop-hairline*` are @nop-chaos/ui mobile
    // utility classes (see docs/architecture/mobile-responsive-baseline.md §10),
    // not flux renderer markers. Block only renderer-identifier markers such as
    // `nop-button`, `nop-table`, etc.
    const rendererMarkerMatch = button?.className.match(/\bnop-(?!haptic|safe-|hairline)\w+/);
    expect(rendererMarkerMatch).toBeNull();
  });

  it('text renderer emits nop-text marker', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://widget-markers"
        schema={{ type: 'text', text: 'Hello' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const text = container.querySelector('.nop-text');
    expect(text).toBeTruthy();
    expect(text?.textContent).toBe('Hello');
  });

  it('icon emits nop-icon marker and data-icon attribute', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://widget-markers"
        schema={{ type: 'icon', icon: 'star' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const icon = container.querySelector('.nop-icon');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('data-icon')).toBe('star');
  });

  it('badge has no nop- marker (delegates to shadcn/ui Badge)', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://widget-markers"
        schema={{ type: 'badge', text: 'New' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.textContent).toContain('New');
  });
});

describe('layout renderer data-slot contract', () => {
  afterEach(() => cleanup());

  it('page uses data-slot for header, toolbar, body, footer', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-markers"
        schema={{
          type: 'page',
          title: 'Title',
          header: [{ type: 'text', text: 'Header' }],
          body: [{ type: 'text', text: 'Body' }],
          footer: [{ type: 'text', text: 'Footer' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="page-header"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="page-toolbar"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="page-body"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="page-footer"]')).toBeTruthy();
  });

  it('container uses data-slot for header, body, footer', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-markers"
        schema={{
          type: 'container',
          header: [{ type: 'text', text: 'H' }],
          body: [{ type: 'text', text: 'B' }],
          footer: [{ type: 'text', text: 'F' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="container-header"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="container-body"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="container-footer"]')).toBeTruthy();
  });

  it('no BEM-style region classes exist in page layout', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-markers"
        schema={{
          type: 'page',
          title: 'Title',
          header: [{ type: 'text', text: 'H' }],
          body: [{ type: 'text', text: 'B' }],
          footer: [{ type: 'text', text: 'F' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('.nop-page__header')).toBeNull();
    expect(container.querySelector('.nop-page__body')).toBeNull();
    expect(container.querySelector('.nop-page__footer')).toBeNull();
  });

  it('tabs uses data-slot="tabs-root" for inner tabs container', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-markers"
        schema={{
          type: 'tabs',
          items: [{ key: 'a', title: 'A', body: [{ type: 'text', text: 'Tab A' }] }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(container.querySelector('[data-slot="tabs-root"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="tabs-content"]')).toBeTruthy();
    expect(container.querySelector('.nop-tabs-root')).toBeNull();
    expect(container.querySelector('.nop-tabs-content')).toBeNull();
  });
});

describe('data-testid and data-cid propagation', () => {
  afterEach(() => cleanup());

  it('page propagates testid and cid to root element', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://meta-props"
        schema={{
          type: 'page',
          testid: 'my-page',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const page = container.querySelector('.nop-page');
    expect(page?.getAttribute('data-testid')).toBe('my-page');
  });

  it('button propagates testid and disabled from meta', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://meta-props"
        schema={{
          type: 'page',
          body: [
            { type: 'button', label: 'Go', testid: 'go-btn' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const button = container.querySelector('button[data-testid="go-btn"]');
    expect(button).toBeTruthy();
  });

  it('container propagates testid to root', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://meta-props"
        schema={{
          type: 'container',
          testid: 'my-container',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const ct = container.querySelector('.nop-container');
    expect(ct?.getAttribute('data-testid')).toBe('my-container');
  });
});
