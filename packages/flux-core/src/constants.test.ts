import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_ACTION_NAMES,
  CANONICAL_BUILT_IN_ACTION_NAMES,
  META_FIELDS,
  getBuiltInActionDescriptor,
} from './constants.js';

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

  it('contains when', () => {
    expect(META_FIELDS.has('when')).toBe(true);
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

  it('has exactly 8 fields', () => {
    expect(META_FIELDS.size).toBe(8);
  });

  it('does not contain arbitrary strings', () => {
    expect(META_FIELDS.has('notAMetaField')).toBe(false);
  });
});

describe('built-in action registry', () => {
  it('keeps canonical built-in names separate from compatibility aliases', () => {
    expect(CANONICAL_BUILT_IN_ACTION_NAMES.has('submitForm')).toBe(true);
    expect(CANONICAL_BUILT_IN_ACTION_NAMES.has('submit')).toBe(false);
    expect(BUILT_IN_ACTION_NAMES.has('submit')).toBe(true);
  });

  it('describes compatibility aliases with canonical lowering target', () => {
    expect(getBuiltInActionDescriptor('submit')).toEqual({
      canonicalName: 'submitForm',
      compatibilityAliases: ['submit'],
      isAlias: true,
    });
    expect(getBuiltInActionDescriptor('submitForm')).toEqual({
      canonicalName: 'submitForm',
      compatibilityAliases: ['submit'],
      isAlias: false,
    });
  });
});
