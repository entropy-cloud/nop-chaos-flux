import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index.js';
import { formRendererDefinitions, env, formTestHarness, formStateProbeRenderer } from './form-test-support.js';

const { formStateProbeRenderCounts } = formTestHarness;

describe('form render performance optimization', () => {
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
