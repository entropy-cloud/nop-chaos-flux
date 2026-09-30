import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { useCurrentFormState } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { describe, expect, it } from 'vitest';
import { formAdvancedRendererDefinitions } from '.././index.js';
import { keyValueRendererDefinition } from '.././key-value.js';
import { keyValueRowPropsEqual, type KeyValueRowProps } from '.././key-value-row.js';
import { baseEnv, formulaCompiler } from '.././test-support.js';
import { installFormAdvancedTestHooks } from '.././test-support.js';

installFormAdvancedTestHooks();

type KeyValueValidation = {
  getFieldPath(schema: Record<string, unknown>, ctx?: unknown): string | undefined;
  collectRules(schema: Record<string, unknown>, ctx?: unknown): Array<Record<string, unknown>>;
};

function FormValueProbeRenderer(props: { name: string; testid: string }) {
  const value = useCurrentFormState((state) => state.values[props.name], Object.is, {
    path: props.name,
  });
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
              minItems: 0,
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Add pair'));

    await waitFor(() => expect(screen.getAllByPlaceholderText('Key')).toHaveLength(1));

    fireEvent.change(screen.getAllByPlaceholderText('Key')[0], { target: { value: 'mode' } });
    fireEvent.change(screen.getAllByPlaceholderText('Value')[0], { target: { value: 'light' } });

    fireEvent.click(screen.getAllByRole('button', { name: /Remove entry/ })[0]);

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
      />,
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

  it('restores focus to the next remove button after deletion', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/key-value.test.tsx#focus-restore"
        schema={{
          type: 'form',
          data: {
            settings: [
              { id: 'pair-1', key: 'theme', value: 'dark' },
              { id: 'pair-2', key: 'locale', value: 'en-US' },
            ],
          },
          body: [
            {
              type: 'key-value',
              name: 'settings',
              label: 'Settings',
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const removeButtons = await screen.findAllByRole('button', { name: /Remove entry/ });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      const remaining = screen.getByRole('button', { name: 'Remove entry 1' });
      expect(document.activeElement).toBe(remaining);
    });
  });

  it('collects unique-key validation rules with default and custom messages', () => {
    const validation = keyValueRendererDefinition.validation as unknown as KeyValueValidation;

    expect(validation.getFieldPath({ name: 'settings' })).toBe('settings');
    expect(validation.getFieldPath({})).toBeUndefined();

    // Rules carry no hardcoded message: buildValidationMessage localizes via the
    // `validation.*` i18n fallback at validation time (C3.4 P2-1).
    expect(validation.collectRules({ name: 'settings', label: 'Settings' })).toEqual([
      { kind: 'minItems', value: 1 },
    ]);
    expect(
      validation.collectRules({ name: 'settings', label: 'Settings', uniqueKeys: true }),
    ).toEqual([{ kind: 'minItems', value: 1 }, { kind: 'uniqueBy', itemPath: 'key' }]);
    expect(
      validation.collectRules({
        name: 'settings',
        uniqueKeys: { message: 'Custom unique key message' },
      }),
    ).toEqual([
      { kind: 'minItems', value: 1 },
      { kind: 'uniqueBy', itemPath: 'key', message: 'Custom unique key message' },
    ]);
    expect(validation.collectRules({ name: 'settings', minItems: 2, maxItems: 3 })).toEqual([
      { kind: 'minItems', value: 2 },
      { kind: 'maxItems', value: 3 },
    ]);
  });

  it('skips row re-renders unless one of the row-visible props changed (R3-P25)', () => {
    const basePair = { id: 'pair-1', key: 'a', value: 'b' };
    const noop = () => {};
    const base: KeyValueRowProps = {
      pair: basePair,
      index: 0,
      totalCount: 2,
      minItems: 0,
      name: 'settings',
      currentForm: undefined,
      childBehavior: { triggers: ['blur'] } as KeyValueRowProps['childBehavior'],
      onChange: noop,
      onRemove: noop,
      onMoveUp: noop,
      onMoveDown: noop,
      disabled: false,
      readOnly: false,
      registerRemoveButton: noop,
    };

    // Identical prop identities (untouched row during a sibling edit) → skip.
    expect(keyValueRowPropsEqual(base, { ...base })).toBe(true);

    const expectBypass = (patch: Partial<KeyValueRowProps>) => {
      expect(keyValueRowPropsEqual(base, { ...base, ...patch })).toBe(false);
    };
    expectBypass({ pair: { id: 'pair-1', key: 'a2', value: 'b' } });
    expectBypass({ index: 1 });
    expectBypass({ totalCount: 3 });
    expectBypass({ minItems: 1 });
    expectBypass({ name: 'other' });
    expectBypass({ childBehavior: { triggers: ['change'] } as KeyValueRowProps['childBehavior'] });
    expectBypass({ onChange: () => {} });
    expectBypass({ onRemove: () => {} });
    expectBypass({ onMoveUp: () => {} });
    expectBypass({ onMoveDown: () => {} });
    expectBypass({ disabled: true });
    expectBypass({ readOnly: true });
    expectBypass({ registerRemoveButton: () => {} });
  });

  it('keeps sibling rows intact while one row is being edited (R3-P25 identity cache)', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
      ...formAdvancedRendererDefinitions,
      formValueProbeRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/key-value.test.tsx#row-isolation"
        schema={{
          type: 'form',
          data: {
            settings: [
              { id: 'pair-1', key: 'theme', value: 'dark' },
              { id: 'pair-2', key: 'locale', value: 'en-US' },
              { id: 'pair-3', key: 'region', value: 'eu' },
            ],
          },
          body: [
            {
              type: 'key-value',
              name: 'settings',
              label: 'Settings',
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
      />,
    );

    const keyInputs = await screen.findAllByPlaceholderText('Key');
    fireEvent.change(keyInputs[0], { target: { value: 'theme2' } });

    await waitFor(() => {
      expect(screen.getByTestId('key-value-probe').textContent).toContain('theme2');
    });

    const keyInputsAfter = screen.getAllByPlaceholderText('Key');
    expect((keyInputsAfter[0] as HTMLInputElement).value).toBe('theme2');
    expect((keyInputsAfter[1] as HTMLInputElement).value).toBe('locale');
    expect((keyInputsAfter[2] as HTMLInputElement).value).toBe('region');
    expect(screen.getAllByPlaceholderText('Value')[1]).toHaveProperty('value', 'en-US');
    expect(screen.getAllByPlaceholderText('Value')[2]).toHaveProperty('value', 'eu');

    // U15: row action labels come from complete localized keys, not fragments.
    expect(screen.getByRole('button', { name: 'Move entry 2 up' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Move entry 2 down' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove entry 3' })).toBeTruthy();
  });
});
