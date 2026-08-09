import { Group, Rect } from 'leafer-ui';
import { toShapeAttrs } from './base-shapes/common.js';
import type { LeafNode, ScadaSymbolPropSchema, ScadaSymbolProps } from './symbol-types.js';

/**
 * 复合图元公共装配（I9.1–I9.2，design-symbols.md §4.3）：
 * - 复合根 = Group，子形状按角色命名：body（主体）/rotor|impeller|blades|needle（旋转件）/
 *   core（开关件）/liquid|bar（长度驱动件）/label（文本）；
 * - applyProps 按角色路由增量：rotation → 旋转件，width/height → 长度件 ?? 主体，
 *   text/textColor → 文本件，位置/可见性/透明度 → 根，其余样式字段 → 主体。
 */

export interface CompositeParts {
  root: LeafNode;
  body: LeafNode;
  rotor?: LeafNode;
  core?: LeafNode;
  extent?: LeafNode;
  text?: LeafNode;
  /**
   * 容器几何重算 hook（plan 2026-08-06-0900-2 P2-4）：
   * 无 extent part 的复合族（device/instrument-gauge/sensor-control）width/height 经 applyProps
   * 变更时，由 `applyCompositeProps` 的 EXTENT_FIELDS 分支回落调用——重算 body 容器尺寸 +
   * 子形状（rotor/core/blades/label 等）相对锚点，使 width/height binding/diff 产可见几何响应。
   * 有 extent part 的族（level/thermometer/progress）width/height 仍路由到 liquid/bar 长度件（既定语义）。
   */
  resize?: (key: 'width' | 'height', value: number, parts: CompositeParts) => void;
}

export interface CompositeApplyOptions {
  /** rotation 属性路由目标：'rotor'（动画驱动面，缺省）| 'root'（整机旋转）。 */
  rotationTarget?: 'rotor' | 'root';
}

const ROOT_FIELDS = new Set(['x', 'y', 'visible', 'opacity', 'scale']);
const BODY_FIELDS = new Set(['fill', 'stroke', 'strokeWidth', 'strokeDash', 'shadow', 'textColor']);
const EXTENT_FIELDS = new Set(['width', 'height']);
// plan 2026-08-09-0121-2 Workstream B 本轮-9：Group 节点只承接 root 级字段（位置/可见/透明/scale/rotation）。
// width/height/fill/stroke/strokeWidth/shadow/text/fillStyle 对 Group 无渲染意义（Group 是容器，非绘制图元），
// 且写 width/height 会改变 leafer bounds 语义（A1 P0 around:'center' 修复未触碰 toShapeAttrs，确认安全）。
// 在 createCompositeGroup 调用点过滤（不污染 toShapeAttrs——base-shapes 的 Rect 等仍需 fill/stroke/width）。
const GROUP_ATTR_KEYS = new Set(['x', 'y', 'rotation', 'visible', 'opacity', 'scaleX', 'scaleY']);

/** 节点属性写入（leafer `set` 契约；mock 面同形状）。 */
export function setAttrs(node: LeafNode, attrs: Record<string, unknown>): void {
  (node as unknown as { set: (data: Record<string, unknown>) => void }).set(attrs);
}

/** 默认路由：rotation → 旋转件；width/height → 长度件 ?? 主体；样式 → body；位置/可见性 → 根。 */
export function applyCompositeProps(
  root: LeafNode,
  parts: CompositeParts,
  props: Partial<ScadaSymbolProps>,
  options: CompositeApplyOptions = {},
): void {
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (key === 'rotation') {
      const target = options.rotationTarget === 'root' ? undefined : (parts.rotor ?? parts.core);
      if (target) setAttrs(target, { rotation: value });
      else setAttrs(root, { rotation: value });
      continue;
    }
    if (key === 'text' && parts.text) {
      setAttrs(parts.text, { text: value });
      continue;
    }
    if (key === 'textColor' && parts.text) {
      setAttrs(parts.text, { fill: value });
      continue;
    }
    if (ROOT_FIELDS.has(key)) {
      if (key === 'scale') setAttrs(root, { scaleX: value, scaleY: value });
      else setAttrs(root, { [key]: value });
      continue;
    }
    if (EXTENT_FIELDS.has(key)) {
      // plan 2026-08-08-1910-1 Phase 2（A11）：width/height 门禁扩展——有 extent part（liquid/bar 长度件）路由到 extent；
      // 同时若有 per-symbol resize hook 也调用之（重算 body 容器几何），使容器与 extent 两不误。
      // resize hook 负责忽略 binding 驱动维度（如 level height=液位）只处理几何维度（如 level width=罐宽）。
      if (parts.extent) setAttrs(parts.extent, { [key]: value });
      parts.resize?.(key as 'width' | 'height', value as number, parts);
      continue;
    }
    if (BODY_FIELDS.has(key)) {
      setAttrs(parts.body, toNodePatchOf(parts.body, key, value));
      continue;
    }
    // 其余声明层字段（custom/states/bindings/animations）不写节点
  }
}

function toNodePatchOf(node: LeafNode, key: string, value: unknown): Record<string, unknown> {
  if (key === 'strokeDash') return { dashPattern: value };
  if (key === 'textColor' && node.tag === 'Text') return { fill: value };
  return { [key]: value };
}

/** 复合根创建：Group + 角色子节点挂载，返回根与角色 parts。 */
export function createCompositeGroup(
  props: ScadaSymbolProps,
  children: Array<{ name: string; node: LeafNode }>,
): { root: LeafNode; parts: CompositeParts } {
  // 本轮-9：Group 仅承接 root 级 attrs（过滤掉 width/height/fill/stroke 等无渲染意义字段）。
  const attrs = toShapeAttrs(props);
  const groupAttrs: Record<string, unknown> = {};
  for (const key of Object.keys(attrs)) {
    if (GROUP_ATTR_KEYS.has(key)) groupAttrs[key] = attrs[key];
  }
  const root = new Group(groupAttrs) as LeafNode;
  // plan 2026-08-09-0121-2 Workstream B 本轮-8（空 children 守卫）：children 为空时旧实现 body=undefined，
  // 后续 applyCompositeProps 的 BODY_FIELDS 路由 setAttrs(undefined) 崩溃。改为结构化 fallback——
  // console.warn 上报作者错误 + 透明占位 body（visible:false，几何取 props.width/height 保 bounds 合理），
  // 使 BODY_FIELDS 路由有合法落点（不崩），复合仍可作空容器渲染。
  let bodyNode = children[0]?.node;
  if (children.length === 0) {
    console.warn(
      '[scada-composite] createCompositeGroup received no children parts; falling back to a transparent body. ' +
        'Define at least a "body" child in the composite create() to avoid this.',
    );
    bodyNode = new Rect({
      x: 0,
      y: 0,
      width: (props.width as number) ?? 0,
      height: (props.height as number) ?? 0,
      visible: false,
    }) as LeafNode;
    (root as unknown as { add: (node: LeafNode) => void }).add(bodyNode);
  }
  const parts: CompositeParts = { root, body: bodyNode };
  for (const child of children) {
    (root as unknown as { add: (node: LeafNode) => void }).add(child.node);
    if (child.name === 'body') parts.body = child.node;
    else if (child.name === 'rotor' || child.name === 'impeller' || child.name === 'blades' || child.name === 'needle') {
      parts.rotor = child.node;
    } else if (child.name === 'core') parts.core = child.node;
    else if (child.name === 'liquid' || child.name === 'bar') parts.extent = child.node;
    else if (child.name === 'label') parts.text = child.node;
  }
  return { root, parts };
}

/** 复合图元公共属性 schema（几何/样式/文本/声明层字段）。 */
export const compositePropSchema: ScadaSymbolPropSchema = {
  x: { type: 'number' },
  y: { type: 'number' },
  width: { type: 'number' },
  height: { type: 'number' },
  rotation: { type: 'number' },
  scale: { type: 'number' },
  visible: { type: 'boolean' },
  opacity: { type: 'number' },
  fill: { type: 'string' },
  stroke: { type: 'string' },
  strokeWidth: { type: 'number' },
  strokeDash: { type: 'array' },
  shadow: { type: 'object' },
  text: { type: 'string' },
  textColor: { type: 'string' },
  custom: { type: 'object' },
  states: { type: 'object' },
  bindings: { type: 'object' },
  animations: { type: 'object' },
  events: { type: 'object' },
};
