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
