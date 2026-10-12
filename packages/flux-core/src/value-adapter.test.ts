import { describe, expect, it, vi } from 'vitest';
import {
  actionAdapter,
  booleanStringAdapter,
  createActionBackedAdapter,
  identityAdapter,
  nullableAdapter,
  stringAdapter,
  type ActionSchema,
  type ActionContext,
  type AdapterActionContext,
  type CompiledActionProgram,
  type FormRuntime,
  type ScopeRef,
  type ValueAdaptationAction,
} from './index.js';

const scope = {
  id: 'scope:test',
  path: '$',
  value: {},
  get: () => undefined,
  has: () => false,
  readOwn: () => ({}),
  readVisible: () => ({}),
  materializeVisible: () => ({}),
  update: () => undefined,
  merge: () => undefined,
} satisfies ScopeRef;

const form = { id: 'form:test' } as unknown as FormRuntime;

describe('value-adapter', () => {
  it('provides focused sync adapters for identity, string, boolean, and nullable values', async () => {
    expect(identityAdapter<number>().in(2, { readOnly: false })).toBe(2);
    expect(stringAdapter().in(null, { readOnly: false })).toBe('');
    expect(stringAdapter().out('alpha', { readOnly: false })).toBe('alpha');
    expect(booleanStringAdapter().in('false', { readOnly: false })).toBe(false);
    expect(booleanStringAdapter().in('true', { readOnly: false })).toBe(true);
    expect(booleanStringAdapter().in(0, { readOnly: false })).toBe(false);
    expect(booleanStringAdapter().in(1, { readOnly: false })).toBe(true);
    expect(booleanStringAdapter().out(0 as unknown as boolean, { readOnly: false })).toBe(false);
    expect(
      await nullableAdapter(stringAdapter()).in(undefined, { readOnly: false }),
    ).toBeUndefined();
    expect(await nullableAdapter(stringAdapter()).in('42', { readOnly: false })).toBe('42');
  });

  it('injects default action payloads when args are omitted', async () => {
    const dispatch = vi.fn(async (_action: ActionSchema | ActionSchema[]) => ({
      ok: true,
      data: 'draft',
    }));
    const adapter = actionAdapter(
      { action: 'demo:in' },
      { action: 'demo:out' },
      { action: 'demo:validate' },
      dispatch,
    );

    await adapter.in('raw', { name: 'profile', readOnly: true, scope, form: null });
    await adapter.out('working', {
      name: 'profile',
      readOnly: true,
      originalValue: 'raw',
      scope,
      form: null,
    });
    await adapter.validate?.('working', {
      name: 'profile',
      readOnly: true,
      originalValue: 'raw',
      scope,
      form: null,
    });

    expect(dispatch.mock.calls[0]?.[0]).toEqual({
      action: 'demo:in',
      args: { value: 'raw', name: 'profile', readOnly: true },
    });
    expect(dispatch.mock.calls[1]?.[0]).toEqual({
      action: 'demo:out',
      args: { value: 'working', originalValue: 'raw', name: 'profile', readOnly: true },
    });
    expect(dispatch.mock.calls[2]?.[0]).toEqual({
      action: 'demo:validate',
      args: { value: 'working', originalValue: 'raw', name: 'profile' },
    });
  });

  it('keeps explicit args replace semantics instead of merging defaults', async () => {
    const dispatch = vi.fn(async (_action: ActionSchema | ActionSchema[]) => ({
      ok: true,
      data: 'draft',
    }));
    const adapter = actionAdapter(
      { action: 'demo:in', args: { mode: 'explicit' } },
      { action: 'demo:out', args: { mode: 'explicit' } },
      { action: 'demo:validate', args: { mode: 'explicit' } },
      dispatch,
    );

    await adapter.in('raw', { name: 'profile', readOnly: false, scope, form: null });
    await adapter.out('working', {
      name: 'profile',
      readOnly: false,
      originalValue: 'raw',
      scope,
      form: null,
    });
    await adapter.validate?.('working', {
      name: 'profile',
      readOnly: false,
      originalValue: 'raw',
      scope,
      form: null,
    });

    expect(dispatch.mock.calls[0]?.[0]).toEqual({ action: 'demo:in', args: { mode: 'explicit' } });
    expect(dispatch.mock.calls[1]?.[0]).toEqual({ action: 'demo:out', args: { mode: 'explicit' } });
    expect(dispatch.mock.calls[2]?.[0]).toEqual({
      action: 'demo:validate',
      args: { mode: 'explicit' },
    });
  });

  it('surfaces honest errors when transform actions fail', async () => {
    const dispatch = vi.fn(async () => ({
      ok: false,
      error: 'boom',
    }));
    const adapter = actionAdapter(
      { action: 'demo:in' },
      { action: 'demo:out' },
      { action: 'demo:validate' },
      dispatch,
    );

    await expect(
      adapter.in('raw', { name: 'profile', readOnly: false, scope, form: null }),
    ).rejects.toThrow('[flux] transformIn failed: boom');
    await expect(
      adapter.out('working', {
        name: 'profile',
        readOnly: false,
        originalValue: 'raw',
        scope,
        form: null,
      }),
    ).rejects.toThrow('[flux] transformOut failed: boom');
    await expect(
      adapter.validate?.('working', {
        name: 'profile',
        readOnly: false,
        originalValue: 'raw',
        scope,
        form: null,
      }),
    ).resolves.toEqual({
      valid: false,
      issues: [{ level: 'error', message: 'boom', cause: 'boom' }],
    });
  });

  it('keeps the original ActionResult as the transform failure cause', async () => {
    const failedResult = {
      ok: false,
      data: { attempts: 2, providerKind: 'import' },
      error: 'boom',
    };
    const dispatch = vi.fn(async () => failedResult as any);
    const adapter = actionAdapter({ action: 'demo:in' }, { action: 'demo:out' }, undefined, dispatch);

    await expect(
      adapter.in('raw', { name: 'profile', readOnly: false, scope, form: null }),
    ).rejects.toMatchObject({
      message: '[flux] transformIn failed: boom',
      cause: failedResult,
    });
  });

  it('parses validation result shapes from action data', async () => {
    const dispatch = vi.fn(async () => ({
      ok: true,
      data: {
        valid: false,
        issues: [{ level: 'warning', message: 'check value', path: 'value.amount' }],
      },
    }));
    const adapter = actionAdapter(undefined, undefined, { action: 'demo:validate' }, dispatch);

    await expect(
      adapter.validate?.({ amount: 1 }, { readOnly: false, scope, form: null }),
    ).resolves.toEqual({
      valid: false,
      issues: [{ level: 'warning', message: 'check value', path: 'value.amount' }],
    });
  });

  it('forwards ctx to dispatch as {scope, form} from validate', async () => {
    const dispatch = vi.fn(
      async (_action: ActionSchema | ActionSchema[], _ctx?: Partial<ActionContext>) => ({
        ok: true,
      }),
    );
    const adapter = actionAdapter(undefined, undefined, { action: 'demo:validate' }, dispatch);

    await adapter.validate?.('working', {
      name: 'profile',
      readOnly: false,
      originalValue: 'seed',
      scope,
      form,
    });

    expect(dispatch.mock.calls[0]?.[1]).toEqual({ scope, form });
    expect(dispatch.mock.calls[0]?.[1]?.scope).toBe(scope);
    expect(dispatch.mock.calls[0]?.[1]?.form).toBe(form);
  });
});

describe('action-backed adapter composition (CX-1 pinned behavior)', () => {
  function compiledProgram(action: string): CompiledActionProgram {
    return {
      nodes: [
        {
          action,
          payload: {},
          targeting: {},
          control: {},
          source: { action },
        },
      ],
      isFullyStatic: false,
    };
  }

  const adapterCtx: AdapterActionContext = {
    name: 'profile',
    readOnly: false,
    originalValue: 'seed',
    scope,
    form,
  };

  it('clones payload args into compiled program nodes and forwards ctx for in', async () => {
    const inputProgram = compiledProgram('demo:in');
    const runner = vi.fn(
      async (action: ValueAdaptationAction, ctx?: AdapterActionContext) => ({
        ok: true as const,
        data: `transformed:${ctx?.name}`,
      }),
    );
    const adapter = createActionBackedAdapter({
      transformInAction: inputProgram,
      runner,
    });

    await expect(adapter.in('raw', adapterCtx)).resolves.toBe('transformed:profile');

    const received = runner.mock.calls[0]?.[0] as CompiledActionProgram;
    expect(received).not.toBe(inputProgram);
    expect(received.nodes[0]?.source.args).toEqual({
      value: 'raw',
      readOnly: false,
      name: 'profile',
    });
    expect(received.nodes[0]?.payload.args).toMatchObject({
      isStatic: true,
      value: { value: 'raw', readOnly: false, name: 'profile' },
    });
    expect(runner.mock.calls[0]?.[1]).toBe(adapterCtx);
  });

  it('forwards ctx to the runner for out', async () => {
    const runner = vi.fn(
      async (_action: ValueAdaptationAction, _ctx?: AdapterActionContext) => ({
        ok: true as const,
        data: 'draft',
      }),
    );
    const adapter = createActionBackedAdapter({
      transformOutAction: compiledProgram('demo:out'),
      runner,
    });

    await expect(adapter.out('working', adapterCtx)).resolves.toBe('draft');
    expect(runner.mock.calls[0]?.[1]).toBe(adapterCtx);
  });

  it('does not forward ctx to the runner from validate (m3 drift pinned)', async () => {
    const runner = vi.fn(
      async (_action: ValueAdaptationAction, _ctx?: AdapterActionContext) => ({
        ok: true as const,
        data: { valid: true },
      }),
    );
    const adapter = createActionBackedAdapter({
      validateAction: compiledProgram('demo:validate'),
      runner,
    });

    await expect(adapter.validate?.('working', adapterCtx)).resolves.toEqual({ valid: true });

    const received = runner.mock.calls[0]?.[0] as CompiledActionProgram;
    expect(received.nodes[0]?.source.args).toEqual({
      value: 'working',
      originalValue: 'seed',
      name: 'profile',
    });
    expect(runner.mock.calls[0]?.[1]).toBeUndefined();
  });

  it('formats validate failures with the injected toValidationIssues on the compiled-program path', async () => {
    const formatIssues = vi.fn(
      (error: unknown) =>
        [
          {
            level: 'error' as const,
            message: `localized:${String(error)}`,
          },
        ],
    );
    const failing = vi.fn(async () => ({ ok: false as const, error: 'boom' }));
    const adapter = createActionBackedAdapter({
      validateAction: compiledProgram('demo:validate'),
      runner: failing,
      toValidationIssues: formatIssues,
    });

    await expect(adapter.validate?.('working', adapterCtx)).resolves.toEqual({
      valid: false,
      issues: [{ level: 'error', message: 'localized:boom' }],
    });
    expect(formatIssues).toHaveBeenCalledWith('boom');
  });

  it('keeps the core formatter on the plain-schema fallthrough even when a formatter is injected (m3 drift pinned)', async () => {
    const formatIssues = vi.fn(
      (error: unknown) => [{ level: 'error' as const, message: `localized:${String(error)}` }],
    );
    const failing = vi.fn(async () => ({ ok: false as const, error: 'boom' }));
    const adapter = createActionBackedAdapter({
      validateAction: { action: 'demo:validate' },
      runner: failing,
      toValidationIssues: formatIssues,
    });

    await expect(adapter.validate?.('working', adapterCtx)).resolves.toEqual({
      valid: false,
      issues: [{ level: 'error', message: 'boom', cause: 'boom' }],
    });
    expect(formatIssues).not.toHaveBeenCalled();
  });

  it('parses valid:false result shapes from compiled-program validate data', async () => {
    const runner = vi.fn(async () => ({
      ok: true as const,
      data: {
        valid: false,
        issues: [{ level: 'warning' as const, message: 'check value', path: 'value.amount' }],
      },
    }));
    const adapter = createActionBackedAdapter({
      validateAction: compiledProgram('demo:validate'),
      runner,
    });

    await expect(adapter.validate?.('working', adapterCtx)).resolves.toEqual({
      valid: false,
      issues: [{ level: 'warning', message: 'check value', path: 'value.amount' }],
    });
  });
});
