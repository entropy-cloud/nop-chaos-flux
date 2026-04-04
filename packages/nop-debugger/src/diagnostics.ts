import type {
  NopDebugEvent,
  NopDebugEventKind,
  NopDebugEventQuery,
  NopDebuggerFilterKind,
  NopDebuggerOverview,
  NopDebuggerPinnedErrors,
  NopDebuggerSessionExport,
  NopDebuggerSessionExportOptions,
  NopDebuggerSnapshot,
  NopDiagnosticReport,
  NopDiagnosticReportOptions,
  NopInteractionTrace,
  NopInteractionTraceQuery,
  NopDebuggerFailureSummary,
  NopNodeAnomalySummary,
  NopNodeDiagnostics,
  NopNodeDiagnosticsOptions
} from './types';
import type { NormalizedRedactionOptions } from './redaction';
import { redactData } from './redaction';

const EMPTY_PINNED_ERRORS: NopDebuggerPinnedErrors = { earliest: [], latest: [] };

export const DEFAULT_FILTERS: NopDebuggerFilterKind[] = ['render', 'action', 'api', 'compile', 'notify', 'error', 'node'];

function toArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value == null) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

function includesText(target: string | undefined, query: string) {
  return (target ?? '').toLowerCase().includes(query.toLowerCase());
}

function hasInteractionSelectors(query: NopInteractionTraceQuery | undefined) {
  return query?.eventId != null || !!query?.requestKey || !!query?.requestInstanceId || !!query?.interactionId || !!query?.actionType || !!query?.nodeId || !!query?.path;
}

function toEventQuery(query: NopInteractionTraceQuery): NopDebugEventQuery {
  return {
    requestKey: query.requestKey,
    requestInstanceId: query.requestInstanceId,
    interactionId: query.interactionId,
    actionType: query.actionType,
    nodeId: query.nodeId,
    path: query.path,
    sinceTimestamp: query.sinceTimestamp,
    untilTimestamp: query.untilTimestamp,
    limit: query.limit
  };
}

function findTraceAnchorEvent(events: NopDebugEvent[], query: NopInteractionTraceQuery) {
  if (query.eventId != null) {
    return events.find((event) => event.id === query.eventId);
  }

  return events.find((event) => event.group === 'error') ?? events.find((event) => event.group === 'api') ?? events.find((event) => event.group === 'action') ?? events[0];
}

function resolveInteractionTraceQuery(events: NopDebugEvent[], query: NopInteractionTraceQuery) {
  const shouldInfer = query.inferFromLatest ?? !hasInteractionSelectors(query);
  const anchorEvent = shouldInfer || query.eventId != null ? findTraceAnchorEvent(events, query) : undefined;
  const resolvedQuery: NopInteractionTraceQuery = {
    ...query,
    requestKey: query.requestKey ?? anchorEvent?.requestKey,
    requestInstanceId: query.requestInstanceId ?? anchorEvent?.requestInstanceId,
    interactionId: query.interactionId ?? anchorEvent?.interactionId,
    actionType: query.actionType ?? anchorEvent?.actionType,
    nodeId: query.nodeId ?? anchorEvent?.nodeId,
    path: query.path ?? anchorEvent?.path,
    mode: query.mode ?? (anchorEvent ? 'related' : 'exact')
  };

  return {
    anchorEvent,
    resolvedQuery
  };
}

export function matchesEventQuery(event: NopDebugEvent, query: NopDebugEventQuery | undefined) {
  if (!query) {
    return true;
  }

  const kinds = toArray(query.kind);
  if (kinds && !kinds.includes(event.kind)) {
    return false;
  }

  const groups = toArray(query.group);
  if (groups && !groups.includes(event.group)) {
    return false;
  }

  const levels = toArray(query.level);
  if (levels && !levels.includes(event.level)) {
    return false;
  }

  const sources = toArray(query.source);
  if (sources && !sources.includes(event.source)) {
    return false;
  }

  if (query.nodeId && event.nodeId !== query.nodeId) {
    return false;
  }

  if (query.path && event.path !== query.path) {
    return false;
  }

  if (query.rendererType && event.rendererType !== query.rendererType) {
    return false;
  }

  if (query.actionType && event.actionType !== query.actionType) {
    return false;
  }

  if (query.requestKey && event.requestKey !== query.requestKey) {
    return false;
  }

  if (query.requestInstanceId && event.requestInstanceId !== query.requestInstanceId) {
    return false;
  }

  if (query.interactionId && event.interactionId !== query.interactionId) {
    return false;
  }

  if (query.parentEventId != null && event.parentEventId !== query.parentEventId) {
    return false;
  }

  if (query.sinceTimestamp != null && event.timestamp < query.sinceTimestamp) {
    return false;
  }

  if (query.untilTimestamp != null && event.timestamp > query.untilTimestamp) {
    return false;
  }

  if (query.text) {
    const matchesText =
      includesText(event.summary, query.text) ||
      includesText(event.detail, query.text) ||
      includesText(event.source, query.text) ||
      includesText(event.path, query.text) ||
      includesText(event.nodeId, query.text) ||
      includesText(event.requestKey, query.text) ||
      includesText(event.requestInstanceId, query.text) ||
      includesText(event.interactionId, query.text);

    if (!matchesText) {
      return false;
    }
  }

  return true;
}

export function applyEventQuery(events: NopDebugEvent[], query?: NopDebugEventQuery) {
  const filtered = events.filter((event) => matchesEventQuery(event, query));

  if (query?.limit != null) {
    return filtered.slice(0, query.limit);
  }

  return filtered;
}

export function buildOverview(events: NopDebugEvent[]): NopDebuggerOverview {
  const latestByKind = (kind: NopDebugEventKind) => events.find((event) => event.kind === kind);
  const countsByGroup = DEFAULT_FILTERS.reduce<Record<NopDebuggerFilterKind, number>>((acc, filter) => {
    acc[filter] = events.filter((event) => event.group === filter).length;
    return acc;
  }, {
    render: 0,
    action: 0,
    api: 0,
    compile: 0,
    notify: 0,
    error: 0,
    node: 0
  });

  const renderEndEvents = events.filter((event) => event.kind === 'render:end');
  const slowestRenderMs = renderEndEvents.length > 0
    ? Math.max(...renderEndEvents.map((event) => event.durationMs ?? 0))
    : undefined;

  return {
    latestCompile: latestByKind('compile:end'),
    latestAction: latestByKind('action:end'),
    latestApi: latestByKind('api:end') ?? latestByKind('api:abort') ?? latestByKind('api:start'),
    latestError: latestByKind('error'),
    errorCount: countsByGroup.error,
    totalEvents: events.length,
    countsByGroup,
    slowestRenderMs
  };
}

export function createDiagnosticReport(
  controllerId: string,
  snapshot: NopDebuggerSnapshot,
  options?: NopDiagnosticReportOptions
): NopDiagnosticReport {
  const recentEvents = applyEventQuery(snapshot.events, {
    ...options?.query,
    limit: options?.eventLimit ?? options?.query?.limit ?? 20
  });
  const overview = buildOverview(snapshot.events);
  const latestInteractionTrace = options?.includeLatestInteractionTrace === false || snapshot.events.length === 0
    ? undefined
    : buildInteractionTrace(snapshot.events, {
        inferFromLatest: true,
        limit: 20,
        ...options?.latestInteractionTraceQuery
      });

  return {
    controllerId,
    sessionId: recentEvents[0]?.sessionId ?? snapshot.events[0]?.sessionId ?? 'unknown',
    generatedAt: Date.now(),
    snapshot: {
      enabled: snapshot.enabled,
      panelOpen: snapshot.panelOpen,
      paused: snapshot.paused,
      activeTab: snapshot.activeTab,
      filters: snapshot.filters
    },
    overview,
    latestError: overview.latestError,
    latestAction: overview.latestAction,
    latestApi: overview.latestApi,
    latestInteractionTrace,
    recentEvents,
    pinnedErrors: snapshot.pinnedErrors ?? EMPTY_PINNED_ERRORS
  };
}

export function buildNodeDiagnostics(events: NopDebugEvent[], options: NopNodeDiagnosticsOptions): NopNodeDiagnostics {
  const recentEvents = applyEventQuery(events, {
    nodeId: options.nodeId,
    path: options.path,
    limit: options.limit ?? 20
  });
  const allMatchingEvents = events.filter((event) => {
    if (options.nodeId && event.nodeId !== options.nodeId) {
      return false;
    }

    if (options.path && event.path !== options.path) {
      return false;
    }

    return true;
  });

  const countsByGroup = allMatchingEvents.reduce<Partial<Record<NopDebuggerFilterKind, number>>>((acc, event) => {
    acc[event.group] = (acc[event.group] ?? 0) + 1;
    return acc;
  }, {});
  const countsByKind = allMatchingEvents.reduce<Partial<Record<NopDebugEventKind, number>>>((acc, event) => {
    acc[event.kind] = (acc[event.kind] ?? 0) + 1;
    return acc;
  }, {});
  const rendererTypes = Array.from(new Set(allMatchingEvents.map((event) => event.rendererType).filter((value): value is string => !!value)));

  return {
    nodeId: options.nodeId ?? allMatchingEvents[0]?.nodeId,
    path: options.path ?? allMatchingEvents[0]?.path,
    rendererTypes,
    totalEvents: allMatchingEvents.length,
    countsByGroup,
    countsByKind,
    latestRender: allMatchingEvents.find((event) => event.group === 'render'),
    latestAction: allMatchingEvents.find((event) => event.group === 'action'),
    latestApi: allMatchingEvents.find((event) => event.group === 'api'),
    latestError: allMatchingEvents.find((event) => event.group === 'error'),
    recentEvents
  };
}

export function buildInteractionTrace(events: NopDebugEvent[], query: NopInteractionTraceQuery): NopInteractionTrace {
  const { anchorEvent, resolvedQuery } = resolveInteractionTraceQuery(events, query);
  const mode = resolvedQuery.mode ?? 'exact';
  const baseLimit = resolvedQuery.limit ?? 40;
  const matchedEvents = mode === 'related'
    ? applyEventQuery(events, {
        sinceTimestamp: resolvedQuery.sinceTimestamp,
        untilTimestamp: resolvedQuery.untilTimestamp
      }).filter((event) => {
        if (anchorEvent && event.id === anchorEvent.id) {
          return true;
        }

        const matches = [
          resolvedQuery.interactionId != null && event.interactionId === resolvedQuery.interactionId,
          resolvedQuery.requestInstanceId != null && event.requestInstanceId === resolvedQuery.requestInstanceId,
          resolvedQuery.requestKey != null && event.requestKey === resolvedQuery.requestKey,
          resolvedQuery.actionType != null && event.actionType === resolvedQuery.actionType,
          resolvedQuery.nodeId != null && event.nodeId === resolvedQuery.nodeId,
          resolvedQuery.path != null && event.path === resolvedQuery.path
        ].filter(Boolean);

        if (matches.length === 0) {
          return false;
        }

        return matches.some(Boolean);
      }).slice(0, baseLimit)
    : applyEventQuery(events, {
        ...toEventQuery(resolvedQuery),
        limit: baseLimit
      });
  const relatedErrors = matchedEvents.filter((event) => event.group === 'error');

  return {
    query,
    resolvedQuery,
    anchorEvent,
    totalEvents: matchedEvents.length,
    matchedEvents,
    relatedErrors,
    latestAction: matchedEvents.find((event) => event.group === 'action'),
    latestApi: matchedEvents.find((event) => event.group === 'api'),
    latestError: matchedEvents.find((event) => event.group === 'error'),
    requestKeys: Array.from(new Set(matchedEvents.map((event) => event.requestKey).filter((value): value is string => !!value))),
    requestInstanceIds: Array.from(new Set(matchedEvents.map((event) => event.requestInstanceId).filter((value): value is string => !!value))),
    interactionIds: Array.from(new Set(matchedEvents.map((event) => event.interactionId).filter((value): value is string => !!value))),
    actionTypes: Array.from(new Set(matchedEvents.map((event) => event.actionType).filter((value): value is string => !!value))),
    nodeIds: Array.from(new Set(matchedEvents.map((event) => event.nodeId).filter((value): value is string => !!value))),
    paths: Array.from(new Set(matchedEvents.map((event) => event.path).filter((value): value is string => !!value)))
  };
}

function createFailureHints(event: NopDebugEvent | undefined, relatedEvents: NopDebugEvent[] = []): string[] {
  if (!event) {
    return [];
  }

  const hints: string[] = [];

  if (event.kind === 'api:abort') {
    hints.push('request aborted');
  }

  if (event.group === 'api' && event.level === 'error') {
    hints.push('request failed');
  }

  if (event.group === 'error' && relatedEvents.some((candidate) => candidate.group === 'api' && candidate.level === 'error')) {
    hints.push('action ended with error after api failure');
  }

  if (relatedEvents.filter((candidate) => candidate.kind === 'render:start').length >= 3) {
    hints.push('repeated render bursts');
  }

  return hints;
}

export function getLatestFailedRequest(events: NopDebugEvent[]): NopDebuggerFailureSummary | undefined {
  const event = events.find((candidate) => candidate.group === 'api' && (candidate.level === 'error' || candidate.kind === 'api:abort'));

  if (!event) {
    return undefined;
  }

  return {
    event,
    requestInstanceId: event.requestInstanceId,
    interactionId: event.interactionId,
    nodeId: event.nodeId,
    path: event.path,
    actionType: event.actionType,
    requestKey: event.requestKey,
    hints: createFailureHints(event)
  };
}

export function getLatestFailedAction(events: NopDebugEvent[]): NopDebuggerFailureSummary | undefined {
  const event = events.find((candidate) => candidate.group === 'error' || (candidate.group === 'action' && candidate.level === 'error'));

  if (!event) {
    return undefined;
  }

  const relatedEvents = buildInteractionTrace(events, {
    eventId: event.id,
    inferFromLatest: false,
    mode: 'related',
    limit: 20
  }).matchedEvents;

  return {
    event,
    requestInstanceId: event.requestInstanceId,
    interactionId: event.interactionId,
    nodeId: event.nodeId,
    path: event.path,
    actionType: event.actionType,
    requestKey: event.requestKey,
    hints: createFailureHints(event, relatedEvents)
  };
}

export function getNodeAnomalies(events: NopDebugEvent[], options: NopNodeDiagnosticsOptions): NopNodeAnomalySummary | undefined {
  const diagnostics = buildNodeDiagnostics(events, {
    ...options,
    limit: options.limit ?? 10
  });

  if (diagnostics.totalEvents === 0) {
    return undefined;
  }

  const hints: string[] = [];

  if ((diagnostics.countsByGroup.error ?? 0) > 0) {
    hints.push('node has recent errors');
  }

  if ((diagnostics.countsByGroup.api ?? 0) > 1 && diagnostics.recentEvents.some((event) => event.kind === 'api:abort')) {
    hints.push('request churn or aborts');
  }

  if (diagnostics.recentEvents.filter((event) => event.kind === 'render:start').length >= 3) {
    hints.push('repeated render bursts');
  }

  return {
    nodeId: diagnostics.nodeId,
    path: diagnostics.path,
    recentEvents: diagnostics.recentEvents,
    hints
  };
}

export function getRecentFailures(events: NopDebugEvent[], options?: { sinceTimestamp?: number; limit?: number }): NopDebuggerFailureSummary[] {
  return applyEventQuery(events, {
    sinceTimestamp: options?.sinceTimestamp,
    limit: options?.limit ?? 10
  })
    .filter((event) => event.group === 'error' || (event.group === 'api' && (event.level === 'error' || event.kind === 'api:abort')))
    .map((event) => ({
      event,
      requestInstanceId: event.requestInstanceId,
      interactionId: event.interactionId,
      nodeId: event.nodeId,
      path: event.path,
      actionType: event.actionType,
      requestKey: event.requestKey,
      hints: createFailureHints(event)
    }));
}

export function buildSessionExport(
  controllerId: string,
  sessionId: string,
  snapshot: NopDebuggerSnapshot,
  redaction: NormalizedRedactionOptions,
  options?: NopDebuggerSessionExportOptions
): NopDebuggerSessionExport {
  const events = applyEventQuery(snapshot.events, {
    ...options?.query,
    limit: options?.eventLimit ?? options?.query?.limit
  });
  const overview = buildOverview(snapshot.events);

  return {
    controllerId,
    sessionId,
    generatedAt: Date.now(),
    snapshot: {
      ...snapshot,
      events: snapshot.events.map((event) => ({
        ...event,
        exportedData: redactData(event.exportedData, redaction)
      }))
    },
    overview,
    latestError: overview.latestError,
    latestAction: overview.latestAction,
    latestApi: overview.latestApi,
    events: events.map((event) => ({
      ...event,
      exportedData: redactData(event.exportedData, redaction)
    })),
    pinnedErrors: snapshot.pinnedErrors ?? EMPTY_PINNED_ERRORS
  };
}
