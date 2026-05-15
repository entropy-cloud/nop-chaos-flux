import { describe, expect, it, vi } from 'vitest';
import { createActionScope, isNamespacedAction } from '../action-scope.js';
import {
  applyRequestAdaptor,
  applyResponseAdaptor,
  createAdaptorScopeView,
  getCachedAdaptorExpression,
} from '../async-data/request-runtime-adaptor.js';
import { createScopeRef } from '../scope.js';
import type { ApiSchema } from '@nop-chaos/flux-core';
import type { RendererEnv } from '@nop-chaos/flux-core';

describe('action scope helpers', () => {
  it('parses namespaced actions and rejects invalid names', () => {
    expect(isNamespacedAction('dialog:open')).toBe(true);
    expect(isNamespacedAction('dialog')).toBe(false);
    expect(isNamespacedAction(':open')).toBe(false);
    expect(isNamespacedAction('dialog:')).toBe(false);
  });

  it('registers, replaces, resolves, and unregisters namespace providers', () => {
    const parentProvider = { kind: 'parent', listMethods: () => ['run'], dispose: vi.fn() } as any;
    const childProvider = { kind: 'child', listMethods: () => ['open'], dispose: vi.fn() } as any;
    const replacementProvider = {
      kind: 'replacement',
      listMethods: () => ['close'],
      dispose: vi.fn(),
    } as any;
    const parent = createActionScope({ id: 'parent-scope' });
    parent.registerNamespace('dialog', parentProvider);

    const scope = createActionScope({ id: 'child-scope', parent });
    expect(scope.resolve('dialog:open')?.sourceScopeId).toBe('parent-scope');

    const disposeChild = scope.registerNamespace('dialog', childProvider);
    expect(scope.resolve('dialog:open')).toMatchObject({
      namespace: 'dialog',
      method: 'open',
      sourceScopeId: 'child-scope',
      provider: childProvider,
    });
    expect(scope.getDebugSnapshot?.()).toEqual({
      id: 'child-scope',
      parentId: 'parent-scope',
      namespaces: [{ namespace: 'dialog', providerKind: 'child', methods: ['open'] }],
    });

    scope.registerNamespace('dialog', replacementProvider);
    expect(childProvider.dispose).toHaveBeenCalledTimes(1);
    expect(scope.resolve('dialog:close')?.provider).toBe(replacementProvider);
    expect(scope.listNamespaces()).toEqual(['dialog']);

    disposeChild();
    expect(scope.resolve('dialog:close')?.provider).toBe(replacementProvider);

    scope.unregisterNamespace('dialog');
    expect(replacementProvider.dispose).toHaveBeenCalledTimes(1);
    expect(scope.resolve('dialog:open')?.provider).toBe(parentProvider);

    scope.unregisterNamespace('missing');
    expect(scope.resolve('invalid')).toBeUndefined();
  });
});

describe('request runtime adaptor helpers', () => {
  function createExpressionCompiler() {
    const compileExpression = vi.fn((source: string) => ({
      exec: vi.fn((ctx: any) => {
        if (source === 'api') {
          return { headers: { ...ctx.headers, token: String(ctx.scope.token ?? 'missing') } };
        }

        if (source === 'payload') {
          return { wrapped: ctx.payload, token: String(ctx.scope.token ?? 'missing') };
        }

        if (source === 'primitive') {
          return 123;
        }

        return source;
      }),
    }));

    return {
      formulaCompiler: {
        compileExpression,
      },
    } as any;
  }

  it('caches normalized adaptor expressions', () => {
    const expressionCompiler = createExpressionCompiler();
    const first = getCachedAdaptorExpression(expressionCompiler, ' return api; ');
    const second = getCachedAdaptorExpression(expressionCompiler, 'api;');

    expect(first).toBe(second);
    expect(expressionCompiler.formulaCompiler.compileExpression).toHaveBeenCalledTimes(1);
  });

  it('creates a scope proxy view with parent keys and safe descriptors', () => {
    const parent = createScopeRef({
      id: 'parent',
      path: '$parent',
      initialData: { shared: 'parent' },
    });
    const scope = createScopeRef({
      id: 'child',
      path: '$child',
      parent,
      initialData: { token: 'abc', local: 1 },
    });
    const view = createAdaptorScopeView(scope) as Record<string | symbol, unknown>;
    const keys = Reflect.ownKeys(view);

    expect(view.token).toBe('abc');
    expect(view.shared).toBe('parent');
    expect(view.__proto__).toBeUndefined();
    expect('token' in view).toBe(true);
    expect('missing' in view).toBe(false);
    expect(keys).toContain('token');
    expect(keys).toContain('shared');
    expect(Object.getOwnPropertyDescriptor(view, 'token')).toMatchObject({
      enumerable: true,
      value: 'abc',
      writable: false,
    });
    expect(Object.getOwnPropertyDescriptor(view, 'missing')).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(view, Symbol('x'))).toBeUndefined();
  });

  it('stops enumerating parent keys across isolate boundaries', () => {
    const grandparent = createScopeRef({
      id: 'grandparent',
      path: '$grandparent',
      initialData: { grand: 'grandparent' },
    });
    const isolatedParent = createScopeRef({
      id: 'isolated-parent',
      path: '$isolated-parent',
      parent: grandparent,
      isolate: true,
      initialData: { parentOnly: 'parent' },
    });
    const scope = createScopeRef({
      id: 'child',
      path: '$child',
      parent: isolatedParent,
      initialData: { token: 'abc', local: 1 },
    });

    const view = createAdaptorScopeView(scope) as Record<string, unknown>;
    const keys = Object.keys(view);
    const spread = { ...view };
    const iterated: string[] = [];

    for (const key in view) {
      iterated.push(key);
    }

    expect(view.grand).toBeUndefined();
    expect('grand' in view).toBe(false);
    expect(keys).toEqual(expect.arrayContaining(['token', 'local', 'parentOnly']));
    expect(keys).not.toContain('grand');
    expect(Object.keys(spread)).toEqual(expect.arrayContaining(['token', 'local', 'parentOnly']));
    expect(Object.keys(spread)).not.toContain('grand');
    expect(iterated).toEqual(expect.arrayContaining(['token', 'local', 'parentOnly']));
    expect(iterated).not.toContain('grand');
    expect(Object.getOwnPropertyDescriptor(view, 'grand')).toBeUndefined();
  });

  it('continues enumerating through non-isolated parent chains', () => {
    const parent = createScopeRef({
      id: 'parent',
      path: '$parent',
      initialData: { shared: 'parent' },
    });
    const scope = createScopeRef({
      id: 'child',
      path: '$child',
      parent,
      initialData: { local: 'child' },
    });

    const view = createAdaptorScopeView(scope) as Record<string, unknown>;
    const keys = Reflect.ownKeys(view);

    expect(view.shared).toBe('parent');
    expect(keys).toContain('local');
    expect(keys).toContain('shared');
    expect(Object.keys(view)).toEqual(expect.arrayContaining(['local', 'shared']));
  });

  it('applies request adaptors only when they return plain objects', () => {
    const expressionCompiler = createExpressionCompiler();
    const scope = createScopeRef({ id: 'scope', path: '$scope', initialData: { token: 'secret' } });
    const env = {} as RendererEnv;

    const untouched = applyRequestAdaptor(
      expressionCompiler,
      { url: '/api/demo' } satisfies ApiSchema,
      scope,
      env,
    );
    const adapted = applyRequestAdaptor(
      expressionCompiler,
      { url: '/api/demo', headers: {}, requestAdaptor: 'return api;' } satisfies ApiSchema,
      scope,
      env,
    );
    const primitive = applyRequestAdaptor(
      expressionCompiler,
      { url: '/api/demo', requestAdaptor: 'primitive' } satisfies ApiSchema,
      scope,
      env,
    );

    expect(untouched).toEqual({ url: '/api/demo' });
    expect(adapted).toEqual({
      url: '/api/demo',
      headers: { token: 'secret' },
      requestAdaptor: 'return api;',
    });
    expect(primitive).toEqual({ url: '/api/demo', requestAdaptor: 'primitive' });
  });

  it('applies response adaptors and falls back to raw payloads when absent', () => {
    const expressionCompiler = createExpressionCompiler();
    const scope = createScopeRef({ id: 'scope', path: '$scope', initialData: { token: 'secret' } });
    const env = {} as RendererEnv;

    const untouched = applyResponseAdaptor(
      expressionCompiler,
      { url: '/api/demo' } satisfies ApiSchema,
      { url: '/api/demo' } satisfies ApiSchema,
      { ok: true },
      scope,
      env,
    );
    const adapted = applyResponseAdaptor(
      expressionCompiler,
      { url: '/api/demo' } satisfies ApiSchema,
      { url: '/api/demo', responseAdaptor: 'payload' } satisfies ApiSchema,
      { ok: true },
      scope,
      env,
    );

    expect(untouched).toEqual({ ok: true });
    expect(adapted).toEqual({ wrapped: { ok: true }, token: 'secret' });
  });
});
