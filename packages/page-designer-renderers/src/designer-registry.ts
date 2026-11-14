/**
 * 设计器自持 registry（S1 §11.1：与宿主应用零共享）。
 *
 * MVP stage 白名单（S2）：布局容器（page/container/flex/grid/collapse/tabs）+
 * 表单原子（input-text/input-number/select/checkbox/radio-group/textarea/switch/
 * slider/rating/input-color/verification-code 等 form 族）+ text/button；
 * 六域 / domain-host 全排除（不注册六域 renderer 包 = 静态防线第一层，S1 §10.2）。
 *
 * palette 清单仍由 core 的 `buildPaletteItems` 规则过滤（registry 驱动，S1 §9）；
 * 对 definition 缺 `defaultSchema` 的白名单原子（form 族未声明脚手架），补设计器侧
 * 脚手架（缺省脚手架是「新节点产生合法 schema」的前提，S1 §9.1 规则 2）。
 */

import { createRendererRegistry, isSchema } from '@nop-chaos/flux-core';
import type { RendererDefinition, RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import type { PaletteItem } from '@nop-chaos/page-designer-core';
import {
  buildPaletteItems,
  classifyNode,
} from '@nop-chaos/page-designer-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form/definitions';
import { registerLayoutRenderers } from '@nop-chaos/flux-renderers-layout';

/**
 * 设计器侧脚手架（仅白名单内、definition 无 `defaultSchema` 的 type）。
 * 排除规则 1/2 优先：六域（classifyNode = opaque-leaf）永不进入。
 */
const DESIGNER_SCAFFOLDS: Readonly<Record<string, SchemaInput>> = {
  grid: { type: 'grid', columns: 2 },
  collapse: { type: 'collapse', items: [] },
  tabs: { type: 'tabs', items: [] },
  'input-text': { type: 'input-text', name: 'field1', label: 'Input' },
  'input-number': { type: 'input-number', name: 'number1', label: 'Number' },
  select: { type: 'select', name: 'select1', label: 'Select', options: [] },
  checkbox: { type: 'checkbox', name: 'checkbox1', label: 'Checkbox' },
  'checkbox-group': { type: 'checkbox-group', name: 'checkboxes1', label: 'Checkboxes', options: [] },
  'radio-group': { type: 'radio-group', name: 'radio1', label: 'Radio', options: [] },
  textarea: { type: 'textarea', name: 'textarea1', label: 'Textarea' },
  switch: { type: 'switch', name: 'switch1', label: 'Switch' },
  slider: { type: 'slider', name: 'slider1', label: 'Slider' },
  rating: { type: 'rating', name: 'rating1', label: 'Rating' },
  'input-color': { type: 'input-color', name: 'color1', label: 'Color' },
  'verification-code': { type: 'verification-code', name: 'code1', label: 'Verification Code' },
  text: { type: 'text', text: 'Text' },
  button: { type: 'button', label: 'Button' },
};

/**
 * palette 展示名兜底：definition 未声明 `displayName` 的 type 用人类可读名，
 * 避免 palette 条目暴露 `input-text` 这类技术 id。
 */
const PALETTE_DISPLAY_NAME_FALLBACKS: Readonly<Record<string, string>> = {
  'input-text': 'Input',
  'input-number': 'Number',
  select: 'Select',
  checkbox: 'Checkbox',
  'checkbox-group': 'Checkboxes',
  'radio-group': 'Radio',
  textarea: 'Textarea',
  switch: 'Switch',
  slider: 'Slider',
  rating: 'Rating',
  'input-color': 'Color',
  'verification-code': 'Verification Code',
  button: 'Button',
};

/** MVP stage 白名单类型（六域/domain-host 之外的可落画布面）。 */
export const MVP_PALETTE_TYPES: readonly string[] = [
  'page',
  'container',
  'flex',
  'grid',
  'collapse',
  'tabs',
  ...Object.keys(DESIGNER_SCAFFOLDS),
];

/** 设计器自持 registry：MVP 三家族（basic 布局/展示 + form + layout）。 */
export function createPageDesignerRegistry(): RendererRegistry {
  const registry = createRendererRegistry();
  registerBasicRenderers(registry);
  registerFormRenderers(registry);
  registerLayoutRenderers(registry);
  return registry;
}

/**
 * palette 徽标语义的容器判定：region 槽须声明 `regionKey`（设计器可落子的结构槽）。
 * `isContainerDefinition` 的 `regionKey ?? key` 兜底把无 regionKey 的模板槽 region
 * （input 族的 suggestTemplate / select 的 optionTemplate——内容模板，不承载设计器
 * 子节点）也计为容器，导致这些叶子字段在 palette 错带容器徽标（UR-18 #7）。
 * 结构容器（form/fieldset/tabs/layout 家族）的 region 规则全部声明 regionKey，
 * 本判定与 `isContainerDefinition` 在它们上零差异。
 */
function hasStructuralRegion(definition: RendererDefinition): boolean {
  return (
    definition.fields?.some(
      (rule) => rule.kind === 'region' && typeof rule.regionKey === 'string' && rule.regionKey !== '',
    ) ?? false
  );
}

function toScaffoldedItem(type: string, definition: NonNullable<ReturnType<RendererRegistry['get']>>): PaletteItem {
  return {
    type,
    displayName: definition.displayName ?? PALETTE_DISPLAY_NAME_FALLBACKS[type] ?? type,
    ...(definition.icon !== undefined ? { icon: definition.icon } : {}),
    group: definition.category ?? 'form',
    isContainer: hasStructuralRegion(definition),
    isOpaqueLeaf: classifyNode(definition) === 'opaque-leaf',
  };
}

/**
 * MVP palette 清单：core 三条规则过滤（s2 stage）为主，白名单补脚手架条目。
 * registry 顺序保持稳定；六域 / domain-host / 无脚手架可补的 type 全部排除。
 */
export function buildMvpPaletteItems(registry: RendererRegistry): PaletteItem[] {
  const items = new Map<string, PaletteItem>(
    buildPaletteItems(registry, 's2-layout-form').map((item) => [item.type, item]),
  );
  for (const type of MVP_PALETTE_TYPES) {
    if (items.has(type)) continue;
    const definition = registry.get(type);
    if (!definition) continue;
    if (classifyNode(definition) === 'opaque-leaf') continue;
    const scaffold = definition.defaultSchema ?? DESIGNER_SCAFFOLDS[type];
    if (!isSchema(scaffold)) continue;
    items.set(type, toScaffoldedItem(type, definition));
  }
  return [...items.values()];
}

/** palette 落节点脚手架：definition 优先，设计器侧兜底。 */
export function resolvePaletteScaffold(type: string, registry: RendererRegistry): SchemaInput | null {
  const definition = registry.get(type);
  const candidate = definition?.defaultSchema ?? DESIGNER_SCAFFOLDS[type];
  if (!definition || !isSchema(candidate)) return null;
  if (classifyNode(definition) === 'opaque-leaf') return null;
  return candidate;
}
