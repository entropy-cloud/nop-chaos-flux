import type { ScadaConfigDiff, ScadaSymbolNode } from '../../serialization/config-types.js';

/**
 * 对齐/分布算法（design-toolbox.md §4.2.1，编辑器适配层纯逻辑）。
 *
 * 基于 selection 包围盒重排各图元 x/y（保持 width/height 不变）。M3 采用扁平算法（T1 接受）：
 * 不解析 group 嵌套相对坐标，按图元顶层 bounds（x/y/width/height）计算。
 *
 * 产出 forward diff = `{updated: [{id, patch: {x, y}}, ...]}`（operationKind 由调用方标注为
 * `transform-move`，整组对齐 = 1 个 diff 入栈）。selection 不足返回 `insufficient-selection`。
 *
 * 纯逻辑（无 React / leafer 依赖），Vitest 单测先行。
 */

export type AlignDirection = 'left' | 'right' | 'top' | 'bottom' | 'hcenter' | 'vcenter';
export type DistributeDirection = 'horizontal' | 'vertical';

export interface AlignDistributeResult {
  ok: boolean;
  error?: 'insufficient-selection';
  /** forward diff（updated 仅含实际发生位移的图元；无位移时为空 updated，调用方据此跳过入栈）。 */
  diff?: ScadaConfigDiff;
}

/** 对齐需要 ≥2 个图元。 */
export const MIN_ALIGN_SELECTION = 2;
/** 分布需要 ≥3 个图元。 */
export const MIN_DISTRIBUTE_SELECTION = 3;

interface NodeBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function toBounds(node: ScadaSymbolNode): NodeBounds {
  return {
    id: node.id,
    x: node.x ?? 0,
    y: node.y ?? 0,
    width: node.width ?? 0,
    height: node.height ?? 0,
  };
}

/**
 * 对齐 selection（design-toolbox.md §4.2.1）。
 *
 * 六方向：
 * - left / right / hcenter：重排 x（left=包围盒左 / right=右边对齐 / hcenter=水平居中）；
 * - top / bottom / vcenter：重排 y。
 *
 * 仅产出实际位移图元的 patch（位移为 0 的图元不入 diff，避免冗余）。
 */
export function alignSelection(
  nodes: ScadaSymbolNode[],
  direction: AlignDirection,
): AlignDistributeResult {
  if (nodes.length < MIN_ALIGN_SELECTION) {
    return { ok: false, error: 'insufficient-selection' };
  }
  const bounds = nodes.map(toBounds);
  const horizontal = direction === 'left' || direction === 'right' || direction === 'hcenter';

  const minLeft = Math.min(...bounds.map((b) => b.x));
  const maxRight = Math.max(...bounds.map((b) => b.x + b.width));
  const minTop = Math.min(...bounds.map((b) => b.y));
  const maxBottom = Math.max(...bounds.map((b) => b.y + b.height));
  const hCenter = (minLeft + maxRight) / 2;
  const vCenter = (minTop + maxBottom) / 2;

  const updated: Array<{ id: string; patch: Partial<ScadaSymbolNode> }> = [];
  for (const b of bounds) {
    let newX = b.x;
    let newY = b.y;
    if (horizontal) {
      switch (direction) {
        case 'left':
          newX = minLeft;
          break;
        case 'right':
          newX = maxRight - b.width;
          break;
        case 'hcenter':
          newX = hCenter - b.width / 2;
          break;
      }
    } else {
      switch (direction) {
        case 'top':
          newY = minTop;
          break;
        case 'bottom':
          newY = maxBottom - b.height;
          break;
        case 'vcenter':
          newY = vCenter - b.height / 2;
          break;
      }
    }
    const patch: Partial<ScadaSymbolNode> = {};
    if (Math.abs(newX - b.x) > 0) patch.x = newX;
    if (Math.abs(newY - b.y) > 0) patch.y = newY;
    if (Object.keys(patch).length > 0) updated.push({ id: b.id, patch });
  }

  return { ok: true, diff: { added: [], removed: [], updated } };
}

/**
 * 分布 selection（design-toolbox.md §4.2.1）：按水平/垂直方向排序后等间距重排 x/y。
 *
 * 首尾图元固定，中间图元在首尾之间均匀分布（按左上角坐标等距）。保持 width/height 不变。
 */
export function distributeSelection(
  nodes: ScadaSymbolNode[],
  direction: DistributeDirection,
): AlignDistributeResult {
  if (nodes.length < MIN_DISTRIBUTE_SELECTION) {
    return { ok: false, error: 'insufficient-selection' };
  }
  const bounds = nodes.map(toBounds);
  const horizontal = direction === 'horizontal';
  const sorted = [...bounds].sort((a, b) =>
    horizontal ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x,
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const start = horizontal ? first.x : first.y;
  const end = horizontal ? last.x : last.y;
  const span = end - start;
  const denom = sorted.length - 1;

  const updated: Array<{ id: string; patch: Partial<ScadaSymbolNode> }> = [];
  sorted.forEach((b, i) => {
    const target = denom > 0 ? start + (span * i) / denom : start;
    const patch: Partial<ScadaSymbolNode> = {};
    if (horizontal) {
      if (Math.abs(target - b.x) > 0) patch.x = target;
    } else {
      if (Math.abs(target - b.y) > 0) patch.y = target;
    }
    if (Object.keys(patch).length > 0) updated.push({ id: b.id, patch });
  });

  return { ok: true, diff: { added: [], removed: [], updated } };
}
