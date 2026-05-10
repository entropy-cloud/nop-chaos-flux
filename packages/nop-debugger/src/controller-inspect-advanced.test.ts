// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNopDebugger } from './index.js';

describe('controller inspector — advanced data', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('inspectByCid exposes resolved authoring contract from runtime registry when renderer metadata is available', () => {
    const ctrl = createNopDebugger({ id: 'inspect-authoring-contract', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '112');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) =>
        cid === 112
          ? {
              kind: 'resolved',
              payload: {
                cid: 112,
                state: { mounted: true },
                scopeChain: [],
              },
            }
          : { kind: 'notFound' },
      getHandleByCid: () => undefined,
      getHandleDebugData: () => ({ rendererType: 'designer-page' }),
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    ctrl.setRuntime({
      registry: {
        get: vi.fn((type: string) =>
          type === 'designer-page'
            ? {
                type: 'designer-page',
                component: () => null,
                rendererClass: 'domain-host-renderer',
                propContracts: {
                  config: {
                    displayName: 'Config',
                    shape: { kind: 'object' },
                    required: true,
                  },
                },
                hostContract: {
                  family: 'designer',
                  defaultVersion: '1.0',
                  capabilityPublication: { namespace: 'designer' },
                  resolveManifest(versionSelector: string) {
                    return versionSelector === '1.0'
                      ? {
                          family: 'designer',
                          version: '1.0',
                          projection: {
                            fields: {
                              activeNode: {
                                schema: { kind: 'object' },
                                description: 'Active node',
                              },
                            },
                          },
                          capabilities: {
                            namespace: 'designer',
                            methods: {
                              addNode: {
                                args: { kind: 'object' },
                                result: { kind: 'object' },
                              },
                            },
                          },
                        }
                      : undefined;
                  },
                },
              }
            : undefined,
        ),
        has: vi.fn(),
        list: vi.fn(),
      },
    } as never);

    expect(ctrl.inspectByCid(112)).toMatchObject({
      cid: 112,
      rendererType: 'designer-page',
      authoringContract: {
        rendererType: 'designer-page',
        rendererClass: 'domain-host-renderer',
        editableProps: {
          config: expect.objectContaining({ displayName: 'Config', required: true }),
        },
        hostManifest: expect.objectContaining({ family: 'designer', version: '1.0' }),
        hostProjection: expect.objectContaining({
          fields: expect.objectContaining({ activeNode: expect.any(Object) }),
        }),
        hostActions: expect.objectContaining({ addNode: expect.any(Object) }),
      },
    });
  });

  it('inspectByCid treats registry-resolved live nodes as mounted even without a matching DOM element', () => {
    const ctrl = createNopDebugger({ id: 'inspect-registry-without-dom', enabled: true });

    const mockHandle = {
      id: 'handle-103',
      name: 'runtimeForm',
      type: 'form',
      _cid: 103,
      _mounted: true,
    };
    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) =>
        cid === 103
          ? {
              kind: 'resolved',
              payload: {
                cid: 103,
                state: {
                  mounted: true,
                  metaState: {},
                },
              },
            }
          : { kind: 'notFound' },
      getHandleByCid: (cid: number) => (cid === 103 ? mockHandle : undefined),
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    expect(ctrl.inspectByCid(103)).toMatchObject({
      cid: 103,
      mounted: true,
      handleId: 'handle-103',
    });
  });

  it('inspectByCid scopes DOM lookup to the active runtime root', () => {
    const ctrl = createNopDebugger({ id: 'inspect-runtime-scoped-dom', enabled: true });

    const foreignRoot = document.createElement('div');
    foreignRoot.setAttribute('data-runtime-id', 'runtime-foreign');
    const foreignNode = document.createElement('div');
    foreignNode.setAttribute('data-cid', '701');
    foreignNode.className = 'foreign-node';
    foreignRoot.appendChild(foreignNode);

    const localRoot = document.createElement('div');
    localRoot.setAttribute('data-runtime-id', 'runtime-local');
    const localNode = document.createElement('section');
    localNode.setAttribute('data-cid', '701');
    localNode.className = 'local-node';
    localRoot.appendChild(localNode);

    document.body.appendChild(foreignRoot);
    document.body.appendChild(localRoot);

    ctrl.setRuntime({ runtimeId: 'runtime-local' } as never);
    ctrl.setComponentRegistry({ id: 'reg-1', getHandleByCid: () => undefined } as never);

    expect(ctrl.inspectByCid(701)).toMatchObject({
      cid: 701,
      tagName: 'section',
      className: 'local-node',
    });
  });

  it('inspectByCid does not fall back to page-global DOM lookup when the runtime root is missing', () => {
    const ctrl = createNopDebugger({ id: 'inspect-runtime-missing-root', enabled: true });

    const foreignRoot = document.createElement('div');
    foreignRoot.setAttribute('data-runtime-id', 'runtime-foreign');
    const foreignNode = document.createElement('div');
    foreignNode.setAttribute('data-cid', '702');
    foreignNode.className = 'foreign-node';
    foreignRoot.appendChild(foreignNode);
    document.body.appendChild(foreignRoot);

    ctrl.setRuntime({ runtimeId: 'runtime-local-missing' } as never);
    ctrl.setComponentRegistry({ id: 'reg-2', getHandleByCid: () => undefined } as never);

    expect(ctrl.inspectByCid(702)).toBeUndefined();
  });

  it('getComponentTree enumerates mounted registry snapshot entries even without matching DOM elements', () => {
    const ctrl = createNopDebugger({ id: 'inspect-component-tree', enabled: true });
    const mockRegistry = {
      id: 'reg-1',
      getDebugSnapshot: () => ({
        handles: [
          {
            cid: 104,
            id: 'form-104',
            name: 'userForm',
            type: 'form',
            mounted: true,
          },
          {
            cid: 105,
            id: 'stale-105',
            name: 'staleHandle',
            type: 'text',
            mounted: false,
          },
        ],
      }),
      getHandleDebugData: (cid: number) =>
        cid === 104
          ? {
              nodeId: 'user-form',
              path: 'body.0.form',
              rendererType: 'form',
              nodeInstance: {
                instancePath: [{ repeatedTemplateId: 'list', instanceKey: '0' }],
              },
            }
          : undefined,
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    const result = ctrl.getComponentTree();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      cid: 104,
      type: 'form',
      label: 'user-form',
      path: 'body.0.form',
      mounted: true,
    });
    expect(result[0]?.depth).toBeGreaterThan(0);
  });

  it('getComponentTree scopes DOM metadata lookup to the active runtime root', () => {
    const ctrl = createNopDebugger({ id: 'inspect-component-tree-runtime-scoped', enabled: true });

    const foreignRoot = document.createElement('div');
    foreignRoot.setAttribute('data-runtime-id', 'runtime-foreign');
    const foreignNode = document.createElement('div');
    foreignNode.setAttribute('data-cid', '901');
    foreignNode.className = 'foreign-tree-node';
    foreignRoot.appendChild(foreignNode);

    const localRoot = document.createElement('div');
    localRoot.setAttribute('data-runtime-id', 'runtime-local');
    const localNode = document.createElement('section');
    localNode.setAttribute('data-cid', '901');
    localNode.className = 'local-tree-node';
    localRoot.appendChild(localNode);

    document.body.appendChild(foreignRoot);
    document.body.appendChild(localRoot);

    ctrl.setRuntime({ runtimeId: 'runtime-local' } as never);
    ctrl.setComponentRegistry({
      id: 'reg-tree',
      getDebugSnapshot: () => ({
        handles: [{ cid: 901, id: 'node-901', name: 'localNode', type: 'page', mounted: true }],
      }),
      getHandleDebugData: () => ({ rendererType: 'page' }),
    } as never);

    expect(ctrl.getComponentTree()).toEqual([
      expect.objectContaining({
        cid: 901,
        tagName: 'section',
        className: 'local-tree-node',
      }),
    ]);
  });

  it('getComponentTree does not fall back to page-global DOM lookup when the runtime root is missing', () => {
    const ctrl = createNopDebugger({ id: 'inspect-component-tree-missing-root', enabled: true });

    const foreignRoot = document.createElement('div');
    foreignRoot.setAttribute('data-runtime-id', 'runtime-foreign');
    const foreignNode = document.createElement('div');
    foreignNode.setAttribute('data-cid', '902');
    foreignNode.className = 'foreign-tree-node';
    foreignRoot.appendChild(foreignNode);
    document.body.appendChild(foreignRoot);

    ctrl.setRuntime({ runtimeId: 'runtime-local-missing' } as never);
    ctrl.setComponentRegistry({
      id: 'reg-tree-missing',
      getDebugSnapshot: () => ({
        handles: [{ cid: 902, id: 'node-902', name: 'missingRootNode', type: 'page', mounted: true }],
      }),
      getHandleDebugData: () => ({ rendererType: 'page' }),
    } as never);

    expect(ctrl.getComponentTree()).toEqual([
      expect.objectContaining({
        cid: 902,
        tagName: undefined,
        className: undefined,
      }),
    ]);
  });

  it('inspectByCid exposes nodeInstance-backed node state summary when present in debug data', () => {
    const ctrl = createNopDebugger({ id: 'inspect-node-instance-state', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '102');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      getHandleByCid: () => undefined,
      getHandleDebugData: (cid: number) =>
        cid === 102
          ? {
              nodeInstance: {
                state: {
                  mounted: true,
                  metaState: {},
                  propsState: undefined,
                  metaDependencies: {
                    paths: ['record.name'],
                    wildcard: false,
                    broadAccess: false,
                  },
                  propsDependencies: undefined,
                },
              },
            }
          : undefined,
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(102);
    expect(result?.debugData).toMatchObject({
      nodeState: {
        mounted: true,
        hasMetaDependencies: true,
        hasPropsDependencies: false,
        metaDependencyPaths: ['record.name'],
        metaDependencyWildcard: false,
        metaDependencyBroadAccess: false,
      },
    });
  });

  it('inspectByCid falls back to resolved inspect payload data when registry debug data is sparse', () => {
    const ctrl = createNopDebugger({ id: 'inspect-resolved-fallbacks', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '103');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) =>
        cid === 103
          ? {
              kind: 'resolved',
              payload: {
                cid: 103,
                state: {
                  mounted: true,
                  resolvedMeta: { visible: true, disabled: false },
                  resolvedProps: { label: 'Username', value: 'alice' },
                },
                scopeChain: [
                  { id: 'scope-103', path: '$form', label: '$form', data: { username: 'alice' } },
                ],
              },
            }
          : { kind: 'notFound' },
      getHandleByCid: () => undefined,
      getHandleDebugData: () => ({
        nodeId: 'field-username',
        path: 'body.0',
        rendererType: 'input-text',
      }),
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(103);

    expect(result).toMatchObject({
      scopeData: { username: 'alice' },
      metaSummary: { visible: true, disabled: false },
      propsSummary: { label: 'Username', value: 'alice' },
    });
  });

  it('explains value source, meta causality, failure, and async owners with bounded machine-oriented results', () => {
    const ctrl = createNopDebugger({ id: 'inspect-explanations', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '500');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) =>
        cid === 500
          ? {
              kind: 'resolved',
              payload: {
                cid: 500,
                state: {
                  mounted: true,
                  metaState: {},
                  metaDependencies: {
                    paths: ['role', 'currentUser.name'],
                    wildcard: false,
                    broadAccess: false,
                  },
                },
                scopeChain: [
                  {
                    id: 'form-scope',
                    path: '$form',
                    label: '$form',
                    data: { role: 'admin', username: 'alice' },
                  },
                ],
              },
            }
          : { kind: 'notFound' },
      getHandleByCid: () => ({
        id: 'form-500',
        name: 'userForm',
        type: 'form',
        _cid: 500,
        _mounted: true,
        capabilities: {
          store: {
            getState: () => ({
              values: { username: 'alice', role: 'admin' },
              errors: {},
              touched: {},
              dirty: {},
              visited: {},
              submitting: false,
            }),
          },
        },
      }),
      getHandleDebugData: () => ({
        nodeId: 'user-form',
        path: 'body.1',
        resolvedMeta: { visible: true, disabled: false },
        resolvedProps: { label: 'Username', value: 'alice' },
        nodeInstance: {
          state: {
            mounted: true,
            metaState: {},
            metaDependencies: {
              paths: ['role', 'currentUser.name'],
              wildcard: false,
              broadAccess: false,
            },
            propsDependencies: {
              paths: ['username'],
              wildcard: false,
              broadAccess: false,
            },
          },
        },
      }),
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    ctrl.setRuntime({
      getAsyncOwnerDebugSnapshot() {
        return {
          owners: [
            {
              ownerKind: 'validation',
              ownerId: 'validation:form-scope:username',
              scopeId: 'form-scope',
              currentRun: {
                ownerKind: 'validation',
                ownerId: 'validation:form-scope:username',
                scopeId: 'form-scope',
                runId: 7,
                cause: 'blur',
                startedAt: 1,
                outcome: 'failed',
                cancelled: false,
                timedOut: false,
              },
              recentRuns: [
                {
                  ownerKind: 'validation',
                  ownerId: 'validation:form-scope:username',
                  scopeId: 'form-scope',
                  runId: 7,
                  cause: 'blur',
                  startedAt: 1,
                  outcome: 'failed',
                },
              ],
            },
          ],
        };
      },
    } as never);

    const snapshot = ctrl.getSnapshot();
    snapshot.events.unshift(
      {
        id: 3,
        sessionId: snapshot.events[0]?.sessionId ?? 'session',
        timestamp: 300,
        kind: 'error',
        group: 'error',
        level: 'error',
        source: 'root.onActionError',
        summary: 'submit failed',
        nodeId: 'user-form',
        path: 'body.1',
        interactionId: 'interaction-1',
      },
      {
        id: 2,
        sessionId: snapshot.events[0]?.sessionId ?? 'session',
        timestamp: 250,
        kind: 'api:end',
        group: 'api',
        level: 'error',
        source: 'fetcher',
        summary: 'POST /api/users -> 500',
        nodeId: 'user-form',
        path: 'body.1',
        requestInstanceId: 'req-1',
        interactionId: 'interaction-1',
      },
    );

    const valueExplanation = ctrl.explainNodeValue({ cid: 500, field: 'username' });
    expect(valueExplanation).toMatchObject({
      kind: 'value',
      data: {
        field: 'username',
        valueSource: 'form-state',
        value: 'alice',
      },
    });

    const metaExplanation = ctrl.explainNodeMeta({ cid: 500, field: 'visible' });
    expect(metaExplanation).toMatchObject({
      kind: 'meta',
      data: {
        field: 'visible',
        source: 'resolved-meta',
        dependencyPaths: ['role', 'currentUser.name'],
      },
    });

    const failureExplanation = ctrl.explainNodeFailure({ cid: 500 });
    expect(failureExplanation).toMatchObject({
      kind: 'failure',
      data: {
        failureType: 'action-error',
        relatedEventIds: [3, 2],
      },
    });

    const asyncExplanation = ctrl.explainNodeAsync({ cid: 500 });
    expect(asyncExplanation).toMatchObject({
      kind: 'async',
      data: {
        ownerCount: 1,
        owners: [
          {
            ownerKind: 'validation',
            ownerId: 'validation:form-scope:username',
            scopeId: 'form-scope',
            currentRunId: 7,
          },
        ],
      },
    });
  });

  it('fills formState from handle capabilities.store', () => {
    const ctrl = createNopDebugger({ id: 'inspect-formstate', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '200');
    document.body.appendChild(div);

    const mockStore = {
      getState: () => ({
        values: { username: 'Alice' },
        errors: {},
        touched: { username: true },
        dirty: { username: true },
        visited: {},
        submitting: false,
      }),
    };

    const mockHandle = {
      id: 'form-1',
      name: 'userForm',
      type: 'form',
      _cid: 200,
      _mounted: true,
      capabilities: { store: mockStore },
    };

    const mockRegistry = {
      id: 'reg-1',
      getHandleByCid: (cid: number) => (cid === 200 ? mockHandle : undefined),
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(200);
    expect(result).toBeDefined();
    expect(result?.formState).toMatchObject({
      values: { username: 'Alice' },
      errors: {},
      touched: { username: true },
      dirty: { username: true },
      visited: {},
      submitting: false,
    });
    expect(result?.scopeData).toMatchObject({ username: 'Alice' });
  });

  it('explains button-triggered request aborts from the node interaction trace', () => {
    const ctrl = createNopDebugger({ id: 'inspect-failure-trace-fallback', enabled: true });
    const div = document.createElement('button');
    div.setAttribute('data-cid', '610');
    document.body.appendChild(div);

    ctrl.setComponentRegistry({
      id: 'reg-1',
      inspectCid: (cid: number) =>
        cid === 610
          ? {
              kind: 'resolved',
              payload: {
                cid: 610,
                instancePath: [],
                state: {
                  mounted: true,
                },
              },
            }
          : { kind: 'notFound' },
      getHandleByCid: () => ({
        id: 'button-610',
        name: 'searchButton',
        type: 'button',
        _cid: 610,
        _mounted: true,
      }),
      getHandleDebugData: () => ({
        nodeId: 'search-button',
        path: 'body.0.actions.0',
        resolvedMeta: { visible: true },
        resolvedProps: { label: 'Search Directory' },
        nodeInstance: {
          state: {
            mounted: true,
          },
        },
      }),
    } as never);

    const snapshot = ctrl.getSnapshot();
    snapshot.events.unshift(
      {
        id: 12,
        sessionId: snapshot.events[0]?.sessionId ?? 'session',
        timestamp: 120,
        kind: 'api:abort',
        group: 'api',
        level: 'error',
        source: 'fetcher',
        summary: 'POST /api/search aborted',
        nodeId: 'search-form',
        path: 'body.0',
        requestInstanceId: 'req-search-1',
        interactionId: 'interaction-search-1',
      },
      {
        id: 11,
        sessionId: snapshot.events[0]?.sessionId ?? 'session',
        timestamp: 110,
        kind: 'action:start',
        group: 'action',
        level: 'info',
        source: 'dispatch',
        summary: 'button click dispatched ajax action',
        nodeId: 'search-button',
        path: 'body.0.actions.0',
        actionType: 'ajax',
        requestInstanceId: 'req-search-1',
        interactionId: 'interaction-search-1',
      },
    );

    expect(ctrl.explainNodeFailure({ cid: 610 })).toMatchObject({
      kind: 'failure',
      data: {
        failureType: 'request-aborted',
        relatedEventIds: [12, 11],
      },
    });
  });
});
