import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

const virtualMock = vi.hoisted(() => ({
  scrollToIndex: vi.fn(),
  items: Array.from({ length: 10 }, (_, index) => ({ key: `opt-${index}`, index, start: index * 32 })),
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 200 * 32,
    getVirtualItems: () => virtualMock.items,
    scrollToIndex: virtualMock.scrollToIndex,
  }),
}));

afterEach(() => {
  cleanup();
  virtualMock.scrollToIndex.mockReset();
});

describe('virtualized select keyboard navigation', () => {
  it('scrolls the keyboard-highlighted option into the rendered window past the first page', async () => {
    const SchemaRenderer = createSchemaRenderer(formRendererDefinitions);
    render(
      <SchemaRenderer
        schemaUrl="test://form/select-virtual-keyboard"
        schema={{
          type: 'form',
          body: [
            {
              type: 'select',
              name: 'big',
              label: 'Big',
              virtual: true,
              searchable: true,
              options: Array.from({ length: 200 }, (_, i) => ({ label: `Option ${i}`, value: `opt-${i}` })),
            },
          ],
        } as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const input = screen.getByRole('combobox', { name: 'Big' });
    fireEvent.mouseDown(input);
    fireEvent.click(input);
    await screen.findAllByRole('option');
    for (let step = 0; step < 15; step += 1) {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    }

    await waitFor(() => {
      const scrolledIndices = virtualMock.scrollToIndex.mock.calls.map(([index]) => index as number);
      expect(Math.max(-1, ...scrolledIndices)).toBeGreaterThanOrEqual(10);
    });
  });
});
