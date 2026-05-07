import { describe, expect, it, vi, afterEach } from 'vitest';
import type { ScopeRef, ValidationError } from '@nop-chaos/flux-core';
import { createManagedFormRuntime } from '../form-runtime.js';

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
            rule: {
              kind: 'async' as const,
              action: { action: 'ajax', args: { url: '/validate', method: 'post' } },
            },
            dependencyPaths: [],
          },
        ],
        behavior: { triggers: ['blur' as const], showErrorOn: ['submit' as const] },
        children: [],
        parent: '',
      },
    },
    order: ['name'],
    behavior: { triggers: ['blur' as const], showErrorOn: ['submit' as const] },
    dependents: {},
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('FormRuntime performance-oriented behavior', () => {
  it('does not show validating for short async validation when validatingDelay is longer', async () => {
    vi.useFakeTimers();

    let resolveRule: (() => void) | undefined;

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: 'a' },
      parentScope: createStubScope(),
      validation: createAsyncValidationModel(),
      validatingDelay: 20,
      executeValidationRule: async () => {
        await new Promise<void>((resolve) => {
          resolveRule = resolve;
          setTimeout(resolve, 5);
        });
        return undefined;
      },
      validateRule: () => undefined,
    });

    const promise = form.validateField('name');
    expect(form.store.getState().fieldStates.name?.validating).toBeUndefined();

    await vi.advanceTimersByTimeAsync(5);
    await promise;

    expect(form.store.getState().fieldStates.name?.validating).toBeUndefined();
    resolveRule?.();
  });

  it('shows validating for long async validation after validatingDelay elapses', async () => {
    vi.useFakeTimers();

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: 'a' },
      parentScope: createStubScope(),
      validation: createAsyncValidationModel(),
      validatingDelay: 20,
      executeValidationRule: async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 50);
        });
        return undefined;
      },
      validateRule: () => undefined,
    });

    const promise = form.validateField('name');
    await vi.advanceTimersByTimeAsync(19);
    expect(form.store.getState().fieldStates.name?.validating).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(form.store.getState().fieldStates.name?.validating).toBe(true);

    await vi.advanceTimersByTimeAsync(30);
    await promise;

    expect(form.store.getState().fieldStates.name?.validating).toBeUndefined();
  });

  it('does not show submitting for short submit when submittingDelay is longer', async () => {
    vi.useFakeTimers();

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: 'Alice' },
      parentScope: createStubScope(),
      submittingDelay: 20,
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    const promise = form.submit();
    expect(form.store.getState().submitting).toBe(false);

    await vi.advanceTimersByTimeAsync(5);
    await promise;

    expect(form.store.getState().submitting).toBe(false);
  });

  it('shows submitting for long submit after submittingDelay elapses', async () => {
    vi.useFakeTimers();

    let resolveApi: (() => void) | undefined;

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: 'Alice' },
      parentScope: createStubScope(),
      submittingDelay: 20,
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      lifecycle: {
        submitAction: async () => {
          await new Promise<void>((resolve) => {
            resolveApi = resolve;
          });
          return { ok: true, data: {} };
        },
      },
    });

    const promise = form.submit();

    await vi.advanceTimersByTimeAsync(19);
    expect(form.store.getState().submitting).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(form.store.getState().submitting).toBe(true);

    resolveApi?.();
    await vi.advanceTimersByTimeAsync(30);
    await promise;

    expect(form.store.getState().submitting).toBe(false);
  });

  it('still blocks duplicate submit immediately before delayed submitting flag becomes visible', async () => {
    vi.useFakeTimers();

    let resolveApi: (() => void) | undefined;

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: {},
      parentScope: createStubScope(),
      submittingDelay: 20,
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      lifecycle: {
        submitAction: async () => {
          await new Promise<void>((resolve) => {
            resolveApi = resolve;
          });
          return { ok: true, data: {} };
        },
      },
    });

    const first = form.submit();
    const second = form.submit();

    await Promise.resolve();
    expect(form.store.getState().submitting).toBe(false);

    await expect(second).resolves.toMatchObject({
      ok: false,
      cancelled: true,
      error: expect.any(Error),
    });

    resolveApi?.();
    await expect(first).resolves.toMatchObject({ ok: true, data: {} });
  });

  it('exposes lightweight field query facade from compiled validation model', () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { user: { name: '', email: '' } },
      parentScope: createStubScope(),
      validation: {
        nodes: {
          user: {
            path: 'user',
            kind: 'object',
            rules: [],
            behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
            children: ['user.name', 'user.email'],
            parent: '',
          },
          'user.name': {
            path: 'user.name',
            kind: 'field',
            controlType: 'input-text',
            rules: [
              {
                id: 'user.name#0:required',
                rule: { kind: 'required', message: 'Required' },
                dependencyPaths: ['user.email'],
              },
            ],
            behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
            children: [],
            parent: 'user',
          },
          'user.email': {
            path: 'user.email',
            kind: 'field',
            controlType: 'input-text',
            rules: [],
            behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
            children: [],
            parent: 'user',
          },
        },
        order: ['user.name', 'user.email'],
        behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
        dependents: {
          'user.email': ['user.name'],
        },
      },
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    expect(form.getField('user.name')?.path).toBe('user.name');
    expect(form.getDependents('user.email')).toEqual(['user.name']);
    expect(form.findByPrefix('user')).toEqual(['user.name', 'user.email']);
    expect(form.getChildren('user')).toEqual(['user.name', 'user.email']);
  });

  it('preserves correct store state when setValue clears error and recomputes dirty in one update', () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: '' },
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    form.store.setPathErrors('name', [err('name', 'Required')]);
    form.setValue('name', 'Alice');

    const state = form.store.getState();
    expect(state.values.name).toBe('Alice');
    expect(state.fieldStates.name?.errors).toBeUndefined();
    expect(state.fieldStates.name?.dirty).toBe(true);
    expect(state.fieldStates.name?.validating).toBeUndefined();
  });

  it('keeps array mutation state consistent after removeValue remaps nested paths', () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: {
        list: [{ name: 'A' }, { name: 'B' }],
      },
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    form.store.setPathErrors('list.1.name', [err('list.1.name', 'Bad')]);
    form.store.setTouched('list.1.name', true);
    form.store.setDirty('list.1.name', true);
    form.store.setVisited('list.1.name', true);
    form.store.setValidating('list.1.name', true);

    form.removeValue('list', 0);

    const state = form.store.getState();
    expect(state.values.list).toEqual([{ name: 'B' }]);
    expect(state.fieldStates['list.0.name']?.errors?.[0]?.path).toBe('list.0.name');
    expect(state.fieldStates['list.0.name']?.touched).toBe(true);
    expect(state.fieldStates['list.0.name']?.dirty).toBe(true);
    expect(state.fieldStates['list.0.name']?.visited).toBe(true);
    expect(state.fieldStates['list.0.name']?.validating).toBe(true);
  });

  it('coalesces array removeValue state migration into a bounded number of commits', () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: {
        list: [{ name: 'A' }, { name: 'B' }],
      },
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
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
            parent: '',
          },
        },
        order: ['name'],
        behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
        dependents: {},
      },
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
    });

    form.registerField({
      path: 'name',
      getValue: () => 'after',
      syncValue: () => 'after',
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
      validateRule: () => undefined,
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
      validateRule: () => undefined,
    });

    form.registerField({
      path: 'email',
      getValue: () => '',
      validate: async () => [err('email', 'Invalid email')],
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
});
