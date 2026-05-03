import { describe, expect, it, vi } from 'vitest';
import { createProjectedFormRuntime, createProjectedFormStore } from './projected-form-runtime';

describe('projected form runtime helpers', () => {
  it('projects store values, caches repeated parent state, and prefixes store paths', () => {
    const parentState = {
      values: {
        profile: { name: 'Alice' },
        other: 'value',
      },
      fieldStates: {
        'profile.name': { touched: true },
      },
    } as any;
    const parentStore = {
      getState: vi.fn(() => parentState),
      getFieldState: vi.fn(),
      setFieldState: vi.fn(),
      subscribe: vi.fn(() => () => undefined),
      subscribeToPath: vi.fn(() => () => undefined),
      subscribeToSubmitting: vi.fn(() => () => undefined),
      getPathState: vi.fn(),
    } as any;

    const projectedStore = createProjectedFormStore(parentStore, {
      ownerRootPath: 'profile',
    });
    const firstState = projectedStore.getState();
    const secondState = projectedStore.getState();

    expect(firstState.values).toEqual({ name: 'Alice' });
    expect(secondState).toBe(firstState);

    projectedStore.getFieldState('name');
    projectedStore.setFieldState('name', { touched: true } as any);
    projectedStore.subscribeToPath('name', vi.fn());
    projectedStore.getPathState('name');

    expect(parentStore.getFieldState).toHaveBeenCalledWith('profile.name');
    expect(parentStore.setFieldState).toHaveBeenCalledWith('profile.name', { touched: true });
    expect(parentStore.subscribeToPath).toHaveBeenCalledWith('profile.name', expect.any(Function));
    expect(parentStore.getPathState).toHaveBeenCalledWith('profile.name');

    const customProjectedStore = createProjectedFormStore(parentStore, {
      ownerRootPath: 'profile',
      projectValues(state) {
        return { alias: state.values.profile } as Record<string, unknown>;
      },
    });

    expect(customProjectedStore.getState().values).toEqual({ alias: { name: 'Alice' } });
  });

  it('maps projected runtime operations and honors explicit overrides', () => {
    const registerHandle = { unregister: vi.fn() };
    const parentForm = {
      store: { id: 'parent-store' },
      validation: { id: 'validation' },
      lifecycleState: 'ready',
      modelGeneration: 3,
      scopeId: 'scope-id',
      rootPath: 'root',
      canSubmit: true,
      allTouched: false,
      isPathOwned: vi.fn(() => true),
      getFieldState: vi.fn(),
      validateAt: vi.fn(),
      validateField: vi.fn(),
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
      registerField: vi.fn(() => registerHandle),
      notifyFieldHidden: vi.fn(),
      validateSubtree: vi.fn(),
      appendValue: vi.fn(),
      prependValue: vi.fn(),
      insertValue: vi.fn(),
      removeValue: vi.fn(),
      moveValue: vi.fn(),
      swapValue: vi.fn(),
      replaceValue: vi.fn(),
    } as any;
    const setValue = vi.fn();
    const setValues = vi.fn();

    const projectedForm = createProjectedFormRuntime(parentForm, {
      store: { id: 'projected-store' } as any,
      prefixPath: (path) => (path ? `profile.${path}` : 'profile'),
      mapChildPath: (path) => `child.${path}`,
      supportsArrayMutations: true,
      setValue,
      setValues,
    });

    projectedForm.isPathOwned('name');
    projectedForm.getFieldState('name');
    projectedForm.validateAt('name', 'blur');
    projectedForm.validateField('name', 'change');
    projectedForm.getField('name');
    projectedForm.getDependents('name');
    projectedForm.findByPrefix('name');
    projectedForm.getChildren('name');
    projectedForm.getError('name');
    projectedForm.isValidating('name');
    projectedForm.isTouched('name');
    projectedForm.isDirty('name');
    projectedForm.isVisited('name');
    projectedForm.touchField('name');
    projectedForm.visitField('name');
    projectedForm.clearErrors(undefined);
    projectedForm.notifyFieldHidden('name', true);
    projectedForm.validateSubtree('name', 'submit');
    projectedForm.setValue('name', 'Bob');
    projectedForm.setValues({ name: 'Bob' });
    projectedForm.registerField({
      path: 'filters',
      childPaths: ['left', 'right'],
      getValue() {
        return undefined;
      },
      syncValue() {
        return undefined;
      },
      validateChild() {
        return [];
      },
    });
    projectedForm.appendValue?.('items', { id: 1 });
    projectedForm.removeValue?.('items', 0);

    expect(parentForm.isPathOwned).toHaveBeenCalledWith('profile.name');
    expect(parentForm.getFieldState).toHaveBeenCalledWith('profile.name');
    expect(parentForm.validateAt).toHaveBeenCalledWith('profile.name', 'blur');
    expect(parentForm.validateField).toHaveBeenCalledWith('profile.name', 'change');
    expect(parentForm.getField).toHaveBeenCalledWith('profile.name');
    expect(parentForm.getDependents).toHaveBeenCalledWith('profile.name');
    expect(parentForm.findByPrefix).toHaveBeenCalledWith('profile.name');
    expect(parentForm.getChildren).toHaveBeenCalledWith('profile.name');
    expect(parentForm.getError).toHaveBeenCalledWith('profile.name');
    expect(parentForm.isValidating).toHaveBeenCalledWith('profile.name');
    expect(parentForm.isTouched).toHaveBeenCalledWith('profile.name');
    expect(parentForm.isDirty).toHaveBeenCalledWith('profile.name');
    expect(parentForm.isVisited).toHaveBeenCalledWith('profile.name');
    expect(parentForm.touchField).toHaveBeenCalledWith('profile.name');
    expect(parentForm.visitField).toHaveBeenCalledWith('profile.name');
    expect(parentForm.clearErrors).toHaveBeenCalledWith(undefined);
    expect(parentForm.notifyFieldHidden).toHaveBeenCalledWith('profile.name', true);
    expect(parentForm.validateSubtree).toHaveBeenCalledWith('profile.name', 'submit');
    expect(setValue).toHaveBeenCalledWith('name', 'Bob');
    expect(setValues).toHaveBeenCalledWith({ name: 'Bob' });
    expect(parentForm.registerField).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'profile.filters',
        childPaths: ['child.left', 'child.right'],
      }),
    );
    expect(parentForm.appendValue).toHaveBeenCalledWith('profile.items', { id: 1 });
    expect(parentForm.removeValue).toHaveBeenCalledWith('profile.items', 0);
  });

  it('projects validation metadata into the owner-local subtree', () => {
    const parentValidation = {
      behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
      order: ['profile', 'profile.name', 'profile.age'],
      dependents: {},
      rootPath: 'profile',
      nodes: {
        profile: {
          path: 'profile',
          kind: 'object',
          controlType: 'object-field',
          behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
          rules: [],
          children: ['profile.name', 'profile.age'],
          parent: '',
        },
        'profile.name': {
          path: 'profile.name',
          kind: 'field',
          controlType: 'input-text',
          behavior: { triggers: ['blur'], showErrorOn: ['touched', 'submit'] },
          rules: [{ id: 'profile.name#required', rule: { kind: 'required' }, dependencyPaths: [] }],
          children: [],
          parent: 'profile',
        },
        'profile.age': {
          path: 'profile.age',
          kind: 'field',
          controlType: 'input-number',
          behavior: { triggers: ['change'], showErrorOn: ['dirty'] },
          rules: [],
          children: [],
          parent: 'profile',
        },
      },
    } as any;
    const parentForm = {
      validation: parentValidation,
      lifecycleState: 'active',
      modelGeneration: 1,
      scopeId: 'scope-id',
      rootPath: 'profile',
      canSubmit: true,
      allTouched: false,
      store: { id: 'parent-store' },
      isPathOwned: vi.fn(() => true),
      getFieldState: vi.fn(),
      validateAt: vi.fn(),
      validateField: vi.fn(),
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
      registerField: vi.fn(() => ({ unregister: vi.fn() })),
      notifyFieldHidden: vi.fn(),
      validateSubtree: vi.fn(),
    } as any;

    const projectedForm = createProjectedFormRuntime(parentForm, {
      ownerRootPath: 'profile',
      store: { id: 'projected-store' } as any,
      prefixPath: (path) => (path ? `profile.${path}` : 'profile'),
    });

    expect(projectedForm.rootPath).toBe('');
    expect(projectedForm.validation?.order).toEqual(['', 'name', 'age']);
    expect(projectedForm.validation?.nodes).toMatchObject({
      '': expect.objectContaining({ path: '', children: ['name', 'age'] }),
      name: expect.objectContaining({ path: 'name', parent: '', rules: expect.any(Array) }),
      age: expect.objectContaining({ path: 'age', parent: '' }),
    });
    expect(projectedForm.validation?.nodes?.name?.rules[0]?.id).toBe('profile.name#required');
  });

  it('falls back to parent setValue and setValues when no override is provided', () => {
    const parentForm = {
      store: { id: 'parent-store' },
      validation: { id: 'validation' },
      lifecycleState: 'ready',
      modelGeneration: 0,
      scopeId: 'scope-id',
      rootPath: 'root',
      canSubmit: true,
      allTouched: false,
      isPathOwned: vi.fn(),
      getFieldState: vi.fn(),
      validateAt: vi.fn(),
      validateField: vi.fn(),
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
      registerField: vi.fn(() => ({ unregister: vi.fn() })),
      notifyFieldHidden: vi.fn(),
      validateSubtree: vi.fn(),
    } as any;

    const projectedForm = createProjectedFormRuntime(parentForm, {
      store: { id: 'projected-store' } as any,
      prefixPath: (path) => (path ? `profile.${path}` : 'profile'),
    });

    projectedForm.setValue('name', 'Alice');
    projectedForm.setValues({ firstName: 'Alice', lastName: 'Smith' });

    expect(parentForm.setValue).toHaveBeenCalledWith('profile.name', 'Alice');
    expect(parentForm.setValues).toHaveBeenCalledWith({
      'profile.firstName': 'Alice',
      'profile.lastName': 'Smith',
    });
  });
});
