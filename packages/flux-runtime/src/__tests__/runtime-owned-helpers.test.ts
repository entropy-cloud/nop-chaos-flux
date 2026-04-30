import { describe, expect, it, vi } from 'vitest';
import type { CompiledFormValidationModel, RendererRuntime } from '@nop-chaos/flux-core';
import { executeRuntimeAjaxAction, executeRuntimeValidationRule } from '../runtime-action-helpers';
import { createRuntimeOwnedFactories } from '../runtime-owned-factories';
import { createFormComponentHandle } from '../form-component-handle';
import { createScopeRef } from '../scope';

describe('executeRuntimeValidationRule', () => {
  const compiledRule = {
    id: 'rule-1',
    rule: { kind: 'async', action: { action: 'ajax' } },
    dependencyPaths: [],
  } as any;
  const rule = { kind: 'async', action: { action: 'ajax' }, message: 'rule failed' } as any;
  const field = { path: 'email', label: 'Email' } as any;
  const scope = { id: 'scope-1' } as any;

  it('returns a validation error when async validation reports valid=false', async () => {
    const result = await executeRuntimeValidationRule(compiledRule, rule, field, scope, undefined, {
      dispatch: vi.fn().mockResolvedValue({ data: { valid: false, message: 'Taken' } }),
    });

    expect(result?.path).toBe('email');
    expect(result?.message).toBe('Taken');
  });

  it('falls back to rule or field message and ignores valid=true or missing payloads', async () => {
    const fallbackResult = await executeRuntimeValidationRule(
      compiledRule,
      { ...rule, message: undefined },
      field,
      scope,
      undefined,
      {
        dispatch: vi.fn().mockResolvedValue({ data: { valid: false } }),
      },
    );
    const validResult = await executeRuntimeValidationRule(
      compiledRule,
      rule,
      field,
      scope,
      undefined,
      {
        dispatch: vi.fn().mockResolvedValue({ data: { valid: true } }),
      },
    );
    const primitiveResult = await executeRuntimeValidationRule(
      compiledRule,
      rule,
      field,
      scope,
      undefined,
      {
        dispatch: vi.fn().mockResolvedValue({ data: 'ok' }),
      },
    );

    expect(fallbackResult?.message).toBe('Email failed async validation');
    expect(validResult).toBeUndefined();
    expect(primitiveResult).toBeUndefined();
  });

  it('swallows abort errors and rethrows non-abort errors', async () => {
    await expect(
      executeRuntimeValidationRule(compiledRule, rule, field, scope, undefined, {
        dispatch: vi.fn().mockRejectedValue({ name: 'AbortError' }),
      }),
    ).resolves.toBeUndefined();

    await expect(
      executeRuntimeValidationRule(compiledRule, rule, field, scope, undefined, {
        dispatch: vi.fn().mockRejectedValue(new Error('boom')),
      }),
    ).rejects.toThrow('boom');
  });

  it('treats cancelled dispatch results as cancelled async validation', async () => {
    await expect(
      executeRuntimeValidationRule(compiledRule, rule, field, scope, undefined, {
        dispatch: vi
          .fn()
          .mockResolvedValue({ ok: false, cancelled: true, error: new Error('aborted') }),
      }),
    ).resolves.toBeUndefined();
  });
});

describe('executeRuntimeAjaxAction', () => {
  it('prepares requests and monitors them', async () => {
    const pageStore = {
      getState: () => ({ data: { existing: true } }),
      setData: vi.fn(),
    };
    const ctx = {
      scope: { id: 'scope-1' },
      form: { id: 'form-1' },
      page: { store: pageStore },
      interactionId: 'interaction-1',
      nodeInstance: { templateNode: { id: 'node-1', templatePath: '$.body[0]' } },
    } as any;
    const preparedApi = { url: '/api/demo', method: 'get' } as any;
    const executeApiRequest = Object.assign(
      vi.fn().mockResolvedValue({ ok: true, status: 200, data: { next: 2 } }),
      { dispose: vi.fn() },
    );
    const monitor = { onApiRequest: vi.fn() };

    const result = await executeRuntimeAjaxAction(
      { url: '/api/demo' } as any,
      { api: { url: '/api/demo' }, targeting: {} } as any,
      ctx,
      undefined,
      {
        getEnv: () => ({ monitor }) as any,
        expressionCompiler: {} as any,
        evaluate: <T>(target: unknown) => target as T,
        executeApiRequest,
      },
    );

    expect(executeApiRequest).toHaveBeenCalledWith(
      'ajax',
      expect.anything(),
      ctx.scope,
      ctx.form,
      expect.objectContaining({ interactionId: 'interaction-1' }),
    );
    expect(monitor.onApiRequest).toHaveBeenCalledWith({
      api: expect.objectContaining({ url: '/api/demo' }),
      nodeId: 'node-1',
      path: '$.body[0]',
      interactionId: 'interaction-1',
    });
    expect(result).toEqual({
      ok: true,
      data: { next: 2 },
      attempts: 1,
      failureCount: 0,
      error: undefined,
    });
    expect(preparedApi).toBeTruthy();
  });

  it('skips monitoring and page writes when those contexts are absent', async () => {
    const executeApiRequest = Object.assign(
      vi.fn().mockResolvedValue({ ok: true, status: 200, data: { ok: true } }),
      { dispose: vi.fn() },
    );

    const result = await executeRuntimeAjaxAction(
      { url: '/api/demo' } as any,
      { api: { url: '/api/demo' } } as any,
      { scope: { id: 'scope-1' } } as any,
      undefined,
      {
        getEnv: () => ({}) as any,
        expressionCompiler: {} as any,
        evaluate: <T>(target: unknown) => target as T,
        executeApiRequest,
      },
    );

    expect(result.ok).toBe(true);
  });

  it('returns a shared cancelled result when ajax execution aborts', async () => {
    const executeApiRequest = Object.assign(
      vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      { dispose: vi.fn() },
    );

    const result = await executeRuntimeAjaxAction(
      { url: '/api/demo' } as any,
      { api: { url: '/api/demo' } } as any,
      { scope: { id: 'scope-1' }, interactionId: 'interaction-1' } as any,
      undefined,
      {
        getEnv: () => ({}) as any,
        expressionCompiler: {} as any,
        evaluate: <T>(target: unknown) => target as T,
        executeApiRequest,
      },
    );

    expect(result).toMatchObject({ ok: false, cancelled: true, error: expect.any(Error) });
  });
});

describe('createRuntimeOwnedFactories', () => {
  it('syncs external page stores both ways and refreshes page listeners', () => {
    const externalState: { data: Record<string, any>; refreshTick: number } = {
      data: { synced: 'external' },
      refreshTick: 0,
    };
    const externalListeners = new Set<() => void>();
    const externalPageStore = {
      getState: () => externalState,
      subscribe: (listener: () => void) => {
        externalListeners.add(listener);
        return () => externalListeners.delete(listener);
      },
      setData: vi.fn((nextData: Record<string, any>) => {
        externalState.data = nextData;
        for (const listener of externalListeners) {
          listener();
        }
      }),
    } as any;
    const ownedPages = new Set<any>();
    const ownedSurfaceRuntimes = new Set<any>();
    const factories = createRuntimeOwnedFactories({
      pageStore: externalPageStore,
      ownedPages,
      ownedSurfaceRuntimes,
      createValidationScopeRuntime: vi.fn(({ initialValues }) => {
        const state = { values: initialValues ?? {} };
        const listeners = new Set<() => void>();
        const store = {
          getState: () => state,
          subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
          setValues: vi.fn((nextValues: Record<string, any>) => {
            state.values = nextValues;
            for (const listener of listeners) {
              listener();
            }
          }),
          setValue: vi.fn((path: string, value: unknown) => {
            state.values = { ...state.values, [path]: value };
            for (const listener of listeners) {
              listener();
            }
          }),
        };

        return {
          store,
          scope: createScopeRef({
            id: 'page-scope',
            path: '$page',
            initialData: initialValues ?? {},
          }),
          validation: undefined,
        } as any;
      }),
      dispatchAction: vi.fn(),
      validationRegistry: {} as any,
      disposeScopeTree: vi.fn(),
    });

    const page = factories.createPageRuntime({ fallback: 'local' });
    const pageListener = vi.fn();
    const unsubscribe = page.store.subscribe(pageListener);

    expect(page.store.getState().data).toEqual({ synced: 'external' });
    expect(ownedPages.has(page)).toBe(true);

    page.store.updateData('inside', 2);
    expect(externalPageStore.setData).toHaveBeenCalledWith({ synced: 'external', inside: 2 });

    externalState.data = { synced: 'from-external' };
    for (const listener of externalListeners) {
      listener();
    }
    expect(page.store.getState().data).toEqual({ synced: 'from-external' });

    page.refresh();
    expect(pageListener).toHaveBeenCalled();
    unsubscribe();
  });

  it('creates validation, surface, and form runtimes with runtime-owned hooks', async () => {
    const ownedPages = new Set<any>();
    const ownedSurfaceRuntimes = new Set<any>();
    const dispatchAction = vi
      .fn()
      .mockResolvedValue({ data: { valid: false, message: 'invalid' } });
    const disposeScopeTree = vi.fn();
    const factories = createRuntimeOwnedFactories({
      ownedPages,
      ownedSurfaceRuntimes,
      createValidationScopeRuntime: vi.fn(),
      dispatchAction,
      validationRegistry: {} as any,
      disposeScopeTree,
    });

    const validationScope = factories.createValidationScopeRuntime({
      id: 'validation-scope',
      initialValues: { email: '' },
    });
    expect(validationScope.scope).toBeDefined();
    expect(validationScope.scope!.id).toBe('validation-scope');

    const parentScope = createScopeRef({ id: 'parent-scope', path: '$parent', initialData: {} });
    const validation: CompiledFormValidationModel = {
      behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
      order: ['email'],
      validationOrder: ['email'],
      dependents: {},
      rootPath: '',
      nodes: {
        '': {
          path: '',
          kind: 'form',
          rules: [],
          children: ['email'],
        },
        email: {
          path: 'email',
          kind: 'field',
          controlType: 'input-text',
          label: 'Email',
          behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
          rules: [
            {
              id: 'email-async',
              rule: { kind: 'async', action: { action: 'ajax' } },
              dependencyPaths: [],
            },
          ],
          children: [],
          parent: '',
        },
      },
    };

    const form = factories.createFormRuntime({
      parentScope,
      initialValues: { email: '' },
      validation,
    });
    expect(form.scope.id).toContain('parent-scope');
    const validationResult = await form.validateField('email');
    expect(validationResult.ok).toBe(false);
    expect(validationResult.errors[0]?.message).toBe('invalid');
    expect(dispatchAction).toHaveBeenCalled();

    const runtime = {} as RendererRuntime;
    const surfaceRuntime = factories.createSurfaceRuntime();
    const surfaceId = surfaceRuntime.open({
      kind: 'dialog',
      surface: { body: 'Body' },
      scope: createScopeRef({
        id: 'surface-scope',
        path: '$surface',
        parent: parentScope,
        initialData: {},
      }),
      runtime,
      options: {},
    });
    expect(typeof surfaceId).toBe('string');
    expect(ownedSurfaceRuntimes.has(surfaceRuntime)).toBe(true);
    surfaceRuntime.close(surfaceId);
    expect(disposeScopeTree).toHaveBeenCalledWith('surface-scope');
  });
});

describe('createFormComponentHandle', () => {
  it('supports form component methods and surfaces errors for unsupported ones', async () => {
    const form = {
      id: 'form-1',
      name: 'profile',
      store: { getState: () => ({ values: { name: 'Alice' } }) },
      submit: vi.fn().mockResolvedValue({ ok: true }),
      validateForm: vi.fn().mockResolvedValue({ ok: false, errors: [{ message: 'required' }] }),
      reset: vi.fn(),
      setValue: vi.fn(),
      setValues: vi.fn(),
    } as any;

    const handle = createFormComponentHandle(form);
    const actionCtx = {} as any;

    expect(handle.capabilities?.hasMethod?.('submit')).toBe(true);
    expect(handle.capabilities?.hasMethod?.('missing')).toBe(false);
    expect(handle.capabilities?.listMethods?.()).toEqual([
      'submit',
      'validate',
      'reset',
      'setValue',
      'setValues',
      'getValues',
    ]);

    await expect(
      handle.capabilities?.invoke('submit', { interactionId: 123 }, actionCtx),
    ).resolves.toEqual({ ok: true });
    await expect(handle.capabilities?.invoke('validate', undefined, actionCtx)).resolves.toEqual({
      ok: false,
      data: { ok: false, errors: [{ message: 'required' }] },
      error: [{ message: 'required' }],
    });
    await expect(
      handle.capabilities?.invoke('reset', { values: { name: 'Bob' } }, actionCtx),
    ).resolves.toEqual({ ok: true });
    await expect(
      handle.capabilities?.invoke('setValue', { name: 'role', value: 'admin' }, actionCtx),
    ).resolves.toEqual({ ok: true, data: 'admin' });
    await expect(
      handle.capabilities?.invoke('setValues', { values: { active: true } }, actionCtx),
    ).resolves.toEqual({ ok: true, data: { active: true } });
    await expect(handle.capabilities?.invoke('getValues', undefined, actionCtx)).resolves.toEqual({
      ok: true,
      data: { name: 'Alice' },
    });

    expect(form.submit).toHaveBeenCalledWith({ interactionId: '123' });
    expect(form.reset).toHaveBeenCalledWith({ name: 'Bob' });
    expect(form.setValue).toHaveBeenCalledWith('role', 'admin');
    expect(form.setValues).toHaveBeenCalledWith({ active: true });

    const unsupported = await handle.capabilities?.invoke('unknown', undefined, actionCtx);
    expect(unsupported?.ok).toBe(false);
    expect(unsupported?.error).toBeInstanceOf(Error);
  });
});
