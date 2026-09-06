import { describe, expect, it } from 'vitest';
import {
  applyHandleDelta,
  computeRotateAngle,
  computeSnap,
  gridCandidates,
  screenDeltaToPaper,
  screenToPaper,
  type Frame,
} from './canvas-math.js';

describe('screenToPaper', () => {
  it('converts client coordinates to mm accounting for origin, zoom and px density', () => {
    // 210px @ zoom 2 → 210 / (3.7795 × 2) = 27.78mm
    const point = screenToPaper(310, 260, { left: 100, top: 50 }, 2);
    expect(point.left).toBeCloseTo(27.78, 2);
    expect(point.top).toBeCloseTo(27.78, 2);
    const delta = screenDeltaToPaper(40, 10, 2);
    expect(delta.left).toBeCloseTo(5.29, 2);
    expect(delta.top).toBeCloseTo(1.32, 2);
  });

  it('round-trips mm through the canvas renderer scale', () => {
    const zoom = 1.5;
    const clientX = 10 * (96 / 25.4) * zoom;
    expect(screenToPaper(clientX, 0, { left: 0, top: 0 }, zoom).left).toBeCloseTo(10, 6);
  });
});

describe('applyHandleDelta', () => {
  const start: Frame = { left: 10, top: 10, width: 40, height: 20 };

  it('moves the anchored edge for east/west handles', () => {
    expect(applyHandleDelta('e', start, 10, 0)).toEqual({ left: 10, top: 10, width: 50, height: 20 });
    expect(applyHandleDelta('w', start, 5, 0)).toEqual({ left: 15, top: 10, width: 35, height: 20 });
  });

  it('anchors the opposite corner for diagonal handles', () => {
    expect(applyHandleDelta('se', start, 10, 5)).toEqual({ left: 10, top: 10, width: 50, height: 25 });
    expect(applyHandleDelta('nw', start, 5, 3)).toEqual({ left: 15, top: 13, width: 35, height: 17 });
    expect(applyHandleDelta('ne', start, -2, 4)).toEqual({ left: 10, top: 14, width: 38, height: 16 });
  });

  it('clamps to the minimum size keeping the far edge fixed', () => {
    const shrunk = applyHandleDelta('w', start, 60, 0);
    expect(shrunk).toEqual({ left: 49, top: 10, width: 1, height: 20 });
    const shrunkN = applyHandleDelta('n', start, 0, 100);
    expect(shrunkN).toEqual({ left: 10, top: 29, width: 40, height: 1 });
  });
});

describe('computeSnap', () => {
  it('snaps to the nearest candidate within threshold and reports hit lines', () => {
    const frame: Frame = { left: 20.4, top: 30, width: 40, height: 10 };
    const result = computeSnap(frame, {
      gridSize: 0,
      verticalCandidates: [20, 60],
      horizontalCandidates: [35],
      threshold: 1,
    });
    expect(result.frame.left).toBe(20);
    expect(result.verticalLines).toEqual([20]);
    expect(result.horizontalLines).toEqual([35]);
    expect(result.frame.top).toBe(30);
  });

  it('keeps the frame untouched when nothing is within threshold', () => {
    const frame: Frame = { left: 20.4, top: 30, width: 40, height: 10 };
    const result = computeSnap(frame, {
      gridSize: 0,
      verticalCandidates: [25],
      horizontalCandidates: [50],
      threshold: 1,
    });
    expect(result.frame).toEqual(frame);
    expect(result.verticalLines).toEqual([]);
  });

  it('generates grid multiples including zero', () => {
    expect(gridCandidates(30, 10)).toEqual([0, 10, 20, 30]);
  });
});

describe('computeRotateAngle', () => {
  it('snaps to cardinal angles within 5 degrees', () => {
    const center = { left: 50, top: 50 };
    expect(computeRotateAngle(center, { left: 100, top: 50 })).toBe(0);
    expect(computeRotateAngle(center, { left: 100, top: 51 })).toBe(0);
    expect(computeRotateAngle(center, { left: 50, top: 100 })).toBe(90);
    expect(computeRotateAngle(center, { left: 0, top: 50 })).toBe(180);
  });

  it('returns the free angle beyond the snap window', () => {
    const center = { left: 50, top: 50 };
    const angle = computeRotateAngle(center, { left: 100, top: 60 });
    expect(angle).toBeCloseTo(11.31, 1);
    const free = computeRotateAngle(center, { left: 100, top: 51 }, { free: true });
    expect(free).toBeCloseTo(1.15, 1);
  });
});
