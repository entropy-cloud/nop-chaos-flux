import type { AsyncOwnerDebugSnapshot } from '@nop-chaos/flux-core';
import { redactData } from './redaction';
import type { NormalizedRedactionOptions } from './redaction';
import { buildInteractionTrace } from './diagnostics';
import { getLatestFailedAction } from './diagnostics-failures';
import type {
  NopComponentInspectResult,
  NopDebugEvent,
  NopDebuggerEvidenceRef,
  NopNodeAsyncExplanation,
  NopNodeAsyncExplanationQuery,
  NopNodeFailureExplanation,
  NopNodeFailureExplanationQuery,
  NopNodeMetaExplanation,
  NopNodeMetaExplanationField,
  NopNodeMetaExplanationQuery,
  NopNodeValueExplanation,
  NopNodeValueExplanationQuery,
  NopScopeChainEntry
} from './types';

const MAX_EVIDENCE = 6;
const MAX_DEPENDENCY_PATHS = 6;
const MAX_ASYNC_OWNERS = 4;
const MAX_RELATED_EVENTS = 6;

function matchesSensitiveKey(key: string, redaction: NormalizedRedactionOptions) {
  const normalizedKey = key.toLowerCase();
  return redaction.redactKeys.some((candidate) => normalizedKey.includes(candidate.toLowerCase()));
}

function redactFieldValue(field: string, value: unknown, redaction: NormalizedRedactionOptions) {
  if (!redaction.enabled || !matchesSensitiveKey(field, redaction)) {
    return redactData(value, redaction);
  }

  return redaction.redactValue?.({
    key: field,
    path: [field],
    value
  }) ?? redaction.mask;
}

function summarizeValue(value: unknown) {
  if (typeof value === 'string') {
    return value.length > 60 ? `${value.slice(0, 57)}...` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value == null) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }

  if (typeof value === 'object') {
    return `object(${Object.keys(value as Record<string, unknown>).length})`;
  }

  return typeof value;
}

function summarizeScopeEntry(entry: NopScopeChainEntry) {
  return entry.path || entry.label || entry.id || 'scope';
}

function getNodeStateDebugData(inspect: NopComponentInspectResult | undefined) {
  const debugData = inspect?.debugData as
    | {
        nodeState?: {
          metaDependencyPaths?: unknown;
          metaDependencyWildcard?: unknown;
        };
      }
    | undefined;

  return debugData?.nodeState;
}

function getDependencyPaths(dependencyPaths: unknown, wildcard: unknown) {
  const paths = Array.isArray(dependencyPaths)
    ? dependencyPaths.filter((value): value is string => typeof value === 'string')
    : [];

  if (paths.length === 0 && !wildcard) {
    return {
      paths: [] as string[],
      truncated: false
    };
  }

  const extra = wildcard ? ['*'] : [];
  const rawPaths = [...paths, ...extra];
  return {
    paths: rawPaths.slice(0, MAX_DEPENDENCY_PATHS),
    truncated: rawPaths.length > MAX_DEPENDENCY_PATHS
  };
}

function pushEvidence(target: NopDebuggerEvidenceRef[], entry: NopDebuggerEvidenceRef) {
  if (target.length < MAX_EVIDENCE) {
    target.push(entry);
    return false;
  }

  return true;
}

function getNodeSubject(inspect: NopComponentInspectResult | undefined) {
  return {
    cid: inspect?.cid,
    nodeId: inspect?.nodeId,
    path: inspect?.path
  };
}

function getNodeRelated(inspect: NopComponentInspectResult | undefined) {
  return {
    cid: inspect?.cid,
    nodeId: inspect?.nodeId,
    path: inspect?.path
  };
}

function buildMissingInspectValueExplanation(query: NopNodeValueExplanationQuery): NopNodeValueExplanation {
  return {
    kind: 'value',
    subject: { cid: query.cid, field: query.field ?? 'value' },
    answer: 'Node inspect data is unavailable, so value origin cannot be explained yet.',
    confidence: 'low',
    limitations: ['The node is not currently inspectable through the debugger component registry.'],
    evidenceRefs: [],
    related: { cid: query.cid },
    truncated: false,
    data: {
      field: query.field ?? 'value',
      valueSource: 'unknown'
    }
  };
}

export function explainNodeValue(args: {
  query: NopNodeValueExplanationQuery;
  inspect: NopComponentInspectResult | undefined;
  redaction: NormalizedRedactionOptions;
}): NopNodeValueExplanation {
  const { query, inspect, redaction } = args;

  if (!inspect) {
    return buildMissingInspectValueExplanation(query);
  }

  const field = query.field ?? 'value';
  const evidenceRefs: NopDebuggerEvidenceRef[] = [];
  const limitations: string[] = [];
  let truncated = false;

  let value = inspect.formState?.values?.[field];
  let valueSource: NopNodeValueExplanation['data']['valueSource'] = 'form-state';
  let scopeLabel: string | undefined;

  if (value !== undefined) {
    truncated ||= pushEvidence(evidenceRefs, {
      kind: 'form-state',
      summary: `form state contains ${field}`,
      cid: inspect.cid,
      nodeId: inspect.nodeId,
      path: inspect.path
    });
  } else {
    const directScopeHit = inspect.scopeData && Object.prototype.hasOwnProperty.call(inspect.scopeData, field);
    if (directScopeHit) {
      value = inspect.scopeData?.[field];
      valueSource = 'current-scope';
      scopeLabel = inspect.scopeChain?.[0] ? summarizeScopeEntry(inspect.scopeChain[0]) : undefined;
      truncated ||= pushEvidence(evidenceRefs, {
        kind: 'scope',
        summary: `${field} resolved from current scope snapshot`,
        cid: inspect.cid,
        nodeId: inspect.nodeId,
        path: inspect.path
      });
    } else {
      const scopeIndex = inspect.scopeChain?.findIndex((entry) => Object.prototype.hasOwnProperty.call(entry.data, field)) ?? -1;
      if (scopeIndex >= 0) {
        value = inspect.scopeChain?.[scopeIndex]?.data?.[field];
        scopeLabel = inspect.scopeChain?.[scopeIndex] ? summarizeScopeEntry(inspect.scopeChain[scopeIndex]) : undefined;
        valueSource = scopeIndex === 0 ? 'current-scope' : 'ancestor-scope';
        truncated ||= pushEvidence(evidenceRefs, {
          kind: 'scope',
          summary: `${field} resolved from ${scopeLabel ?? 'scope chain'}`,
          cid: inspect.cid,
          nodeId: inspect.nodeId,
          path: inspect.path
        });
      } else if (inspect.propsSummary && Object.prototype.hasOwnProperty.call(inspect.propsSummary, field)) {
        value = inspect.propsSummary[field];
        valueSource = 'resolved-props';
        truncated ||= pushEvidence(evidenceRefs, {
          kind: 'props',
          summary: `${field} exists in resolved props snapshot`,
          cid: inspect.cid,
          nodeId: inspect.nodeId,
          path: inspect.path
        });
      } else if (inspect.metaSummary && Object.prototype.hasOwnProperty.call(inspect.metaSummary, field)) {
        value = inspect.metaSummary[field];
        valueSource = 'resolved-meta';
        truncated ||= pushEvidence(evidenceRefs, {
          kind: 'meta',
          summary: `${field} exists in resolved meta snapshot`,
          cid: inspect.cid,
          nodeId: inspect.nodeId,
          path: inspect.path
        });
      } else {
        valueSource = 'unknown';
        limitations.push(`The debugger snapshot does not expose a reliable current source for ${field}.`);
      }
    }
  }

  const redactedValue = redactFieldValue(field, value, redaction);
  const answer = valueSource === 'unknown'
    ? `${field} is not reliably explainable from the current debugger snapshot.`
    : `${field} currently comes from ${valueSource} and resolves to ${summarizeValue(redactedValue)}.`;

  return {
    kind: 'value',
    subject: {
      ...getNodeSubject(inspect),
      field
    },
    answer,
    confidence: valueSource === 'unknown' ? 'low' : valueSource === 'ancestor-scope' || valueSource === 'resolved-props' ? 'medium' : 'high',
    limitations,
    evidenceRefs,
    related: getNodeRelated(inspect),
    truncated,
    data: {
      field,
      valueSource,
      value: redactedValue,
      scopeLabel
    }
  };
}

function readMetaField(inspect: NopComponentInspectResult, field: NopNodeMetaExplanationField) {
  if (field in (inspect.metaSummary ?? {})) {
    return {
      source: 'resolved-meta' as const,
      value: inspect.metaSummary?.[field]
    };
  }

  if (field in (inspect.propsSummary ?? {})) {
    return {
      source: 'resolved-props' as const,
      value: inspect.propsSummary?.[field]
    };
  }

  return {
    source: 'unknown' as const,
    value: undefined
  };
}

export function explainNodeMeta(args: {
  query: NopNodeMetaExplanationQuery;
  inspect: NopComponentInspectResult | undefined;
  redaction: NormalizedRedactionOptions;
}): NopNodeMetaExplanation {
  const { query, inspect, redaction } = args;

  if (!inspect) {
    return {
      kind: 'meta',
      subject: { cid: query.cid, field: query.field },
      answer: 'Node inspect data is unavailable, so meta causality cannot be explained yet.',
      confidence: 'low',
      limitations: ['The node is not currently inspectable through the debugger component registry.'],
      evidenceRefs: [],
      related: { cid: query.cid },
      truncated: false,
      data: {
        field: query.field,
        source: 'unknown',
        dependencyPaths: []
      }
    };
  }

  const evidenceRefs: NopDebuggerEvidenceRef[] = [];
  const limitations: string[] = [];
  const resolved = readMetaField(inspect, query.field);
  const nodeStateDebug = getNodeStateDebugData(inspect);
  const dependencyInfo = getDependencyPaths(
    nodeStateDebug?.metaDependencyPaths,
    nodeStateDebug?.metaDependencyWildcard
  );
  let truncated = dependencyInfo.truncated;

  if (resolved.source !== 'unknown') {
    truncated ||= pushEvidence(evidenceRefs, {
      kind: resolved.source === 'resolved-meta' ? 'meta' : 'props',
      summary: `${query.field} is present in ${resolved.source}`,
      cid: inspect.cid,
      nodeId: inspect.nodeId,
      path: inspect.path
    });
  } else {
    limitations.push(`The debugger snapshot does not expose ${query.field} in resolved meta or resolved props.`);
  }

  if (dependencyInfo.paths.length > 0) {
    truncated ||= pushEvidence(evidenceRefs, {
      kind: 'scope',
      summary: `meta dependencies include ${dependencyInfo.paths.join(', ')}`,
      cid: inspect.cid,
      nodeId: inspect.nodeId,
      path: inspect.path
    });
  } else {
    limitations.push('Meta dependency paths are unavailable, so causality is based on current resolved snapshots only.');
  }

  const redactedValue = redactData(resolved.value, redaction);

  return {
    kind: 'meta',
    subject: {
      ...getNodeSubject(inspect),
      field: query.field
    },
    answer: resolved.source === 'unknown'
      ? `${query.field} cannot be reliably attributed from the current debugger snapshot.`
      : `${query.field} currently resolves from ${resolved.source} as ${summarizeValue(redactedValue)}.` ,
    confidence: resolved.source === 'unknown' ? 'low' : dependencyInfo.paths.length > 0 ? 'high' : 'medium',
    limitations,
    evidenceRefs,
    related: getNodeRelated(inspect),
    truncated,
    data: {
      field: query.field,
      source: resolved.source,
      value: redactedValue,
      dependencyPaths: dependencyInfo.paths
    }
  };
}

function matchesNodeQuery(event: NopDebugEvent, query: { nodeId?: string; path?: string }) {
  if (query.nodeId && event.nodeId === query.nodeId) {
    return true;
  }

  if (query.path && event.path === query.path) {
    return true;
  }

  return false;
}

export function explainNodeFailure(args: {
  query: NopNodeFailureExplanationQuery | undefined;
  inspectByCid(cid: number): NopComponentInspectResult | undefined;
  events: NopDebugEvent[];
}): NopNodeFailureExplanation {
  const query = args.query ?? { inferFromLatest: true };
  const inspect = query.cid != null ? args.inspectByCid(query.cid) : undefined;
  const nodeId = query.nodeId ?? inspect?.nodeId;
  const path = query.path ?? inspect?.path;
  const anchor = args.events.find((event) => (
    (event.group === 'error' || (event.group === 'api' && (event.level === 'error' || event.kind === 'api:abort')))
    && matchesNodeQuery(event, { nodeId, path })
  )) ?? (query.inferFromLatest !== false ? getLatestFailedAction(args.events)?.event : undefined);

  if (!anchor) {
    return {
      kind: 'failure',
      subject: { cid: query.cid, nodeId, path },
      answer: 'No recent failure evidence matches the requested node.',
      confidence: 'low',
      limitations: ['Failure explanation only uses bounded recent debugger events.'],
      evidenceRefs: [],
      related: { cid: query.cid, nodeId, path },
      truncated: false,
      data: {
        failureType: 'unknown',
        hints: [],
        relatedEventIds: []
      }
    };
  }

  const trace = buildInteractionTrace(args.events, {
    eventId: anchor.id,
    inferFromLatest: false,
    mode: 'related',
    limit: MAX_RELATED_EVENTS
  });
  const hints = [
    anchor.kind === 'api:abort' ? 'request aborted before publish' : undefined,
    anchor.group === 'api' && anchor.level === 'error' ? 'request returned an error' : undefined,
    anchor.group === 'error' ? 'action surfaced a runtime error' : undefined
  ].filter((value): value is string => Boolean(value));
  const evidenceRefs: NopDebuggerEvidenceRef[] = [];

  let truncated = trace.matchedEvents.length >= MAX_RELATED_EVENTS;
  truncated ||= pushEvidence(evidenceRefs, {
    kind: 'event',
    summary: anchor.summary,
    cid: query.cid,
    nodeId: anchor.nodeId,
    path: anchor.path,
    eventId: anchor.id,
    requestInstanceId: anchor.requestInstanceId,
    interactionId: anchor.interactionId
  });

  for (const event of trace.matchedEvents.slice(0, MAX_EVIDENCE - evidenceRefs.length)) {
    truncated ||= pushEvidence(evidenceRefs, {
      kind: 'event',
      summary: `${event.kind}: ${event.summary}`,
      nodeId: event.nodeId,
      path: event.path,
      eventId: event.id,
      requestInstanceId: event.requestInstanceId,
      interactionId: event.interactionId
    });
  }

  return {
    kind: 'failure',
    subject: {
      cid: query.cid,
      nodeId: anchor.nodeId ?? nodeId,
      path: anchor.path ?? path,
      requestInstanceId: anchor.requestInstanceId,
      interactionId: anchor.interactionId
    },
    answer: anchor.kind === 'api:abort'
      ? `The latest failure for this node is an aborted request: ${anchor.summary}.`
      : anchor.group === 'api'
        ? `The latest failure for this node is a request error: ${anchor.summary}.`
        : `The latest failure for this node is an action/runtime error: ${anchor.summary}.`,
    confidence: 'high',
    limitations: ['The explanation uses recent related debugger events, not a full historical causal graph.'],
    evidenceRefs,
    related: {
      cid: query.cid,
      nodeId: anchor.nodeId ?? nodeId,
      path: anchor.path ?? path,
      requestInstanceId: anchor.requestInstanceId,
      interactionId: anchor.interactionId
    },
    truncated,
    data: {
      failureType: anchor.kind === 'api:abort'
        ? 'request-aborted'
        : anchor.group === 'api'
          ? 'request-failed'
          : 'action-error',
      eventId: anchor.id,
      summary: anchor.summary,
      hints,
      relatedEventIds: trace.matchedEvents.map((event) => event.id)
    }
  };
}

function ownerMatchesQuery(ownerId: string, query: { nodeId?: string; path?: string }, inspect: NopComponentInspectResult | undefined) {
  if (inspect?.scopeChain?.some((entry) => entry.id && ownerId.includes(entry.id))) {
    return true;
  }

  if (query.nodeId && ownerId.includes(query.nodeId)) {
    return true;
  }

  if (query.path && ownerId.includes(query.path)) {
    return true;
  }

  return false;
}

export function explainNodeAsync(args: {
  query: NopNodeAsyncExplanationQuery | undefined;
  inspectByCid(cid: number): NopComponentInspectResult | undefined;
  asyncSnapshot: AsyncOwnerDebugSnapshot;
}): NopNodeAsyncExplanation {
  const query = args.query ?? {};
  const inspect = query.cid != null ? args.inspectByCid(query.cid) : undefined;
  const nodeId = query.nodeId ?? inspect?.nodeId;
  const path = query.path ?? inspect?.path;

  const matchedOwners = args.asyncSnapshot.owners.filter((owner) => ownerMatchesQuery(owner.ownerId, { nodeId, path }, inspect)).slice(0, MAX_ASYNC_OWNERS);
  const ownerIds = matchedOwners.map((owner) => owner.ownerId);
  const evidenceRefs: NopDebuggerEvidenceRef[] = matchedOwners.map((owner) => ({
    kind: 'async-owner',
    summary: `${owner.ownerKind} owner ${owner.ownerId}`,
    ownerId: owner.ownerId,
    ownerKind: owner.ownerKind
  }));
  const truncated = args.asyncSnapshot.owners.filter((owner) => ownerMatchesQuery(owner.ownerId, { nodeId, path }, inspect)).length > matchedOwners.length;

  return {
    kind: 'async',
    subject: { cid: query.cid, nodeId, path },
    answer: matchedOwners.length > 0
      ? `The node currently maps to ${matchedOwners.length} async owner${matchedOwners.length === 1 ? '' : 's'}.`
      : 'No async owners are directly attributable to the requested node from the current bounded snapshot.',
    confidence: matchedOwners.length > 0 ? 'medium' : 'low',
    limitations: [
      'Async explanation is node-scoped by owner id and scope matching, not a full runtime causality proof.',
      matchedOwners.length === 0 ? 'Some async owners may not encode node identity in their owner id.' : ''
    ].filter(Boolean),
    evidenceRefs,
    related: { cid: query.cid, nodeId, path, ownerIds },
    truncated,
    data: {
      ownerCount: matchedOwners.length,
      owners: matchedOwners.map((owner) => ({
        ownerKind: owner.ownerKind,
        ownerId: owner.ownerId,
        scopeId: owner.scopeId,
        outcome: owner.currentRun?.outcome ?? owner.recentRuns[0]?.outcome,
        currentRunId: owner.currentRun?.runId,
        cancelled: owner.currentRun?.cancelled ?? owner.recentRuns[0]?.cancelled,
        timedOut: owner.currentRun?.timedOut ?? owner.recentRuns[0]?.timedOut,
        supersededBy: owner.currentRun?.supersededBy ?? owner.recentRuns[0]?.supersededBy,
        recentRunIds: owner.recentRuns.slice(0, 3).map((run) => run.runId)
      }))
    }
  };
}
