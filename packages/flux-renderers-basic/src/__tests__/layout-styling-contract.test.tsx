import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('layout renderer styling contract: no hardcoded layout', () => {
  afterEach(() => cleanup());

  it('page root emits nop-page marker only, no hardcoded gap/padding/flex', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-contract"
        schema={{ type: 'page', body: [{ type: 'text', text: 'A' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const page = container.querySelector('.nop-page');
    expect(page).toBeTruthy();
    expect(page?.tagName).toBe('SECTION');
    const classList = Array.from(page?.classList ?? []);
    expect(classList).toEqual(['nop-page']);
  });

  it('container root emits nop-container marker only', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-contract"
        schema={{ type: 'container', body: [{ type: 'text', text: 'A' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const ct = container.querySelector('.nop-container');
    expect(ct).toBeTruthy();
    const classList = Array.from(ct?.classList ?? []);
    expect(classList).toEqual(['nop-container']);
  });

  it('flex root emits nop-flex and schema-driven direction classes only', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-contract"
        schema={{
          type: 'flex',
          direction: 'column',
          gap: 'md',
          body: [
            { type: 'text', text: 'A' },
            { type: 'text', text: 'B' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const flex = container.querySelector('.nop-flex');
    expect(flex).toBeTruthy();
    const classList = Array.from(flex?.classList ?? []);
    expect(classList).toContain('nop-flex');
    expect(classList).toContain('flex-col');
    expect(classList).toContain('gap-4');
  });

  it('container bare body has no data-flex and no style attribute', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-contract"
        schema={{ type: 'container', body: [{ type: 'text', text: 'A' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.hasAttribute('data-flex')).toBe(false);
    expect(body?.hasAttribute('style')).toBe(false);
  });

  it('container with direction:column adds flex to inner body, not root', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-contract"
        schema={{
          type: 'container',
          direction: 'column',
          gap: 'sm',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const root = container.querySelector('.nop-container');
    const body = container.querySelector('[data-slot="container-body"]');
    const rootClasses = Array.from(root?.classList ?? []);
    expect(rootClasses).not.toContain('flex');
    expect(rootClasses).not.toContain('gap-2');
    expect(body?.hasAttribute('data-flex')).toBe(true);
    const bodyClasses = Array.from(body?.classList ?? []);
    expect(bodyClasses).toContain('flex');
    expect(bodyClasses).toContain('flex-col');
    expect(bodyClasses).toContain('gap-2');
  });

  it('page applies className to root, not body', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-contract"
        schema={{
          type: 'page',
          className: 'bg-gray-100',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const page = container.querySelector('.nop-page');
    expect(page?.className).toContain('bg-gray-100');
    const body = container.querySelector('[data-slot="page-body"]');
    expect(body?.className).not.toContain('bg-gray-100');
  });

  it('container applies className to root, not body', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://layout-contract"
        schema={{
          type: 'container',
          className: 'p-4',
          body: [{ type: 'text', text: 'A' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const ct = container.querySelector('.nop-container');
    expect(ct?.className).toContain('p-4');
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.className).not.toContain('p-4');
  });
});
