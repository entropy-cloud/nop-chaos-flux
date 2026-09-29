import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Node } from '@xyflow/react';
import { computeAlignmentGuides, useAlignmentGuides } from './use-alignment-guides.js';

describe('computeAlignmentGuides', () => {
  const dragged = { x: 100, y: 200, width: 220, height: 80 };

  it('snaps left edge to sibling left edge', () => {
    const result = computeAlignmentGuides(dragged, [{ x: 103, y: 40, width: 220, height: 80 }]);
    expect(result.vertical).toBe(103);
    expect(result.dx).toBe(3);
    expect(result.horizontal).toBeNull();
    expect(result.dy).toBe(0);
  });

  it('snaps center to sibling center vertically and horizontally at once', () => {
    const result = computeAlignmentGuides(
      { x: 100, y: 200, width: 220, height: 80 },
      [{ x: 80, y: 232, width: 260, height: 120 }],
    );
    // dragged center x = 210, sibling center x = 210 → already aligned: shift 0
    expect(result.vertical).toBe(210);
    expect(result.dx).toBe(0);
    // dragged center y = 240, sibling center y = 292 → shift -52 超阈值 → 不吸附
    expect(result.horizontal).toBeNull();
  });

  it('picks the closest candidate when several are within threshold', () => {
    const result = computeAlignmentGuides(dragged, [
      { x: 101, y: 0, width: 220, height: 80 }, // right edge 321: |321-320|=1
      { x: 0, y: 0, width: 320, height: 80 }, // right edge 320: |320-320|=0
    ]);
    expect(result.vertical).toBe(320);
    expect(result.dx).toBe(0);
  });

  it('ignores shifts beyond the threshold', () => {
    const result = computeAlignmentGuides(dragged, [{ x: 130, y: 0, width: 220, height: 80 }]);
    expect(result.vertical).toBeNull();
    expect(result.horizontal).toBeNull();
  });

  it('snaps top edge to sibling bottom edge horizontally', () => {
    const result = computeAlignmentGuides(dragged, [{ x: 0, y: 0, width: 100, height: 284 }]);
    expect(result.horizontal).toBe(284);
    expect(result.dy).toBe(4);
  });
});
describe('useAlignmentGuides state identity', () => {
  function node(id: string, x: number, y: number): Node {
    return { id, position: { x, y }, data: {} } as unknown as Node;
  }

  it('keeps the guides state reference when the aligned value is unchanged', () => {
    const nodes = [node('sibling', 100, 400)];
    const { result } = renderHook(() =>
      useAlignmentGuides({ getNodes: () => nodes, applyPosition: () => undefined }),
    );
    const dragNode = node('drag', 100, 200);

    act(() => {
      result.current.onNodeDrag({}, dragNode, [dragNode]);
    });
    const first = result.current.guides;
    expect(first.vertical).toBe(100);

    act(() => {
      result.current.onNodeDrag({}, dragNode, [dragNode]);
    });

    expect(result.current.guides).toBe(first);
  });

  it('keeps the null guides reference across repeated drag stops with no active guides', () => {
    const nodes = [node('sibling', 400, 400)];
    const { result } = renderHook(() =>
      useAlignmentGuides({ getNodes: () => nodes, applyPosition: () => undefined }),
    );
    const dragNode = node('drag', 100, 200);

    act(() => {
      result.current.onNodeDrag({}, dragNode, [dragNode]);
    });
    act(() => {
      result.current.onNodeDragStop();
    });
    const cleared = result.current.guides;
    expect(cleared.vertical).toBeNull();

    act(() => {
      result.current.onNodeDragStop();
    });
    expect(result.current.guides).toBe(cleared);
  });
});
