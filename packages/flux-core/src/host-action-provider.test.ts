import { describe, expect, it, vi } from 'vitest';
import { createHostActionProvider, createHostMethodValidator, toHostActionError } from './host-action-provider.js';
import type { ActionResult } from './types/actions.js';

interface FakeCommand extends Record<string, unknown> {
  type: string;
}

interface FakeResult {
  ok: boolean;
  changed: boolean;
  cancelled?: boolean;
  error?: unknown;
  data?: unknown;
}

function toActionResult(result: FakeResult): ActionResult {
  return {
    ok: result.ok,
    data: result.data,
    error: toHostActionError(result.error, 'Fake command failed'),
    cancelled: result.cancelled,
  };
}

describe('toHostActionError', () => {
  it('passes Errors through, converts strings, and undefined for null', () => {
    const err = new Error('boom');
    expect(toHostActionError(err, 'fallback')).toBe(err);
    expect(toHostActionError('str', 'fallback')?.message).toBe('str');
    expect(toHostActionError(null, 'fallback')).toBeUndefined();
  });

  it('maps object message/code and falls back, attaching cause', () => {
    expect(toHostActionError({ message: 'm' }, 'fallback')?.message).toBe('m');
    expect(toHostActionError({ code: 'E1' }, 'fallback')?.message).toBe('E1');
    const result = toHostActionError({ other: 1 }, 'fallback');
    expect(result?.message).toBe('fallback');
    expect(result?.cause).toEqual({ other: 1 });
    expect(toHostActionError(42, 'fallback')?.message).toBe('42');
  });
});

describe('createHostActionProvider', () => {
  // `save` declares no `args` → accepts only an undefined payload
  // (validateHostMethodPayload semantics exercised end-to-end).
  const contracts = { save: {} } as never;
  const methods = ['save', 'noContract'] as const;

  it('validates payloads against the contract table and dispatches `namespace:method`', async () => {
    const dispatch = vi.fn(async () => ({ ok: true, changed: true, data: 7 }) as FakeResult);
    const provider = createHostActionProvider<FakeCommand, FakeResult>({
      namespace: 'fake',
      methods,
      contracts,
      dispatch,
      toActionResult,
    });
    expect(provider.kind).toBe('host');
    expect(provider.listMethods?.()).toEqual(methods);
    const result = await provider.invoke!('save', undefined, {} as never);
    expect(dispatch).toHaveBeenCalledWith({ type: 'fake:save' });
    expect(result).toEqual({ ok: true, data: 7, error: undefined, cancelled: undefined });
  });

  it('returns the validation error without dispatching for invalid payloads', async () => {
    const dispatch = vi.fn();
    const provider = createHostActionProvider<FakeCommand, FakeResult>({
      namespace: 'fake',
      methods,
      contracts,
      dispatch,
      toActionResult,
    });
    const result = await provider.invoke!('save', { id: 1 }, {} as never);
    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toContain('does not accept a payload');
    expect(dispatch).not.toHaveBeenCalled();
    const unknown = await provider.invoke!('noContract', undefined, {} as never);
    expect((unknown.error as Error).message).toContain('not a published host method');
  });

  it('normalizes thrown dispatch errors with fallback message, cause, and the observation hook', async () => {
    const onInvokeError = vi.fn();
    const provider = createHostActionProvider<FakeCommand, FakeResult>({
      namespace: 'fake',
      methods,
      contracts,
      dispatch: async () => {
        throw { code: 'E_FAIL' };
      },
      toActionResult,
      fallbackErrorMessage: 'Fake command failed',
      onInvokeError,
    });
    const result = await provider.invoke!('save', undefined, {} as never);
    expect(result.ok).toBe(false);
    expect((result.error as Error).message).toBe('E_FAIL');
    expect(result.cause).toEqual({ code: 'E_FAIL' });
    expect(onInvokeError).toHaveBeenCalledWith('save', { code: 'E_FAIL' });
  });
});

describe('createHostMethodValidator', () => {
  it('binds namespace+contracts into a reusable validate helper', () => {
    const validate = createHostMethodValidator('fake', { save: {} } as never);
    expect(validate('save', undefined)).toEqual({ ok: true, args: {} });
    const invalid = validate('save', { id: 1 });
    expect(invalid.ok).toBe(false);
    expect((invalid as { error: Error }).error.message).toContain('does not accept a payload');
    const unknownMethod = validate('other', undefined);
    expect((unknownMethod as { error: Error }).error.message).toContain('not a published host method');
  });
});
