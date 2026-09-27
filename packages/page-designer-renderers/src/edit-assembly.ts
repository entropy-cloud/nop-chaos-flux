/**
 * 编辑装配插件（S1 §5.2 编辑态装配：设计器自持装配器，零污染运行时公共路径）。
 *
 * `beforeCompile` 把文档态 `xui:sid` 投影为编译副本的 `testid` meta——运行时既有
 * frame 通道（field-frame / auto-renderer / 布局根元素均投影 `data-testid`）随之把
 * 锚点带进 DOM；桥再把 `[data-testid^="psid-"]` 同步为 `data-psid` 锚点属性。
 *
 * 边界（S1 §5.2/INV-B/INV-E）：
 * - 只变换编译副本，working 文档逐字保留（INV-B）；
 * - 预览态不挂本插件且渲染剥离 sid 后的文档（INV-E，运行时零感知）；
 * - 不进 renderer definition、不改 renderer 内部 DOM、不进非编辑装配。
 */

import { isSchema } from '@nop-chaos/flux-core';
import type { BaseSchema, RendererPlugin, SchemaInput } from '@nop-chaos/flux-core';
import { SESSION_ID_KEY } from '@nop-chaos/page-designer-core';

function projectNode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(projectNode);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const source = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    next[key] = projectNode(source[key]);
  }
  const sid = next[SESSION_ID_KEY];
  if (isSchema(next as BaseSchema) && typeof sid === 'string') {
    next.testid = sid;
  }
  return next;
}

/** `xui:sid` → `testid`（编译副本投影，深拷贝返回）。 */
export function projectSessionIdsToTestids(schema: SchemaInput): SchemaInput {
  return projectNode(schema) as SchemaInput;
}

/** 编辑装配插件工厂（仅编辑态挂载）。 */
export function createEditAssemblyPlugin(): RendererPlugin {
  return {
    name: 'nop-page-designer:edit-assembly',
    beforeCompile: projectSessionIdsToTestids,
  };
}
