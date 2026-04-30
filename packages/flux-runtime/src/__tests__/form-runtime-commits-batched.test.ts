import { describe, expect, it } from 'vitest';
import type { ScopeRef, ValidationError } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime';

function createStubScope(): ScopeRef {
  return {
    id: 'root',
    path: '',
    parent: undefined as any,
    store: {
      getSnapshot: () => ({}),
      getLastChange: () => ({ paths: ['*'], sourceScopeId: 'root', kind: 'replace' as const }),
      setSnapshot: () => {},
      subscribe: () => () => {},
    },
    value: {},
    update: () => {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    merge: () => {},
  };
}

function err(
  path: string,
  message: string,
  rule: ValidationError['rule'] = 'required',
): ValidationError {
  return { path, message, rule };
}

describe('FormRuntime performance-oriented behavior', () => {
  it('marks submit-touched fields in a bounded number of commits before validateForm', async () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: '', email: '' },
      parentScope: createStubScope(),
      validation: {
        nodes: {
          name: {
            path: 'name',
            kind: 'field',
            controlType: 'input-text',
            rules: [],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
            children: [],
            parent: '',
          },
          email: {
            path: 'email',
            kind: 'field',
            controlType: 'input-text',
            rules: [],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
            children: [],
            parent: '',
          },
        },
        order: ['name', 'email'],
        behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
        dependents: {},
      },
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    const result = await form.submit();
    unsubscribe();

    expect(result.ok).toBe(true);
    expect(form.store.getState().fieldStates.name?.touched).toBe(true);
    expect(form.store.getState().fieldStates.email?.touched).toBe(true);
    expect(commits).toBeLessThanOrEqual(4);
  });

  it('does not emit a second commit when setting semantically equal path errors', () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: {},
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    form.store.setPathErrors('name', [err('name', 'Required')]);
    form.store.setPathErrors('name', [err('name', 'Required')]);
    unsubscribe();

    expect(commits).toBe(1);
  });

  it('does not emit a second form-level error commit when validateForm result is unchanged', async () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: '' },
      parentScope: createStubScope(),
      validation: {
        nodes: {
          name: {
            path: 'name',
            kind: 'field',
            controlType: 'input-text',
            rules: [
              {
                id: 'name#0:required',
                rule: { kind: 'required', message: 'Name is required' },
                dependencyPaths: [],
              },
            ],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
            children: [],
            parent: '',
          },
        },
        order: ['name'],
        behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
        dependents: {},
      },
      executeValidationRule: async () => undefined,
      validateRule: (_compiledRule, value) => {
        if (value === '') {
          return err('name', 'Name is required');
        }

        return undefined;
      },
    });

    await form.validateForm();

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    await form.validateForm();
    unsubscribe();

    expect(commits).toBeLessThanOrEqual(1);
  });

  it('applies setValues with setValue-equivalent form state updates in one batch', () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: '', role: 'viewer' },
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    form.store.setPathErrors('name', [err('name', 'Required')]);
    form.store.setValidating('name', true);

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    form.setValues({
      name: 'Alice',
      role: 'admin',
    });

    unsubscribe();

    const state = form.store.getState();
    expect(state.values).toMatchObject({ name: 'Alice', role: 'admin' });
    expect(state.fieldStates.name?.errors).toBeUndefined();
    expect(state.fieldStates.name?.validating).toBeUndefined();
    expect(state.fieldStates.name?.dirty).toBe(true);
    expect(state.fieldStates.role?.dirty).toBe(true);
    expect(commits).toBeLessThanOrEqual(1);
  });
});
