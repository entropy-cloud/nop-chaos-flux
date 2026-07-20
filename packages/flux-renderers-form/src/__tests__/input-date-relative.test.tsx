import { describe, expect, it } from 'vitest';
import { resolveRelativeDate } from '../renderers/date/date-utils.js';

describe('resolveRelativeDate — D10 token parser', () => {
  it('returns undefined for undefined input', () => {
    expect(resolveRelativeDate(undefined)).toBeUndefined();
  });

  it('returns empty string for empty input', () => {
    expect(resolveRelativeDate('')).toBe('');
  });

  it('passes through absolute date values unchanged', () => {
    expect(resolveRelativeDate('2024-06-09')).toBe('2024-06-09');
    expect(resolveRelativeDate('20240609')).toBe('20240609');
    expect(resolveRelativeDate('some-random-string')).toBe('some-random-string');
  });

  it('resolves "now" to a valid ISO string', () => {
    const result = resolveRelativeDate('now');
    expect(result).toBeTruthy();
    expect(new Date(result!).getTime()).not.toBeNaN();
  });

  it('resolves "today" to a valid ISO string with zero time', () => {
    const result = resolveRelativeDate('today');
    expect(result).toBeTruthy();
    const d = new Date(result!);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('resolves "now+1d" to a future date', () => {
    const result = resolveRelativeDate('now+1d');
    expect(result).toBeTruthy();
    const d = new Date(result!);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    expect(diffMs).toBeGreaterThan(0);
    expect(diffMs).toBeLessThan(2 * 24 * 60 * 60 * 1000);
  });

  it('resolves "now-7d" to a past date', () => {
    const result = resolveRelativeDate('now-7d');
    expect(result).toBeTruthy();
    const d = new Date(result!);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    expect(diffMs).toBeGreaterThan(0);
    expect(diffMs).toBeLessThan(8 * 24 * 60 * 60 * 1000);
  });

  it('resolves "now+2h" to a future time', () => {
    const result = resolveRelativeDate('now+2h');
    expect(result).toBeTruthy();
    const d = new Date(result!);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    expect(diffMs).toBeGreaterThan(0);
    expect(diffMs).toBeLessThan(3 * 60 * 60 * 1000);
  });

  it('resolves "now-30m" to a past time', () => {
    const result = resolveRelativeDate('now-30m');
    expect(result).toBeTruthy();
    const d = new Date(result!);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    expect(diffMs).toBeGreaterThan(0);
    expect(diffMs).toBeLessThan(60 * 60 * 1000);
  });

  it('resolves "now+30s" to a future time', () => {
    const result = resolveRelativeDate('now+30s');
    expect(result).toBeTruthy();
    const d = new Date(result!);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    expect(diffMs).toBeGreaterThan(0);
    expect(diffMs).toBeLessThan(60 * 1000);
  });

  it('resolves "today+1d" to a future date with zero time', () => {
    const result = resolveRelativeDate('today+1d');
    expect(result).toBeTruthy();
    const d = new Date(result!);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('resolves "today-1d" to a past date with zero time', () => {
    const result = resolveRelativeDate('today-1d');
    expect(result).toBeTruthy();
    const d = new Date(result!);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('is case-insensitive for now/today keywords', () => {
    expect(resolveRelativeDate('NOW')).toBeTruthy();
    expect(resolveRelativeDate('TODAY')).toBeTruthy();
    expect(resolveRelativeDate('Now+1d')).toBeTruthy();
    expect(resolveRelativeDate('Today-1d')).toBeTruthy();
  });
});
