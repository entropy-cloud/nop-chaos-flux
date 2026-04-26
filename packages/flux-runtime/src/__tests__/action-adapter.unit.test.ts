import { describe, expect, it, vi } from 'vitest';
import { createActionRuntimeAdapter } from '../action-adapter';
import { createActionScope } from '../action-scope';
import { createScopeRef } from '../scope';

function createAdapter() {
  return createActionRuntimeAdapter({
    getEnv: () => ({ notify: vi.fn() } as any),
    expressionCompiler: {} as any,
    evaluate: <T,>(target: T) => target,
    executeApiRequest: vi.fn() as any,
    runtime: {
      env: { notify: vi.fn() },
      createChildScope: vi.fn(),
      refreshDataSource: vi.fn(),
    } as any,
    createDialogScope: vi.fn(),
  });
}

function createCtx(overrides: Record<string, unknown> = {}) {
  return {
    runtime: { env: { notify: vi.fn() } },
    scope: createScopeRef({ id: 'scope-1', path: '$scope', initialData: {} }),
    ...overrides,
  } as any;
}

describe('createActionRuntimeAdapter direct branches', () => {
  it('fails component actions when registry is missing, resolve throws, or no handle exists', async () => {
    const adapter = createAdapter();

    await expect(
      adapter.invokeComponentAction({ method: 'submit', target: { componentId: 'form-1' } } as any, createCtx({ componentRegistry: undefined }))
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    await expect(
      adapter.invokeComponentAction(
        { method: 'submit', target: { componentId: 'form-1' } } as any,
        createCtx({
          componentRegistry: {
            resolve: () => {
              throw new Error('bad resolve');
            }
          }
        })
      )
    ).resolves.toMatchObject({ ok: false, error: new Error('bad resolve'), componentId: 'form-1' });

    await expect(
      adapter.invokeComponentAction(
        { method: 'submit', target: { componentName: 'named-form' } } as any,
        createCtx({
          componentRegistry: {
            resolve: () => undefined
          }
        })
      )
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error), componentName: 'named-form' });
  });

  it('rejects unsupported component methods and wraps primitive invocation results', async () => {
    const adapter = createAdapter();
    const handle = {
      id: 'form-1',
      name: 'profile',
      type: 'form',
      capabilities: {
        hasMethod: () => false,
        listMethods: () => ['submit'],
        invoke: vi.fn(),
      }
    };

    await expect(
      adapter.invokeComponentAction(
        { method: 'reset', target: { componentId: 'form-1' } } as any,
        createCtx({
          componentRegistry: { resolve: () => handle }
        })
      )
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error), componentId: 'form-1', componentType: 'form' });

    const primitiveHandle = {
      id: 'button-1',
      name: 'action-button',
      type: 'button',
      capabilities: {
        hasMethod: () => true,
        listMethods: () => ['click'],
        invoke: vi.fn().mockResolvedValue('clicked'),
      }
    };

    await expect(
      adapter.invokeComponentAction(
        { method: 'click', payload: { via: 'test' }, target: { componentId: 'button-1' } } as any,
        createCtx({
          componentRegistry: { resolve: () => primitiveHandle }
        })
      )
    ).resolves.toEqual({
      ok: true,
      data: 'clicked',
      componentId: 'button-1',
      componentName: 'action-button',
      componentType: 'button'
    });
  });

  it('fails namespaced actions without action scope or missing handlers and forwards resolved handlers', async () => {
    const adapter = createAdapter();

    await expect(
      adapter.invokeNamespacedAction({ actionName: 'dialog:open' } as any, createCtx({ actionScope: undefined }))
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    const emptyScope = createActionScope({ id: 'action-scope-1' });
    await expect(
      adapter.invokeNamespacedAction({ actionName: 'dialog:open' } as any, createCtx({ actionScope: emptyScope }))
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    const provider = {
      kind: 'dialog',
      invoke: vi.fn().mockResolvedValue({ ok: true, data: { opened: true } }),
    } as any;
    emptyScope.registerNamespace('dialog', provider);
    const ctx = createCtx({ actionScope: emptyScope });

    await expect(
      adapter.invokeNamespacedAction({ actionName: 'dialog:open', payload: { title: 'Test' } } as any, ctx)
    ).resolves.toEqual({ ok: true, data: { opened: true } });
    expect(provider.invoke).toHaveBeenCalledWith('open', { title: 'Test' }, ctx);
  });
});
