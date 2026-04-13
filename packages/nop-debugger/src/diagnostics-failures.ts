import type {
  NopDebugEvent,
  NopDebuggerFailureSummary,
  NopDebuggerPinnedErrors,
  NopDebuggerSessionExport,
  NopDebuggerSessionExportOptions,
  NopDebuggerSnapshot,
  NopNodeAnomalySummary,
  NopNodeDiagnosticsOptions
} from './types';
import type { NormalizedRedactionOptions } from './redaction';
import { redactData } from './redaction';
import { applyEventQuery, buildInteractionTrace, buildNodeDiagnostics, buildOverview } from './diagnostics';

const EMPTY_PINNED_ERRORS: NopDebuggerPinnedErrors = { earliest: [], latest: [] };

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
