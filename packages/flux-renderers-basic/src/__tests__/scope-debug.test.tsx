import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach } from 'vitest';
import { describe, expect, it } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '../index.js';
import { env } from '../test-support.js';

afterEach(() => {
  cleanup();
});

describe('ScopeDebugRenderer', () => {
  it('does not serialize scope until expanded, then reacts to updates', async () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schemaUrl="test://basic/scope-debug-collapsed"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Increment',
              onClick: { action: 'setValue', args: { path: 'count', value: '${count + 1}' } },
            },
            { type: 'scope-debug', title: 'Probe', defaultExpand: false },
          ],
        }}
        data={{ count: 0 }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(screen.getByText('Probe')).toBeTruthy();
    expect(document.querySelector('[data-slot="scope-debug-json"]')?.textContent).toBe(
      'Expand to inspect scope.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="scope-debug-json"]')?.textContent).toBe(
        'Expand to inspect scope.',
      );
    });

    const toggle = document.querySelector('[data-slot="scope-debug-toggle"]');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle as HTMLElement);

    await waitFor(() => {
      expect(toggle?.getAttribute('aria-expanded')).toBe('true');
      expect(document.querySelector('[data-slot="scope-debug-json"]')?.textContent).toBe(
        '{\n  "count": 1\n}',
      );
    });
  });

  it('omits undefined object fields while keeping JSON-like array semantics and special encodings', async () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schemaUrl="test://basic/scope-debug-specials"
        schema={{
          type: 'page',
          body: [{ type: 'scope-debug', title: 'Undefined Probe', defaultExpand: true }],
        }}
        data={{
          keep: 'value',
          omit: undefined,
          list: [1, undefined, () => 'x'],
          fn: () => 'y',
        } as any}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="scope-debug-json"]')?.textContent).toBe(
        '{\n  "keep": "value",\n  "list": [\n    1,\n    null,\n    "@function"\n  ],\n  "fn": "@function"\n}',
      );
    });
  });
});
