import { describe, expect, it, vi } from 'vitest';
import type {
  ChildValidationContractRegistration,
  ChildValidationMode,
  CompiledFormValidationModel,
  CompiledValidationNode,
} from '@nop-chaos/flux-core';
import { buildCompiledFormValidationModel } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';
import { createScopeRef, createScopeStore } from '../scope.js';
import { validateRule as realValidateRule } from '../validation-runtime.js';

function makeMockChildContract(
  childOwnerId: string,
  mode: ChildValidationMode,
  active: boolean,
  overrides: Partial<ChildValidationContractRegistration> = {},
): ChildValidationContractRegistration {
  return {
    childOwnerId,
    mode,
    active,
    unregister: overrides.unregister ?? (() => {}),
    getState:
      overrides.getState ??
      (() => ({ ready: true, validating: false, valid: true, hasErrors: false })),
    triggerValidation:
      overrides.triggerValidation ?? (() => Promise.resolve({ ok: true, errors: [] })),
  };
}

function makeNode(path: string, required = false): CompiledValidationNode {
  return {
    path,
    kind: 'field',
    controlType: 'input-text',
    rules: required
      ? [{ id: `${path}#required`, rule: { kind: 'required' }, dependencyPaths: [] }]
      : [],
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    children: [],
    parent: '',
  };
}

function makeModel(fields: Record<string, CompiledValidationNode>): CompiledFormValidationModel {
  return buildCompiledFormValidationModel({
    behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
    nodes: {
      '': {
        path: '',
        kind: 'form',
        rules: [],
        children: Object.keys(fields),
        parent: undefined,
      },
      ...fields,
    },
    rootPath: '',
  })!;
}

function makeRuntime(
  options: {
    initialLifecycleState?: 'active' | 'bootstrapping' | 'refreshing';
    initialValues?: Record<string, unknown>;
  } = {},
) {
  const parentStore = createScopeStore({ name: '' });
  const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });

  return createManagedFormRuntime({
    id: 'test-form',
    parentScope,
    initialValues: { name: '', ...(options.initialValues ?? {}) },
    validation: makeModel({ name: makeNode('name', true) }),
    initialLifecycleState: options.initialLifecycleState,
    validateRule: realValidateRule,
    executeValidationRule: vi.fn().mockResolvedValue(undefined),
  });
}

describe('owner submit contracts', () => {
  it('rejects submit during bootstrapping before mutating submit state', async () => {
    const runtime = makeRuntime({ initialLifecycleState: 'bootstrapping' });

    const result = await runtime.submit();

    expect(result.ok).toBe(false);
    expect(runtime.store.getState().submitting).toBe(false);
    expect(runtime.store.getState().submitAttempted).toBe(false);
    expect(runtime.getFieldState('name').errors).toEqual([]);
  });

  it('blocks submit when an active summary-gate child is not ready', async () => {
    const runtime = makeRuntime({ initialValues: { name: 'ready-parent' } });
    runtime.registerChildContract(
      makeMockChildContract('child-form-1', 'summary-gate', true, {
        getState: () => ({ ready: false, validating: false, valid: true, hasErrors: false }),
      }),
    );

    const result = await runtime.submit();

    expect(result.ok).toBe(false);
    expect(result.error).toMatchObject([
      expect.objectContaining({ message: expect.stringContaining('child-form-1') }),
    ]);
  });

  it('marks submit-triggered required fields as touched after active submit validation', async () => {
    const runtime = makeRuntime();

    const result = await runtime.submit();

    expect(result.ok).toBe(false);
    expect(runtime.isTouched('name')).toBe(true);
    expect(runtime.getFieldState('name').errors).toMatchObject([
      expect.objectContaining({ path: 'name', rule: 'required' }),
    ]);
  });

  it('forwards submit abort signals through the real runtime validateForm path', async () => {
    const runtime = makeRuntime({ initialValues: { name: 'ready' } });
    const controller = new AbortController();
    const originalValidateForm = runtime.validateForm.bind(runtime);
    const validateFormSpy = vi.spyOn(runtime, 'validateForm');

    validateFormSpy.mockImplementation((reason, options) => originalValidateForm(reason, options));

    await runtime.submit({ signal: controller.signal });

    expect(validateFormSpy).toHaveBeenCalledWith('submit', { signal: controller.signal });
  });

  it('cancels in-flight async field validation when submit aborts', async () => {
    let releaseValidation: (() => void) | undefined;
    const parentStore = createScopeStore({ name: '' });
    const parentScope = createScopeRef({ id: 'parent', path: '$', store: parentStore });
    const runtime = createManagedFormRuntime({
      id: 'test-form',
      parentScope,
      initialValues: { name: 'ready' },
      validation: makeModel({
        name: {
          ...makeNode('name', false),
          rules: [
            {
              id: 'name#async',
              rule: { kind: 'async', action: { actionType: 'noop' } as any },
              dependencyPaths: [],
            },
          ],
        },
      }),
      initialLifecycleState: 'active',
      validateRule: realValidateRule,
      executeValidationRule: vi.fn(
        async (_compiledRule, _rule, _field, _scope, signal) =>
          await new Promise((resolve, reject) => {
            releaseValidation = () => {
              if (signal?.aborted) {
                reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
                return;
              }
              resolve(undefined);
            };
          }),
      ) as any,
    });
    const controller = new AbortController();

    const submitPromise = runtime.submit({ signal: controller.signal });
    await Promise.resolve();
    expect(runtime.store.getState().submitAttempted).toBe(true);

    controller.abort();
    releaseValidation?.();

    await expect(submitPromise).resolves.toMatchObject({ ok: false, cancelled: true });
    expect(runtime.store.getState().submitting).toBe(false);
    expect(runtime.getScopeState()).toMatchObject({ validating: false });
  });
});
