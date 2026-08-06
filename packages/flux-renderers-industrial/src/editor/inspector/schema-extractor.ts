import type {
  ScadaPropEditorWidget,
  ScadaPropFieldGroup,
  ScadaSymbolDefinition,
  ScadaSymbolPropSchemaEntry,
} from '../../symbols/symbol-types.js';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';

/**
 * 属性面板字段分组（design-property-panel.md §4.3）。
 */
export interface PanelFieldGroup {
  group: ScadaPropFieldGroup;
  label: string;
  fields: PanelField[];
}

/**
 * 属性面板字段（design-property-panel.md §4.3）。
 */
export interface PanelField {
  key: string;
  entry: ScadaSymbolPropSchemaEntry;
  defaultValue: unknown;
}

const GROUP_ORDER: ScadaPropFieldGroup[] = [
  'geometry',
  'style',
  'binding',
  'state',
  'animation',
  'event',
];

const GROUP_LABELS: Record<ScadaPropFieldGroup, string> = {
  geometry: 'industrial.scada.editor.group.geometry',
  style: 'industrial.scada.editor.group.style',
  binding: 'industrial.scada.editor.group.binding',
  state: 'industrial.scada.editor.group.state',
  animation: 'industrial.scada.editor.group.animation',
  event: 'industrial.scada.editor.group.event',
};

/** 已知 geometry 字段集合。 */
const GEOMETRY_KEYS = new Set(['x', 'y', 'width', 'height', 'rotation', 'scale', 'visible', 'opacity']);

/** 已知 style 字段集合。 */
const STYLE_KEYS = new Set([
  'fill', 'stroke', 'strokeWidth', 'strokeDash', 'dashOffset', 'fillStyle',
  'shadow', 'text', 'textColor', 'textSize', 'fontFamily', 'fontWeight', 'align', 'flow',
]);

/**
 * 按 type 推导默认 widget（design-property-panel.md §4.4 R3 保护表）。
 */
function deriveWidget(type: string): ScadaPropEditorWidget {
  switch (type) {
    case 'number':
      return 'number-input';
    case 'string':
      return 'text-input';
    case 'boolean':
      return 'switch';
    case 'object':
    case 'array':
      return 'json-editor';
    default:
      return 'text-input';
  }
}

/**
 * 从图元定义抽取属性面板字段集（design-property-panel.md §4.3）。
 *
 * 算法：
 * 1. geometry/style 字段从 definition.props 抽取（按 entry.group 或 key 名归类）。
 * 2. binding/state/animation/event 为固定虚拟字段（widget=json-editor）。
 * 3. defaults 权威源：优先读 definition.defaults[key]，fallback entry.defaultValue。
 * 4. 组内按 definition.props 声明顺序。
 */
export function extractPanelFields(definition: ScadaSymbolDefinition): PanelFieldGroup[] {
  const groups = new Map<ScadaPropFieldGroup, PanelField[]>();

  for (const [key, entry] of Object.entries(definition.props)) {
    const group = entry.group ?? inferGroup(key);
    if (!groups.has(group)) groups.set(group, []);
    const widget = entry.widget ?? deriveWidget(entry.type);
    const defaults = definition.defaults as Record<string, unknown> | undefined;
    const defaultValue =
      defaults && key in defaults ? defaults[key] : entry.defaultValue;
    groups.get(group)!.push({ key, entry: { ...entry, widget }, defaultValue });
  }

  // 注入固定虚拟字段（binding/state/animation/event）。
  injectVirtualField(groups, 'binding', 'bindings', 'object');
  injectVirtualField(groups, 'state', 'states', 'object');
  injectVirtualField(groups, 'animation', 'animations', 'array');
  injectVirtualField(groups, 'event', 'events', 'array');

  // 按 GROUP_ORDER 排序输出，跳过空组。
  return GROUP_ORDER.filter((g) => groups.has(g) && groups.get(g)!.length > 0).map((g) => ({
    group: g,
    label: GROUP_LABELS[g],
    fields: groups.get(g)!,
  }));
}

function inferGroup(key: string): ScadaPropFieldGroup {
  if (GEOMETRY_KEYS.has(key)) return 'geometry';
  if (STYLE_KEYS.has(key)) return 'style';
  return 'style';
}

function injectVirtualField(
  groups: Map<ScadaPropFieldGroup, PanelField[]>,
  group: ScadaPropFieldGroup,
  key: string,
  type: 'object' | 'array',
): void {
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group)!.push({
    key,
    entry: { type, widget: 'json-editor', group },
    defaultValue: undefined,
  });
}

/**
 * 评估 visibleWhen 条件（design-property-panel.md §4.3 规则 5）。
 */
export function evaluateVisibleWhen(
  field: PanelField,
  node: ScadaSymbolNode,
): boolean {
  const condition = field.entry.visibleWhen;
  if (!condition) return true;
  const nodeValue = (node as unknown as Record<string, unknown>)[condition.field];
  if (condition.equals !== undefined) return nodeValue === condition.equals;
  if (condition.in !== undefined) return condition.in.includes(nodeValue);
  return true;
}
