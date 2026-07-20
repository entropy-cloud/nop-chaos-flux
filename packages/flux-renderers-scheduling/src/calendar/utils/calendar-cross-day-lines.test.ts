import { describe, it, expect } from 'vitest';
import { computeCrossDayLines, createSVGPath } from './calendar-cross-day-lines.js';
import type { SplitEventBlock } from './calendar-layout-utils.js';
import type { CalendarEvent } from '../../schemas.js';

function makeSplitBlock(overrides: Partial<SplitEventBlock> & { eventId: string; date: string }): SplitEventBlock {
  return {
    resourceId: 'r1',
    originalEvent: { id: overrides.eventId, title: 'test', start: '2026-07-20', end: '2026-07-21', type: 'shift' } as CalendarEvent,
    isSplit: true,
    dayIndex: 0,
    totalDays: 3,
    ...overrides,
  };
}

describe('calendar-cross-day-lines', () => {
  it('should compute lines for split multi-day events', () => {
    const blocks: SplitEventBlock[] = [
      makeSplitBlock({ eventId: 'e1', resourceId: 'r1', date: '2026-07-20', dayIndex: 0, totalDays: 3 }),
      makeSplitBlock({ eventId: 'e1', resourceId: 'r1', date: '2026-07-21', dayIndex: 1, totalDays: 3 }),
      makeSplitBlock({ eventId: 'e1', resourceId: 'r1', date: '2026-07-22', dayIndex: 2, totalDays: 3 }),
    ];

    const cellPositions = new Map([
      ['r1:2026-07-20', { x: 0, y: 0, width: 100, height: 48 }],
      ['r1:2026-07-21', { x: 100, y: 0, width: 100, height: 48 }],
      ['r1:2026-07-22', { x: 200, y: 0, width: 100, height: 48 }],
    ]);

    const lines = computeCrossDayLines(blocks, cellPositions);

    expect(lines).toHaveLength(2);
    expect(lines[0].eventId).toBe('e1');
    expect(lines[0].fromX).toBe(100);
    expect(lines[0].toX).toBe(100);
  });

  it('should return empty for non-split events', () => {
    const blocks: SplitEventBlock[] = [
      makeSplitBlock({ eventId: 'e1', resourceId: 'r1', date: '2026-07-20', isSplit: false, dayIndex: 0, totalDays: 1 }),
    ];

    const cellPositions = new Map([
      ['r1:2026-07-20', { x: 0, y: 0, width: 100, height: 48 }],
    ]);

    const lines = computeCrossDayLines(blocks, cellPositions);
    expect(lines).toHaveLength(0);
  });

  it('should create valid SVG path', () => {
    const line = { eventId: 'e1', fromX: 100, fromY: 24, toX: 200, toY: 24, color: '#4ade80' };
    const path = createSVGPath(line);
    expect(path).toContain('M 100 24');
    expect(path).toContain('Q');
    expect(path).toContain('200 24');
  });
});
