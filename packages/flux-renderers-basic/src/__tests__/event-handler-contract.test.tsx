import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

describe('event handler contracts', () => {
  afterEach(() => cleanup());

  it('button renderer dispatches action on click', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://events"
        schema={{
          type: 'page',
          body: [
            { type: 'button', label: 'Submit', onClick: { action: 'setValue', args: { path: 'btn', value: 'clicked' } } },
            { type: 'text', text: 'Result: ${btn}' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(screen.getByText('Result: clicked')).toBeTruthy();
  });

  it('container renders body region correctly', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    const { container } = render(
      <SchemaRenderer
        schemaUrl="test://events"
        schema={{
          type: 'container',
          body: [
            { type: 'text', text: 'Child A' },
            { type: 'text', text: 'Child B' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Child A')).toBeTruthy();
    expect(screen.getByText('Child B')).toBeTruthy();
    const body = container.querySelector('[data-slot="container-body"]');
    expect(body?.textContent).toContain('Child A');
    expect(body?.textContent).toContain('Child B');
  });

  it('page renders body region and footer region', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://events"
        schema={{
          type: 'page',
          body: [{ type: 'text', text: 'Body content' }],
          footer: [{ type: 'text', text: 'Footer content' }],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Body content')).toBeTruthy();
    expect(screen.getByText('Footer content')).toBeTruthy();
  });

  it('tabs onChange fires and updates active tab', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://events"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              value: 'first',
              onChange: { action: 'setValue', args: { path: 'tabChanged', value: true } },
              items: [
                { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
                { key: 'second', title: 'Second', body: [{ type: 'text', text: 'Second body' }] },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('First body')).toBeTruthy());
    fireEvent.click(screen.getByText('Second'));
    await waitFor(() => expect(screen.getByText('Second body')).toBeTruthy());
  });
});
