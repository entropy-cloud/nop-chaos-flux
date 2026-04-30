import { redactData } from './redaction';
import type { NormalizedRedactionOptions } from './redaction';
export { explainNodeAsync, explainNodeFailure } from './explanations-failure-async';
import type {
  NopComponentInspectResult,
  NopDebuggerEvidenceRef,
  NopNodeMetaExplanation,
  NopNodeMetaExplanationField,
  NopNodeMetaExplanationQuery,
  NopNodeValueExplanation,
  NopNodeValueExplanationQuery,
  NopScopeChainEntry,
} from './types';

const MAX_EVIDENCE = 6;
const MAX_DEPENDENCY_PATHS = 6;

function matchesSensitiveKey(key: string, redaction: NormalizedRedactionOptions) {
  const normalizedKey = key.toLowerCase();
  return redaction.redactKeys.some((candidate) => normalizedKey.includes(candidate.toLowerCase()));
}

function redactFieldValue(field: string, value: unknown, redaction: NormalizedRedactionOptions) {
  if (!redaction.enabled || !matchesSensitiveKey(field, redaction)) {
    return redactData(value, redaction);
  }

  return (
    redaction.redactValue?.({
      key: field,
      path: [field],
      value,
    }) ?? redaction.mask
  );
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

function getSourceHints(inspect: NopComponentInspectResult | undefined) {
  const debugData = inspect?.debugData as
    | {
        sourceHints?: {
          fieldName?: string;
          formValue?: unknown;
          scopeValue?: unknown;
          metaRules?: Partial<Record<'visible' | 'hidden' | 'disabled', string>>;
        };
      }
    | undefined;

  return debugData?.sourceHints;
}

function getDependencyPaths(dependencyPaths: unknown, wildcard: unknown) {
  const paths = Array.isArray(dependencyPaths)
    ? dependencyPaths.filter((value): value is string => typeof value === 'string')
    : [];

  if (paths.length === 0 && !wildcard) {
    return {
      paths: [] as string[],
      truncated: false,
    };
  }

  const extra = wildcard ? ['*'] : [];
  const rawPaths = [...paths, ...extra];
  return {
    paths: rawPaths.slice(0, MAX_DEPENDENCY_PATHS),
    truncated: rawPaths.length > MAX_DEPENDENCY_PATHS,
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
    path: inspect?.path,
  };
}

function getNodeRelated(inspect: NopComponentInspectResult | undefined) {
  return {
    cid: inspect?.cid,
    nodeId: inspect?.nodeId,
    path: inspect?.path,
  };
}

function buildMissingInspectValueExplanation(
  query: NopNodeValueExplanationQuery,
): NopNodeValueExplanation {
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
      valueSource: 'unknown',
    },
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
  const sourceHints = getSourceHints(inspect);

  let value = inspect.formState?.values?.[field];
  let valueSource: NopNodeValueExplanation['data']['valueSource'] = 'form-state';
  let scopeLabel: string | undefined;

  if (value !== undefined) {
    truncated ||= pushEvidence(evidenceRefs, {
      kind: 'form-state',
      summary: `form state contains ${field}`,
      cid: inspect.cid,
      nodeId: inspect.nodeId,
      path: inspect.path,
    });
  } else {
    const directScopeHit =
      inspect.scopeData && Object.prototype.hasOwnProperty.call(inspect.scopeData, field);
    if (directScopeHit) {
      value = inspect.scopeData?.[field];
      valueSource = 'current-scope';
      scopeLabel = inspect.scopeChain?.[0] ? summarizeScopeEntry(inspect.scopeChain[0]) : undefined;
      truncated ||= pushEvidence(evidenceRefs, {
        kind: 'scope',
        summary: `${field} resolved from current scope snapshot`,
        cid: inspect.cid,
        nodeId: inspect.nodeId,
        path: inspect.path,
      });
    } else if (sourceHints?.fieldName === field && sourceHints.formValue !== undefined) {
      value = sourceHints.formValue;
      valueSource = 'form-state';
      truncated ||= pushEvidence(evidenceRefs, {
        kind: 'form-state',
        summary: `${field} resolved from source hint form value`,
        cid: inspect.cid,
        nodeId: inspect.nodeId,
        path: inspect.path,
      });
    } else if (sourceHints?.fieldName === field && sourceHints.scopeValue !== undefined) {
      value = sourceHints.scopeValue;
      valueSource = 'current-scope';
      truncated ||= pushEvidence(evidenceRefs, {
        kind: 'scope',
        summary: `${field} resolved from source hint scope value`,
        cid: inspect.cid,
        nodeId: inspect.nodeId,
        path: inspect.path,
      });
    } else {
      const scopeIndex =
        inspect.scopeChain?.findIndex((entry) =>
          Object.prototype.hasOwnProperty.call(entry.data, field),
        ) ?? -1;
      if (scopeIndex >= 0) {
        value = inspect.scopeChain?.[scopeIndex]?.data?.[field];
        scopeLabel = inspect.scopeChain?.[scopeIndex]
          ? summarizeScopeEntry(inspect.scopeChain[scopeIndex])
          : undefined;
        valueSource = scopeIndex === 0 ? 'current-scope' : 'ancestor-scope';
        truncated ||= pushEvidence(evidenceRefs, {
          kind: 'scope',
          summary: `${field} resolved from ${scopeLabel ?? 'scope chain'}`,
          cid: inspect.cid,
          nodeId: inspect.nodeId,
          path: inspect.path,
        });
      } else if (
        inspect.propsSummary &&
        Object.prototype.hasOwnProperty.call(inspect.propsSummary, field)
      ) {
        value = inspect.propsSummary[field];
        valueSource = 'resolved-props';
        truncated ||= pushEvidence(evidenceRefs, {
          kind: 'props',
          summary: `${field} exists in resolved props snapshot`,
          cid: inspect.cid,
          nodeId: inspect.nodeId,
          path: inspect.path,
        });
      } else if (
        inspect.metaSummary &&
        Object.prototype.hasOwnProperty.call(inspect.metaSummary, field)
      ) {
        value = inspect.metaSummary[field];
        valueSource = 'resolved-meta';
        truncated ||= pushEvidence(evidenceRefs, {
          kind: 'meta',
          summary: `${field} exists in resolved meta snapshot`,
          cid: inspect.cid,
          nodeId: inspect.nodeId,
          path: inspect.path,
        });
      } else {
        valueSource = 'unknown';
        limitations.push(
          `The debugger snapshot does not expose a reliable current source for ${field}.`,
        );
      }
    }
  }

  const redactedValue = redactFieldValue(field, value, redaction);
  const answer =
    valueSource === 'unknown'
      ? `${field} is not reliably explainable from the current debugger snapshot.`
      : `${field} currently comes from ${valueSource} and resolves to ${summarizeValue(redactedValue)}.`;

  return {
    kind: 'value',
    subject: {
      ...getNodeSubject(inspect),
      field,
    },
    answer,
    confidence:
      valueSource === 'unknown'
        ? 'low'
        : valueSource === 'ancestor-scope' || valueSource === 'resolved-props'
          ? 'medium'
          : 'high',
    limitations,
    evidenceRefs,
    related: getNodeRelated(inspect),
    truncated,
    data: {
      field,
      valueSource,
      value: redactedValue,
      scopeLabel,
    },
  };
}

function readMetaField(inspect: NopComponentInspectResult, field: NopNodeMetaExplanationField) {
  if (field in (inspect.metaSummary ?? {})) {
    return {
      source: 'resolved-meta' as const,
      value: inspect.metaSummary?.[field],
    };
  }

  if (field in (inspect.propsSummary ?? {})) {
    return {
      source: 'resolved-props' as const,
      value: inspect.propsSummary?.[field],
    };
  }

  return {
    source: 'unknown' as const,
    value: undefined,
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
      limitations: [
        'The node is not currently inspectable through the debugger component registry.',
      ],
      evidenceRefs: [],
      related: { cid: query.cid },
      truncated: false,
      data: {
        field: query.field,
        source: 'unknown',
        dependencyPaths: [],
      },
    };
  }

  const evidenceRefs: NopDebuggerEvidenceRef[] = [];
  const limitations: string[] = [];
  const resolved = readMetaField(inspect, query.field);
  const nodeStateDebug = getNodeStateDebugData(inspect);
  const sourceHints = getSourceHints(inspect);
  const dependencyInfo = getDependencyPaths(
    nodeStateDebug?.metaDependencyPaths,
    nodeStateDebug?.metaDependencyWildcard,
  );
  let truncated = dependencyInfo.truncated;

  if (resolved.source !== 'unknown') {
    truncated ||= pushEvidence(evidenceRefs, {
      kind: resolved.source === 'resolved-meta' ? 'meta' : 'props',
      summary: `${query.field} is present in ${resolved.source}`,
      cid: inspect.cid,
      nodeId: inspect.nodeId,
      path: inspect.path,
    });
  } else {
    limitations.push(
      `The debugger snapshot does not expose ${query.field} in resolved meta or resolved props.`,
    );
  }

  const metaRule =
    query.field === 'visible' || query.field === 'hidden' || query.field === 'disabled'
      ? sourceHints?.metaRules?.[query.field]
      : undefined;

  if (metaRule) {
    truncated ||= pushEvidence(evidenceRefs, {
      kind: 'meta',
      summary: `${query.field} rule: ${metaRule}`,
      cid: inspect.cid,
      nodeId: inspect.nodeId,
      path: inspect.path,
    });
  }

  if (dependencyInfo.paths.length > 0) {
    truncated ||= pushEvidence(evidenceRefs, {
      kind: 'scope',
      summary: `meta dependencies include ${dependencyInfo.paths.join(', ')}`,
      cid: inspect.cid,
      nodeId: inspect.nodeId,
      path: inspect.path,
    });
  } else {
    limitations.push(
      'Meta dependency paths are unavailable, so causality is based on current resolved snapshots only.',
    );
  }

  const redactedValue = redactData(resolved.value, redaction);

  return {
    kind: 'meta',
    subject: {
      ...getNodeSubject(inspect),
      field: query.field,
    },
    answer:
      resolved.source === 'unknown'
        ? `${query.field} cannot be reliably attributed from the current debugger snapshot.`
        : `${query.field} currently resolves from ${resolved.source} as ${summarizeValue(redactedValue)}.${metaRule ? ` Rule: ${metaRule}` : ''}`,
    confidence:
      resolved.source === 'unknown' ? 'low' : dependencyInfo.paths.length > 0 ? 'high' : 'medium',
    limitations,
    evidenceRefs,
    related: getNodeRelated(inspect),
    truncated,
    data: {
      field: query.field,
      source: resolved.source,
      value: redactedValue,
      dependencyPaths: dependencyInfo.paths,
    },
  };
}
