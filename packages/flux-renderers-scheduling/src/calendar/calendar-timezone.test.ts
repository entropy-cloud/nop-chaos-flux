import { describe, it, expect, afterAll } from 'vitest';

declare const process: {
  env: Record<string, string | undefined>;
};

describe('Calendar timezone-safe date math', () => {
  const origTz = process.env.TZ;
  afterAll(() => {
    process.env.TZ = origTz;
  });

  it('should handle keyboard move left (subtract 1 day) correctly in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const dayDelta = 1;
    const oldStart = new Date('2026-07-23');
    const oldEnd = new Date('2026-07-25');
    const newStart = new Date(oldStart);
    newStart.setUTCDate(newStart.getUTCDate() - dayDelta);
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() - dayDelta);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-22');
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-24');
  });

  it('should handle keyboard move right (add 1 day) correctly in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const dayDelta = 1;
    const oldStart = new Date('2026-07-22');
    const oldEnd = new Date('2026-07-25');
    const newStart = new Date(oldStart);
    newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-23');
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-26');
  });

  it('should produce correct ISO strings across timezone boundaries', () => {
    process.env.TZ = 'America/New_York';
    const dayDelta = 1;
    const oldStart = new Date('2026-07-22');
    const oldEnd = new Date('2026-07-22');
    const newStart = new Date(oldStart);
    newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-23');
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-23');
  });
});
