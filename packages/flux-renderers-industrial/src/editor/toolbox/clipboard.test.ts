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
});
