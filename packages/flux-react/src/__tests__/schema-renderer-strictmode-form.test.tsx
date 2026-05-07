import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import { env, formRenderer, probeInputRenderer, sharedFormulaCompiler } from '../test-support-core.js';

describe('SchemaRenderer form behavior in StrictMode', () => {
  it('keeps form inputs writable after StrictMode remount simulation', async () => {
    const SchemaRenderer = createSchemaRenderer([formRenderer, probeInputRenderer]);

    render(
      <React.StrictMode>
        <SchemaRenderer
          schemaUrl="test://schema-renderer-strictmode-form"
          schema={{
            type: 'form',
            data: {
              email: '',
            },
            body: [
              {
                type: 'probe-input',
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />
      </React.StrictMode>,
    );

    const input = screen.getByLabelText('Email') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'hello@example.com' } });

    await waitFor(() => {
      expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('hello@example.com');
    });
  });
});
