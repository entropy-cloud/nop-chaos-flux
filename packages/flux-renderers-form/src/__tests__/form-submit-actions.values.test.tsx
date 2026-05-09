import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, formTestHarness, scopeStateProbeRenderer } from './form-test-support.js';

describe('formRendererDefinitions - valuesPath and data expressions', () => {
  afterEach(() => {
    formTestHarness.reset();
  });

  it('publishes initial form values through valuesPath to the parent scope', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      scopeStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/values-path-initial"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              id: 'values-path-form',
              valuesPath: 'ui.formValues',
              data: {
                username: 'Alice',
                role: 'admin',
              },
            },
            {
              type: 'scope-state-probe',
              name: 'ui.formValues',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:ui.formValues').textContent).toBe(
        '{"username":"Alice","role":"admin"}',
      );
    });
  });

  it('publishes live form value edits through valuesPath to the parent scope', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      scopeStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/values-path-live"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              id: 'values-path-live-form',
              valuesPath: 'ui.formValues',
              data: {
                username: 'Alice',
              },
              body: [
                {
                  type: 'input-text',
                  name: 'username',
                  label: 'Username',
                },
              ],
            },
            {
              type: 'scope-state-probe',
              name: 'ui.formValues',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Bob' } });

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:ui.formValues').textContent).toBe(
        '{"username":"Bob"}',
      );
    });
  });
});
