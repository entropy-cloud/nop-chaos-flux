import { describe, expect, it, vi } from 'vitest';
import type { RendererRuntime, ScopeRef, ScopeDependencySet } from '@nop-chaos/flux-core';
import { createFormulaDataSourceController } from '../async-data/formula-data-source-controller.js';
import { createAsyncGovernanceStore } from '../async-data/async-governance.js';

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

describe('createFormulaDataSourceController', () => {
  it('recovers after first publish fails when dependencies are reset to undefined', async () => {
    let shouldThrow = true;
    const onDependenciesChange = vi.fn();
    const scope = createMockScope();

    const controller = createFormulaDataSourceController({
      runtime: {
        env: {
          notify: vi.fn(),
        },
        expressionCompiler: {
          compileValue: (_formula: unknown) => ({
            isStatic: false,
            kind: 'dynamic',
            createState: () => ({
              root: { kind: 'leaf-state', initialized: false },
            }),
            exec: () => {
              if (shouldThrow) {
                throw new Error('first evaluation failed');
              }
              return 42;
            },
          }),
          evaluateWithState: () => {
            if (shouldThrow) {
              throw new Error('first evaluation failed');
            }
            return { value: 42, changed: true, reusedReference: false };
          },
          evaluateValue: () => 42,
          createState: () => ({
            root: { kind: 'leaf-state', initialized: false },
          }),
        },
      } as unknown as RendererRuntime,
      scope,
      targetPath: 'result',
      formula: '${someFormula}',
      onDependenciesChange: onDependenciesChange as (
        deps: ScopeDependencySet | undefined,
      ) => void,
    });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.getState().status).toBe('error');
    expect(onDependenciesChange).toHaveBeenCalledWith(undefined);

    shouldThrow = false;

    await controller.refresh();

    expect(controller.getState().status).toBe('success');
    expect(controller.getState().data).toBe(42);
    expect(scope.get('result')).toBe(42);

    scope.update('trigger', 'changed');
    await controller.refresh();

    expect(controller.getState().status).toBe('success');
    expect(controller.getState().data).toBe(42);
  });

  it('skips data writes and dataUpdatedAt churn when refreshed value is unchanged', async () => {
    const scope = createMockScope();
    const controller = createFormulaDataSourceController({
      runtime: {
        env: {
          notify: vi.fn(),
        },
        expressionCompiler: {
          compileValue: () => ({
            isStatic: false,
            kind: 'dynamic',
            createState: () => ({
              root: { kind: 'leaf-state', initialized: false },
            }),
          }),
          evaluateWithState: () => ({ value: 42, changed: true, reusedReference: false }),
          evaluateValue: () => 42,
          createState: () => ({
            root: { kind: 'leaf-state', initialized: false },
          }),
        },
      } as unknown as RendererRuntime,
      scope,
      targetPath: 'result',
      formula: '${someFormula}',
    });

    const updateSpy = vi.spyOn(scope, 'update');

    controller.start();
    await Promise.resolve();
    await Promise.resolve();

    const firstUpdatedAt = controller.getState().dataUpdatedAt;
    expect(scope.get('result')).toBe(42);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    await controller.refresh();

    expect(scope.get('result')).toBe(42);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(controller.getState().dataUpdatedAt).toBe(firstUpdatedAt);
  });

  it('settles failed refresh runs and leaves the controller out of fetching after publish errors', async () => {
    let shouldThrow = false;
    const scope = createMockScope();
    const asyncGovernance = createAsyncGovernanceStore();
    const controller = createFormulaDataSourceController({
      runtime: {
        env: {
          notify: vi.fn(),
        },
        expressionCompiler: {
          compileValue: () => ({
            isStatic: false,
            kind: 'dynamic',
            createState: () => ({
              root: { kind: 'leaf-state', initialized: false },
            }),
          }),
          evaluateWithState: () => {
            if (shouldThrow) {
              throw new Error('refresh failed');
            }
            return { value: 42, changed: true, reusedReference: false };
          },
          evaluateValue: () => 42,
          createState: () => ({
            root: { kind: 'leaf-state', initialized: false },
          }),
        },
      } as unknown as RendererRuntime,
      scope,
      ownerId: 'data-source:test-scope:result',
      asyncGovernance,
      targetPath: 'result',
      formula: '${someFormula}',
    });

    controller.start();
    await Promise.resolve();
    await Promise.resolve();

    shouldThrow = true;

    await expect(controller.refresh()).rejects.toThrow('refresh failed');
    expect(controller.getState()).toMatchObject({
      status: 'error',
      fetchStatus: 'idle',
    });
    expect(asyncGovernance.getOwnerState('data-source:test-scope:result')?.recentRuns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ outcome: 'failed', error: expect.objectContaining({ message: 'refresh failed' }) }),
      ]),
    );
  });
});
