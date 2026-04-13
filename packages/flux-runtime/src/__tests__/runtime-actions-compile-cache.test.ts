import { describe, expect, it, vi } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createActionScope,
  createRendererRegistry,
  createRendererRuntime
} from '../index';
import { textRenderer, env } from './test-fixtures';

describe('createRendererRuntime', () => {
  it('reuses compiled action payload/api objects across repeated dispatches', async () => {
    const customCompiler = createExpressionCompiler(createFormulaCompiler());
    const originalCompileValue = customCompiler.compileValue.bind(customCompiler);
    customCompiler.compileValue = ((input: unknown) => {
      return originalCompileValue(input);
    }) as typeof customCompiler.compileValue;
    const compileValueSpy = vi.spyOn(customCompiler, 'compileValue');

    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { ok: true } });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: customCompiler
    });
    const page = runtime.createPageRuntime({ baseX: 10, token: 'cached' });
    const actionScope = createActionScope({ id: 'cached-action-scope' });
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke
    });

    const action = {
      action: 'designer:addNode',
      args: {
        nodeType: 'task',
        position: {
          x: '${baseX}',
          y: 20
        }
      }
    } as any;

    const ajaxAction = {
      action: 'ajax',
      api: {
        url: '/api/items/${baseX}',
        params: {
          token: '${token}'
        }
      }
    } as any;

    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });
    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });
    await runtime.dispatch(ajaxAction, {
      runtime,
      scope: page.scope,
      page
    });
    await runtime.dispatch(ajaxAction, {
      runtime,
      scope: page.scope,
      page
    });

    const compiledArgsCount = compileValueSpy.mock.calls.filter(([input]) => input === action.args).length;
    const compiledApiCount = compileValueSpy.mock.calls.filter(([input]) => input === ajaxAction.api).length;

    expect(compiledArgsCount).toBe(1);
    expect(compiledApiCount).toBe(1);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('supports top-level action payload compatibility with cached extraction', async () => {
    const customCompiler = createExpressionCompiler(createFormulaCompiler());
    const originalCompileValue = customCompiler.compileValue.bind(customCompiler);
    customCompiler.compileValue = ((input: unknown) => {
      return originalCompileValue(input);
    }) as typeof customCompiler.compileValue;
    const compileValueSpy = vi.spyOn(customCompiler, 'compileValue');

    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { ok: true } });
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env,
      expressionCompiler: customCompiler
    });
    const page = runtime.createPageRuntime({ baseX: 10 });
    const actionScope = createActionScope({ id: 'top-level-action-scope' });
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke
    });

    const action = {
      action: 'designer:addNode',
      nodeType: 'task',
      position: {
        x: '${baseX}',
        y: 20
      }
    } as any;

    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });
    await runtime.dispatch(action, {
      runtime,
      scope: page.scope,
      page,
      actionScope
    });

    const compiledTopLevelPayloadCount = compileValueSpy.mock.calls.filter(
      ([input]) => input !== action && !!input && typeof input === 'object' && (input as any).nodeType === 'task'
    ).length;

    expect(compiledTopLevelPayloadCount).toBe(1);
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
