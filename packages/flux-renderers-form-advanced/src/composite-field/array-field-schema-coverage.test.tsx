// @vitest-environment happy-dom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '../test-support';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';

afterEach(() => {
  cleanup();
});

describe('array-field schema coverage', () => {
  it('covers addable and removable authored flags', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
    ]);
    const env: RendererEnv = {
      fetcher: async function <T>() {
        return { ok: true, status: 200, data: null as T };
      },
      notify: () => undefined,
    };

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/composite-field/array-field-schema-coverage.test.tsx#1"
        schema={{
          type: 'form',
          data: {
            contacts: [{ name: 'Alice' }],
          },
          body: [
            {
              type: 'array-field',
              name: 'contacts',
              itemKind: 'object',
              label: 'Contacts',
              addable: false,
              removable: false,
              item: [{ type: 'input-text', name: 'name', label: 'Name' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    expect(screen.queryByRole('button', { name: /add/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
  });
});
