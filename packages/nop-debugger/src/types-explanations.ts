import type { AsyncOwnerKind } from '@nop-chaos/flux-core';

export interface NopExpressionEvaluationResult {
  expression: string;
  ok: boolean;
  value?: unknown;
  error?: string;
  usedScopeLabel?: string;
}

export type NopDebuggerExplanationKind = 'value' | 'meta' | 'failure' | 'async';

export type NopDebuggerExplanationConfidence = 'high' | 'medium' | 'low';

export interface NopDebuggerExplanationSubject {
  cid?: number;
  nodeId?: string;
  path?: string;
  field?: string;
  requestInstanceId?: string;
  interactionId?: string;
  ownerId?: string;
  ownerKind?: AsyncOwnerKind;
}

export interface NopDebuggerEvidenceRef {
  kind: 'inspect' | 'scope' | 'form-state' | 'props' | 'meta' | 'event' | 'async-owner';
  summary: string;
  cid?: number;
  nodeId?: string;
  path?: string;
  eventId?: number;
  requestInstanceId?: string;
  interactionId?: string;
  ownerId?: string;
  ownerKind?: AsyncOwnerKind;
}

export interface NopDebuggerExplanationRelated {
  cid?: number;
  nodeId?: string;
  path?: string;
  requestInstanceId?: string;
  interactionId?: string;
  ownerIds?: string[];
}

export interface NopDebuggerExplanationBase<TKind extends NopDebuggerExplanationKind, TData> {
  kind: TKind;
  subject: NopDebuggerExplanationSubject;
  answer: string;
  confidence: NopDebuggerExplanationConfidence;
  limitations: string[];
  evidenceRefs: NopDebuggerEvidenceRef[];
  related: NopDebuggerExplanationRelated;
  truncated: boolean;
  data: TData;
}

export type NopNodeValueSource =
  | 'form-state'
  | 'current-scope'
  | 'ancestor-scope'
  | 'resolved-props'
  | 'resolved-meta'
  | 'unknown';

export interface NopNodeValueExplanationQuery {
  cid: number;
  field?: string;
}

export interface NopNodeValueExplanationData {
  field: string;
  valueSource: NopNodeValueSource;
  value?: unknown;
  scopeLabel?: string;
}

export type NopNodeValueExplanation = NopDebuggerExplanationBase<'value', NopNodeValueExplanationData>;

export type NopNodeMetaExplanationField = 'visible' | 'hidden' | 'disabled' | 'label' | 'title' | 'className';

export interface NopNodeMetaExplanationQuery {
  cid: number;
  field: NopNodeMetaExplanationField;
}

export type NopNodeMetaSource = 'resolved-meta' | 'resolved-props' | 'unknown';

export interface NopNodeMetaExplanationData {
  field: NopNodeMetaExplanationField;
  source: NopNodeMetaSource;
  value?: unknown;
  dependencyPaths: string[];
}

export type NopNodeMetaExplanation = NopDebuggerExplanationBase<'meta', NopNodeMetaExplanationData>;

export interface NopNodeFailureExplanationQuery {
  cid?: number;
  nodeId?: string;
  path?: string;
  inferFromLatest?: boolean;
}

export type NopNodeFailureType = 'request-failed' | 'request-aborted' | 'action-error' | 'unknown';

export interface NopNodeFailureExplanationData {
  failureType: NopNodeFailureType;
  eventId?: number;
  summary?: string;
  hints: string[];
  relatedEventIds: number[];
}

export type NopNodeFailureExplanation = NopDebuggerExplanationBase<'failure', NopNodeFailureExplanationData>;

export interface NopNodeAsyncExplanationQuery {
  cid?: number;
  nodeId?: string;
  path?: string;
}

export interface NopNodeAsyncOwnerSummary {
  ownerKind: AsyncOwnerKind;
  ownerId: string;
  scopeId: string;
  outcome?: string;
  currentRunId?: number;
  cancelled?: boolean;
  timedOut?: boolean;
  supersededBy?: number;
  recentRunIds: number[];
}

export interface NopNodeAsyncExplanationData {
  ownerCount: number;
  owners: NopNodeAsyncOwnerSummary[];
}

export type NopNodeAsyncExplanation = NopDebuggerExplanationBase<'async', NopNodeAsyncExplanationData>;

export type NopDebuggerExplanation =
  | NopNodeValueExplanation
  | NopNodeMetaExplanation
  | NopNodeFailureExplanation
  | NopNodeAsyncExplanation;
