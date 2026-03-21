import type {
  AmisDebugEvent,
  AmisDebugEventKind,
  AmisDebugEventQuery,
  AmisDebuggerFilterKind,
  AmisDebuggerOverview,
  AmisDebuggerSessionExport,
  AmisDebuggerSessionExportOptions,
  AmisDebuggerSnapshot,
  AmisDiagnosticReport,
  AmisDiagnosticReportOptions,
  AmisInteractionTrace,
  AmisInteractionTraceQuery,
  AmisNodeDiagnostics,
  AmisNodeDiagnosticsOptions
} from './types';
import type { NormalizedRedactionOptions } from './redaction';
import { redactData } from './redaction';

export const DEFAULT_FILTERS: AmisDebuggerFilterKind[] = ['render', 'action', 'api', 'compile', 'notify', 'error'];

function toArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value == null) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

function includesText(target: string | undefined, query: string) {
  return (target ?? '').toLowerCase().includes(query.toLowerCase());
}

function hasInteractionSelectors(query: AmisInteractionTraceQuery | undefined) {
  return query?.eventId != null || !!query?.requestKey || !!query?.actionType || !!query?.nodeId || !!query?.path;
}

function toEventQuery(query: AmisInteractionTraceQuery): AmisDebugEventQuery {
  return {
    requestKey: query.requestKey,
    actionType: query.actionType,
    nodeId: query.nodeId,
    path: query.path,
    sinceTimestamp: query.sinceTimestamp,
    untilTimestamp: query.untilTimestamp,
    limit: query.limit
  };
}

function findTraceAnchorEvent(events: AmisDebugEvent[], query: AmisInteractionTraceQuery) {
  if (query.eventId != null) {
    return events.find((event) => event.id === query.eventId);
  }

  return events.find((event) => event.group === 'error') ?? events.find((event) => event.group === 'api') ?? events.find((event) => event.group === 'action') ?? events[0];
}

function resolveInteractionTraceQuery(events: AmisDebugEvent[], query: AmisInteractionTraceQuery) {
  const shouldInfer = query.inferFromLatest ?? !hasInteractionSelectors(query);
  const anchorEvent = shouldInfer || query.eventId != null ? findTraceAnchorEvent(events, query) : undefined;
  const resolvedQuery: AmisInteractionTraceQuery = {
    ...query,
    requestKey: query.requestKey ?? anchorEvent?.requestKey,
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

export function matchesEventQuery(event: AmisDebugEvent, query: AmisDebugEventQuery | undefined) {
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
      includesText(event.requestKey, query.text);

    if (!matchesText) {
      return false;
    }
  }

  return true;
}

export function applyEventQuery(events: AmisDebugEvent[], query?: AmisDebugEventQuery) {
  const filtered = events.filter((event) => matchesEventQuery(event, query));

  if (query?.limit != null) {
    return filtered.slice(0, query.limit);
  }

  return filtered;
}

export function buildOverview(events: AmisDebugEvent[]): AmisDebuggerOverview {
  const latestByKind = (kind: AmisDebugEventKind) => events.find((event) => event.kind === kind);
  const countsByGroup = DEFAULT_FILTERS.reduce<Record<AmisDebuggerFilterKind, number>>((acc, filter) => {
    acc[filter] = events.filter((event) => event.group === filter).length;
    return acc;
  }, {
    render: 0,
    action: 0,
    api: 0,
    compile: 0,
    notify: 0,
    error: 0
  });

  return {
    latestCompile: latestByKind('compile:end'),
    latestAction: latestByKind('action:end'),
    latestApi: latestByKind('api:end') ?? latestByKind('api:abort') ?? latestByKind('api:start'),
    latestError: latestByKind('error'),
    errorCount: countsByGroup.error,
    totalEvents: events.length,
    countsByGroup
  };
}

export function createDiagnosticReport(
  controllerId: string,
  snapshot: AmisDebuggerSnapshot,
  options?: AmisDiagnosticReportOptions
): AmisDiagnosticReport {
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
    recentEvents
  };
}

export function buildNodeDiagnostics(events: AmisDebugEvent[], options: AmisNodeDiagnosticsOptions): AmisNodeDiagnostics {
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

  const countsByGroup = allMatchingEvents.reduce<Partial<Record<AmisDebuggerFilterKind, number>>>((acc, event) => {
    acc[event.group] = (acc[event.group] ?? 0) + 1;
    return acc;
  }, {});
  const countsByKind = allMatchingEvents.reduce<Partial<Record<AmisDebugEventKind, number>>>((acc, event) => {
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

export function buildInteractionTrace(events: AmisDebugEvent[], query: AmisInteractionTraceQuery): AmisInteractionTrace {
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
    actionTypes: Array.from(new Set(matchedEvents.map((event) => event.actionType).filter((value): value is string => !!value))),
    nodeIds: Array.from(new Set(matchedEvents.map((event) => event.nodeId).filter((value): value is string => !!value))),
    paths: Array.from(new Set(matchedEvents.map((event) => event.path).filter((value): value is string => !!value)))
  };
}

export function buildSessionExport(
  controllerId: string,
  sessionId: string,
  snapshot: AmisDebuggerSnapshot,
  redaction: NormalizedRedactionOptions,
  options?: AmisDebuggerSessionExportOptions
): AmisDebuggerSessionExport {
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
    }))
  };
}
