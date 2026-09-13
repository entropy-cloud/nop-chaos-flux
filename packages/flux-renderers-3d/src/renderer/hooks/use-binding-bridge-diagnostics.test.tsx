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
} from '../../test-support/renderer-test-support.js';

// 仅本文件：让 analyze 产出 deps-empty 嫌疑（hook 经模块导出表引用，可拦截；
// 分析期诊断定界验证，design-data-binding §3#6）
vi.mock('../../binding/flux-eval.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  analyzeBindingSubscriptions: () => ({
    paths: [] as string[],
    depsEmptyExpressions: ['${some.complex(x)}'],
  }),
}));

function makeFakeEngine() {
  const queues: Array<{ drain: () => Array<{ modelId: string; path: string; value: unknown }> }> = [];
  const engine = {
    setFrameUpdateQueue: vi.fn(
      (queue: { drain: () => Array<{ modelId: string; path: string; value: unknown }> }) => {
        queues.push(queue);
      },
    ),
  } as unknown as SceneManager;
  return { engine, latestQueue: () => queues[queues.length - 1] };
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

const valueBinding = (expression: string): DataBinding => ({
  id: `binding-${expression}`,
  target: { modelId: 'valve', path: 'position', type: 'position' },
  source: { expression },
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useBindingBridge diagnostics and seams (module-mocked probe)', () => {
  it('reports flux-deps-empty at analyze stage even when subscription stays disabled', async () => {
    const onError = vi.fn();
    const fake = makeFakeEngine();
    const environment = createThreeTestEnvironment([], {});
    renderWithThreeEnvironment(
      <BindingProbe
        bindings={[valueBinding('${some.complex(x)}')]}
        engine={fake.engine}
        onError={onError}
      />,
      environment,
    );
    await flushMicrotasks();
    const depsEmpty = onError.mock.calls.filter(([code]) => code === 'flux-deps-empty');
    expect(depsEmpty).toHaveLength(1);
  });

  it('deps-empty report is not duplicated across re-renders', async () => {
    const onError = vi.fn();
    const fake = makeFakeEngine();
    const environment = createThreeTestEnvironment([], {});
    const utils = renderWithThreeEnvironment(
      <BindingProbe
        bindings={[valueBinding('${some.complex(x)}')]}
        engine={fake.engine}
        onError={onError}
      />,
      environment,
    );
    await flushMicrotasks();
    utils.rerender(
      <ThreeTestProviders environment={environment}>
        <BindingProbe
          bindings={[valueBinding('${some.complex(x)}')]}
          engine={fake.engine}
          onError={onError}
        />
      </ThreeTestProviders>,
    );
    await flushMicrotasks();
    expect(onError.mock.calls.filter(([code]) => code === 'flux-deps-empty')).toHaveLength(1);
  });
});
