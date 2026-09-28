import { describe, expect, it } from 'vitest';
import type { EvalContext } from '@nop-chaos/flux-core';
import { createScopeDependencyCollector, toEvalContext } from './scope.js';

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

// plan 2026-09-28-6 P14: createFormulaScope (Proxy-tracking scope) was removed
// as dead code — zero production call sites. Coverage here stays on the live
// exports: createScopeDependencyCollector and toEvalContext.

describe('createScopeDependencyCollector', () => {
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

  it('records explicit paths and ignores post-wildcard records', () => {
    const tracked = createScopeDependencyCollector();
    tracked.collector.recordPath('user');

    expect(tracked.finalize()).toEqual({
      paths: ['user'],
      wildcard: false,
      broadAccess: false,
    });

    // after wildcard, further specific paths collapse into the wildcard set
    tracked.collector.recordWildcard();
    tracked.collector.recordPath('user.name');
    expect(tracked.finalize()).toEqual({
      paths: ['*'],
      wildcard: true,
      broadAccess: true,
    });
  });
});

describe('toEvalContext', () => {
  it('accepts eval contexts, scope refs, and plain objects', () => {
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
});
