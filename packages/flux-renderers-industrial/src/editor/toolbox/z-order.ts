import type { ScadaSymbolNode } from '../../serialization/config-types.js';

/**
 * 层级（z 序）算法（design-toolbox.md §4.2.2，编辑器适配层纯逻辑）。
 *
 * z 序 = working copy `symbols` 数组顺序（数组末尾 = 顶层，design-engine.md §4.3）。
 * **不调 leafer Editor toTop/toBottom**（防双源化 T3）——经 symbols 数组重排，与 runtime
 * 序列化往返一致。
 *
 * 产出新的 symbols 数组顺序（同节点对象引用，重排）；调用方据此构造结构 diff 入栈
 * （design-undo-redo.md §4.3 结构 diff 模式）。
 *
 * 纯逻辑（无 React / leafer 依赖），Vitest 单测先行。
 */

export type ZOrderAction = 'toTop' | 'toBottom' | 'moveUp' | 'moveDown';

export interface ZOrderResult {
  ok: boolean;
  error?: 'symbol-not-found' | 'invalid-node';
  /** 重排后的新 symbols 数组顺序（与入参同节点引用，仅顺序变化；无变化时返回原顺序副本）。 */
  newOrder?: ScadaSymbolNode[];
  /** 实际发生位移的 nodeId 列表（调用方据此判定是否入栈）。 */
  movedIds?: string[];
}

/**
 * 经 z 序动作重排 symbols 数组。
 *
 * 多选场景：toTop/toBottom 保持选中图元间的相对顺序整体移动；moveUp/moveDown 对选中集合
 * 整体朝末尾/开头方向移动一格（与未选中邻居交换）。
 *
 * @param symbols 当前 symbols 数组（顶层；group 子树 z 序由 group 内部管理，M3 不处理嵌套 z 序）
 * @param selection 选中 nodeId 列表（操作目标）
 * @param action z 序动作
 */
export function reorderZOrder(
  symbols: ScadaSymbolNode[],
  selection: string[],
  action: ZOrderAction,
): ZOrderResult {
  if (selection.length === 0) {
    return { ok: false, error: 'symbol-not-found' };
  }
  const indexById = new Map(symbols.map((s, i) => [s.id, i] as const));
  const missing = selection.find((id) => !indexById.has(id));
  if (missing) {
    return { ok: false, error: 'symbol-not-found' };
  }

  const selectedSet = new Set(selection);
  // 选中图元按当前数组顺序排列（保持相对顺序）。
  const selectedInOrder = symbols.filter((s) => selectedSet.has(s.id));
  const unselectedInOrder = symbols.filter((s) => !selectedSet.has(s.id));

  let newOrder: ScadaSymbolNode[];
  switch (action) {
    case 'toTop':
      // 选中图元整体移到末尾（顶层）。
      newOrder = [...unselectedInOrder, ...selectedInOrder];
      break;
    case 'toBottom':
      // 选中图元整体移到开头（底层）。
      newOrder = [...selectedInOrder, ...unselectedInOrder];
      break;
    case 'moveUp':
    case 'moveDown': {
      newOrder = moveBlockByOne(symbols, selectedSet, action);
      break;
    }
  }

  const movedIds = computeMovedIds(symbols, newOrder);
  return { ok: true, newOrder, movedIds };
}

/**
 * moveUp/moveDown：选中集合整体向 end（顶层）/ start（底层）移动一格。
 *
 * 块感知（block-aware）：连续选中段作为整体与相邻未选中图元交换。
 * - moveUp：每个连续选中段 [lo..hi]，若 hi+1 未选中则把该图元旋转移到 lo 位置（整段朝 end 移 1 格）。
 * - moveDown：每个连续选中段 [lo..hi]，若 lo-1 未选中则把该图元旋转移到 hi 位置（整段朝 start 移 1 格）。
 *
 * z 序约定：数组 end = 顶层（design-engine.md §4.3）。
 */
function moveBlockByOne(
  symbols: ScadaSymbolNode[],
  selectedSet: Set<string>,
  action: 'moveUp' | 'moveDown',
): ScadaSymbolNode[] {
  const arr = [...symbols];
  const runs = contiguousRuns(arr, selectedSet);
  if (action === 'moveUp') {
    // 从高 lo 到低 lo 处理，避免索引漂移。
    for (const run of [...runs].sort((a, b) => b.lo - a.lo)) {
      const { lo, hi } = run;
      if (hi + 1 < arr.length && !selectedSet.has(arr[hi + 1].id)) {
        const [moved] = arr.splice(hi + 1, 1);
        arr.splice(lo, 0, moved);
      }
    }
  } else {
    // 从低 lo 到高 lo 处理。
    for (const run of [...runs].sort((a, b) => a.lo - b.lo)) {
      const { lo, hi } = run;
      if (lo - 1 >= 0 && !selectedSet.has(arr[lo - 1].id)) {
        const [moved] = arr.splice(lo - 1, 1);
        arr.splice(hi, 0, moved);
      }
    }
  }
  return arr;
}

/** 计算选中集合在数组中的连续段 [{lo, hi}]（闭区间）。 */
function contiguousRuns(
  arr: ScadaSymbolNode[],
  selectedSet: Set<string>,
): Array<{ lo: number; hi: number }> {
  const runs: Array<{ lo: number; hi: number }> = [];
  let i = 0;
  while (i < arr.length) {
    if (!selectedSet.has(arr[i].id)) {
      i += 1;
      continue;
    }
    const lo = i;
    while (i < arr.length && selectedSet.has(arr[i].id)) i += 1;
    runs.push({ lo, hi: i - 1 });
  }
  return runs;
}

/** 比较新旧顺序，返回位置发生变化的 nodeId 列表。 */
function computeMovedIds(prev: ScadaSymbolNode[], next: ScadaSymbolNode[]): string[] {
  const moved: string[] = [];
  for (let i = 0; i < prev.length; i++) {
    if (prev[i].id !== next[i].id) {
      if (!moved.includes(prev[i].id)) moved.push(prev[i].id);
      if (!moved.includes(next[i].id)) moved.push(next[i].id);
    }
  }
  return moved;
}
