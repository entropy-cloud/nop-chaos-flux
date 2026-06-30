import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createScopeRef, createScopeStore } from '../scope.js';
import { executeApiSchema } from '../async-data/request-runtime.js';

function createTestScope(data: Record<string, unknown>): ScopeRef {
  return createScopeRef({
    id: 'test-scope',
    path: 'test',
    store: createScopeStore(data),
  });
}

describe('executeApiSchema responseAdaptor on non-OK responses (A1)', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

  it('runs responseAdaptor on a 4xx response and surfaces the mapped message on the thrown error', async () => {
    const scope = createTestScope({});
    const env = {
      fetcher: vi.fn(async () => ({
        ok: false,
        status: 400,
        data: { errors: [{ field: 'email', code: 'invalid_email' }] },
      })),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    const error = await executeApiSchema(
      {
        url: '/api/save',
        method: 'post',
        responseAdaptor: 'return { message: "Email is invalid" }',
      },
      scope,
      env,
      expressionCompiler,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Email is invalid');
    expect((error as { status?: number }).status).toBe(400);
  });

  it('lets responseAdaptor read the non-OK payload and lexical scope to normalize the backend message', async () => {
    const scope = createTestScope({ fieldName: 'username' });
    const env = {
      fetcher: vi.fn(async () => ({
        ok: false,
        status: 422,
        data: { error_code: 'TAKEN', field: 'username' },
      })),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    const error = await executeApiSchema(
      {
        url: '/api/check',
        method: 'post',
        responseAdaptor:
          'return { message: payload.field + " " + payload.error_code + " (scope=" + scope.fieldName + ")" }',
      },
      scope,
      env,
      expressionCompiler,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('username TAKEN (scope=username)');
    expect((error as { status?: number }).status).toBe(422);
  });

  it('does not recover a non-OK response into success even when responseAdaptor runs', async () => {
    const scope = createTestScope({});
    const env = {
      fetcher: vi.fn(async () => ({
        ok: false,
        status: 401,
        data: { reason: 'unauthorized' },
      })),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    await expect(
      executeApiSchema(
        {
          url: '/api/me',
          method: 'get',
          responseAdaptor: 'return { message: "Token expired" }',
        },
        scope,
        env,
        expressionCompiler,
      ),
    ).rejects.toBeInstanceOf(Error);
  });
});

describe('executeApiSchema responseAdaptor that throws on an error-shaped payload (F3)', () => {
  const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

  it('surfaces the backend msg instead of the raw adaptor exception when the adaptor throws on a non-OK payload', async () => {
    const scope = createTestScope({});
    const env = {
      fetcher: vi.fn(async () => ({
        ok: false,
        status: 400,
        // Error-shaped payload. A success-only adaptor written assuming
        // `payload.data.items` throws here because `payload.data` is undefined.
        data: { msg: 'backend boom' },
      })),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    const error = await executeApiSchema(
      {
        url: '/api/list',
        method: 'get',
        // Non-optional member access of undefined throws in the formula engine
        // (see flux-formula contract-boundary: "Cannot access member of null or undefined").
        responseAdaptor: 'return { ...payload, data: payload.data.items }',
      },
      scope,
      env,
      expressionCompiler,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    // Backend message must surface (via readResponseErrorMessage's `msg` branch),
    // not the adaptor's "Cannot access member" failure.
    expect((error as Error).message).toBe('backend boom');
    expect((error as Error).message).not.toMatch(/Cannot access member/i);
    // The error is still classified as an HTTP business failure (numeric status +
    // response), so the single error->notify translation reports it once.
    expect((error as { status?: number }).status).toBe(400);
    expect((error as { response?: unknown }).response).toBeTypeOf('object');
  });

  it('surfaces the backend message field and falls back to the raw payload when the adaptor throws', async () => {
    const scope = createTestScope({});
    const env = {
      fetcher: vi.fn(async () => ({
        ok: false,
        status: 422,
        data: { message: 'Validation failed', errors: [{ field: 'name' }] },
      })),
      notify: vi.fn(),
    } as unknown as RendererEnv;

    const error = await executeApiSchema(
      {
        url: '/api/save',
        method: 'post',
        responseAdaptor: 'return { ...payload, data: payload.records[0] }',
      },
      scope,
      env,
      expressionCompiler,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Validation failed');
    expect((error as { status?: number }).status).toBe(422);
    // Raw error body is preserved on the thrown error's responseData so callers
    // can still inspect the original backend payload.
    expect((error as { responseData?: unknown }).responseData).toEqual({
      message: 'Validation failed',
      errors: [{ field: 'name' }],
    });
  });

  it('reports a throwing responseAdaptor on a non-OK payload through structured diagnostics while preserving the backend message (M-08)', async () => {
    const scope = createTestScope({});
    const onError = vi.fn();
    const env = {
      fetcher: vi.fn(async () => ({
        ok: false,
        status: 500,
        // Success-only adaptor throws here (payload.data is undefined).
        data: { msg: 'server exploded' },
      })),
      notify: vi.fn(),
      monitor: { onError },
    } as unknown as RendererEnv;

    const error = await executeApiSchema(
      {
        url: '/api/list',
        method: 'get',
        responseAdaptor: 'return { ...payload, data: payload.data.items }',
      },
      scope,
      env,
      expressionCompiler,
    ).catch((caught: unknown) => caught);

    // Backend message still surfaces via the raw-body fallback.
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('server exploded');
    expect((error as { status?: number }).status).toBe(500);
    // The previously-silent adaptor failure is now reported through the
    // monitor diagnostics seam with a structured payload.
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: 'api',
        error: expect.any(Error),
        details: expect.objectContaining({ url: '/api/list', status: 500 }),
      }),
    );
  });
});
