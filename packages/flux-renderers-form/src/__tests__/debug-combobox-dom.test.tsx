import React from 'react';
import { afterEach, describe, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 0,
    getVirtualItems: () => [],
  }),
}));

afterEach(() => cleanup());

function renderForm(body: Record<string, unknown>[]) {
  const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/debug"
      schema={{ type: 'form', body } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('debug', () => {
  it('fireEvent.input flow', () => {
    renderForm([
      {
        type: 'select',
        name: 'role',
        label: 'Role',
        searchable: true,
        options: [
          { label: 'Administrator', value: 'admin' },
          { label: 'Viewer', value: 'viewer' },
        ],
      },
    ]);

    const input = screen.getByRole('combobox', { name: 'Role' }) as HTMLInputElement;
    
    // Open
    fireEvent.mouseDown(input);
    fireEvent.click(input);
    
    console.log('After open - input.value:', input.value);
    console.log('After open - options:', screen.queryAllByRole('option').length);
    
    // Try fireEvent.input (original approach)
    fireEvent.input(input, { target: { value: 'admin' } });
    
    console.log('After fireEvent.input - input.value:', input.value);
    console.log('After fireEvent.input - options:', screen.queryAllByRole('option').length);
    screen.queryAllByRole('option').forEach((opt, i) => {
      console.log(`  Option ${i}: "${opt.textContent}" outerHTML=${opt.outerHTML.substring(0, 200)}`);
    });
    
    // Check if input value changed
    const inputAgain = screen.getByRole('combobox', { name: 'Role' }) as HTMLInputElement;
    console.log('Re-read input.value:', inputAgain.value);
    
    // Also try fireEvent.change  
    fireEvent.change(input, { target: { value: 'admin' } });
    
    console.log('After fireEvent.change - input.value:', input.value);
    console.log('After fireEvent.change - options:', screen.queryAllByRole('option').length);
    screen.queryAllByRole('option').forEach((opt, i) => {
      console.log(`  Option ${i}: "${opt.textContent}" outerHTML=${opt.outerHTML.substring(0, 200)}`);
    });
    
    // Try keyboard approach
    fireEvent.keyDown(input, { key: 'a' });
    
    console.log('After keyDown - input.value:', input.value);
  });
});
