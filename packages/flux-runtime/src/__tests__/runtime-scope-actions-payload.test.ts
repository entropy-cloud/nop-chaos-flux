import { describe, expect, it, vi } from 'vitest';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import {
  createActionScope,
  createRendererRegistry,
  createRendererRuntime
} from '../index';
import { textRenderer, env } from './test-fixtures';

describe('createRendererRuntime', () => {
  it('passes namespaced action args through the compiled payload path', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler())
    });
    const page = runtime.createPageRuntime({ baseX: 160 });
    const actionScope = createActionScope({ id: 'designer-scope' });
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { id: 'node-1' } });
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke
    });

    const result = await runtime.dispatch(
      {
        action: 'designer:addNode',
        args: {
          nodeType: 'task',
          position: {
            x: '${baseX}',
            y: 120
          }
        }
      } as any,
      {
        runtime,
        scope: page.scope,
        page,
        actionScope
      }
    );

    expect(result).toMatchObject({ ok: true, data: { id: 'node-1' } });
    expect(invoke).toHaveBeenCalledWith(
      'addNode',
      {
        nodeType: 'task',
        position: {
          x: 160,
          y: 120
        }
      },
      expect.objectContaining({ actionScope })
    );
  });
});
