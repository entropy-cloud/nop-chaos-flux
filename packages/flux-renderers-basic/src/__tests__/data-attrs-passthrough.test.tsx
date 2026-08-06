import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('schema-authored data attribute passthrough (flex/text/icon)', () => {
  afterEach(() => cleanup());

  it('flex forwards data-slot and data-* attributes from schema to root element', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-attrs"
        schema={{
          type: 'flex',
          'data-slot': 'dt-node',
          'data-node-variant': 'approval',
          'data-extra': 'custom',
          items: [{ type: 'text', text: 'Hello' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const flex = container.querySelector('.nop-flex');
    expect(flex).toBeTruthy();
    expect(flex?.getAttribute('data-slot')).toBe('dt-node');
    expect(flex?.getAttribute('data-node-variant')).toBe('approval');
    expect(flex?.getAttribute('data-extra')).toBe('custom');
  });

  it('text forwards data-slot and data-* attributes to the rendered tag', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-attrs"
        schema={{ type: 'text', text: 'Hello', 'data-slot': 'dt-title', 'data-node-variant': 'cc' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const text = container.querySelector('.nop-text');
    expect(text).toBeTruthy();
    expect(text?.getAttribute('data-slot')).toBe('dt-title');
    expect(text?.getAttribute('data-node-variant')).toBe('cc');
  });

  it('icon forwards data-slot and data-* attributes to the svg', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-attrs"
        schema={{ type: 'icon', icon: 'user', 'data-slot': 'dt-icon', 'data-node-variant': 'initiator' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const icon = container.querySelector('.nop-icon');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('data-slot')).toBe('dt-icon');
    expect(icon?.getAttribute('data-node-variant')).toBe('initiator');
  });

  it('does not forward non-data-* unknown keys', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-attrs"
        schema={{ type: 'flex', 'x-unknown': 'nope', items: [{ type: 'text', text: 'Hello' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const flex = container.querySelector('.nop-flex');
    expect(flex?.hasAttribute('x-unknown')).toBe(false);
  });

  it('skips empty, boolean, and object values for data-* attributes', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-attrs"
        schema={{
          type: 'flex',
          'data-empty': '',
          'data-flag': true,
          'data-object': { a: 1 },
          items: [{ type: 'text', text: 'Hello' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const flex = container.querySelector('.nop-flex');
    expect(flex?.hasAttribute('data-empty')).toBe(false);
    expect(flex?.hasAttribute('data-flag')).toBe(false);
    expect(flex?.hasAttribute('data-object')).toBe(false);
  });

  it('stringifies numeric data-* values', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://data-attrs"
        schema={{ type: 'flex', 'data-index': 3, items: [{ type: 'text', text: 'Hello' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const flex = container.querySelector('.nop-flex');
    expect(flex?.getAttribute('data-index')).toBe('3');
  });
});
