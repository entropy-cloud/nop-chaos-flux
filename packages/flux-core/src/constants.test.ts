import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_ACTION_DEFINITIONS,
  BUILT_IN_ACTION_NAMES,
  CANONICAL_BUILT_IN_ACTION_NAMES,
  META_FIELDS,
  getBuiltInActionDefinition,
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

  it('contains frameWrap', () => {
    expect(META_FIELDS.has('frameWrap')).toBe(true);
  });

  it('has exactly 9 fields', () => {
    expect(META_FIELDS.size).toBe(9);
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

  it('registers refreshNearest (registry ∪ runBuiltInAction switch anchor)', () => {
    expect(CANONICAL_BUILT_IN_ACTION_NAMES.has('refreshNearest')).toBe(true);
    expect(getBuiltInActionDescriptor('refreshNearest')).toEqual({
      canonicalName: 'refreshNearest',
      isAlias: false,
    });
  });
});

describe('built-in action definition table', () => {
  it('covers every canonical registry entry with a fieldRules definition', () => {
    for (const name of CANONICAL_BUILT_IN_ACTION_NAMES) {
      expect(BUILT_IN_ACTION_DEFINITIONS[name]).toBeDefined();
      expect(BUILT_IN_ACTION_DEFINITIONS[name].fieldRules).toBeDefined();
    }
  });

  it('marks action-class args (onClose/onSubmitSuccess/onSubmitError) in surface actions', () => {
    const openDialog = BUILT_IN_ACTION_DEFINITIONS.openDialog;
    expect(openDialog.fieldRules.onClose).toBe('action');
    expect(openDialog.fieldRules.onSubmitSuccess).toBe('action');
    expect(openDialog.fieldRules.onSubmitError).toBe('action');
    expect(openDialog.fieldRules.body).toBe('schema');
    expect(openDialog.fieldRules.actions).toBe('schema-array');
  });

  it('declares ajax constraints and argsRequired', () => {
    const ajax = BUILT_IN_ACTION_DEFINITIONS.ajax;
    expect(ajax.argsRequired).toBe(true);
    expect(ajax.fieldRules.url).toEqual({
      kind: 'value',
      required: true,
      valueType: 'string',
      nonEmpty: true,
    });
    expect(ajax.fieldRules.method).toEqual({ kind: 'value', valueType: 'string' });
    expect(ajax.fieldRules.data).toEqual({ kind: 'value', valueType: 'object' });
  });

  it('resolves definitions through compatibility aliases', () => {
    expect(getBuiltInActionDefinition('submit')).toBe(
      BUILT_IN_ACTION_DEFINITIONS.submitForm,
    );
  });
});
