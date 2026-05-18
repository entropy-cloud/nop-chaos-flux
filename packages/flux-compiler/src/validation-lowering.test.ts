import { describe, expect, it } from 'vitest';
import type { BaseSchema } from '@nop-chaos/flux-core';
import {
  collectSchemaValidationRules,
  compileValidationRules,
  mergeValidationRules,
  normalizeValidationTriggers,
  normalizeValidationVisibilityTriggers,
} from './validation-lowering.js';

function schema(input: Omit<BaseSchema, 'type'> & { type?: BaseSchema['type'] }): BaseSchema {
  return { type: 'text', ...input } as BaseSchema;
}

describe('validation-lowering', () => {
  it('marks invalid and unsupported pattern rules as unsafe diagnostics', () => {
    const [invalid] = compileValidationRules('field', [{ kind: 'pattern', value: '[' }]);
    const [unsafe] = compileValidationRules('field', [{ kind: 'pattern', value: '(a+)+$' }]);
    const [safe] = compileValidationRules('field', [{ kind: 'pattern', value: '^\\d{3}$' }]);

    expect(invalid.precompiled).toMatchObject({ safe: false });
    expect(unsafe.precompiled).toMatchObject({
      safe: false,
      error: 'Pattern uses unsupported backtracking-prone constructs',
    });
    expect(safe.precompiled).toMatchObject({ safe: true });
  });

  describe('collectSchemaValidationRules', () => {
    it('returns empty array for schema with no rules', () => {
      expect(collectSchemaValidationRules(schema({}))).toEqual([]);
    });

    it('collects required rule', () => {
      expect(collectSchemaValidationRules(schema({ required: true }))).toEqual([{ kind: 'required' }]);
    });

    it('collects minLength rule', () => {
      expect(collectSchemaValidationRules(schema({ minLength: 2 }))).toEqual([
        { kind: 'minLength', value: 2 },
      ]);
    });

    it('collects maxLength rule', () => {
      expect(collectSchemaValidationRules(schema({ maxLength: 10 }))).toEqual([
        { kind: 'maxLength', value: 10 },
      ]);
    });

    it('collects minItems rule', () => {
      expect(collectSchemaValidationRules(schema({ minItems: 1 }))).toEqual([
        { kind: 'minItems', value: 1 },
      ]);
    });

    it('collects maxItems rule', () => {
      expect(collectSchemaValidationRules(schema({ maxItems: 5 }))).toEqual([
        { kind: 'maxItems', value: 5 },
      ]);
    });

    it('collects atLeastOneFilled with boolean form', () => {
      const rules = collectSchemaValidationRules(schema({ atLeastOneFilled: true }));
      expect(rules).toEqual([{ kind: 'atLeastOneFilled', itemPath: undefined, message: undefined }]);
    });

    it('collects atLeastOneFilled with object form', () => {
      const rules = collectSchemaValidationRules(schema({
        atLeastOneFilled: { itemPath: 'email', message: 'Fill one' },
      }));
      expect(rules).toEqual([
        { kind: 'atLeastOneFilled', itemPath: 'email', message: 'Fill one' },
      ]);
    });

    it('collects allOrNone rule', () => {
      const rules = collectSchemaValidationRules(schema({
        allOrNone: { itemPaths: ['a', 'b'], message: 'All or none' },
      }));
      expect(rules).toEqual([{ kind: 'allOrNone', itemPaths: ['a', 'b'], message: 'All or none' }]);
    });

    it('collects uniqueBy rule', () => {
      const rules = collectSchemaValidationRules(
        schema({ uniqueBy: { itemPath: 'id', message: 'dup' } }),
      );
      expect(rules).toEqual([{ kind: 'uniqueBy', itemPath: 'id', message: 'dup' }]);
    });

    it('collects atLeastOneOf rule', () => {
      const rules = collectSchemaValidationRules(schema({
        atLeastOneOf: { paths: ['a', 'b'], message: 'need one' },
      }));
      expect(rules).toEqual([{ kind: 'atLeastOneOf', paths: ['a', 'b'], message: 'need one' }]);
    });

    it('collects pattern rule with message', () => {
      const rules = collectSchemaValidationRules(schema({
        pattern: '^\\d+$',
        patternMessage: 'digits only',
      }));
      expect(rules).toEqual([{ kind: 'pattern', value: '^\\d+$', message: 'digits only' }]);
    });

    it('collects pattern rule without message', () => {
      const rules = collectSchemaValidationRules(schema({ pattern: '^\\d+$' }));
      expect(rules).toEqual([{ kind: 'pattern', value: '^\\d+$', message: undefined }]);
    });

    it('collects equalsField rule', () => {
      expect(collectSchemaValidationRules(schema({ equalsField: 'password' }))).toEqual([
        { kind: 'equalsField', path: 'password' },
      ]);
    });

    it('collects notEqualsField rule', () => {
      expect(collectSchemaValidationRules(schema({ notEqualsField: 'oldPassword' }))).toEqual([
        { kind: 'notEqualsField', path: 'oldPassword' },
      ]);
    });

    it('collects requiredWhen rule', () => {
      const rules = collectSchemaValidationRules(schema({
        requiredWhen: { path: 'type', equals: 'email', message: 'required for email' },
      }));
      expect(rules).toEqual([
        {
          kind: 'requiredWhen',
          path: 'type',
          equals: 'email',
          message: 'required for email',
        },
      ]);
    });

    it('collects requiredUnless rule', () => {
      const rules = collectSchemaValidationRules(schema({
        requiredUnless: { path: 'mode', equals: 'skip', message: 'required unless skip' },
      }));
      expect(rules).toEqual([
        {
          kind: 'requiredUnless',
          path: 'mode',
          equals: 'skip',
          message: 'required unless skip',
        },
      ]);
    });

    it('collects multiple rules from a single schema', () => {
      const rules = collectSchemaValidationRules(schema({
        required: true,
        minLength: 2,
        maxLength: 50,
        pattern: '^[a-z]+$',
      }));
      expect(rules).toHaveLength(4);
      expect(rules.map((r) => r.kind)).toEqual(['required', 'minLength', 'maxLength', 'pattern']);
    });
  });

  describe('mergeValidationRules', () => {
    it('merges multiple rule groups', () => {
      const a = [{ kind: 'required' as const }];
      const b = [{ kind: 'minLength' as const, value: 1 }];
      expect(mergeValidationRules(a, b)).toEqual([
        { kind: 'required' },
        { kind: 'minLength', value: 1 },
      ]);
    });

    it('skips undefined groups', () => {
      const a = [{ kind: 'required' as const }];
      expect(mergeValidationRules(undefined, a)).toEqual([{ kind: 'required' }]);
    });

    it('returns empty for all undefined', () => {
      expect(mergeValidationRules(undefined, undefined)).toEqual([]);
    });
  });

  describe('normalizeValidationTriggers', () => {
    it('returns fallback for null input', () => {
      expect(normalizeValidationTriggers(null)).toEqual(['blur']);
    });

    it('returns fallback for undefined input', () => {
      expect(normalizeValidationTriggers(undefined)).toEqual(['blur']);
    });

    it('returns fallback for empty array', () => {
      expect(normalizeValidationTriggers([])).toEqual(['blur']);
    });

    it('normalizes single string value', () => {
      expect(normalizeValidationTriggers('change')).toEqual(['change']);
    });

    it('deduplicates triggers', () => {
      expect(normalizeValidationTriggers(['blur', 'blur'])).toEqual(['blur']);
    });

    it('filters invalid values and returns fallback', () => {
      expect(normalizeValidationTriggers(['invalid'])).toEqual(['blur']);
    });

    it('accepts all valid triggers', () => {
      expect(normalizeValidationTriggers(['change', 'blur', 'submit'])).toEqual([
        'change',
        'blur',
        'submit',
      ]);
    });

    it('uses custom fallback', () => {
      expect(normalizeValidationTriggers(null, ['submit'])).toEqual(['submit']);
    });
  });

  describe('normalizeValidationVisibilityTriggers', () => {
    it('returns default fallback for null input', () => {
      expect(normalizeValidationVisibilityTriggers(null)).toEqual(['touched', 'submit']);
    });

    it('accepts all valid visibility triggers', () => {
      expect(
        normalizeValidationVisibilityTriggers(['touched', 'dirty', 'visited', 'submit']),
      ).toEqual(['touched', 'dirty', 'visited', 'submit']);
    });

    it('deduplicates visibility triggers', () => {
      expect(normalizeValidationVisibilityTriggers(['submit', 'submit'])).toEqual(['submit']);
    });

    it('filters invalid values and returns fallback', () => {
      expect(normalizeValidationVisibilityTriggers(['invalid'])).toEqual(['touched', 'submit']);
    });

    it('uses custom fallback', () => {
      expect(normalizeValidationVisibilityTriggers(null, ['submit'])).toEqual(['submit']);
    });
  });

  describe('compileValidationRules', () => {
    it('assigns unique ids to rules', () => {
      const rules = compileValidationRules('form.name', [
        { kind: 'required' },
        { kind: 'minLength', value: 2 },
      ]);
      expect(rules[0].id).toBe('form.name#0:required');
      expect(rules[1].id).toBe('form.name#1:minLength');
    });

    it('computes dependency paths for cross-field rules', () => {
      const [rule] = compileValidationRules('field', [{ kind: 'equalsField', path: 'other' }]);
      expect(rule.dependencyPaths).toEqual(['other']);
    });

    it('merges schema-level dependsOn with rule dependencies', () => {
      const [rule] = compileValidationRules(
        'field',
        [{ kind: 'requiredWhen', path: 'role', equals: 'admin' }],
        ['tenant'],
      );

      expect(rule.dependencyPaths).toEqual(['tenant', 'role']);
    });

    it('uses schema-level dependsOn for async rules', () => {
      const [rule] = compileValidationRules(
        'field',
        [{ kind: 'async', action: { action: 'ajax', args: { url: '/check' } } }],
        ['username'],
      );

      expect(rule.dependencyPaths).toEqual(['username']);
    });

    it('returns empty dependency paths for rules without deps', () => {
      const [rule] = compileValidationRules('field', [{ kind: 'required' }]);
      expect(rule.dependencyPaths).toEqual([]);
    });
  });
});
