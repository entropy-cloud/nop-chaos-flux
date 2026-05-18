import { describe, expect, it } from 'vitest';
import type { ValidationRule } from '@nop-chaos/flux-core';
import { collectValidationDependencyPaths } from '../validation/rules.js';

describe('collectValidationDependencyPaths', () => {
  it('returns path for equalsField', () => {
    const rule: ValidationRule = { kind: 'equalsField', path: 'confirmPassword' };
    expect(collectValidationDependencyPaths(rule)).toEqual(['confirmPassword']);
  });

  it('returns path for notEqualsField', () => {
    const rule: ValidationRule = { kind: 'notEqualsField', path: 'oldPassword' };
    expect(collectValidationDependencyPaths(rule)).toEqual(['oldPassword']);
  });

  it('returns path for requiredWhen', () => {
    const rule: ValidationRule = { kind: 'requiredWhen', path: 'country', equals: 'US' };
    expect(collectValidationDependencyPaths(rule)).toEqual(['country']);
  });

  it('returns path for requiredUnless', () => {
    const rule: ValidationRule = { kind: 'requiredUnless', path: 'isExempt', equals: true };
    expect(collectValidationDependencyPaths(rule)).toEqual(['isExempt']);
  });

  it('merges extra dependency paths with cross-field rule dependencies', () => {
    const rule: ValidationRule = { kind: 'requiredWhen', path: 'role', equals: 'admin' };
    expect(collectValidationDependencyPaths(rule, ['tenant'])).toEqual(['tenant', 'role']);
  });

  it('returns extra dependency paths for async rules', () => {
    const rule: ValidationRule = { kind: 'async', action: { action: 'ajax', args: { url: '/check' } } };
    expect(collectValidationDependencyPaths(rule, ['username'])).toEqual(['username']);
  });

  const noDepKinds: ValidationRule[] = [
    { kind: 'required' },
    { kind: 'minLength', value: 3 },
    { kind: 'maxLength', value: 100 },
    { kind: 'minItems', value: 1 },
    { kind: 'maxItems', value: 10 },
    { kind: 'atLeastOneFilled' },
    { kind: 'allOrNone', itemPaths: ['a', 'b'] },
    { kind: 'uniqueBy', itemPath: 'email' },
    { kind: 'atLeastOneOf', paths: ['x', 'y'] },
    { kind: 'pattern', value: '^\\d+$' },
    { kind: 'email' },
    { kind: 'async', action: { action: 'ajax', args: { url: '/check' } } },
  ];

  it.each(noDepKinds)('returns empty array for kind=$kind', (rule) => {
    expect(collectValidationDependencyPaths(rule)).toEqual([]);
  });
});
