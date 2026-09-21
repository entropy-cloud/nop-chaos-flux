import { describe, it, expect } from 'vitest';
import { createGanttStore } from './gantt-store.js';
import { dateToPixel } from './utils/layout.js';

/**
 * V12f Phase 3 — [G4-R3-视角10-01] + [G4-R3-视角11-01]：
 * 1. setZoom 的中心锚定分支必须消费 store.scrollLeft（生产端为组件层滚动
 *    回写）——无显式 anchor 参数时走 _scrollLeft。
 * 2. zoomToFit 必须做真实适配计算：在「任务时间跨度 × minCellWidth ≤ 容器宽」
 *    的缩放档里取最大档位，并把视口滚动到跨度起点——「适应」文案承诺的
 *    行为必须存在，而不是跳到中间档位。
 */
describe('gantt store zoom anchor + zoomToFit (G4-R3-视角10-01 / G4-R3-视角11-01)', () => {
  const zoomLevels = [
    { key: 'day', label: 'Day', minCellWidth: 40, scales: [{ unit: 'day' as const, step: 1, format: '%m/%d' }] },
    { key: 'week', label: 'Week', minCellWidth: 8, scales: [{ unit: 'week' as const, step: 1, format: '%Y' }] },
    { key: 'month', label: 'Month', minCellWidth: 2, scales: [{ unit: 'month' as const, step: 1, format: '%Y' }] },
  ];
  const tasks = [
    { id: 't1', text: 'A', start: '2026-07-01', end: '2026-07-10' },
    { id: 't2', text: 'B', start: '2026-07-05', end: '2026-07-31' },
  ];

  function makeStore(containerWidth: number) {
    const store = createGanttStore({ zoomLevels, containerWidth, defaultZoom: 'day' });
    store.parse(tasks, []);
    return store;
  }

  it('setZoom center-anchors through the producer-written store.scrollLeft when no explicit anchor is passed', () => {
    const store = makeStore(800);
    // Producer contract: the component scroll handler writes store.scrollLeft.
    store.scrollLeft = 4000;

    store.setZoom('week');

    // center at old cellWidth 40 → pixel 4400 = day 110; new cellWidth 8 →
    // centerX 880; anchored scrollLeft = 880 - 800/2 = 480 (the viewport
    // stays on the same date instead of jumping).
    expect(store.scrollLeft).toBe(480);
  });

  it('zoomToFit selects the widest-fitting zoom for the task span and scrolls to the span start', () => {
    const store = makeStore(800);
    // span 07-01..07-31 = 31 days: day 31×40=1240 > 800; week 31×8=248 ≤ 800;
    // month 31×2=62 ≤ 800 → the largest fitting level is 'week'.
    const fitKey = store.zoomToFit();

    expect(fitKey).toBe('week');
    expect(store.currentZoom).toBe('week');

    const expectedLeft = Math.max(
      0,
      dateToPixel(new Date('2026-07-01'), store.scaleRange, store.cellWidth) - store.cellWidth,
    );
    expect(store.scrollLeft).toBe(expectedLeft);
  });

  it('zoomToFit falls back to the smallest zoom when no level fits the span', () => {
    const store = makeStore(100);
    // 100px container: week 248 > 100, month 62 ≤ 100 → 'month' is both the
    // smallest and the only fitting level.
    const fitKey = store.zoomToFit();

    expect(fitKey).toBe('month');
    expect(store.currentZoom).toBe('month');
  });

  it('zoomToFit is a no-op returning null on an empty store', () => {
    const store = createGanttStore({ zoomLevels, containerWidth: 800, defaultZoom: 'day' });
    expect(store.zoomToFit()).toBeNull();
    expect(store.currentZoom).toBe('day');
  });
});
