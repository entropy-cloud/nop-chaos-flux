import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createActionScope, createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

describe('createRendererRuntime', () => {
  it('passes namespaced action args through the compiled payload path', async () => {
    const registry = createRendererRegistry([textRenderer]);
    const runtime = createRendererRuntime({
      registry,
      env,
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ baseX: 160 });
    const actionScope = createActionScope({ id: 'designer-scope' });
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { id: 'node-1' } });
    actionScope.registerNamespace('designer', {
      kind: 'host',
      invoke,
    });

    const result = await runtime.dispatch(
      {
        action: 'designer:addNode',
        args: {
          nodeType: 'task',
          position: {
            x: '${baseX}',
            y: 120,
          },
        },
      } as any,
      {
        runtime,
        scope: page.scope,
        page,
        actionScope,
      },
    );

    expect(result).toMatchObject({ ok: true, data: { id: 'node-1' } });
    expect(invoke).toHaveBeenCalledWith(
      'addNode',
      {
        nodeType: 'task',
        position: {
          x: 160,
          y: 120,
        },
      },
      expect.objectContaining({ actionScope }),
    );
  });
});
