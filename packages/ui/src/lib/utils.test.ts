import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges single class', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('merges multiple classes', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
  });

  it('handles undefined values', () => {
    expect(cn('text-red-500', undefined, 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
  });

  it('handles false values', () => {
    expect(cn('text-red-500', false, 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
  });

  it('handles null values', () => {
    expect(cn('text-red-500', null, 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });

  it('handles conditional classes when false', () => {
    const isActive = false;
    expect(cn('base', isActive && 'active')).toBe('base');
  });

  it('merges conflicting Tailwind classes correctly', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles array of classes', () => {
    expect(cn(['text-red-500', 'bg-blue-500'])).toBe('text-red-500 bg-blue-500');
  });

  it('handles object notation', () => {
    expect(cn({ 'text-red-500': true, 'bg-blue-500': false })).toBe('text-red-500');
  });

  it('handles empty string', () => {
    expect(cn('')).toBe('');
  });

  it('handles no arguments', () => {
    expect(cn()).toBe('');
  });

  it('merges padding classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('merges margin classes correctly', () => {
    expect(cn('m-4', 'm-2')).toBe('m-2');
  });

  it('keeps non-conflicting classes', () => {
    expect(cn('p-4', 'm-2')).toBe('p-4 m-2');
  });
});
