import { describe, expect, it, vi } from 'vitest';
import type {
  CompiledFormValidationField,
  CompiledFormValidationModel,
  CompiledValidationNode,
  CompiledValidationRule,
  ScopeRef,
  ValidationRule,
} from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel, getIn } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef, createScopeStore } from '../scope.js';
import { builtInValidators } from '../validation/validators.js';
import { validateRule as realValidateRule } from '../validation-runtime.js';
import type { SyncValidationContext, SyncValidationRule, SyncValidationRuleKind } from '../validation/validators.js';

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

function createStubScope(initialValues: Record<string, unknown> = {}): ScopeRef {
  const store = createScopeStore(initialValues);
  return createScopeRef({ id: 'parent', path: '$', store });
}

function makeNode(
  path: string,
  opts: {
    parent?: string;
    children?: string[];
    required?: boolean;
    rules?: CompiledValidationRule[];
    kind?: CompiledValidationNode['kind'];
  } = {},
): CompiledValidationNode {
  const rules =
    opts.rules ??
    (opts.required
      ? [{ id: `${path}#0:required`, rule: { kind: 'required' as const }, dependencyPaths: [] }]
      : []);
  return {
    path,
    kind: opts.kind ?? 'field',
    controlType: 'input-text',
    rules,
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    children: opts.children ?? [],
    parent: opts.parent ?? '',
  };
}

function makeFormModel(
  fields: Record<string, CompiledValidationNode>,
  behavior: CompiledFormValidationModel['behavior'] = {
    triggers: ['blur'],
    showErrorOn: ['touched', 'submit'],
  },
): CompiledFormValidationModel {
  return buildCompiledFormValidationModel({
    behavior,
    nodes: {
      '': { path: '', kind: 'form', rules: [], children: Object.keys(fields), parent: undefined },
      ...fields,
    },
    rootPath: '',
  })!;
}

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

describe('V9: one submit emits exactly one aggregated validation-failure notification', () => {
  it('multiple required fields failing together call onValidateError exactly once', async () => {
    const onValidateError = vi.fn(
      async (): Promise<import('@nop-chaos/flux-core').ActionResult> => ({ ok: false }),
    );

    const model = makeFormModel({
      name: makeNode('name', { required: true }),
      email: makeNode('email', { required: true }),
      'address.zip': makeNode('address.zip', { parent: 'address', required: true }),
    });

    const runtime = createManagedFormRuntime({
      id: 'v9-form',
      parentScope: createStubScope({ name: '', email: '', address: { zip: '' } }),
      initialValues: { name: '', email: '', address: { zip: '' } },
      validation: model,
      lifecycle: { onValidateError },
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const result = await runtime.submit();

    expect(result.ok).toBe(false);
    expect(onValidateError).toHaveBeenCalledTimes(1);
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

describe('V17: async validation snapshots the latest owner value at run start (execution-time, not dispatch-time)', () => {
  it('after rapid A->B->C changes the resolved run executed against value C', async () => {
    const capturedValues: unknown[] = [];
    let resolveLatest: ((v: unknown) => void) | undefined;

    const model = makeFormModel({
      name: makeNode('name', {
        rules: [
          {
            id: 'name#async',
            rule: {
              kind: 'async',
              action: { action: 'ajax', args: { url: '/check' } },
            },
            dependencyPaths: [],
          },
        ],
      }),
    });

    const runtime = createManagedFormRuntime({
      id: 'v17-form',
      parentScope: createStubScope({ name: 'a' }),
      initialValues: { name: 'a' },
      validation: model,
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockImplementation(
        async (_compiledRule, _rule, _field, scope, signal) => {
          // execution-time snapshot: read the live scope value when the run actually executes
          capturedValues.push(scope.get('name'));
          return new Promise((resolve) => {
            const onAbort = () => {
              signal?.removeEventListener('abort', onAbort);
              resolve(undefined);
            };
            if (signal?.aborted) {
              resolve(undefined);
              return;
            }
            signal?.addEventListener('abort', onAbort, { once: true });
            // only the latest (un-aborted) run keeps a resolvable handle; older
            // runs resolve via their abort listener when superseded
            resolveLatest = resolve;
          });
        },
      ),
    });

    // dispatch A, then supersede with B then C before anything resolves
    const firstRun = runtime.validateField('name', 'change');
    await vi.waitFor(() => expect(resolveLatest).toBeTypeOf('function'));

    runtime.setValue('name', 'b');
    const secondRun = runtime.validateField('name', 'change');
    await vi.waitFor(() => expect(resolveLatest).toBeTypeOf('function'));

    runtime.setValue('name', 'c');
    const thirdRun = runtime.validateField('name', 'change');
    await vi.waitFor(() => expect(resolveLatest).toBeTypeOf('function'));

    // resolve only the latest run; older runs already resolved via abort (superseded)
    resolveLatest?.(undefined);

    // all three settle cleanly (older runs resolve as cancelled -> clean empty result)
    await Promise.allSettled([firstRun, secondRun, thirdRun]);

    // the resolved latest run captured value C at execution time
    expect(capturedValues[capturedValues.length - 1]).toBe('c');
    // no field error surfaced from the resolved run
    expect(runtime.getFieldState('name').errors).toEqual([]);
  });
});

describe('V20: init / remote hydration does not trigger user-visible validation errors', () => {
  it('a required field seeded empty during form creation shows no visible error pre-touch/submit', () => {
    const model = makeFormModel({
      name: makeNode('name', { required: true }),
    });

    const runtime = createManagedFormRuntime({
      id: 'v20-form',
      parentScope: createStubScope({ name: '' }),
      initialValues: { name: '' },
      validation: model,
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    // init seeding wrote an empty required value but produced no visible error
    expect(runtime.getFieldState('name').errors).toEqual([]);
  });

  it('a remote-hydration-style setValues of an empty required value still produces no visible error', () => {
    const model = makeFormModel({
      name: makeNode('name', { required: true }),
    });

    const runtime = createManagedFormRuntime({
      id: 'v20b-form',
      parentScope: createStubScope({ name: 'initial' }),
      initialValues: { name: 'initial' },
      validation: model,
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    // simulate remote re-hydration that resets name to empty
    runtime.setValues({ name: '' });
    expect(runtime.getFieldState('name').errors).toEqual([]);
    // and a reset to empty also produces no visible error
    runtime.reset({ name: '' });
    expect(runtime.getFieldState('name').errors).toEqual([]);
  });
});

describe('V21: applyChangesAndRevalidate clears a stale required error and unblocks submit in one action', () => {
  it('required A fails submit, then applyChangesAndRevalidate writes a valid value -> error cleared and canSubmit true', async () => {
    const model = makeFormModel({
      name: makeNode('name', { required: true }),
    });

    const runtime = createManagedFormRuntime({
      id: 'v21-form',
      parentScope: createStubScope({ name: '' }),
      initialValues: { name: '' },
      validation: model,
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
    });

    const failed = await runtime.submit();
    expect(failed.ok).toBe(false);
    expect(runtime.getFieldState('name').errors.some((e) => e.rule === 'required')).toBe(true);
    expect(runtime.canSubmit).toBe(false);

    const result = await runtime.applyChangesAndRevalidate({
      writes: { name: 'Alice' },
      changedPaths: ['name'],
      reason: 'change',
    });

    expect(result.ok).toBe(true);
    expect(runtime.getFieldState('name').errors).toEqual([]);
    expect(runtime.canSubmit).toBe(true);
    // submit now succeeds without any second corrective action
    const ok = await runtime.submit();
    expect(ok.ok).toBe(true);
  });
});

describe('V18: async/validator failure at the validateForm (submit) entry routes through diagnostics, not a field error', () => {
  function makeAsyncModel(): CompiledFormValidationModel {
    return makeFormModel({
      code: makeNode('code', {
        rules: [
          {
            id: 'code#async',
            rule: {
              kind: 'async',
              action: { action: 'ajax', args: { url: '/check' } },
            },
            dependencyPaths: [],
          },
        ],
      }),
    });
  }

  it('a throwing async rule during submit does NOT write a field error and reaches the diagnostics seam (transport-failure convergence)', async () => {
    const reportFailure = vi.fn();
    const transportError = new Error('network down');

    const runtime = createManagedFormRuntime({
      id: 'v18-form',
      parentScope: createStubScope({ code: 'abc' }),
      initialValues: { code: 'abc' },
      validation: makeAsyncModel(),
      validateRule: realValidateRule,
      executeValidationRule: vi.fn().mockRejectedValue(transportError),
      reportDependentRevalidationFailure: reportFailure,
    });

    const result = await runtime.validateForm('submit');

    // submit-wide result stays not-ok so submit does not silently proceed on unknown state
    expect(result.ok).toBe(false);
    // the failure is NOT surfaced as a field-addressed error (no misleading field red text)
    expect(result.fieldErrors['code']).toBeUndefined();
    expect(runtime.getFieldState('code').errors).toEqual([]);
    // the failure is routed through the owner diagnostics seam
    expect(reportFailure).toHaveBeenCalledWith('code', transportError);
  });

  it('a throwing sync validator during submit likewise routes through diagnostics and writes no field error (unified convergence)', async () => {
    const reportFailure = vi.fn();
    const runtime = createManagedFormRuntime({
      id: 'v18b-form',
      parentScope: createStubScope({ code: 'abc' }),
      initialValues: { code: 'abc' },
      validation: makeFormModel({
        code: makeNode('code', { required: true }),
      }),
      validateRule: vi.fn().mockImplementation(() => {
        throw new Error('validator bug');
      }),
      executeValidationRule: vi.fn().mockResolvedValue(undefined),
      reportDependentRevalidationFailure: reportFailure,
    });

    const result = await runtime.validateForm('submit');

    expect(result.ok).toBe(false);
    expect(result.fieldErrors['code']).toBeUndefined();
    expect(runtime.getFieldState('code').errors).toEqual([]);
    expect(reportFailure).toHaveBeenCalledWith('code', expect.any(Error));
  });
});

