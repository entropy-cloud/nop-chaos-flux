import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { baseEnv, createFormSchemaRenderer, formulaCompiler } from '../test-support';

describe('detail-field unmount protection', () => {
  it('does not update state after unmount when handleOpen async operation is in flight', async () => {
    cleanup();
    let resolveInvoke: (value: any) => void;
    const invokePromise = new Promise((resolve) => { resolveInvoke = resolve; });
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: vi.fn(async () => {
            await invokePromise;
            return { ok: true, data: { street: 'Adapted' } };
          }),
        }),
      })),
    };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const SchemaRenderer = createFormSchemaRenderer();

    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-unmount.test.tsx#1"
        schema={{
          type: 'form',
          data: { address: 'Alpha' },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              triggerLabel: 'Edit Address',
              'xui:imports': [{ from: 'detail-lib', as: 'detailLib' }],
              transformInAction: { action: 'detailLib:toDraft' },
              content: [{ type: 'input-text', name: 'street', label: 'Street' }],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));

    await new Promise((r) => setTimeout(r, 10));

    unmount();

    resolveInvoke!({ ok: true, data: { street: 'Adapted' } });

    await new Promise((r) => setTimeout(r, 50));

    const reactUpdateWarnings = consoleErrorSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0].includes('unmounted') || call[0].includes('unmount') || call[0].includes('perform a React state update'))
    );
    expect(reactUpdateWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });

  it('does not update state after unmount when handleConfirm async operation is in flight', async () => {
    cleanup();
    let resolveInvoke: (value: any) => void;
    const invokePromise = new Promise((resolve) => { resolveInvoke = resolve; });
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: vi.fn(async () => {
            await invokePromise;
            return { ok: true, data: 'Committed' };
          }),
        }),
      })),
    };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const SchemaRenderer = createFormSchemaRenderer();

    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-unmount.test.tsx#2"
        schema={{
          type: 'form',
          data: { address: { street: '123 Main St' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit' },
              'xui:imports': [{ from: 'detail-lib', as: 'detailLib' }],
              transformOutAction: { action: 'detailLib:toCommit' },
              content: [{ type: 'input-text', name: 'street', label: 'Street' }],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByText('Confirm')).toBeTruthy());

    fireEvent.click(screen.getByText('Confirm'));

    await new Promise((r) => setTimeout(r, 10));

    unmount();

    resolveInvoke!({ ok: true, data: 'Committed' });

    await new Promise((r) => setTimeout(r, 50));

    const reactUpdateWarnings = consoleErrorSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === 'string' &&
        (call[0].includes('unmounted') || call[0].includes('unmount') || call[0].includes('perform a React state update'))
    );
    expect(reactUpdateWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });
});
