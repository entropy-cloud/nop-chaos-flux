import { describe, expect, it, vi } from 'vitest';
import type { RendererRuntime, ScopeRef, ScopeDependencySet } from '@nop-chaos/flux-core';
import { createFormulaDataSourceController } from '../async-data/formula-data-source-controller.js';

const SENTINEL = 'Cannot access member of null or undefined';

function unpublishedScopeError(source: string): Error {
  return new Error(`Expression evaluation failed for: ${source}`, {
    cause: new Error(SENTINEL),
  });
}

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

function createRuntime(input: {
  evaluateWithState: RendererRuntime['expressionCompiler']['evaluateWithState'];
  notify?: RendererRuntime['env']['notify'];
}): RendererRuntime {
  return {
    env: {
      notify: input.notify ?? vi.fn(),
    },
    expressionCompiler: {
      compileValue: () => ({
        isStatic: false,
        kind: 'dynamic',
        createState: () => ({
          root: { kind: 'leaf-state', initialized: false },
        }),
      }),
      evaluateWithState: input.evaluateWithState,
      evaluateValue: () => 42,
      createState: () => ({
        root: { kind: 'leaf-state', initialized: false },
      }),
    },
  } as unknown as RendererRuntime;
}

describe('createFormulaDataSourceController — unpublished scope tolerance', () => {
  it('stays pending (not error) and keeps partial dependencies when the formula hits an unpublished scope variable', async () => {
    const notify = vi.fn();
    const onDependenciesChange = vi.fn();
    const scope = createMockScope();
    let shouldThrow = true;

    const controller = createFormulaDataSourceController({
      runtime: createRuntime({
        notify,
        evaluateWithState: ((_compiled, _scope, _env, state) => {
          // Mimic evaluateLeaf's F1 behavior: deps traversed before the throw
          // are recorded on the state node.
          if (state && state.root && state.root.kind === 'leaf-state') {
            state.root.dependencies = {
              paths: ['rawData'],
              wildcard: false,
              broadAccess: false,
            } satisfies ScopeDependencySet;
          }
          if (shouldThrow) {
            throw unpublishedScopeError('${(rawData.items ?? []).map(a => a)}');
          }
          return { value: [1, 2], changed: true, reusedReference: false };
        }) as RendererRuntime['expressionCompiler']['evaluateWithState'],
      }),
      scope,
      ownerId: 'data-source:test-scope:timelineItems',
      targetPath: 'timelineItems',
      formula: '${(rawData.items ?? []).map(a => a)}',
      onDependenciesChange: onDependenciesChange as (
        deps: ScopeDependencySet | undefined,
      ) => void,
    });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.getState().status).toBe('pending');
    expect(controller.getState().fetchStatus).toBe('idle');
    expect(controller.getState().error).toBeUndefined();
    // Partial dependencies preserved (NOT cleared to undefined) so the
    // registry subscription re-fires when rawData publishes.
    expect(onDependenciesChange).toHaveBeenCalledWith({
      paths: ['rawData'],
      wildcard: false,
      broadAccess: false,
    });
    // Tolerated scope-waiting must not surface a host error (no toast/console error).
    expect(notify).not.toHaveBeenCalledWith('error', expect.anything());
    expect(scope.get('timelineItems')).toBeUndefined();

    shouldThrow = false;
    await controller.refresh();

    expect(controller.getState().status).toBe('success');
    expect(controller.getState().data).toEqual([1, 2]);
    expect(scope.get('timelineItems')).toEqual([1, 2]);
  });

  it('records a succeeded run (scope-waiting semantics) instead of a failed run for the sentinel', async () => {
    const scope = createMockScope();
    const asyncGovernance = (await import('../async-data/async-governance.js')).createAsyncGovernanceStore();
    let shouldThrow = true;

    const controller = createFormulaDataSourceController({
      runtime: createRuntime({
        evaluateWithState: ((_compiled, _scope, _env, state) => {
          if (state && state.root && state.root.kind === 'leaf-state') {
            state.root.dependencies = {
              paths: ['rawData'],
              wildcard: false,
              broadAccess: false,
            } satisfies ScopeDependencySet;
          }
          if (shouldThrow) {
            throw unpublishedScopeError('${rawData.total}');
          }
          return { value: 7, changed: true, reusedReference: false };
        }) as RendererRuntime['expressionCompiler']['evaluateWithState'],
      }),
      scope,
      ownerId: 'data-source:test-scope:total',
      asyncGovernance,
      targetPath: 'total',
      formula: '${rawData.total}',
    });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(asyncGovernance.getOwnerState('data-source:test-scope:total')?.recentRuns).toEqual(
      expect.arrayContaining([expect.objectContaining({ outcome: 'succeeded' })]),
    );
    expect(asyncGovernance.getOwnerState('data-source:test-scope:total')?.recentRuns).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ outcome: 'failed' })]),
    );

    shouldThrow = false;
    await controller.refresh();
    expect(controller.getState().data).toBe(7);
  });

  it('keeps the strict error path for non-sentinel evaluation failures', async () => {
    const notify = vi.fn();
    const onDependenciesChange = vi.fn();
    const scope = createMockScope();

    const controller = createFormulaDataSourceController({
      runtime: createRuntime({
        notify,
        evaluateWithState: (() => {
          throw new Error('Expression evaluation failed for: ${broken}', {
            cause: new TypeError('boom is not a function'),
          });
        }) as RendererRuntime['expressionCompiler']['evaluateWithState'],
      }),
      scope,
      targetPath: 'result',
      formula: '${broken()}',
      onDependenciesChange: onDependenciesChange as (
        deps: ScopeDependencySet | undefined,
      ) => void,
    });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.getState().status).toBe('error');
    expect(onDependenciesChange).toHaveBeenCalledWith(undefined);
    expect(notify).toHaveBeenCalledWith('error', expect.anything());
  });
});
