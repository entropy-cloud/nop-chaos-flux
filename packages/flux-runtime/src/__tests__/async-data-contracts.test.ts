import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRendererRegistry, type ApiSchema, type RendererEnv } from '@nop-chaos/flux-core';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { compileAction as _compileAction, compileDataSource } from '@nop-chaos/flux-compiler';
import { createRendererRuntime } from '../index.js';
import { textRenderer, env } from './test-fixtures.js';
import { extractScopeData as _extractScopeData, prepareApiData as _prepareApiData } from '../async-data/request-runtime.js';

const expressionCompiler = createExpressionCompiler(createFormulaCompiler());

describe('async data contracts', () => {

  describe('C7 [OK]: data source controller reset lifecycle', () => {
    it('allows start after reset', async () => {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 200, data: { run: 1 } })
        .mockResolvedValueOnce({ ok: true, status: 200, data: { run: 2 } });
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: fetcher as RendererEnv['fetcher'],
        },
        expressionCompiler,
      });
      const page = runtime.createPageRuntime({});

      const registration = runtime.registerDataSource({
        id: 'reset-source',
        scope: page.scope,
        compiledSource: compileDataSource(
          'reset-source',
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/data' },
            name: 'payload',
          },
          expressionCompiler,
        ),
      });

      await vi.waitFor(() => {
        expect(page.scope.get('payload')).toEqual({ run: 1 });
      });

      registration.controller.reset();
      expect(page.scope.get('payload')).toBeUndefined();
      expect(registration.controller.getState()).toMatchObject({
        started: false,
        status: 'idle',
        fetchStatus: 'idle',
        hasData: false,
      });

      registration.controller.start();

      await vi.waitFor(() => {
        expect(page.scope.get('payload')).toEqual({ run: 2 });
      });

      expect(registration.controller.getState()).toMatchObject({
        started: true,
        status: 'success',
        hasData: true,
      });

      registration.dispose();
    });
  });

  describe('C8 [OK]: data source parallel dedup with mixed success/failure', () => {
    it('clears error when second parallel request succeeds after first fails', async () => {
      let callCount = 0;
      let releaseSecond: (() => void) | undefined;
      const fetcher = vi.fn(async <T>(
        _api: ApiSchema,
        _ctx: { signal?: AbortSignal },
      ) => {
        callCount += 1;
        if (callCount === 1) {
          throw new Error('first request failed');
        }
        await new Promise<void>((resolve) => {
          releaseSecond = resolve;
        });
        return {
          ok: true,
          status: 200,
          data: { value: 'success' } as T,
        };
      });
      const notify = vi.fn();
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          notify,
          fetcher: fetcher as RendererEnv['fetcher'],
        },
        expressionCompiler,
      });
      const page = runtime.createPageRuntime({ userId: 1 });

      const registration = runtime.registerDataSource({
        id: 'parallel-mixed-source',
        scope: page.scope,
        compiledSource: compileDataSource(
          'parallel-mixed-source',
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/items/${userId}' },
            name: 'payload',
            control: { dedup: 'parallel' },
          },
          expressionCompiler,
        ),
      });

      await vi.waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(1);
      });

      await vi.waitFor(() => {
        expect(notify).toHaveBeenCalledWith('error', 'first request failed');
      });

      page.scope.update('userId', 2);

      await vi.waitFor(() => {
        expect(fetcher).toHaveBeenCalledTimes(2);
      });

      releaseSecond?.();

      await vi.waitFor(() => {
        expect(page.scope.get('payload')).toEqual({ value: 'success' });
      });

      expect(registration.controller.getState()).toMatchObject({
        status: 'success',
        fetchStatus: 'idle',
        hasData: true,
        hasError: false,
        inFlightCount: 0,
        error: undefined,
      });

      registration.dispose();
    });
  });

  describe('C9 [OK]: data source polling stop', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('stops polling when stopWhen condition is met', async () => {
      let callCount = 0;
      const fetcher = vi.fn(async () => {
        callCount += 1;
        return {
          ok: true,
          status: 200,
          data: { status: callCount >= 2 ? 'done' : 'running' },
        };
      });
      const runtime = createRendererRuntime({
        registry: createRendererRegistry([textRenderer]),
        env: {
          ...env,
          fetcher: fetcher as RendererEnv['fetcher'],
        },
        expressionCompiler,
      });
      const page = runtime.createPageRuntime({});

      const registration = runtime.registerDataSource({
        id: 'polling-stop-source',
        scope: page.scope,
        compiledSource: compileDataSource(
          'polling-stop-source',
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/job' },
            name: 'payload',
            interval: 50,
            stopWhen: '${payload.status === "done"}',
          },
          expressionCompiler,
        ),
      });

      await vi.runAllTimersAsync();

      expect(callCount).toBe(2);
      expect(page.scope.get('payload')).toEqual({ status: 'done' });

      registration.dispose();
    });
  });


});
