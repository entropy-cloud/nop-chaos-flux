import type { AsyncOwnerDebugSnapshot } from '@nop-chaos/flux-core';
import { buildInteractionTrace } from './diagnostics.js';
import { getLatestFailedAction } from './diagnostics-failures.js';
import type {
  NopComponentInspectResult,
  NopDebugEvent,
  NopDebuggerEvidenceRef,
  NopNodeAsyncExplanation,
  NopNodeAsyncExplanationQuery,
  NopNodeFailureExplanation,
  NopNodeFailureExplanationQuery,
} from './types.js';

const MAX_EVIDENCE = 6;
const MAX_ASYNC_OWNERS = 4;
const MAX_RELATED_EVENTS = 6;

function pushEvidence(target: NopDebuggerEvidenceRef[], entry: NopDebuggerEvidenceRef) {
  if (target.length < MAX_EVIDENCE) {
    target.push(entry);
    return false;
  }

  return true;
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
  const directAnchor =
    args.events.find(
      (event) =>
        (event.group === 'error' ||
          (event.group === 'api' && (event.level === 'error' || event.kind === 'api:abort'))) &&
        matchesNodeQuery(event, { nodeId, path }),
    ) ?? (query.inferFromLatest !== false ? getLatestFailedAction(args.events)?.event : undefined);

  const nodeActionAnchor =
    directAnchor || !inspect
      ? undefined
      : args.events.find(
          (event) =>
            event.group === 'action' &&
            matchesNodeQuery(event, { nodeId: inspect.nodeId, path: inspect.path }),
        );

  const traceAnchor =
    directAnchor || !inspect
      ? undefined
      : buildInteractionTrace(args.events, {
          inferFromLatest: false,
          interactionId: nodeActionAnchor?.interactionId,
          requestInstanceId: nodeActionAnchor?.requestInstanceId,
          requestKey: nodeActionAnchor?.requestKey,
          actionType: nodeActionAnchor?.actionType,
          nodeId: inspect.nodeId,
          path: inspect.path,
          mode: 'related',
          limit: MAX_RELATED_EVENTS,
        }).matchedEvents.find(
          (event) =>
            event.group === 'error' ||
            (event.group === 'api' && (event.level === 'error' || event.kind === 'api:abort')),
        );

  const anchor = directAnchor ?? traceAnchor;

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
        relatedEventIds: [],
      },
    };
  }

  const trace = buildInteractionTrace(args.events, {
    eventId: anchor.id,
    inferFromLatest: false,
    mode: 'related',
    limit: MAX_RELATED_EVENTS,
  });
  const hints = [
    anchor.kind === 'api:abort' ? 'request aborted before publish' : undefined,
    anchor.group === 'api' && anchor.level === 'error' ? 'request returned an error' : undefined,
    anchor.group === 'error' ? 'action surfaced a runtime error' : undefined,
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
    interactionId: anchor.interactionId,
  });

  for (const event of trace.matchedEvents.slice(0, MAX_EVIDENCE - evidenceRefs.length)) {
    truncated ||= pushEvidence(evidenceRefs, {
      kind: 'event',
      summary: `${event.kind}: ${event.summary}`,
      nodeId: event.nodeId,
      path: event.path,
      eventId: event.id,
      requestInstanceId: event.requestInstanceId,
      interactionId: event.interactionId,
    });
  }

  return {
    kind: 'failure',
    subject: {
      cid: query.cid,
      nodeId: anchor.nodeId ?? nodeId,
      path: anchor.path ?? path,
      requestInstanceId: anchor.requestInstanceId,
      interactionId: anchor.interactionId,
    },
    answer:
      anchor.kind === 'api:abort'
        ? `The latest failure for this node is an aborted request: ${anchor.summary}.`
        : anchor.group === 'api'
          ? `The latest failure for this node is a request error: ${anchor.summary}.`
          : `The latest failure for this node is an action/runtime error: ${anchor.summary}.`,
    confidence: 'high',
    limitations: [
      'The explanation uses recent related debugger events, not a full historical causal graph.',
    ],
    evidenceRefs,
    related: {
      cid: query.cid,
      nodeId: anchor.nodeId ?? nodeId,
      path: anchor.path ?? path,
      requestInstanceId: anchor.requestInstanceId,
      interactionId: anchor.interactionId,
    },
    truncated,
    data: {
      failureType:
        anchor.kind === 'api:abort'
          ? 'request-aborted'
          : anchor.group === 'api'
            ? 'request-failed'
            : 'action-error',
      eventId: anchor.id,
      summary: anchor.summary,
      hints,
      relatedEventIds: trace.matchedEvents.map((event) => event.id),
    },
  };
}

function ownerMatchesQuery(
  ownerId: string,
  query: { nodeId?: string; path?: string },
  inspect: NopComponentInspectResult | undefined,
) {
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

  const matchingOwners = args.asyncSnapshot.owners.filter((owner) =>
    ownerMatchesQuery(owner.ownerId, { nodeId, path }, inspect),
  );
  const matchedOwners = matchingOwners.slice(0, MAX_ASYNC_OWNERS);
  const ownerIds = matchedOwners.map((owner) => owner.ownerId);
  const evidenceRefs: NopDebuggerEvidenceRef[] = matchedOwners.map((owner) => ({
    kind: 'async-owner',
    summary: `${owner.ownerKind} owner ${owner.ownerId}`,
    ownerId: owner.ownerId,
    ownerKind: owner.ownerKind,
  }));
  const truncated = matchingOwners.length > matchedOwners.length;

  return {
    kind: 'async',
    subject: { cid: query.cid, nodeId, path },
    answer:
      matchedOwners.length > 0
        ? `The node currently maps to ${matchedOwners.length} async owner${matchedOwners.length === 1 ? '' : 's'}.`
        : 'No async owners are directly attributable to the requested node from the current bounded snapshot.',
    confidence: matchedOwners.length > 0 ? 'medium' : 'low',
    limitations: [
      'Async explanation is node-scoped by owner id and scope matching, not a full runtime causality proof.',
      matchedOwners.length === 0
        ? 'Some async owners may not encode node identity in their owner id.'
        : '',
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
        recentRunIds: owner.recentRuns.slice(0, 3).map((run) => run.runId),
      })),
    },
  };
}
