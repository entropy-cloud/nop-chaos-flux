import { describe, expect, it } from 'vitest';
import type { CompiledFormValidationField, CompiledValidationRule, ScopeRef } from '@nop-chaos/flux-core';
import { createScopeRef, createScopeStore } from '../scope';
import { createBuiltInValidationRegistry } from './registry';
import type { SyncValidationRule } from './validators';

function createField(path: string, controlType = 'input-text'): CompiledFormValidationField {
  return {
    path,
    controlType,
    label: path,
    behavior: {
      triggers: ['blur'],
      showErrorOn: ['touched', 'submit']
    },
    rules: []
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
        : []
  };
}

function createScope(initialData: Record<string, any> = {}): ScopeRef {
  return createScopeRef({
    id: 'validation-scope',
    path: '$.validation',
    store: createScopeStore(initialData)
  });
}

describe('builtInValidators', () => {
  const registry = createBuiltInValidationRegistry();

  it('validates required fields', () => {
    const validator = registry.get('required');
    const field = createField('username');
    const rule = createRule('username', { kind: 'required' });

    const error = validator?.({ compiledRule: rule, rule: rule.rule as SyncValidationRule, value: '', field, scope: createScope() });

    expect(error).toMatchObject({
      path: 'username',
      rule: 'required',
      message: 'username is required',
      sourceKind: 'field'
    });
  });

  it('validates relational dependencies and reports related paths', () => {
    const validator = registry.get('equalsField');
    const field = createField('confirmPassword');
    const rule = createRule('confirmPassword', {
      kind: 'equalsField',
      path: 'password',
      message: 'Passwords must match'
    });

    const error = validator?.({
      compiledRule: rule,
      rule: rule.rule as SyncValidationRule,
      value: 'beta',
      field,
      scope: createScope({ password: 'alpha' })
    });

    expect(error).toMatchObject({
      path: 'confirmPassword',
      rule: 'equalsField',
      message: 'Passwords must match',
      relatedPaths: ['password']
    });
  });

  it('validates aggregate array rules with array source kind metadata', () => {
    const validator = registry.get('uniqueBy');
    const field = createField('metadata', 'key-value');
    const rule = createRule('metadata', {
      kind: 'uniqueBy',
      itemPath: 'key',
      message: 'Metadata keys must be unique'
    });

    const error = validator?.({
      compiledRule: rule,
      rule: rule.rule as SyncValidationRule,
      value: [
        { key: 'env', value: 'prod' },
        { key: 'env', value: 'stage' }
      ],
      field,
      scope: createScope()
    });

    expect(error).toMatchObject({
      path: 'metadata',
      rule: 'uniqueBy',
      message: 'Metadata keys must be unique',
      sourceKind: 'array',
      relatedPaths: ['key']
    });
  });

  it('passes when object-level requirements are satisfied', () => {
    const validator = registry.get('atLeastOneOf');
    const field = createField('contact', 'contact-group');
    const rule = createRule('contact', {
      kind: 'atLeastOneOf',
      paths: ['email', 'phone'],
      message: 'Provide at least one contact method'
    });

    const error = validator?.({
      compiledRule: rule,
      rule: rule.rule as SyncValidationRule,
      value: {
        email: 'a@example.com',
        phone: ''
      },
      field,
      scope: createScope()
    });

    expect(error).toBeUndefined();
  });
});

