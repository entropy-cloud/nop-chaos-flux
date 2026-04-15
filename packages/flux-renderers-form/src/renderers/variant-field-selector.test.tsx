import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '../index';
import { baseEnv, createFormSchemaRenderer, formulaCompiler } from './test-support';

function ScopeSelectorProbeRenderer() {
  const snapshot = useScopeSelector((scope) => ({
    value: scope.value,
    variant: scope.variant,
    readOnly: scope.readOnly
  }), Object.is) as Record<string, unknown>;
  return <span data-testid="scope-selector-probe">{JSON.stringify(snapshot)}</span>;
}

const scopeSelectorProbeRenderer: RendererDefinition = {
  type: 'scope-selector-probe',
  component: () => <ScopeSelectorProbeRenderer />
};

const variantSchema = {
  type: 'form',
  data: {
    payload: null,
  },
  body: [
    {
      type: 'variant-field',
      name: 'payload',
      label: 'Payload',
      defaultVariant: 'text',
      variants: [
        {
          key: 'text',
          label: 'Text',
          content: [{ type: 'input-text', name: 'value', label: 'Text Value' }],
          initialValue: { value: '' },
        },
        {
          key: 'number',
          label: 'Number',
          content: [{ type: 'input-text', name: 'amount', label: 'Amount' }],
          initialValue: { amount: 0 },
        },
      ],
    },
  ],
} as const;

describe('variant-field renderer selector behavior', () => {
  it('renders with the default variant tab active', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schema={{
          ...variantSchema,
          body: [
            {
              ...variantSchema.body[0],
              className: 'border',
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Text')).toBeTruthy();
      expect(screen.getByText('Number')).toBeTruthy();
    });

    const container = document.querySelector('[data-active-variant]');
    expect(container?.getAttribute('data-active-variant')).toBe('text');
    expect(container?.className).toContain('nop-field');
    expect(container?.className).toContain('border');
    expect(container?.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(container?.querySelector('[data-slot="variant-field-selector"]')).toBeTruthy();
    expect(container?.querySelector('[data-slot="variant-field-readonly-body"]')).toBeNull();
  });

  it('switching variant tab resets the field value to the new variant initial value', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(<SchemaRenderer schema={variantSchema} env={baseEnv} formulaCompiler={formulaCompiler} />);

    await waitFor(() => expect(screen.getByText('Number')).toBeTruthy());

    fireEvent.click(screen.getByRole('tab', { name: 'Number' }));

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('number');
    });
  });

  it('renders in select mode when selector.mode is select', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            payload: null,
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              defaultVariant: 'text',
              selector: { mode: 'select' },
              variants: [
                {
                  key: 'text',
                  label: 'Text Option',
                  content: [{ type: 'input-text', name: 'value', label: 'Text Value' }],
                },
                {
                  key: 'number',
                  label: 'Number Option',
                  content: [{ type: 'input-text', name: 'amount', label: 'Amount' }],
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const selectTrigger = document.querySelector('[data-slot="variant-field-selector"]');
      expect(selectTrigger).toBeTruthy();
    });
  });

  it('clears errors on variant switch', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            payload: null,
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  content: [{ type: 'input-text', name: 'value', label: 'Text Value', required: true }],
                  initialValue: { value: '' },
                },
                {
                  key: 'number',
                  label: 'Number',
                  content: [{ type: 'input-text', name: 'amount', label: 'Amount' }],
                  initialValue: { amount: 0 },
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Text')).toBeTruthy());

    fireEvent.click(screen.getByRole('tab', { name: 'Number' }));

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('number');
    });

    const errors = screen.queryAllByText(/required/i);
    expect(errors.length).toBe(0);
  });

  it('renders variant viewer in readOnly mode instead of content', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            payload: 'alpha',
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              readOnly: true,
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  match: { kind: 'typeof', value: 'string' },
                  viewer: [{ type: 'text', text: 'Viewer: ${value}', testid: 'variant-viewer' }],
                  content: [{ type: 'input-text', name: '', label: 'Text Value' }],
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('variant-viewer').textContent).toBe('Viewer: alpha'));
    expect(screen.queryByLabelText('Text Value')).toBeNull();
    const container = document.querySelector('[data-active-variant]');
    expect(container?.querySelector('[data-slot="variant-field-readonly-body"]')).toBeTruthy();
    expect(container?.querySelector('[data-slot="variant-field-selector"]')).toBeNull();
  });

  it('publishes projected variant scope through useScopeSelector', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions, scopeSelectorProbeRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            payload: 'alpha',
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  match: { kind: 'typeof', value: 'string' },
                  content: [{ type: 'scope-selector-probe' }],
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('scope-selector-probe').textContent).toBe(JSON.stringify({
        value: 'alpha',
        variant: 'text',
        readOnly: false,
      }));
    });
  });
});
