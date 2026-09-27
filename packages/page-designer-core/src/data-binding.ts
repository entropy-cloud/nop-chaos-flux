/**
 * 数据绑定投影（S3-1，design §11.2「左栏数据面板位」行）。
 *
 * 数据绑定面向 host env 注入的数据源表达式，**不引入数据建模层**（S1 §11.2）：
 * 面板只做「data-source 名称 + 字段路径 → `${name.field}` 模板」的投影，
 * 产出经宿主装成 `updateProps` 命令落文档。本模块是纯函数面（零 React）。
 *
 * 数据源清单来源 = host 回调（env 注入面）+ 文档内 `data-source`/`source`
 * 节点的 `name` 扫描（标准 source 节点即数据源声明，不改文档模型）。
 */

import { isSchema } from '@nop-chaos/flux-core';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { walkSchemaNodes } from './round-trip.js';

/** 承载数据源声明的节点 type（flux 数据源契约：`data-source`/`source`）。 */
const DATA_SOURCE_NODE_TYPES: ReadonlySet<string> = new Set(['data-source', 'source']);

/** 绑定模板形态：`${source.field}`。 */
export interface DataBindingExpression {
  source: string;
  field: string;
}

/**
 * 扫描文档内的数据源名称（`data-source`/`source` 节点的 `name`，去重保序）。
 * 未命名节点不产出名称。
 */
export function collectDataSourceNames(doc: SchemaInput): string[] {
  const names = new Set<string>();
  for (const { node } of walkSchemaNodes(doc)) {
    if (!DATA_SOURCE_NODE_TYPES.has(node.type)) continue;
    const name = node.name;
    if (typeof name === 'string' && name.length > 0) names.add(name);
  }
  return [...names];
}

/** `${source.field}` 模板（source/field 均非空时）。 */
export function buildDataBindingExpression(source: string, field: string): string | null {
  if (!source.trim() || !field.trim()) return null;
  return '${' + `${source.trim()}.${field.trim()}` + '}';
}

/**
 * 解析既有绑定模板（面板初值投影）。识别 `^{source}.{field}$` 形态的
 * 单段模板；一跳路径（无 `.`）或非模板值返回 `null`（不猜测、不失真）。
 */
export function parseDataBindingExpression(value: unknown): DataBindingExpression | null {
  if (typeof value !== 'string') return null;
  const match = /^\$\{([^${}]+)\}$/.exec(value.trim());
  if (!match) return null;
  const dot = match[1].indexOf('.');
  if (dot <= 0 || dot === match[1].length - 1) return null;
  return { source: match[1].slice(0, dot), field: match[1].slice(dot + 1) };
}

/** 节点是否为 schema 节点（供 renderers 层防御性使用，避免重复 import 面）。 */
export function isSchemaNode(value: unknown): boolean {
  return isSchema(value);
}
