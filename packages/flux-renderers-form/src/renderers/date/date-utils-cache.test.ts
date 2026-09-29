import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatDate,
  parseDate,
  resolveRelativeDate,
  formatCacheStats,
} from './date-utils.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('compiled-format cache (plan 2026-09-29-3 Phase 1)', () => {
  const matrix: Array<{ value: string; format: string }> = [
    { value: '2026-09-29', format: 'YYYY-MM-DD' },
    { value: '2026-09-29 14:30', format: 'YYYY-MM-DD HH:mm' },
    { value: '2026-09-29 14:30:45', format: 'YYYY-MM-DD HH:mm:ss' },
    { value: '14:30', format: 'HH:mm' },
    { value: '2026/09/29', format: 'YYYY/MM/DD' },
    { value: '29-09-26', format: 'DD-MM-YY' },
    { value: '2026-13-40', format: 'YYYY-MM-DD' },
    { value: 'not-a-date', format: 'YYYY-MM-DD' },
  ];

  it('cached second pass is result-equivalent to the first pass for every case', () => {
    const first = matrix.map(({ value, format }) => ({
      parsed: parseDate(value, format)?.getTime(),
      formatted: formatDate(parseDate(value, format), format),
    }));
    const entriesAfterFirst = formatCacheStats().entries;
    expect(entriesAfterFirst).toBeGreaterThan(0);

    const second = matrix.map(({ value, format }) => ({
      parsed: parseDate(value, format)?.getTime(),
      formatted: formatDate(parseDate(value, format), format),
    }));
    expect(second).toEqual(first);

    // cache is bounded and hit — entry count stable across the second pass
    expect(formatCacheStats().entries).toBe(entriesAfterFirst);
  });

  it('formatDate/parseDate stay mutually consistent through the cache', () => {
    const date = new Date(2026, 8, 29, 14, 30, 45);
    // 'YYYY-MM-DD' is lossy by design (omitted components default: time=0)
    expect(parseDate(formatDate(date, 'YYYY-MM-DD')!, 'YYYY-MM-DD')?.getTime()).toBe(
      new Date(2026, 8, 29).getTime(),
    );
    expect(parseDate(formatDate(date, 'YYYY-MM-DD HH:mm:ss')!, 'YYYY-MM-DD HH:mm:ss')?.getTime()).toBe(
      date.getTime(),
    );
  });
});

describe('relative-date identity stabilization (plan 2026-09-29-3 Phase 1)', () => {
  it('same schema string returns the same identity within a second-level bucket', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00.500Z'));
    const a = resolveRelativeDate('now');
    vi.setSystemTime(new Date('2026-09-29T10:00:00.900Z'));
    const b = resolveRelativeDate('now');
    expect(b).toBe(a);
    expect(resolveRelativeDate('today')).toBe(resolveRelativeDate('today'));
    expect(resolveRelativeDate('now+3d')).toBe(resolveRelativeDate('now+3d'));
  });

  it('identity refreshes across buckets — `now` still advances over time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T10:00:00.500Z'));
    const before = resolveRelativeDate('now');
    vi.setSystemTime(new Date('2026-09-29T10:00:02.200Z'));
    const after = resolveRelativeDate('now');
    expect(after).not.toBe(before);
    expect(new Date(after!).getTime()).toBeGreaterThan(new Date(before!).getTime());
  });

  it('today quantizes to local midnight and offsets compose', () => {
    const today = resolveRelativeDate('today')!;
    const parsed = new Date(today);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
    expect(resolveRelativeDate('yesterday')).toBe('yesterday');
    expect(resolveRelativeDate('')).toBe('');
    expect(resolveRelativeDate(undefined)).toBeUndefined();
  });
});
