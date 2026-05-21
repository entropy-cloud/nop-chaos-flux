import { describe, expect, it, vi } from 'vitest';
import {
  actionAdapter,
  booleanStringAdapter,
  identityAdapter,
  nullableAdapter,
  stringAdapter,
  type ActionSchema,
  type ScopeRef,
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
      issues: [{ level: 'error', message: 'boom' }],
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
});
