import { describe, expect, it, vi } from 'vitest';
import { createRendererRegistry } from '@nop-chaos/flux-core';
import { compileDataSource } from '@nop-chaos/flux-compiler';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('runtime sources — unpublished scope recovery', () => {
  // Mount-order regression: a formula data-source that references an
  // unpublished upstream variable must stay pending (dependencies armed) and
  // recompute when the upstream value is published — not latch into an error
  // with a dead subscription.
  it('recovers a formula source whose first evaluation hits an unpublished scope variable', async () => {
    const notify = vi.fn();
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: { ...env, notify },
      expressionCompiler,
    });
    // NOTE: `rawData` deliberately absent at creation (pre-publication mount state).
    const page = runtime.createPageRuntime({});

    const registration = runtime.registerDataSource({
      id: 'timeline-items',
      scope: page.scope,
      compiledSource: compileDataSource(
        'timeline-items',
        {
          type: 'data-source',
          name: 'timelineItems',
          formula: '${(rawData.items ?? []).map(a => a)}',
        },
        expressionCompiler,
      ),
    });

    await vi.waitFor(
      () => {
        // The source must NOT have published an error state via env.notify.
        expect(notify).not.toHaveBeenCalledWith('error', expect.anything());
      },
      { timeout: 2_000 },
    );

    // Simulate the upstream ajax data source publishing rawData.
    page.scope.update('rawData', { items: ['a', 'b'] });

    await vi.waitFor(
      () => {
        expect(page.scope.get('timelineItems')).toEqual(['a', 'b']);
      },
      { timeout: 2_000 },
    );

    registration.dispose();
  });
});
