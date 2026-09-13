import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRendererEnv, useRendererRuntime } from '@nop-chaos/flux-react';
import { useBindingBridge } from './use-binding-bridge.js';
import type { SceneManager } from '../../engine/scene-manager.js';
import type { DataBinding } from '../../schemas.js';
import {
  ThreeTestProviders,
  createThreeTestEnvironment,
  flushMicrotasks,
  renderWithThreeEnvironment,
  type ThreeTestEnvironment,
} from '../../test-support/renderer-test-support.js';

function makeFakeEngine() {
  const queues: Array<{ drain: () => Array<{ modelId: string; path: string; value: unknown }> }> = [];
  const engine = {
    setFrameUpdateQueue: vi.fn(
      (queue: { drain: () => Array<{ modelId: string; path: string; value: unknown }> }) => {
        queues.push(queue);
      },
    ),
  } as unknown as SceneManager;
  return {
    engine,
    latestQueue: () => queues[queues.length - 1],
  };
}

function BindingProbe(props: {
  bindings: DataBinding[];
  engine: SceneManager | null;
  onError?: (code: string, message: string, error?: unknown) => void;
  transform?: (binding: DataBinding, value: unknown) => unknown;
}) {
  const runtime = useRendererRuntime();
  const env = useRendererEnv();
  useBindingBridge({
    bindings: props.bindings,
    sceneManager: props.engine,
    expressionCompiler: runtime.expressionCompiler,
    env,
    onError: props.onError,
    transform: props.transform,
  });
  return null;
}

function renderBridge(
  bindings: DataBinding[],
  engine: SceneManager | null,
  onError?: (code: string, message: string, error?: unknown) => void,
): { environment: ThreeTestEnvironment; rerender: (engine: SceneManager | null) => void } {
  const environment = createThreeTestEnvironment([], { sceneState: { valve1: 5, tank: { level: 42 } } });
  const utils = renderWithThreeEnvironment(
    <BindingProbe bindings={bindings} engine={engine} onError={onError} />,
    environment,
  );
  return {
    environment,
    rerender: (nextEngine: SceneManager | null) => {
      // testing-library 的 rerender 不复用 wrapper：重包 providers
      utils.rerender(
        <ThreeTestProviders environment={environment}>
          <BindingProbe bindings={bindings} engine={nextEngine} onError={onError} />
        </ThreeTestProviders>,
      );
    },
  };
}

const valueBinding = (expression: string, modelId = 'valve', path = 'position'): DataBinding => ({
  id: `binding-${modelId}-${path}`,
  target: { modelId, path, type: 'position' },
  source: { expression },
});

describe('useBindingBridge (plan 465 Phase 5, real compiler + controlled scope, fake engine)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pushes evaluated initial values through the frame queue (initial-value preservation)', async () => {
    const fake = makeFakeEngine();
    renderBridge([valueBinding('${sceneState.valve1}')], fake.engine);
    await flushMicrotasks();
    const queue = fake.latestQueue();
    expect(queue).toBeDefined();
    expect(queue.drain()).toEqual([{ modelId: 'valve', path: 'position', value: 5 }]);
  });

  it('re-evaluates when subscribed scope paths change and pushes transformed updates', async () => {
    const fake = makeFakeEngine();
    const { environment } = renderBridge([valueBinding('${sceneState.valve1 + 1}')], fake.engine);
    await flushMicrotasks();
    fake.latestQueue().drain();
    await act(async () => {
      environment.scope.update('sceneState.valve1', 9);
      await flushMicrotasks();
    });
    expect(fake.latestQueue().drain()).toEqual([
      { modelId: 'valve', path: 'position', value: 10 },
    ]);
  });

  it('does not push when the evaluated value is unchanged', async () => {
    const fake = makeFakeEngine();
    const { environment } = renderBridge([valueBinding('${sceneState.valve1}')], fake.engine);
    await flushMicrotasks();
    fake.latestQueue().drain();
    await act(async () => {
      environment.scope.update('sceneState.other', 'x');
      await flushMicrotasks();
    });
    expect(fake.latestQueue().drain()).toEqual([]);
  });

  it('deduplicates error reports per (expression, code) and recovers after success', async () => {
    const fake = makeFakeEngine();
    const onError = vi.fn();
    const environment = createThreeTestEnvironment([], { sceneState: { valve1: 5 } });
    const evaluateSpy = vi
      .spyOn(environment.expressionCompiler, 'evaluateValue')
      .mockImplementation(() => {
        throw new Error('evaluator exploded');
      });
    const bindings = [valueBinding('${sceneState.valve1}')];
    const utils = renderWithThreeEnvironment(
      <BindingProbe bindings={bindings} engine={fake.engine} onError={onError} />,
      environment,
    );
    await flushMicrotasks();
    await act(async () => {
      environment.scope.update('sceneState.valve1', 7);
      await flushMicrotasks();
    });
    const compileErrors = onError.mock.calls.filter(([code]) => code === 'flux-evaluate-failed');
    expect(compileErrors).toHaveLength(1);
    // 恢复后（求值成功 → 去重记录清空契约）：值恢复流动
    evaluateSpy.mockRestore();
    utils.rerender(
      <ThreeTestProviders environment={environment}>
        <BindingProbe bindings={bindings} engine={fake.engine} onError={onError} />
      </ThreeTestProviders>,
    );
    await act(async () => {
      environment.scope.update('sceneState.valve1', 8);
      await flushMicrotasks();
    });
    expect(fake.latestQueue().drain()).toEqual([{ modelId: 'valve', path: 'position', value: 8 }]);
  });

  it('transform seam maps evaluated values before enqueue', async () => {
    const fake = makeFakeEngine();
    const environment = createThreeTestEnvironment([], { sceneState: { valve1: 5 } });
    renderWithThreeEnvironment(
      <BindingProbe
        bindings={[valueBinding('${sceneState.valve1}')]}
        engine={fake.engine}
        transform={(_binding, value) => (typeof value === 'number' ? value * 2 : value)}
      />,
      environment,
    );
    await flushMicrotasks();
    expect(fake.latestQueue().drain()).toEqual([
      { modelId: 'valve', path: 'position', value: 10 },
    ]);
  });

  it('reports flux-compile-failed once when compilation throws', async () => {
    const fake = makeFakeEngine();
    const onError = vi.fn();
    const environment = createThreeTestEnvironment([], { sceneState: { valve1: 5 } });
    const compileSpy = vi
      .spyOn(environment.expressionCompiler, 'compileValue')
      .mockImplementation(() => {
        throw new Error('bad syntax');
      });
    const bindings = [valueBinding('${sceneState.valve1}')];
    renderWithThreeEnvironment(
      <BindingProbe bindings={bindings} engine={fake.engine} onError={onError} />,
      environment,
    );
    await act(async () => {
      environment.scope.update('sceneState.valve1', 6);
      await flushMicrotasks();
    });
    expect(onError.mock.calls.filter(([code]) => code === 'flux-compile-failed')).toHaveLength(1);
    compileSpy.mockRestore();
  });

  it('re-registers the queue on engine instance replacement without leaking stale pending', async () => {
    const fakeA = makeFakeEngine();
    const fakeB = makeFakeEngine();
    const { rerender } = renderBridge([valueBinding('${sceneState.valve1}')], fakeA.engine);
    await flushMicrotasks();
    expect(fakeA.latestQueue().drain()).toHaveLength(1);
    rerender(fakeB.engine);
    await flushMicrotasks();
    expect(fakeB.latestQueue).toBeDefined();
    expect(fakeB.latestQueue().drain()).toEqual([]);
  });
});
