import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { baseEnv, createFormSchemaRenderer, formulaCompiler } from '../test-support';

describe('detail-field unmount protection', () => {
  it('does not update state after unmount when handleOpen async operation is in flight', async () => {
    cleanup();
    let resolveInvoke: (value: any) => void;
    const invokePromise = new Promise((resolve) => {
      resolveInvoke = resolve;
    });
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
        (call[0].includes('unmounted') ||
          call[0].includes('unmount') ||
          call[0].includes('perform a React state update')),
    );
    expect(reactUpdateWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });

  it('does not update state after unmount when handleConfirm async operation is in flight', async () => {
    cleanup();
    let resolveInvoke: (value: any) => void;
    const invokePromise = new Promise((resolve) => {
      resolveInvoke = resolve;
    });
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
        (call[0].includes('unmounted') ||
          call[0].includes('unmount') ||
          call[0].includes('perform a React state update')),
    );
    expect(reactUpdateWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });

  it('still opens after React StrictMode remount cycles', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <React.StrictMode>
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-unmount.test.tsx#3"
          schema={{
            type: 'form',
            data: { profile: { firstName: 'Ada', lastName: 'Lovelace' } },
            body: [
              {
                type: 'detail-field',
                name: 'profile',
                triggerLabel: 'Edit Profile',
                content: [{ type: 'input-text', name: 'firstName', label: 'First Name' }],
              },
            ],
          }}
          env={baseEnv}
          formulaCompiler={formulaCompiler}
        />
      </React.StrictMode>,
    );

    await waitFor(() => expect(screen.getByText('Edit Profile')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Profile'));

    await waitFor(() => expect(screen.getByLabelText('First Name')).toBeTruthy());
  });

  it('drops stale open completions when a newer open request wins', async () => {
    cleanup();
    const pendingOpens: Array<(value: { ok: true; data: { street: string } }) => void> = [];
    const importLoader = {
      load: vi.fn(async () => ({
        createNamespace: () => ({
          kind: 'import' as const,
          invoke: vi.fn(
            async () =>
              await new Promise<{ ok: true; data: { street: string } }>((resolve) => {
                pendingOpens.push(resolve);
              }),
          ),
        }),
      })),
    };

    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-unmount.test.tsx#4"
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
    await waitFor(() => expect(pendingOpens).toHaveLength(1));

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(pendingOpens).toHaveLength(2));

    pendingOpens[1]!({ ok: true, data: { street: 'Second Draft' } });

    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());
    expect((screen.getByLabelText('Street') as HTMLInputElement).value).toBe('Second Draft');

    pendingOpens[0]!({ ok: true, data: { street: 'First Draft' } });

    await new Promise((resolve) => setTimeout(resolve, 25));

    expect((screen.getByLabelText('Street') as HTMLInputElement).value).toBe('Second Draft');
  });
});
