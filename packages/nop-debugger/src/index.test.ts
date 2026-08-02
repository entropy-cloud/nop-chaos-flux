import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionScope, ApiSchema, RendererEnv } from '@nop-chaos/flux-core';
import {
  createNopDebugger,
  getNopDebuggerAutomationApi,
  installNopDebuggerWindowFlag,
} from './index.js';

const windowStub = {} as Window & typeof globalThis;

const baseEnv: RendererEnv = {
  async fetcher<T>(api: ApiSchema) {
    return {
      ok: true,
      status: 200,
      data: {
        url: api.url,
        method: api.method ?? 'get',
      } as T,
    };
  },
  notify() {
    return undefined;
  },
};

describe('nop-debugger automation api', () => {
  beforeEach(() => {
    vi.stubGlobal('window', windowStub);
    installNopDebuggerWindowFlag(false);
    delete window.__NOP_DEBUGGER_API__;
    delete window.__NOP_DEBUGGER_HUB__;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queries events and builds diagnostic reports', async () => {
    const debuggerController = createNopDebugger({
      id: 'automation-query',
      enabled: true,
    });
    const env = debuggerController.decorateEnv(baseEnv);

    env.notify('warning', 'username duplicated');
    debuggerController.onActionError(new Error('submit exploded'), {
      runtime: {} as never,
      scope: {} as never,
      nodeInstance: {
        templateNode: { id: 'node-1', templatePath: 'body.0', rendererType: 'form' },
      } as never,
    });

    const latestError = debuggerController.getLatestError();
    expect(latestError).toMatchObject({
      kind: 'error',
      nodeId: 'node-1',
    });

    const report = debuggerController.createDiagnosticReport({ eventLimit: 3 });
    expect(report.controllerId).toBe('automation-query');
    expect(report.overview.countsByGroup.error).toBe(1);
    expect(report.recentEvents).toHaveLength(2);
  });

  it('captures structured network summaries and node diagnostics', async () => {
    const debuggerController = createNopDebugger({
      id: 'network-node',
      enabled: true,
    });
    const env = debuggerController.decorateEnv(baseEnv);

    await env.fetcher(
      {
        url: '/api/users',
        method: 'post',
        data: {
          username: 'alice',
          role: 'admin',
        },
      },
      {
        scope: {
          readOwn() {
            return { username: 'alice' };
          },
        } as never,
        env,
        signal: undefined,
      },
    );

    const latestApi = debuggerController.getLatestEvent({ kind: 'api:end' });
    expect(latestApi?.network).toMatchObject({
      method: 'POST',
      url: '/api/users',
      status: 200,
      responseType: 'object',
    });
    expect(latestApi?.network?.requestDataKeys).toEqual(['username', 'role']);
    expect(latestApi?.network?.responseDataKeys).toEqual(['url', 'method']);
  });

  it('keeps registry debug capture disabled when debugger is disabled', () => {
    const debuggerController = createNopDebugger({
      id: 'disabled-registry-gate',
      enabled: false,
    });
    const registry = {
      setDebugEnabled: vi.fn(),
    };

    debuggerController.setComponentRegistry(registry as never);

    expect(registry.setDebugEnabled).toHaveBeenCalledWith(false);
    expect(debuggerController.getSnapshot().enabled).toBe(false);
  });

  it('exports sessions and interaction traces for AI analysis', async () => {
    const debuggerController = createNopDebugger({
      id: 'trace-export',
      enabled: true,
    });

    debuggerController.onActionError(new Error('trace failure'), {
      runtime: {} as never,
      scope: {} as never,
      nodeInstance: {
        templateNode: { id: 'trace-node', templatePath: 'body.2', rendererType: 'form' },
      } as never,
    });

    const trace = debuggerController.getInteractionTrace({
      nodeId: 'trace-node',
      path: 'body.2',
    });
    expect(trace.latestError?.group).toBe('error');
    expect(trace.paths).toContain('body.2');

    const exported = debuggerController.exportSession({
      query: {
        nodeId: 'trace-node',
      },
    });
    expect(exported.controllerId).toBe('trace-export');
    expect(exported.snapshot.events.length).toBeGreaterThanOrEqual(exported.events.length);
    expect(exported.events.every((event) => event.nodeId === 'trace-node')).toBe(true);
  });

  it('redacts sensitive values in exported session payloads', async () => {
    const debuggerController = createNopDebugger({
      id: 'redaction-export',
      enabled: true,
      redaction: {
        redactKeys: ['token', 'password'],
        mask: '[MASKED]',
      },
    });
    const env = debuggerController.decorateEnv(baseEnv);

    await env.fetcher(
      {
        url: '/api/secure',
        method: 'post',
        data: {
          username: 'architect',
          password: '123456',
          token: 'top-secret',
        },
      },
      {
        scope: {
          readOwn() {
            return {};
          },
        } as never,
        env,
        signal: undefined,
      },
    );

    const exported = debuggerController.exportSession({
      query: {
        kind: 'api:end',
      },
    });
    const apiEvent = exported.events[0];

    expect(apiEvent.exportedData).toMatchObject({
      url: '/api/secure',
      method: 'post',
    });
  });

  it('waits for later matching events', async () => {
    vi.useFakeTimers();

    try {
      const debuggerController = createNopDebugger({
        id: 'automation-wait',
        enabled: true,
      });
      const env = debuggerController.decorateEnv(baseEnv);

      const pending = debuggerController.waitForEvent({
        kind: 'api:end',
        text: '/api/users',
        timeoutMs: 1000,
      });

      setTimeout(() => {
        void env.fetcher(
          {
            url: '/api/users',
            method: 'get',
          },
          {
            scope: {
              readOwn() {
                return { username: 'alice' };
              },
            } as never,
            env,
            signal: undefined,
          },
        );
      }, 50);

      await vi.advanceTimersByTimeAsync(50);

      await expect(pending).resolves.toMatchObject({
        kind: 'api:end',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('registers global automation api and hub handles', () => {
    const first = createNopDebugger({
      id: 'first-controller',
      enabled: true,
      exposeAutomationApi: true,
    });
    const second = createNopDebugger({
      id: 'second-controller',
      enabled: true,
      exposeAutomationApi: true,
    });

    expect(getNopDebuggerAutomationApi()).toBe(second.automation);
    expect(getNopDebuggerAutomationApi('first-controller')).toBe(first.automation);
    expect(window.__NOP_DEBUGGER_HUB__?.listControllers()).toEqual(
      expect.arrayContaining(['first-controller', 'second-controller']),
    );
    expect(window.__NOP_DEBUGGER_HUB__?.activeControllerId).toBe('second-controller');
  });

  it('does not expose automation api on window by default', () => {
    createNopDebugger({
      id: 'default-off-controller',
      enabled: true,
    });

    expect(window.__NOP_DEBUGGER_API__).toBeUndefined();
    expect(window.__NOP_DEBUGGER_HUB__).toBeUndefined();
  });

  it('exposes automation api on window only when exposeAutomationApi is true', () => {
    const controller = createNopDebugger({
      id: 'explicit-on-controller',
      enabled: true,
      exposeAutomationApi: true,
    });

    expect(window.__NOP_DEBUGGER_API__).toBe(controller.automation);
    expect(window.__NOP_DEBUGGER_HUB__).toBeDefined();
    expect(window.__NOP_DEBUGGER_HUB__?.activeControllerId).toBe('explicit-on-controller');
  });

  it('records state:snapshot events when an action scope with debug snapshot is attached', () => {
    const debuggerController = createNopDebugger({
      id: 'action-scope-snapshot',
      enabled: true,
    });

    const actionScope: ActionScope = {
      id: 'scope-root',
      resolve() {
        return undefined;
      },
      registerNamespace() {
        return () => undefined;
      },
      unregisterNamespace() {
        return undefined;
      },
      listNamespaces() {
        return ['app'];
      },
      getDebugSnapshot() {
        return {
          id: 'scope-root',
          namespaces: [
            {
              namespace: 'app',
              providerKind: 'host',
              methods: ['save', 'refresh'],
            },
          ],
        };
      },
    };

    debuggerController.setActionScope(actionScope);

    const snapshotEvent = debuggerController.getLatestEvent({ kind: 'state:snapshot' });
    expect(snapshotEvent).toMatchObject({
      kind: 'state:snapshot',
      group: 'node',
      source: 'controller.setActionScope',
    });
    expect(snapshotEvent?.exportedData).toMatchObject({
      id: 'scope-root',
      namespaces: [
        {
          namespace: 'app',
          providerKind: 'host',
          methods: ['save', 'refresh'],
        },
      ],
    });

    const nodeEvents = debuggerController.queryEvents({ group: 'node' });
    expect(nodeEvents.some((event) => event.kind === 'state:snapshot')).toBe(true);
  });

  it('exposes async owner diagnostics through automation without adding a new event channel', () => {
    const debuggerController = createNopDebugger({
      id: 'async-owner-snapshot',
      enabled: true,
    });

    debuggerController.setRuntime({
      getAsyncOwnerDebugSnapshot() {
        return {
          owners: [
            {
              ownerKind: 'reaction',
              ownerId: 'reaction:page-1:watch-users',
              scopeId: 'page-1',
              recentRuns: [
                {
                  ownerKind: 'reaction',
                  ownerId: 'reaction:page-1:watch-users',
                  scopeId: 'page-1',
                  runId: 2,
                  cause: 'dependency-change',
                  startedAt: 1,
                  settledAt: 2,
                  outcome: 'stale-dropped',
                  supersededBy: 3,
                },
              ],
            },
          ],
        };
      },
    } as never);

    expect(debuggerController.getAsyncOwnerDebugSnapshot()).toMatchObject({
      owners: [
        expect.objectContaining({
          ownerKind: 'reaction',
          ownerId: 'reaction:page-1:watch-users',
        }),
      ],
    });
    expect(debuggerController.automation.getAsyncOwnerDebugSnapshot()).toMatchObject({
      owners: [
        expect.objectContaining({
          ownerKind: 'reaction',
          ownerId: 'reaction:page-1:watch-users',
        }),
      ],
    });
    expect(debuggerController.queryEvents({ kind: 'state:snapshot' })).toEqual([]);
  });
});

