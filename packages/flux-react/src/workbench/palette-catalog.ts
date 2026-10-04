import type { RendererRegistry } from '@nop-chaos/flux-core';

/**
 * Designer palette catalog 契约（P4.1，plan 555；editor-designer-standard.md §2.7）。
 *
 * 声明式目录（家族 config/schema 缺省常量或宿主覆盖）× registry 在场过滤 → 生效 items。
 * 未注册 type 自动隐藏（dashboard 现行为收敛为契约语义）。label 解析：`labelKey` 存在走
 * i18n 翻译，否则 `label` 字面文案；两者皆缺回退 `type`。
 */
export interface DesignerPaletteEntry {
  type: string;
  /** i18n 键（与 labelKey 二选一；labelKey 优先）。 */
  label?: string;
  labelKey?: string;
  defaultTitle?: string;
  defaultW?: number;
  defaultH?: number;
  group?: string;
}

export interface ResolvedPaletteItem {
  type: string;
  label?: string;
  labelKey?: string;
  defaultTitle?: string;
  defaultW?: number;
  defaultH?: number;
  group?: string;
}

/** 声明 entries × registry 在场过滤（保持声明顺序）。 */
export function buildDesignerPaletteCatalog(
  entries: readonly DesignerPaletteEntry[],
  registry: Pick<RendererRegistry, 'has'>,
): ResolvedPaletteItem[] {
  const items: ResolvedPaletteItem[] = [];
  for (const entry of entries) {
    if (!registry.has(entry.type)) continue;
    items.push({ ...entry });
  }
  return items;
}

/** label 解析：labelKey 优先（i18n），否则 label 字面，皆缺回退 type。 */
export function resolvePaletteLabel(
  item: Pick<ResolvedPaletteItem, 'type' | 'label' | 'labelKey'>,
  translate: (key: string) => string,
): string {
  if (item.labelKey) return translate(item.labelKey);
  if (item.label) return item.label;
  return item.type;
}
