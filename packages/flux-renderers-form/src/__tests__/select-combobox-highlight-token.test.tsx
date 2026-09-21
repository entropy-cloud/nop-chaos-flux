import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

// G2-视角7-01 (plan 489 Phase 1): the combobox search-hit highlight <mark> must
// use design-token classes (bg-warning), not the raw yellow palette.
describe('select combobox search-hit highlight token contract', () => {
  afterEach(() => {
    cleanup();
  });

  function renderForm(body: Record<string, unknown>[]) {
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, formStateProbeRenderer]);
    return render(
      <SchemaRenderer
        schemaUrl="test://form/select-combobox-highlight-token"
        schema={{
          type: 'form',
          body,
        } as React.ComponentProps<typeof SchemaRenderer>['schema']}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );
  }

  it('renders matched text in a mark with warning token classes (no yellow palette literals)', async () => {
    renderForm([
      {
        type: 'select',
        name: 'fruit',
        label: 'Fruit',
        searchable: true,
        options: [
          { label: 'Apple', value: 'apple' },
          { label: 'Grape', value: 'grape' },
        ],
      },
    ]);

    const control = screen.getByRole('combobox', { name: 'Fruit' });
    fireEvent.mouseDown(control);
    fireEvent.click(control);
    fireEvent.input(control, { target: { value: 'App' } });

    await waitFor(() => {
      expect(screen.getByText('App')).toBeTruthy();
    });

    const mark = screen.getByText('App').closest('mark');
    expect(mark).toBeTruthy();
    expect(mark?.className).toContain('bg-warning/30');
    expect(mark?.className).toContain('dark:bg-warning/50');
    expect(mark?.className).not.toContain('bg-yellow-200');
    expect(mark?.className).not.toContain('bg-yellow-800');
  });
});
