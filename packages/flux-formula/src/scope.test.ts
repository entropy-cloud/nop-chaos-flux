import { describe, expect, it } from 'vitest';
import type { EvalContext } from '@nop-chaos/flux-core';
import { createFormulaScope } from './scope';

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

describe('createFormulaScope Proxy caching (FIX-14)', () => {
  it('returns same Proxy instance for same EvalContext', () => {
    const ctx = makeEvalContext({ x: 1 });
    const scope1 = createFormulaScope(ctx);
    const scope2 = createFormulaScope(ctx);
    expect(scope1).toBe(scope2);
  });

  it('returns different Proxy for different EvalContext', () => {
    const ctx1 = makeEvalContext({ x: 1 });
    const ctx2 = makeEvalContext({ x: 1 });
    const scope1 = createFormulaScope(ctx1);
    const scope2 = createFormulaScope(ctx2);
    expect(scope1).not.toBe(scope2);
  });
});

describe('createFormulaScope single resolve (FIX-11)', () => {
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
});
