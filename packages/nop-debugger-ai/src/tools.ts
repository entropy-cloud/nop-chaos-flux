import type {
  NopDebugEventKind,
  NopDebugEventLevel,
  NopDebuggerAutomationApi,
  NopDebuggerFilterKind,
  NopNodeMetaExplanationField,
} from '@nop-chaos/nop-debugger';
import {
  boundedNumber,
  optionalBoolean,
  optionalEnum,
  optionalNumber,
  optionalString,
  requireAtLeastOne,
  requireNumber,
} from './errors.js';
import { projectInspectResult } from './trim.js';

export interface DebuggerToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Validates raw JSON args; throws ToolArgsError on violation. */
  parse(args: Record<string, unknown>): unknown[];
  /** Calls exactly one read-only automation getter. */
  invoke(automation: NopDebuggerAutomationApi, args: unknown[]): unknown;
  /** Per-tool result shaping before global redaction (optional). */
  project?(result: unknown): unknown;
}

const EVENT_KINDS: readonly NopDebugEventKind[] = [
  'compile:start',
  'compile:end',
  'render:start',
  'render:end',
  'action:start',
  'action:end',
  'api:start',
  'api:end',
  'api:abort',
  'state:snapshot',
  'notify',
  'error',
];

const EVENT_GROUPS: readonly NopDebuggerFilterKind[] = [
  'render',
  'action',
  'api',
  'compile',
  'notify',
  'error',
  'node',
];

const EVENT_LEVELS: readonly NopDebugEventLevel[] = ['info', 'success', 'warning', 'error'];

const META_FIELDS: readonly NopNodeMetaExplanationField[] = [
  'visible',
  'hidden',
  'disabled',
  'label',
  'title',
  'className',
];

export const debuggerToolDefinitions: DebuggerToolDefinition[] = [
  {
    name: 'query_events',
    description:
      'Query the bounded debugger event ring (compile/render/action/api/state/notify/error events). Use for "what happened" questions.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: `event kind: ${EVENT_KINDS.join(' | ')}` },
        group: { type: 'string', description: `event group: ${EVENT_GROUPS.join(' | ')}` },
        level: { type: 'string', description: `level: ${EVENT_LEVELS.join(' | ')}` },
        nodeId: { type: 'string' },
        path: { type: 'string' },
        requestKey: { type: 'string' },
        interactionId: { type: 'string' },
        text: { type: 'string' },
        sinceTimestamp: { type: 'number' },
        untilTimestamp: { type: 'number' },
        limit: { type: 'number', description: 'max events (default 50, hard cap 200)' },
      },
    },
    parse(args) {
      const query: Record<string, unknown> = {
        kind: optionalEnum(args, 'kind', EVENT_KINDS),
        group: optionalEnum(args, 'group', EVENT_GROUPS),
        level: optionalEnum(args, 'level', EVENT_LEVELS),
        nodeId: optionalString(args, 'nodeId'),
        path: optionalString(args, 'path'),
        requestKey: optionalString(args, 'requestKey'),
        interactionId: optionalString(args, 'interactionId'),
        text: optionalString(args, 'text'),
        sinceTimestamp: optionalNumber(args, 'sinceTimestamp'),
        untilTimestamp: optionalNumber(args, 'untilTimestamp'),
        limit: boundedNumber(args, 'limit', 50, 200),
      };
      return [Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined))];
    },
    invoke(automation, [query]) {
      return automation.queryEvents(query as Parameters<NopDebuggerAutomationApi['queryEvents']>[0]);
    },
  },
  {
    name: 'get_overview',
    description: 'Bounded session overview: latest compile/action/api/error events, counters, render churn hints.',
    parameters: { type: 'object', properties: {} },
    parse() {
      return [];
    },
    invoke(automation) {
      return automation.getOverview();
    },
  },
  {
    name: 'get_node_diagnostics',
    description: 'Event statistics for one node (by nodeId and/or path): counts by kind/group, latest events.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        path: { type: 'string' },
        limit: { type: 'number', description: 'max recent events (default 50, hard cap 200)' },
      },
    },
    parse(args) {
      requireAtLeastOne(args, ['nodeId', 'path']);
      return [
        {
          nodeId: optionalString(args, 'nodeId'),
          path: optionalString(args, 'path'),
          limit: boundedNumber(args, 'limit', 50, 200),
        },
      ];
    },
    invoke(automation, [options]) {
      return automation.getNodeDiagnostics(
        options as Parameters<NopDebuggerAutomationApi['getNodeDiagnostics']>[0],
      );
    },
  },
  {
    name: 'explain_node_value',
    description: 'Explain where a mounted node field value currently comes from (form state, scope, props, meta).',
    parameters: {
      type: 'object',
      properties: {
        cid: { type: 'number', description: 'mounted node cid (required)' },
        field: { type: 'string', description: 'field name (optional; defaults to the value source overview)' },
      },
      required: ['cid'],
    },
    parse(args) {
      return [
        {
          cid: requireNumber(args, 'cid'),
          field: optionalString(args, 'field'),
        },
      ];
    },
    invoke(automation, [query]) {
      return automation.explainNodeValue(
        query as Parameters<NopDebuggerAutomationApi['explainNodeValue']>[0],
      );
    },
  },
  {
    name: 'explain_node_meta',
    description: 'Explain why a node meta field (visible/hidden/disabled/label/title/className) resolves as it does.',
    parameters: {
      type: 'object',
      properties: {
        cid: { type: 'number', description: 'mounted node cid (required)' },
        field: { type: 'string', description: `meta field: ${META_FIELDS.join(' | ')} (required)` },
      },
      required: ['cid', 'field'],
    },
    parse(args) {
      return [
        {
          cid: requireNumber(args, 'cid'),
          field: optionalEnum(args, 'field', META_FIELDS) as NopNodeMetaExplanationField,
        },
      ];
    },
    invoke(automation, [query]) {
      return automation.explainNodeMeta(
        query as Parameters<NopDebuggerAutomationApi['explainNodeMeta']>[0],
      );
    },
  },
  {
    name: 'explain_node_failure',
    description: 'Explain the latest node-scoped failure (request failed/aborted, action error) with bounded evidence.',
    parameters: {
      type: 'object',
      properties: {
        cid: { type: 'number' },
        nodeId: { type: 'string' },
        path: { type: 'string' },
        inferFromLatest: { type: 'boolean' },
      },
    },
    parse(args) {
      requireAtLeastOne(args, ['cid', 'nodeId', 'path', 'inferFromLatest']);
      return [
        {
          cid: optionalNumber(args, 'cid'),
          nodeId: optionalString(args, 'nodeId'),
          path: optionalString(args, 'path'),
          inferFromLatest: optionalBoolean(args, 'inferFromLatest'),
        },
      ];
    },
    invoke(automation, [query]) {
      return automation.explainNodeFailure(
        query as Parameters<NopDebuggerAutomationApi['explainNodeFailure']>[0],
      );
    },
  },
  {
    name: 'explain_node_async',
    description: 'List async owners (data-source/reaction/validation) attributable to a node from the bounded snapshot.',
    parameters: {
      type: 'object',
      properties: {
        cid: { type: 'number' },
        nodeId: { type: 'string' },
        path: { type: 'string' },
      },
    },
    parse(args) {
      requireAtLeastOne(args, ['cid', 'nodeId', 'path']);
      return [
        {
          cid: optionalNumber(args, 'cid'),
          nodeId: optionalString(args, 'nodeId'),
          path: optionalString(args, 'path'),
        },
      ];
    },
    invoke(automation, [query]) {
      return automation.explainNodeAsync(
        query as Parameters<NopDebuggerAutomationApi['explainNodeAsync']>[0],
      );
    },
  },
  {
    name: 'get_interaction_trace',
    description:
      'Trace one interaction/request/action chain (matched + related events, request keys, node paths). Provide a selector or inferFromLatest.',
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'number' },
        requestKey: { type: 'string' },
        requestInstanceId: { type: 'string' },
        interactionId: { type: 'string' },
        actionType: { type: 'string' },
        nodeId: { type: 'string' },
        path: { type: 'string' },
        inferFromLatest: { type: 'boolean' },
        limit: { type: 'number', description: 'max events (default 50, hard cap 200)' },
      },
    },
    parse(args) {
      requireAtLeastOne(args, [
        'eventId',
        'requestKey',
        'requestInstanceId',
        'interactionId',
        'actionType',
        'nodeId',
        'path',
        'inferFromLatest',
      ]);
      return [
        {
          eventId: optionalNumber(args, 'eventId'),
          requestKey: optionalString(args, 'requestKey'),
          requestInstanceId: optionalString(args, 'requestInstanceId'),
          interactionId: optionalString(args, 'interactionId'),
          actionType: optionalString(args, 'actionType'),
          nodeId: optionalString(args, 'nodeId'),
          path: optionalString(args, 'path'),
          inferFromLatest: optionalBoolean(args, 'inferFromLatest'),
          limit: boundedNumber(args, 'limit', 50, 200),
        },
      ];
    },
    invoke(automation, [query]) {
      return automation.getInteractionTrace(
        query as Parameters<NopDebuggerAutomationApi['getInteractionTrace']>[0],
      );
    },
  },
  {
    name: 'get_recent_failures',
    description: 'Recent failure summaries (request/action failures with hints) from the bounded error buffers.',
    parameters: {
      type: 'object',
      properties: {
        sinceTimestamp: { type: 'number' },
        limit: { type: 'number', description: 'max failures (default 20, hard cap 100)' },
      },
    },
    parse(args) {
      return [
        {
          sinceTimestamp: optionalNumber(args, 'sinceTimestamp'),
          limit: boundedNumber(args, 'limit', 20, 100),
        },
      ];
    },
    invoke(automation, [options]) {
      return automation.getRecentFailures(
        options as Parameters<NopDebuggerAutomationApi['getRecentFailures']>[0],
      );
    },
  },
  {
    name: 'inspect_node',
    description:
      'Identity/meta summary of a mounted node by cid: rendererType, path, meta/props summaries. Does NOT include form values or scope data.',
    parameters: {
      type: 'object',
      properties: {
        cid: { type: 'number', description: 'mounted node cid (required)' },
      },
      required: ['cid'],
    },
    parse(args) {
      return [{ cid: requireNumber(args, 'cid') }];
    },
    invoke(automation, args) {
      const { cid } = args[0] as { cid: number };
      return automation.inspectByCid(cid);
    },
    project(result) {
      return projectInspectResult(result as Record<string, unknown>);
    },
  },
];
