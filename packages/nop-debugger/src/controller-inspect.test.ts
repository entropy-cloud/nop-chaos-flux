// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createNopDebugger } from './index';

describe('controller inspector methods', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns undefined when no component registry is set', () => {
    const ctrl = createNopDebugger({ id: 'inspect-no-reg', enabled: true });
    const result = ctrl.inspectByCid(42);
    expect(result).toBeUndefined();
  });

  it('returns undefined when element has no data-cid attribute', () => {
    const ctrl = createNopDebugger({ id: 'inspect-nocid', enabled: true });
    const div = document.createElement('div');
    document.body.appendChild(div);
    const result = ctrl.inspectByElement(div);
    expect(result).toBeUndefined();
  });

  it('returns mounted result for element with data-cid when no registry', () => {
    const ctrl = createNopDebugger({ id: 'inspect-mounted', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '99');
    document.body.appendChild(div);
    const result = ctrl.inspectByElement(div);
    expect(result).toMatchObject({ cid: 99, mounted: true });
    expect(result?.handleId).toBeUndefined();
  });

  it('inspectByElement climbs to the nearest inspectable owner marker', () => {
    const ctrl = createNopDebugger({ id: 'inspect-closest-owner', enabled: true });
    const owner = document.createElement('div');
    owner.setAttribute('data-cid', '98');
    owner.className = 'owner-node';
    const child = document.createElement('span');
    owner.appendChild(child);
    document.body.appendChild(owner);

    const result = ctrl.inspectByElement(child);

    expect(result).toMatchObject({
      cid: 98,
      mounted: true,
      tagName: 'div',
      className: 'owner-node'
    });
  });

  it('inspectByCid requires setComponentRegistry to find elements', () => {
    const ctrl = createNopDebugger({ id: 'inspect-reg-required', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '77');
    document.body.appendChild(div);
    expect(ctrl.inspectByCid(77)).toBeUndefined();

    const mockRegistry = { id: 'reg-1', getHandleByCid: () => undefined };
    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(77);
    expect(result).toMatchObject({ cid: 77, mounted: true });
  });

  it('inspectByCid returns undefined when element not found', () => {
    const ctrl = createNopDebugger({ id: 'inspect-missing', enabled: true });
    const mockRegistry = { id: 'reg-1', getHandleByCid: () => undefined };
    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(999);
    expect(result).toBeUndefined();
  });

  it('inspectByElement returns undefined for non-numeric data-cid', () => {
    const ctrl = createNopDebugger({ id: 'inspect-nan', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', 'not-a-number');
    document.body.appendChild(div);
    const result = ctrl.inspectByElement(div);
    expect(result).toBeUndefined();
  });

  it('setComponentRegistry stores registry and inspectByCid finds handle', () => {
    const ctrl = createNopDebugger({ id: 'inspect-registry', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '100');
    document.body.appendChild(div);

    const mockHandle = { id: 'handle-1', name: 'testForm', type: 'form', _cid: 100, _mounted: true };
    const mockRegistry = {
      id: 'reg-1',
      getHandleByCid: (cid: number) => (cid === 100 ? mockHandle : undefined)
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(100);
    expect(result).toMatchObject({ cid: 100, mounted: true });
  });

  it('inspectByCid prefers registry inspectCid instancePath data when available', () => {
    const ctrl = createNopDebugger({ id: 'inspect-registry-instance-path', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '101');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) => cid === 101
        ? {
            kind: 'resolved',
            payload: {
              cid: 101,
              instancePath: []
            }
          }
        : { kind: 'notFound' },
      getHandleByCid: () => undefined
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(101);
    expect(result).toMatchObject({
      cid: 101,
      mounted: true,
      instancePath: []
    });
  });

  it('inspectByCid preserves registry scopeChain snapshots when available', () => {
    const ctrl = createNopDebugger({ id: 'inspect-registry-scope-chain', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '111');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) => cid === 111
        ? {
            kind: 'resolved',
            payload: {
              cid: 111,
              scopeChain: [
                { id: 'form-1', path: '$form', label: '$form', data: { departmentId: 'runtime' } }
              ]
            }
          }
        : { kind: 'notFound' },
      getHandleByCid: () => undefined
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    expect(ctrl.inspectByCid(111)).toMatchObject({
      cid: 111,
      mounted: true,
      scopeChain: [
        { id: 'form-1', path: '$form', label: '$form', data: { departmentId: 'runtime' } }
      ]
    });
  });

  it('inspectByCid exposes resolved authoring contract from runtime registry when renderer metadata is available', () => {
    const ctrl = createNopDebugger({ id: 'inspect-authoring-contract', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '112');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) => cid === 112
        ? {
            kind: 'resolved',
            payload: {
              cid: 112,
              state: { mounted: true },
              scopeChain: [],
            }
          }
        : { kind: 'notFound' },
      getHandleByCid: () => undefined,
      getHandleDebugData: () => ({ rendererType: 'designer-page' })
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    ctrl.setRuntime({
      registry: {
        get: vi.fn((type: string) => type === 'designer-page' ? {
          type: 'designer-page',
          component: () => null,
          rendererClass: 'domain-host-renderer',
          propContracts: {
            config: {
              displayName: 'Config',
              shape: { kind: 'object' },
              required: true
            }
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
                        activeNode: { schema: { kind: 'object' }, description: 'Active node' }
                      }
                    },
                    capabilities: {
                      namespace: 'designer',
                      methods: {
                        addNode: {
                          args: { kind: 'object' },
                          result: { kind: 'object' }
                        }
                      }
                    }
                  }
                : undefined;
            }
          }
        } : undefined),
        has: vi.fn(),
        list: vi.fn()
      }
    } as never);

    expect(ctrl.inspectByCid(112)).toMatchObject({
      cid: 112,
      rendererType: 'designer-page',
      authoringContract: {
        rendererType: 'designer-page',
        rendererClass: 'domain-host-renderer',
        editableProps: {
          config: expect.objectContaining({ displayName: 'Config', required: true })
        },
        hostManifest: expect.objectContaining({ family: 'designer', version: '1.0' }),
        hostProjection: expect.objectContaining({
          fields: expect.objectContaining({ activeNode: expect.any(Object) })
        }),
        hostActions: expect.objectContaining({ addNode: expect.any(Object) })
      }
    });
  });

  it('inspectByCid treats registry-resolved live nodes as mounted even without a matching DOM element', () => {
    const ctrl = createNopDebugger({ id: 'inspect-registry-without-dom', enabled: true });

    const mockHandle = {
      id: 'handle-103',
      name: 'runtimeForm',
      type: 'form',
      _cid: 103,
      _mounted: true
    };
    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) => cid === 103
        ? {
            kind: 'resolved',
            payload: {
              cid: 103,
              state: {
                mounted: true,
                metaState: {}
              }
            }
          }
        : { kind: 'notFound' },
      getHandleByCid: (cid: number) => (cid === 103 ? mockHandle : undefined)
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    expect(ctrl.inspectByCid(103)).toMatchObject({
      cid: 103,
      mounted: true,
      handleId: 'handle-103'
    });
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
            mounted: true
          },
          {
            cid: 105,
            id: 'stale-105',
            name: 'staleHandle',
            type: 'text',
            mounted: false
          }
        ]
      }),
      getHandleDebugData: (cid: number) => cid === 104
        ? {
            nodeId: 'user-form',
            path: 'body.0.form',
            rendererType: 'form',
            nodeInstance: {
              instancePath: [{ repeatedTemplateId: 'list', instanceKey: '0' }]
            }
          }
        : undefined
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    const result = ctrl.getComponentTree();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      cid: 104,
      type: 'form',
      label: 'user-form',
      path: 'body.0.form',
      mounted: true
    });
    expect(result[0]?.depth).toBeGreaterThan(0);
  });

  it('inspectNode resolves mounted handles by cid', () => {
    const ctrl = createNopDebugger({ id: 'inspect-node-by-cid', enabled: true });
    const mockHandle = {
      id: 'handle-106',
      name: 'locatorForm',
      type: 'form',
      _cid: 106,
      _mounted: true
    };
    const mockRegistry = {
      id: 'reg-1',
      getHandleByCid: (cid: number) => (cid === 106 ? mockHandle : undefined)
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    expect(ctrl.inspectNode(106)).toMatchObject({
      cid: 106,
      mounted: true,
      handleId: 'handle-106'
    });
  });

  it('inspectNode returns undefined when cid is not found', () => {
    const ctrl = createNopDebugger({ id: 'inspect-node-not-found', enabled: true });
    const mockRegistry = {
      id: 'reg-1',
      getHandleByCid: () => undefined
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    expect(ctrl.inspectNode(107)).toBeUndefined();
  });

  it('inspectByCid exposes nodeInstance-backed node state summary when present in debug data', () => {
    const ctrl = createNopDebugger({ id: 'inspect-node-instance-state', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '102');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      getHandleByCid: () => undefined,
      getHandleDebugData: (cid: number) => cid === 102
        ? {
            nodeInstance: {
              state: {
                mounted: true,
                metaState: {},
                propsState: undefined,
                metaDependencies: {
                  paths: ['record.name'],
                  wildcard: false,
                  broadAccess: false
                },
                propsDependencies: undefined
              }
            }
          }
        : undefined
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
        metaDependencyBroadAccess: false
      }
    });
  });

  it('inspectByCid falls back to resolved inspect payload data when registry debug data is sparse', () => {
    const ctrl = createNopDebugger({ id: 'inspect-resolved-fallbacks', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '103');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) => cid === 103
        ? {
            kind: 'resolved',
            payload: {
              cid: 103,
              state: {
                mounted: true,
                resolvedMeta: { visible: true, disabled: false },
                resolvedProps: { label: 'Username', value: 'alice' }
              },
              scopeChain: [
                { id: 'scope-103', path: '$form', label: '$form', data: { username: 'alice' } }
              ]
            }
          }
        : { kind: 'notFound' },
      getHandleByCid: () => undefined,
      getHandleDebugData: () => ({ nodeId: 'field-username', path: 'body.0', rendererType: 'input-text' })
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(103);

    expect(result).toMatchObject({
      scopeData: { username: 'alice' },
      metaSummary: { visible: true, disabled: false },
      propsSummary: { label: 'Username', value: 'alice' }
    });
  });

  it('explains value source, meta causality, failure, and async owners with bounded machine-oriented results', () => {
    const ctrl = createNopDebugger({ id: 'inspect-explanations', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '500');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) => cid === 500
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
                  broadAccess: false
                }
              },
              scopeChain: [
                { id: 'form-scope', path: '$form', label: '$form', data: { role: 'admin', username: 'alice' } }
              ]
            }
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
              submitting: false
            })
          }
        }
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
              broadAccess: false
            },
            propsDependencies: {
              paths: ['username'],
              wildcard: false,
              broadAccess: false
            }
          }
        }
      })
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
                timedOut: false
              },
              recentRuns: [
                {
                  ownerKind: 'validation',
                  ownerId: 'validation:form-scope:username',
                  scopeId: 'form-scope',
                  runId: 7,
                  cause: 'blur',
                  startedAt: 1,
                  outcome: 'failed'
                }
              ]
            }
          ]
        };
      }
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
        interactionId: 'interaction-1'
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
        interactionId: 'interaction-1'
      }
    );

    const valueExplanation = ctrl.explainNodeValue({ cid: 500, field: 'username' });
    expect(valueExplanation).toMatchObject({
      kind: 'value',
      data: {
        field: 'username',
        valueSource: 'form-state',
        value: 'alice'
      }
    });

    const metaExplanation = ctrl.explainNodeMeta({ cid: 500, field: 'visible' });
    expect(metaExplanation).toMatchObject({
      kind: 'meta',
      data: {
        field: 'visible',
        source: 'resolved-meta',
        dependencyPaths: ['role', 'currentUser.name']
      }
    });

    const failureExplanation = ctrl.explainNodeFailure({ cid: 500 });
    expect(failureExplanation).toMatchObject({
      kind: 'failure',
      data: {
        failureType: 'action-error',
        relatedEventIds: [3, 2]
      }
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
            currentRunId: 7
          }
        ]
      }
    });
  });

  it('inspectByElement uses registry inspect payload for instancePath and scopeChain when available', () => {
    const ctrl = createNopDebugger({ id: 'inspect-element-rich-payload', enabled: true });
    const owner = document.createElement('div');
    owner.setAttribute('data-cid', '210');
    const child = document.createElement('span');
    owner.appendChild(child);
    document.body.appendChild(owner);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) => cid === 210
        ? {
            kind: 'resolved',
            payload: {
              cid: 210,
              instancePath: [{ repeatedTemplateId: 'rows', instanceKey: '1' }],
              scopeChain: [
                { id: 'row-1', path: '$rows.1', label: '$rows.1', data: { id: 1 } }
              ],
              state: { mounted: true, metaState: {} }
            }
          }
        : { kind: 'notFound' },
      getHandleByCid: () => undefined
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    expect(ctrl.inspectByElement(child)).toMatchObject({
      cid: 210,
      mounted: true,
      instancePath: [{ repeatedTemplateId: 'rows', instanceKey: '1' }],
      scopeChain: [
        { id: 'row-1', path: '$rows.1', label: '$rows.1', data: { id: 1 } }
      ]
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
        submitting: false
      })
    };

    const mockHandle = {
      id: 'form-1',
      name: 'userForm',
      type: 'form',
      _cid: 200,
      _mounted: true,
      capabilities: { store: mockStore }
    };

    const mockRegistry = {
      id: 'reg-1',
      getHandleByCid: (cid: number) => (cid === 200 ? mockHandle : undefined)
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
      submitting: false
    });
    expect(result?.scopeData).toMatchObject({ username: 'Alice' });
  });

  it('fills tagName and className from element', () => {
    const ctrl = createNopDebugger({ id: 'inspect-dom', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '300');
    div.className = 'my-component active';
    document.body.appendChild(div);

    const result = ctrl.inspectByElement(div);
    expect(result).toMatchObject({
      cid: 300,
      mounted: true,
      tagName: 'div',
      className: 'my-component active'
    });
  });

  it('inspectByCid passes element to buildInspectResult for tagName', () => {
    const ctrl = createNopDebugger({ id: 'inspect-cid-element', enabled: true });
    const span = document.createElement('span');
    span.setAttribute('data-cid', '400');
    span.className = 'test-span';
    document.body.appendChild(span);

    const mockRegistry = { id: 'reg-1', getHandleByCid: () => undefined };
    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(400);
    expect(result).toMatchObject({
      cid: 400,
      mounted: true,
      tagName: 'span',
      className: 'test-span'
    });
  });
});
