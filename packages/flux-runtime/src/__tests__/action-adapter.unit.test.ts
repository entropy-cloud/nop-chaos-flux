import { describe, expect, it, vi } from 'vitest';
import type { ComponentActionInvocation, NamespacedActionInvocation } from '@nop-chaos/flux-core';
import { createActionRuntimeAdapter } from '../action-adapter.js';
import { createActionScope } from '../action-scope.js';
import { createScopeRef } from '../scope.js';

function createAdapter() {
  return createActionRuntimeAdapter({
    getEnv: () => ({ notify: vi.fn() }) as any,
    expressionCompiler: {} as any,
    evaluate: <T>(target: unknown) => target as T,
    executeApiRequest: vi.fn() as any,
    runtime: {
      env: { notify: vi.fn() },
      createChildScope: vi.fn(),
      refreshDataSource: vi.fn(),
    } as any,
    createSurfaceScope: vi.fn(),
  });
}

function createCtx(overrides: Record<string, unknown> = {}) {
  return {
    runtime: { env: { notify: vi.fn() } },
    scope: createScopeRef({ id: 'scope-1', path: '$scope', initialData: {} }),
    ...overrides,
  } as any;
}

function createBuiltInInvocation(
  action: string,
  args?: Record<string, unknown>,
  targeting?: Record<string, unknown>,
) {
  return {
    action,
    args,
    targeting: targeting ?? {},
    actionNode: {},
  } as any;
}

describe('createActionRuntimeAdapter direct branches', () => {
  it('covers dialog, drawer, toast, submit, refresh, and unsupported built-in action branches', async () => {
    const notify = vi.fn();
    const createSurfaceScope = vi.fn(() =>
      createScopeRef({ id: 'dialog-scope', path: '$dialog', initialData: {} }),
    );
    const createChildScope = vi.fn(() =>
      createScopeRef({ id: 'drawer-scope', path: '$scope.drawer', initialData: {} }),
    );
    const refreshDataSource = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify },
        createChildScope,
        refreshDataSource,
      } as any,
      createSurfaceScope,
      getDialogActionScope: () => ({ id: 'dialog-action-scope' }) as any,
      getDialogComponentRegistry: () => ({ id: 'dialog-component-registry' }) as any,
    });

    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('submitForm'),
        createCtx({ form: undefined }),
      ),
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    const form = { submit: vi.fn().mockResolvedValue({ ok: true, data: { submitted: true } }) };
    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('submitForm'),
        createCtx({ form, interactionId: 'submit-1' }),
      ),
    ).resolves.toEqual({ ok: true, data: { submitted: true } });
    expect(form.submit).toHaveBeenCalledWith({ interactionId: 'submit-1', signal: undefined });

    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('openDialog', { title: 'Dialog' }),
        createCtx({ surfaceRuntime: undefined }),
      ),
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    const surfaceRuntime = {
      open: vi.fn().mockReturnValueOnce('dialog-1').mockReturnValueOnce('drawer-1'),
      close: vi.fn(),
    };
    const openDialogCtx = createCtx({
      surfaceRuntime,
      actionScope: { id: 'ctx-action-scope' },
      componentRegistry: { id: 'ctx-component-registry' },
      nodeInstance: { templateNode: { id: 'node-1' } },
    });

    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('openDialog', { title: 'Dialog', data: { recordId: 1 } }),
        openDialogCtx,
      ),
    ).resolves.toEqual({ ok: true, data: { dialogId: 'dialog-1' } });
    expect(createSurfaceScope).toHaveBeenCalledWith('dialog', openDialogCtx, { recordId: 1 });
    expect(surfaceRuntime.open).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        kind: 'dialog',
        options: expect.objectContaining({
          actionScope: { id: 'dialog-action-scope' },
          componentRegistry: { id: 'dialog-component-registry' },
          validationPlan: undefined,
        }),
      }),
    );

    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('closeSurface', { surfaceId: 'surface-1' }),
        createCtx({ surfaceRuntime }),
      ),
    ).resolves.toEqual({ ok: true });
    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('closeDialog', { dialogId: 'dialog-2' }),
        createCtx({ surfaceRuntime }),
      ),
    ).resolves.toEqual({ ok: true });
    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('closeDrawer', { drawerId: 'drawer-2' }),
        createCtx({ surfaceRuntime }),
      ),
    ).resolves.toEqual({ ok: true });
    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('closeSurface'),
        createCtx({ surfaceRuntime, dialogId: 'fallback-dialog' }),
      ),
    ).resolves.toEqual({ ok: true });
    expect(surfaceRuntime.close).toHaveBeenCalledWith('surface-1');
    expect(surfaceRuntime.close).toHaveBeenCalledWith('dialog-2');
    expect(surfaceRuntime.close).toHaveBeenCalledWith('drawer-2');
    expect(surfaceRuntime.close).toHaveBeenCalledWith('fallback-dialog');

    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('openDrawer', { title: 'Drawer' }),
        createCtx({ surfaceRuntime: undefined }),
      ),
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    const openDrawerCtx = createCtx({
      surfaceRuntime,
      actionScope: { id: 'ctx-action-scope' },
      componentRegistry: { id: 'ctx-component-registry' },
      nodeInstance: { templateNode: { id: 'node-2' } },
    });
    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('openDrawer', { title: 'Drawer', data: { recordId: 2 } }),
        openDrawerCtx,
      ),
    ).resolves.toEqual({ ok: true, data: { drawerId: 'drawer-1' } });
    expect(createSurfaceScope).toHaveBeenCalledWith('drawer', openDrawerCtx, { recordId: 2 });
  
    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('showToast', { level: 'warning', message: 'Heads up' }),
        createCtx({ runtime: { env: { notify } } }),
      ),
    ).resolves.toEqual({ ok: true, data: { level: 'warning', message: 'Heads up' } });
    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('showToast', { level: 'unknown' }),
        createCtx({ runtime: { env: { notify } } }),
      ),
    ).resolves.toEqual({ ok: true, data: { level: 'unknown' } });
    expect(notify).toHaveBeenCalledWith('warning', 'Heads up');
    expect(notify).toHaveBeenCalledWith('info', 'Action completed');

    const page = { refresh: vi.fn(), store: { getState: () => ({ refreshTick: 4 }) } };
    await expect(
      adapter.invokeBuiltInAction(createBuiltInInvocation('refreshTable'), createCtx({ page })),
    ).resolves.toEqual({ ok: true, data: 4 });
    expect(page.refresh).toHaveBeenCalledTimes(1);

    await expect(
      adapter.invokeBuiltInAction(createBuiltInInvocation('refreshSource'), createCtx()),
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });
    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('refreshSource', { sourceId: 'source-1' }),
        createCtx(),
      ),
    ).resolves.toEqual({ ok: true, data: true, error: undefined });
    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('refreshSource', { sourceId: 'missing-source' }),
        createCtx(),
      ),
    ).resolves.toMatchObject({ ok: false, data: false, error: expect.any(Error) });
    expect(refreshDataSource).toHaveBeenNthCalledWith(1, {
      id: 'source-1',
      scope: expect.anything(),
    });
    expect(refreshDataSource).toHaveBeenNthCalledWith(2, {
      id: 'missing-source',
      scope: expect.anything(),
    });

    await expect(
      adapter.invokeBuiltInAction(createBuiltInInvocation('unsupportedBuiltIn'), createCtx()),
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });
  });

  it('returns a cancelled result when ajax execution aborts', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })) as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
      } as any,
      createSurfaceScope: vi.fn(),
    });

    await expect(
      adapter.invokeBuiltInAction(
        {
          action: 'ajax',
          args: { url: '/api/test', method: 'get' },
          targeting: {},
          actionNode: {},
        } as any,
        createCtx({ interactionId: 'ajax-1' }),
      ),
    ).resolves.toMatchObject({ ok: false, cancelled: true, error: expect.any(Error) });
  });

  it('fails component actions when registry is missing, resolve throws, or no handle exists', async () => {
    const adapter = createAdapter();

    await expect(
      adapter.invokeComponentAction(
        {
          method: 'submit',
          target: { componentId: 'form-1' },
          payload: undefined,
        } as ComponentActionInvocation,
        createCtx({ componentRegistry: undefined }),
      ),
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    await expect(
      adapter.invokeComponentAction(
        {
          method: 'submit',
          target: { componentId: 'form-1' },
          payload: undefined,
        } as ComponentActionInvocation,
        createCtx({
          componentRegistry: {
            resolve: () => {
              throw new Error('bad resolve');
            },
          },
        }),
      ),
    ).resolves.toMatchObject({ ok: false, error: new Error('bad resolve'), componentId: 'form-1' });

    await expect(
      adapter.invokeComponentAction(
        {
          method: 'submit',
          target: { componentName: 'named-form' },
          payload: undefined,
        } as ComponentActionInvocation,
        createCtx({
          componentRegistry: {
            resolve: () => undefined,
          },
        }),
      ),
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
      },
    };

    await expect(
      adapter.invokeComponentAction(
        {
          method: 'reset',
          target: { componentId: 'form-1' },
          payload: undefined,
        } as ComponentActionInvocation,
        createCtx({
          componentRegistry: { resolve: () => handle },
        }),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: expect.any(Error),
      componentId: 'form-1',
      componentType: 'form',
    });

    const primitiveHandle = {
      id: 'button-1',
      name: 'action-button',
      type: 'button',
      capabilities: {
        hasMethod: () => true,
        listMethods: () => ['click'],
        invoke: vi.fn().mockResolvedValue('clicked'),
      },
    };

    await expect(
      adapter.invokeComponentAction(
        {
          method: 'click',
          payload: { via: 'test' },
          target: { componentId: 'button-1' },
        } as ComponentActionInvocation,
        createCtx({
          componentRegistry: { resolve: () => primitiveHandle },
        }),
      ),
    ).resolves.toEqual({
      ok: true,
      data: 'clicked',
      componentId: 'button-1',
      componentName: 'action-button',
      componentType: 'button',
    });
  });

  it('fails namespaced actions without action scope or missing handlers and forwards resolved handlers', async () => {
    const adapter = createAdapter();

    await expect(
      adapter.invokeNamespacedAction(
        {
          actionName: 'dialog:open',
          namespace: 'dialog',
          method: 'open',
          payload: undefined,
        } as NamespacedActionInvocation,
        createCtx({ actionScope: undefined }),
      ),
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    const emptyScope = createActionScope({ id: 'action-scope-1' });
    await expect(
      adapter.invokeNamespacedAction(
        {
          actionName: 'dialog:open',
          namespace: 'dialog',
          method: 'open',
          payload: undefined,
        } as NamespacedActionInvocation,
        createCtx({ actionScope: emptyScope }),
      ),
    ).resolves.toMatchObject({ ok: false, error: expect.any(Error) });

    const provider = {
      kind: 'dialog',
      invoke: vi.fn().mockResolvedValue({ ok: true, data: { opened: true } }),
    } as any;
    emptyScope.registerNamespace('dialog', provider);
    const ctx = createCtx({ actionScope: emptyScope });

    await expect(
      adapter.invokeNamespacedAction(
        {
          actionName: 'dialog:open',
          namespace: 'dialog',
          method: 'open',
          payload: { title: 'Test' },
        } as NamespacedActionInvocation,
        ctx,
      ),
    ).resolves.toEqual({ ok: true, data: { opened: true } });
    expect(provider.invoke).toHaveBeenCalledWith('open', { title: 'Test' }, ctx);
  });
});

describe('formId targeting in built-in actions', () => {
  it('setValue uses form when formId matches', async () => {
    const adapter = createAdapter();
    const form = { id: 'form-1', setValue: vi.fn() };
    const scopeUpdate = vi.fn();
    const scope = createScopeRef({ id: 'scope-1', path: '$scope', initialData: {} });
    scope.update = scopeUpdate;

    await adapter.invokeBuiltInAction(
      createBuiltInInvocation('setValue', { path: 'name', value: 'Alice' }, { formId: 'form-1' }),
      createCtx({ form, scope }),
    );

    expect(form.setValue).toHaveBeenCalledWith('name', 'Alice');
    expect(scopeUpdate).not.toHaveBeenCalled();
  });

  it('setValue returns error when formId does not match', async () => {
    const adapter = createAdapter();
    const form = { id: 'form-1', setValue: vi.fn() };

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation('setValue', { path: 'name', value: 'Alice' }, { formId: 'form-2' }),
      createCtx({ form }),
    );

    expect(result).toMatchObject({ ok: false, error: expect.any(Error) });
    expect(form.setValue).not.toHaveBeenCalled();
  });

  it('setValue uses scope without formId even when form exists', async () => {
    const adapter = createAdapter();
    const form = { id: 'form-1', setValue: vi.fn() };
    const scopeUpdate = vi.fn();
    const scope = createScopeRef({ id: 'scope-1', path: '$scope', initialData: {} });
    scope.update = scopeUpdate;

    await adapter.invokeBuiltInAction(
      createBuiltInInvocation('setValue', { path: 'name', value: 'Alice' }),
      createCtx({ form, scope }),
    );

    expect(scopeUpdate).toHaveBeenCalledWith('name', 'Alice');
    expect(form.setValue).not.toHaveBeenCalled();
  });

  it('setValue uses scope without form when no formId and no form', async () => {
    const adapter = createAdapter();
    const scopeUpdate = vi.fn();
    const scope = createScopeRef({ id: 'scope-1', path: '$scope', initialData: {} });
    scope.update = scopeUpdate;

    await adapter.invokeBuiltInAction(
      createBuiltInInvocation('setValue', { path: 'name', value: 'Alice' }),
      createCtx({ form: undefined, scope }),
    );

    expect(scopeUpdate).toHaveBeenCalledWith('name', 'Alice');
  });

  it('setValues returns error when formId does not match', async () => {
    const adapter = createAdapter();
    const form = { id: 'form-1', setValues: vi.fn() };

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation('setValues', { values: { name: 'Alice' } }, { formId: 'form-2' }),
      createCtx({ form }),
    );

    expect(result).toMatchObject({ ok: false, error: expect.any(Error) });
    expect(form.setValues).not.toHaveBeenCalled();
  });

  it('submitForm resolves through component registry when formId is provided', async () => {
    const adapter = createAdapter();
    const form = { id: 'form-1', submit: vi.fn() };
    const remoteHandle = {
      capabilities: {
        invoke: vi.fn().mockResolvedValue({ ok: true, data: { submitted: true } }),
      },
    };

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation('submitForm', undefined, { formId: 'remote-form' }),
      createCtx({
        form,
        componentRegistry: {
          resolve: vi.fn().mockReturnValue(remoteHandle),
        },
      }),
    );

    expect(result).toMatchObject({ ok: true, data: { submitted: true } });
    expect(form.submit).not.toHaveBeenCalled();
  });

  it('submitForm forwards abort signal when formId resolves through component registry', async () => {
    const adapter = createAdapter();
    const controller = new AbortController();
    const remoteHandle = {
      capabilities: {
        invoke: vi.fn().mockResolvedValue({ ok: true, data: { submitted: true } }),
      },
    };

    const result = await adapter.invokeBuiltInAction(
      {
        ...createBuiltInInvocation('submitForm', undefined, { formId: 'remote-form' }),
        signal: controller.signal,
      },
      createCtx({
        interactionId: 'submit-remote',
        componentRegistry: {
          resolve: vi.fn().mockReturnValue(remoteHandle),
        },
      }),
    );

    expect(result).toMatchObject({ ok: true, data: { submitted: true } });
    expect(remoteHandle.capabilities.invoke).toHaveBeenCalledWith(
      'submit',
      {
        interactionId: 'submit-remote',
        signal: controller.signal,
      },
      expect.any(Object),
    );
  });

  it('submitForm returns error when formId does not resolve', async () => {
    const adapter = createAdapter();
    const form = { id: 'form-1', submit: vi.fn() };

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation('submitForm', undefined, { formId: 'missing-form' }),
      createCtx({
        form,
        componentRegistry: {
          resolve: vi.fn().mockReturnValue(undefined),
        },
      }),
    );

    expect(result).toMatchObject({ ok: false, error: expect.any(Error) });
    expect(form.submit).not.toHaveBeenCalled();
  });

  it('submitForm preserves registry resolve error causes', async () => {
    const adapter = createAdapter();
    const resolveError = new Error('registry broke');

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation('submitForm', undefined, { formId: 'missing-form' }),
      createCtx({
        componentRegistry: {
          resolve: vi.fn(() => {
            throw resolveError;
          }),
        },
      }),
    );

    expect(result).toMatchObject({ ok: false, error: resolveError });
  });

  it('submitForm returns error when formId is provided but no component registry', async () => {
    const adapter = createAdapter();
    const form = { id: 'form-1', submit: vi.fn() };

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation('submitForm', undefined, { formId: 'missing-form' }),
      createCtx({
        form,
        componentRegistry: undefined,
      }),
    );

    expect(result).toMatchObject({ ok: false, error: expect.any(Error) });
    expect(form.submit).not.toHaveBeenCalled();
  });

  it('submitForm preserves remote submit failures from the resolved handle', async () => {
    const adapter = createAdapter();
    const submitError = new Error('permission denied');
    const remoteHandle = {
      capabilities: {
        invoke: vi.fn().mockRejectedValue(submitError),
      },
    };

    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('submitForm', undefined, { formId: 'remote-form' }),
        createCtx({
          componentRegistry: {
            resolve: vi.fn().mockReturnValue(remoteHandle),
          },
        }),
      ),
    ).rejects.toThrow('permission denied');
  });
});
