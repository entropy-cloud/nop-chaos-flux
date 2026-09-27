/**
 * Palette 家族过滤（design: docs/components/page-designer/design-architecture.md §9）。
 *
 * palette 清单 = registry 驱动（`registry.list()` 经 `evaluatePaletteEntry` 过滤），
 * 拒绝静态 manifest（与 host 实际注册面双源漂移）。三条规则序贯（S1 §9.1）：
 *
 * 1. **排除 `rendererClass === 'domain-host-renderer'`**：六域节点不进 palette（§10）；
 *    host 显式 allowlist 放入的除外（`buildPaletteItems` options），放入即强制叶子规则。
 * 2. **排除无 `defaultSchema` 的 definition**：无脚手架的 type 无法安全落画布，
 *    缺省脚手架是「新节点产生合法 schema」的前提。
 * 3. **stage 白名单**：`s2-layout-form` 只放行 layout 家族容器 + form 家族原子；
 *    `s3-plus-data` 放开 data/content/basic 展示类；`s4-full` 放开 scheduling（全量）。
 *    stage 是产品阶段参数，不是硬编码类型清单。
 *
 * palette 拖出即 `insertNode`（`defaultSchema` 经 authoringTransform，§6.2）；
 * `PaletteItem.isContainer` 驱动落点合法性（§5.3），`isOpaqueLeaf` 来自 classifyNode（§10.1）。
 */

import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { classifyNode } from './classify.js';
import { isContainerDefinition } from './tree-navigation.js';

export type PaletteStage = 's2-layout-form' | 's3-plus-data' | 's4-full';

export type PaletteExcludeReason = 'domain-host' | 'no-default-schema' | 'category-not-in-stage';

export interface PaletteVerdict {
  include: boolean;
  reason?: PaletteExcludeReason;
}

export interface PaletteItem {
  type: string;
  displayName: string;
  icon?: string;
  /** category 分组展示。 */
  group: string;
  /** fields 含 `kind: 'region'` 规则（S1 §5.3）。 */
  isContainer: boolean;
  /** classifyNode 结果（S1 §10.1）。 */
  isOpaqueLeaf: boolean;
}

export interface PaletteBuildOptions {
  /** host 显式 allowlist：命中的 domain-host type 放入 palette（强制叶子规则，S1 §9.1 规则 1）。 */
  allowlist?: readonly string[];
}

/** 各 stage 放行的 category 白名单；`s4-full` 为全量（无白名单）。 */
const STAGE_CATEGORY_ALLOWLIST: Readonly<Record<Exclude<PaletteStage, 's4-full'>, ReadonlySet<string>>> = {
  's2-layout-form': new Set(['layout', 'form']),
  's3-plus-data': new Set(['layout', 'form', 'data', 'content', 'basic']),
};

/**
 * 单个 definition 的 palette 准入裁决（三条规则序贯，首个命中即返回排除原因）。
 */
export function evaluatePaletteEntry(definition: RendererDefinition, stage: PaletteStage): PaletteVerdict {
  if (definition.rendererClass === 'domain-host-renderer') {
    return { include: false, reason: 'domain-host' };
  }
  if (!definition.defaultSchema) {
    return { include: false, reason: 'no-default-schema' };
  }
  const allowlist = STAGE_CATEGORY_ALLOWLIST[stage as Exclude<PaletteStage, 's4-full'>];
  if (allowlist && !allowlist.has(definition.category ?? '')) {
    return { include: false, reason: 'category-not-in-stage' };
  }
  return { include: true };
}

/** registry 全量清单过序贯过滤，产出 palette 条目（registry 顺序保持稳定）。 */
export function buildPaletteItems(
  registry: RendererRegistry,
  stage: PaletteStage,
  options: PaletteBuildOptions = {},
): PaletteItem[] {
  const items: PaletteItem[] = [];
  for (const definition of registry.list()) {
    const allowlisted = options.allowlist?.includes(definition.type) ?? false;
    const verdict = evaluatePaletteEntry(definition, stage);
    // 规则 1 的 host 显式 allowlist 出口：domain-host 排除可被 allowlist 覆盖
    // （放入即强制叶子规则，isOpaqueLeaf 由 classifyNode 承载）；
    // 其余排除原因（无脚手架/stage）不可覆盖。
    const overrideDomainHost = verdict.reason === 'domain-host' && allowlisted;
    if (!verdict.include && !overrideDomainHost) continue;
    items.push(toPaletteItem(definition));
  }
  return items;
}

function toPaletteItem(definition: RendererDefinition): PaletteItem {
  return {
    type: definition.type,
    displayName: definition.displayName ?? definition.type,
    ...(definition.icon !== undefined ? { icon: definition.icon } : {}),
    group: definition.category ?? 'other',
    isContainer: isContainerDefinition(definition),
    isOpaqueLeaf: classifyNode(definition) === 'opaque-leaf',
  };
}
