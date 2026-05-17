import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { CompiledFormValidationField, RuntimeFieldRegistration, ValidationError } from '@nop-chaos/flux-core';
import { setMessageFormatter } from '@nop-chaos/flux-core';
import { buildValidationMessage } from './message.js';
import { normalizeRuntimeValidationErrors, createValidationError } from './errors.js';
import { createValidationRegistry, createBuiltInValidationRegistry, registerBuiltInValidators } from './registry.js';

function makeField(overrides?: Partial<CompiledFormValidationField>): CompiledFormValidationField {
  return {
    path: 'name',
    controlType: 'input-text',
    label: 'Name',
    rules: [],
    behavior: { triggers: ['blur'], showErrorOn: ['touched'] },
    hiddenFieldPolicy: {},
    ...overrides,
  };
}

describe('buildValidationMessage label fallback edge cases', () => {
  let calls: Array<{ key: string; params: Record<string, unknown> | undefined }>;

  beforeEach(() => {
    calls = [];
    setMessageFormatter((key, params) => {
      calls.push({ key, params });
      return `${key}:${JSON.stringify(params ?? {})}`;
    });
  });

  afterEach(() => {
    setMessageFormatter((key) => key);
  });

  it('uses label when label is a non-empty string', () => {
    buildValidationMessage({ kind: 'required' }, makeField({ label: 'Username' }));
    expect(calls[0].params).toEqual({ label: 'Username' });
  });

  it('falls back to path when label is undefined', () => {
    buildValidationMessage({ kind: 'required' }, makeField({ label: undefined }));
    expect(calls[0].params).toEqual({ label: 'name' });
  });

  it('uses empty string label as-is when label is empty string', () => {
    buildValidationMessage({ kind: 'required' }, makeField({ label: '' }));
    expect(calls[0].params).toEqual({ label: '' });
  });

  it('passes min value for minLength', () => {
    buildValidationMessage({ kind: 'minLength', value: 8 }, makeField());
    expect(calls[0].params).toEqual({ label: 'Name', min: 8 });
  });

  it('passes max value for maxLength', () => {
    buildValidationMessage({ kind: 'maxLength', value: 100 }, makeField());
    expect(calls[0].params).toEqual({ label: 'Name', max: 100 });
  });

  it('passes field for uniqueBy', () => {
    buildValidationMessage({ kind: 'uniqueBy', itemPath: 'key' }, makeField());
    expect(calls[0].params).toEqual({ label: 'Name', field: 'key' });
  });

  it('passes field for equalsField', () => {
    buildValidationMessage({ kind: 'equalsField', path: 'confirm' }, makeField());
    expect(calls[0].params).toEqual({ label: 'Name', field: 'confirm' });
  });

  it('uses custom message for pattern when provided', () => {
    const result = buildValidationMessage(
      { kind: 'pattern', value: '^\\d+$', message: 'Numbers only' },
      makeField(),
    );
    expect(result).toBe('Numbers only');
    expect(calls).toHaveLength(0);
  });

  it('uses custom message for email when provided', () => {
    const result = buildValidationMessage(
      { kind: 'email', message: 'Invalid email address' },
      makeField(),
    );
    expect(result).toBe('Invalid email address');
    expect(calls).toHaveLength(0);
  });

  it('uses custom message for requiredWhen', () => {
    const result = buildValidationMessage(
      { kind: 'requiredWhen', path: 'type', equals: 'biz', message: 'Required for business' },
      makeField(),
    );
    expect(result).toBe('Required for business');
    expect(calls).toHaveLength(0);
  });

  it('uses custom message for requiredUnless', () => {
    const result = buildValidationMessage(
      { kind: 'requiredUnless', path: 'skip', equals: true, message: 'Cannot skip' },
      makeField(),
    );
    expect(result).toBe('Cannot skip');
    expect(calls).toHaveLength(0);
  });

  it('falls back to formatter for async', () => {
    buildValidationMessage(
      { kind: 'async', action: { action: 'ajax', args: { url: '/api' } } },
      makeField(),
    );
    expect(calls[0].key).toBe('validation.async');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });
});

describe('normalizeRuntimeValidationErrors', () => {
  const baseRegistration: RuntimeFieldRegistration = {
    path: 'user.email',
    getValue: () => 'test@test.com',
  };

  it('returns empty array for undefined errors', () => {
    expect(normalizeRuntimeValidationErrors(undefined, baseRegistration, 'user.email')).toEqual([]);
  });

  it('returns empty array for null-like errors', () => {
    expect(normalizeRuntimeValidationErrors(null as any, baseRegistration, 'user.email')).toEqual([]);
  });

  it('normalizes path from error when present', () => {
    const errors: ValidationError[] = [
      { path: 'user.email', message: 'Invalid', rule: 'email' },
    ];
    const result = normalizeRuntimeValidationErrors(errors, baseRegistration, 'user.email');
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('user.email');
  });

  it('uses childPath as normalized path when provided', () => {
    const errors: ValidationError[] = [
      { path: '', message: 'Required', rule: 'required' },
    ];
    const result = normalizeRuntimeValidationErrors(errors, baseRegistration, 'items', 'items.0.name');
    expect(result[0].path).toBe('items.0.name');
  });

  it('falls back to registration path when error has no path', () => {
    const errors: ValidationError[] = [
      { message: 'Error', rule: 'required' } as any,
    ];
    const result = normalizeRuntimeValidationErrors(errors, baseRegistration, 'user.email');
    expect(result[0].path).toBe('user.email');
  });

  it('sets ownerPath from registration when error has none', () => {
    const errors: ValidationError[] = [
      { message: 'Error', rule: 'required' } as any,
    ];
    const result = normalizeRuntimeValidationErrors(errors, baseRegistration, 'user.email');
    expect(result[0].ownerPath).toBe('user.email');
  });

  it('defaults sourceKind to runtime-registration when error has none', () => {
    const errors: ValidationError[] = [
      { message: 'Error', rule: 'required' } as any,
    ];
    const result = normalizeRuntimeValidationErrors(errors, baseRegistration, 'user.email');
    expect(result[0].sourceKind).toBe('runtime-registration');
  });

  it('preserves explicit sourceKind from error', () => {
    const errors: ValidationError[] = [
      { path: 'user.email', message: 'Error', rule: 'required', sourceKind: 'external' },
    ];
    const result = normalizeRuntimeValidationErrors(errors, baseRegistration, 'user.email');
    expect(result[0].sourceKind).toBe('external');
  });

  it('preserves explicit ownerPath from error', () => {
    const errors: ValidationError[] = [
      { path: 'user.email', message: 'Error', rule: 'required', ownerPath: 'form.root' },
    ];
    const result = normalizeRuntimeValidationErrors(errors, baseRegistration, 'user.email');
    expect(result[0].ownerPath).toBe('form.root');
  });

  it('handles multiple errors', () => {
    const errors: ValidationError[] = [
      { path: 'a', message: 'Err 1', rule: 'required' },
      { path: 'b', message: 'Err 2', rule: 'email' },
    ];
    const result = normalizeRuntimeValidationErrors(errors, baseRegistration, 'root');
    expect(result).toHaveLength(2);
  });
});

describe('createValidationError', () => {
  const field = makeField();
  const compiledRule = {
    id: 'name#0:required',
    rule: { kind: 'required' as const },
    dependencyPaths: [],
  };

  it('creates error with path from field', () => {
    const err = createValidationError(field, compiledRule, 'Required');
    expect(err.path).toBe('name');
  });

  it('creates error with message from parameter', () => {
    const err = createValidationError(field, compiledRule, 'Custom message');
    expect(err.message).toBe('Custom message');
  });

  it('creates error with rule kind', () => {
    const err = createValidationError(field, compiledRule, 'Required');
    expect(err.rule).toBe('required');
  });

  it('creates error with ruleId from compiledRule', () => {
    const err = createValidationError(field, compiledRule, 'Required');
    expect(err.ruleId).toBe('name#0:required');
  });

  it('sets ownerPath to field path by default', () => {
    const err = createValidationError(field, compiledRule, 'Required');
    expect(err.ownerPath).toBe('name');
  });

  it('allows overriding sourceKind via overrides', () => {
    const err = createValidationError(field, compiledRule, 'Required', {
      sourceKind: 'external',
    });
    expect(err.sourceKind).toBe('external');
  });

  it('allows overriding ownerPath via overrides', () => {
    const err = createValidationError(field, compiledRule, 'Required', {
      ownerPath: 'form.root',
    });
    expect(err.ownerPath).toBe('form.root');
  });

  it('allows preserving an original failure cause via overrides', () => {
    const cause = { code: 'E_VALIDATION' };
    const err = createValidationError(field, compiledRule, 'Required', {
      cause,
    });
    expect(err.cause).toBe(cause);
  });

  it('allows setting relatedPaths via overrides', () => {
    const err = createValidationError(field, compiledRule, 'Required', {
      relatedPaths: ['password'],
    });
    expect(err.relatedPaths).toEqual(['password']);
  });
});

describe('validation registry edge cases', () => {
  it('get returns undefined for unregistered kind', () => {
    const registry = createValidationRegistry();
    expect(registry.get('required')).toBeUndefined();
  });

  it('has returns false for unregistered kind', () => {
    const registry = createValidationRegistry();
    expect(registry.has('required')).toBe(false);
  });

  it('list returns empty array for empty registry', () => {
    const registry = createValidationRegistry();
    expect(registry.list()).toEqual([]);
  });

  it('register then get returns the validator', () => {
    const registry = createValidationRegistry();
    const validator = () => undefined;
    registry.register('required', validator);
    expect(registry.get('required')).toBe(validator);
  });

  it('throws on duplicate registration', () => {
    const registry = createValidationRegistry();
    registry.register('required', () => undefined);
    expect(() => registry.register('required', () => undefined)).toThrow(
      'Validation rule required is already registered.',
    );
  });

  it('built-in registry has all expected validators', () => {
    const registry = createBuiltInValidationRegistry();
    const expectedKinds = [
      'required', 'minLength', 'maxLength', 'minItems', 'maxItems',
      'atLeastOneFilled', 'allOrNone', 'uniqueBy', 'atLeastOneOf',
      'pattern', 'email', 'equalsField', 'notEqualsField',
      'requiredWhen', 'requiredUnless',
    ];
    for (const kind of expectedKinds) {
      expect(registry.has(kind as any), `Expected ${kind} to be registered`).toBe(true);
    }
  });

  it('registerBuiltInValidators populates into existing registry', () => {
    const registry = createValidationRegistry();
    registerBuiltInValidators(registry);
    expect(registry.list().length).toBeGreaterThan(0);
    expect(registry.has('required')).toBe(true);
  });

  it('built-in registry throws when re-registering a built-in', () => {
    const registry = createBuiltInValidationRegistry();
    expect(() => registry.register('required', () => undefined)).toThrow();
  });

  it('allows registering a custom kind after built-ins', () => {
    const registry = createBuiltInValidationRegistry();
    registry.register('customCheck' as any, () => undefined);
    expect(registry.has('customCheck' as any)).toBe(true);
  });

  it('list includes all registered kinds', () => {
    const registry = createBuiltInValidationRegistry();
    const list = registry.list();
    expect(list).toContain('required');
    expect(list).toContain('email');
    expect(list).toContain('uniqueBy');
  });
});
