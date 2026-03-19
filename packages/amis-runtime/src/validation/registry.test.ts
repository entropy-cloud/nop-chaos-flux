import { describe, expect, it } from 'vitest';
import { createBuiltInValidationRegistry, createValidationRegistry, registerBuiltInValidators } from './registry';

describe('validation registry', () => {
  it('registers and resolves built-in validators', () => {
    const registry = createBuiltInValidationRegistry();

    expect(registry.has('required')).toBe(true);
    expect(registry.get('required')).toBeTypeOf('function');
    expect(registry.list()).toContain('email');
  });

  it('throws when the same validator kind is registered twice', () => {
    const registry = createValidationRegistry();
    const validator = () => undefined;

    registry.register('required', validator);

    expect(() => registry.register('required', validator)).toThrow('Validation rule required is already registered.');
  });

  it('can populate an existing registry with built-ins', () => {
    const registry = createValidationRegistry();

    registerBuiltInValidators(registry);

    expect(registry.has('uniqueBy')).toBe(true);
    expect(registry.has('requiredWhen')).toBe(true);
  });
});
