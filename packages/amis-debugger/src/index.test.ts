import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiObject, RendererEnv } from '@nop-chaos/flux-core';
import { createAmisDebugger, getAmisDebuggerAutomationApi, installAmisDebuggerWindowFlag } from './index';

const windowStub = {} as Window & typeof globalThis;

Object.defineProperty(globalThis, 'window', {
  value: windowStub,
  configurable: true
});

const baseEnv: RendererEnv = {
  async fetcher<T>(api: ApiObject) {
    return {
      ok: true,
      status: 200,
      data: {
        url: api.url,
        method: api.method ?? 'get'
      } as T
    };
  },
  notify() {
    return undefined;
  }
};

describe('amis-debugger automation api', () => {
  beforeEach(() => {
    installAmisDebuggerWindowFlag(false);
    delete window.__NOP_AMIS_DEBUGGER_API__;
    delete window.__NOP_AMIS_DEBUGGER_HUB__;
  });

  it('queries events and builds diagnostic reports', async () => {
    const debuggerController = createAmisDebugger({
      id: 'automation-query',
      enabled: true
    });
    const env = debuggerController.decorateEnv(baseEnv);

    env.monitor?.onRenderEnd?.({
      nodeId: 'node-1',
      path: 'body.0',
      type: 'text',
      durationMs: 4
    });
    env.monitor?.onActionEnd?.({
      actionType: 'submitForm',
      nodeId: 'node-1',
      path: 'body.0',
      durationMs: 8,
      result: { ok: true }
    });
    env.notify('warning', 'username duplicated');
    debuggerController.onActionError(new Error('submit exploded'), {
      runtime: {} as never,
      scope: {} as never,
      node: {
        id: 'node-1',
        path: 'body.0',
        type: 'form'
      } as never
    });

    const renderEvents = debuggerController.queryEvents({
      group: 'render',
      nodeId: 'node-1'
    });
    expect(renderEvents).toHaveLength(1);
    expect(renderEvents[0]).toMatchObject({
      kind: 'render:end',
      rendererType: 'text'
    });

    const latestError = debuggerController.getLatestError();
    expect(latestError).toMatchObject({
      kind: 'error',
      nodeId: 'node-1'
    });

    const report = debuggerController.createDiagnosticReport({ eventLimit: 3 });
    expect(report.controllerId).toBe('automation-query');
    expect(report.overview.countsByGroup.error).toBe(1);
    expect(report.latestAction?.actionType).toBe('submitForm');
    expect(report.recentEvents).toHaveLength(3);
  });

  it('captures structured network summaries and node diagnostics', async () => {
    const debuggerController = createAmisDebugger({
      id: 'network-node',
      enabled: true
    });
    const env = debuggerController.decorateEnv(baseEnv);

    env.monitor?.onApiRequest?.({
      api: {
        url: '/api/users',
        method: 'post',
        data: {
          username: 'alice',
          role: 'admin'
        }
      },
      nodeId: 'form-node',
      path: 'body.1'
    });
    env.monitor?.onRenderEnd?.({
      nodeId: 'form-node',
      path: 'body.1',
      type: 'form',
      durationMs: 6
    });
    await env.fetcher({
      url: '/api/users',
      method: 'post',
      data: {
        username: 'alice',
        role: 'admin'
      }
    }, {
      scope: {
        readOwn() {
          return { username: 'alice' };
        }
      } as never,
      env,
      signal: undefined
    });

    const latestApi = debuggerController.getLatestEvent({ kind: 'api:end' });
    expect(latestApi?.network).toMatchObject({
      method: 'POST',
      url: '/api/users',
      status: 200,
      responseType: 'object'
    });
    expect(latestApi?.network?.requestDataKeys).toEqual(['username', 'role']);
    expect(latestApi?.network?.responseDataKeys).toEqual(['url', 'method']);

    const nodeDiagnostics = debuggerController.getNodeDiagnostics({
      nodeId: 'form-node'
    });
    expect(nodeDiagnostics.nodeId).toBe('form-node');
    expect(nodeDiagnostics.countsByGroup.api).toBe(1);
    expect(nodeDiagnostics.countsByGroup.render).toBe(1);
    expect(nodeDiagnostics.rendererTypes).toContain('form');
    expect(nodeDiagnostics.latestApi?.network?.url).toBe('/api/users');
  });

  it('exports sessions and interaction traces for AI analysis', async () => {
    const debuggerController = createAmisDebugger({
      id: 'trace-export',
      enabled: true
    });
    const env = debuggerController.decorateEnv(baseEnv);

    env.monitor?.onActionStart?.({
      actionType: 'submitForm',
      nodeId: 'trace-node',
      path: 'body.2'
    });
    env.monitor?.onApiRequest?.({
      api: {
        url: '/api/trace',
        method: 'post',
        data: {
          status: 'draft'
        }
      },
      nodeId: 'trace-node',
      path: 'body.2'
    });
    debuggerController.onActionError(new Error('trace failure'), {
      runtime: {} as never,
      scope: {} as never,
      node: {
        id: 'trace-node',
        path: 'body.2',
        type: 'form'
      } as never
    });

    const trace = debuggerController.getInteractionTrace({
      nodeId: 'trace-node',
      path: 'body.2'
    });
    expect(trace.totalEvents).toBeGreaterThanOrEqual(3);
    expect(trace.latestAction?.actionType).toBe('submitForm');
    expect(trace.latestError?.group).toBe('error');
    expect(trace.paths).toContain('body.2');

    const exported = debuggerController.exportSession({
      query: {
        nodeId: 'trace-node'
      }
    });
    expect(exported.controllerId).toBe('trace-export');
    expect(exported.snapshot.events.length).toBeGreaterThanOrEqual(exported.events.length);
    expect(exported.events.every((event) => event.nodeId === 'trace-node')).toBe(true);
  });

  it('redacts sensitive values in exported session payloads', async () => {
    const debuggerController = createAmisDebugger({
      id: 'redaction-export',
      enabled: true,
      redaction: {
        redactKeys: ['token', 'password'],
        mask: '[MASKED]'
      }
    });
    const env = debuggerController.decorateEnv(baseEnv);

    env.monitor?.onApiRequest?.({
      api: {
        url: '/api/secure',
        method: 'post',
        data: {
          username: 'architect',
          password: '123456',
          token: 'top-secret'
        }
      },
      nodeId: 'secure-node',
      path: 'body.9'
    });

    await env.fetcher({
      url: '/api/secure',
      method: 'post',
      data: {
        username: 'architect',
        password: '123456',
        token: 'top-secret'
      }
    }, {
      scope: {
        readOwn() {
          return {};
        }
      } as never,
      env,
      signal: undefined
    });

    const exported = debuggerController.exportSession({
      query: {
        kind: 'api:end'
      }
    });
    const apiEvent = exported.events[0];

    expect(apiEvent.exportedData).toMatchObject({
      url: '/api/secure',
      method: 'post'
    });

    expect(exported.snapshot.events.some((event) => event.network?.url === '/api/secure')).toBe(true);
    const redactedSecureEvent = exported.snapshot.events.find((event) => event.kind === 'api:start' && event.network?.url === '/api/secure');
    expect(redactedSecureEvent?.exportedData).toMatchObject({
      username: 'architect',
      password: '[MASKED]',
      token: '[MASKED]'
    });
  });

  it('waits for later matching events', async () => {
    vi.useFakeTimers();

    try {
      const debuggerController = createAmisDebugger({
        id: 'automation-wait',
        enabled: true
      });
      const env = debuggerController.decorateEnv(baseEnv);

      const pending = debuggerController.waitForEvent({
        kind: 'api:end',
        text: '/api/users',
        timeoutMs: 1000
      });

      setTimeout(() => {
        void env.fetcher({
          url: '/api/users',
          method: 'get'
        }, {
          scope: {
            readOwn() {
              return { username: 'alice' };
            }
          } as never,
          env,
          signal: undefined
        });
      }, 50);

      await vi.advanceTimersByTimeAsync(50);

      await expect(pending).resolves.toMatchObject({
        kind: 'api:end'
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('registers global automation api and hub handles', () => {
    const first = createAmisDebugger({
      id: 'first-controller',
      enabled: true
    });
    const second = createAmisDebugger({
      id: 'second-controller',
      enabled: true
    });

    expect(getAmisDebuggerAutomationApi()).toBe(second.automation);
    expect(getAmisDebuggerAutomationApi('first-controller')).toBe(first.automation);
    expect(window.__NOP_AMIS_DEBUGGER_HUB__?.listControllers()).toEqual(
      expect.arrayContaining(['first-controller', 'second-controller'])
    );
    expect(window.__NOP_AMIS_DEBUGGER_HUB__?.activeControllerId).toBe('second-controller');
  });
});

