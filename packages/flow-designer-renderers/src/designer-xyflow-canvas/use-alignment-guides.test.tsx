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

  function change(id: string, x: number, y: number) {
    return { id, dragging: true as const, position: { x, y } };
  }

  it('keeps the guides state reference when the aligned value is unchanged', () => {
    const nodes = [node('sibling', 100, 400), node('drag', 100, 200)];
    const { result } = renderHook(() =>
      useAlignmentGuides({ getNodes: () => nodes, applyPosition: () => undefined }),
    );

    act(() => {
      result.current.handlePositionChanges([change('drag', 100, 200)]);
    });
    const first = result.current.guides;
    expect(first.vertical).toBe(100);

    act(() => {
      result.current.handlePositionChanges([change('drag', 100, 200)]);
    });

    expect(result.current.guides).toBe(first);
  });

  it('keeps the null guides reference across repeated drag stops with no active guides', () => {
    const nodes = [node('sibling', 400, 400), node('drag', 100, 200)];
    const { result } = renderHook(() =>
      useAlignmentGuides({ getNodes: () => nodes, applyPosition: () => undefined }),
    );

    act(() => {
      result.current.handlePositionChanges([change('drag', 100, 200)]);
    });
    act(() => {
      result.current.clearGuides();
    });
    const cleared = result.current.guides;
    expect(cleared.vertical).toBeNull();

    act(() => {
      result.current.clearGuides();
    });
    expect(result.current.guides).toBe(cleared);
  });

  it('clears guides when a dragging:false position change arrives', () => {
    const nodes = [node('sibling', 100, 400), node('drag', 100, 200)];
    const { result } = renderHook(() =>
      useAlignmentGuides({ getNodes: () => nodes, applyPosition: () => undefined }),
    );

    act(() => {
      result.current.handlePositionChanges([change('drag', 100, 200)]);
    });
    expect(result.current.guides.vertical).toBe(100);

    act(() => {
      // 拖放提交：dragging:false 且带位置——应清线而非继续吸附
      result.current.handlePositionChanges([
        { id: 'drag', dragging: false, position: { x: 100, y: 400 } },
      ]);
    });
    expect(result.current.guides.vertical).toBeNull();
  });

  // plan 526 Phase 3：多选簇吸附——以首个变化节点为参考轴，整簇平移保持相对位移。
  it('snaps the dragged cluster as a whole keeping relative offsets', () => {
    const positions = new Map<string, { x: number; y: number }>();
    const applyPosition = (id: string, position: { x: number; y: number }) => {
      positions.set(id, position);
    };
    const nodes = [node('sibling', 103, 400), node('a', 100, 200), node('b', 150, 210)];
    const { result } = renderHook(() =>
      useAlignmentGuides({ getNodes: () => nodes, applyPosition }),
    );

    act(() => {
      result.current.handlePositionChanges([change('a', 100, 200), change('b', 150, 210)]);
    });

    // 参考 a 左缘 100→103 吸附（dx=3），整簇同步平移
    expect(result.current.guides.vertical).toBe(103);
    expect(positions.get('a')).toEqual({ x: 103, y: 200 });
    expect(positions.get('b')).toEqual({ x: 153, y: 210 });
    expect(positions.has('sibling')).toBe(false);
  });

  it('excludes every cluster member from sibling candidates while cluster-dragging', () => {
    // b 与 a 相对位置固定：若 b 未被排除出兄弟候选，a 会被吸到 b 的边上产生簇内抖动
    const nodes = [node('a', 100, 200), node('b', 100, 210)];
    const { result } = renderHook(() =>
      useAlignmentGuides({ getNodes: () => nodes, applyPosition: () => undefined }),
    );

    act(() => {
      result.current.handlePositionChanges([change('a', 100, 200), change('b', 100, 210)]);
    });

    expect(result.current.guides.vertical).toBeNull();
    expect(result.current.guides.horizontal).toBeNull();
  });
});
