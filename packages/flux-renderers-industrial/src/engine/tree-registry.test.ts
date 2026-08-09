import { describe, it, expect } from 'vitest';
import { TreeRegistry } from './tree-registry.js';

const node = (tag = 'Rect') => ({ tag, innerId: 1 }) as never;

describe('TreeRegistry (I5.1)', () => {
  it('should add entries with ascending z-order index', () => {
    const registry = new TreeRegistry();
    registry.add({ id: 'a', node: node() });
    registry.add({ id: 'b', node: node() });
    expect(registry.get('a')?.zIndex).toBe(0);
    expect(registry.get('b')?.zIndex).toBe(1);
  });

  it('should get / has / remove / clear entries', () => {
    const registry = new TreeRegistry();
    expect(registry.has('a')).toBe(false);
    registry.add({ id: 'a', node: node() });
    expect(registry.has('a')).toBe(true);
    expect(registry.get('a')?.id).toBe('a');
    expect(registry.remove('a')).toBe(true);
    expect(registry.remove('a')).toBe(false);
    expect(registry.has('a')).toBe(false);
    registry.add({ id: 'x', node: node() });
    registry.add({ id: 'y', node: node() });
    expect(registry.size()).toBe(2);
    registry.clear();
    expect(registry.size()).toBe(0);
    expect(registry.getSymbols()).toEqual([]);
  });

  it('should list symbols in insertion order', () => {
    const registry = new TreeRegistry();
    registry.add({ id: 'b', node: node() });
    registry.add({ id: 'a', node: node() });
    expect(registry.getSymbols().map((leaf) => leaf.id)).toEqual(['b', 'a']);
  });

  it('should keep parent references and compute subtree ids', () => {
    const registry = new TreeRegistry();
    registry.add({ id: 'g', node: node('Group'), parentId: undefined });
    registry.add({ id: 'c1', node: node(), parentId: 'g' });
    registry.add({ id: 'c2', node: node(), parentId: 'g' });
    registry.add({ id: 'solo', node: node() });
    expect(registry.get('c1')?.parentId).toBe('g');
    expect(registry.subtreeIds('g')).toEqual(['g', 'c1', 'c2']);
    expect(registry.subtreeIds('c1')).toEqual(['c1']);
    expect(registry.subtreeIds('solo')).toEqual(['solo']);
  });

  it('should resolve deep hit nodes to the symbol root via parent chain (deepest-hit regression)', () => {
    const registry = new TreeRegistry();
    const root = node('Group') as { parent?: unknown };
    const child = { parent: root };
    const grandchild = { parent: child };
    registry.add({ id: 'pump-1', node: root as never });
    expect(registry.findByNode(root as never)).toBe('pump-1');
    expect(registry.findByNode(child as never)).toBe('pump-1');
    expect(registry.findByNode(grandchild as never)).toBe('pump-1');
    expect(registry.findByNode({} as never)).toBeUndefined();
  });
});

// plan 2026-08-05-1253-1 Phase 2（open-audit P2-1）：subtreeIds O(subtree)（childrenOf 索引 + DFS）。
// 失败用例（修复前）：单遍 forward + ids.includes 依赖「父先于子插入」隐式不变式——
// 深度 ≥ 2 逆序插入（gc → c → g）时，遍历 gc 其父 c 尚未入 ids → gc 漏收 → 仅返回 ['g','c']。
// 修复后：childrenOf Map + DFS，不依赖插入序，O(subtree)。
describe('TreeRegistry subtreeIds DFS (plan 2026-08-05-1253-1 Phase 2)', () => {
  it('Proof: 深度≥2 逆序插入（gc → c → g）subtreeIds 仍返回完整三层（不依赖插入序）', () => {
    const registry = new TreeRegistry();
    // 逆序：孙先于子、子先于父插入（undo-redo diff / 第三方直调可触发）
    registry.add({ id: 'gc', node: node(), parentId: 'c' });
    registry.add({ id: 'c', node: node(), parentId: 'g' });
    registry.add({ id: 'g', node: node('Group'), parentId: undefined });
    // 修复前：forward 遍历 gc 时 c 尚未入 ids（c 在 gc 之后处理）→ gc 漏收 → 返 ['g','c']。
    // 修复后：DFS 自 g 经 childrenOf 下探 c → gc，返完整三层。
    expect(registry.subtreeIds('g').sort()).toEqual(['c', 'g', 'gc']);
  });

  it('remove 后 subtreeIds 不含已删节点（childrenOf 索引断链）', () => {
    const registry = new TreeRegistry();
    registry.add({ id: 'g', node: node('Group'), parentId: undefined });
    registry.add({ id: 'c1', node: node(), parentId: 'g' });
    registry.add({ id: 'c2', node: node(), parentId: 'g' });
    registry.remove('c1');
    // c1 已删：subtreeIds('g') 不含 c1
    expect(registry.subtreeIds('g').sort()).toEqual(['c2', 'g']);
    expect(registry.has('c1')).toBe(false);
  });

  it('remove 子树根后 childrenOf 断链（被删根的子不再经其可达）', () => {
    const registry = new TreeRegistry();
    registry.add({ id: 'g', node: node('Group'), parentId: undefined });
    registry.add({ id: 'c', node: node(), parentId: 'g' });
    registry.add({ id: 'gc', node: node(), parentId: 'c' });
    // 删 c（中间节点）：childrenOf 中 c 的子条目断链
    registry.remove('c');
    expect(registry.has('c')).toBe(false);
    // subtreeIds('g') 不含 c；gc 仍在 byId（caller 负责遍历子树逐个删，本层仅保证索引一致性）
    expect(registry.subtreeIds('g').sort()).toEqual(['g']);
  });

  it('clear 后 childrenOf 清空（subtreeIds 仅返回查询 id 自身或空）', () => {
    const registry = new TreeRegistry();
    registry.add({ id: 'g', node: node('Group'), parentId: undefined });
    registry.add({ id: 'c', node: node(), parentId: 'g' });
    registry.clear();
    expect(registry.size()).toBe(0);
    registry.add({ id: 'g2', node: node('Group'), parentId: undefined });
    registry.add({ id: 'c2', node: node(), parentId: 'g2' });
    // clear 后重新插入：subtreeIds 正常（旧索引不残留）
    expect(registry.subtreeIds('g2').sort()).toEqual(['c2', 'g2']);
  });

  it('既有正序插入用例不回归（g → c1 → c2，subtreeIds 顺序与原断言一致）', () => {
    const registry = new TreeRegistry();
    registry.add({ id: 'g', node: node('Group'), parentId: undefined });
    registry.add({ id: 'c1', node: node(), parentId: 'g' });
    registry.add({ id: 'c2', node: node(), parentId: 'g' });
    registry.add({ id: 'solo', node: node() });
    expect(registry.subtreeIds('g')).toEqual(['g', 'c1', 'c2']);
    expect(registry.subtreeIds('c1')).toEqual(['c1']);
    expect(registry.subtreeIds('solo')).toEqual(['solo']);
  });
});
