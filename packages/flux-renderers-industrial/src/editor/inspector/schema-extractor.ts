import type {
  ScadaPropEditorWidget,
  ScadaPropFieldGroup,
  ScadaSymbolDefinition,
  ScadaSymbolPropSchemaEntry,
} from '../../symbols/symbol-types.js';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';
import { readConnections } from '../connection/anchor-snap.js';

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
  // plan 522 / L5.3（design-binding-panel.md §2.1）：bindings/states 升级结构化编辑面
  // （binding-editor/state-editor），animations/events 维持 json-editor（event 动作编辑器归 L5.8 O1）。
  injectVirtualField(groups, 'binding', 'bindings', 'object', 'binding-editor');
  injectVirtualField(groups, 'state', 'states', 'object', 'state-editor');
  injectVirtualField(groups, 'animation', 'animations', 'array', 'json-editor');
  injectVirtualField(groups, 'event', 'events', 'array', 'json-editor');

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
  widget: ScadaPropEditorWidget = 'json-editor',
): void {
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group)!.push({
    key,
    entry: { type, widget, group },
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

/** junction connections 只读列表行（design-connection.md §4 + plan 521 / U6）。 */
export interface JunctionConnectionRow {
  id: string;
  /** 目标设备 id（target 未声明时为空串 → dangling）。 */
  target: string;
  direction: 'in' | 'out' | 'bidirectional';
  /** dangling：target 未声明或不存在于当前 working copy id 集。 */
  dangling: boolean;
}

/**
 * 对 pipe-junction 类型注入 connections 只读列表（plan 521 / U6，readConnections 复用；
 * 编辑归 U1 连接管理弹层——本面只读）。
 *
 * 非 junction 类型返回 undefined（inspector 不渲染该节）；junction 返回逐条投影
 * （id/target/direction/dangling），dangling 检测按传入的现存 id 集（与 listAllConnections
 * 同语义：target 未声明或不存在均计 dangling）。
 */
export function extractJunctionConnections(
  node: ScadaSymbolNode,
  existingIds: Set<string>,
): JunctionConnectionRow[] | undefined {
  if (node.type !== 'scada-pipe-junction') return undefined;
  return readConnections(node.custom).map((connection) => ({
    id: connection.id,
    target: connection.target ?? '',
    direction: connection.direction,
    dangling: connection.target === undefined || !existingIds.has(connection.target),
  }));
}
