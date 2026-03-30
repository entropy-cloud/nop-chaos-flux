import { describe, expect, it } from 'vitest';
import {
  applyEventQuery,
  buildInteractionTrace,
  buildNodeDiagnostics,
  buildOverview,
  buildSessionExport,
  createDiagnosticReport,
  matchesEventQuery
} from './diagnostics';
import { normalizeRedactionOptions } from './redaction';
import type { NopDebugEvent, NopDebuggerSnapshot } from './types';

function createEvent(overrides: Partial<NopDebugEvent>): NopDebugEvent {
  return {
    id: 1,
    sessionId: 'session-1',
    timestamp: 100,
    kind: 'notify',
    group: 'notify',
    level: 'info',
    source: 'test',
    summary: 'event',
    ...overrides
  };
}

function createSnapshot(events: NopDebugEvent[]): NopDebuggerSnapshot {
  return {
    enabled: true,
    panelOpen: true,
    minimized: false,
    paused: false,
    activeTab: 'timeline',
    position: { x: 1, y: 2 },
    events,
    filters: ['render', 'action', 'api', 'compile', 'notify', 'error'],
    pinnedErrors: { earliest: [], latest: [] }
  };
}

describe('diagnostics helpers', () => {
  it('matches and filters events across structured query fields', () => {
    const apiEvent = createEvent({
      id: 2,
      timestamp: 220,
      kind: 'api:end',
      group: 'api',
      level: 'success',
      source: 'fetcher',
      summary: 'POST /api/users -> 200',
      detail: 'response object',
      nodeId: 'node-1',
      path: 'body.0',
      rendererType: 'form',
      actionType: 'submitForm',
      requestKey: 'POST /api/users | node-1 | body.0'
    });
    const errorEvent = createEvent({
      id: 3,
      timestamp: 260,
      kind: 'error',
      group: 'error',
      level: 'error',
      source: 'monitor.onError',
      summary: 'submit failed',
      detail: 'Validation exploded',
      nodeId: 'node-1',
      path: 'body.0'
    });
    const otherEvent = createEvent({
      id: 4,
      timestamp: 320,
      kind: 'render:end',
      group: 'render',
      level: 'success',
      source: 'monitor.onRenderEnd',
      summary: 'table rendered',
      nodeId: 'node-2',
      path: 'body.3',
      rendererType: 'table'
    });
    const events = [otherEvent, errorEvent, apiEvent];

    expect(matchesEventQuery(apiEvent, {
      kind: ['api:start', 'api:end'],
      group: 'api',
      level: 'success',
      source: 'fetcher',
      nodeId: 'node-1',
      path: 'body.0',
      rendererType: 'form',
      actionType: 'submitForm',
      requestKey: 'POST /api/users | node-1 | body.0',
      text: '/API/USERS',
      sinceTimestamp: 200,
      untilTimestamp: 240
    })).toBe(true);
    expect(matchesEventQuery(apiEvent, { text: 'missing' })).toBe(false);
    expect(matchesEventQuery(apiEvent, { sinceTimestamp: 221 })).toBe(false);

    expect(applyEventQuery(events, {
      nodeId: 'node-1',
      text: 'submit',
      limit: 1
    })).toEqual([errorEvent]);
    expect(applyEventQuery(events, { group: ['api', 'error'] })).toEqual([errorEvent, apiEvent]);
  });

  it('builds overview, reports, node diagnostics, and traces from ordered events', () => {
    const events = [
      createEvent({
        id: 10,
        timestamp: 500,
        kind: 'error',
        group: 'error',
        level: 'error',
        source: 'root.onActionError',
        summary: 'submit failed',
        nodeId: 'node-1',
        path: 'body.0'
      }),
      createEvent({
        id: 9,
        timestamp: 480,
        kind: 'api:abort',
        group: 'api',
        level: 'warning',
        source: 'fetcher',
        summary: 'POST /api/users aborted',
        requestKey: 'POST /api/users | node-1 | body.0',
        nodeId: 'node-1',
        path: 'body.0',
        actionType: 'submitForm'
      }),
      createEvent({
        id: 8,
        timestamp: 460,
        kind: 'action:end',
        group: 'action',
        level: 'success',
        source: 'monitor.onActionEnd',
        summary: 'submitForm ok in 8ms',
        actionType: 'submitForm',
        nodeId: 'node-1',
        path: 'body.0'
      }),
      createEvent({
        id: 7,
        timestamp: 440,
        kind: 'render:end',
        group: 'render',
        level: 'success',
        source: 'monitor.onRenderEnd',
        summary: 'form rendered',
        rendererType: 'form',
        nodeId: 'node-1',
        path: 'body.0'
      }),
      createEvent({
        id: 6,
        timestamp: 420,
        kind: 'compile:end',
        group: 'compile',
        level: 'success',
        source: 'plugin.afterCompile',
        summary: 'compile ready',
        rendererType: 'page',
        path: 'root'
      }),
      createEvent({
        id: 5,
        timestamp: 400,
        kind: 'notify',
        group: 'notify',
        level: 'warning',
        source: 'env.notify',
        summary: 'warning: duplicate username'
      })
    ];
    const snapshot = createSnapshot(events);
    const overview = buildOverview(events);

    expect(overview).toMatchObject({
      latestCompile: { kind: 'compile:end' },
      latestAction: { kind: 'action:end', actionType: 'submitForm' },
      latestApi: { kind: 'api:abort' },
      latestError: { kind: 'error' },
      errorCount: 1,
      totalEvents: 6
    });
    expect(overview.countsByGroup).toEqual({
      render: 1,
      action: 1,
      api: 1,
      compile: 1,
      notify: 1,
      error: 1,
      node: 0
    });

    const report = createDiagnosticReport('controller-a', snapshot, {
      query: { nodeId: 'node-1' },
      eventLimit: 2,
      includeLatestInteractionTrace: true
    });
    expect(report.controllerId).toBe('controller-a');
    expect(report.sessionId).toBe('session-1');
    expect(report.recentEvents).toHaveLength(2);
    expect(report.latestApi?.kind).toBe('api:abort');
    expect(report.latestInteractionTrace?.anchorEvent?.kind).toBe('error');
    expect(report.latestInteractionTrace?.resolvedQuery.mode).toBe('related');

    const nodeDiagnostics = buildNodeDiagnostics(events, { nodeId: 'node-1', limit: 3 });
    expect(nodeDiagnostics).toMatchObject({
      nodeId: 'node-1',
      path: 'body.0',
      totalEvents: 4,
      latestRender: { kind: 'render:end' },
      latestAction: { kind: 'action:end' },
      latestApi: { kind: 'api:abort' },
      latestError: { kind: 'error' }
    });
    expect(nodeDiagnostics.rendererTypes).toEqual(['form']);
    expect(nodeDiagnostics.recentEvents).toHaveLength(3);

    const trace = buildInteractionTrace(events, {
      nodeId: 'node-1',
      path: 'body.0'
    });
    expect(trace.totalEvents).toBe(4);
    expect(trace.relatedErrors).toHaveLength(1);
    expect(trace.latestAction?.kind).toBe('action:end');
    expect(trace.latestApi?.kind).toBe('api:abort');
    expect(trace.latestError?.kind).toBe('error');
    expect(trace.requestKeys).toEqual(['POST /api/users | node-1 | body.0']);
    expect(trace.actionTypes).toEqual(['submitForm']);
    expect(trace.nodeIds).toEqual(['node-1']);
    expect(trace.paths).toEqual(['body.0']);

    const inferredTrace = buildInteractionTrace(events, {
      inferFromLatest: true,
      limit: 10
    });
    expect(inferredTrace.anchorEvent?.kind).toBe('error');
    expect(inferredTrace.resolvedQuery).toMatchObject({
      nodeId: 'node-1',
      path: 'body.0',
      mode: 'related'
    });
    expect(inferredTrace.totalEvents).toBe(4);

    const eventAnchoredTrace = buildInteractionTrace(events, {
      eventId: 9,
      mode: 'exact'
    });
    expect(eventAnchoredTrace.anchorEvent?.id).toBe(9);
    expect(eventAnchoredTrace.resolvedQuery).toMatchObject({
      eventId: 9,
      requestKey: 'POST /api/users | node-1 | body.0',
      actionType: 'submitForm',
      nodeId: 'node-1',
      path: 'body.0',
      mode: 'exact'
    });
    expect(eventAnchoredTrace.totalEvents).toBe(1);
    expect(eventAnchoredTrace.matchedEvents[0].id).toBe(9);
  });

  it('builds redacted session exports and handles empty reports', () => {
    const apiEndEvent = createEvent({
      id: 20,
      timestamp: 700,
      kind: 'api:end',
      group: 'api',
      level: 'success',
      source: 'fetcher',
      summary: 'POST /api/secure -> 200',
      requestKey: 'POST /api/secure | node-1 | body.0',
      exportedData: {
        token: 'super-secret',
        nested: {
          password: '123456'
        },
        safe: 'visible'
      }
    });
    const notifyEvent = createEvent({
      id: 19,
      timestamp: 650,
      kind: 'notify',
      group: 'notify',
      level: 'info',
      source: 'env.notify',
      summary: 'info: hi'
    });
    const snapshot = createSnapshot([apiEndEvent, notifyEvent]);
    const redaction = normalizeRedactionOptions({
      redactKeys: ['token', 'password'],
      mask: '[MASKED]'
    });

    const exported = buildSessionExport('controller-a', 'session-export', snapshot, redaction, {
      query: { kind: 'api:end' },
      eventLimit: 1
    });
    expect(exported.controllerId).toBe('controller-a');
    expect(exported.sessionId).toBe('session-export');
    expect(exported.events).toHaveLength(1);
    expect(exported.events[0].exportedData).toEqual({
      token: '[MASKED]',
      nested: {
        password: '[MASKED]'
      },
      safe: 'visible'
    });
    expect(exported.snapshot.events[0].exportedData).toEqual({
      token: '[MASKED]',
      nested: {
        password: '[MASKED]'
      },
      safe: 'visible'
    });

    const emptyReport = createDiagnosticReport('controller-empty', createSnapshot([]));
    expect(emptyReport.sessionId).toBe('unknown');
    expect(emptyReport.recentEvents).toEqual([]);
  });
});
