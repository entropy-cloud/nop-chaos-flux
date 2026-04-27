import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { useCurrentFormState } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { describe, expect, it } from 'vitest';
import { formAdvancedRendererDefinitions } from './index';
import { keyValueRendererDefinition } from './key-value';
import { baseEnv, formulaCompiler } from './test-support';

type KeyValueValidation = {
  getFieldPath(schema: Record<string, unknown>, ctx?: unknown): string | undefined;
  collectRules(schema: Record<string, unknown>, ctx?: unknown): Array<Record<string, unknown>>;
};

function FormValueProbeRenderer(props: { name: string; testid: string }) {
  const value = useCurrentFormState((state) => state.values[props.name], Object.is, { path: props.name });
  return <span data-testid={props.testid}>{JSON.stringify(value)}</span>;
}

const formValueProbeRenderer: RendererDefinition = {
  type: 'form-key-value-probe',
  component: (props) => (
    <FormValueProbeRenderer
      name={String((props.props as Record<string, unknown>).name ?? '')}
      testid={String((props.props as Record<string, unknown>).testid ?? 'key-value-probe')}
    />
  ),
};

describe('key-value renderer', () => {
  it('updates page-scope values when used outside a form', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/key-value.test.tsx#1"
        schema={{
          type: 'page',
          data: {},
          body: [
            {
              type: 'key-value',
              name: 'settings',
              addLabel: 'Add pair',
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />
    );

    fireEvent.click(screen.getByText('Add pair'));

    await waitFor(() => expect(screen.getAllByPlaceholderText('Key')).toHaveLength(1));

    fireEvent.change(screen.getAllByPlaceholderText('Key')[0], { target: { value: 'mode' } });
    fireEvent.change(screen.getAllByPlaceholderText('Value')[0], { target: { value: 'light' } });

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

    await waitFor(() => expect(screen.queryAllByPlaceholderText('Key')).toHaveLength(0));
    expect(screen.queryAllByPlaceholderText('Value')).toHaveLength(0);
  });

  it('validates child key-value rows and supports add/remove operations in a form', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
      formValueProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/key-value.test.tsx#2"
        schema={{
          type: 'form',
          data: {
            settings: [
              { id: 'pair-1', key: '', value: 'dark' },
              { id: 'pair-2', key: 'locale', value: '' },
            ],
          },
          body: [
            {
              type: 'key-value',
              name: 'settings',
              label: 'Settings',
              addLabel: 'Add pair',
            },
            {
              type: 'form-key-value-probe',
              name: 'settings',
              testid: 'key-value-probe',
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />
    );

    const keyInputs = await screen.findAllByPlaceholderText('Key');
    const valueInputs = screen.getAllByPlaceholderText('Value');

    fireEvent.focus(keyInputs[0]);
    fireEvent.blur(keyInputs[0]);
    fireEvent.focus(valueInputs[1]);
    fireEvent.blur(valueInputs[1]);

    await waitFor(() => expect(screen.getByText('Entry 1 key is required')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('Entry 2 value is required')).toBeTruthy());

    fireEvent.click(screen.getByText('Add pair'));
    await waitFor(() => expect(screen.getAllByPlaceholderText('Key')).toHaveLength(3));

    expect(screen.getByTestId('key-value-probe').textContent).toContain('pair-');
  });

  it('collects unique-key validation rules with default and custom messages', () => {
    const validation = keyValueRendererDefinition.validation as unknown as KeyValueValidation;

    expect(validation.getFieldPath({ name: 'settings' })).toBe('settings');
    expect(validation.getFieldPath({})).toBeUndefined();

    expect(validation.collectRules({ name: 'settings', label: 'Settings' })).toEqual([
      { kind: 'minItems', value: 1, message: 'Settings requires at least one entry' },
    ]);
    expect(validation.collectRules({ name: 'settings', label: 'Settings', uniqueKeys: true })).toEqual([
      { kind: 'minItems', value: 1, message: 'Settings requires at least one entry' },
      { kind: 'uniqueBy', itemPath: 'key', message: 'Settings keys must be unique' },
    ]);
    expect(
      validation.collectRules({
        name: 'settings',
        uniqueKeys: { message: 'Custom unique key message' },
      })
    ).toEqual([
      { kind: 'minItems', value: 1, message: 'settings requires at least one entry' },
      { kind: 'uniqueBy', itemPath: 'key', message: 'Custom unique key message' },
    ]);
  });
});
