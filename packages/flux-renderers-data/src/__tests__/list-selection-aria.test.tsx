import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

describe('20-08 list selection aria semantics (ARIA 1.2)', () => {
  it('does not emit aria-selected on listitem and marks the selected item with aria-current', async () => {
    const SchemaRenderer = createDataSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://list-selection-aria"
        schema={{
          type: 'page',
          body: [
            {
              type: 'list',
              items: '${rows}',
              selectionMode: 'single',
              item: { type: 'text', text: '${$slot.item.label}' },
            },
          ],
        }}
        data={{
          rows: [
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeTruthy();
      expect(screen.getByText('Beta')).toBeTruthy();
    });

    const items = Array.from(document.querySelectorAll('[data-slot="list-item"]'));
    expect(items.length).toBe(2);
    for (const item of items) {
      expect(item.hasAttribute('aria-selected')).toBe(false);
      expect(item.hasAttribute('aria-current')).toBe(false);
    }

    fireEvent.click(items[0]!);

    const selected = document.querySelector('[data-slot="list-item"][data-selected]');
    expect(selected).toBeTruthy();
    expect(selected?.getAttribute('aria-current')).toBe('true');
    expect(selected?.hasAttribute('aria-selected')).toBe(false);
  });
});
