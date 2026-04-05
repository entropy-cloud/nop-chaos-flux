import { describe, expect, it } from 'vitest';
import type { EvalContext } from '@nop-chaos/flux-core';
import { createFormulaScope, createScopeDependencyCollector } from './scope';

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
    }
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
      collector: tracked.collector
    };

    const scope = createFormulaScope(ctx);
    const user = scope.user as { name: string };
    expect(user.name).toBe('Bob');

    expect(tracked.finalize()).toEqual({
      paths: ['user', 'user.name'],
      wildcard: false,
      broadAccess: false
    });
  });

  it('falls back to wildcard dependency for ownKeys access', () => {
    const tracked = createScopeDependencyCollector();
    const ctx: EvalContext = {
      ...makeEvalContext({ user: { name: 'Bob' } }),
      collector: tracked.collector
    };

    Reflect.ownKeys(createFormulaScope(ctx));

    expect(tracked.finalize()).toEqual({
      paths: ['*'],
      wildcard: true,
      broadAccess: true
    });
  });
});
