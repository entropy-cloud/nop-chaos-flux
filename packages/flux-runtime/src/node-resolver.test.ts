import { describe, expect, it } from 'vitest';
import type { NodeLocator, RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
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
  it('normalizes empty instancePath to the singleton locator form', async () => {
    const { normalizeNodeLocator, serializeNodeLocator } = await import('@nop-chaos/flux-core');

    const singleton: NodeLocator = {
      runtimeId: 'page-1',
      templateGraphId: 'page-root',
      templateNodeId: 42
    };
    const emptyArrayVariant: NodeLocator = {
      ...singleton,
      instancePath: []
    };

    expect(normalizeNodeLocator(emptyArrayVariant)).toEqual(singleton);
    expect(serializeNodeLocator(emptyArrayVariant)).toBe(serializeNodeLocator(singleton));
  });

  it('resolves live handles by locator through the new registry/runtime contracts', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const locator: NodeLocator = {
      runtimeId: 'page-1',
      templateGraphId: 'page-root',
      templateNodeId: 7,
      instancePath: []
    };
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

    const unregister = componentRegistry.register(handle, {
      cid: 101,
      locator
    });

    try {
      expect(componentRegistry.resolveHandle?.({
        runtimeId: 'page-1',
        templateGraphId: 'page-root',
        templateNodeId: 7
      })).toBe(handle);
      expect(componentRegistry.getLocatorByCid?.(101)).toEqual({
        runtimeId: 'page-1',
        templateGraphId: 'page-root',
        templateNodeId: 7
      });
      expect(runtime.resolveNode({
        runtimeId: 'page-1',
        templateGraphId: 'page-root',
        templateNodeId: 7
      }, { componentRegistry })).toEqual({
        kind: 'resolved',
        locator: {
          runtimeId: 'page-1',
          templateGraphId: 'page-root',
          templateNodeId: 7
        },
        handle
      });
    } finally {
      unregister();
    }

    expect(runtime.resolveNode({
      runtimeId: 'page-1',
      templateGraphId: 'page-root',
      templateNodeId: 7
    }, { componentRegistry })).toEqual({
      kind: 'notMaterialized',
      locator: {
        runtimeId: 'page-1',
        templateGraphId: 'page-root',
        templateNodeId: 7
      }
    });
  });

  it('resolves component targets through runtime resolveTarget using the registry as a subordinate source', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const runtimeId = runtime.runtimeId;
    const locator: NodeLocator = {
      runtimeId,
      templateGraphId: 'page-root',
      templateNodeId: 9
    };
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

    const unregister = componentRegistry.register(handle, {
      cid: 202,
      locator
    });

    try {
      expect(runtime.resolveTarget({ locator }, {
        runtimeId,
        componentRegistry
      })).toEqual({
        kind: 'resolved',
        locator,
        handle
      });
    } finally {
      unregister();
    }

    expect(runtime.resolveTarget({ locator }, {
      runtimeId,
      componentRegistry
    })).toEqual({
      kind: 'notMaterialized',
      locator
    });
  });

  it('allows registry-backed internal locator targets to resolve without any author selector fields', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const runtimeId = runtime.runtimeId;
    const handle = {
      id: 'internal-target-form',
      type: 'form',
      capabilities: {
        invoke() {
          return { ok: true };
        }
      }
    };

    const unregister = componentRegistry.register(handle, {
      locator: {
        runtimeId,
        templateGraphId: 'page-root',
        templateNodeId: 88
      }
    });

    try {
      expect(runtime.resolveTarget({
        locator: {
          runtimeId,
          templateGraphId: 'page-root',
          templateNodeId: 88
        }
      }, {
        runtimeId,
        componentRegistry
      })).toEqual({
        kind: 'resolved',
        locator: {
          runtimeId,
          templateGraphId: 'page-root',
          templateNodeId: 88
        },
        handle
      });
    } finally {
      unregister();
    }
  });

  it('resolves repeated plans against the current contextual instancePath before fallback lookup', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const runtimeId = runtime.runtimeId;
    const instancePath = [{ repeatedTemplateId: 'table-row:12', instanceKey: 'row-42' }] as const;
    const handle = {
      type: 'form',
      capabilities: {
        invoke() {
          return { ok: true };
        }
      }
    };

    const unregister = componentRegistry.register(handle, {
      locator: {
        runtimeId,
        templateGraphId: 'page-root',
        templateNodeId: 99,
        instancePath
      }
    });

    try {
      const instancePathFor = () => {
        throw new Error('instancePathFor should not be used when ctx.instancePath already matches');
      };

      expect(runtime.resolveTarget({
        repeatedPlan: {
          kind: 'repeated',
          templateGraphId: 'page-root',
          templateNodeId: 99,
          repeatedTemplateId: 'table-row:12'
        }
      }, {
        runtimeId,
        instancePath,
        instancePathFor,
        componentRegistry
      })).toEqual({
        kind: 'resolved',
        locator: {
          runtimeId,
          templateGraphId: 'page-root',
          templateNodeId: 99,
          instancePath
        },
        handle
      });
    } finally {
      unregister();
    }
  });

  it('resolves repeated selectors against the current contextual instancePath before explicit fallback lookup', () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const componentRegistry = createComponentHandleRegistry({ id: 'root-components' });
    const runtimeId = runtime.runtimeId;
    const instancePath = [{ repeatedTemplateId: 'table-row:12', instanceKey: 'row-42' }] as const;
    const handle = {
      type: 'form',
      capabilities: {
        invoke() {
          return { ok: true };
        }
      }
    };

    const unregister = componentRegistry.register(handle, {
      locator: {
        runtimeId,
        templateGraphId: 'page-root',
        templateNodeId: 100,
        instancePath
      }
    });

    try {
      const instancePathForExplicit = () => {
        throw new Error('instancePathForExplicit should not be used when ctx.instancePath already matches');
      };

      expect(runtime.resolveTarget({
        repeatedSelector: {
          templateGraphId: 'page-root',
          repeatedTemplateId: 'table-row:12',
          instanceKey: 'row-42',
          templateNodeId: 100
        }
      }, {
        runtimeId,
        instancePath,
        instancePathForExplicit,
        componentRegistry
      })).toEqual({
        kind: 'resolved',
        locator: {
          runtimeId,
          templateGraphId: 'page-root',
          templateNodeId: 100,
          instancePath
        },
        handle
      });
    } finally {
      unregister();
    }
  });
});
