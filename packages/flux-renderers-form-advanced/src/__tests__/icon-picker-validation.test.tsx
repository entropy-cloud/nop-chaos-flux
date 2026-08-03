import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { describe, expect, it } from 'vitest';
import { formAdvancedRendererDefinitions } from '../index.js';
import { baseEnv, formulaCompiler } from '../test-support.js';

function createTestRenderer() {
  return createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
  ]);
}

describe('icon-picker required validation (P1-1)', () => {
  it('reports a required error on submit when the value is empty', async () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker-validation#1"
        schema={{
          type: 'form',
          data: { icon: undefined },
          body: [{ type: 'icon-picker', name: 'icon', label: 'Icon', required: true }],
          actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByText('Icon is required')).toBeTruthy();
    });
  });

  it('does not report a required error when a value is selected', async () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker-validation#2"
        schema={{
          type: 'form',
          data: { icon: 'home' },
          body: [{ type: 'icon-picker', name: 'icon', label: 'Icon', required: true }],
          actions: [{ type: 'button', label: 'Submit', onClick: { action: 'submitForm' } }],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.queryByText(/required|is required/i)).toBeNull();
    });
  });
});
