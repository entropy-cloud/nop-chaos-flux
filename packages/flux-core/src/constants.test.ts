import { describe, expect, it } from 'vitest';
import { META_FIELDS } from './constants.js';

describe('META_FIELDS', () => {
  it('is a Set', () => {
    expect(META_FIELDS).toBeInstanceOf(Set);
  });

  it('contains id', () => {
    expect(META_FIELDS.has('id')).toBe(true);
  });

  it('contains className', () => {
    expect(META_FIELDS.has('className')).toBe(true);
  });

  it('contains visible', () => {
    expect(META_FIELDS.has('visible')).toBe(true);
  });

  it('contains hidden', () => {
    expect(META_FIELDS.has('hidden')).toBe(true);
  });

  it('contains disabled', () => {
    expect(META_FIELDS.has('disabled')).toBe(true);
  });

  it('contains testid', () => {
    expect(META_FIELDS.has('testid')).toBe(true);
  });

  it('contains frameClassName', () => {
    expect(META_FIELDS.has('frameClassName')).toBe(true);
  });

  it('has exactly 7 fields', () => {
    expect(META_FIELDS.size).toBe(7);
  });

  it('does not contain arbitrary strings', () => {
    expect(META_FIELDS.has('notAMetaField')).toBe(false);
  });
});
