import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { baseEnv, createFormSchemaRenderer, formulaCompiler } from '../test-support';

describe('variant-field unmount protection', () => {
  it('does not update state after unmount when detectVariantAction is in flight', async () => {
    cleanup();
    let resolveDetect: (value: any) => void;
    const detectPromise = new Promise((resolve) => {
      resolveDetect = resolve;
    });
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: vi.fn(async () => {
            await detectPromise;
            return { ok: true, data: { variant: 'second' } };
          }),
        }),
      })),
    };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const SchemaRenderer = createFormSchemaRenderer();

    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/variant-field/variant-field-unmount.test.tsx#1"
        schema={{
          type: 'form',
          data: { payload: { raw: true } },
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

    await waitFor(() => expect(screen.getByText('First')).toBeTruthy());

    unmount();

    resolveDetect!({ ok: true, data: { variant: 'second' } });

    await new Promise((r) => setTimeout(r, 50));

    const reactUpdateWarnings = consoleErrorSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0].includes('unmounted') ||
          call[0].includes('unmount') ||
          call[0].includes('perform a React state update')),
    );
    expect(reactUpdateWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });
});
