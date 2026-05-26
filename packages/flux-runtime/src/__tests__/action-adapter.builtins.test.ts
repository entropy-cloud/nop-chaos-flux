import { describe, expect, it, vi } from 'vitest';
import { createActionRuntimeAdapter, createBuiltInInvocation, createCtx } from './action-adapter.test-support.js';
import { createScopeRef } from '../scope.js';

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

    const compileError = new Error('bad surface body');
    const failingSurfaceRuntime = { open: vi.fn(), close: vi.fn() };
    const failingAdapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify, monitor: { onError: vi.fn() } },
        createChildScope,
        refreshDataSource,
        compile: vi.fn(() => {
          throw compileError;
        }),
      } as any,
      createSurfaceScope,
    });

    await expect(
      failingAdapter.invokeBuiltInAction(
        createBuiltInInvocation('openDialog', { title: 'Broken', body: [{ type: 'text' }] }),
        createCtx({ surfaceRuntime: failingSurfaceRuntime }),
      ),
    ).resolves.toEqual({ ok: false, error: compileError });
    expect(failingSurfaceRuntime.open).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      'error',
      'Failed to open dialog: validation plan compilation failed',
    );

    await expect(
      failingAdapter.invokeBuiltInAction(
        createBuiltInInvocation('openDrawer', { title: 'Broken drawer', body: [{ type: 'text' }] }),
        createCtx({ surfaceRuntime: failingSurfaceRuntime }),
      ),
    ).resolves.toEqual({ ok: false, error: compileError });
    expect(failingSurfaceRuntime.open).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      'error',
      'Failed to open drawer: validation plan compilation failed',
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
        createBuiltInInvocation('refreshSource', { targetId: 'source-1' }),
        createCtx(),
      ),
    ).resolves.toEqual({ ok: true, data: true, error: undefined });
    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('refreshSource', { targetId: 'missing-source' }),
        createCtx(),
      ),
    ).resolves.toMatchObject({ ok: false, data: false, error: expect.any(Error) });
    expect(refreshDataSource).toHaveBeenNthCalledWith(1, {
      name: 'source-1',
      scope: expect.anything(),
    });
    expect(refreshDataSource).toHaveBeenNthCalledWith(2, {
      name: 'missing-source',
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
});

describe('built-in scope-write and submit semantics', () => {
  it('setValue always writes current scope even when form exists', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: { get: vi.fn(() => undefined) },
      } as any,
      createSurfaceScope: vi.fn(),
    });
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

  it('setValue no longer uses componentId as a path fallback', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: { get: vi.fn(() => undefined) },
      } as any,
      createSurfaceScope: vi.fn(),
    });
    const scopeUpdate = vi.fn();
    const scope = createScopeRef({ id: 'scope-1', path: '$scope', initialData: {} });
    scope.update = scopeUpdate;

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation('setValue', { value: 'Alice' }, { componentId: 'legacy-component' }),
      createCtx({ scope }),
    );

    expect(result).toMatchObject({ ok: true, data: 'Alice' });
    expect(scopeUpdate).toHaveBeenCalledWith('', 'Alice');
  });

  it('setValue uses scope without formId even when form exists', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: { get: vi.fn(() => undefined) },
      } as any,
      createSurfaceScope: vi.fn(),
    });
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

  it('setValue uses scope without form when no form exists', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: { get: vi.fn(() => undefined) },
      } as any,
      createSurfaceScope: vi.fn(),
    });
    const scopeUpdate = vi.fn();
    const scope = createScopeRef({ id: 'scope-1', path: '$scope', initialData: {} });
    scope.update = scopeUpdate;

    await adapter.invokeBuiltInAction(
      createBuiltInInvocation('setValue', { path: 'name', value: 'Alice' }),
      createCtx({ form: undefined, scope }),
    );

    expect(scopeUpdate).toHaveBeenCalledWith('name', 'Alice');
  });

  it('setValues uses current form runtime when one exists', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: { get: vi.fn(() => undefined) },
      } as any,
      createSurfaceScope: vi.fn(),
    });
    const form = { id: 'form-1', setValues: vi.fn() };
    const scopeUpdate = vi.fn();
    const scope = createScopeRef({ id: 'scope-1', path: '$scope', initialData: {} });
    scope.update = scopeUpdate;

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation('setValues', { values: { name: 'Alice' } }),
      createCtx({ form, scope }),
    );

    expect(result).toMatchObject({ ok: true, data: { name: 'Alice' } });
    expect(form.setValues).toHaveBeenCalledWith({ name: 'Alice' });
    expect(scopeUpdate).not.toHaveBeenCalled();
  });

  it('setValues honors args.path inside the current form runtime', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: { get: vi.fn(() => undefined) },
      } as any,
      createSurfaceScope: vi.fn(),
    });
    const form = { id: 'form-1', setValue: vi.fn(), setValues: vi.fn() };

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation('setValues', {
        path: 'profile',
        values: { firstName: 'Alice', lastName: 'Smith' },
      }),
      createCtx({ form }),
    );

    expect(result).toMatchObject({
      ok: true,
      data: {
        'profile.firstName': 'Alice',
        'profile.lastName': 'Smith',
      },
    });
    expect(form.setValues).toHaveBeenCalledWith({
      'profile.firstName': 'Alice',
      'profile.lastName': 'Smith',
    });
    expect(form.setValue).not.toHaveBeenCalled();
  });

  it('setValues no longer uses targetId as a base-path fallback', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: { get: vi.fn(() => undefined) },
      } as any,
      createSurfaceScope: vi.fn(),
    });
    const form = { id: 'form-1', setValue: vi.fn(), setValues: vi.fn() };

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation(
        'setValues',
        { values: { firstName: 'Alice', lastName: 'Smith' } },
        { targetId: 'profile' },
      ),
      createCtx({ form }),
    );

    expect(result).toMatchObject({
      ok: true,
      data: { firstName: 'Alice', lastName: 'Smith' },
    });
    expect(form.setValues).toHaveBeenCalledWith({ firstName: 'Alice', lastName: 'Smith' });
    expect(form.setValue).not.toHaveBeenCalled();
  });

  it('submitForm returns error when there is no current form runtime', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: { get: vi.fn(() => undefined) },
      } as any,
      createSurfaceScope: vi.fn(),
    });

    const result = await adapter.invokeBuiltInAction(
      createBuiltInInvocation('submitForm'),
      createCtx({ form: undefined }),
    );

    expect(result).toMatchObject({ ok: false, error: expect.any(Error) });
  });

  it('submitForm forwards abort signal to the current form', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: { get: vi.fn(() => undefined) },
      } as any,
      createSurfaceScope: vi.fn(),
    });
    const controller = new AbortController();
    const form = {
      submit: vi.fn().mockResolvedValue({ ok: true, data: { submitted: true } }),
    };

    const result = await adapter.invokeBuiltInAction(
      {
        ...createBuiltInInvocation('submitForm'),
        signal: controller.signal,
      },
      createCtx({
        interactionId: 'submit-local',
        form,
      }),
    );

    expect(result).toMatchObject({ ok: true, data: { submitted: true } });
    expect(form.submit).toHaveBeenCalledWith({
      interactionId: 'submit-local',
      signal: controller.signal,
    });
  });

  it('submitForm preserves current-form failures', async () => {
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: { get: vi.fn(() => undefined) },
      } as any,
      createSurfaceScope: vi.fn(),
    });
    const submitError = new Error('submit failed');
    const form = { submit: vi.fn().mockRejectedValue(submitError) };

    await expect(
      adapter.invokeBuiltInAction(
        createBuiltInInvocation('submitForm'),
        createCtx({ form }),
      ),
    ).rejects.toThrow('submit failed');
  });
});
