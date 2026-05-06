import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index';
import {
  buttonRenderer,
  env,
  formTestHarness,
  formStateProbeRenderer,
  scopeStateProbeRenderer,
  selectOption,
} from './form-test-support';

const { notifyCalls, submitCalls } = formTestHarness;

describe('formRendererDefinitions - submit and init actions', () => {
  afterEach(() => {
    formTestHarness.reset();
  });

  it('runs form-owned submitAction and follow-up branches through component:submit', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-actions"
        schema={{
          type: 'form',
          id: 'profile-form',
          data: {
            username: 'Alice',
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/semantic-submit',
              method: 'post',
            },
          },
          onSubmitSuccess: {
            action: 'showToast',
            args: {
              level: 'success',
              message: '${result.data.username}',
            },
          },
          actions: [
            {
              type: 'button',
              label: 'Submit semantic form',
              onClick: {
                action: 'component:submit',
                componentId: 'profile-form',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByText('Submit semantic form'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
      expect(notifyCalls).toEqual([{ level: 'success', message: 'Alice' }]);
    });

    expect(submitCalls[0]).toMatchObject({ username: 'Alice' });
  });

  it('runs form-owned onSubmitError when submitAction fails', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-actions"
        schema={{
          type: 'form',
          id: 'failing-form',
          data: {
            username: 'Alice',
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/semantic-submit-failure',
              method: 'post',
            },
          },
          onSubmitError: {
            action: 'showToast',
            args: {
              level: 'error',
              message: '${error.message}',
            },
          },
          actions: [
            {
              type: 'button',
              label: 'Submit failing semantic form',
              onClick: {
                action: 'component:submit',
                componentId: 'failing-form',
              },
            },
          ],
        }}
        env={{
          ...env,
          fetcher: async () => {
            throw new Error('semantic failure');
          },
        }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByText('Submit failing semantic form'));

    await waitFor(() => {
      expect(notifyCalls).toEqual([{ level: 'error', message: 'semantic failure' }]);
    });

    expect(submitCalls).toHaveLength(0);
  });

  it('runs form-owned onValidateError when semantic submit is blocked by validation', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-actions"
        schema={{
          type: 'form',
          id: 'validated-form',
          data: {
            username: '',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              required: true,
            },
          ],
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/validated-submit',
              method: 'post',
            },
          },
          onValidateError: {
            action: 'showToast',
            args: {
              level: 'error',
              message: '${error[0].message}',
            },
          },
          actions: [
            {
              type: 'button',
              label: 'Submit validated form',
              onClick: {
                action: 'component:submit',
                componentId: 'validated-form',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByText('Submit validated form'));

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeTruthy();
      expect(notifyCalls).toEqual([{ level: 'error', message: 'Username is required' }]);
    });

    expect(submitCalls).toHaveLength(0);
  });

  it('runs form-owned initAction once per activation instance', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      scopeStateProbeRenderer,
    ]);

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
              message: 'init-ready',
            },
          },
          body: [
            {
              type: 'scope-state-probe',
              name: 'status',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
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
              message: 'init-ready',
            },
          },
          body: [
            {
              type: 'scope-state-probe',
              name: 'status',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(notifyCalls).toEqual([{ level: 'info', message: 'init-ready' }]);
    });
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

  it('evaluates form.data expressions once into initial form values', async () => {
    cleanup();
    const formulaCompiler = createFormulaCompiler();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      scopeStateProbeRenderer,
      formStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/data-expression-initial"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              id: 'expr-init-form',
              data: {
                username: '${currentUser.name}',
                roleLabel: 'Role: ${currentUser.role}',
              },
              body: [
                {
                  type: 'form-state-probe',
                  name: 'username',
                },
                {
                  type: 'scope-state-probe',
                  name: 'roleLabel',
                },
                {
                  type: 'text',
                  text: '${username} / ${roleLabel}',
                },
              ],
            },
          ],
        }}
        data={{ currentUser: { name: 'Alice', role: 'admin' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('form-state:username').textContent).toBe('"Alice"');
      expect(screen.getByTestId('scope-state:roleLabel').textContent).toBe('"Role: admin"');
      expect(screen.getByText('Alice / Role: admin')).toBeTruthy();
    });
  });

  it('does not rebind form.data expressions after mount when parent data changes', async () => {
    cleanup();
    const formulaCompiler = createFormulaCompiler();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      formStateProbeRenderer,
    ]);

    const schema = {
      type: 'page',
      body: [
        {
          type: 'form',
          id: 'expr-non-rebind-form',
          data: {
            username: '${currentUser.name}',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
            },
            {
              type: 'form-state-probe',
              name: 'username',
            },
            {
              type: 'text',
              text: '${username}',
            },
          ],
        },
      ],
    } as const;

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://form/data-expression-non-rebind"
        schema={schema}
        data={{ currentUser: { name: 'Alice' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Username') as HTMLInputElement).value).toBe('Alice');
      expect(screen.getByText('Alice')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'Edited' } });

    await waitFor(() => {
      expect(screen.getByTestId('form-state:username').textContent).toBe('"Edited"');
      expect((screen.getByLabelText('Username') as HTMLInputElement).value).toBe('Edited');
      expect(screen.getByText('Edited')).toBeTruthy();
    });

    rerender(
      <SchemaRenderer
        schemaUrl="test://form/data-expression-non-rebind"
        schema={schema}
        data={{ currentUser: { name: 'Bob' } }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Username') as HTMLInputElement).value).toBe('Edited');
      expect(screen.getByTestId('form-state:username').textContent).toBe('"Edited"');
    });
  });

  it('submits updated form values from input and select renderers', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/submit-actions"
        schema={{
          type: 'form',
          data: {
            username: 'Alice',
            role: 'admin',
          },
          submitAction: {
            action: 'ajax',
            args: {
              url: '/api/profile',
              method: 'post',
            },
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Editor', value: 'editor' },
              ],
            },
          ],
          actions: [
            {
              type: 'button',
              label: 'Submit profile',
              onClick: {
                action: 'submitForm',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const usernameInput = screen.getByDisplayValue('Alice');

    fireEvent.change(usernameInput, { target: { value: 'Bob' } });
    await selectOption('Role', 'Editor');
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Role' }).textContent).toContain('Editor');
    });
    fireEvent.click(screen.getByText('Submit profile'));

    await waitFor(() => {
      expect(submitCalls).toHaveLength(1);
    });

    expect(submitCalls[0]).toMatchObject({
      username: 'Bob',
      role: 'editor',
    });
  });

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

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Erin' } });
    fireEvent.click(screen.getByText('Submit via built-in submit'));

    await waitFor(() => {
      expect(screen.getByTestId('scope-state:savedName').textContent).toBe('null');
      expect(screen.getByTestId('scope-state:submitted').textContent).toBe('true');
    });
  });
});
