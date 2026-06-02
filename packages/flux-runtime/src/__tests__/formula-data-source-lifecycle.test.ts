import { describe, expect, it } from 'vitest';
import type { ScopeRef } from '@nop-chaos/flux-core';
import { createFormulaDataSourceController } from '../async-data/formula-data-source-controller.js';

function createMockScope(): ScopeRef {
  const data: Record<string, unknown> = {};
  return {
    id: 'test-scope',
    path: '',
    get: (path: string) => data[path],
    has: (path: string) => path in data,
    update: (path: string, value: unknown) => {
      data[path] = value;
    },
    merge: (values: Record<string, unknown>) => {
      Object.assign(data, values);
    },
    readOwn: () => ({ ...data }),
    readVisible: () => ({ ...data }),
    materializeVisible: () => ({ ...data }),
    value: data,
  } as ScopeRef;
}

describe('createFormulaDataSourceController lifecycle', () => {
  it('restarts via start() after stop()', async () => {
    const scope = createMockScope();
    const runtime = {
      expressionCompiler: {
        compileValue: () => ({ isStatic: true, value: 42, kind: 'static' as const, node: { kind: 'static-node' as const, value: 42 } }),
        evaluateWithState: () => ({ value: 42 }),
      },
      env: {},
    } as any;

    const controller = createFormulaDataSourceController({
      runtime,
      scope,
      targetPath: 'value',
      formula: '${x}',
    });

    controller.start();
    await Promise.resolve();
    expect(scope.get('value')).toBe(42);

    controller.stop();
    expect(controller.getState().fetchStatus).toBe('idle');

    controller.start();
    await Promise.resolve();
    expect(scope.get('value')).toBe(42);
    expect(controller.getState().status).toBe('success');
  });

  it('restarts via refresh() after stop()', async () => {
    const scope = createMockScope();
    const runtime = {
      expressionCompiler: {
        compileValue: () => ({ isStatic: true, value: 99, kind: 'static' as const, node: { kind: 'static-node' as const, value: 99 } }),
        evaluateWithState: () => ({ value: 99 }),
      },
      env: {},
    } as any;

    const controller = createFormulaDataSourceController({
      runtime,
      scope,
      targetPath: 'count',
      formula: '${y}',
    });

    controller.start();
    await Promise.resolve();
    expect(scope.get('count')).toBe(99);

    controller.stop();

    await controller.refresh();
    expect(scope.get('count')).toBe(99);
    expect(controller.getState().started).toBe(true);
    expect(controller.getState().status).toBe('success');
  });

  it('restarts via start() after reset()', async () => {
    const scope = createMockScope();
    const runtime = {
      expressionCompiler: {
        compileValue: () => ({ isStatic: true, value: 'hello', kind: 'static' as const, node: { kind: 'static-node' as const, value: 'hello' } }),
        evaluateWithState: () => ({ value: 'hello' }),
      },
      env: {},
    } as any;

    const controller = createFormulaDataSourceController({
      runtime,
      scope,
      targetPath: 'msg',
      formula: '${z}',
    });

    controller.start();
    await Promise.resolve();
    expect(scope.get('msg')).toBe('hello');

    controller.reset();
    expect(scope.get('msg')).toBeUndefined();
    expect(controller.getState().started).toBe(false);

    controller.start();
    await Promise.resolve();
    expect(scope.get('msg')).toBe('hello');
    expect(controller.getState().status).toBe('success');
  });

  it('restarts via refresh() after reset()', async () => {
    const scope = createMockScope();
    const runtime = {
      expressionCompiler: {
        compileValue: () => ({ isStatic: true, value: 7, kind: 'static' as const, node: { kind: 'static-node' as const, value: 7 } }),
        evaluateWithState: () => ({ value: 7 }),
      },
      env: {},
    } as any;

    const controller = createFormulaDataSourceController({
      runtime,
      scope,
      targetPath: 'num',
      formula: '${w}',
    });

    controller.start();
    await Promise.resolve();

    controller.reset();
    expect(scope.get('num')).toBeUndefined();

    await controller.refresh();
    expect(scope.get('num')).toBe(7);
    expect(controller.getState().status).toBe('success');
  });
});
