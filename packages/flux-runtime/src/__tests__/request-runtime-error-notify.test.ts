import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env as baseEnv } from './test-fixtures.js';

describe('ajax action 4xx error -> notify contract (A2)', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

  it('translates a 4xx into exactly one env.notify that carries the amis-style backend msg', async () => {
    const notify = vi.fn();
    const fetcher = vi.fn(async () => ({
      ok: false,
      status: 400,
      data: { msg: 'Email already registered' },
    }));

    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...baseEnv, fetcher, notify } as unknown as RendererEnv,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      { action: 'ajax', args: { url: '/api/register', method: 'post' } },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(false);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('error', 'Email already registered');
  });

  it('prefers data.message but falls back to data.msg when message is absent', async () => {
    const notify = vi.fn();
    const fetcher = vi.fn(async () => ({
      ok: false,
      status: 400,
      data: { msg: 'fallback backend msg', message: 'primary backend message' },
    }));

    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...baseEnv, fetcher, notify } as unknown as RendererEnv,
      expressionCompiler,
    });
    const page = runtime.createPageRuntime({});

    await runtime.dispatch(
      { action: 'ajax', args: { url: '/api/register', method: 'post' } },
      { runtime, scope: page.scope, page },
    );

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('error', 'primary backend message');
  });
});
