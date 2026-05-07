import { describe, expect, it } from 'vitest';
import {
  explainNodeAsync,
  explainNodeFailure,
  explainNodeMeta,
  explainNodeValue,
} from './explanations.js';
import { normalizeRedactionOptions } from './redaction.js';
import type { NopComponentInspectResult, NopDebugEvent } from './types.js';

function createInspectResult(
  overrides: Partial<NopComponentInspectResult> = {},
): NopComponentInspectResult {
  return {
    cid: 1,
    mounted: true,
    nodeId: 'node-1',
    path: 'body.0',
    ...overrides,
  };
}

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
    ...overrides,
  };
}

describe('explanation helpers', () => {
  it('redacts sensitive values in node value explanations', () => {
    const result = explainNodeValue({
      query: { cid: 1, field: 'password' },
      inspect: createInspectResult({
        formState: {
          values: { password: 'super-secret' },
          errors: {},
          touched: {},
          dirty: {},
          visited: {},
          submitting: false,
        },
      }),
      redaction: normalizeRedactionOptions({ redactKeys: ['password'], mask: '[MASKED]' }),
    });

    expect(result).toMatchObject({
      kind: 'value',
      truncated: false,
      data: {
        field: 'password',
        valueSource: 'form-state',
        value: '[MASKED]',
      },
    });
  });

  it('truncates meta dependency paths and reports truncation', () => {
    const result = explainNodeMeta({
      query: { cid: 1, field: 'visible' },
      inspect: createInspectResult({
        metaSummary: { visible: true },
        debugData: {
          nodeState: {
            metaDependencyPaths: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
            metaDependencyWildcard: false,
          },
        },
      }),
      redaction: normalizeRedactionOptions(undefined),
    });

    expect(result.kind).toBe('meta');
    expect(result.truncated).toBe(true);
    expect(result.data.dependencyPaths).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(result.evidenceRefs.length).toBeLessThanOrEqual(6);
  });

  it('uses source hints to explain field value origin when form state snapshot is absent', () => {
    const result = explainNodeValue({
      query: { cid: 1, field: 'username' },
      inspect: createInspectResult({
        debugData: {
          sourceHints: {
            fieldName: 'username',
            formValue: 'alice',
          },
        },
      }),
      redaction: normalizeRedactionOptions(undefined),
    });

    expect(result).toMatchObject({
      kind: 'value',
      data: {
        field: 'username',
        valueSource: 'form-state',
        value: 'alice',
      },
    });
    expect(result.evidenceRefs[0]?.summary).toContain('source hint form value');
  });

  it('includes meta rule hints in meta explanations', () => {
    const result = explainNodeMeta({
      query: { cid: 1, field: 'visible' },
      inspect: createInspectResult({
        metaSummary: { visible: true },
        debugData: {
          sourceHints: {
            metaRules: {
              visible: '${role === "admin"}',
            },
          },
          nodeState: {
            metaDependencyPaths: ['role'],
            metaDependencyWildcard: false,
          },
        },
      }),
      redaction: normalizeRedactionOptions(undefined),
    });

    expect(result.kind).toBe('meta');
    expect(result.answer).toContain('${role === "admin"}');
    expect(result.evidenceRefs.some((entry) => entry.summary.includes('visible rule'))).toBe(true);
  });

  it('bounds failure evidence and related events', () => {
    const events: NopDebugEvent[] = [
      createEvent({
        id: 10,
        timestamp: 1000,
        kind: 'error',
        group: 'error',
        level: 'error',
        summary: 'submit failed',
        nodeId: 'node-1',
        path: 'body.0',
        interactionId: 'interaction-1',
      }),
      ...Array.from({ length: 8 }, (_, index) =>
        createEvent({
          id: 9 - index,
          timestamp: 990 - index,
          kind: index % 2 === 0 ? 'api:end' : 'action:end',
          group: index % 2 === 0 ? 'api' : 'action',
          level: index % 2 === 0 ? 'error' : 'success',
          summary: `related-${index}`,
          nodeId: 'node-1',
          path: 'body.0',
          interactionId: 'interaction-1',
          requestInstanceId: index % 2 === 0 ? `req-${index}` : undefined,
        }),
      ),
    ];

    const result = explainNodeFailure({
      query: { cid: 1 },
      inspectByCid: () => createInspectResult(),
      events,
    });

    expect(result.kind).toBe('failure');
    expect(result.truncated).toBe(true);
    expect(result.data.relatedEventIds.length).toBe(6);
    expect(result.evidenceRefs.length).toBeLessThanOrEqual(6);
  });

  it('bounds async owners and reports truncation', () => {
    const result = explainNodeAsync({
      query: { cid: 1 },
      inspectByCid: () =>
        createInspectResult({
          scopeChain: [{ id: 'form-scope', path: '$form', label: '$form', data: {} }],
        }),
      asyncSnapshot: {
        owners: Array.from({ length: 6 }, (_, index) => ({
          ownerKind: 'validation' as const,
          ownerId: `validation:form-scope:field-${index}`,
          scopeId: 'form-scope',
          recentRuns: [
            {
              ownerKind: 'validation' as const,
              ownerId: `validation:form-scope:field-${index}`,
              scopeId: 'form-scope',
              runId: index + 1,
              cause: 'blur',
              startedAt: index + 1,
              outcome: 'failed' as const,
            },
          ],
        })),
      },
    });

    expect(result.kind).toBe('async');
    expect(result.truncated).toBe(true);
    expect(result.data.ownerCount).toBe(4);
    expect(result.data.owners).toHaveLength(4);
    expect(result.evidenceRefs.length).toBe(4);
  });
});
