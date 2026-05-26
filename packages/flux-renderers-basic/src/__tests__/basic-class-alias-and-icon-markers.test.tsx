import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('basicRendererDefinitions class alias and icon markers', () => {
  afterEach(() => {
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
  });
});
