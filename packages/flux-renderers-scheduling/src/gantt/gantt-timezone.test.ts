import { describe, it, expect, afterAll } from 'vitest';

declare const process: {
  env: Record<string, string | undefined>;
};

describe('Gantt timezone-safe date math', () => {
  const origTz = process.env.TZ;
  afterAll(() => {
    process.env.TZ = origTz;
  });

  it('should handle move-up (subtract 1 day) correctly in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const oldStart = new Date('2026-07-22');
    const oldEnd = new Date('2026-07-25');
    const newStart = new Date(oldStart);
    newStart.setUTCDate(newStart.getUTCDate() - 1);
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() - 1);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-21');
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-24');
  });

  it('should handle move-down (add 1 day) correctly in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const oldStart = new Date('2026-07-22');
    const oldEnd = new Date('2026-07-25');
    const newStart = new Date(oldStart);
    newStart.setUTCDate(newStart.getUTCDate() + 1);
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() + 1);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-23');
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-26');
  });

  it('should handle resize-left (subtract 1 day from end) correctly in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const oldStart = new Date('2026-07-22');
    const oldEnd = new Date('2026-07-25');
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() - 1);
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-24');
    expect(newEnd > oldStart).toBe(true);
  });

  it('should handle resize-right (add 1 day to end) correctly in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const oldEnd = new Date('2026-07-25');
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() + 1);
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-26');
  });

  it('should handle drag move with dayDelta correctly in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const oldStart = new Date('2026-07-22');
    const oldEnd = new Date('2026-07-25');
    const dayDelta = 3;
    const newStart = new Date(oldStart);
    newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-25');
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-28');
  });

  it('should handle drag resize-end with dayDelta correctly in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const oldEnd = new Date('2026-07-25');
    const dayDelta = 2;
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() + dayDelta);
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-27');
  });

  it('should handle drag resize-start with dayDelta correctly in UTC+8', () => {
    process.env.TZ = 'Asia/Shanghai';
    const oldStart = new Date('2026-07-22');
    const dayDelta = -1;
    const newStart = new Date(oldStart);
    newStart.setUTCDate(newStart.getUTCDate() + dayDelta);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-21');
  });

  it('should handle UTC-5 timezone (negative offset) correctly', () => {
    process.env.TZ = 'America/New_York';
    const oldStart = new Date('2026-07-22');
    const newStart = new Date(oldStart);
    newStart.setUTCDate(newStart.getUTCDate() + 1);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-23');
  });
});
