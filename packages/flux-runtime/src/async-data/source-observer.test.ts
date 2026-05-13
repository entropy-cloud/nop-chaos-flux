import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { env, textRenderer } from '../__tests__/test-fixtures.js';
import { createSourceObserver } from './source-observer.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('createSourceObserver', () => {
  it('resolves all entries and publishes values', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const observer = createSourceObserver(runtime);

    observer.run({
      scope: page.scope,
      entries: [
        { key: 'a', source: { formula: '${1 + 1}' } as never },
        { key: 'b', source: { formula: '${2 + 2}' } as never },
      ],
    });

    await vi.waitFor(() => {
      expect(observer.getSnapshot().value.a).toBe(2);
      expect(observer.getSnapshot().value.b).toBe(4);
    });

    observer.dispose();
  });

  it('aborts previous run when a new run starts', async () => {
    let firstResolve: ((value: unknown) => void) | undefined;
    let secondResolve: ((value: unknown) => void) | undefined;
    let callCount = 0;
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>() => {
          callCount += 1;
          return new Promise((resolve) => {
            if (callCount === 1) {
              firstResolve = resolve;
            } else {
              secondResolve = resolve;
            }
          }).then(() => ({ ok: true, status: 200, data: { run: callCount } as T }));
        },
      } as RendererEnv,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});
    const observer = createSourceObserver(runtime);

    observer.run({
      scope: page.scope,
      entries: [{ key: 'data', source: { action: 'ajax', args: { url: '/api/first' } } as never }],
    });

    await vi.waitFor(() => expect(callCount).toBe(1));

    observer.run({
      scope: page.scope,
      entries: [{ key: 'data', source: { action: 'ajax', args: { url: '/api/second' } } as never }],
    });

    await vi.waitFor(() => expect(callCount).toBe(2));

    secondResolve?.(undefined);

    await vi.waitFor(() => {
      expect(observer.getSnapshot().value.data).toEqual({ run: 2 });
    });

    firstResolve?.(undefined);
    await Promise.resolve();
    await Promise.resolve();

    expect(observer.getSnapshot().value.data).toEqual({ run: 2 });

    observer.dispose();
  });
});
