import { describe, expect, it } from 'vitest';
import type { ScopeRef, ValidationError } from '@nop-chaos/amis-schema';
import { createManagedFormRuntime } from '../form-runtime';

function createStubScope(): ScopeRef {
  return {
    id: 'root',
    path: '',
    parent: undefined as any,
    store: {
      getSnapshot: () => ({}),
      setSnapshot: () => {},
      subscribe: () => () => {}
    },
    value: {},
    update: () => {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    read: () => ({})
  };
}

function err(path: string, message: string, rule: ValidationError['rule'] = 'required'): ValidationError {
  return { path, message, rule };
}

describe('Bug: validateForm() setErrors overwrites errors set by setPathErrors', () => {
  it('should preserve errors set by setPathErrors for paths NOT in validation traversal', async () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: '' },
      parentScope: createStubScope(),
      validation: {
        fields: {
          name: {
            path: 'name',
            controlType: 'input-text',
            rules: [
              {
                id: 'name#0:required',
                rule: { kind: 'required', message: 'Name is required' },
                dependencyPaths: []
              }
            ],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] }
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

    // Pre-set errors for paths outside the validation traversal
    form.store.setPathErrors('field.a', [err('field.a', 'Error A')]);
    form.store.setPathErrors('field.b', [err('field.b', 'Error B')]);

    expect(Object.keys(form.store.getState().errors)).toEqual(['field.a', 'field.b']);

    // Run validateForm — merge should preserve field.a and field.b
    await form.validateForm();

    const finalErrors = form.store.getState().errors;

    // FIXED: all errors coexist
    expect(finalErrors['name']).toBeDefined();
    expect(finalErrors['field.a']).toEqual([err('field.a', 'Error A')]);
    expect(finalErrors['field.b']).toEqual([err('field.b', 'Error B')]);
  });

  it('should preserve errors set by setPathErrors within the validateForm loop (sequential await)', async () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: '' },
      parentScope: createStubScope(),
      validation: {
        fields: {
          name: {
            path: 'name',
            controlType: 'input-text',
            rules: [
              {
                id: 'name#0:required',
                rule: { kind: 'required', message: 'Name is required' },
                dependencyPaths: []
              }
            ],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] }
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

    const result = await form.validateForm();

    expect(result.ok).toBe(false);
    expect(result.fieldErrors['name']).toEqual([err('name', 'Name is required')]);

    // Store errors should match the returned result
    expect(form.store.getState().errors['name']).toEqual([err('name', 'Name is required')]);
  });

  it('should collect errors for registered fields validated during the loop', async () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: '', email: '' },
      parentScope: createStubScope(),
      validation: {
        fields: {
          name: {
            path: 'name',
            controlType: 'input-text',
            rules: [
              {
                id: 'name#0:required',
                rule: { kind: 'required', message: 'Name is required' },
                dependencyPaths: []
              }
            ],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] }
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

    form.registerField({
      path: 'email',
      getValue: () => '',
      validate: async () => [err('email', 'Email is invalid')]
    });

    const result = await form.validateForm();

    expect(result.ok).toBe(false);
    expect(result.fieldErrors['name']).toEqual([err('name', 'Name is required')]);
    expect(result.fieldErrors['email']).toHaveLength(1);
    expect(result.fieldErrors['email'][0].message).toBe('Email is invalid');

    const storeErrors = form.store.getState().errors;
    expect(storeErrors['name']).toEqual([err('name', 'Name is required')]);
    expect(storeErrors['email']).toHaveLength(1);
    expect(storeErrors['email'][0].message).toBe('Email is invalid');
  });

  it('should preserve errors set as side-effect during registered field validate', async () => {
    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: '' },
      parentScope: createStubScope(),
      validation: {
        fields: {
          name: {
            path: 'name',
            controlType: 'input-text',
            rules: [
              {
                id: 'name#0:required',
                rule: { kind: 'required', message: 'Name is required' },
                dependencyPaths: []
              }
            ],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] }
          }
        },
        order: ['name'],
        behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
        dependents: {}
      },
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      submitApi: async () => ({ ok: true, data: {} })
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
      }
    });

    const result = await form.validateForm();

    expect(sideEffectDone).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.fieldErrors['name.confirm']).toEqual([err('name.confirm', 'Confirm does not match')]);
    expect(result.errors).toContainEqual(err('name.confirm', 'Confirm does not match'));

    // FIXED: merge preserves the side-effect error
    const finalErrors = form.store.getState().errors;
    expect(finalErrors['name.confirm']).toEqual([err('name.confirm', 'Confirm does not match')]);
  });

  it('should block submit when validateForm keeps side-effect errors in the store', async () => {
    let submitCount = 0;

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { name: '' },
      parentScope: createStubScope(),
      validation: {
        fields: {
          name: {
            path: 'name',
            controlType: 'input-text',
            rules: [],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] }
          }
        },
        order: ['name'],
        behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
        dependents: {}
      },
      executeValidationRule: async () => undefined,
      validateRule: () => undefined,
      submitApi: async () => {
        submitCount++;
        return { ok: true, data: {} };
      }
    });

    form.registerField({
      path: 'name',
      getValue: () => '',
      validate: async () => {
        form.store.setPathErrors('name.confirm', [err('name.confirm', 'Confirm does not match')]);
        return [];
      }
    });

    const result = await form.submit({ url: '/api/submit', method: 'post' });

    expect(result.ok).toBe(false);
    expect(submitCount).toBe(0);
    expect(form.store.getState().errors['name.confirm']).toEqual([err('name.confirm', 'Confirm does not match')]);
  });

  it('sequential await prevents race condition WITHIN the loop (no parallel setPathErrors)', async () => {
    const callOrder: string[] = [];

    const form = createManagedFormRuntime({
      id: 'test-form',
      initialValues: { a: '', b: '' },
      parentScope: createStubScope(),
      validation: {
        fields: {
          a: {
            path: 'a',
            controlType: 'input-text',
            rules: [
              {
                id: 'a#0:required',
                rule: { kind: 'required', message: 'A required' },
                dependencyPaths: []
              }
            ],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] }
          },
          b: {
            path: 'b',
            controlType: 'input-text',
            rules: [
              {
                id: 'b#0:required',
                rule: { kind: 'required', message: 'B required' },
                dependencyPaths: []
              }
            ],
            behavior: { triggers: ['submit'], showErrorOn: ['submit'] }
          }
        },
        order: ['a', 'b'],
        behavior: { triggers: ['submit'], showErrorOn: ['submit'] },
        dependents: {}
      },
      executeValidationRule: async () => undefined,
      validateRule: (_compiledRule, value, field) => {
        callOrder.push(`validate:${field.path}`);
        return value === '' ? err(field.path, `${field.path} required`) : undefined;
      },
      submitApi: async () => ({ ok: true, data: {} })
    });

    await form.validateForm();

    // Sequential: a is validated before b
    expect(callOrder).toEqual(['validate:a', 'validate:b']);

    // Both errors should be in the final result
    const storeErrors = form.store.getState().errors;
    expect(storeErrors['a']).toEqual([err('a', 'a required')]);
    expect(storeErrors['b']).toEqual([err('b', 'b required')]);
  });
});
