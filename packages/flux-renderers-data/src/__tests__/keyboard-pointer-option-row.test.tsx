import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const keyboardDefinition = basicRendererDefinitions.find((d) => d.type === 'keyboard')!;

afterEach(cleanup);

const ROWS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

function items() {
  return Array.from(document.querySelectorAll('[data-slot="list-item"]'));
}

function selectedLabels() {
  return items()
    .filter((item) => item.getAttribute('data-selected') === 'true')
    .map((item) => item.textContent);
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

/**
 * D1 G-B2 × G-F combination proof: the J/K highlight-pointer gesture (P4b gap)
 * is expressible by composing the two primitives — the `keyboard` binding
 * channel moves a cursor variable via setValue, and `optionRow.value` projects
 * the cursor onto the row selected-state markers. The ternary key-by-index
 * projection needs no extra formula function; an array-indexing helper stays a
 * non-blocking candidate for larger pointer schemes.
 */
describe('keyboard binding × optionRow.value — J/K pointer combination', () => {
  it('moves the highlighted row with J and K via the binding channel + binding projection', async () => {
    const SchemaRenderer = createDataSchemaRenderer([keyboardDefinition]);
    render(
      <SchemaRenderer
        schemaUrl="test://keyboard-pointer-option-row"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'keyboard',
                bindings: [
                  {
                    keys: 'j',
                    action: {
                      action: 'setValue',
                      args: { path: 'cursor', value: '${cursor < 2 ? cursor + 1 : cursor}' },
                    },
                  },
                  {
                    keys: 'k',
                    action: {
                      action: 'setValue',
                      args: { path: 'cursor', value: '${cursor > 0 ? cursor - 1 : cursor}' },
                    },
                  },
                ],
              },
              {
                type: 'list',
                items: '${rows}',
                optionRow: {
                  value: '${cursor === 0 ? "a" : cursor === 1 ? "b" : "c"}',
                },
                item: { type: 'text', text: '${$slot.item.label}' },
              },
            ],
          } as never
        }
        data={{ rows: ROWS, cursor: 0 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await screen.findByText('Alpha');
    expect(selectedLabels()).toEqual(['Alpha']);

    // J: pointer down
    fireEvent.keyDown(window, { key: 'j' });
    await flush();
    expect(selectedLabels()).toEqual(['Beta']);

    fireEvent.keyDown(window, { key: 'j' });
    await flush();
    expect(selectedLabels()).toEqual(['Gamma']);

    // Clamped at the end
    fireEvent.keyDown(window, { key: 'j' });
    await flush();
    expect(selectedLabels()).toEqual(['Gamma']);

    // K: pointer up
    fireEvent.keyDown(window, { key: 'k' });
    await flush();
    expect(selectedLabels()).toEqual(['Beta']);

    // Non-pointer keys do not move the pointer
    fireEvent.keyDown(window, { key: 'x' });
    await flush();
    expect(selectedLabels()).toEqual(['Beta']);
  });
});
