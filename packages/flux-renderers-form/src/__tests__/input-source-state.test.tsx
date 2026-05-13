import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env, formStateProbeRenderer } from './form-test-support.js';

afterEach(() => {
  cleanup();
});

describe('input renderer source state branches', () => {
  it('renders a string source error for select options', () => {
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/input-source-state#select-error"
        schema={{
          type: 'form',
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [],
              optionsSourceState: {
                loading: false,
                status: 'error',
                error: 'Options failed',
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(screen.getByText('Options failed')).toBeTruthy();
    const alert = screen.getByRole('alert');
    const trigger = screen.getByRole('combobox', { name: 'Role' });
    expect(trigger.getAttribute('aria-required')).toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBe(alert.id);
    expect(trigger.getAttribute('aria-errormessage')).toBe(alert.id);
  });

  it('publishes required semantics on select triggers', () => {
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/input-source-state#select-required"
        schema={{
          type: 'form',
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              required: true,
              options: [{ label: 'Admin', value: 'admin' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Role' }).getAttribute('aria-required')).toBe('true');
  });

  it('renders an object message source error for radio-group options', () => {
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/input-source-state#radio-error"
        schema={{
          type: 'form',
          body: [
            {
              type: 'radio-group',
              name: 'status',
              label: 'Status',
              options: [],
              optionsSourceState: {
                loading: false,
                status: 'error',
                error: { message: 'Remote options unavailable' },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const error = screen.getByText('Remote options unavailable');
    expect(error).toBeTruthy();
    expect(error.getAttribute('id')).toBe('status-source-error');
    expect(document.querySelector('[data-slot="radio-group-options"]')?.getAttribute('aria-describedby')).toBe(
      'status-source-error',
    );
    expect(
      document.querySelector('[data-slot="radio-group-options"]')?.getAttribute('aria-errormessage'),
    ).toBe('status-source-error');
  });

  it('falls back to the default source error message for checkbox-group options', () => {
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/input-source-state#checkbox-error"
        schema={{
          type: 'form',
          body: [
            {
              type: 'checkbox-group',
              name: 'tags',
              label: 'Tags',
              options: [],
              optionsSourceState: {
                loading: false,
                status: 'error',
                error: { code: 'bad-gateway' },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    const error = screen.getByText('Failed to load options.');
    expect(error).toBeTruthy();
    expect(error.getAttribute('role')).toBe('alert');
    expect(document.querySelector('[data-slot="checkbox-group-wrapper"]')?.getAttribute('aria-describedby')).toBe(
      'tags-source-error',
    );
  });

  it('removes checkbox-group values when an already-selected option is unchecked', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...formRendererDefinitions,
      formStateProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://form/input-source-state#checkbox-remove"
        schema={{
          type: 'form',
          data: {
            tags: ['stable'],
          },
          body: [
            {
              type: 'checkbox-group',
              name: 'tags',
              label: 'Tags',
              options: [
                { label: 'Stable', value: 'stable' },
                { label: 'Beta', value: 'beta' },
              ],
            },
            {
              type: 'form-state-probe',
              name: 'tags',
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /Stable/ }));

    await waitFor(() => {
      expect(screen.getByTestId('form-state:tags').textContent).toBe('[]');
    });
  });
});
