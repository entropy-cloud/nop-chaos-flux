import { describe, expect, it, vi } from 'vitest';
import { createVariantScope, createVariantFormProxy } from './variant-field-runtime';
import type { ScopeRef, FormRuntime, FormStoreApi, FormStoreState } from '@nop-chaos/flux-core';

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
    path: 'root',
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

describe('createVariantScope', () => {
  it('creates scope with correct id including name', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    expect(scope.id).toContain('variant');
    expect(scope.id).toContain('payload');
  });

  it('creates scope with root id when name is empty', () => {
    const parent = createMockScope({ value: 'x' });
    const scope = createVariantScope(parent, '', 'text', false);
    expect(scope.id).toContain('root');
  });

  it('returns full payload via get() with empty path', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    const result = scope.get('') as Record<string, unknown>;
    expect(result.variant).toBe('text');
    expect(result.readOnly).toBe(false);
  });

  it('returns value via get("value")', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    expect(scope.get('value')).toBe('alpha');
  });

  it('returns variant via get("variant")', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    expect(scope.get('variant')).toBe('text');
  });

  it('returns readOnly via get("readOnly")', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', true);
    expect(scope.get('readOnly')).toBe(true);
  });

  it('returns undefined for unknown path', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    expect(scope.get('unknown')).toBeUndefined();
  });

  it('resolves nested value via get("value.xxx")', () => {
    const parent = createMockScope({ payload: { nested: 'deep' } });
    const scope = createVariantScope(parent, 'payload', 'object', false);
    expect(scope.get('value.nested')).toBe('deep');
  });

  it('returns true for has with known paths', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    expect(scope.has('')).toBe(true);
    expect(scope.has('value')).toBe(true);
    expect(scope.has('variant')).toBe(true);
    expect(scope.has('readOnly')).toBe(true);
  });

  it('returns false for has with unknown paths', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    expect(scope.has('unknown')).toBe(false);
  });

  it('delegates has("value.xxx") to parent', () => {
    const parent = createMockScope({ payload: { nested: 'deep' } });
    const scope = createVariantScope(parent, 'payload', 'object', false);
    expect(scope.has('value.nested')).toBe(true);
    expect(scope.has('value.missing')).toBe(false);
  });

  it('delegates update("") to parent.update(name, value)', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    scope.update('', 'beta');
    expect(parent.update).toHaveBeenCalledWith('payload', 'beta');
  });

  it('delegates update("value") to parent.update(name, value)', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    scope.update('value', 'beta');
    expect(parent.update).toHaveBeenCalledWith('payload', 'beta');
  });

  it('delegates update("value.xxx") to parent with prefixed path', () => {
    const parent = createMockScope({ payload: { nested: 'deep' } });
    const scope = createVariantScope(parent, 'payload', 'object', false);
    scope.update('value.nested', 'updated');
    expect(parent.update).toHaveBeenCalledWith('payload.nested', 'updated');
  });

  it('delegates update("value.xxx") without name prefix when name is empty', () => {
    const parent = createMockScope({ nested: 'deep' });
    const scope = createVariantScope(parent, '', 'object', false);
    scope.update('value.nested', 'updated');
    expect(parent.update).toHaveBeenCalledWith('nested', 'updated');
  });

  it('delegates update(unknownPath) to parent.update(unknownPath)', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    scope.update('otherPath', 'val');
    expect(parent.update).toHaveBeenCalledWith('otherPath', 'val');
  });

  it('merge with { value } delegates to parent.update(name, value)', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    scope.merge({ value: 'beta' });
    expect(parent.update).toHaveBeenCalledWith('payload', 'beta');
  });

  it('merge without value delegates to parent.update(name, data) when name exists', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    scope.merge({ other: 'data' });
    expect(parent.update).toHaveBeenCalledWith('payload', { other: 'data' });
  });

  it('merge without value delegates to parent.merge when name is empty', () => {
    const parent = createMockScope({ data: 'value' });
    const scope = createVariantScope(parent, '', 'text', false);
    scope.merge({ other: 'data' });
    expect(parent.merge).toHaveBeenCalledWith({ other: 'data' });
  });

  it('replace with { value } delegates to parent.update(name, value)', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    scope.replace({ value: 'beta' });
    expect(parent.update).toHaveBeenCalledWith('payload', 'beta');
  });

  it('replace without value delegates to parent.update(name, data)', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', false);
    scope.replace({ other: 'data' });
    expect(parent.update).toHaveBeenCalledWith('payload', { other: 'data' });
  });

  it('readOwn returns snapshot with value variant readOnly', () => {
    const parent = createMockScope({ payload: 'alpha' });
    const scope = createVariantScope(parent, 'payload', 'text', true);
    const own = scope.readOwn() as Record<string, unknown>;
    expect(own.variant).toBe('text');
    expect(own.readOnly).toBe(true);
  });
});

describe('createVariantFormProxy', () => {
  function createMinimalFormStore(): FormStoreApi {
    const state: FormStoreState = {
      values: { payload: { name: 'test' } },
      fieldStates: {},
      errors: {},
      submitCount: 0,
      submitting: false,
      touched: {},
      dirty: {},
      visited: {},
    };

    return {
      getState: () => state,
      getFieldState: vi.fn(),
      setFieldState: vi.fn(),
      subscribe: () => () => {},
      subscribeToPath: () => () => {},
      subscribeToSubmitting: () => () => {},
      getPathState: vi.fn(),
    };
  }

  function createMinimalFormRuntime(store: FormStoreApi): FormRuntime {
    return {
      store,
      scopeId: 'form-scope',
      rootPath: '',
      get validation() { return undefined as any; },
      get lifecycleState() { return 'ready' as const; },
      get modelGeneration() { return 0; },
      get canSubmit() { return true; },
      get allTouched() { return false; },
      isPathOwned: vi.fn(() => true),
      getFieldState: vi.fn(),
      validateAt: vi.fn(async () => []),
      validateField: vi.fn(async () => []),
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
      setValue: vi.fn(),
      setValues: vi.fn(),
      registerField: vi.fn(() => ({ unregister: vi.fn() })),
      notifyFieldHidden: vi.fn(),
      validateSubtree: vi.fn(async () => []),
    };
  }

  it('prefixes path with variant prefix', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, 'payload');
    proxy.setValue('name', 'updated');
    expect(form.setValue).toHaveBeenCalledWith('payload.name', 'updated');
  });

  it('prefixes empty path with prefix itself', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, 'payload');
    proxy.setValue('', { name: 'new' });
    expect(form.setValue).toHaveBeenCalledWith('payload', { name: 'new' });
  });

  it('returns path unchanged when prefix is empty', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, '');
    proxy.setValue('name', 'updated');
    expect(form.setValue).toHaveBeenCalledWith('name', 'updated');
  });

  it('returns empty path unchanged when prefix is empty', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, '');
    proxy.setValue('', { name: 'new' });
    expect(form.setValue).toHaveBeenCalledWith('', { name: 'new' });
  });

  it('has array mutation methods', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, 'items');
    expect(typeof proxy.appendValue).toBe('function');
    expect(typeof proxy.prependValue).toBe('function');
    expect(typeof proxy.insertValue).toBe('function');
    expect(typeof proxy.removeValue).toBe('function');
    expect(typeof proxy.moveValue).toBe('function');
    expect(typeof proxy.swapValue).toBe('function');
    expect(typeof proxy.replaceValue).toBe('function');
  });

  it('delegates appendValue with prefixed path', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store) as FormRuntime & { appendValue: (path: string, value: unknown) => void };
    form.appendValue = vi.fn();
    const proxy = createVariantFormProxy(form, 'items');
    proxy.appendValue!('list', 'new');
    expect(form.appendValue).toHaveBeenCalledWith('items.list', 'new');
  });

  it('delegates registerField with prefixed path', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, 'payload');
    proxy.registerField({ path: 'name', childPaths: [] });
    expect(form.registerField).toHaveBeenCalledWith(expect.objectContaining({ path: 'payload.name' }));
  });

  it('delegates touchField with prefixed path', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, 'payload');
    proxy.touchField('name');
    expect(form.touchField).toHaveBeenCalledWith('payload.name');
  });

  it('delegates isTouched with prefixed path', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, 'payload');
    proxy.isTouched('name');
    expect(form.isTouched).toHaveBeenCalledWith('payload.name');
  });

  it('delegates isDirty with prefixed path', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, 'payload');
    proxy.isDirty('name');
    expect(form.isDirty).toHaveBeenCalledWith('payload.name');
  });

  it('delegates clearErrors with prefixed path', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, 'payload');
    proxy.clearErrors('name');
    expect(form.clearErrors).toHaveBeenCalledWith('payload.name');
  });

  it('delegates clearErrors with undefined unchanged', () => {
    const store = createMinimalFormStore();
    const form = createMinimalFormRuntime(store);
    const proxy = createVariantFormProxy(form, 'payload');
    proxy.clearErrors(undefined);
    expect(form.clearErrors).toHaveBeenCalledWith(undefined);
  });
});
