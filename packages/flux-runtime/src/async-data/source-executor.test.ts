import { describe, expect, it, vi } from 'vitest';
import type { ActionContext, ActionSchema, RendererRuntime, ScopeRef, SourceSchema } from '@nop-chaos/flux-core';
import { createSourceExecutor } from './source-executor.js';

/**
 * CX-13 (plan 591) Phase 1 characterization pins — source-executor scope
 * passing, three shapes (plan Failure Paths):
 *   1. ctx explicit scope      → ctx scope wins (pre/post identical)
 *   2. ctx without scope key   → resolved scope (pre/post identical)
 *   3. ctx explicit undefined  → resolved scope (C1 contract hardening; the
 *      pre-C1 spread `{ ...ctx }` after `scope` lets an explicit-undefined
 *      `ctx.scope` clobber the resolved scope — the "undefined hole" red leg)
 *
 * Pin 3 is written against the POST-C1 contract: red on the un-fixed
 * baseline, green after C1 (`scope: ctx?.scope ?? scope`).
 */

function makeScope(id: string): ScopeRef {
  return { id, path: id } as unknown as ScopeRef;
}

function makeHarness() {
  const captured: ActionContext[] = [];
  const executeAction = vi.fn(async (_action: ActionSchema, ctx: ActionContext) => {
    captured.push(ctx);
    return { ok: true, data: 'done' };
  });
  const evaluate = vi.fn(() => 'formula-value');
  const runtime = { evaluate } as unknown as RendererRuntime;
  const executeSource = createSourceExecutor({ runtime, executeAction });
  return { executeSource, captured, executeAction, runtime, evaluate };
}

const actionSource = {
  type: 'source',
  action: 'ajax',
  args: { url: '/api/items' },
} as SourceSchema;

describe('source-executor scope passing (CX-13 pins)', () => {
  it('shape 1: ctx explicit scope wins over the resolved scope', async () => {
    const { executeSource, captured } = makeHarness();
    const resolved = makeScope('resolved');
    const explicit = makeScope('explicit');

    await executeSource(actionSource, resolved, { scope: explicit });

    expect(captured).toHaveLength(1);
    expect(captured[0].scope).toBe(explicit);
  });

  it('shape 2: ctx without a scope key uses the resolved scope', async () => {
    const { executeSource, captured } = makeHarness();
    const resolved = makeScope('resolved');

    await executeSource(actionSource, resolved, {});

    expect(captured).toHaveLength(1);
    expect(captured[0].scope).toBe(resolved);
  });

  it('shape 3 (C1 red leg): ctx explicit undefined scope falls back to the resolved scope', async () => {
    const { executeSource, captured } = makeHarness();
    const resolved = makeScope('resolved');

    await executeSource(actionSource, resolved, { scope: undefined });

    expect(captured).toHaveLength(1);
    expect(captured[0].scope).toBe(resolved);
  });

  it('non-scope ctx keys pass through alongside the resolved scope', async () => {
    const { executeSource, captured } = makeHarness();
    const resolved = makeScope('resolved');
    const controller = new AbortController();

    await executeSource(actionSource, resolved, { signal: controller.signal });

    expect(captured).toHaveLength(1);
    expect(captured[0].scope).toBe(resolved);
    expect(captured[0].signal).toBe(controller.signal);
  });

  it('runtime remains the executor runtime on the merged ctx', async () => {
    const { executeSource, captured, runtime } = makeHarness();
    const resolved = makeScope('resolved');

    await executeSource(actionSource, resolved, { scope: makeScope('explicit') });

    expect(captured[0].runtime).toBe(runtime);
  });

  it('formula path evaluates against the scope parameter (ctx-independent)', async () => {
    const { executeSource, executeAction, evaluate } = makeHarness();
    const resolved = makeScope('resolved');

    const result = await executeSource(
      { type: 'source', formula: '${1 + 1}' } as SourceSchema,
      resolved,
      { scope: makeScope('explicit') },
    );

    expect(result).toEqual({ ok: true, data: 'formula-value' });
    expect(evaluate).toHaveBeenCalledWith('${1 + 1}', resolved);
    expect(executeAction).not.toHaveBeenCalled();
  });
});
