import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv, ScopeRef } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createScopeRef, createScopeStore } from '../scope.js';
import { executeApiSchema, prepareApiRequestForExecution } from '../async-data/request-runtime.js';

function createTestScope(data: Record<string, unknown>): ScopeRef {
  return createScopeRef({
    id: 'test-scope',
    path: 'test',
    store: createScopeStore(data),
  });
}

function createEnv(fetcher: RendererEnv['fetcher']): RendererEnv {
  return {
    fetcher,
    notify: vi.fn(),
  } as unknown as RendererEnv;
}

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('executeApiSchema ApiResponse envelope normalization', () => {
  it('computes ok=true when fetcher returns { status: 0 } and passes data through', async () => {
    const scope = createTestScope({});
    const env = createEnv(
      vi.fn(async () => ({
        status: 0,
        data: { id: 1, name: 'Alice' },
      })) as unknown as RendererEnv['fetcher'],
    );

    const result = await executeApiSchema({ url: '/api/users/1', method: 'get' }, scope, env, expressionCompiler);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(0);
    expect(result.data).toEqual({ id: 1, name: 'Alice' });
  });

  it('throws with error.message from response.msg when status !== 0', async () => {
    const scope = createTestScope({});
    const env = createEnv(
      vi.fn(async () => ({
        status: -1,
        msg: '失败',
        data: null,
      })) as unknown as RendererEnv['fetcher'],
    );

    const error = await executeApiSchema(
      { url: '/api/save', method: 'post' },
      scope,
      env,
      expressionCompiler,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('失败');
  });

  it('attaches code and errors on the thrown error for field-level failures', async () => {
    const scope = createTestScope({});
    const env = createEnv(
      vi.fn(async () => ({
        status: -1,
        code: 'validation.failed',
        msg: '校验失败',
        errors: { email: '邮箱格式错误', name: '姓名不能为空' },
      })) as unknown as RendererEnv['fetcher'],
    );

    const error = await executeApiSchema(
      { url: '/api/save', method: 'post' },
      scope,
      env,
      expressionCompiler,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('校验失败');
    expect((error as { code?: string }).code).toBe('validation.failed');
    expect((error as { errors?: Record<string, string> }).errors).toEqual({
      email: '邮箱格式错误',
      name: '姓名不能为空',
    });
  });

  it('falls back to a generic message when status !== 0 and no msg is present', async () => {
    const scope = createTestScope({});
    const env = createEnv(
      vi.fn(async () => ({
        status: -1,
        data: null,
      })) as unknown as RendererEnv['fetcher'],
    );

    const error = await executeApiSchema(
      { url: '/api/save', method: 'post' },
      scope,
      env,
      expressionCompiler,
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Request failed/i);
    expect((error as Error).message).toContain('status=-1');
  });

  it('prefers top-level response.msg over data.message (msg is a first-class field)', async () => {
    const scope = createTestScope({});
    const env = createEnv(
      vi.fn(async () => ({
        status: -1,
        msg: 'top-level msg',
        data: { message: 'nested message' },
      })) as unknown as RendererEnv['fetcher'],
    );

    const error = await executeApiSchema(
      { url: '/api/save', method: 'post' },
      scope,
      env,
      expressionCompiler,
    ).catch((caught: unknown) => caught);

    expect((error as Error).message).toBe('top-level msg');
  });

  it('falls back to data.message for non-standard backends that nest msg inside data', async () => {
    const scope = createTestScope({});
    const env = createEnv(
      vi.fn(async () => ({
        status: -1,
        data: { message: 'legacy nested message' },
      })) as unknown as RendererEnv['fetcher'],
    );

    const error = await executeApiSchema(
      { url: '/api/save', method: 'post' },
      scope,
      env,
      expressionCompiler,
    ).catch((caught: unknown) => caught);

    expect((error as Error).message).toBe('legacy nested message');
  });
});

describe('selection field propagation', () => {
  it('threads selection into the prepared ExecutableApiRequest', () => {
    const scope = createTestScope({});
    const env = createEnv(vi.fn() as unknown as RendererEnv['fetcher']);

    const prepared = prepareApiRequestForExecution(
      {
        url: '/api/users/1',
        method: 'get',
        selection: 'id,name,role{id,label}',
      },
      scope,
      env,
      expressionCompiler,
    );

    expect(prepared.request.selection).toBe('id,name,role{id,label}');
  });
});
