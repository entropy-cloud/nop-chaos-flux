/**
 * 节点分类——六域不透明叶子运行时防线（design: docs/components/page-designer/design-architecture.md §10.1）。
 *
 * 分类按 `rendererClass` 数据驱动 + `sourcePackage` 兜底（review Major-1 修订）：
 * industrial 现声明 `instance-renderer`、print 部分定义无 rendererClass——仅按
 * rendererClass 判定会在 importDocument 路径漏判（palette 有白名单挡板，import 没有），
 * sourcePackage 兜底保证六域产物无论声明与否都收敛为不透明叶子。
 */

import type { RendererDefinition } from '@nop-chaos/flux-core';

export type PageNodeClass = 'page' | 'opaque-leaf';

/**
 * 六域包清单（S1 §10.1）：flow-designer-* / report-designer-* / word-editor-* /
 * flux-print-* / flux-renderers-industrial / spreadsheet-*。
 * 前缀匹配覆盖 core/renderers 两包及未来子路径。
 */
export const DOMAIN_SOURCE_PACKAGE_PREFIXES: readonly string[] = [
  '@nop-chaos/flow-designer-',
  '@nop-chaos/report-designer-',
  '@nop-chaos/word-editor-',
  '@nop-chaos/flux-print-',
  '@nop-chaos/flux-renderers-industrial',
  '@nop-chaos/spreadsheet-',
];

/**
 * - `rendererClass === 'domain-host-renderer'` → `'opaque-leaf'`；
 * - 兜底：`sourcePackage` 属六域包 → `'opaque-leaf'`（无论 rendererClass 声明为何值或缺省）；
 * - 其余 → `'page'`。
 */
export function classifyNode(definition: RendererDefinition): PageNodeClass {
  if (definition.rendererClass === 'domain-host-renderer') {
    return 'opaque-leaf';
  }
  const sourcePackage = definition.sourcePackage;
  if (
    sourcePackage !== undefined &&
    DOMAIN_SOURCE_PACKAGE_PREFIXES.some(
      (prefix) => sourcePackage === prefix || sourcePackage.startsWith(prefix),
    )
  ) {
    return 'opaque-leaf';
  }
  return 'page';
}

export function isOpaqueLeaf(definition: RendererDefinition): boolean {
  return classifyNode(definition) === 'opaque-leaf';
}
