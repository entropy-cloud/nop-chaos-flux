import { describe, expect, it, vi } from 'vitest';
import type { ApiObject, RendererEnv } from '@nop-chaos/flux-core';
import { appendActionErrorEvent, createDebuggerPlugin, decorateDebuggerEnv } from './adapters';
import { normalizeRedactionOptions } from './redaction';
import { createDebuggerStore } from './store';

function createStore() {
  return createDebuggerStore({
    enabled: true,
    sessionId: 'session-adapter',
    maxEvents: 50,
    defaultOpen: false,
    defaultTab: 'timeline',
    position: { x: 0, y: 0 }
  });
}

describe('debugger adapters', () => {
  it('records compile, action, and error events through the plugin', () => {
    const store = createStore();
    const plugin = createDebuggerPlugin(store);

    plugin.beforeCompile?.({ type: 'page' });
    plugin.afterCompile?.({ type: 'page', path: 'root' } as never);
    plugin.beforeAction?.({ action: 'submitForm' } as never, {
      node: { id: 'node-1', path: 'body.0', type: 'form' }
    } as never);
    plugin.onError?.(new Error('plugin failed'), {
      phase: 'render',
      error: new Error('plugin failed'),
      nodeId: 'node-1',
      path: 'body.0'
    });

    const events = store.getSnapshot().events;
    expect(events.map((event) => event.kind)).toEqual(['error', 'action:start', 'compile:end', 'compile:start']);
    expect(events[1]).toMatchObject({
      actionType: 'submitForm',
      rendererType: 'form'
    });
  });

  it('decorates env monitor, fetcher, and notify handlers', async () => {
    const store = createStore();
    const baseMonitor = {
      onRenderStart: vi.fn(),
      onRenderEnd: vi.fn(),
      onActionStart: vi.fn(),
      onActionEnd: vi.fn(),
      onApiRequest: vi.fn(),
      onError: vi.fn()
    };
    const env: RendererEnv = {
      monitor: baseMonitor,
      async fetcher<T>(api: ApiObject) {
        return {
          ok: true,
          status: 200,
          data: {
            echoedUrl: api.url,
            token: 'server-secret'
          } as T
        };
      },
      notify: vi.fn()
    };
    const decoratedEnv = decorateDebuggerEnv({
      enabled: true,
      env,
      store,
      redaction: normalizeRedactionOptions({ redactKeys: ['token'], mask: '[MASKED]' }),
      requestState: new Map()
    });

    decoratedEnv.monitor?.onRenderStart?.({ nodeId: 'node-1', path: 'body.0', type: 'text' });
    decoratedEnv.monitor?.onRenderEnd?.({ nodeId: 'node-1', path: 'body.0', type: 'text', durationMs: 5 });
    decoratedEnv.monitor?.onActionStart?.({ actionType: 'reload', nodeId: 'node-1', path: 'body.0' });
    decoratedEnv.monitor?.onActionEnd?.({ actionType: 'reload', nodeId: 'node-1', path: 'body.0', durationMs: 7, result: { ok: true } });
    decoratedEnv.monitor?.onApiRequest?.({
      api: {
        url: '/api/demo',
        method: 'post',
        data: { token: 'client-secret', keep: 'visible' }
      },
      nodeId: 'node-1',
      path: 'body.0'
    });
    decoratedEnv.monitor?.onApiRequest?.({
      api: {
        url: '/api/demo',
        method: 'post',
        data: { token: 'client-secret', keep: 'visible' }
      },
      nodeId: 'node-1',
      path: 'body.0'
    });
    decoratedEnv.monitor?.onError?.({ phase: 'action', error: new Error('monitor failed'), nodeId: 'node-1', path: 'body.0' });
    decoratedEnv.notify('warning', 'watch out');
    await decoratedEnv.fetcher({
      url: '/api/demo',
      method: 'post',
      data: { token: 'client-secret', keep: 'visible' }
    }, {
      env: decoratedEnv,
      scope: { readOwn() { return {}; } } as never,
      signal: undefined
    });

    const snapshot = store.getSnapshot();
    const apiStartEvents = snapshot.events.filter((event) => event.kind === 'api:start');
    const apiEndEvent = snapshot.events.find((event) => event.kind === 'api:end');
    const notifyEvent = snapshot.events.find((event) => event.kind === 'notify');

    expect(baseMonitor.onRenderStart).toHaveBeenCalled();
    expect(baseMonitor.onApiRequest).toHaveBeenCalledTimes(2);
    expect(apiStartEvents).toHaveLength(1);
    expect(apiStartEvents[0].exportedData).toMatchObject({ token: '[MASKED]', keep: 'visible' });
    expect(apiEndEvent?.exportedData).toMatchObject({ echoedUrl: '/api/demo', token: '[MASKED]' });
    expect(apiEndEvent?.network).toMatchObject({ method: 'POST', status: 200, responseType: 'object' });
    expect(notifyEvent).toMatchObject({ summary: 'warning: watch out' });
  });

  it('returns the original env when disabled and records root action errors', () => {
    const store = createStore();
    const env: RendererEnv = {
      async fetcher<T>() {
        return { ok: true, status: 200, data: undefined as T };
      },
      notify() {
        return undefined;
      }
    };

    const sameEnv = decorateDebuggerEnv({
      enabled: false,
      env,
      store,
      redaction: normalizeRedactionOptions(undefined),
      requestState: new Map()
    });
    appendActionErrorEvent(store, new Error('root failed'), {
      runtime: {} as never,
      scope: {} as never,
      node: { id: 'node-root', path: 'body.9', type: 'form' } as never
    });

    expect(sameEnv).toBe(env);
    expect(store.getSnapshot().events[0]).toMatchObject({
      kind: 'error',
      nodeId: 'node-root',
      rendererType: 'form'
    });
  });
});

