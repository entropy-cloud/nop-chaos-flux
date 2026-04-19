import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index';
import { buttonRenderer, env } from './form-test-support';

describe('form render performance optimization', () => {
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
            role: 'user'
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username',
              placeholder: 'Enter username'
            },
            {
              type: 'input-email',
              name: 'email',
              label: 'Email',
              placeholder: 'Enter email'
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'User', value: 'user' },
                { label: 'Admin', value: 'admin' }
              ]
            }
          ]
        }}
        env={{
          ...env,
          monitor: { onRenderStart, onRenderEnd }
        }}
        formulaCompiler={createFormulaCompiler()}
      />
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
});
