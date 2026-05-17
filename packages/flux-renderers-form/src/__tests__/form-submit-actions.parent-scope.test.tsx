import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import { env, scopeStateProbeRenderer } from './form-test-support.js';

describe('formRendererDefinitions - parent scope publication', () => {
  it('runs submit success in parent scope without exposing form-name value aliases', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      scopeStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-parent-writeback"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              id: 'feedback-form',
              onSubmitSuccess: [{ action: 'setValue', args: { path: 'submitted', value: true } }],
              data: {
                username: '',
              },
              body: [
                {
                  type: 'input-text',
                  name: 'username',
                  label: 'Username',
                },
                {
                  type: 'text',
                  text: '${username ?? ""}',
                },
              ],
              actions: [
                {
                  type: 'button',
                  label: 'Submit feedback form',
                  onClick: {
                    action: 'component:submit',
                    componentId: 'feedback-form',
                  },
                },
              ],
            },
            {
              type: 'scope-state-probe',
              name: 'submittedUsername',
            },
            {
              type: 'scope-state-probe',
              name: 'submitted',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'Carol' } });
    await waitFor(() => {
      expect(screen.getByText('Carol')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Submit feedback form'));

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:submittedUsername').textContent).toBe('null');
      expect(screen.getByTestId('scope-state:submitted').textContent).toBe('true');
    });
  });

  it('writes submit success through the business parent when the immediate parent is a surface shell', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      scopeStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/surface-parent-writeback"
        schema={{
          type: 'page',
          body: [
            {
              type: 'fragment',
              data: {
                dialogId: 'dialog-1',
              },
              body: [
                {
                  type: 'form',
                  id: 'surface-form',
                  onSubmitSuccess: [
                    { action: 'setValue', args: { path: 'savedName', value: 'Dana' } },
                  ],
                  data: {
                    name: 'Dana',
                  },
                  actions: [
                    {
                      type: 'button',
                      label: 'Submit surface form',
                      onClick: {
                        action: 'component:submit',
                        componentId: 'surface-form',
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: 'scope-state-probe',
              name: 'savedName',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Submit surface form')).toBeTruthy());
    fireEvent.click(screen.getByText('Submit surface form'));

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:savedName').textContent).toBe('"Dana"');
    });
  });

  it('does not implicitly expose local form values to the surface parent write scope', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      scopeStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/surface-built-in-submit"
        schema={{
          type: 'page',
          body: [
            {
              type: 'fragment',
              data: {
                dialogId: 'dialog-1',
              },
              body: [
                {
                  type: 'form',
                  onSubmitSuccess: [
                    { action: 'setValue', args: { path: 'submitted', value: true } },
                  ],
                  body: [
                    {
                      type: 'input-text',
                      name: 'name',
                      label: 'Name',
                    },
                  ],
                  actions: [
                    {
                      type: 'button',
                      label: 'Submit via built-in submit',
                      onClick: { action: 'submit' },
                    },
                  ],
                },
              ],
            },
            {
              type: 'scope-state-probe',
              name: 'savedName',
            },
            {
              type: 'scope-state-probe',
              name: 'submitted',
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Erin' } });
    fireEvent.click(screen.getByText('Submit via built-in submit'));

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:savedName').textContent).toBe('null');
      expect(screen.getByTestId('scope-state:submitted').textContent).toBe('true');
    });
  });
});
