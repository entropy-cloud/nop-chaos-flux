import { describe, expect, it } from 'vitest';
import type {
  CompiledFormValidationField,
  CompiledValidationRule,
  ScopeRef,
} from '@nop-chaos/flux-core';
import { createScopeRef, createScopeStore } from '../scope.js';
import { createBuiltInValidationRegistry } from './registry.js';
import type { SyncValidationRule } from './validators.js';

function createField(path: string, controlType = 'input-text'): CompiledFormValidationField {
  return {
    path,
    controlType,
    label: path,
    behavior: {
      triggers: ['blur'],
      showErrorOn: ['touched', 'submit'],
    },
    rules: [],
    hiddenFieldPolicy: {
      validateWhenHidden: false,
      clearValueWhenHidden: false,
    },
  };
}

function createRule(path: string, rule: SyncValidationRule): CompiledValidationRule {
  return {
    id: `${path}#0:${rule.kind}`,
    rule,
    dependencyPaths:
      rule.kind === 'equalsField' ||
      rule.kind === 'notEqualsField' ||
      rule.kind === 'requiredWhen' ||
      rule.kind === 'requiredUnless'
        ? [rule.path]
        : [],
  };
}

function createScope(initialData: Record<string, any> = {}): ScopeRef {
  return createScopeRef({
    id: 'validation-scope',
    path: '$.validation',
    store: createScopeStore(initialData),
  });
}

describe('builtInValidators', () => {
  const registry = createBuiltInValidationRegistry();

  it('validates required fields', () => {
    const validator = registry.get('required');
    const field = createField('username');
    const rule = createRule('username', { kind: 'required' });

    const error = validator?.({
      compiledRule: rule,
      rule: rule.rule as SyncValidationRule,
      value: '',
      field,
      scope: createScope(),
    });

    expect(error).toMatchObject({
      path: 'username',
      rule: 'required',
      sourceKind: 'field',
    });
    expect(error?.message).toBeTruthy();
  });

  describe('requiredRange (range-aware required)', () => {
    const field = createField('range', 'date-range');
    const invoke = (value: unknown, delimiter = ',') => {
      const validator = registry.get('requiredRange');
      const rule = createRule('range', { kind: 'requiredRange', delimiter });
      return validator?.({
        compiledRule: rule,
        rule: rule.rule as SyncValidationRule,
        value,
        field,
        scope: createScope(),
      });
    };

    it('fails on a partial range (one bound filled, the other empty)', () => {
      expect(invoke('2024-06-01,')).toMatchObject({ rule: 'requiredRange' });
      expect(invoke(',2024-06-20')).toMatchObject({ rule: 'requiredRange' });
    });

    it('passes on a fully-filled range (both bounds present)', () => {
      expect(invoke('2024-06-01,2024-06-20')).toBeUndefined();
    });

    it('does not fire on fully-empty values (left to the generic required rule)', () => {
      expect(invoke('')).toBeUndefined();
      expect(invoke(undefined)).toBeUndefined();
      expect(invoke(null)).toBeUndefined();
    });

    it('does not fire on non-string / non-range-shaped values', () => {
      expect(invoke('2024-06-01')).toBeUndefined();
      expect(invoke(['a', 'b'])).toBeUndefined();
      expect(invoke(42)).toBeUndefined();
    });

    it('honors a custom delimiter', () => {
      expect(invoke('2024-06-01~', '~')).toMatchObject({ rule: 'requiredRange' });
      expect(invoke('2024-06-01~2024-06-20', '~')).toBeUndefined();
    });
  });

  it('validates relational dependencies and reports related paths', () => {
    const validator = registry.get('equalsField');
    const field = createField('confirmPassword');
    const rule = createRule('confirmPassword', {
      kind: 'equalsField',
      path: 'password',
      message: 'Passwords must match',
    });

    const error = validator?.({
      compiledRule: rule,
      rule: rule.rule as SyncValidationRule,
      value: 'beta',
      field,
      scope: createScope({ password: 'alpha' }),
    });

    expect(error).toMatchObject({
      path: 'confirmPassword',
      rule: 'equalsField',
      message: 'Passwords must match',
      relatedPaths: ['password'],
    });
  });

  it('validates aggregate array rules with array source kind metadata', () => {
    const validator = registry.get('uniqueBy');
    const field = createField('metadata', 'key-value');
    const rule = createRule('metadata', {
      kind: 'uniqueBy',
      itemPath: 'key',
      message: 'Metadata keys must be unique',
    });

    const error = validator?.({
      compiledRule: rule,
      rule: rule.rule as SyncValidationRule,
      value: [
        { key: 'env', value: 'prod' },
        { key: 'env', value: 'stage' },
      ],
      field,
      scope: createScope(),
    });

    expect(error).toMatchObject({
      path: 'metadata',
      rule: 'uniqueBy',
      message: 'Metadata keys must be unique',
      sourceKind: 'array',
      relatedPaths: ['key'],
    });
  });

  it('passes when object-level requirements are satisfied', () => {
    const validator = registry.get('atLeastOneOf');
    const field = createField('contact', 'contact-group');
    const rule = createRule('contact', {
      kind: 'atLeastOneOf',
      paths: ['email', 'phone'],
      message: 'Provide at least one contact method',
    });

    const error = validator?.({
      compiledRule: rule,
      rule: rule.rule as SyncValidationRule,
      value: {
        email: 'a@example.com',
        phone: '',
      },
      field,
      scope: createScope(),
    });

    expect(error).toBeUndefined();
  });
});
