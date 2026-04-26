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

function createBuiltInInvocation(action: string, args?: Record<string, unknown>) {
  return {
    action,
    args,
    targeting: {},
    actionNode: {},
  } as any;
}

describe('createActionRuntimeAdapter direct branches', () => {
  it('covers dialog, drawer, toast, submit, refresh, and unsupported built-in action branches', async () => {
    const notify = vi.fn();
    const createDialogScope = vi.fn(() => ({ update: vi.fn(), id: 'dialog-scope' }));
    const createChildScope = vi.fn(() => ({ update: vi.fn(), id: 'drawer-scope' }));
    const refreshDataSource = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify } as any),
      expressionCompiler: {} as any,
      evaluate: <T,>(target: T) => target,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify },
        createChildScope,
        refreshDataSource,
      } as any,
      createDialogScope,
      getDialogActionScope: () => ({ id: 'dialog-action-scope' } as any),
      getDialogComponentRegistry: () => ({ id: 'dialog-component-registry' } as any),
    });

    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('submitForm'), createCtx({ form: undefined }))).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    const form = { submit: vi.fn().mockResolvedValue({ ok: true, data: { submitted: true } }) };
    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('submitForm'), createCtx({ form, interactionId: 'submit-1' }))).resolves.toEqual({ ok: true, data: { submitted: true } });
    expect(form.submit).toHaveBeenCalledWith({ interactionId: 'submit-1', signal: undefined });

    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('openDialog', { title: 'Dialog' }), createCtx({ surfaceRuntime: undefined }))).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    const surfaceRuntime = {
      open: vi.fn()
        .mockReturnValueOnce('dialog-1')
        .mockReturnValueOnce('drawer-1'),
      close: vi.fn(),
    };
    const openDialogCtx = createCtx({
      surfaceRuntime,
      actionScope: { id: 'ctx-action-scope' },
      componentRegistry: { id: 'ctx-component-registry' },
      nodeInstance: { templateNode: { id: 'node-1' } },
    });

    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('openDialog', { title: 'Dialog' }), openDialogCtx)).resolves.toEqual({ ok: true, data: { dialogId: 'dialog-1' } });
    expect(createDialogScope).toHaveBeenCalledWith(openDialogCtx);
    expect(surfaceRuntime.open).toHaveBeenNthCalledWith(1, expect.objectContaining({
      kind: 'dialog',
      options: expect.objectContaining({
        actionScope: { id: 'dialog-action-scope' },
        componentRegistry: { id: 'dialog-component-registry' },
      })
    }));

    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('closeSurface', { surfaceId: 'surface-1' }), createCtx({ surfaceRuntime }))).resolves.toEqual({ ok: true });
    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('closeDialog', { dialogId: 'dialog-2' }), createCtx({ surfaceRuntime }))).resolves.toEqual({ ok: true });
    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('closeDrawer', { drawerId: 'drawer-2' }), createCtx({ surfaceRuntime }))).resolves.toEqual({ ok: true });
    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('closeSurface'), createCtx({ surfaceRuntime, dialogId: 'fallback-dialog' }))).resolves.toEqual({ ok: true });
    expect(surfaceRuntime.close).toHaveBeenCalledWith('surface-1');
    expect(surfaceRuntime.close).toHaveBeenCalledWith('dialog-2');
    expect(surfaceRuntime.close).toHaveBeenCalledWith('drawer-2');
    expect(surfaceRuntime.close).toHaveBeenCalledWith('fallback-dialog');

    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('openDrawer', { title: 'Drawer' }), createCtx({ surfaceRuntime: undefined }))).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    const openDrawerCtx = createCtx({
      surfaceRuntime,
      actionScope: { id: 'ctx-action-scope' },
      componentRegistry: { id: 'ctx-component-registry' },
      nodeInstance: { templateNode: { id: 'node-2' } },
    });
    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('openDrawer', { title: 'Drawer' }), openDrawerCtx)).resolves.toEqual({ ok: true, data: { drawerId: 'drawer-1' } });
    expect(createChildScope).toHaveBeenCalledWith(openDrawerCtx.scope, {
      dialogId: 'node-2-pending',
      drawerId: 'node-2-pending'
    }, {
      scopeKey: 'node-2:drawer-scope',
      pathSuffix: 'drawer'
    });

    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('showToast', { level: 'warning', message: 'Heads up' }), createCtx({ runtime: { env: { notify } } }))).resolves.toEqual({ ok: true, data: { level: 'warning', message: 'Heads up' } });
    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('showToast', { level: 'unknown' }), createCtx({ runtime: { env: { notify } } }))).resolves.toEqual({ ok: true, data: { level: 'unknown' } });
    expect(notify).toHaveBeenCalledWith('warning', 'Heads up');
    expect(notify).toHaveBeenCalledWith('info', 'Action completed');

    const page = { refresh: vi.fn(), store: { getState: () => ({ refreshTick: 4 }) } };
    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('refreshTable'), createCtx({ page }))).resolves.toEqual({ ok: true, data: 4 });
    expect(page.refresh).toHaveBeenCalledTimes(1);

    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('refreshSource'), createCtx())).resolves.toMatchObject({ ok: false, error: expect.any(Error) });
    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('refreshSource', { sourceId: 'source-1' }), createCtx())).resolves.toEqual({ ok: true, data: true, error: undefined });
    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('refreshSource', { sourceId: 'missing-source' }), createCtx())).resolves.toMatchObject({ ok: false, data: false, error: expect.any(Error) });
    expect(refreshDataSource).toHaveBeenNthCalledWith(1, { id: 'source-1', scope: expect.anything() });
    expect(refreshDataSource).toHaveBeenNthCalledWith(2, { id: 'missing-source', scope: expect.anything() });

    await expect(adapter.invokeBuiltInAction(createBuiltInInvocation('unsupportedBuiltIn'), createCtx())).resolves.toMatchObject({ ok: false, error: expect.any(Error) });
  });

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
