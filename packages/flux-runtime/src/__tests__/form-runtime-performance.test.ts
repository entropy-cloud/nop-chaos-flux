import { describe, expect, it, vi, afterEach } from 'vitest';
import type { ApiObject, ScopeRef, ValidationError } from '@nop-chaos/flux-core';
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
    read: () => ({}),
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
            rule: { kind: 'async' as const, api: { url: '/validate', method: 'post' } },
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
      submitApi: async () => ({ ok: true, data: {} })
    });

    const promise = form.validateField('name');
    expect(form.store.getState().validating.name).toBeUndefined();

    await vi.advanceTimersByTimeAsync(5);
    await promise;

    expect(form.store.getState().validating.name).toBeUndefined();
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
      submitApi: async () => ({ ok: true, data: {} })
    });

    const promise = form.validateField('name');
    await vi.advanceTimersByTimeAsync(19);
    expect(form.store.getState().validating.name).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    expect(form.store.getState().validating.name).toBe(true);

    await vi.advanceTimersByTimeAsync(30);
    await promise;

    expect(form.store.getState().validating.name).toBeUndefined();
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
      submitApi: async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 5);
        });
        return { ok: true, data: { saved: true } };
      }
    });

    const promise = form.submit({ url: '/api/submit', method: 'post' });
    expect(form.store.getState().submitting).toBe(false);

    await vi.advanceTimersByTimeAsync(5);
    await promise;

    expect(form.store.getState().submitting).toBe(false);
  });

  it('shows submitting for long submit after submittingDelay elapses', async () => {
    vi.useFakeTimers();

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: 'Alice' },
      parentScope: createStubScope(),
      submittingDelay: 20,
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      submitApi: async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 50);
        });
        return { ok: true, data: { saved: true } };
      }
    });

    const promise = form.submit({ url: '/api/submit', method: 'post' });

    await vi.advanceTimersByTimeAsync(19);
    expect(form.store.getState().submitting).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(form.store.getState().submitting).toBe(true);

    await vi.advanceTimersByTimeAsync(30);
    await promise;

    expect(form.store.getState().submitting).toBe(false);
  });

  it('still blocks duplicate submit immediately before delayed submitting flag becomes visible', async () => {
    vi.useFakeTimers();

    let resolveApi: (() => void) | undefined;
    let apiCallCount = 0;

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: {},
      parentScope: createStubScope(),
      submittingDelay: 20,
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      submitApi: async () => {
        apiCallCount += 1;
        await new Promise<void>((resolve) => {
          resolveApi = resolve;
        });
        return { ok: true, data: {} };
      }
    });

    const api: ApiObject = { url: '/api/submit', method: 'post' };
    const first = form.submit(api);
    const second = form.submit(api);

    await Promise.resolve();
    expect(apiCallCount).toBe(1);
    expect(form.store.getState().submitting).toBe(false);

    await expect(second).resolves.toMatchObject({
      ok: false,
      cancelled: true,
      error: expect.any(Error)
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
            parent: ''
          },
          'user.name': {
            path: 'user.name',
            kind: 'field',
            controlType: 'input-text',
            rules: [
              {
                id: 'user.name#0:required',
                rule: { kind: 'required', message: 'Required' },
                dependencyPaths: ['user.email']
              }
            ],
            behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
            children: [],
            parent: 'user'
          },
          'user.email': {
            path: 'user.email',
            kind: 'field',
            controlType: 'input-text',
            rules: [],
            behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
            children: [],
            parent: 'user'
          }
        },
        order: ['user.name', 'user.email'],
        behavior: { triggers: ['blur'], showErrorOn: ['submit'] },
        dependents: {
          'user.email': ['user.name']
        }
      },
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      submitApi: async () => ({ ok: true, data: {} })
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
      submitApi: async () => ({ ok: true, data: {} })
    });

    form.store.setPathErrors('name', [err('name', 'Required')]);
    form.setValue('name', 'Alice');

    const state = form.store.getState();
    expect(state.values.name).toBe('Alice');
    expect(state.errors.name).toBeUndefined();
    expect(state.dirty.name).toBe(true);
    expect(state.validating.name).toBeUndefined();
  });

  it('keeps array mutation state consistent after removeValue remaps nested paths', () => {
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
      validateRule: () => undefined,
      submitApi: async () => ({ ok: true, data: {} })
    });

    form.store.setPathErrors('list.1.name', [err('list.1.name', 'Bad')]);
    form.store.setTouched('list.1.name', true);
    form.store.setDirty('list.1.name', true);
    form.store.setVisited('list.1.name', true);
    form.store.setValidating('list.1.name', true);

    form.removeValue('list', 0);

    const state = form.store.getState();
    expect(state.values.list).toEqual([{ name: 'B' }]);
    expect(state.errors['list.0.name']?.[0]?.path).toBe('list.0.name');
    expect(state.touched['list.0.name']).toBe(true);
    expect(state.dirty['list.0.name']).toBe(true);
    expect(state.visited['list.0.name']).toBe(true);
    expect(state.validating['list.0.name']).toBe(true);
  });

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
      validateRule: () => undefined,
      submitApi: async () => ({ ok: true, data: {} })
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
      validateRule: () => undefined,
      submitApi: async () => ({ ok: true, data: {} })
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
      validateRule: () => undefined,
      submitApi: async () => ({ ok: true, data: {} })
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
    expect(form.store.getState().errors.name?.[0]?.message).toBe('Remote invalid');
    expect(form.store.getState().validating.name).toBeUndefined();
    expect(commits).toBeLessThanOrEqual(2);
  });

  it('keeps runtime-registration-only validation write bounded to one commit', async () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { email: '' },
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      submitApi: async () => ({ ok: true, data: {} })
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
    expect(form.store.getState().errors.email?.[0]?.message).toBe('Invalid email');
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
      validateRule: () => undefined,
      submitApi: async () => ({ ok: true, data: {} })
    });

    let commits = 0;
    const unsubscribe = form.store.subscribe(() => {
      commits += 1;
    });

    const result = await form.submit();
    unsubscribe();

    expect(result.ok).toBe(true);
    expect(form.store.getState().touched.name).toBe(true);
    expect(form.store.getState().touched.email).toBe(true);
    expect(commits).toBeLessThanOrEqual(4);
  });

  it('does not emit a second commit when setting semantically equal path errors', () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: {},
      parentScope: createStubScope(),
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      submitApi: async () => ({ ok: true, data: {} })
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
      },
      submitApi: async () => ({ ok: true, data: {} })
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
      submitApi: async () => ({ ok: true, data: {} })
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
    expect(state.errors.name).toBeUndefined();
    expect(state.validating.name).toBeUndefined();
    expect(state.dirty.name).toBe(true);
    expect(state.dirty.role).toBe(true);
    expect(commits).toBeLessThanOrEqual(1);
  });
});
