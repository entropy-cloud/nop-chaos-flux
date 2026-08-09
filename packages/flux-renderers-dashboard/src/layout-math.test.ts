import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  clampPanelPosition,
  clampPanelSize,
  dragPanel,
  findOverlappingPanels,
  panelToPixels,
  resizePanel,
  resolveCanvasHeight,
  sanitizePanels,
  snapToGrid,
  DEFAULT_COLS,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_GAP,
  type ResizeHandle,
} from './layout-math.js';
import type { DashboardPanelSchema } from './schemas.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const panel = (overrides: Partial<DashboardPanelSchema> & { id: string }): DashboardPanelSchema => ({
  type: 'chart',
  x: 0,
  y: 0,
  w: 3,
  h: 2,
  ...overrides,
});

const CANVAS_1200 = { canvasWidth: 1200, cols: 12, rowHeight: 40, gap: 8 };

describe('panelToPixels grid-to-pixel conversion', () => {
  it('converts grid coords to pixels with cell + gap arithmetic', () => {
    // cellWidth = (1200 - 11*8)/12 = 92.67; left = 1*(92.67+8)
    const rect = panelToPixels(panel({ id: 'p1', x: 1, y: 2, w: 4, h: 3 }), CANVAS_1200);
    expect(rect.left).toBeCloseTo(100.6667, 1);
    expect(rect.top).toBeCloseTo(96, 1);
    expect(rect.width).toBeCloseTo(4 * 92.6667 + 3 * 8, 1);
    expect(rect.height).toBeCloseTo(3 * 40 + 2 * 8, 1);
  });

  it('applies defaults for cols/rowHeight/gap', () => {
    const rect = panelToPixels(panel({ id: 'p1', x: 0, y: 0, w: DEFAULT_COLS, h: 1 }), {
      canvasWidth: 1200,
    });
    expect(rect.left).toBe(0);
    expect(rect.width).toBeCloseTo(1200, 0);
    expect(rect.height).toBeCloseTo(DEFAULT_ROW_HEIGHT, 0);
  });
});

describe('snapToGrid pixel-to-grid snapping', () => {
  it('snaps a pixel point to the nearest grid cell', () => {
    const snapped = snapToGrid(101, 97, CANVAS_1200);
    expect(snapped).toEqual({ x: 1, y: 2 });
  });
});

describe('clampPanelPosition boundary clamp (failure path dashboard-drag-out)', () => {
  it('clamps x so the panel stays within the column count', () => {
    const clamped = clampPanelPosition(
      panel({ id: 'p1', x: 11, w: 3 }),
      { ...CANVAS_1200, maxY: 30 },
    );
    expect(clamped.x).toBe(9); // 12 - 3
    expect(clamped.y).toBe(0);
  });

  it('clamps y to the max row bound', () => {
    const clamped = clampPanelPosition(panel({ id: 'p1', y: 40, h: 2 }), {
      ...CANVAS_1200,
      maxY: 30,
    });
    expect(clamped.y).toBe(28); // 30 - 2
  });

  it('keeps valid positions unchanged', () => {
    const clamped = clampPanelPosition(panel({ id: 'p1', x: 2, y: 3 }), {
      ...CANVAS_1200,
      maxY: 30,
    });
    expect(clamped.x).toBe(2);
    expect(clamped.y).toBe(3);
  });
});

describe('clampPanelSize minimum size clamp (failure path dashboard-resize-min)', () => {
  it('clamps below-minimum sizes to the minimum', () => {
    const clamped = clampPanelSize(panel({ id: 'p1', w: 0, h: -2 }), { cols: 12, minW: 1, minH: 1 });
    expect(clamped.w).toBe(1);
    expect(clamped.h).toBe(1);
  });

  it('clamps width to the column count', () => {
    const clamped = clampPanelSize(panel({ id: 'p1', w: 99 }), { cols: 12 });
    expect(clamped.w).toBe(DEFAULT_COLS);
  });
});

describe('findOverlappingPanels overlap detection', () => {
  it('detects overlapping panels', () => {
    const panels = [
      panel({ id: 'a', x: 0, y: 0, w: 3, h: 2 }),
      panel({ id: 'b', x: 2, y: 1, w: 2, h: 2 }),
      panel({ id: 'c', x: 5, y: 5, w: 2, h: 2 }),
    ];
    expect(findOverlappingPanels(panels, panel({ id: 'b', x: 2, y: 1, w: 2, h: 2 })).map((p) => p.id)).toEqual([
      'a',
    ]);
    expect(findOverlappingPanels(panels, panels[2]).map((p) => p.id)).toEqual([]);
  });
});

describe('dragPanel pure function', () => {
  it('moves the panel to snapped grid coords and clamps inside the canvas', () => {
    const panels = [panel({ id: 'a', x: 0, y: 0 }), panel({ id: 'b', x: 4, y: 0 })];
    const next = dragPanel(panels, 'a', 101, 97, CANVAS_1200);
    expect(next[0].x).toBe(1);
    expect(next[0].y).toBe(2);
    expect(next[1]).toBe(panels[1]);

    const outOfBounds = dragPanel(panels, 'b', 5000, 0, { ...CANVAS_1200, maxY: 30 });
    expect(outOfBounds[1].x).toBe(9);
  });

  it('returns the same array reference when the position is unchanged', () => {
    const panels = [panel({ id: 'a', x: 1, y: 2 })];
    const next = dragPanel(panels, 'a', 101, 97, CANVAS_1200);
    expect(next).toBe(panels);
  });

  it('is a no-op for an unknown panel id', () => {
    const panels = [panel({ id: 'a', x: 0, y: 0 })];
    const next = dragPanel(panels, 'nope', 101, 97, CANVAS_1200);
    expect(next).toBe(panels);
  });
});

describe('resizePanel eight-direction handles', () => {
  const base: DashboardPanelSchema[] = [panel({ id: 'a', x: 2, y: 2, w: 4, h: 3 })];

  it('east grows width; west grows width by moving x', () => {
    const e = resizePanel(base, 'a', 'e', 101, 0, CANVAS_1200);
    expect(e[0].w).toBe(5);
    expect(e[0].x).toBe(2);
    const w = resizePanel(base, 'a', 'w', 101, 0, CANVAS_1200);
    expect(w[0].w).toBe(5);
    expect(w[0].x).toBe(1);
  });

  it('south grows height; north grows height by moving y', () => {
    const s = resizePanel(base, 'a', 's', 0, 49, CANVAS_1200);
    expect(s[0].h).toBe(4);
    const n = resizePanel(base, 'a', 'n', 0, 49, CANVAS_1200);
    expect(n[0].h).toBe(4);
    expect(n[0].y).toBe(1);
  });

  it('se corner grows both dimensions', () => {
    const se = resizePanel(base, 'a', 'se', 101, 49, CANVAS_1200);
    expect(se[0].w).toBe(5);
    expect(se[0].h).toBe(4);
  });

  it('clamps to minimum size (failure path dashboard-resize-min)', () => {
    const tiny = resizePanel(base, 'a', 'nw', -5000, -5000, { ...CANVAS_1200, minW: 1, minH: 1 });
    expect(tiny[0].w).toBe(1);
    expect(tiny[0].h).toBe(1);
  });

  it('returns the same array reference when nothing changed', () => {
    const unchanged = resizePanel(base, 'a', 'e', 0, 0, CANVAS_1200);
    expect(unchanged).toBe(base);
  });

  it('is a no-op for an unknown panel id', () => {
    const next = resizePanel(base, 'nope', 'se' as ResizeHandle, 101, 49, CANVAS_1200);
    expect(next).toBe(base);
  });
});

describe('sanitizePanels layout validation (failure path dashboard-layout-invalid)', () => {
  it('skips invalid entries with a dev warn and keeps valid ones', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const cleaned = sanitizePanels(
      [
        panel({ id: 'ok', x: 0, y: 0 }),
        { id: 'nonumber', type: 'chart', x: 'a', y: 0, w: 1, h: 1 },
        { type: 'chart', x: 0, y: 0, w: 1, h: 1 },
        null,
      ],
      { cols: 12 },
    );
    expect(cleaned.map((p) => p.id)).toEqual(['ok']);
    expect(warn).toHaveBeenCalled();
  });

  it('deduplicates panel ids and clamps out-of-range geometry', () => {
    const cleaned = sanitizePanels(
      [
        panel({ id: 'dup', x: 0, y: 0 }),
        panel({ id: 'dup', x: 1, y: 1 }),
        panel({ id: 'wide', x: 11, w: 99 }),
      ],
      { cols: 12 },
    );
    expect(cleaned.map((p) => p.id)).toEqual(['dup', 'wide']);
    expect(cleaned[1].w).toBe(DEFAULT_COLS);
    expect(cleaned[1].x).toBe(0);
  });

  it('returns an empty array for non-array or fully-invalid input (empty state)', () => {
    expect(sanitizePanels(undefined, {})).toEqual([]);
    expect(sanitizePanels([{ id: 42 }], {})).toEqual([]);
  });
});

describe('resolveCanvasHeight', () => {
  it('uses explicit height when provided', () => {
    expect(resolveCanvasHeight([panel({ id: 'a' })], { height: 500 })).toBe(500);
  });

  it('derives height from the max panel bottom edge', () => {
    const panels = [panel({ id: 'a', y: 0, h: 2 }), panel({ id: 'b', y: 4, h: 3 })];
    expect(resolveCanvasHeight(panels, {})).toBeCloseTo(7 * DEFAULT_ROW_HEIGHT + 6 * DEFAULT_GAP, 0);
  });

  it('returns 0 for an empty layout', () => {
    expect(resolveCanvasHeight([], {})).toBe(0);
  });
});
