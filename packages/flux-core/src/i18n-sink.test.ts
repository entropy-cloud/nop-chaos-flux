import { describe, expect, it, vi } from 'vitest';
import { getMessageFormatter, setMessageFormatter } from './i18n-sink.js';

describe('messageFormatter', () => {
  it('default formatter returns the key as-is', () => {
    const fmt = getMessageFormatter();
    expect(fmt('hello')).toBe('hello');
    expect(fmt('some.key')).toBe('some.key');
  });

  it('default formatter ignores params', () => {
    const fmt = getMessageFormatter();
    expect(fmt('hello', { count: 5 })).toBe('hello');
  });

  it('setMessageFormatter replaces the formatter', () => {
    const mockFormatter = vi.fn((key: string) => `translated:${key}`);
    setMessageFormatter(mockFormatter);

    const fmt = getMessageFormatter();
    const result = fmt('greeting');

    expect(result).toBe('translated:greeting');
    expect(mockFormatter).toHaveBeenCalledWith('greeting');
  });

  it('setMessageFormatter passes params through', () => {
    const mockFormatter = vi.fn((key: string, params?: Record<string, unknown>) => `${key}:${params?.count}`);
    setMessageFormatter(mockFormatter);

    const fmt = getMessageFormatter();
    const result = fmt('items', { count: 3 });

    expect(result).toBe('items:3');
    expect(mockFormatter).toHaveBeenCalledWith('items', { count: 3 });
  });

  it('last setMessageFormatter wins', () => {
    setMessageFormatter(() => 'first');
    setMessageFormatter(() => 'second');

    const fmt = getMessageFormatter();
    expect(fmt('key')).toBe('second');
  });

  it('can restore default behavior', () => {
    setMessageFormatter(() => 'custom');

    setMessageFormatter((key) => key);

    const fmt = getMessageFormatter();
    expect(fmt('restored')).toBe('restored');
  });
});
