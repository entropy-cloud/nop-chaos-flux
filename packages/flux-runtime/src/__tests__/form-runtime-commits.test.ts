import { describe, expect, it, vi, afterEach } from 'vitest';
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
      subscribe: () => () => {}
    },
    value: {},
    update: () => {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    merge: () => {}
  };
}

function err(path: string, message: string, rule: ValidationError['rule'] = 'required'): ValidationError {
  return { path, message, rule };
}

function createAsyncValidationModel() {
  return {
    nodes: {
      name: {
        path: 'name',
        kind: 'field' as const,
        controlType: 'input-text',
        rules: [
          {
            id: 'name#0:async',
            rule: { kind: 'async' as const, action: { action: 'ajax', args: { url: '/validate', method: 'post' } } },
            dependencyPaths: []
          }
        ],
        behavior: { triggers: ['blur' as const], showErrorOn: ['submit' as const] },
        children: [],
        parent: ''
      }
    },
    order: ['name'],
    behavior: { triggers: ['blur' as const], showErrorOn: ['submit' as const] },
    dependents: {}
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('FormRuntime performance-oriented behavior', () => {
  it('coalesces array removeValue state migration into a bounded number of commits', () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: {
        list: [
          { name: 'A' },
          { name: 'B' }
        ]
      },
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined
    });

    form.store.setPathErrors('list.1.name', [err('list.1.name', 'Bad')]);
    form.store.setTouched('list.1.name', true);
    form.store.setDirty('list.1.name', true);
    form.store.setVisited('list.1.name', true);
    form.store.setValidating('list.1.name', true);

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    form.removeValue('list', 0);
    unsubscribe();

    expect(commits).toBeLessThanOrEqual(2);
  });

  it('coalesces runtime registration sync write during validateField', async () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: 'before' },
      parentScope: createStubScope(),
      validation: {
        nodes: {
          name: {
            path: 'name',
            kind: 'field',
            controlType: 'input-text',
            rules: [],
            behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
            children: [],
            parent: ''
          }
        },
        order: ['name'],
        behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
        dependents: {}
      },
      executeValidationRule: async () => undefined,
      validateRule: () => undefined
    });

    form.registerField({
      path: 'name',
      getValue: () => 'after',
      syncValue: () => 'after'
    });

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    await form.validateField('name');
    unsubscribe();

    expect(form.store.getState().values.name).toBe('after');
    expect(commits).toBeLessThanOrEqual(2);
  });

  it('coalesces async validateField completion into a bounded number of commits', async () => {
    vi.useFakeTimers();

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: 'Alice' },
      parentScope: createStubScope(),
      validation: createAsyncValidationModel(),
      executeValidationRule: async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 10);
        });
        return err('name', 'Remote invalid', 'async');
      },
      validateRule: () => undefined
    });

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    const promise = form.validateField('name');
    await vi.advanceTimersByTimeAsync(10);
    const result = await promise;
    unsubscribe();

    expect(result.ok).toBe(false);
    expect(form.store.getState().fieldStates.name?.errors?.[0]?.message).toBe('Remote invalid');
    expect(form.store.getState().fieldStates.name?.validating).toBeUndefined();
    expect(commits).toBeLessThanOrEqual(2);
  });

  it('keeps runtime-registration-only validation write bounded to one commit', async () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { email: '' },
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined
    });

    form.registerField({
      path: 'email',
      getValue: () => '',
      validate: async () => [err('email', 'Invalid email')]
    });

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    const result = await form.validateField('email');
    unsubscribe();

    expect(result.ok).toBe(false);
    expect(form.store.getState().fieldStates.email?.errors?.[0]?.message).toBe('Invalid email');
    expect(commits).toBeLessThanOrEqual(1);
  });

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
            parent: ''
          },
          email: {
            path: 'email',
            kind: 'field',
            controlType: 'input-text',
            rules: [],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
            children: [],
            parent: ''
          }
        },
        order: ['name', 'email'],
        behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
        dependents: {}
      },
      executeValidationRule: async () => undefined,
      validateRule: () => undefined
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
      validateRule: () => undefined
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
                dependencyPaths: []
              }
            ],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
            children: [],
            parent: ''
          }
        },
        order: ['name'],
        behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
        dependents: {}
      },
      executeValidationRule: async () => undefined,
      validateRule: (_compiledRule, value) => {
        if (value === '') {
          return err('name', 'Name is required');
        }

        return undefined;
      }
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
      validateRule: () => undefined
    });

    form.store.setPathErrors('name', [err('name', 'Required')]);
    form.store.setValidating('name', true);

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    form.setValues({
      name: 'Alice',
      role: 'admin'
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
