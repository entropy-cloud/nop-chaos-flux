import { describe, expect, it } from 'vitest';
import { createRendererRegistry, type ApiSchema } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';

describe('createRendererRuntime', () => {
  it('applies requestAdaptor before fetcher and responseAdaptor after fetcher', async () => {
    const fetchCalls: ApiSchema[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiSchema) => {
          fetchCalls.push(api);
          return {
            ok: true,
            status: 200,
            data: {
              items: [{ id: 1, name: 'Alice' }],
              total: 1,
            } as T,
          };
        },
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ token: 'secure-token' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        args: {
          url: '/api/users',
          method: 'get',
          requestAdaptor:
            'return {headers: {Authorization: scope.token}, data: {query: scope.token}};',
          responseAdaptor: 'return {rows: payload.items, count: payload.total};',
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toMatchObject({
      url: '/api/users',
      method: 'get',
      headers: {
        Authorization: 'secure-token',
      },
      data: {
        query: 'secure-token',
      },
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        rows: [{ id: 1, name: 'Alice' }],
        count: 1,
      },
    });
  });

  it('evaluates declarative ajax api values before request execution convergence', async () => {
    const fetchCalls: ApiSchema[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiSchema) => {
          fetchCalls.push(api);
          return {
            ok: true,
            status: 200,
            data: { ok: true } as T,
          };
        },
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ userId: 7, token: 'page-token' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        args: {
          url: '/api/users/${userId}',
          method: 'post',
          includeScope: ['token'],
          params: {
            mode: '${token}',
          },
          data: {
            userId: '${userId}',
          },
        },
      },
      {
        runtime,
        scope: page.scope,
        page,
      },
    );

    expect(result.ok).toBe(true);
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]).toMatchObject({
      url: '/api/users/7?mode=page-token',
      method: 'post',
      data: {
        token: 'page-token',
        userId: 7,
      },
    });
    expect(fetchCalls[0].params).toBeUndefined();
  });

  it('evaluates adaptor scope through lexical scope view without eager whole-scope reads', async () => {
    const fetchCalls: ApiSchema[] = [];
    const runtime = createRendererRuntime({
      registry: createRendererRegistry([textRenderer]),
      env: {
        ...env,
        fetcher: async <T>(api: ApiSchema) => {
          fetchCalls.push(api);
          return {
            ok: true,
            status: 200,
            data: { ok: true } as T,
          };
        },
      },
      expressionCompiler: createExpressionCompiler(createFormulaCompiler()),
    });
    const page = runtime.createPageRuntime({ token: 'page-token' });
    const childScope = runtime.createChildScope(page.scope, { username: 'Alice' });

    const result = await runtime.dispatch(
      {
        action: 'ajax',
        args: {
          url: '/api/adaptor-check',
          method: 'post',
          requestAdaptor:
            'return {headers: {Authorization: scope.token}, data: {username: scope.username}};',
        },
      },
      {
        runtime,
        scope: childScope,
        page,
      },
    );

    expect(result.ok).toBe(true);
    expect(fetchCalls[0]).toMatchObject({
      headers: {
        Authorization: 'page-token',
      },
      data: {
        username: 'Alice',
      },
    });
  });
});
