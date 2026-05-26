import type {
  NopDebuggerPinnedErrors,
  NopDebuggerSnapshot,
  NopDiagnosticReport,
  NopDiagnosticReportOptions,
} from './types.js';
import { applyEventQuery, buildInteractionTrace, buildOverview } from './diagnostics-core.js';

export {
  DEFAULT_FILTERS,
  applyEventQuery,
  buildInteractionTrace,
  buildNodeDiagnostics,
  buildOverview,
  matchesEventQuery,
} from './diagnostics-core.js';

export {
  getLatestFailedRequest,
  getLatestFailedAction,
  getNodeAnomalies,
  getRecentFailures,
  buildSessionExport,
} from './diagnostics-failures.js';

const EMPTY_PINNED_ERRORS: NopDebuggerPinnedErrors = { earliest: [], latest: [] };


export function createDiagnosticReport(
  controllerId: string,
  snapshot: NopDebuggerSnapshot,
  options?: NopDiagnosticReportOptions,
): NopDiagnosticReport {
  const recentEvents = applyEventQuery(snapshot.events, {
    ...options?.query,
    limit: options?.eventLimit ?? options?.query?.limit ?? 20,
  });
  const overview = buildOverview(snapshot.events);
  const latestInteractionTrace =
    options?.includeLatestInteractionTrace === false || snapshot.events.length === 0
      ? undefined
      : buildInteractionTrace(snapshot.events, {
          inferFromLatest: true,
          limit: 20,
          ...options?.latestInteractionTraceQuery,
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
      filters: snapshot.filters,
    },
    overview,
    latestError: overview.latestError,
    latestAction: overview.latestAction,
    latestApi: overview.latestApi,
    latestInteractionTrace,
    recentEvents,
    pinnedErrors: snapshot.pinnedErrors ?? EMPTY_PINNED_ERRORS,
  };
}
