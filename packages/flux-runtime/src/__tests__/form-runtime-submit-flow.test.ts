import { describe, expect, it, vi } from 'vitest';
import { computeRefreshErrorRetention } from '../form-runtime-lifecycle.js';
import { executeFormSubmit } from '../form-runtime-submit-flow.js';

function createStoreState(overrides: Record<string, any> = {}) {
  return {
    fieldStates: {},
    values: { name: 'Alice' },
    ...overrides,
  };
}

function createSubmitInput(overrides: Record<string, any> = {}) {
  const state = createStoreState(overrides.storeState);
  const store = {
    getState: () => state,
    setSubmitAttempted: vi.fn(),
    setSubmitting: vi.fn(),
    batchUpdate: vi.fn((patch) => {
      if (patch.fieldStates) {
        state.fieldStates = patch.fieldStates;
      }
    }),
  } as any;

  let submitting = false;

  const sharedState = {
    store,
    lifecycleState: 'active',
    runtimeFieldRegistrations: new Map(),
    childContracts: new Map(),
    ...(overrides.sharedState ?? {}),
  } as any;

  return {
    store,
    submittingState: {
      get: () => submitting,
      set: (value: boolean) => {
        submitting = value;
      },
    },
    input: {
      sharedState,
      ownerRuntime: {
        supersedeLowerPriorityWork: vi.fn(),
      },
      defaultValidationTriggers: ['blur'],
      submittingDelay: 0,
      getIsSubmitting: () => submitting,
      setIsSubmitting: (value: boolean) => {
        submitting = value;
      },
      getLifecycleHandlers: () => undefined,
      getCurrentValidation: () => undefined,
      validateForm: vi.fn().mockResolvedValue({ ok: true, errors: [], fieldErrors: {} }),
      ...(overrides.input ?? {}),
    },
  };
}

describe('computeRefreshErrorRetention', () => {
  it('retains only errors whose node paths and rule identities still match', () => {
    const sharedRule = { id: 'rule-1', rule: { kind: 'required' } };
    const oldModel = {
      nodes: {
        kept: { rules: [sharedRule] },
        changed: { rules: [{ id: 'rule-2', rule: { kind: 'required' } }] },
      },
    } as any;
    const newModel = {
      nodes: {
        kept: { rules: [sharedRule] },
        changed: { rules: [{ id: 'rule-3', rule: { kind: 'required' } }] },
      },
    } as any;

    expect(
      computeRefreshErrorRetention(oldModel, newModel, {
        kept: [{ message: 'keep' } as any],
        changed: [{ message: 'drop' } as any],
        removed: [{ message: 'gone' } as any],
      }),
    ).toEqual({
      kept: [{ message: 'keep' }],
    });
  });
});

describe('executeFormSubmit', () => {
  it('short-circuits when already submitting, disposed, or aborted', async () => {
    const active = createSubmitInput();
    active.submittingState.set(true);

    await expect(executeFormSubmit(active.input)).resolves.toMatchObject({
      ok: false,
      cancelled: true,
    });

    const disposed = createSubmitInput({
      sharedState: {
        store: active.store,
        lifecycleState: 'disposed',
        runtimeFieldRegistrations: new Map(),
        childContracts: new Map(),
      },
    });
    await expect(executeFormSubmit(disposed.input)).resolves.toMatchObject({
      ok: false,
      cancelled: true,
    });

    const controller = new AbortController();
    controller.abort();
    const aborted = createSubmitInput();
    await expect(
      executeFormSubmit(aborted.input, { signal: controller.signal }),
    ).resolves.toMatchObject({ ok: false, cancelled: true });
  });

  it('returns validation failure or validate-error lifecycle results', async () => {
    const lifecycleResult = { ok: false, data: { via: 'lifecycle' } };
    const submitSetup = createSubmitInput({
      sharedState: {
        runtimeFieldRegistrations: new Map([['name', { registration: { path: 'name' } }]]),
      },
      input: {
        validateForm: vi.fn().mockResolvedValue({
          ok: false,
          errors: [{ message: 'required' }],
          fieldErrors: { name: 'required' },
        }),
        getLifecycleHandlers: () => ({
          onValidateError: vi.fn().mockResolvedValue(lifecycleResult),
        }),
      },
    });

    await expect(executeFormSubmit(submitSetup.input)).resolves.toBe(lifecycleResult);
    expect(submitSetup.store.setSubmitAttempted).toHaveBeenCalledWith(true);
    expect(submitSetup.store.setSubmitting).toHaveBeenLastCalledWith(false);

    const bareFailure = createSubmitInput({
      sharedState: {
        runtimeFieldRegistrations: new Map([['name', { registration: { path: 'name' } }]]),
      },
      input: {
        validateForm: vi.fn().mockResolvedValue({
          ok: false,
          errors: [{ message: 'required' }],
          fieldErrors: { name: 'required' },
        }),
      },
    });

    await expect(executeFormSubmit(bareFailure.input)).resolves.toEqual({
      ok: false,
      error: [{ message: 'required' }],
      data: { name: 'required' },
    });
  });

  it('handles child validation failures before submitAction runs', async () => {
    const childValidation = vi
      .fn()
      .mockResolvedValue({ ok: false, errors: [{ message: 'child-error' }] });
    const submitAction = vi.fn();
    const setup = createSubmitInput({
      sharedState: {
        store: createSubmitInput().store,
        lifecycleState: 'active',
        runtimeFieldRegistrations: new Map(),
        childContracts: new Map([
          ['child', { mode: 'recurse-submit', active: true, triggerValidation: childValidation }],
          ['inactive', { mode: 'recurse-submit', active: false, triggerValidation: vi.fn() }],
          ['other', { mode: 'manual', active: true, triggerValidation: vi.fn() }],
        ]),
      },
      input: {
        getLifecycleHandlers: () => ({ submitAction }),
      },
    });

    await expect(executeFormSubmit(setup.input)).resolves.toEqual({
      ok: false,
      error: [{ message: 'child-error' }],
      data: {},
    });
    expect(childValidation).toHaveBeenCalledTimes(1);
    expect(submitAction).not.toHaveBeenCalled();
  });

  it('snapshots active child contracts once per submit attempt', async () => {
    const childValidation = vi.fn().mockImplementation(async () => {
      setup.input.sharedState.childContracts.clear();
      return { ok: true, errors: [] };
    });
    const secondChildValidation = vi.fn().mockResolvedValue({ ok: true, errors: [] });
    const submitAction = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const setup = createSubmitInput({
      sharedState: {
        store: createSubmitInput().store,
        lifecycleState: 'active',
        runtimeFieldRegistrations: new Map(),
        childContracts: new Map([
          ['child-1', { mode: 'recurse-submit', active: true, triggerValidation: childValidation }],
          ['child-2', { mode: 'recurse-submit', active: true, triggerValidation: secondChildValidation }],
        ]),
      },
      input: {
        getLifecycleHandlers: () => ({ submitAction }),
      },
    });

    await expect(executeFormSubmit(setup.input)).resolves.toMatchObject({ ok: true });

    expect(childValidation).toHaveBeenCalledTimes(1);
    expect(secondChildValidation).toHaveBeenCalledTimes(1);
    expect(submitAction).toHaveBeenCalledTimes(1);
  });

  it('blocks submit when summary-gate child is not ready or not valid', async () => {
    const submitAction = vi.fn();
    const notReadyState = { ready: false, validating: false, valid: true, hasErrors: false };
    const setup = createSubmitInput({
      sharedState: {
        store: createSubmitInput().store,
        lifecycleState: 'active',
        runtimeFieldRegistrations: new Map(),
        childContracts: new Map([
          [
            'child-1',
            {
              mode: 'summary-gate',
              active: true,
              childOwnerId: 'detail-1',
              getState: () => notReadyState,
            },
          ],
        ]),
      },
      input: {
        getLifecycleHandlers: () => ({ submitAction }),
      },
    });

    await expect(executeFormSubmit(setup.input)).resolves.toMatchObject({
      ok: false,
    });
    expect(submitAction).not.toHaveBeenCalled();
  });

  it('allows submit when summary-gate child is ready and valid', async () => {
    const submitAction = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const validState = { ready: true, validating: false, valid: true, hasErrors: false };
    const triggerValidation = vi.fn().mockResolvedValue({ ok: true, errors: [] });
    const setup = createSubmitInput({
      sharedState: {
        store: createSubmitInput().store,
        lifecycleState: 'active',
        runtimeFieldRegistrations: new Map(),
        childContracts: new Map([
          [
            'child-1',
            {
              mode: 'summary-gate',
              active: true,
              childOwnerId: 'detail-1',
              getState: () => validState,
              triggerValidation,
            },
          ],
        ]),
      },
      input: {
        getLifecycleHandlers: () => ({ submitAction }),
      },
    });

    await expect(executeFormSubmit(setup.input)).resolves.toMatchObject({
      ok: true,
    });
    expect(triggerValidation).toHaveBeenCalledTimes(1);
    expect(submitAction).toHaveBeenCalledTimes(1);
  });

  it('aborts a hanging recurse-submit child validation and clears submitting state', async () => {
    const controller = new AbortController();
    const triggerValidation = vi.fn(
      () => new Promise<import('@nop-chaos/flux-core').ValidationResult>(() => undefined),
    );
    const setup = createSubmitInput({
      sharedState: {
        store: createSubmitInput().store,
        lifecycleState: 'active',
        runtimeFieldRegistrations: new Map(),
        childContracts: new Map([
          [
            'child',
            { mode: 'recurse-submit', active: true, triggerValidation, childOwnerId: 'child' },
          ],
        ]),
      },
    });

    const submitPromise = executeFormSubmit(setup.input, { signal: controller.signal });
    controller.abort();

    await expect(submitPromise).resolves.toMatchObject({ ok: false, cancelled: true });
    expect(setup.input.sharedState.store.setSubmitting).toHaveBeenLastCalledWith(false);
    expect(setup.submittingState.get()).toBe(false);
  });

  it('aborts a hanging summary-gate child validation and clears submitting state', async () => {
    const controller = new AbortController();
    const triggerValidation = vi.fn(
      () => new Promise<import('@nop-chaos/flux-core').ValidationResult>(() => undefined),
    );
    const submitAction = vi.fn();
    const setup = createSubmitInput({
      sharedState: {
        store: createSubmitInput().store,
        lifecycleState: 'active',
        runtimeFieldRegistrations: new Map(),
        childContracts: new Map([
          [
            'child',
            {
              mode: 'summary-gate',
              active: true,
              childOwnerId: 'detail-1',
              getState: () => ({ ready: true, validating: false, valid: true, hasErrors: false }),
              triggerValidation,
            },
          ],
        ]),
      },
      input: {
        getLifecycleHandlers: () => ({ submitAction }),
      },
    });

    const submitPromise = executeFormSubmit(setup.input, { signal: controller.signal });
    controller.abort();

    await expect(submitPromise).resolves.toMatchObject({ ok: false, cancelled: true });
    expect(submitAction).not.toHaveBeenCalled();
    expect(setup.input.sharedState.store.setSubmitting).toHaveBeenLastCalledWith(false);
    expect(setup.submittingState.get()).toBe(false);
  });

  it('ignores inactive summary-gate children', async () => {
    const submitAction = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const notValidState = { ready: true, validating: false, valid: false, hasErrors: true };
    const setup = createSubmitInput({
      sharedState: {
        store: createSubmitInput().store,
        lifecycleState: 'active',
        runtimeFieldRegistrations: new Map(),
        childContracts: new Map([
          [
            'inactive-child',
            {
              mode: 'summary-gate',
              active: false,
              childOwnerId: 'detail-inactive',
              getState: () => notValidState,
            },
          ],
        ]),
      },
      input: {
        getLifecycleHandlers: () => ({ submitAction }),
      },
    });

    await expect(executeFormSubmit(setup.input)).resolves.toMatchObject({
      ok: true,
    });
    expect(submitAction).toHaveBeenCalledTimes(1);
  });

  it('routes success, failure, neutral, thrown, and aborted submit outcomes through the right lifecycle branches', async () => {
    const successResult = { ok: true, data: { saved: true } };
    const successHandler = vi.fn().mockResolvedValue({ ok: true, data: { wrapped: 'success' } });
    const failureHandler = vi.fn().mockResolvedValue({ ok: false, data: { wrapped: 'failure' } });
    const validateErrorHandler = vi.fn();
    const lifecycleHandlers = {
      submitAction: vi.fn(),
      onSubmitSuccess: successHandler,
      onSubmitError: failureHandler,
      onValidateError: validateErrorHandler,
    };

    lifecycleHandlers.submitAction.mockResolvedValueOnce(successResult);
    const successSetup = createSubmitInput({
      input: { getLifecycleHandlers: () => lifecycleHandlers },
    });
    await expect(
      executeFormSubmit(successSetup.input, { interactionId: 'submit-1' }),
    ).resolves.toEqual({ ok: true, data: { wrapped: 'success' } });

    lifecycleHandlers.submitAction.mockResolvedValueOnce({ ok: false, error: new Error('failed') });
    const failureSetup = createSubmitInput({
      input: { getLifecycleHandlers: () => lifecycleHandlers },
    });
    await expect(executeFormSubmit(failureSetup.input)).resolves.toEqual({
      ok: false,
      data: { wrapped: 'failure' },
    });

    lifecycleHandlers.submitAction.mockResolvedValueOnce({ ok: true, skipped: true });
    const neutralSetup = createSubmitInput({
      input: { getLifecycleHandlers: () => lifecycleHandlers },
    });
    await expect(executeFormSubmit(neutralSetup.input)).resolves.toEqual({
      ok: true,
      skipped: true,
    });

    lifecycleHandlers.submitAction.mockRejectedValueOnce(new Error('boom'));
    const thrownSetup = createSubmitInput({
      input: { getLifecycleHandlers: () => lifecycleHandlers },
    });
    await expect(executeFormSubmit(thrownSetup.input)).resolves.toEqual({
      ok: false,
      data: { wrapped: 'failure' },
    });

    lifecycleHandlers.submitAction.mockRejectedValueOnce({ name: 'AbortError' });
    const abortedSetup = createSubmitInput({
      input: { getLifecycleHandlers: () => lifecycleHandlers },
    });
    await expect(executeFormSubmit(abortedSetup.input)).resolves.toMatchObject({
      ok: false,
      cancelled: true,
    });

    const signalController = new AbortController();
    const signalSetup = createSubmitInput({
      input: {
        getLifecycleHandlers: () => ({
          submitAction: vi.fn().mockImplementation(async () => {
            signalController.abort();
            return successResult;
          }),
          onSubmitSuccess: successHandler,
        }),
      },
    });
    await expect(
      executeFormSubmit(signalSetup.input, { signal: signalController.signal }),
    ).resolves.toMatchObject({ ok: false, cancelled: true });
  });
});
