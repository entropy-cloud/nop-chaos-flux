import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index';
import { buttonRenderer, env, notifyCalls, scopeStateProbeRenderer, selectOption, submitCalls } from './form-test-support';

describe('formRendererDefinitions - submit and init actions', () => {
  it('runs form-owned submitAction and follow-up branches through component:submit', async () => {
    submitCalls.length = 0;
    notifyCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-actions"
        schema={{
          type: 'form',
          id: 'profile-form',
          data: {
            username: 'Alice'
          },
          submitAction: {
            action: 'ajax',
            api: {
              url: '/api/semantic-submit',
              method: 'post'
            }
          },
          onSubmitSuccess: {
            action: 'showToast',
            args: {
              level: 'success',
              message: '${result.data.username}'
            }
          },
          actions: [
            {
              type: 'button',
              label: 'Submit semantic form',
              onClick: {
                action: 'component:submit',
                componentId: 'profile-form'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit semantic form'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
      expect(notifyCalls).toEqual([{ level: 'success', message: 'Alice' }]);
    });

    expect(submitCalls[0]).toMatchObject({ username: 'Alice' });
  });

  it('runs form-owned onSubmitError when submitAction fails', async () => {
    submitCalls.length = 0;
    notifyCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-actions"
        schema={{
          type: 'form',
          id: 'failing-form',
          data: {
            username: 'Alice'
          },
          submitAction: {
            action: 'ajax',
            api: {
              url: '/api/semantic-submit-failure',
              method: 'post'
            }
          },
          onSubmitError: {
            action: 'showToast',
            args: {
              level: 'error',
              message: '${error.message}'
            }
          },
          actions: [
            {
              type: 'button',
              label: 'Submit failing semantic form',
              onClick: {
                action: 'component:submit',
                componentId: 'failing-form'
              }
            }
          ]
        }}
        env={{
          ...env,
          fetcher: async () => {
            throw new Error('semantic failure');
          }
        }}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit failing semantic form'));

    await waitFor(() => {
      expect(notifyCalls).toEqual([{ level: 'error', message: 'semantic failure' }]);
    });

    expect(submitCalls).toHaveLength(0);
  });

  it('runs form-owned onValidateError when semantic submit is blocked by validation', async () => {
    submitCalls.length = 0;
    notifyCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-actions"
        schema={{
          type: 'form',
          id: 'validated-form',
          data: {
            username: ''
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              required: true
            }
          ],
          submitAction: {
            action: 'ajax',
            api: {
              url: '/api/validated-submit',
              method: 'post'
            }
          },
          onValidateError: {
            action: 'showToast',
            args: {
              level: 'error',
              message: '${error[0].message}'
            }
          },
          actions: [
            {
              type: 'button',
              label: 'Submit validated form',
              onClick: {
                action: 'component:submit',
                componentId: 'validated-form'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit validated form'));

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeTruthy();
      expect(notifyCalls).toEqual([{ level: 'error', message: 'Username is required' }]);
    });

    expect(submitCalls).toHaveLength(0);
  });

  it('runs form-owned initAction once per activation instance', async () => {
    submitCalls.length = 0;
    notifyCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions, scopeStateProbeRenderer]);

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://form/init-actions"
        schema={{
          type: 'form',
          id: 'init-form',
          initAction: {
            action: 'showToast',
            args: {
              level: 'info',
              message: 'init-ready'
            }
          },
          body: [
            {
              type: 'scope-state-probe',
              name: 'status'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(notifyCalls).toEqual([{ level: 'info', message: 'init-ready' }]);
    });

    rerender(
      <SchemaRenderer
        schemaUrl="test://form/init-actions"
        schema={{
          type: 'form',
          id: 'init-form',
          initAction: {
            action: 'showToast',
            args: {
              level: 'info',
              message: 'init-ready'
            }
          },
          body: [
            {
              type: 'scope-state-probe',
              name: 'status'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    await waitFor(() => {
      expect(notifyCalls).toEqual([{ level: 'info', message: 'init-ready' }]);
    });
  });

  it('submits updated form values from input and select renderers', async () => {
    submitCalls.length = 0;
    notifyCalls.length = 0;
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-actions"
        schema={{
          type: 'form',
          data: {
            username: 'Alice',
            role: 'admin'
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username'
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Editor', value: 'editor' }
              ]
            }
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit profile',
              onClick: {
                action: 'submitForm',
                api: {
                  url: '/api/profile',
                  method: 'post'
                }
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const usernameInput = screen.getByDisplayValue('Alice');

    fireEvent.change(usernameInput, { target: { value: 'Bob' } });
    await selectOption('Role', 'Editor');
    fireEvent.click(screen.getByText('Submit profile'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({
      username: 'Bob',
      role: 'editor'
    });
  });

  it('runs submit success in parent scope while preserving form-name bindings', async () => {
    submitCalls.length = 0;
    notifyCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions, scopeStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-parent-writeback"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              id: 'feedback-form',
              name: 'feedbackForm',
              onSubmitSuccess: [
                { action: 'setValue', args: { path: 'submitted', value: true } },
                { action: 'setValue', args: { path: 'submittedUsername', value: '${feedbackForm.username}' } }
              ],
              data: {
                username: ''
              },
              body: [
                {
                  type: 'input-text',
                  name: 'username',
                  label: 'Username'
                },
                {
                  type: 'text',
                  text: '${feedbackForm.username ?? ""}'
                }
              ],
              actions: [
                {
                  type: 'button',
                  label: 'Submit feedback form',
                  onClick: {
                    action: 'component:submit',
                    componentId: 'feedback-form'
                  }
                }
              ]
            },
            {
              type: 'scope-state-probe',
              name: 'submittedUsername'
            },
            {
              type: 'scope-state-probe',
              name: 'submitted'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const usernameInput = screen.getByLabelText('Username');
    fireEvent.change(usernameInput, { target: { value: 'Carol' } });
    await waitFor(() => {
      expect(screen.getByText('Carol')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Submit feedback form'));

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:submittedUsername').textContent).toBe('"Carol"');
      expect(screen.getByTestId('scope-state:submitted').textContent).toBe('true');
    });
  });

  it('writes submit success through the business parent when the immediate parent is a surface shell', async () => {
    submitCalls.length = 0;
    notifyCalls.length = 0;
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions, scopeStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/surface-parent-writeback"
        schema={{
          type: 'page',
          body: [
            {
              type: 'fragment',
              data: {
                dialogId: 'dialog-1'
              },
              body: [
                {
                  type: 'form',
                  id: 'surface-form',
                  name: 'surfaceForm',
                  onSubmitSuccess: [
                    { action: 'setValue', args: { path: 'savedName', value: '${surfaceForm.name}' } }
                  ],
                  data: {
                    name: 'Dana'
                  },
                  actions: [
                    {
                      type: 'button',
                      label: 'Submit surface form',
                      onClick: {
                        action: 'component:submit',
                        componentId: 'surface-form'
                      }
                    }
                  ]
                }
              ]
            },
            {
              type: 'scope-state-probe',
              name: 'savedName'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    fireEvent.click(screen.getByText('Submit surface form'));

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:savedName').textContent).toBe('"Dana"');
    });
  });
});
