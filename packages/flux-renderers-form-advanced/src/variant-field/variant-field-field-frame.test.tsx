import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { baseEnv, createFormSchemaRenderer, formulaCompiler } from '../test-support';

describe('variant-field FieldFrame attribute forwarding', () => {
  it('forwards required to FieldFrame and renders required marker', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-field-frame.test.tsx#1"
        schema={{
          type: 'form',
          data: { payload: null },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              required: true,
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  content: [{ type: 'input-text', name: 'value', label: 'Value' }],
                  initialValue: { value: '' },
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Payload')).toBeTruthy());

    const container = document.querySelector('[data-active-variant]');
    expect(container).toBeTruthy();
    const requiredMarker = container?.querySelector('[data-slot="field-required"]');
    expect(requiredMarker).toBeTruthy();
    expect(requiredMarker?.textContent).toBe('*');
  });

  it('forwards labelAlign to FieldFrame and sets data-label-align attribute', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-field-frame.test.tsx#2"
        schema={{
          type: 'form',
          data: { payload: null },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              labelAlign: 'left',
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  content: [{ type: 'input-text', name: 'value', label: 'Value' }],
                  initialValue: { value: '' },
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Payload')).toBeTruthy());

    const container = document.querySelector('[data-active-variant]');
    expect(container).toBeTruthy();
    expect(container?.getAttribute('data-label-align')).toBe('left');
  });

  it('maps labelAlign inherit to undefined so FieldFrame uses form default', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-field-frame.test.tsx#3"
        schema={{
          type: 'form',
          data: { payload: null },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              labelAlign: 'inherit',
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  content: [{ type: 'input-text', name: 'value', label: 'Value' }],
                  initialValue: { value: '' },
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Payload')).toBeTruthy());

    const container = document.querySelector('[data-active-variant]');
    expect(container).toBeTruthy();
    expect(container?.getAttribute('data-label-align')).toBe('top');
  });

  it('forwards hint to FieldFrame and renders hint text', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-field-frame.test.tsx#4"
        schema={{
          type: 'form',
          data: { payload: null },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              hint: 'This is a hint',
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  content: [{ type: 'input-text', name: 'value', label: 'Value' }],
                  initialValue: { value: '' },
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Payload')).toBeTruthy());

    const hintEl = document.querySelector('[data-slot="field-hint"]');
    expect(hintEl).toBeTruthy();
    expect(hintEl?.textContent).toBe('This is a hint');
  });

  it('forwards description to FieldFrame and renders description text', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-field-frame.test.tsx#5"
        schema={{
          type: 'form',
          data: { payload: null },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              description: 'Helper description',
              defaultVariant: 'text',
              variants: [
                {
                  key: 'text',
                  label: 'Text',
                  content: [{ type: 'input-text', name: 'value', label: 'Value' }],
                  initialValue: { value: '' },
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Payload')).toBeTruthy());

    const descEl = document.querySelector('[data-slot="field-description"]');
    expect(descEl).toBeTruthy();
    expect(descEl?.textContent).toBe('Helper description');
  });
});
