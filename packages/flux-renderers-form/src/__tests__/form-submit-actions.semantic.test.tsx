import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index.js';
import {
  buttonRenderer,
  env,
  formTestHarness,
  scopeStateProbeRenderer,
  selectOption,
} from './form-test-support.js';

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
});
