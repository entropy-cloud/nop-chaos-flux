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

describe('Bug: validateForm() setErrors overwrites errors set by setPathErrors', () => {
  it('should preserve errors set by setPathErrors for paths NOT in validation traversal', async () => {
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

    // Pre-set errors for paths outside the validation traversal
    form.store.setPathErrors('field.a', [err('field.a', 'Error A')]);
    form.store.setPathErrors('field.b', [err('field.b', 'Error B')]);

    const fieldStates = form.store.getState().fieldStates;
    expect(Object.keys(fieldStates).filter((k) => fieldStates[k]?.errors)).toEqual([
      'field.a',
      'field.b',
    ]);

    // Run validateForm â€” merge should preserve field.a and field.b
    await form.validateForm();

    const finalFieldStates = form.store.getState().fieldStates;

    // FIXED: all errors coexist
    expect(finalFieldStates['name']?.errors).toBeDefined();
    expect(finalFieldStates['field.a']?.errors).toEqual([err('field.a', 'Error A')]);
    expect(finalFieldStates['field.b']?.errors).toEqual([err('field.b', 'Error B')]);
  });

  it('should preserve errors set by setPathErrors within the validateForm loop (sequential await)', async () => {
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

    const result = await form.validateForm();

    expect(result.ok).toBe(false);
    expect(result.fieldErrors['name']).toEqual([err('name', 'Name is required')]);

    // Store errors should match the returned result
    expect(form.store.getState().fieldStates['name']?.errors).toEqual([
      err('name', 'Name is required'),
    ]);
  });

  it('should collect errors for registered fields validated during the loop', async () => {
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

    form.registerField({
      path: 'email',
      getValue: () => '',
      validate: async () => [err('email', 'Email is invalid')],
    });

    const result = await form.validateForm();

    expect(result.ok).toBe(false);
    expect(result.fieldErrors['name']).toEqual([err('name', 'Name is required')]);
    expect(result.fieldErrors['email']).toHaveLength(1);
    expect(result.fieldErrors['email'][0].message).toBe('Email is invalid');

    const storeFieldStates = form.store.getState().fieldStates;
    expect(storeFieldStates['name']?.errors).toEqual([err('name', 'Name is required')]);
    expect(storeFieldStates['email']?.errors).toHaveLength(1);
    expect(storeFieldStates['email']?.errors?.[0].message).toBe('Email is invalid');
  });

  it('should preserve errors set as side-effect during registered field validate', async () => {
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
            rules: [],
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
      validateRule: () => undefined,
    });

    // Override the compiled field's validateRule to make it pass (return no error)
    // but during the registered field's validate(), set errors for a dependent path
    let sideEffectDone = false;

    form.registerField({
      path: 'name',
      getValue: () => '',
      validate: async () => {
        // Side effect: set errors for a dependent field during validation
        form.store.setPathErrors('name.confirm', [err('name.confirm', 'Confirm does not match')]);
        sideEffectDone = true;
        return [];
      },
    });

    const result = await form.validateForm();

    expect(sideEffectDone).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.fieldErrors['name.confirm']).toEqual([
      err('name.confirm', 'Confirm does not match'),
    ]);
    expect(result.errors).toContainEqual(err('name.confirm', 'Confirm does not match'));

    // FIXED: merge preserves the side-effect error
    const finalFieldStates = form.store.getState().fieldStates;
    expect(finalFieldStates['name.confirm']?.errors).toEqual([
      err('name.confirm', 'Confirm does not match'),
    ]);
  });

  it('should block submit when validateForm keeps side-effect errors in the store', async () => {
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
            rules: [],
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
      validateRule: () => undefined,
    });

    form.registerField({
      path: 'name',
      getValue: () => '',
      validate: async () => {
        form.store.setPathErrors('name.confirm', [err('name.confirm', 'Confirm does not match')]);
        return [];
      },
    });

    const result = await form.submit();

    expect(result.ok).toBe(false);
    expect(form.store.getState().fieldStates['name.confirm']?.errors).toEqual([
      err('name.confirm', 'Confirm does not match'),
    ]);
  });

  it('sequential await prevents race condition WITHIN the loop (no parallel setPathErrors)', async () => {
    const callOrder: string[] = [];

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { a: '', b: '' },
      parentScope: createStubScope(),
      validation: {
        nodes: {
          a: {
            path: 'a',
            kind: 'field',
            controlType: 'input-text',
            rules: [
              {
                id: 'a#0:required',
                rule: { kind: 'required', message: 'A required' },
                dependencyPaths: [],
              },
            ],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
            children: [],
            parent: '',
          },
          b: {
            path: 'b',
            kind: 'field',
            controlType: 'input-text',
            rules: [
              {
                id: 'b#0:required',
                rule: { kind: 'required', message: 'B required' },
                dependencyPaths: [],
              },
            ],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
            children: [],
            parent: '',
          },
        },
        order: ['a', 'b'],
        behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
        dependents: {},
      },
      executeValidationRule: async () => undefined,
      validateRule: (_compiledRule, value, field) => {
        callOrder.push(`validate:${field.path}`);
        return value === '' ? err(field.path, `${field.path} required`) : undefined;
      },
    });

    await form.validateForm();

    // Sequential: a is validated before b
    expect(callOrder).toEqual(['validate:a', 'validate:b']);

    // Both errors should be in the final result
    const storeFieldStates = form.store.getState().fieldStates;
    expect(storeFieldStates['a']?.errors).toEqual([err('a', 'a required')]);
    expect(storeFieldStates['b']?.errors).toEqual([err('b', 'b required')]);
  });

  it('clears stale errors for fields that become valid after validateForm', async () => {
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
    expect(form.store.getState().fieldStates['name']?.errors).toEqual([
      err('name', 'Name is required'),
    ]);

    form.setValue('name', 'Alice');
    const result = await form.validateForm();

    expect(result.ok).toBe(true);
    expect(result.fieldErrors['name']).toBeUndefined();
    expect(form.store.getState().fieldStates['name']?.errors).toBeUndefined();
  });
});
