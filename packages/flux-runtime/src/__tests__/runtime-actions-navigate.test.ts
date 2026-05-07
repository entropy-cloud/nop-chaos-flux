import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

function createEnvWithNavigate(navigate: RendererEnv['navigate']): RendererEnv {
  return { ...env, navigate };
}

describe('navigate action', () => {
  it('calls env.navigate with url from args', async () => {
    const navigate = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: createEnvWithNavigate(navigate),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      { action: 'navigate', args: { url: '/report-designer' } },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/report-designer', undefined);
  });

  it('calls env.navigate with replace option', async () => {
    const navigate = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: createEnvWithNavigate(navigate),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      { action: 'navigate', args: { url: '/flux-basic', replace: true } },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/flux-basic', { replace: true });
  });

  it('calls env.navigate(-1) for go back', async () => {
    const navigate = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: createEnvWithNavigate(navigate),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      { action: 'navigate', args: { back: true } },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(true);
    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it('returns error when env.navigate is not configured', async () => {
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      { action: 'navigate', args: { url: '/some-page' } },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain('env.navigate');
  });

  it('returns error when neither url nor back is provided', async () => {
    const navigate = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: createEnvWithNavigate(navigate),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({});

    const result = await runtime.dispatch(
      { action: 'navigate', args: {} },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toContain('args.url or args.back');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('evaluates url expression from scope', async () => {
    const navigate = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: createEnvWithNavigate(navigate),
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ targetPath: '/dynamic-page' });

    const result = await runtime.dispatch(
      { action: 'navigate', args: { url: '${targetPath}' } },
      { runtime, scope: page.scope, page },
    );

    expect(result.ok).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/dynamic-page', undefined);
  });
});
