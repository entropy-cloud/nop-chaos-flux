import { describe, expect, it, afterEach } from 'vitest';
import {
  STRICT_VALIDATION_KEY,
  isStrictValidationEnabled,
  setStrictValidationGlobal,
} from './strict-mode';

describe('isStrictValidationEnabled', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[STRICT_VALIDATION_KEY];
  });

  it('returns explicit true override regardless of global state', () => {
    setStrictValidationGlobal(false);
    expect(isStrictValidationEnabled(true)).toBe(true);
  });

  it('returns explicit false override regardless of global state', () => {
    setStrictValidationGlobal(true);
    expect(isStrictValidationEnabled(false)).toBe(false);
  });

  it('reads global flag when no override is given', () => {
    setStrictValidationGlobal(true);
    expect(isStrictValidationEnabled()).toBe(true);
  });

  it('returns false when global flag is set to false', () => {
    setStrictValidationGlobal(false);
    expect(isStrictValidationEnabled()).toBe(false);
  });

  it('reads DEV mode fallback when global flag is absent', () => {
    expect(isStrictValidationEnabled()).toBe(true);
  });

  it('global flag takes precedence over DEV mode', () => {
    setStrictValidationGlobal(false);
    expect(isStrictValidationEnabled()).toBe(false);
  });
});

describe('setStrictValidationGlobal', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)[STRICT_VALIDATION_KEY];
  });

  it('sets the global flag to true', () => {
    setStrictValidationGlobal(true);
    expect((globalThis as Record<string, unknown>)[STRICT_VALIDATION_KEY]).toBe(true);
  });

  it('sets the global flag to false', () => {
    setStrictValidationGlobal(false);
    expect((globalThis as Record<string, unknown>)[STRICT_VALIDATION_KEY]).toBe(false);
  });
});
