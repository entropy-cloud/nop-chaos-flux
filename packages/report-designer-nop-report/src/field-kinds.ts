import type { SchemaInput } from '@nop-chaos/flux-core';
import {
  NOP_REPORT_EXPRESSION_KIND_MARKER,
  NOP_REPORT_REFERENCE_KIND_MARKER,
  type NopReportInspectorSchemas,
} from './inspector-schema.js';

/**
 * 消费路径（inspector-design.md §8 "schema adapter" 变体，plan 752）：
 * 按 field-kind 标记把 inspector schema 节点改写为 nop-report 自带 renderer
 * definition 的 custom type。**未注册对应 adapter 时保持原节点（普通 input 回退）**；
 * live flux registry 注册归 NRP-5 装配。
 */

export const NOP_REPORT_EXPRESSION_RENDERER_TYPE = 'nop-report-expression-editor';
export const NOP_REPORT_REFERENCE_RENDERER_TYPE = 'nop-report-reference-picker';

function rewriteTree(
  node: unknown,
  kinds: { expression: boolean; reference: boolean },
  seen: Set<unknown>,
): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => rewriteTree(item, kinds, seen));
  }
  if (typeof node !== 'object' || node === null) {
    return node;
  }
  if (seen.has(node)) {
    return node;
  }
  const record = node as Record<string, unknown>;
  seen.add(record);
  const next: Record<string, unknown> = { ...record };

  if (kinds.expression && record[NOP_REPORT_EXPRESSION_KIND_MARKER] === true) {
    next.type = NOP_REPORT_EXPRESSION_RENDERER_TYPE;
  } else if (kinds.reference && record[NOP_REPORT_REFERENCE_KIND_MARKER] === true) {
    next.type = NOP_REPORT_REFERENCE_RENDERER_TYPE;
  }

  for (const key of ['body', 'actions', 'tabs'] as const) {
    if (record[key] !== undefined) {
      next[key] = rewriteTree(record[key], kinds, seen);
    }
  }
  return next;
}

export function withNopReportFieldKinds(
  schemas: NopReportInspectorSchemas,
  args: { expressionEditor?: boolean; referencePicker?: boolean },
): NopReportInspectorSchemas {
  const kinds = {
    expression: args.expressionEditor === true,
    reference: args.referencePicker === true,
  };
  const next: NopReportInspectorSchemas = {};
  for (const [kind, schema] of Object.entries(schemas)) {
    if (schema) {
      next[kind as keyof NopReportInspectorSchemas] = rewriteTree(
        schema,
        kinds,
        new Set(),
      ) as SchemaInput;
    }
  }
  return next;
}
