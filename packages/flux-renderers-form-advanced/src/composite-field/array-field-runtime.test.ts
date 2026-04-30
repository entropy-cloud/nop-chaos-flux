import { describe, expect, it, vi } from 'vitest';
import { createItemScope, createItemFormProxy } from './array-field-runtime';
import type {
  FieldRegistrationHandle,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  RuntimeFieldRegistration,
  ScopeRef,
  ValidationResult,
  FormValidationResult,
} from '@nop-chaos/flux-core';

function createMockScope(data: Record<string, unknown>): ScopeRef {
  const getAtPath = (path: string): unknown => {
    if (!path) return data;
    const keys = path.split('.');
    let current: unknown = data;
    for (const key of keys) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    return current;
  };

  return {
    id: 'test-scope',
    path: '',
    parent: undefined,
    store: undefined,
    get value() {
      return data;
    },
    get(path: string) {
      return getAtPath(path);
    },
    has(path: string) {
      if (!path) return true;
      return getAtPath(path) !== undefined;
    },
    readOwn() {
      return data;
    },
    readVisible() {
      return data;
    },
    materializeVisible() {
      return data;
    },
    update: vi.fn(),
    merge: vi.fn(),
    replace: vi.fn(),
  };
}

describe('createItemScope (scalar)', () => {
  it('creates scope with correct id and path', () => {
    const parent = createMockScope({ items: ['a', 'b'] });
    const scope = createItemScope(parent, 'items', 0, 'scalar', false, 'id-0');
    expect(scope.id).toContain('arr:items');
    expect(scope.id).toContain('id-0');
  });

  it('returns value via get("value")', () => {
    const parent = createMockScope({ items: ['alpha', 'beta'] });
    const scope = createItemScope(parent, 'items', 0, 'scalar', false, 'id-0');
    expect(scope.get('value')).toBe('alpha');
  });

  it('returns index via get("index")', () => {
    const parent = createMockScope({ items: ['a', 'b'] });
    const scope = createItemScope(parent, 'items', 1, 'scalar', false, 'id-1');
    expect(scope.get('index')).toBe(1);
  });

  it('returns readOnly via get("readOnly")', () => {
    const parent = createMockScope({ items: ['a'] });
    const scope = createItemScope(parent, 'items', 0, 'scalar', true, 'id-0');
    expect(scope.get('readOnly')).toBe(true);
  });

  it('has returns true for known paths', () => {
    const parent = createMockScope({ items: ['a'] });
    const scope = createItemScope(parent, 'items', 0, 'scalar', false, 'id-0');
    expect(scope.has('')).toBe(true);
    expect(scope.has('value')).toBe(true);
    expect(scope.has('index')).toBe(true);
    expect(scope.has('readOnly')).toBe(true);
  });

  it('update with empty path delegates to parent update', () => {
    const parent = createMockScope({ items: ['a'] });
    const scope = createItemScope(parent, 'items', 0, 'scalar', false, 'id-0');
    scope.update('', 'new-value');
    expect(parent.update).toHaveBeenCalledWith('items.0', 'new-value');
  });

  it('update with "value" delegates to parent update', () => {
    const parent = createMockScope({ items: ['a'] });
    const scope = createItemScope(parent, 'items', 0, 'scalar', false, 'id-0');
    scope.update('value', 'new-value');
    expect(parent.update).toHaveBeenCalledWith('items.0', 'new-value');
  });

  it('update with nested path delegates correctly', () => {
    const parent = createMockScope({ items: ['a'] });
    const scope = createItemScope(parent, 'items', 0, 'scalar', false, 'id-0');
    scope.update('sub.path', 'val');
    expect(parent.update).toHaveBeenCalledWith('items.0.sub.path', 'val');
  });
});

describe('createItemScope (object)', () => {
  it('returns value via get("value")', () => {
    const parent = createMockScope({ contacts: [{ name: 'Alice' }, { name: 'Bob' }] });
    const scope = createItemScope(parent, 'contacts', 0, 'object', false, 'id-0');
    expect(scope.get('value')).toEqual({ name: 'Alice' });
  });

  it('returns index via get("index")', () => {
    const parent = createMockScope({ contacts: [{ name: 'Alice' }] });
    const scope = createItemScope(parent, 'contacts', 0, 'object', false, 'id-0');
    expect(scope.get('index')).toBe(0);
  });

  it('returns readOnly via get("readOnly")', () => {
    const parent = createMockScope({ contacts: [{ name: 'Alice' }] });
    const scope = createItemScope(parent, 'contacts', 0, 'object', true, 'id-0');
    expect(scope.get('readOnly')).toBe(true);
  });

  it('returns nested value via get with path', () => {
    const parent = createMockScope({ contacts: [{ name: 'Alice' }] });
    const scope = createItemScope(parent, 'contacts', 0, 'object', false, 'id-0');
    expect(scope.get('name')).toBe('Alice');
  });

  it('has returns true for known paths', () => {
    const parent = createMockScope({ contacts: [{ name: 'Alice' }] });
    const scope = createItemScope(parent, 'contacts', 0, 'object', false, 'id-0');
    expect(scope.has('')).toBe(true);
    expect(scope.has('value')).toBe(true);
    expect(scope.has('index')).toBe(true);
    expect(scope.has('readOnly')).toBe(true);
  });

  it('update with empty path delegates to parent update', () => {
    const parent = createMockScope({ contacts: [{ name: 'Alice' }] });
    const scope = createItemScope(parent, 'contacts', 0, 'object', false, 'id-0');
    scope.update('', { name: 'Bob' });
    expect(parent.update).toHaveBeenCalledWith('contacts.0', { name: 'Bob' });
  });

  it('update with nested path delegates correctly', () => {
    const parent = createMockScope({ contacts: [{ name: 'Alice' }] });
    const scope = createItemScope(parent, 'contacts', 0, 'object', false, 'id-0');
    scope.update('name', 'Bob');
    expect(parent.update).toHaveBeenCalledWith('contacts.0.name', 'Bob');
  });

  it('delegates merge to parent', () => {
    const parent = createMockScope({ contacts: [{ name: 'Alice' }] });
    const scope = createItemScope(parent, 'contacts', 0, 'object', false, 'id-0');
    scope.merge({ name: 'Bob' });
    expect(parent.merge).toHaveBeenCalledWith({ name: 'Bob' });
  });

  it('delegates replace to parent', () => {
    const parent = createMockScope({ contacts: [{ name: 'Alice' }] });
    const scope = createItemScope(parent, 'contacts', 0, 'object', false, 'id-0');
    scope.replace!({ name: 'Bob' });
    expect(parent.replace).toHaveBeenCalledWith({ name: 'Bob' });
  });
});

describe('createItemFormProxy', () => {
  function createMinimalFormStore(): FormStoreApi {
    const state: FormStoreState = {
      values: { tags: ['alpha', 'beta'] },
      fieldStates: {},
      submitting: false,
      submitAttempted: false,
    };

    return {
      getState: () => state,
      getFieldState: vi.fn(),
      setFieldState: vi.fn(),
      subscribe: () => () => {},
      subscribeToPath: () => () => {},
      subscribeToSubmitting: () => () => {},
      getPathState: vi.fn(),
      setValues: vi.fn(),
      setValue: vi.fn(),
      setPathErrors: vi.fn(),
      setValidating: vi.fn(),
      setTouched: vi.fn(),
      setDirty: vi.fn(),
      setVisited: vi.fn(),
      setSubmitting: vi.fn(),
      setSubmitAttempted: vi.fn(),
      batchUpdate: vi.fn(),
    };
  }

  function createMinimalFormRuntime(store: FormStoreApi): FormRuntime {
    const okValidation: ValidationResult = { ok: true, errors: [] };
    const okFormValidation: FormValidationResult = { ok: true, errors: [], fieldErrors: {} };
    const acceptedRegistration: FieldRegistrationHandle = {
      accepted: true,
      registrationId: 'test-registration',
      unregister: vi.fn(),
    };

    return {
      id: 'test-form',
      store,
      scope: {} as ScopeRef,
      scopeId: 'form-scope',
      rootPath: '',
      get validation() {
        return undefined as any;
      },
      get lifecycleState() {
        return 'active' as const;
      },
      get modelGeneration() {
        return 0;
      },
      get canSubmit() {
        return true;
      },
      get allTouched() {
        return false;
      },
      setLifecycleHandlers: vi.fn(),
      getScopeState: vi.fn(),
      getAsyncOwnerDebugSnapshot: vi.fn(),
      getScopeRootErrors: vi.fn(() => []),
      applyChangesAndRevalidate: vi.fn(async () => okFormValidation),
      applyExternalErrors: vi.fn(),
      refreshCompiledModel: vi.fn(),
      dispose: vi.fn(),
      registerChildContract: vi.fn(),
      unregisterChildContract: vi.fn(),
      isPathOwned: vi.fn(() => true),
      getFieldState: vi.fn(),
      validateAt: vi.fn(async () => okValidation),
      validateField: vi.fn(async () => okValidation),
      validateAll: vi.fn(async () => okFormValidation),
      validateForm: vi.fn(async () => okFormValidation),
      getField: vi.fn(),
      getDependents: vi.fn(() => []),
      findByPrefix: vi.fn(() => []),
      getChildren: vi.fn(() => []),
      getError: vi.fn(),
      isValidating: vi.fn(() => false),
      isTouched: vi.fn(() => false),
      isDirty: vi.fn(() => false),
      isVisited: vi.fn(() => false),
      touchField: vi.fn(),
      visitField: vi.fn(),
      clearErrors: vi.fn(),
      submit: vi.fn(),
      reset: vi.fn(),
      setValue: vi.fn(),
      setValues: vi.fn(),
      appendValue: vi.fn(),
      prependValue: vi.fn(),
      insertValue: vi.fn(),
      removeValue: vi.fn(),
      moveValue: vi.fn(),
      swapValue: vi.fn(),
      replaceValue: vi.fn(),
      registerField: vi.fn((_registration: RuntimeFieldRegistration) => acceptedRegistration),
      updateFieldRegistration: vi.fn(),
      notifyFieldHidden: vi.fn(),
      validateSubtree: vi.fn(async () => okFormValidation),
    };
  }

  it('prefixes path for scalar item', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createItemFormProxy(form, 'tags', 0, 'scalar');
    proxy.setValue('', 'new-value');
    expect(form.setValue).toHaveBeenCalledWith('tags.0', 'new-value');
  });

  it('prefixes path for scalar item with "value" alias', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createItemFormProxy(form, 'tags', 0, 'scalar');
    proxy.setValue('value', 'new-value');
    expect(form.setValue).toHaveBeenCalledWith('tags.0', 'new-value');
  });

  it('prefixes path for object item', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createItemFormProxy(form, 'contacts', 1, 'object');
    proxy.setValue('name', 'Bob');
    expect(form.setValue).toHaveBeenCalledWith('contacts.1.name', 'Bob');
  });

  it('prefixes empty path for object item', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createItemFormProxy(form, 'contacts', 0, 'object');
    proxy.setValue('', { name: 'Alice' });
    expect(form.setValue).toHaveBeenCalledWith('contacts.0', { name: 'Alice' });
  });
});
