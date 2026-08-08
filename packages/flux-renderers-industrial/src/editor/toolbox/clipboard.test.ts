import { describe, expect, it } from 'vitest';
import type { ScadaSymbolNode } from '../../serialization/config-types.js';
import {
  buildClipboardCopy,
  buildClipboardCut,
  buildClipboardPaste,
  PASTE_OFFSET,
} from './clipboard.js';

function rect(id: string, x = 0, y = 0): ScadaSymbolNode {
  return { id, type: 'scada-rect', x, y, width: 50, height: 50 };
}

function group(id: string, children: ScadaSymbolNode[]): ScadaSymbolNode {
  return { id, type: 'scada-group', x: 0, y: 0, children };
}

describe('clipboard (design-toolbox.md §4.3)', () => {
  describe('buildClipboardCopy', () => {
    it('deep-clones nodes into clipboard without sharing references', () => {
      const nodes = [rect('a', 10, 20)];
      const cb = buildClipboardCopy(nodes);
      expect(cb.operation).toBe('copy');
      expect(cb.symbols).toHaveLength(1);
      expect(cb.symbols[0]).not.toBe(nodes[0]);
      expect(cb.symbols[0].id).toBe('a');
      expect(cb.symbols[0].x).toBe(10);
      // mutate clone does not affect original
      cb.symbols[0].x = 999;
      expect(nodes[0].x).toBe(10);
    });

    it('deep-clones children recursively', () => {
      const nodes = [group('g', [rect('c1'), rect('c2')])];
      const cb = buildClipboardCopy(nodes);
      expect(cb.symbols[0].children).toHaveLength(2);
      expect(cb.symbols[0].children![0]).not.toBe(nodes[0].children![0]);
    });
  });

  describe('buildClipboardCut', () => {
    it('produces clipboard + removed diff of all ids', () => {
      const nodes = [rect('a'), rect('b')];
      const { clipboard, forward } = buildClipboardCut(nodes);
      expect(clipboard.operation).toBe('cut');
      expect(forward.added).toEqual([]);
      expect(forward.updated).toEqual([]);
      expect(forward.removed).toEqual(['a', 'b']);
    });
  });

  describe('buildClipboardPaste', () => {
    it('assigns new ids with -copy-<counter> suffix (T4 id uniqueness)', () => {
      const cb = buildClipboardCopy([rect('a'), rect('b')]);
      const { forward, newIds, counterConsumed } = buildClipboardPaste(cb, 0);
      expect(forward.added).toHaveLength(2);
      expect(newIds).toEqual(['a-copy-1', 'b-copy-2']);
      expect(counterConsumed).toBe(2);
      expect(forward.added.map((n) => n.id)).toEqual(newIds);
    });

    it('applies offset to avoid overlap', () => {
      const cb = buildClipboardCopy([rect('a', 100, 200)]);
      const { forward } = buildClipboardPaste(cb, 0);
      expect(forward.added[0].x).toBe(100 + PASTE_OFFSET.x);
      expect(forward.added[0].y).toBe(200 + PASTE_OFFSET.y);
    });

    it('multiple pastes from same clipboard produce unique ids (monotonic counter)', () => {
      const cb = buildClipboardCopy([rect('a')]);
      const p1 = buildClipboardPaste(cb, 0);
      const p2 = buildClipboardPaste(cb, p1.counterConsumed);
      const p3 = buildClipboardPaste(cb, p1.counterConsumed + p2.counterConsumed);
      expect(p1.newIds).toEqual(['a-copy-1']);
      expect(p2.newIds).toEqual(['a-copy-2']);
      expect(p3.newIds).toEqual(['a-copy-3']);
    });

    it('reassigns group children ids recursively to keep uniqueness', () => {
      const cb = buildClipboardCopy([group('g', [rect('c1')])]);
      const { forward, newIds } = buildClipboardPaste(cb, 0);
      expect(newIds).toEqual(['g-copy-1']);
      expect(forward.added[0].children![0].id).toBe('g-copy-1-c1');
    });

    it('paste forward diff is added-only (no removed/updated)', () => {
      const cb = buildClipboardCopy([rect('a')]);
      const { forward } = buildClipboardPaste(cb, 5);
      expect(forward.removed).toEqual([]);
      expect(forward.updated).toEqual([]);
      expect(forward.added.length).toBeGreaterThan(0);
    });

    it('handles nodes without x/y (defaults to 0 before offset) + custom field clone', () => {
      const node: ScadaSymbolNode = { id: 'n', type: 'scada-rect', custom: { foo: 'bar' } };
      const cb = buildClipboardCopy([node]);
      const { forward } = buildClipboardPaste(cb, 0);
      const pasted = forward.added[0];
      // x/y undefined → (undefined ?? 0) + offset
      expect(pasted.x).toBe(0 + PASTE_OFFSET.x);
      expect(pasted.y).toBe(0 + PASTE_OFFSET.y);
      // custom deep-cloned
      expect(pasted.custom).toEqual({ foo: 'bar' });
      expect(pasted.custom).not.toBe(node.custom);
    });

    // plan 2026-08-08-0900-1 Phase 1 / P2 #4：clipboard 深克隆 nested custom——
    // copy 产物 custom.connections 不与源节点共享数组引用（防粘贴/undo 后串改）。
    it('deep-clones nested custom.connections (no shared array reference)', () => {
      const node: ScadaSymbolNode = {
        id: 'j1',
        type: 'scada-pipe-junction',
        custom: { connections: [{ id: 'c1', x: 0.5, y: 0.5, direction: 'out', target: 'dev' }] },
      };
      const cb = buildClipboardCopy([node]);
      const sourceConn = (node.custom as { connections: Array<{ x: number }> }).connections;
      const clipConn = (cb.symbols[0].custom as { connections: Array<{ x: number }> }).connections;
      // 数组与元素均不共享引用。
      expect(clipConn).not.toBe(sourceConn);
      expect(clipConn[0]).not.toBe(sourceConn[0]);
      clipConn[0].x = 0.123;
      expect(sourceConn[0].x).toBe(0.5);
    });

    it('copy then cut then paste composition works', () => {
      const nodes = [rect('x', 5, 5)];
      const copyCb = buildClipboardCopy(nodes);
      const cutRes = buildClipboardCut(nodes);
      // paste from copy clipboard
      const pasteFromCopy = buildClipboardPaste(copyCb, 0);
      expect(pasteFromCopy.newIds).toEqual(['x-copy-1']);
      // paste from cut clipboard
      const pasteFromCut = buildClipboardPaste(cutRes.clipboard, 10);
      expect(pasteFromCut.newIds).toEqual(['x-copy-11']);
      expect(cutRes.forward.removed).toEqual(['x']);
    });
  });

  // plan 2026-08-08-1910-2 Phase 3 / A7：clipboard connection target/id 重写。
  // reassignIdsRecursive 只改 node.id + 子树 id，不改 node.custom.connections。粘贴含连线的 junction：
  // connection.id 仍是原件的（重复 id）；connection.target 仍指原件 target id（副本连错对象）。
  describe('A7 — buildClipboardPaste rewrites connection target/id (clipboard.ts)', () => {
    function junctionWithConn(id: string, connId: string, targetId: string): ScadaSymbolNode {
      return {
        id,
        type: 'scada-pipe-junction',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        custom: { connections: [{ id: connId, x: 0.5, y: 0, direction: 'out', target: targetId }] },
      };
    }

    it('paste junction + its target together → copy connection.target points at copy target; connection.id is unique', () => {
      const j = junctionWithConn('J', 'J-conn-0', 'device-1');
      const dev = rect('device-1', 200, 100);
      const cb = buildClipboardCopy([j, dev]);
      const { forward } = buildClipboardPaste(cb, 0);

      // 副本 id 映射：J → J-copy-1，device-1 → device-1-copy-2。
      const pastedJ = forward.added.find((n) => n.type === 'scada-pipe-junction')!;
      const pastedDev = forward.added.find((n) => n.id.endsWith('device-1-copy-2'))!;
      expect(pastedJ.id).toBe('J-copy-1');
      expect(pastedDev.id).toBe('device-1-copy-2');

      const conns = (pastedJ.custom as { connections: Array<{ id: string; target: string }> }).connections;
      expect(conns).toHaveLength(1);
      // target 重写指向副本 device-1-copy-2（非原件 device-1）。
      expect(conns[0].target).toBe('device-1-copy-2');
      // connection.id 重写为基于副本 junction id（不与原件 J-conn-0 重复）。
      expect(conns[0].id).not.toBe('J-conn-0');
      expect(conns[0].id.startsWith('J-copy-1-')).toBe(true);
    });

    it('paste junction whose target is NOT in selection → target kept as-is (dangling-tolerant, diagnostic detects)', () => {
      // device-1 不在选区：副本 junction 的 connection.target 仍指原件 device-1（dangling）。
      const j = junctionWithConn('J', 'J-conn-0', 'device-1');
      const cb = buildClipboardCopy([j]);
      const { forward } = buildClipboardPaste(cb, 0);
      const pastedJ = forward.added.find((n) => n.type === 'scada-pipe-junction')!;
      const conns = (pastedJ.custom as { connections: Array<{ id: string; target: string }> }).connections;
      expect(conns[0].target).toBe('device-1');
      expect(conns[0].id).not.toBe('J-conn-0');
    });

    it('paste junction with multiple connections → each connection.id unique within the copy', () => {
      const j: ScadaSymbolNode = {
        id: 'J',
        type: 'scada-pipe-junction',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        custom: {
          connections: [
            { id: 'J-conn-0', x: 0.5, y: 0, direction: 'out', target: 'device-1' },
            { id: 'J-conn-1', x: 0, y: 0.5, direction: 'out', target: 'device-2' },
          ],
        },
      };
      const cb = buildClipboardCopy([j, rect('device-1'), rect('device-2')]);
      const { forward } = buildClipboardPaste(cb, 0);
      const pastedJ = forward.added.find((n) => n.type === 'scada-pipe-junction')!;
      const conns = (pastedJ.custom as { connections: Array<{ id: string; target: string }> }).connections;
      expect(conns).toHaveLength(2);
      // 两条 connection.id 互不碰撞（均基于副本 junction id 重新生成）。
      expect(new Set(conns.map((c) => c.id)).size).toBe(2);
      expect(conns.map((c) => c.target).sort()).toEqual(['device-1-copy-2', 'device-2-copy-3']);
    });
  });
});
