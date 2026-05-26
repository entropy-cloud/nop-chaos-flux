import { describe, expect, it, vi } from 'vitest';
import {
  createAdapter,
  createActionRuntimeAdapter,
  createCtx,
  type ComponentActionInvocation,
  type NamespacedActionInvocation,
} from './action-adapter.test-support.js';

describe('createActionRuntimeAdapter component and namespaced actions', () => {
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

  it('enforces published component payload and result contracts when renderer metadata exists', async () => {
    const registryGet = vi.fn((type: string) => {
      if (type !== 'tabs') {
        return undefined;
      }

      return {
        type: 'tabs',
        componentCapabilityContracts: [
          {
            handle: 'setValue',
            displayName: 'Set Value',
            args: {
              kind: 'object',
              fields: {
                value: { kind: 'string' },
              },
            },
            result: {
              kind: 'string',
            },
          },
        ],
      };
    });
    const adapter = createActionRuntimeAdapter({
      getEnv: () => ({ notify: vi.fn() }) as any,
      expressionCompiler: {} as any,
      evaluate: <T>(target: unknown) => target as T,
      executeApiRequest: vi.fn() as any,
      runtime: {
        env: { notify: vi.fn() },
        createChildScope: vi.fn(),
        refreshDataSource: vi.fn(),
        registry: {
          get: registryGet,
        },
      } as any,
      createSurfaceScope: vi.fn(),
    });

    const setValueHandle = {
      id: 'tabs-1',
      name: 'main-tabs',
      type: 'tabs',
      capabilities: {
        hasMethod: () => true,
        listMethods: () => ['setValue'],
        invoke: vi.fn().mockResolvedValue('overview'),
      },
    };

    await expect(
      adapter.invokeComponentAction(
        {
          method: 'setValue',
          payload: { value: 42 },
          target: { componentId: 'tabs-1' },
        } as ComponentActionInvocation,
        createCtx({
          componentRegistry: { resolve: () => setValueHandle },
        }),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: new Error('component<tabs>:setValue payload does not match the published host args contract.'),
      componentId: 'tabs-1',
      componentType: 'tabs',
    });
    expect(setValueHandle.capabilities.invoke).not.toHaveBeenCalled();

    const badResultHandle = {
      ...setValueHandle,
      capabilities: {
        ...setValueHandle.capabilities,
        invoke: vi.fn().mockResolvedValue(123),
      },
    };

    await expect(
      adapter.invokeComponentAction(
        {
          method: 'setValue',
          payload: { value: 'details' },
          target: { componentId: 'tabs-1' },
        } as ComponentActionInvocation,
        createCtx({
          componentRegistry: { resolve: () => badResultHandle },
        }),
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: new Error(
        'component<tabs>:setValue result does not match the published component result contract.',
      ),
      componentId: 'tabs-1',
      componentType: 'tabs',
    });

    await expect(
      adapter.invokeComponentAction(
        {
          method: 'setValue',
          payload: { value: 'details' },
          target: { componentId: 'tabs-1' },
        } as ComponentActionInvocation,
        createCtx({
          componentRegistry: { resolve: () => setValueHandle },
        }),
      ),
    ).resolves.toEqual({
      ok: true,
      data: 'overview',
      componentId: 'tabs-1',
      componentName: 'main-tabs',
      componentType: 'tabs',
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

    const emptyScope = (await import('../action-scope.js')).createActionScope({ id: 'action-scope-1' });
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

  it('falls back to evaluationBindings when namespaced action payload is undefined', async () => {
    const adapter = createAdapter();
    const provider = {
      kind: 'dialog',
      invoke: vi.fn().mockResolvedValue({ ok: true, data: { opened: true } }),
    } as any;
    const scope = (await import('../action-scope.js')).createActionScope({ id: 'action-scope-2' });
    scope.registerNamespace('dialog', provider);
    const ctx = createCtx({
      actionScope: scope,
      evaluationBindings: { title: 'From bindings' },
    });

    await expect(
      adapter.invokeNamespacedAction(
        {
          actionName: 'dialog:open',
          namespace: 'dialog',
          method: 'open',
          payload: undefined,
        } as NamespacedActionInvocation,
        ctx,
      ),
    ).resolves.toEqual({ ok: true, data: { opened: true } });

    expect(provider.invoke).toHaveBeenCalledWith('open', { title: 'From bindings' }, ctx);
  });
});
