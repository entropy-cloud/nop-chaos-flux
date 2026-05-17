// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { createNopDebugger } from './controller-inspect-advanced.test-support.js';

describe('controller inspector advanced DOM and registry lookup', () => {
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

  it('inspectByCid preserves observable trace when capability-store enrichment throws', () => {
    const ctrl = createNopDebugger({ id: 'inspect-enrichment-failure', enabled: true });
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    ctrl.setComponentRegistry({
      id: 'reg-enrichment',
      getHandleByCid: () => ({
        id: 'handle-800',
        name: 'form',
        type: 'form',
        capabilities: {
          store: {
            getState() {
              throw new Error('store exploded');
            },
          },
        },
      }),
      getHandleDebugData: () => undefined,
    } as never);

    const result = ctrl.inspectByCid(800);

    expect(result).toMatchObject({ cid: 800, mounted: true, handleId: 'handle-800' });
    expect(consoleWarn).toHaveBeenCalledWith(
      '[nop-debugger] inspector enrichment failed',
      expect.any(Error),
    );

    consoleWarn.mockRestore();
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
});
