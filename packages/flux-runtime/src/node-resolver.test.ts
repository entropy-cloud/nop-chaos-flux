import { describe, expect, it } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createComponentHandleRegistry, createRendererRegistry, createRendererRuntime } from './index';

const textRenderer: RendererDefinition = {
  type: 'text',
  component: () => null
};

const env: RendererEnv = {
  fetcher: async <T>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined
};

describe('node identity contracts', () => {
  it('resolveTarget returns undefined for _targetCid when handle is not registered', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });

    const result = runtime.resolveTarget({ _targetCid: 42 }, { runtimeId: runtime.runtimeId, componentRegistry });

    expect(result).toBeUndefined();
  });

  it('resolveTarget returns undefined for unknown componentId', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });

    const result = runtime.resolveTarget({ componentId: 'nonexistent' }, { runtimeId: runtime.runtimeId, componentRegistry });

    expect(result).toBeUndefined();
  });

  it('resolveTarget returns undefined for unknown componentName', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });

    const result = runtime.resolveTarget({ componentName: 'nonexistent' }, { runtimeId: runtime.runtimeId, componentRegistry });

    expect(result).toBeUndefined();
  });

  it('registers a handle with cid and retrieves it via getHandleByCid', () => {
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const handle = {
      id: 'user-form',
      name: 'userForm',
      type: 'form',
      capabilities: {
        invoke() {
          return { ok: true };
        }
      }
    };

    const unregister = componentRegistry.register(handle, { cid: 101 });

    try {
      expect(componentRegistry.getHandleByCid?.(101)).toBe(handle);
      expect(componentRegistry.getHandleByCid?.(999)).toBeUndefined();
    } finally {
      unregister();
    }

    expect(componentRegistry.getHandleByCid?.(101)).toBeUndefined();
  });

  it('getDebugSnapshot reflects registered handles with their cid and mount state', () => {
    const componentRegistry = createComponentHandleRegistry({ id: 'debug-registry' });
    const handle = {
      id: 'debug-form',
      name: 'debugForm',
      type: 'form',
      capabilities: {
        invoke() {
          return { ok: true };
        }
      }
    };

    const unregister = componentRegistry.register(handle, { cid: 55 });

    expect(componentRegistry.getDebugSnapshot?.()).toEqual({
      handles: [
        expect.objectContaining({
          cid: 55,
          id: 'debug-form',
          name: 'debugForm',
          type: 'form',
          mounted: true
        })
      ]
    });

    unregister();

    expect(componentRegistry.getDebugSnapshot?.()).toEqual({
      handles: []
    });
  });

  it('registers multiple handles and each is retrievable independently', () => {
    const componentRegistry = createComponentHandleRegistry({ id: 'multi-registry' });
    const handleA = { id: 'form-a', type: 'form', capabilities: { invoke: () => ({ ok: true }) } };
    const handleB = { id: 'form-b', type: 'form', capabilities: { invoke: () => ({ ok: true }) } };

    const unregisterA = componentRegistry.register(handleA, { cid: 10 });
    const unregisterB = componentRegistry.register(handleB, { cid: 20 });

    try {
      expect(componentRegistry.getHandleByCid?.(10)).toBe(handleA);
      expect(componentRegistry.getHandleByCid?.(20)).toBe(handleB);
    } finally {
      unregisterA();
      unregisterB();
    }

    expect(componentRegistry.getHandleByCid?.(10)).toBeUndefined();
    expect(componentRegistry.getHandleByCid?.(20)).toBeUndefined();
  });

  it('resolveTarget returns nodeInstance from component debug data when cid resolves', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    componentRegistry.setDebugEnabled?.(true);
    const handle = {
      id: 'user-form',
      type: 'form',
      capabilities: {
        invoke() {
          return { ok: true };
        }
      }
    };
    const nodeInstance = {
      cid: 42,
      templateNode: {
        templateNodeId: 42,
        id: 'user-form-node',
        type: 'text',
        schema: { type: 'text' },
        templatePath: '$.body[0]',
        rendererType: 'text',
        component: textRenderer,
        propsProgram: { kind: 'static', value: {} },
        metaProgram: {},
        eventPlans: {},
        regions: {},
        scopePlan: { kind: 'inherit' },
        sourcePropKeys: [],
        sourceStatePropKeys: {}
      },
      scope: { id: 'page', path: '$page', get: () => undefined, has: () => false, readOwn: () => ({}), read: () => ({}), update: () => undefined, merge: () => undefined },
      state: { metaState: {}, mounted: true }
    } as any;

    const unregister = componentRegistry.register(handle, { cid: 42 });

    try {
      componentRegistry.setHandleDebugData?.(42, {
        nodeInstance,
        nodeId: 'user-form-node',
        path: '$.body[0]',
        rendererType: 'text',
        scope: nodeInstance.scope,
        resolvedMeta: {} as any,
        resolvedProps: {},
        updatedAt: Date.now()
      });

      const result = runtime.resolveTarget({ _targetCid: 42 }, { runtimeId: runtime.runtimeId, componentRegistry });

      expect(result).toBe(nodeInstance);
    } finally {
      unregister();
    }
  });

  it('resolveTarget hydrates the resolved nodeInstance cid from the live handle', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    componentRegistry.setDebugEnabled?.(true);
    const handle = {
      id: 'user-form',
      type: 'form',
      capabilities: {
        invoke() {
          return { ok: true };
        }
      }
    };
    const nodeInstance = {
      cid: undefined,
      templateNode: {
        templateNodeId: 42,
        id: 'user-form-node',
        type: 'text',
        schema: { type: 'text' },
        templatePath: '$.body[0]',
        rendererType: 'text',
        component: textRenderer,
        propsProgram: { kind: 'static', value: {} },
        metaProgram: {},
        eventPlans: {},
        regions: {},
        scopePlan: { kind: 'inherit' },
        sourcePropKeys: [],
        sourceStatePropKeys: {}
      },
      scope: { id: 'page', path: '$page', get: () => undefined, has: () => false, readOwn: () => ({}), read: () => ({}), update: () => undefined, merge: () => undefined },
      state: { metaState: {}, mounted: true }
    } as any;

    const unregister = componentRegistry.register(handle, { cid: 42 });

    try {
      componentRegistry.setHandleDebugData?.(42, {
        nodeInstance,
        nodeId: 'user-form-node',
        path: '$.body[0]',
        rendererType: 'text',
        scope: nodeInstance.scope,
        resolvedMeta: {} as any,
        resolvedProps: {},
        updatedAt: Date.now()
      });

      const result = runtime.resolveTarget({ _targetCid: 42 }, { runtimeId: runtime.runtimeId, componentRegistry });

      expect(result).toMatchObject({ cid: 42, templateNode: nodeInstance.templateNode });
      expect(result).not.toBe(nodeInstance);
      expect(nodeInstance.cid).toBeUndefined();
    } finally {
      unregister();
    }
  });

  it('resolveTarget preserves repeated instancePath while hydrating cid from the live handle', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    componentRegistry.setDebugEnabled?.(true);
    const handle = {
      id: 'row-form',
      type: 'form',
      capabilities: {
        invoke() {
          return { ok: true };
        }
      }
    };
    const nodeInstance = {
      cid: undefined,
      instancePath: [{ repeatedTemplateId: 'rows', instanceKey: 'row-2' }],
      templateNode: {
        templateNodeId: 99,
        id: 'row-form-node',
        type: 'text',
        schema: { type: 'text' },
        templatePath: '$.body[0]',
        rendererType: 'text',
        component: textRenderer,
        propsProgram: { kind: 'static', value: {} },
        metaProgram: {},
        eventPlans: {},
        regions: {},
        scopePlan: { kind: 'inherit' },
        sourcePropKeys: [],
        sourceStatePropKeys: {}
      },
      scope: { id: 'page', path: '$page', get: () => undefined, has: () => false, readOwn: () => ({}), read: () => ({}), update: () => undefined, merge: () => undefined },
      state: { metaState: {}, mounted: true }
    } as any;

    const unregister = componentRegistry.register(handle, { cid: 77 });

    try {
      componentRegistry.setHandleDebugData?.(77, {
        nodeInstance,
        nodeId: 'row-form-node',
        path: '$.body[0]',
        rendererType: 'text',
        scope: nodeInstance.scope,
        resolvedMeta: {} as any,
        resolvedProps: {},
        updatedAt: Date.now()
      });

      const result = runtime.resolveTarget({ _targetCid: 77 }, { runtimeId: runtime.runtimeId, componentRegistry });

      expect(result).toMatchObject({
        cid: 77,
        instancePath: [{ repeatedTemplateId: 'rows', instanceKey: 'row-2' }],
        templateNode: nodeInstance.templateNode
      });
      expect(result).not.toBe(nodeInstance);
      expect(nodeInstance.cid).toBeUndefined();
    } finally {
      unregister();
    }
  });

  it('compile returns a CompiledTemplate with a root TemplateNode containing a templateNodeId', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });

    const compiled = runtime.compile({ type: 'text', text: 'hello' });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;

    expect(typeof root.templateNodeId).toBe('number');
    expect(root.type).toBe('text');
    expect(root.templatePath).toBeTruthy();
  });
});
