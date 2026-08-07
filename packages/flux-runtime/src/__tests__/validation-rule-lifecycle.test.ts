import { describe, expect, it, vi } from 'vitest';
import type { CompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { validateRule as realValidateRule } from '../validation-runtime.js';
import {
  createStubScope,
  makeFormModel,
  makeNode,
} from './validation-rule-semantics-and-lifecycle-test-support.js';

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
