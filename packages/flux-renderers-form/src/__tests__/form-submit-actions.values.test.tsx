import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, scopeStateProbeRenderer } from './form-test-support.js';

describe('formRendererDefinitions - valuesPath and data expressions', () => {
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

  it('reroutes dynamic publication paths by clearing the old targets and publishing to the new targets', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      scopeStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/values-path-reroute"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Switch publication path',
              onClick: {
                action: 'setValue',
                args: {
                  path: 'activeId',
                  value: 'b',
                },
              },
            },
            {
              type: 'form',
              id: 'values-path-reroute-form',
              statusPath: 'forms.${activeId}.status',
              valuesPath: 'forms.${activeId}.values',
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
              name: 'forms.a.status',
            },
            {
              type: 'scope-state-probe',
              name: 'forms.a.values',
            },
            {
              type: 'scope-state-probe',
              name: 'forms.b.status',
            },
            {
              type: 'scope-state-probe',
              name: 'forms.b.values',
            },
          ],
        }}
        data={{ activeId: 'a' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:forms.a.values').textContent).toBe(
        '{"username":"Alice"}',
      );
      expect(screen.getByTestId('scope-state:forms.a.status').textContent).toContain(
        '"id":"values-path-reroute-form"',
      );
      expect(screen.getByTestId('scope-state:forms.b.values').textContent).toBe('null');
      expect(screen.getByTestId('scope-state:forms.b.status').textContent).toBe('null');
    });

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Bob' } });

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:forms.a.values').textContent).toBe(
        '{"username":"Bob"}',
      );
    });

    fireEvent.click(screen.getByText('Switch publication path'));

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:forms.a.values').textContent).toBe('null');
      expect(screen.getByTestId('scope-state:forms.a.status').textContent).toBe('null');
      expect(screen.getByTestId('scope-state:forms.b.values').textContent).toBe(
        '{"username":"Alice"}',
      );
      expect(screen.getByTestId('scope-state:forms.b.status').textContent).toContain(
        '"id":"values-path-reroute-form"',
      );
    });
  });
});
