import { cleanup, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { baseEnv, createFormSchemaRenderer, formulaCompiler } from '../test-support';

describe('variant-field renderer detection behavior', () => {
  it('detects variant by match rules when value is provided', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-detection.test.tsx#1"
        schema={{
          type: 'form',
          data: {
            payload: 'hello world',
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              label: 'Payload',
              variants: [
                {
                  key: 'string-kind',
                  label: 'String',
                  content: [{ type: 'input-text', name: 'value', label: 'String Value' }],
                  match: { kind: 'typeof', value: 'string' },
                },
                {
                  key: 'object-kind',
                  label: 'Object',
                  content: [{ type: 'input-text', name: 'name', label: 'Object Name' }],
                  match: { kind: 'has-key', key: 'name' },
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
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('string-kind');
    });
  });

  it('falls back to first variant when no match rules match and no defaultVariant', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-detection.test.tsx#2"
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
              variants: [
                {
                  key: 'first',
                  label: 'First',
                  content: [{ type: 'input-text', name: 'x', label: 'X' }],
                },
                {
                  key: 'second',
                  label: 'Second',
                  content: [{ type: 'input-text', name: 'y', label: 'Y' }],
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
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('first');
    });
  });

  it('detects variant by expression match rules', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-detection.test.tsx#3"
        schema={{
          type: 'form',
          data: {
            payload: { kind: 'advanced', enabled: true },
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              variants: [
                {
                  key: 'simple',
                  label: 'Simple',
                  content: [{ type: 'input-text', name: 'value', label: 'Simple Value' }],
                  match: { kind: 'expression', when: '${value.kind === "simple"}' },
                },
                {
                  key: 'advanced',
                  label: 'Advanced',
                  content: [{ type: 'input-text', name: 'kind', label: 'Kind' }],
                  match: { kind: 'expression', when: '${value.enabled === true && value.kind === "advanced"}' },
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
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('advanced');
    });
  });

  it('uses detectVariantAction when built-in matches do not resolve a variant', async () => {
    cleanup();
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({
            ok: true,
            data: { variant: 'second' },
          }),
        }),
      })),
    };
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-detection.test.tsx#4"
        schema={{
          type: 'form',
          data: {
            payload: { raw: true },
            payload2: { raw: true },
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              defaultVariant: 'first',
              'xui:imports': [{ from: 'variant-lib', as: 'variantLib' }],
              detectVariantAction: { action: 'variantLib:detect' },
              variants: [
                {
                  key: 'first',
                  label: 'First',
                  content: [{ type: 'input-text', name: 'value', label: 'First Value' }],
                },
                {
                  key: 'second',
                  label: 'Second',
                  content: [{ type: 'input-text', name: 'value', label: 'Second Value' }],
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('second');
    });
  });

  it('ignores detectVariantAction results when a built-in match already resolves the variant', async () => {
    cleanup();
    const invoke = vi.fn(async () => ({
      ok: true,
      data: { variant: 'object-kind' },
    }));
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke,
        }),
      })),
    };
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-detection.test.tsx#5"
        schema={{
          type: 'form',
          data: {
            payload: 'hello world',
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              'xui:imports': [{ from: 'variant-lib', as: 'variantLib' }],
              detectVariantAction: { action: 'variantLib:detect' },
              variants: [
                {
                  key: 'string-kind',
                  label: 'String',
                  content: [{ type: 'input-text', name: 'value', label: 'String Value' }],
                  match: { kind: 'typeof', value: 'string' },
                },
                {
                  key: 'object-kind',
                  label: 'Object',
                  content: [{ type: 'input-text', name: 'name', label: 'Object Name' }],
                  match: { kind: 'has-key', key: 'name' },
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('string-kind');
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('falls back to defaultVariant when detectVariantAction returns an unknown key', async () => {
    cleanup();
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async () => ({
            ok: true,
            data: { variant: 'missing' },
          }),
        }),
      })),
    };
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-detection.test.tsx#6"
        schema={{
          type: 'form',
          data: {
            payload: { raw: true },
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              defaultVariant: 'first',
              'xui:imports': [{ from: 'variant-lib', as: 'variantLib' }],
              detectVariantAction: { action: 'variantLib:detect' },
              variants: [
                {
                  key: 'first',
                  label: 'First',
                  content: [{ type: 'input-text', name: 'value', label: 'First Value' }],
                },
                {
                  key: 'second',
                  label: 'Second',
                  content: [{ type: 'input-text', name: 'value', label: 'Second Value' }],
                },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      const container = document.querySelector('[data-active-variant]');
      expect(container?.getAttribute('data-active-variant')).toBe('first');
    });
  });

  it('injects default detectVariantAction payload and lets explicit args replace it', async () => {
    cleanup();
    const calls: Array<Record<string, unknown> | undefined> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: async (_method: string, payload: Record<string, unknown> | undefined) => {
            calls.push(payload);
            return {
              ok: true,
              data: { variant: 'second' },
            };
          },
        }),
      })),
    };
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-detection.test.tsx#7"
        schema={{
          type: 'form',
          data: {
            payload: { raw: true },
          },
          body: [
            {
              type: 'variant-field',
              name: 'payload',
              'xui:imports': [{ from: 'variant-lib', as: 'variantLib' }],
              detectVariantAction: { action: 'variantLib:detect' },
              variants: [
                { key: 'first', label: 'First', content: [{ type: 'input-text', name: 'value', label: 'First Value' }] },
                { key: 'second', label: 'Second', content: [{ type: 'input-text', name: 'value', label: 'Second Value' }] },
              ],
            },
            {
              type: 'variant-field',
              name: 'payload2',
              'xui:imports': [{ from: 'variant-lib', as: 'variantLib' }],
              detectVariantAction: { action: 'variantLib:detect', args: { reason: 'explicit' } },
              variants: [
                { key: 'first', label: 'First Explicit', content: [{ type: 'input-text', name: 'value', label: 'First Explicit Value' }] },
                { key: 'second', label: 'Second Explicit', content: [{ type: 'input-text', name: 'value', label: 'Second Explicit Value' }] },
              ],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(2));

    expect(calls[0]).toEqual({
      value: { raw: true },
      variants: ['first', 'second'],
    });
    expect(calls[1]).toEqual({ reason: 'explicit' });
  });
});
