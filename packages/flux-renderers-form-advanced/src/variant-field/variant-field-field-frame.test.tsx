// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { baseEnv, createFormSchemaRenderer, formulaCompiler } from '../test-support.js';

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

  it('forwards hint to FieldFrame and renders hint text on focus', async () => {
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

    expect(document.querySelector('[data-slot="field-hint"]')).toBeNull();

    const input = document.querySelector('input');
    expect(input).toBeTruthy();

    fireEvent.focus(input as HTMLInputElement);

    const hintEl = document.querySelector('[data-slot="field-hint"]');
    expect(hintEl).toBeTruthy();
    expect(hintEl?.textContent).toBe('This is a hint');

    fireEvent.blur(input as HTMLInputElement);
    expect(document.querySelector('[data-slot="field-hint"]')).toBeNull();
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

  it('supports frameWrap none without emitting field chrome', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-field-frame.test.tsx#6"
        schema={{
          type: 'form',
          data: { payload: null },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              frameWrap: 'none',
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

    await waitFor(() => expect(document.querySelector('[data-active-variant]')).toBeTruthy());
    const container = document.querySelector('[data-active-variant]');
    expect(container).toBeTruthy();
    expect(screen.queryByText('Payload')).toBeNull();
    expect(container?.classList.contains('nop-field')).toBe(false);
  });

  it('preserves group frameWrap intent on variant-field root', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-field-frame.test.tsx#7"
        schema={{
          type: 'form',
          data: { payload: null },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              frameWrap: 'group',
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

    await waitFor(() => expect(document.querySelector('[data-active-variant]')).toBeTruthy());
    const container = document.querySelector('[data-active-variant]');
    expect(container?.getAttribute('data-frame-wrap')).toBe('group');
    expect(container?.classList.contains('nop-field')).toBe(true);
  });

  it('applies meta className on the wrapped canonical control root', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-field-frame.test.tsx#wrapped-class"
        schema={{
          type: 'form',
          data: { payload: null },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              className: 'variant-wrapped-root',
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

    const fieldRoot = document.querySelector('.nop-field.variant-wrapped-root');
    expect(fieldRoot).toBeNull();

    const controlRoot = document.querySelector('[data-slot="variant-field-body"].variant-wrapped-root');
    expect(controlRoot).toBeTruthy();
    expect(controlRoot?.classList.contains('nop-variant-field')).toBe(true);
  });

  it('keeps wrapped and unwrapped control roots on the same className contract', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-field-frame.test.tsx#root-parity"
        schema={{
          type: 'form',
          data: { payload: null },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              className: 'variant-root-parity',
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

    let controlRoot = document.querySelector('[data-slot="variant-field-body"].variant-root-parity');
    expect(controlRoot).toBeTruthy();
    expect(document.querySelector('.nop-field.variant-root-parity')).toBeNull();

    rerender(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-field-frame.test.tsx#root-parity-none"
        schema={{
          type: 'form',
          data: { payload: null },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              frameWrap: 'none',
              className: 'variant-root-parity',
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

    await waitFor(() => expect(screen.queryByText('Payload')).toBeNull());

    controlRoot = document.querySelector('[data-slot="variant-field-body"].variant-root-parity');
    expect(controlRoot).toBeTruthy();
    expect(controlRoot?.classList.contains('nop-variant-field')).toBe(true);
  });
});
