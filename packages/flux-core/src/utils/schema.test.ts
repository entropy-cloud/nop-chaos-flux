import { describe, expect, it } from 'vitest';
import { createNodeId } from './schema';

describe('createNodeId', () => {
  it('returns schema.id directly if present', () => {
    const schema = { type: 'page', id: 'custom-id' };
    expect(createNodeId('any-path', schema)).toBe('custom-id');
  });

  it('sanitizes brackets', () => {
    expect(createNodeId('foo[bar]', { type: 'x' })).toBe('foo_bar_');
  });

  it('sanitizes equals sign', () => {
    expect(createNodeId('a=b', { type: 'x' })).toBe('a_b');
  });

  it('sanitizes spaces', () => {
    expect(createNodeId('hello world', { type: 'x' })).toBe('hello_world');
  });

  it('preserves dots', () => {
    expect(createNodeId('a.b', { type: 'x' })).toBe('a.b');
  });

  it('preserves underscores', () => {
    expect(createNodeId('a_b', { type: 'x' })).toBe('a_b');
  });

  it('preserves colons', () => {
    expect(createNodeId('a:b', { type: 'x' })).toBe('a:b');
  });

  it('preserves hyphens', () => {
    expect(createNodeId('my-id', { type: 'x' })).toBe('my-id');
  });

  it('sanitizes multiple illegal characters', () => {
    expect(createNodeId('foo[bar]@baz', { type: 'x' })).toBe('foo_bar__baz');
  });

  it('preserves alphanumeric characters', () => {
    expect(createNodeId('abc123XYZ', { type: 'x' })).toBe('abc123XYZ');
  });

  it('handles empty path', () => {
    expect(createNodeId('', { type: 'x' })).toBe('');
  });
});
