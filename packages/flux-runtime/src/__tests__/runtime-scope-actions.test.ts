import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererPlugin } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createActionScope,
  createComponentHandleRegistry,
  createFormComponentHandle,
  createRendererRuntime,
} from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

describe('createRendererRuntime', () => {
  it('updates page scope through setValue action', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const page = runtime.createPageRuntime({ message: 'Hello' });

    await runtime.dispatch(
      {
        action: 'setValue',
        args: {
          path: 'message',
          value: 'World',
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(page.store.getState().data.message).toBe('World');
  });

  it('runs plugins by ascending priority and preserves declaration order on ties', () => {
    const order: string[] = [];
    const plugins: RendererPlugin[] = [
      {
        name: 'late',
        priority: 20,
        beforeCompile(schema) {
          order.push('late');
          return schema;
        },
      },
      {
        name: 'first-tie',
        priority: 5,
        beforeCompile(schema) {
          order.push('first-tie');
          return schema;
        },
      },
      {
        name: 'second-tie',
        priority: 5,
        beforeCompile(schema) {
          order.push('second-tie');
          return schema;
        },
      },
    ];

    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
      plugins,
    });

    runtime.compile({ type: 'text', text: 'hello' });

    expect(order).toEqual(['first-tie', 'second-tie', 'late']);
    expect(runtime.plugins.map((plugin) => plugin.name)).toEqual([
      'first-tie',
      'second-tie',
      'late',
    ]);
  });

  it('updates multiple page scope values through setValues action', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });

    const page = runtime.createPageRuntime({ message: 'Hello', status: 'idle' });

    const result = await runtime.dispatch(
      {
        action: 'setValues',
        args: {
          values: {
            message: 'World',
            status: 'done',
          },
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result).toMatchObject({
      ok: true,
      data: {
        message: 'World',
        status: 'done',
      },
    });
    expect(page.store.getState().data).toMatchObject({ message: 'World', status: 'done' });
  });

  it('dispatches component:<method> to explicit form handles by id and name', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const form = runtime.createFormRuntime({
      id: 'user-form',
      name: 'userForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page,
    });

    const unregister = componentRegistry.register(createFormComponentHandle(form));

    try {
      const setValueResult = await runtime.dispatch(
        {
          action: 'component:setValue',
          componentId: 'user-form',
          args: {
            name: 'username',
            value: 'Bob',
          },
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry,
        },
      );

      expect(setValueResult).toMatchObject({ ok: true, data: 'Bob' });
      expect(form.scope.get('username')).toBe('Bob');

      const validateResult = await runtime.dispatch(
        {
          action: 'component:validate',
          componentName: 'userForm',
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry,
        },
      );

      expect(validateResult.ok).toBe(true);
      expect((validateResult.data as { ok: boolean }).ok).toBe(true);
    } finally {
      unregister();
    }
  });

  it('preserves abort signal when component:submit resolves through a form component handle', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const controller = new AbortController();
    let capturedSignal: AbortSignal | undefined;
    const form = runtime.createFormRuntime({
      id: 'submit-signal-form',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page,
      lifecycle: {
        submitAction: async (options) => {
          capturedSignal = options?.signal;
          return { ok: true, data: { submitted: true } };
        },
      },
    });

    const unregister = componentRegistry.register(createFormComponentHandle(form));

    try {
      const result = await runtime.dispatch(
        {
          action: 'component:submit',
          componentId: 'submit-signal-form',
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry,
          signal: controller.signal,
        },
      );

      expect(result).toMatchObject({ ok: true, data: { submitted: true } });
      expect(capturedSignal).toBe(controller.signal);
    } finally {
      unregister();
    }
  });

  it('fails component action when componentId and componentName target different handles', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const firstForm = runtime.createFormRuntime({
      id: 'first-form',
      name: 'firstForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page,
    });
    const secondForm = runtime.createFormRuntime({
      id: 'second-form',
      name: 'secondForm',
      initialValues: { username: 'Bob' },
      parentScope: page.scope,
      page,
    });

    const unregisterFirst = componentRegistry.register(createFormComponentHandle(firstForm));
    const unregisterSecond = componentRegistry.register(createFormComponentHandle(secondForm));

    try {
      const result = await runtime.dispatch(
        {
          action: 'component:validate',
          componentId: 'first-form',
          componentName: 'secondForm',
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry,
        },
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('Component handle not found');
    } finally {
      unregisterSecond();
      unregisterFirst();
    }
  });

  it('fails component action when componentName resolves ambiguously', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const firstForm = runtime.createFormRuntime({
      id: 'first-form',
      name: 'sharedForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page,
    });
    const secondForm = runtime.createFormRuntime({
      id: 'second-form',
      name: 'sharedForm',
      initialValues: { username: 'Bob' },
      parentScope: page.scope,
      page,
    });

    const unregisterFirst = componentRegistry.register(createFormComponentHandle(firstForm));
    const unregisterSecond = componentRegistry.register(createFormComponentHandle(secondForm));

    try {
      const result = await runtime.dispatch(
        {
          action: 'component:validate',
          componentName: 'sharedForm',
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry,
        },
      );

      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('Ambiguous component target: sharedForm');
    } finally {
      unregisterSecond();
      unregisterFirst();
    }
  });

  it('dispatches component action by compiled _targetCid without componentId/componentName', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const form = runtime.createFormRuntime({
      id: 'compiled-cid-form',
      name: 'compiledCidForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page,
    });
    const handle = createFormComponentHandle(form);
    const unregister = componentRegistry.register(handle, { cid: 42 });

    try {
      const result = await runtime.dispatch(
        {
          action: 'component:setValue',
          _targetCid: 42,
          args: {
            name: 'username',
            value: 'Carol',
          },
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry,
        },
      );

      expect(result).toMatchObject({ ok: true, data: 'Carol' });
      expect(form.scope.get('username')).toBe('Carol');
    } finally {
      unregister();
    }
  });

  it('dispatches compiled _targetCid actions through the component path without selector fallback', async () => {
    const onActionEnd = vi.fn();
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env: {
        ...env,
        monitor: {
          onActionEnd,
        },
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const form = runtime.createFormRuntime({
      id: 'compiled-cid-form',
      name: 'compiledCidForm',
      initialValues: { username: 'Alice' },
      parentScope: page.scope,
      page,
    });
    const handle = createFormComponentHandle(form);
    const unregister = componentRegistry.register(handle, { cid: 42 });

    try {
      await runtime.dispatch(
        {
          action: 'component:setValue',
          _targetCid: 42,
          args: {
            name: 'username',
            value: 'Carol',
          },
        },
        {
          runtime,
          scope: page.scope,
          page,
          componentRegistry,
        },
      );

      expect(onActionEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'component:setValue',
          dispatchMode: 'component',
          componentId: 'compiled-cid-form',
          componentName: 'compiledCidForm',
          componentType: 'form',
          method: 'setValue',
        }),
      );
    } finally {
      unregister();
    }
  });

  it('rejects component action without any resolvable target', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      {
        action: 'component:validate',
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe(
      'component:<method> requires _targetCid, componentId or componentName',
    );
  });

  it('exposes component registry debug helpers through the public contract', () => {
    const componentRegistry = createComponentHandleRegistry({ id: 'debug-components' });
    const handle = {
      id: 'debug-form',
      name: 'debugForm',
      type: 'form',
      capabilities: {
        invoke: vi.fn(),
      },
    };

    const unregister = componentRegistry.register(handle, { cid: 88 });

    expect(componentRegistry.getHandleByCid?.(88)).toBe(handle);
    expect(componentRegistry.getDebugSnapshot?.()).toEqual({
      handles: [
        expect.objectContaining({
          cid: 88,
          id: 'debug-form',
          name: 'debugForm',
          type: 'form',
          mounted: true,
        }),
      ],
    });

    unregister();
    expect(componentRegistry.getHandleByCid?.(88)).toBeUndefined();
  });

  it('resolves namespaced actions through parent action scopes', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const parentActionScope = createActionScope({ id: 'parent-scope' });
    const childActionScope = createActionScope({ id: 'child-scope', parent: parentActionScope });
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { exported: true } });
    parentActionScope.registerNamespace('designer', {
      kind: 'host',
      invoke,
    });

    const result = await runtime.dispatch(
      {
        action: 'designer:export',
        args: {
          source: 'toolbar',
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
        actionScope: childActionScope,
      },
    );

    expect(result).toMatchObject({ ok: true, data: { exported: true } });
    expect(invoke).toHaveBeenCalledWith(
      'export',
      { source: 'toolbar' },
      expect.objectContaining({ actionScope: childActionScope }),
    );
  });

  it('exposes action scope debug snapshots through the public contract', () => {
    const parentActionScope = createActionScope({ id: 'parent-debug-scope' });
    const childActionScope = createActionScope({
      id: 'child-debug-scope',
      parent: parentActionScope,
    });

    childActionScope.registerNamespace('designer', {
      kind: 'host',
      invoke: vi.fn(),
      listMethods: () => ['export', 'save'],
    });

    expect(childActionScope.getDebugSnapshot?.()).toEqual({
      id: 'child-debug-scope',
      parentId: 'parent-debug-scope',
      namespaces: [
        {
          namespace: 'designer',
          providerKind: 'host',
          methods: ['export', 'save'],
        },
      ],
    });
  });
});
