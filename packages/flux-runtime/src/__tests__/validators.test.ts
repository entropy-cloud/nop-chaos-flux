import { describe, expect, it } from 'vitest';
import type { CompiledFormValidationField, CompiledValidationRule, ScopeRef, ValidationRule } from '@nop-chaos/flux-core';
import { builtInValidators, isEmptyValue } from '../validation/validators';
import type { SyncValidationContext, SyncValidationRule, SyncValidationRuleKind } from '../validation/validators';

function makeField(overrides?: Partial<CompiledFormValidationField>): CompiledFormValidationField {
  return {
    path: 'field',
    controlType: 'input-text',
    label: 'Field',
    rules: [],
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    hiddenFieldPolicy: {},
    ...overrides
  };
}

function makeCompiledRule(rule: ValidationRule, index = 0): CompiledValidationRule {
  return {
    id: `field#${index}:${rule.kind}`,
    rule,
    dependencyPaths:
      rule.kind === 'equalsField' || rule.kind === 'notEqualsField' || rule.kind === 'requiredWhen' || rule.kind === 'requiredUnless'
        ? [(rule as any).path]
        : []
  };
}

function makeScope(data: Record<string, unknown> = {}): ScopeRef {
  return {
    id: 'scope-0',
    path: '',
    value: data,
    get(path: string) {
      const keys = path.split('.');
      let current: any = data;
      for (const key of keys) {
        if (current == null || typeof current !== 'object') return undefined;
        current = current[key];
      }
      return current;
    },
    has(path: string) {
      return this.get(path) !== undefined;
    },
    readOwn() {
      return { ...data };
    },
    readVisible() {
      return { ...data };
    },
    materializeVisible() {
      return { ...data };
    },
    update() {},
    merge() {}
  } as ScopeRef;
}

function invoke<R extends SyncValidationRule>(kind: R['kind'], rule: R, value: unknown, scopeData?: Record<string, unknown>) {
  const ctx: SyncValidationContext<R> = {
    compiledRule: makeCompiledRule(rule),
    value,
    field: makeField(),
    scope: makeScope(scopeData),
    rule: rule as any
  };
  return builtInValidators[kind as SyncValidationRuleKind](ctx as any);
}

describe('isEmptyValue', () => {
  it.each([null, undefined, '', []])('returns true for %j', (val) => {
    expect(isEmptyValue(val)).toBe(true);
  });

  it.each([0, false, ' ', ['a'], {}])('returns false for %j', (val) => {
    expect(isEmptyValue(val)).toBe(false);
  });
});

describe('minLength', () => {
  const rule = { kind: 'minLength' as const, value: 3 };

  it('passes for string at minimum', () => {
    expect(invoke('minLength', rule, 'abc')).toBeUndefined();
  });

  it('passes for string above minimum', () => {
    expect(invoke('minLength', rule, 'abcd')).toBeUndefined();
  });

  it('fails for string below minimum', () => {
    const err = invoke('minLength', rule, 'ab');
    expect(err).toBeDefined();
    expect(err!.rule).toBe('minLength');
  });

  it('passes for non-string values', () => {
    expect(invoke('minLength', rule, 123)).toBeUndefined();
    expect(invoke('minLength', rule, null)).toBeUndefined();
  });

  it('fails for empty string (length 0 < min)', () => {
    expect(invoke('minLength', rule, '')).toBeDefined();
  });

  it('returns correct path and ruleId', () => {
    const err = invoke('minLength', { kind: 'minLength', value: 5 }, 'hi');
    expect(err!.path).toBe('field');
    expect(err!.ruleId).toBe('field#0:minLength');
  });
});

describe('maxLength', () => {
  const rule = { kind: 'maxLength' as const, value: 5 };

  it('passes for string at maximum', () => {
    expect(invoke('maxLength', rule, 'abcde')).toBeUndefined();
  });

  it('passes for string below maximum', () => {
    expect(invoke('maxLength', rule, 'ab')).toBeUndefined();
  });

  it('fails for string above maximum', () => {
    const err = invoke('maxLength', rule, 'abcdef');
    expect(err).toBeDefined();
    expect(err!.rule).toBe('maxLength');
  });

  it('passes for non-string values', () => {
    expect(invoke('maxLength', rule, null)).toBeUndefined();
    expect(invoke('maxLength', rule, 999)).toBeUndefined();
  });
});

describe('minItems', () => {
  const rule = { kind: 'minItems' as const, value: 2 };

  it('passes for array at minimum', () => {
    expect(invoke('minItems', rule, [1, 2])).toBeUndefined();
  });

  it('passes for array above minimum', () => {
    expect(invoke('minItems', rule, [1, 2, 3])).toBeUndefined();
  });

  it('fails for array below minimum', () => {
    const err = invoke('minItems', rule, [1]);
    expect(err).toBeDefined();
    expect(err!.rule).toBe('minItems');
    expect(err!.sourceKind).toBe('array');
  });

  it('passes for non-array values', () => {
    expect(invoke('minItems', rule, 'not-array')).toBeUndefined();
    expect(invoke('minItems', rule, null)).toBeUndefined();
  });

  it('passes for empty array below minimum (not enforced on empty)', () => {
    expect(invoke('minItems', rule, [])).toBeDefined();
  });
});

describe('maxItems', () => {
  const rule = { kind: 'maxItems' as const, value: 3 };

  it('passes for array at maximum', () => {
    expect(invoke('maxItems', rule, [1, 2, 3])).toBeUndefined();
  });

  it('passes for array below maximum', () => {
    expect(invoke('maxItems', rule, [1])).toBeUndefined();
  });

  it('fails for array above maximum', () => {
    const err = invoke('maxItems', rule, [1, 2, 3, 4]);
    expect(err).toBeDefined();
    expect(err!.rule).toBe('maxItems');
    expect(err!.sourceKind).toBe('array');
  });

  it('passes for non-array values', () => {
    expect(invoke('maxItems', rule, 'not-array')).toBeUndefined();
    expect(invoke('maxItems', rule, null)).toBeUndefined();
  });
});

describe('atLeastOneFilled', () => {
  it('passes when array has at least one non-empty item (no itemPath)', () => {
    expect(invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, [null, 'value', ''])).toBeUndefined();
  });

  it('fails when all array items are empty (no itemPath)', () => {
    const err = invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, [null, '', undefined]);
    expect(err).toBeDefined();
    expect(err!.rule).toBe('atLeastOneFilled');
  });

  it('fails for empty array', () => {
    expect(invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, [])).toBeDefined();
  });

  it('fails for non-array value', () => {
    expect(invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, null)).toBeDefined();
  });

  it('passes with itemPath when at least one item has filled sub-field', () => {
    expect(
      invoke('atLeastOneFilled', { kind: 'atLeastOneFilled', itemPath: 'name' }, [{ name: '' }, { name: 'filled' }])
    ).toBeUndefined();
  });

  it('fails with itemPath when no item has filled sub-field', () => {
    const err = invoke('atLeastOneFilled', { kind: 'atLeastOneFilled', itemPath: 'name' }, [{ name: '' }, { name: null }]);
    expect(err).toBeDefined();
    expect(err!.relatedPaths).toEqual(['name']);
  });

  it('does not set relatedPaths when itemPath is absent', () => {
    const err = invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, []);
    expect(err!.relatedPaths).toBeUndefined();
  });
});

describe('allOrNone', () => {
  it('passes when all itemPaths are filled on object', () => {
    expect(
      invoke('allOrNone', { kind: 'allOrNone', itemPaths: ['a', 'b'] }, { a: 'x', b: 'y' })
    ).toBeUndefined();
  });

  it('passes when no itemPaths are filled on object', () => {
    expect(
      invoke('allOrNone', { kind: 'allOrNone', itemPaths: ['a', 'b'] }, { a: '', b: null })
    ).toBeUndefined();
  });

  it('fails when some itemPaths are filled on object', () => {
    const err = invoke('allOrNone', { kind: 'allOrNone', itemPaths: ['a', 'b'] }, { a: 'x', b: '' });
    expect(err).toBeDefined();
    expect(err!.rule).toBe('allOrNone');
    expect(err!.relatedPaths).toEqual(['a', 'b']);
  });

  it('passes for empty itemPaths', () => {
    expect(invoke('allOrNone', { kind: 'allOrNone', itemPaths: [] }, { a: 'x' })).toBeUndefined();
  });

  it('passes for null value', () => {
    expect(invoke('allOrNone', { kind: 'allOrNone', itemPaths: ['a'] }, null)).toBeUndefined();
  });

  it('works with arrays: fails when some items partially fill paths', () => {
    const err = invoke(
      'allOrNone',
      { kind: 'allOrNone', itemPaths: ['x', 'y'] },
      [{ x: 'a', y: 'b' }, { x: 'a', y: '' }]
    );
    expect(err).toBeDefined();
  });

  it('works with arrays: passes when all items have all paths filled or all empty', () => {
    expect(
      invoke('allOrNone', { kind: 'allOrNone', itemPaths: ['x', 'y'] }, [{ x: 'a', y: 'b' }, { x: 'c', y: 'd' }])
    ).toBeUndefined();
  });
});

describe('pattern', () => {
  const rule = { kind: 'pattern' as const, value: '^\\d{3}$' };

  it('passes for matching string', () => {
    expect(invoke('pattern', rule, '123')).toBeUndefined();
  });

  it('fails for non-matching string', () => {
    const err = invoke('pattern', rule, 'abc');
    expect(err).toBeDefined();
    expect(err!.rule).toBe('pattern');
  });

  it('passes for empty string (not enforced)', () => {
    expect(invoke('pattern', rule, '')).toBeUndefined();
  });

  it('passes for non-string values', () => {
    expect(invoke('pattern', rule, null)).toBeUndefined();
    expect(invoke('pattern', rule, 123)).toBeUndefined();
  });

  it('uses precompiled regex when available', () => {
    const compiledRule: CompiledValidationRule = {
      id: 'field#0:pattern',
      rule: { kind: 'pattern', value: 'should-not-be-used' },
      dependencyPaths: [],
      precompiled: { regex: /^[A-Z]+$/ }
    };
    const ctx: SyncValidationContext = {
      compiledRule,
      value: 'HELLO',
      field: makeField(),
      scope: makeScope(),
      rule: compiledRule.rule as any
    };
    expect(builtInValidators.pattern(ctx as any)).toBeUndefined();

    ctx.value = 'hello';
    expect(builtInValidators.pattern(ctx as any)).toBeDefined();
  });
});

describe('email', () => {
  const rule = { kind: 'email' as const };

  it.each(['user@example.com', 'a@b.co', 'test+tag@domain.org'])('passes for valid email %s', (val) => {
    expect(invoke('email', rule, val)).toBeUndefined();
  });

  it.each(['no-at-sign', '@missing-local.com', 'missing@domain', 'spaces in@email.com', 'missing@.com'])(
    'fails for invalid email %s',
    (val) => {
      expect(invoke('email', rule, val)).toBeDefined();
    }
  );

  it('passes for empty string (not enforced)', () => {
    expect(invoke('email', rule, '')).toBeUndefined();
  });

  it('passes for non-string values', () => {
    expect(invoke('email', rule, null)).toBeUndefined();
    expect(invoke('email', rule, undefined)).toBeUndefined();
  });
});

describe('notEqualsField', () => {
  const rule = { kind: 'notEqualsField' as const, path: 'confirm' };

  it('passes when values differ', () => {
    expect(invoke('notEqualsField', rule, 'abc', { confirm: 'xyz' })).toBeUndefined();
  });

  it('fails when values are the same', () => {
    const err = invoke('notEqualsField', rule, 'abc', { confirm: 'abc' });
    expect(err).toBeDefined();
    expect(err!.rule).toBe('notEqualsField');
    expect(err!.relatedPaths).toEqual(['confirm']);
  });

  it('passes when both are empty (null and undefined)', () => {
    expect(invoke('notEqualsField', rule, null, { confirm: undefined })).toBeUndefined();
    expect(invoke('notEqualsField', rule, '', { confirm: null })).toBeUndefined();
  });

  it('passes when both are empty strings (both empty => skip)', () => {
    expect(invoke('notEqualsField', rule, '', { confirm: '' })).toBeUndefined();
  });

  it('passes when value is non-empty and peer is empty', () => {
    expect(invoke('notEqualsField', rule, 'value', { confirm: '' })).toBeUndefined();
  });
});

describe('requiredWhen', () => {
  const rule = { kind: 'requiredWhen' as const, path: 'type', equals: 'business' };

  it('fails when dependency equals target and value is empty', () => {
    const err = invoke('requiredWhen', rule, '', { type: 'business' });
    expect(err).toBeDefined();
    expect(err!.rule).toBe('requiredWhen');
    expect(err!.relatedPaths).toEqual(['type']);
  });

  it('passes when dependency equals target and value is present', () => {
    expect(invoke('requiredWhen', rule, 'acme', { type: 'business' })).toBeUndefined();
  });

  it('passes when dependency does not equal target', () => {
    expect(invoke('requiredWhen', rule, '', { type: 'personal' })).toBeUndefined();
  });

  it('passes when dependency is missing', () => {
    expect(invoke('requiredWhen', rule, '', {})).toBeUndefined();
  });

  it('works with boolean equals', () => {
    const boolRule = { kind: 'requiredWhen' as const, path: 'active', equals: true };
    expect(invoke('requiredWhen', boolRule, '', { active: true })).toBeDefined();
    expect(invoke('requiredWhen', boolRule, 'val', { active: true })).toBeUndefined();
    expect(invoke('requiredWhen', boolRule, '', { active: false })).toBeUndefined();
  });
});

describe('requiredUnless', () => {
  const rule = { kind: 'requiredUnless' as const, path: 'isMinor', equals: false };

  it('fails when dependency does NOT equal target and value is empty', () => {
    const err = invoke('requiredUnless', rule, '', { isMinor: true });
    expect(err).toBeDefined();
    expect(err!.rule).toBe('requiredUnless');
    expect(err!.relatedPaths).toEqual(['isMinor']);
  });

  it('passes when dependency equals target (condition NOT met)', () => {
    expect(invoke('requiredUnless', rule, '', { isMinor: false })).toBeUndefined();
  });

  it('passes when dependency does not equal target and value is present', () => {
    expect(invoke('requiredUnless', rule, 'guardian', { isMinor: true })).toBeUndefined();
  });

  it('fails when dependency is missing (not equal to target)', () => {
    expect(invoke('requiredUnless', rule, '', {})).toBeDefined();
  });

  it('works with null equals', () => {
    const nullRule = { kind: 'requiredUnless' as const, path: 'status', equals: null };
    expect(invoke('requiredUnless', nullRule, '', { status: 'active' })).toBeDefined();
    expect(invoke('requiredUnless', nullRule, '', { status: null })).toBeUndefined();
  });
});
