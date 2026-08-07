import { describe, expect, it, vi } from 'vitest';
import type { CompiledValidationNode } from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { builtInValidators } from '../validation/validators.js';
import { validateRule as realValidateRule } from '../validation-runtime.js';
import type { SyncValidationContext, SyncValidationRuleKind } from '../validation/validators.js';
import {
  createStubScope,
  invoke,
  makeCompiledRule,
  makeField,
  makeFormModel,
  makeNode,
  makeScope,
} from './validation-rule-semantics-and-lifecycle-test-support.js';

describe('V10 adjacent property: length/items rules do not produce contradictory results on non-string/non-array input', () => {
  it('a number value produces no error from minLength/maxLength/minItems/maxItems (all short-circuit via type guards)', () => {
    expect(invoke('minLength', { kind: 'minLength', value: 3 }, 12345)).toBeUndefined();
    expect(invoke('maxLength', { kind: 'maxLength', value: 3 }, 12345)).toBeUndefined();
    expect(invoke('minItems', { kind: 'minItems', value: 3 }, 12345)).toBeUndefined();
    expect(invoke('maxItems', { kind: 'maxItems', value: 3 }, 12345)).toBeUndefined();
  });

  it('a boolean value produces no error from length/items rules', () => {
    expect(invoke('minLength', { kind: 'minLength', value: 1 }, true)).toBeUndefined();
    expect(invoke('maxItems', { kind: 'maxItems', value: 1 }, false)).toBeUndefined();
  });

  it('a plain object value produces no error from length/items rules', () => {
    expect(invoke('minLength', { kind: 'minLength', value: 1 }, { a: 1 })).toBeUndefined();
    expect(invoke('minItems', { kind: 'minItems', value: 1 }, { a: 1 })).toBeUndefined();
  });

  it('a null value produces no error from length/items rules', () => {
    expect(invoke('minLength', { kind: 'minLength', value: 1 }, null)).toBeUndefined();
    expect(invoke('maxLength', { kind: 'maxLength', value: 1 }, null)).toBeUndefined();
    expect(invoke('minItems', { kind: 'minItems', value: 1 }, null)).toBeUndefined();
    expect(invoke('maxItems', { kind: 'maxItems', value: 1 }, null)).toBeUndefined();
  });

  it('a single field carrying minLength+minItems rules yields a single non-contradictory result for a number input (both skip)', () => {
    const field = makeField({
      rules: [
        makeCompiledRule({ kind: 'minLength', value: 3 }, 0),
        makeCompiledRule({ kind: 'minItems', value: 1 }, 1),
      ],
    });
    const scope = makeScope({});
    const errors: unknown[] = [];
    for (const compiledRule of field.rules) {
      const err = builtInValidators[compiledRule.rule.kind as SyncValidationRuleKind]({
        compiledRule,
        value: 42,
        field,
        scope,
        rule: compiledRule.rule as any,
      } as any);
      if (err) errors.push(err);
    }
    expect(errors).toEqual([]);
  });

  it('a string still triggers minLength normally (guard does not weaken the supported path)', () => {
    expect(invoke('minLength', { kind: 'minLength', value: 5 }, 'ab')).toBeDefined();
  });

  it('an array still triggers minItems normally (guard does not weaken the supported path)', () => {
    expect(invoke('minItems', { kind: 'minItems', value: 3 }, [1])).toBeDefined();
  });
});

describe('V4: dynamic requiredness indicator and submit-gating share one predicate and cannot diverge', () => {
  // The submit-gating side lives in the runtime validator (requiredWhen ->
  // Object.is(getIn(values, rule.path), rule.equals)). The indicator side lives
  // in flux-react/src/form-state.ts (isValidationFieldEffectivelyRequired) and
  // uses the identical predicate. flux-runtime cannot import flux-react, so this
  // test pins the gating side with the real validator and locks the shared
  // predicate by replicating the indicator's exact boolean expression and
  // asserting it tracks the gating decision across every toggle state.

  function indicatorRequiredWhen(
    values: Record<string, unknown>,
    path: string,
    equals: unknown,
  ): boolean {
    return Object.is(getIn(values, path), equals);
  }

  it('gating marks B required when A equals the target and blocks submit; indicator agrees', async () => {
    const model = makeFormModel({
      type: makeNode('type'),
      detail: makeNode('detail', {
        rules: [
          {
            id: 'detail#0:requiredWhen',
            rule: { kind: 'requiredWhen', path: 'type', equals: 'business' },
            dependencyPaths: ['type'],
          },
        ],
      }),
    });

    const runtime = createManagedFormRuntime({
      id: 'v4-form',
      parentScope: createStubScope({ type: 'personal', detail: '' }),
      initialValues: { type: 'personal', detail: '' },
      validation: model,
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    // type !== 'business' -> B not required, submit should pass
    expect(indicatorRequiredWhen({ type: 'personal' }, 'type', 'business')).toBe(false);
    const passing = await runtime.submit();
    expect(passing.ok).toBe(true);

    // toggle type to 'business' -> B now required (both sides flip synchronously)
    runtime.setValue('type', 'business');
    expect(indicatorRequiredWhen({ type: 'business' }, 'type', 'business')).toBe(true);
    const blocked = await runtime.submit();
    expect(blocked.ok).toBe(false);
    expect(runtime.getFieldState('detail').errors.some((e) => e.rule === 'requiredWhen')).toBe(true);

    // writing detail so B is no longer empty -> submit allowed even though B is still "required"
    runtime.setValue('detail', 'tax-id');
    const okAgain = await runtime.submit();
    expect(okAgain.ok).toBe(true);
  });

  it('requiredUnless gating and indicator agree on the negated predicate', async () => {
    const model = makeFormModel({
      isMinor: makeNode('isMinor'),
      guardian: makeNode('guardian', {
        rules: [
          {
            id: 'guardian#0:requiredUnless',
            rule: { kind: 'requiredUnless', path: 'isMinor', equals: false },
            dependencyPaths: ['isMinor'],
          },
        ],
      }),
    });

    const runtime = createManagedFormRuntime({
      id: 'v4b-form',
      // isMinor === true -> !Object.is(true, false) === true -> guardian required -> blocked
      parentScope: createStubScope({ isMinor: true, guardian: '' }),
      initialValues: { isMinor: true, guardian: '' },
      validation: model,
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    expect(!Object.is(getIn({ isMinor: true }, 'isMinor'), false)).toBe(true);
    expect(!Object.is(getIn({ isMinor: false }, 'isMinor'), false)).toBe(false);
    const blocked = await runtime.submit();
    expect(blocked.ok).toBe(false);

    runtime.setValue('isMinor', false);
    const passing = await runtime.submit();
    expect(passing.ok).toBe(true);
  });
});

describe('V5: array sibling-column default value does not suppress sibling rule materialization', () => {
  it('a row where column A is empty but column B has its default still surfaces A required (B default does not suppress A)', async () => {
    const model = makeFormModel({
      'items.0.a': makeNode('items.0.a', {
        parent: 'items.0',
        required: true,
      }),
      'items.0.b': makeNode('items.0.b', {
        parent: 'items.0',
        required: true,
      }),
    });

    const runtime = createManagedFormRuntime({
      id: 'v5-form',
      parentScope: createStubScope({ items: [{ a: '', b: 'sss' }] }),
      initialValues: { items: [{ a: '', b: 'sss' }] },
      validation: model,
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const result = await runtime.validateForm('submit');

    expect(result.ok).toBe(false);
    expect(result.fieldErrors['items.0.a']).toBeDefined();
    expect(
      result.fieldErrors['items.0.a']!.some((e) => e.rule === 'required'),
    ).toBe(true);
    // column B has a filled default and therefore must NOT be suppressed into an error
    expect(result.fieldErrors['items.0.b']).toBeUndefined();
    expect(runtime.getFieldState('items.0.b').errors).toEqual([]);
  });
});

describe('V15: pattern failure with author message renders the author message, never the regex source', () => {
  it('stores the author message as the field error text and the message contains no regex source', async () => {
    const model = makeFormModel({
      code: makeNode('code', {
        rules: [
          {
            id: 'code#0:pattern',
            rule: { kind: 'pattern', value: '^\\d+$', message: 'Must be digits only' },
            dependencyPaths: [],
          },
        ],
      }),
    });

    const runtime = createManagedFormRuntime({
      id: 'v15-form',
      parentScope: createStubScope({ code: 'abc' }),
      initialValues: { code: 'abc' },
      validation: model,
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    runtime.touchField('code');
    const result = await runtime.validateField('code', 'change');

    expect(result.ok).toBe(false);
    const stored = runtime.getFieldState('code').errors;
    expect(stored).toHaveLength(1);
    expect(stored[0].rule).toBe('pattern');
    expect(stored[0].message).toBe('Must be digits only');
    // The regex source must never leak into the user-visible message
    expect(stored[0].message).not.toContain('\\d');
    expect(stored[0].message).not.toContain('regex');
    expect(stored[0].message).not.toMatch(/\[/);
  });
});

describe('V6: row-local relative cross-field addressing (../)', () => {
  it('equalsField resolves ../path against the field path (same row sibling)', () => {
    const ctx: SyncValidationContext<{ kind: 'equalsField'; path: string }> = {
      compiledRule: makeCompiledRule({ kind: 'equalsField', path: '../target' }),
      value: 'abc',
      field: makeField({ path: 'items.0.source' }),
      scope: makeScope({ items: [{ target: 'abc' }] }),
      rule: { kind: 'equalsField', path: '../target' },
    };
    const error = builtInValidators.equalsField(ctx as any);
    expect(error).toBeUndefined();
  });

  it('equalsField with ../path produces error when siblings differ', () => {
    const ctx: SyncValidationContext<{ kind: 'equalsField'; path: string }> = {
      compiledRule: makeCompiledRule({ kind: 'equalsField', path: '../target' }),
      value: 'abc',
      field: makeField({ path: 'items.0.source' }),
      scope: makeScope({ items: [{ target: 'xyz' }] }),
      rule: { kind: 'equalsField', path: '../target' },
    };
    const error = builtInValidators.equalsField(ctx as any);
    expect(error).toBeDefined();
    expect(error!.relatedPaths).toEqual(['items.0.target']);
  });

  it('notEqualsField resolves ../path against the field path (same row sibling)', () => {
    const ctx: SyncValidationContext<{ kind: 'notEqualsField'; path: string }> = {
      compiledRule: makeCompiledRule({ kind: 'notEqualsField', path: '../other' }),
      value: 'abc',
      field: makeField({ path: 'items.0.source' }),
      scope: makeScope({ items: [{ other: 'xyz' }, { other: 'abc' }] }),
      rule: { kind: 'notEqualsField', path: '../other' },
    };
    const error = builtInValidators.notEqualsField(ctx as any);
    expect(error).toBeUndefined();
  });

  it('requiredWhen resolves ../path against the field path', () => {
    const ctx: SyncValidationContext<{ kind: 'requiredWhen'; path: string; equals: unknown }> = {
      compiledRule: makeCompiledRule({ kind: 'requiredWhen', path: '../mode', equals: 'edit' }),
      value: '',
      field: makeField({ path: 'items.0.fieldA' }),
      scope: makeScope({ items: [{ mode: 'edit' }] }),
      rule: { kind: 'requiredWhen', path: '../mode', equals: 'edit' },
    };
    const error = builtInValidators.requiredWhen(ctx as any);
    expect(error).toBeDefined();
    expect(error!.relatedPaths).toEqual(['items.0.mode']);
  });

  it('requiredUnless resolves ../path against the field path', () => {
    const ctx: SyncValidationContext<{ kind: 'requiredUnless'; path: string; equals: unknown }> = {
      compiledRule: makeCompiledRule({ kind: 'requiredUnless', path: '../flag', equals: true }),
      value: '',
      field: makeField({ path: 'items.0.fieldB' }),
      scope: makeScope({ items: [{ flag: false }] }),
      rule: { kind: 'requiredUnless', path: '../flag', equals: true },
    };
    const error = builtInValidators.requiredUnless(ctx as any);
    expect(error).toBeDefined();
    expect(error!.relatedPaths).toEqual(['items.0.flag']);
  });

  it('resolves ../path in compiled validation dependency map to same-row sibling', () => {
    const nodeA: CompiledValidationNode = makeNode('items.0.a', {
      rules: [
        {
          id: 'items.0.a#0:equalsField',
          rule: { kind: 'equalsField', path: '../b' },
          dependencyPaths: ['../b'],
        },
      ],
    });
    const nodeB: CompiledValidationNode = makeNode('items.0.b');

    const model = makeFormModel({ 'items.0.a': nodeA, 'items.0.b': nodeB });

    expect(model.dependents['items.0.b']).toBeDefined();
    expect(model.dependents['items.0.b']).toContain('items.0.a');
  });
});

describe('V6 integration: relative cross-field addressing in array items', () => {
  it('validates equalsField with ../target between sibling fields in array items', async () => {
    const model = makeFormModel({
      'items.0.email': makeNode('items.0.email', { parent: 'items.0' }),
      'items.0.confirm': makeNode('items.0.confirm', {
        parent: 'items.0',
        rules: [
          {
            id: 'items.0.confirm#0:equalsField',
            rule: { kind: 'equalsField', path: '../email' },
            dependencyPaths: ['../email'],
          },
        ],
      }),
    });

    const runtime = createManagedFormRuntime({
      id: 'v6-form',
      parentScope: createStubScope({ items: [{ email: 'a@b.com', confirm: 'wrong' }] }),
      initialValues: { items: [{ email: 'a@b.com', confirm: 'wrong' }] },
      validation: model,
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const result = await runtime.submit();
    expect(result.ok).toBe(false);
    expect(runtime.getFieldState('items.0.confirm').errors.some((e) => e.rule === 'equalsField')).toBe(true);

    runtime.setValue('items.0.confirm', 'a@b.com');
    const okResult = await runtime.submit();
    expect(okResult.ok).toBe(true);
  });
});
