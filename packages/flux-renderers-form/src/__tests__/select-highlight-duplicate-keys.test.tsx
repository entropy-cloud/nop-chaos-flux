import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('select search highlight', () => {
  it('highlights every repeated match without duplicate React keys', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const SchemaRenderer = createSchemaRenderer(formRendererDefinitions);
    render(
      <SchemaRenderer
        schemaUrl="test://form/select-highlight"
        schema={{
          type: 'form',
          body: [{ type: 'select', name: 'fruit', label: 'Fruit', searchable: true, options: [{ label: 'banana', value: 'banana' }] }],
        } as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
    const input = screen.getByRole('combobox', { name: 'Fruit' });
    fireEvent.mouseDown(input);
    fireEvent.click(input);
    fireEvent.input(input, { target: { value: 'an' } });

    const option = await screen.findByRole('option');
    expect(Array.from(option.querySelectorAll('mark')).map((mark) => mark.textContent)).toEqual(['an', 'an']);
    const duplicateKeyWarnings = consoleError.mock.calls.filter((call) =>
      call.some((arg) => typeof arg === 'string' && arg.includes('same key')),
    );
    expect(duplicateKeyWarnings).toEqual([]);
  });
});
