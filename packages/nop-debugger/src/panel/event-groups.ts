import type { NopDebugEvent, NopInteractionTrace } from '../types';

export type MergedRequest = {
  requestKey: string;
  startEvent?: NopDebugEvent;
  endEvent?: NopDebugEvent;
  abortEvent?: NopDebugEvent;
  status: 'pending' | 'completed' | 'failed' | 'aborted';
  durationMs?: number;
  summary: string;
};

export type ErrorGroup = {
  source: string;
  count: number;
  latestTimestamp: number;
  events: NopDebugEvent[];
};

export function formatTraceSummary(trace: NopInteractionTrace | undefined) {
  if (!trace || trace.totalEvents === 0) {
    return {
      headline: 'No correlated trace yet',
      detail: 'Run an action or request to infer the latest chain.',
    };
  }

  const anchor = trace.anchorEvent?.summary ?? trace.latestError?.summary ?? trace.latestApi?.summary ?? trace.latestAction?.summary ?? 'Recent interaction';
  const relatedBits = [
    trace.resolvedQuery.nodeId ? `node ${trace.resolvedQuery.nodeId}` : undefined,
    trace.resolvedQuery.actionType ? `action ${trace.resolvedQuery.actionType}` : undefined,
    trace.resolvedQuery.requestKey ? 'request linked' : undefined,
  ].filter(Boolean);

  return {
    headline: anchor,
    detail: `${trace.totalEvents} correlated event${trace.totalEvents === 1 ? '' : 's'}${relatedBits.length ? ` | ${relatedBits.join(' | ')}` : ''}`,
  };
}

export function mergeNetworkRequests(events: NopDebugEvent[]): MergedRequest[] {
  const map = new Map<string, MergedRequest>();

  for (const event of events) {
    const key = event.requestKey ?? event.summary;
    const existing = map.get(key);

    if (event.kind === 'api:start') {
      if (!existing) {
        map.set(key, {
          requestKey: key,
          startEvent: event,
          status: 'pending',
          summary: event.summary,
        });
      } else if (!existing.startEvent) {
        map.set(key, { ...existing, startEvent: event, summary: event.summary });
      }
    } else if (event.kind === 'api:end') {
      const base = existing ?? { requestKey: key, status: 'pending' as const, summary: event.summary };
      const ok = event.level === 'success' || event.level === 'info';
      map.set(key, {
        ...base,
        endEvent: event,
        status: ok ? 'completed' : 'failed',
        durationMs: event.durationMs,
        summary: base.summary ?? event.summary,
      });
    } else if (event.kind === 'api:abort') {
      const base = existing ?? { requestKey: key, status: 'pending' as const, summary: event.summary };
      map.set(key, {
        ...base,
        abortEvent: event,
        status: 'aborted',
        summary: base.summary ?? event.summary,
      });
    }
  }

  const results = Array.from(map.values());
  results.sort((left, right) => {
    if (left.status === 'pending' && right.status !== 'pending') return -1;
    if (right.status === 'pending' && left.status !== 'pending') return 1;
    const leftTime = left.endEvent?.timestamp ?? left.startEvent?.timestamp ?? 0;
    const rightTime = right.endEvent?.timestamp ?? right.startEvent?.timestamp ?? 0;
    return rightTime - leftTime;
  });

  return results;
}

export function groupErrors(events: NopDebugEvent[]): ErrorGroup[] {
  const groups = new Map<string, ErrorGroup>();

  for (const event of events) {
    if (event.group !== 'error' && event.level !== 'error' && event.level !== 'warning') {
      continue;
    }

    const key = event.source ?? 'unknown';
    const existing = groups.get(key);
    if (existing) {
      existing.count++;
      existing.events.push(event);
      if (event.timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = event.timestamp;
      }
    } else {
      groups.set(key, {
        source: key,
        count: 1,
        latestTimestamp: event.timestamp,
        events: [event],
      });
    }
  }

  return Array.from(groups.values()).sort((left, right) => right.latestTimestamp - left.latestTimestamp);
}
