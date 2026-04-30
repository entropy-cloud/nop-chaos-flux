import { describe, expect, it } from 'vitest';
import type { EvalContext } from '@nop-chaos/flux-core';
import { createFormulaScope, createScopeDependencyCollector, toEvalContext } from './scope';

function makeEvalContext(data: Record<string, any>): EvalContext {
  return {
    resolve(path: string) {
      return path.split('.').reduce<unknown>((cur, seg) => {
        if (cur == null || typeof cur !== 'object') return undefined;
        return (cur as Record<string, unknown>)[seg];
      }, data);
    },
    has(path: string) {
      return this.resolve(path) !== undefined;
    },
    materialize() {
      return data;
    },
  };
}

describe('createFormulaScope', () => {
  it('returns a new Proxy instance for each call', () => {
    const ctx = makeEvalContext({ x: 1 });
    const scope1 = createFormulaScope(ctx);
    const scope2 = createFormulaScope(ctx);
    expect(scope1).not.toBe(scope2);
  });

  it('resolves top-level property via resolve only', () => {
    const ctx = makeEvalContext({ name: 'Alice' });
    const scope = createFormulaScope(ctx);
    expect(scope.name).toBe('Alice');
  });

  it('falls back to materialize for nested dot-path', () => {
    const ctx = makeEvalContext({ user: { name: 'Bob' } });
    const scope = createFormulaScope(ctx);
    expect(scope['user.name']).toBe('Bob');
  });

  it('records direct path access in the dependency collector', () => {
    const tracked = createScopeDependencyCollector();
    const ctx: EvalContext = {
      ...makeEvalContext({ user: { name: 'Bob' } }),
      collector: tracked.collector,
    };

    const scope = createFormulaScope(ctx);
    const user = scope.user as { name: string };
    expect(user.name).toBe('Bob');

    expect(tracked.finalize()).toEqual({
      paths: ['user'],
      wildcard: false,
      broadAccess: false,
    });
  });

  it('anchors nested object enumeration to the lexical root binding', () => {
    const tracked = createScopeDependencyCollector();
    const ctx: EvalContext = {
      ...makeEvalContext({ user: { name: 'Bob', role: 'admin' }, note: 'ignore' }),
      collector: tracked.collector,
    };

    const scope = createFormulaScope(ctx);
    expect(Object.keys(scope.user as Record<string, unknown>)).toEqual(['name', 'role']);

    expect(tracked.finalize()).toEqual({
      paths: ['user'],
      wildcard: false,
      broadAccess: false,
    });
  });

  it('falls back to wildcard dependency for ownKeys access', () => {
    const tracked = createScopeDependencyCollector();
    const ctx: EvalContext = {
      ...makeEvalContext({ user: { name: 'Bob' } }),
      collector: tracked.collector,
    };

    Reflect.ownKeys(createFormulaScope(ctx));

    expect(tracked.finalize()).toEqual({
      paths: ['*'],
      wildcard: true,
      broadAccess: true,
    });
  });

  it('normalizes dependency roots and stops tracking specific paths after wildcard access', () => {
    const tracked = createScopeDependencyCollector();
    tracked.collector.recordPath(' users[0].name ');
    tracked.collector.recordPath('');

    expect(tracked.finalize()).toEqual({
      paths: ['users'],
      wildcard: false,
      broadAccess: false,
    });

    const wildcardTracked = createScopeDependencyCollector();
    wildcardTracked.collector.recordWildcard();
    wildcardTracked.collector.recordPath('later.value');

    expect(wildcardTracked.finalize()).toEqual({
      paths: ['*'],
      wildcard: true,
      broadAccess: true,
    });
  });

  it('accepts eval contexts, scope refs, and plain objects in toEvalContext', () => {
    const directContext = makeEvalContext({ direct: 1 });
    expect(toEvalContext(directContext)).toBe(directContext);

    const scopeRef = {
      id: 'scope-id',
      path: 'root',
      value: { count: 2 },
      get(path: string) {
        return path === 'count' ? 2 : undefined;
      },
      has(path: string) {
        return path === 'count';
      },
      readOwn() {
        return { count: 2 };
      },
      readVisible() {
        return { count: 2 };
      },
      materializeVisible() {
        return { count: 2 };
      },
      update() {},
      merge() {},
    };
    const scopeContext = toEvalContext(scopeRef);
    expect(scopeContext.resolve('count')).toBe(2);
    expect(scopeContext.has('count')).toBe(true);
    expect(scopeContext.materialize()).toEqual({ count: 2 });

    const objectContext = toEvalContext({ nested: { value: 3 }, missing: undefined });
    expect(objectContext.resolve('nested.value')).toBe(3);
    expect(objectContext.has('nested.value')).toBe(true);
    expect(objectContext.has('missing')).toBe(true);
    expect(objectContext.has('nested.missing')).toBe(false);
    expect(objectContext.materialize()).toEqual({ nested: { value: 3 }, missing: undefined });
  });

  it('covers proxy traps for non-string keys, __proto__, has, and property descriptors', () => {
    const tracked = createScopeDependencyCollector();
    const symbolKey = Symbol('test');
    const ctx: EvalContext = {
      ...makeEvalContext({ user: { name: 'Bob' }, nil: undefined }),
      collector: tracked.collector,
    };

    const scope = createFormulaScope(ctx) as Record<string | symbol, unknown>;
    expect(scope.__proto__).toBeUndefined();
    expect(scope[symbolKey]).toBeUndefined();
    expect('user' in scope).toBe(true);
    expect('missing' in scope).toBe(false);
    expect(Symbol.iterator in scope).toBe(false);
    expect(scope.nil).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(scope, 'user')).toEqual({
      configurable: true,
      enumerable: true,
      value: { name: 'Bob' },
      writable: false,
    });
    expect(Object.getOwnPropertyDescriptor(scope, 'missing')).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(scope, symbolKey)).toBeUndefined();

    expect(tracked.finalize()).toEqual({
      paths: ['*'],
      wildcard: true,
      broadAccess: true,
    });
  });

  it('tracks nested proxies through has, ownKeys, and descriptor lookups', () => {
    const tracked = createScopeDependencyCollector();
    const ctx: EvalContext = {
      ...makeEvalContext({ user: { name: 'Bob', nested: { role: 'admin' } } }),
      collector: tracked.collector,
    };

    const scope = createFormulaScope(ctx);
    const user = scope.user as Record<string, unknown>;

    expect('__proto__' in user).toBe(true);
    expect('name' in user).toBe(true);
    expect(Object.keys(user)).toEqual(['name', 'nested']);
    expect(Object.getOwnPropertyDescriptor(user, 'name')?.value).toBe('Bob');
    expect((user.nested as Record<string, unknown>).role).toBe('admin');

    expect(tracked.finalize()).toEqual({
      paths: ['user'],
      wildcard: false,
      broadAccess: false,
    });
  });
});
