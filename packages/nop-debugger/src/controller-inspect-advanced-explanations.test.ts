import { describe, expect, it } from 'vitest';
import { createNopDebugger } from './controller-inspect-advanced.test-support.js';

describe('controller inspector advanced explanations', () => {
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

    expect(ctrl.explainNodeValue({ cid: 500, field: 'username' })).toMatchObject({
      kind: 'value',
      data: {
        field: 'username',
        valueSource: 'form-state',
        value: 'alice',
      },
    });

    expect(ctrl.explainNodeMeta({ cid: 500, field: 'visible' })).toMatchObject({
      kind: 'meta',
      data: {
        field: 'visible',
        source: 'resolved-meta',
        dependencyPaths: ['role', 'currentUser.name'],
      },
    });

    expect(ctrl.explainNodeFailure({ cid: 500 })).toMatchObject({
      kind: 'failure',
      data: {
        failureType: 'action-error',
        relatedEventIds: [3, 2],
      },
    });

    expect(ctrl.explainNodeAsync({ cid: 500 })).toMatchObject({
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
