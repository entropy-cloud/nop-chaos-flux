import { describe, it, expect, afterAll } from 'vitest';

declare const process: {
  env: Record<string, string | undefined>;
};

describe('Calendar timezone-safe date math', () => {
  const origTz = process.env.TZ;
  afterAll(() => {
    process.env.TZ = origTz;
  });

  it('should handle keyboard move left (subtract 1 day) in Asia/Shanghai', () => {
    process.env.TZ = 'Asia/Shanghai';
    const oldStart = new Date('2026-07-23');
    const oldEnd = new Date('2026-07-25');
    const newStart = new Date(oldStart);
    newStart.setUTCDate(newStart.getUTCDate() - 1);
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() - 1);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-22');
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-24');
  });

  it('should handle keyboard move right (add 1 day) in Asia/Shanghai', () => {
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

  it('should produce correct ISO strings across timezone boundaries', () => {
    process.env.TZ = 'America/New_York';
    const oldStart = new Date('2026-07-22');
    const oldEnd = new Date('2026-07-22');
    const newStart = new Date(oldStart);
    newStart.setUTCDate(newStart.getUTCDate() + 1);
    const newEnd = new Date(oldEnd);
    newEnd.setUTCDate(newEnd.getUTCDate() + 1);
    expect(newStart.toISOString().slice(0, 10)).toBe('2026-07-23');
    expect(newEnd.toISOString().slice(0, 10)).toBe('2026-07-23');
  });

  it('setUTCDate day delta works in Pacific/Chatham', () => {
    process.env.TZ = 'Pacific/Chatham';
    const before = new Date('2026-07-22');
    before.setUTCDate(before.getUTCDate() + 1);
    expect(before.toISOString().slice(0, 10)).toBe('2026-07-23');
  });

  it('setUTCDate day delta works across DST transitions in Europe/London', () => {
    process.env.TZ = 'Europe/London';
    const before = new Date('2026-03-28');
    before.setUTCDate(before.getUTCDate() + 1);
    expect(before.toISOString().slice(0, 10)).toBe('2026-03-29');
  });
});
