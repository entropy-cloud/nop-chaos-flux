import { describe, expect, it } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { createScopeRef } from '../scope.js';
import { pageRenderer, textRenderer, env } from './test-fixtures.js';

function closedSummary(id: string, kind: 'dialog' | 'drawer') {
  return {
    id,
    kind,
    open: false,
    active: false,
    opening: false,
    closing: false,
  };
}

describe('surface status publication owner-scope resolution', () => {
  function setupRuntime() {
    const registry = createRendererRegistry([pageRenderer, textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});
    const surfaceRuntime = runtime.createSurfaceRuntime();
    return { runtime, page, surfaceRuntime };
  }

  it('publishes closed status to the explicit ownerScope when provided (fp-publish-closed-owner)', () => {
    const { surfaceRuntime } = setupRuntime();
    const ownerScope = createScopeRef({ id: 'owner', path: '$owner', initialData: {} });
    const surfaceScope = createScopeRef({
      id: 'surface',
      path: '$owner.surface',
      parent: ownerScope,
      initialData: {},
    });

    surfaceRuntime.publishClosed({
      surfaceId: 'd-1',
      kind: 'dialog',
      scope: surfaceScope,
      statusPath: 'dialogStatus',
      ownerScope,
    });

    expect(ownerScope.get('dialogStatus')).toEqual(closedSummary('d-1', 'dialog'));
    expect(surfaceScope.parent?.get('dialogStatus')).toEqual(closedSummary('d-1', 'dialog'));
  });

  it('falls back to scope.parent when ownerScope is absent (fp-publish-closed-fallback)', () => {
    const { surfaceRuntime } = setupRuntime();
    const parentScope = createScopeRef({ id: 'parent', path: '$parent', initialData: {} });
    const surfaceScope = createScopeRef({
      id: 'surface',
      path: '$parent.surface',
      parent: parentScope,
      initialData: {},
    });

    surfaceRuntime.publishClosed({
      surfaceId: 'd-2',
      kind: 'drawer',
      scope: surfaceScope,
      statusPath: 'drawerStatus',
    });

    expect(parentScope.get('drawerStatus')).toEqual(closedSummary('d-2', 'drawer'));
  });

  it('falls back to the scope itself when it has no parent', () => {
    const { surfaceRuntime } = setupRuntime();
    const rootScope = createScopeRef({ id: 'root', path: '$root', initialData: {} });

    surfaceRuntime.publishClosed({
      surfaceId: 'd-3',
      kind: 'dialog',
      scope: rootScope,
      statusPath: 'dialogStatus',
    });

    expect(rootScope.get('dialogStatus')).toEqual(closedSummary('d-3', 'dialog'));
  });

  it('publishes declarative closed status on the same owner scope as the open path (unified chain)', async () => {
    const { runtime, page, surfaceRuntime } = setupRuntime();
    runtime.compile({ type: 'text', text: 'trigger' });

    const childScope = runtime.createChildScope(
      page.scope,
      { dialogId: 'decl-d-1' },
      { pathSuffix: 'dialog' },
    );

    surfaceRuntime.open({
      kind: 'dialog',
      surface: { statusPath: 'dialogStatus' },
      scope: childScope,
      surfaceId: 'decl-d-1',
    });

    expect(page.scope.get('dialogStatus')).toEqual({
      id: 'decl-d-1',
      kind: 'dialog',
      open: true,
      active: true,
      opening: false,
      closing: false,
    });

    surfaceRuntime.publishClosed({
      surfaceId: 'decl-d-1',
      kind: 'dialog',
      scope: childScope,
      statusPath: 'dialogStatus',
    });

    expect(page.scope.get('dialogStatus')).toEqual(closedSummary('decl-d-1', 'dialog'));
  });
});
