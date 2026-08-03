import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { t } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer, useCurrentFormState } from '@nop-chaos/flux-react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { describe, expect, it } from 'vitest';
import { formAdvancedRendererDefinitions } from '../index.js';
import { baseEnv, formulaCompiler } from '../test-support.js';

function IconValueProbe(props: { name: string; testid: string }) {
  const value = useCurrentFormState((state) => state.values[props.name], Object.is, {
    path: props.name,
  });
  return <span data-testid={props.testid}>{typeof value === 'string' ? value : ''}</span>;
}

const iconValueProbeRenderer: RendererDefinition = {
  type: 'icon-value-probe',
  component: (props) => (
    <IconValueProbe
      name={String((props.props as Record<string, unknown>).name ?? '')}
      testid={String((props.props as Record<string, unknown>).testid ?? 'icon-value-probe')}
    />
  ),
};

function createTestRenderer() {
  return createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    ...formAdvancedRendererDefinitions,
    iconValueProbeRenderer,
  ]);
}

describe('icon-picker selection write-back and ARIA contract (P2-1/P2-3)', () => {
  it('selecting an icon writes the value to the form and echoes the trigger', async () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker-selection#1"
        schema={{
          type: 'form',
          data: { icon: undefined },
          body: [
            { type: 'icon-picker', name: 'icon', placeholder: 'Pick' },
            { type: 'icon-value-probe', name: 'icon', testid: 'icon-probe' },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const trigger = screen.getByRole('button', { name: /Pick/ });
    fireEvent.click(trigger);

    const searchPlaceholder = t('flux.common.search');
    await waitFor(() => {
      expect(screen.getByPlaceholderText(searchPlaceholder)).toBeTruthy();
    });

    // search narrows the grid to the target icon
    fireEvent.change(screen.getByPlaceholderText(searchPlaceholder), {
      target: { value: 'accessibility' },
    });
    const accessibilityOption = await screen.findByRole('option', { name: 'accessibility' });
    fireEvent.click(accessibilityOption);

    await waitFor(() => {
      expect(screen.getByTestId('icon-probe').textContent).toBe('accessibility');
    });
  });

  it('renders the icon grid as a listbox with selectable options', async () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker-selection#2"
        schema={{
          type: 'form',
          data: { icon: 'accessibility' },
          body: [{ type: 'icon-picker', name: 'icon' }],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const trigger = screen.getByRole('button', { name: /accessibility/ });
    fireEvent.click(trigger);

    const listbox = await screen.findByRole('listbox');
    expect(listbox).toBeTruthy();

    const options = await screen.findAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.getAttribute('aria-label')).toBeTruthy();
    }

    const selected = options.find((option) => option.getAttribute('aria-selected') === 'true');
    expect(selected?.getAttribute('aria-label')).toBe('accessibility');
  });

  it('clear button empties the value when clearable', async () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker-selection#3"
        schema={{
          type: 'form',
          data: { icon: 'accessibility' },
          body: [
            { type: 'icon-picker', name: 'icon' },
            { type: 'icon-value-probe', name: 'icon', testid: 'icon-probe' },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const clear = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clear);

    await waitFor(() => {
      expect(screen.getByTestId('icon-probe').textContent).toBe('');
    });
  });

  it('does not open or clear when readOnly', async () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker-selection#4"
        schema={{
          type: 'form',
          data: { icon: 'accessibility' },
          body: [{ type: 'icon-picker', name: 'icon', readOnly: true }],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const trigger = screen.getByRole('button', { name: /accessibility/ });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId('icon-picker-clear')).toBeNull();

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });

  it('does not open or clear when disabled', async () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker-selection#5"
        schema={{
          type: 'form',
          data: { icon: 'accessibility' },
          body: [{ type: 'icon-picker', name: 'icon', disabled: true }],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const trigger = screen.getByRole('button', { name: /accessibility/ });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).toBeNull();
    });
  });

  it('echoes an external value change into the trigger (controlled echo)', async () => {
    cleanup();
    const SchemaRenderer = createTestRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://icon-picker-selection#6"
        schema={{
          type: 'form',
          data: { icon: 'accessibility' },
          body: [{ type: 'icon-picker', name: 'icon' }],
          actions: [
            {
              type: 'button',
              label: 'SetSettings',
              onClick: { action: 'setValue', args: { path: 'icon', value: 'activity' } },
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByRole('button', { name: /accessibility/ })).toBeTruthy();

    fireEvent.click(screen.getByText('SetSettings'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /activity/ })).toBeTruthy();
    });
  });
});
