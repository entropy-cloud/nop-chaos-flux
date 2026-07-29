import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type ComponentHandle, type ScopeRef } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime, createComponentHandleRegistry } from '../index.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';
import { findNearestRefreshable } from '../refresh-nearest.js';

function makeHandle(
  type: string,
  scope: ScopeRef,
  overrides: Partial<ComponentHandle> = {},
): ComponentHandle {
  return {
    type,
    scope,
    capabilities: {
      invoke: vi.fn(async () => ({ ok: true })) as never,
      hasMethod: () => true,
    },
    ...overrides,
  };
}

function makeScope(id: string, parent?: ScopeRef): ScopeRef {
  return {
    id,
    path: id,
    parent,
    value: {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    update: () => {},
    merge: () => {},
  };
}

describe('refreshNearest — Phase 2 find logic', () => {
  it('finds a CRUD in the same scope', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    runtime.createPageRuntime({});

    const scope = makeScope('owner');
    const componentRegistry = createComponentHandleRegistry({ id: 'cr' });
    componentRegistry.register(makeHandle('crud', scope), { cid: 1 });

    const result = await findNearestRefreshable({
      startScope: scope,
      componentRegistry,
      runtime,
      targetType: 'auto',
    });

    expect(result?.kind).toBe('component');
    if (result?.kind === 'component') {
      expect(result.handle.type).toBe('crud');
    }
  });

  it('walks scope.parent to find an owner CRUD', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    runtime.createPageRuntime({});

    const ownerScope = makeScope('owner');
    const childScope = makeScope('child', ownerScope);
    const componentRegistry = createComponentHandleRegistry({ id: 'cr' });
    componentRegistry.register(makeHandle('crud', ownerScope), { cid: 1 });

    const result = await findNearestRefreshable({
      startScope: childScope,
      componentRegistry,
      runtime,
      targetType: 'auto',
    });

    expect(result?.kind).toBe('component');
    expect(result?.scope.id).toBe('owner');
  });

  it('nested scope prefers nearest CRUD (not owner)', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    runtime.createPageRuntime({});

    const ownerScope = makeScope('owner');
    const innerScope = makeScope('inner', ownerScope);
    const componentRegistry = createComponentHandleRegistry({ id: 'cr' });
    componentRegistry.register(makeHandle('crud', ownerScope), { cid: 1 });
    componentRegistry.register(makeHandle('crud', innerScope), { cid: 2 });

    const result = await findNearestRefreshable({
      startScope: innerScope,
      componentRegistry,
      runtime,
      targetType: 'auto',
    });

    expect(result?.scope.id).toBe('inner');
  });

  it("targetType='crud' skips data-source; targetType='data-source' skips CRUD", async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    runtime.createPageRuntime({});

    const scope = makeScope('owner');
    const componentRegistry = createComponentHandleRegistry({ id: 'cr' });
    componentRegistry.register(makeHandle('crud', scope), { cid: 1 });

    const crudOnly = await findNearestRefreshable({
      startScope: scope,
      componentRegistry,
      runtime,
      targetType: 'crud',
    });
    expect(crudOnly?.kind).toBe('component');

    const sourceOnly = await findNearestRefreshable({
      startScope: scope,
      componentRegistry,
      runtime,
      targetType: 'data-source',
    });
    // No data-source registered in this scope → null
    expect(sourceOnly).toBeNull();
  });

  it('returns null when no refreshable target exists', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    runtime.createPageRuntime({});

    const scope = makeScope('owner');
    const componentRegistry = createComponentHandleRegistry({ id: 'cr' });
    // text handle does not match crud/tree predicate
    componentRegistry.register(makeHandle('text', scope), { cid: 1 });

    const result = await findNearestRefreshable({
      startScope: scope,
      componentRegistry,
      runtime,
      targetType: 'auto',
    });

    expect(result).toBeNull();
  });

  it("targetType='form' finds a form handle", async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    runtime.createPageRuntime({});

    const scope = makeScope('formScope');
    const componentRegistry = createComponentHandleRegistry({ id: 'cr' });
    componentRegistry.register(makeHandle('form', scope), { cid: 2 });

    const result = await findNearestRefreshable({
      startScope: scope,
      componentRegistry,
      runtime,
      targetType: 'form',
    });

    expect(result?.kind).toBe('component');
    if (result?.kind === 'component') {
      expect(result.handle.type).toBe('form');
    }
  });

  it("targetType='auto' finds a form handle when no crud/tree is nearer", async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    runtime.createPageRuntime({});

    const scope = makeScope('formScope');
    const componentRegistry = createComponentHandleRegistry({ id: 'cr' });
    componentRegistry.register(makeHandle('form', scope), { cid: 2 });

    const result = await findNearestRefreshable({
      startScope: scope,
      componentRegistry,
      runtime,
      targetType: 'auto',
    });

    expect(result?.kind).toBe('component');
    if (result?.kind === 'component') {
      expect(result.handle.type).toBe('form');
    }
  });
});

describe('refreshNearest — Phase 2 action end-to-end', () => {
  it('returns ok+found:false (silent) when no target', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const notifySpy = vi.spyOn(env, 'notify');

    const result = await runtime.dispatch(
      { action: 'refreshNearest' },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(true);
    expect((result as any).data).toMatchObject({ found: false });
    expect(notifySpy).toHaveBeenCalledWith('info', 'refreshNearest found no refreshable target — no-op');
    notifySpy.mockRestore();
  });

  it('returns ok:false when notFound="error" and no target', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      { action: 'refreshNearest', args: { notFound: 'error' } },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(false);
    expect((result as any).error?.message).toContain('refreshNearest found no refreshable target');
  });

  it('invokes CRUD refresh capability when CRUD is in scope', async () => {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const componentRegistry = createComponentHandleRegistry({ id: 'test-cr' });

    const invoke = vi.fn<(...args: any[]) => Promise<any>>(async () => ({
      ok: true,
      data: { items: [] },
    }));
    const handle = makeHandle('crud', page.scope, {
      capabilities: { invoke, hasMethod: () => true },
    });
    componentRegistry.register(handle, { cid: 100 });

    const result = await runtime.dispatch(
      { action: 'refreshNearest' },
      { runtime, scope: page.scope, page, componentRegistry },
    );

    expect(result.ok).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(String(invoke.mock.calls[0]?.[0] ?? '')).toBe('refresh');
  });
});
