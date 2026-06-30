import { describe, expect, it, vi } from 'vitest';
import { createProjectedFormRuntime, createProjectedFormStore } from './projected-form-runtime.js';

function createParentStore(fieldStates: Record<string, any>) {
  const state = {
    values: { profile: { name: 'Alice' }, sibling: { other: 'Bob' } },
    fieldStates,
  };
  return {
    getState: vi.fn(() => state),
    getFieldState: vi.fn(),
    setFieldState: vi.fn(),
    subscribe: vi.fn(() => () => undefined),
    subscribeToPath: vi.fn(() => () => undefined),
    subscribeToSubmitting: vi.fn(() => () => undefined),
    getPathState: vi.fn(),
  } as any;
}

function createParentFormMock(store: any) {
  return {
    store,
    validation: { id: 'validation' },
    lifecycleState: 'active',
    modelGeneration: 1,
    scopeId: 'scope-id',
    rootPath: 'profile',
    canSubmit: true,
    allTouched: false,
    isPathOwned: vi.fn(() => true),
    getFieldState: vi.fn(),
    validateAt: vi.fn(),
    validateField: vi.fn(),
    validateAll: vi.fn(),
    validateForm: vi.fn(),
    validateSubtree: vi.fn(),
    getField: vi.fn(),
    getDependents: vi.fn(),
    findByPrefix: vi.fn(),
    getChildren: vi.fn(),
    getError: vi.fn(),
    isValidating: vi.fn(),
    isTouched: vi.fn(),
    isDirty: vi.fn(),
    isVisited: vi.fn(),
    touchField: vi.fn(),
    visitField: vi.fn(),
    clearErrors: vi.fn(),
    setValue: vi.fn(),
    setValues: vi.fn(),
    registerField: vi.fn(),
    notifyFieldHidden: vi.fn(),
    applyChangesAndRevalidate: vi.fn(),
    applyExternalErrors: vi.fn(),
  } as any;
}

describe('projected form runtime — P0-5 options forwarding + scope-local clearErrors', () => {
  it('forwards the validate options (signal) to the parent for validateAt/validateField/validateSubtree', async () => {
    const store = createParentStore({});
    const parentForm = createParentFormMock(store);
    const projected = createProjectedFormRuntime(parentForm, {
      store,
      ownerRootPath: 'profile',
      prefixPath: (p) => (p ? `profile.${p}` : 'profile'),
    });

    const controller = new AbortController();
    const options = { signal: controller.signal };
    await projected.validateAt('name', 'change', options);
    await projected.validateField('name', 'change', options);
    await projected.validateSubtree('name', 'change', options);
    await projected.validateAll('change', options);

    expect(parentForm.validateAt).toHaveBeenCalledWith('profile.name', 'change', options);
    expect(parentForm.validateField).toHaveBeenCalledWith('profile.name', 'change', options);
    expect(parentForm.validateSubtree).toHaveBeenCalledWith('profile.name', 'change', options);
    // validateAll routes through validateSubtree on the owner root path.
    expect(parentForm.validateSubtree).toHaveBeenCalledWith('profile', 'change', options);
  });

  it('clearErrors(undefined) only clears the projected subtree and preserves sibling field errors (P0-5)', () => {
    // Parent has an error inside the projected subtree (profile.name) AND a sibling
    // error outside it (sibling.other). The projected store only exposes profile.* fields.
    const store = createParentStore({
      'profile.name': { errors: [{ message: 'required' }] },
      'sibling.other': { errors: [{ message: 'invalid' }] },
    });
    const projectedStore = createProjectedFormStore(store, { ownerRootPath: 'profile' });
    const parentForm = createParentFormMock(store);
    const projected = createProjectedFormRuntime(parentForm, {
      store: projectedStore,
      ownerRootPath: 'profile',
      prefixPath: (p) => (p ? `profile.${p}` : 'profile'),
    });

    projected.clearErrors(undefined);

    // The projected error path is cleared on the parent...
    expect(parentForm.clearErrors).toHaveBeenCalledWith('profile.name');
    // ...but a whole-form clear is never issued, so sibling.other is preserved.
    expect(parentForm.clearErrors).not.toHaveBeenCalledWith(undefined);
    expect(parentForm.clearErrors).not.toHaveBeenCalledWith('sibling.other');
  });

  it('clearErrors(path) still prefixes the explicit path', () => {
    const store = createParentStore({});
    const parentForm = createParentFormMock(store);
    const projected = createProjectedFormRuntime(parentForm, {
      store,
      ownerRootPath: 'profile',
      prefixPath: (p) => (p ? `profile.${p}` : 'profile'),
    });

    projected.clearErrors('name');
    expect(parentForm.clearErrors).toHaveBeenCalledWith('profile.name');
    expect(parentForm.clearErrors).toHaveBeenCalledTimes(1);
  });
});
