import { describe, expect, it } from 'vitest';
import type {
  CompiledFormValidationField,
  CompiledValidationRule,
  ScopeRef,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { builtInValidators, isEmptyValue } from './validators.js';
import type {
  SyncValidationContext,
  SyncValidationRule,
  SyncValidationRuleKind,
} from './validators.js';

function makeField(overrides?: Partial<CompiledFormValidationField>): CompiledFormValidationField {
  return {
    path: 'field',
    controlType: 'input-text',
    label: 'Field',
    rules: [],
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    hiddenFieldPolicy: {},
    ...overrides,
  };
}

function makeCompiledRule(rule: ValidationRule, index = 0): CompiledValidationRule {
  return {
    id: `field#${index}:${rule.kind}`,
    rule,
    dependencyPaths:
      rule.kind === 'equalsField' ||
      rule.kind === 'notEqualsField' ||
      rule.kind === 'requiredWhen' ||
      rule.kind === 'requiredUnless'
        ? [(rule as any).path]
        : [],
  };
}

function makeScope(data: Record<string, unknown> = {}): ScopeRef {
  return {
    id: 'scope-0',
    path: '',
    value: data,
    get(path: string) {
      const keys = path.split('.');
      let current: Record<string, unknown> | undefined = data as Record<string, unknown>;
      for (const key of keys) {
        if (current == null || typeof current !== 'object') return undefined;
        current = current[key] as Record<string, unknown> | undefined;
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
    merge() {},
  } as ScopeRef;
}

function invoke<R extends SyncValidationRule>(
  kind: R['kind'],
  rule: R,
  value: unknown,
  scopeData?: Record<string, unknown>,
) {
  const ctx: SyncValidationContext<R> = {
    compiledRule: makeCompiledRule(rule),
    value,
    field: makeField(),
    scope: makeScope(scopeData),
    rule: rule as any,
  };
  return builtInValidators[kind as SyncValidationRuleKind](ctx as any);
}

describe('isEmptyValue edge cases', () => {
  it('treats NaN as non-empty', () => {
    expect(isEmptyValue(NaN)).toBe(false);
  });

  it('treats 0 as non-empty', () => {
    expect(isEmptyValue(0)).toBe(false);
  });

  it('treats false as non-empty', () => {
    expect(isEmptyValue(false)).toBe(false);
  });

  it('treats whitespace-only string as non-empty', () => {
    expect(isEmptyValue('   ')).toBe(false);
  });

  it('treats empty object as non-empty', () => {
    expect(isEmptyValue({})).toBe(false);
  });

  it('treats nested empty array as non-empty', () => {
    expect(isEmptyValue([[]])).toBe(false);
  });
});

describe('required validator edge cases', () => {
  const validate = (value: unknown) =>
    invoke('required', { kind: 'required' }, value);

  it('passes for 0', () => {
    expect(validate(0)).toBeUndefined();
  });

  it('passes for false', () => {
    expect(validate(false)).toBeUndefined();
  });

  it('passes for whitespace-only string', () => {
    expect(validate('   ')).toBeUndefined();
  });

  it('passes for empty object', () => {
    expect(validate({})).toBeUndefined();
  });

  it('fails for null', () => {
    expect(validate(null)).toBeDefined();
  });

  it('fails for undefined', () => {
    expect(validate(undefined)).toBeDefined();
  });

  it('fails for empty string', () => {
    expect(validate('')).toBeDefined();
  });

  it('fails for empty array', () => {
    expect(validate([])).toBeDefined();
  });

  it('passes for single-element array', () => {
    expect(validate([null])).toBeUndefined();
  });
});

describe('minLength edge cases', () => {
  it('fails for empty string when minLength is 0', () => {
    expect(invoke('minLength', { kind: 'minLength', value: 0 }, '')).toBeUndefined();
  });

  it('passes for empty string when minLength is 0 (length 0 === 0)', () => {
    const err = invoke('minLength', { kind: 'minLength', value: 0 }, '');
    expect(err).toBeUndefined();
  });

  it('fails for string shorter than minLength when minLength is negative', () => {
    expect(invoke('minLength', { kind: 'minLength', value: -1 }, '')).toBeUndefined();
  });

  it('passes for number value (not a string)', () => {
    expect(invoke('minLength', { kind: 'minLength', value: 5 }, 12345)).toBeUndefined();
  });

  it('passes for array value (not a string)', () => {
    expect(invoke('minLength', { kind: 'minLength', value: 2 }, [1, 2, 3])).toBeUndefined();
  });
});

describe('maxLength edge cases', () => {
  it('passes for empty string when maxLength is 0', () => {
    expect(invoke('maxLength', { kind: 'maxLength', value: 0 }, '')).toBeUndefined();
  });

  it('fails for non-empty string when maxLength is 0', () => {
    expect(invoke('maxLength', { kind: 'maxLength', value: 0 }, 'a')).toBeDefined();
  });
});

describe('minItems edge cases', () => {
  it('passes for empty array when minItems is 0', () => {
    expect(invoke('minItems', { kind: 'minItems', value: 0 }, [])).toBeUndefined();
  });

  it('fails for empty array when minItems is 1', () => {
    expect(invoke('minItems', { kind: 'minItems', value: 1 }, [])).toBeDefined();
  });

  it('passes for string value (not an array)', () => {
    expect(invoke('minItems', { kind: 'minItems', value: 2 }, 'ab')).toBeUndefined();
  });
});

describe('pattern edge cases', () => {
  it('passes for empty string (pattern is not enforced on empty)', () => {
    expect(invoke('pattern', { kind: 'pattern', value: '^\\d+$' }, '')).toBeUndefined();
  });

  it('passes for null value', () => {
    expect(invoke('pattern', { kind: 'pattern', value: '^\\d+$' }, null)).toBeUndefined();
  });

  it('passes for whitespace-only string when pattern does not match', () => {
    expect(invoke('pattern', { kind: 'pattern', value: '^\\d+$' }, '   ')).toBeDefined();
  });

  it('passes for empty regex pattern on non-empty string', () => {
    expect(invoke('pattern', { kind: 'pattern', value: '' }, 'anything')).toBeUndefined();
  });
});

describe('email edge cases', () => {
  it('fails for email with trailing dot', () => {
    expect(invoke('email', { kind: 'email' }, 'user@domain.')).toBeDefined();
  });

  it('fails for email without TLD', () => {
    expect(invoke('email', { kind: 'email' }, 'user@domain')).toBeDefined();
  });

  it('fails for double @', () => {
    expect(invoke('email', { kind: 'email' }, 'user@@domain.com')).toBeDefined();
  });

  it('passes for email with subdomain', () => {
    expect(invoke('email', { kind: 'email' }, 'user@sub.domain.com')).toBeUndefined();
  });
});

describe('equalsField with special values', () => {
  it('passes when both are NaN (Object.is identity)', () => {
    expect(invoke('equalsField', { kind: 'equalsField', path: 'peer' }, NaN, { peer: NaN })).toBeUndefined();
  });

  it('fails when value is 0 and peer is -0 (Object.is distinguishes them)', () => {
    expect(invoke('equalsField', { kind: 'equalsField', path: 'peer' }, 0, { peer: -0 })).toBeDefined();
  });

  it('fails when value is object and peer is different object', () => {
    expect(
      invoke('equalsField', { kind: 'equalsField', path: 'peer' }, { a: 1 }, { peer: { a: 1 } }),
    ).toBeDefined();
  });

  it('fails when value is object and peer is same reference', () => {
    const obj = { a: 1 };
    expect(invoke('equalsField', { kind: 'equalsField', path: 'peer' }, obj, { peer: obj })).toBeUndefined();
  });
});

describe('notEqualsField with special values', () => {
  it('fails when both are NaN', () => {
    expect(invoke('notEqualsField', { kind: 'notEqualsField', path: 'peer' }, NaN, { peer: NaN })).toBeDefined();
  });

  it('passes when one is 0 and other is -0 are the same', () => {
    expect(invoke('notEqualsField', { kind: 'notEqualsField', path: 'peer' }, 0, { peer: -0 })).toBeUndefined();
  });
});

describe('requiredWhen edge cases', () => {
  it('triggers when equals is NaN and dependency is NaN', () => {
    const err = invoke(
      'requiredWhen',
      { kind: 'requiredWhen', path: 'flag', equals: NaN },
      '',
      { flag: NaN },
    );
    expect(err).toBeDefined();
  });

  it('does not trigger when equals is NaN and dependency is not NaN', () => {
    const err = invoke(
      'requiredWhen',
      { kind: 'requiredWhen', path: 'flag', equals: NaN },
      '',
      { flag: 42 },
    );
    expect(err).toBeUndefined();
  });

  it('triggers when equals is 0 and dependency is 0', () => {
    const err = invoke(
      'requiredWhen',
      { kind: 'requiredWhen', path: 'flag', equals: 0 },
      '',
      { flag: 0 },
    );
    expect(err).toBeDefined();
  });

  it('does not trigger when equals is 0 and dependency is undefined', () => {
    const err = invoke(
      'requiredWhen',
      { kind: 'requiredWhen', path: 'flag', equals: 0 },
      '',
      {},
    );
    expect(err).toBeUndefined();
  });
});

describe('requiredUnless edge cases', () => {
  it('requires when dependency is undefined and equals is true', () => {
    const err = invoke(
      'requiredUnless',
      { kind: 'requiredUnless', path: 'isExempt', equals: true },
      '',
      {},
    );
    expect(err).toBeDefined();
  });

  it('does not require when dependency equals target', () => {
    expect(
      invoke(
        'requiredUnless',
        { kind: 'requiredUnless', path: 'isExempt', equals: true },
        '',
        { isExempt: true },
      ),
    ).toBeUndefined();
  });
});

describe('uniqueBy edge cases', () => {
  it('returns false (no violation) for empty array', () => {
    expect(
      invoke('uniqueBy', { kind: 'uniqueBy', itemPath: 'id' }, []),
    ).toBeUndefined();
  });

  it('returns false (no violation) when itemPath is empty string', () => {
    expect(
      invoke('uniqueBy', { kind: 'uniqueBy', itemPath: '' }, [{ '': 'a' }, { '': 'a' }]),
    ).toBeUndefined();
  });

  it('skips items with empty candidate values', () => {
    expect(
      invoke('uniqueBy', { kind: 'uniqueBy', itemPath: 'id' }, [
        { id: null },
        { id: null },
        { id: '' },
      ]),
    ).toBeUndefined();
  });

  it('detects duplicates among non-empty values', () => {
    expect(
      invoke('uniqueBy', { kind: 'uniqueBy', itemPath: 'id' }, [
        { id: null },
        { id: 'a' },
        { id: 'a' },
      ]),
    ).toBeDefined();
  });

  it('handles non-array value gracefully', () => {
    expect(
      invoke('uniqueBy', { kind: 'uniqueBy', itemPath: 'id' }, 'not-array'),
    ).toBeUndefined();
  });
});

describe('atLeastOneOf edge cases', () => {
  it('fails when value is null', () => {
    expect(
      invoke('atLeastOneOf', { kind: 'atLeastOneOf', paths: ['a', 'b'] }, null),
    ).toBeDefined();
  });

  it('fails when value is undefined', () => {
    expect(
      invoke('atLeastOneOf', { kind: 'atLeastOneOf', paths: ['a', 'b'] }, undefined),
    ).toBeDefined();
  });

  it('fails when paths is empty array', () => {
    expect(
      invoke('atLeastOneOf', { kind: 'atLeastOneOf', paths: [] }, { a: 'val' }),
    ).toBeDefined();
  });

  it('passes when deep nested path is filled', () => {
    expect(
      invoke('atLeastOneOf', { kind: 'atLeastOneOf', paths: ['a.b', 'c'] }, { a: { b: 'x' } }),
    ).toBeUndefined();
  });
});

describe('allOrNone edge cases', () => {
  it('passes for non-object, non-array null value', () => {
    expect(
      invoke('allOrNone', { kind: 'allOrNone', itemPaths: ['a'] }, null),
    ).toBeUndefined();
  });

  it('passes for non-object, non-array number value', () => {
    expect(
      invoke('allOrNone', { kind: 'allOrNone', itemPaths: ['a'] }, 42),
    ).toBeUndefined();
  });

  it('works with array of primitive items', () => {
    expect(
      invoke('allOrNone', { kind: 'allOrNone', itemPaths: ['x'] }, [1, 2]),
    ).toBeUndefined();
  });
});

describe('atLeastOneFilled edge cases', () => {
  it('fails for null value', () => {
    expect(
      invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, null),
    ).toBeDefined();
  });

  it('fails for undefined value', () => {
    expect(
      invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, undefined),
    ).toBeDefined();
  });

  it('fails for string value (not array)', () => {
    expect(
      invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, 'string'),
    ).toBeDefined();
  });

  it('passes when array has a zero value', () => {
    expect(
      invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, [0]),
    ).toBeUndefined();
  });

  it('passes when array has a false value', () => {
    expect(
      invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, [false]),
    ).toBeUndefined();
  });
});

describe('sourceKind resolution', () => {
  it('required yields sourceKind field', () => {
    const err = invoke('required', { kind: 'required' }, '');
    expect(err?.sourceKind).toBe('field');
  });

  it('minLength yields sourceKind field', () => {
    const err = invoke('minLength', { kind: 'minLength', value: 10 }, 'ab');
    expect(err?.sourceKind).toBe('field');
  });

  it('email yields sourceKind field', () => {
    const err = invoke('email', { kind: 'email' }, 'nope');
    expect(err?.sourceKind).toBe('field');
  });

  it('minItems yields sourceKind array', () => {
    const err = invoke('minItems', { kind: 'minItems', value: 5 }, [1]);
    expect(err?.sourceKind).toBe('array');
  });

  it('maxItems yields sourceKind array', () => {
    const err = invoke('maxItems', { kind: 'maxItems', value: 0 }, [1]);
    expect(err?.sourceKind).toBe('array');
  });

  it('uniqueBy yields sourceKind array', () => {
    const err = invoke(
      'uniqueBy',
      { kind: 'uniqueBy', itemPath: 'id' },
      [{ id: 1 }, { id: 1 }],
    );
    expect(err?.sourceKind).toBe('array');
  });

  it('atLeastOneFilled yields sourceKind array', () => {
    const err = invoke('atLeastOneFilled', { kind: 'atLeastOneFilled' }, []);
    expect(err?.sourceKind).toBe('array');
  });

  it('atLeastOneOf yields sourceKind object', () => {
    const err = invoke(
      'atLeastOneOf',
      { kind: 'atLeastOneOf', paths: ['a'] },
      {},
    );
    expect(err?.sourceKind).toBe('object');
  });

  it('allOrNone with array controlType yields sourceKind array', () => {
    const field = makeField({ controlType: 'input-array' });
    const ctx: SyncValidationContext = {
      compiledRule: makeCompiledRule({ kind: 'allOrNone', itemPaths: ['a', 'b'] }),
      value: { a: 'x', b: '' },
      field,
      scope: makeScope(),
      rule: { kind: 'allOrNone', itemPaths: ['a', 'b'] } as any,
    };
    const err = builtInValidators.allOrNone(ctx as any);
    expect(err?.sourceKind).toBe('array');
  });

  it('allOrNone with list controlType yields sourceKind array', () => {
    const field = makeField({ controlType: 'list-editor' });
    const ctx: SyncValidationContext = {
      compiledRule: makeCompiledRule({ kind: 'allOrNone', itemPaths: ['a', 'b'] }),
      value: { a: 'x', b: '' },
      field,
      scope: makeScope(),
      rule: { kind: 'allOrNone', itemPaths: ['a', 'b'] } as any,
    };
    const err = builtInValidators.allOrNone(ctx as any);
    expect(err?.sourceKind).toBe('array');
  });

  it('allOrNone with non-array controlType yields sourceKind object', () => {
    const field = makeField({ controlType: 'input-text' });
    const ctx: SyncValidationContext = {
      compiledRule: makeCompiledRule({ kind: 'allOrNone', itemPaths: ['a', 'b'] }),
      value: { a: 'x', b: '' },
      field,
      scope: makeScope(),
      rule: { kind: 'allOrNone', itemPaths: ['a', 'b'] } as any,
    };
    const err = builtInValidators.allOrNone(ctx as any);
    expect(err?.sourceKind).toBe('object');
  });

  it('allOrNone with key-value controlType yields sourceKind array', () => {
    const field = makeField({ controlType: 'key-value-pairs' });
    const ctx: SyncValidationContext = {
      compiledRule: makeCompiledRule({ kind: 'allOrNone', itemPaths: ['a', 'b'] }),
      value: { a: 'x', b: '' },
      field,
      scope: makeScope(),
      rule: { kind: 'allOrNone', itemPaths: ['a', 'b'] } as any,
    };
    const err = builtInValidators.allOrNone(ctx as any);
    expect(err?.sourceKind).toBe('array');
  });
});

describe('createValidationError overrides', () => {
  it('allows sourceKind override via overrides parameter', () => {
    const err = invoke('required', { kind: 'required' }, null);
    expect(err?.sourceKind).toBe('field');
  });
});

describe('dependency path collection', () => {
  it('requiredWhen collects dependency path', () => {
    const rule: ValidationRule = {
      kind: 'requiredWhen',
      path: 'country',
      equals: 'US',
    };
    const compiledRule = makeCompiledRule(rule);
    expect(compiledRule.dependencyPaths).toEqual(['country']);
  });

  it('equalsField collects dependency path', () => {
    const rule: ValidationRule = {
      kind: 'equalsField',
      path: 'password',
    };
    const compiledRule = makeCompiledRule(rule);
    expect(compiledRule.dependencyPaths).toEqual(['password']);
  });
});
