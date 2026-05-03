import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index';
import {
  buttonRenderer,
  env,
  formTestHarness,
  formStateProbeRenderer,
} from './form-test-support';

const { formStateProbeRenderCounts } = formTestHarness;

describe('form render performance optimization', () => {
  afterEach(() => {
    formTestHarness.reset();
  });

  it('changing one field does not trigger NodeRenderer re-renders for other fields', async () => {
    const onRenderStart = vi.fn();
    const onRenderEnd = vi.fn();

    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/render-performance"
        schema={{
          type: 'form',
          data: {
            username: 'initial',
            email: 'test@example.com',
            role: 'user',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              placeholder: 'Enter username',
            },
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
              placeholder: 'Enter email',
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'User', value: 'user' },
                { label: 'Admin', value: 'admin' },
              ],
            },
          ],
        }}
        env={{
          ...env,
          monitor: { onRenderStart, onRenderEnd },
        }}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(onRenderStart).toHaveBeenCalled();
    });

    onRenderStart.mockClear();
    onRenderEnd.mockClear();

    fireEvent.change(screen.getByDisplayValue('initial'), { target: { value: 'changed' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('changed')).toBeTruthy();
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onRenderStart).not.toHaveBeenCalled();
    expect(onRenderEnd).not.toHaveBeenCalled();
  });

  it('does not rerender a field-value probe for unrelated field updates', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...formRendererDefinitions,
      formStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/render-performance-probe"
        schema={{
          type: 'form',
          data: {
            username: 'initial',
            email: 'test@example.com',
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
            },
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
            },
            {
              type: 'form-state-probe',
              name: 'username',
            },
            {
              type: 'form-state-probe',
              name: 'email',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('form-state:username').textContent).toBe('"initial"');
      expect(screen.getByTestId('form-state:email').textContent).toBe('"test@example.com"');
    });

    const usernameRenderCountBefore = formStateProbeRenderCounts.username;
    const emailRenderCountBefore = formStateProbeRenderCounts.email;

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'next@example.com' } });

    await waitFor(() => {
      expect(screen.getByTestId('form-state:email').textContent).toBe('"next@example.com"');
    });

    expect(formStateProbeRenderCounts.username).toBe(usernameRenderCountBefore);
    expect(formStateProbeRenderCounts.email).toBeGreaterThan(emailRenderCountBefore);
  });
});
