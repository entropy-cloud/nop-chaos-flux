import { describe, expect, it } from 'vitest';
import {
  normalizeInstancePath,
} from './utils/instance-path.js';
import {
  validationErrorsEqual,
} from './utils/validation-utils.js';
import type { ValidationError } from './types/validation.js';

describe('normalizeInstancePath contract', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeInstancePath(undefined)).toBeUndefined();
  });

  it('returns undefined for null input', () => {
    expect(normalizeInstancePath(null)).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(normalizeInstancePath([])).toBeUndefined();
  });

  it('returns the same array for non-empty input', () => {
    const path = [{ nodeId: 'a', scopeId: 's1' }] as any;
    expect(normalizeInstancePath(path)).toBe(path);
  });
});

describe('validationErrorsEqual contract', () => {
  it('returns true for same reference', () => {
    const errors: ValidationError[] = [];
    expect(validationErrorsEqual(errors, errors)).toBe(true);
  });

  it('returns true for both undefined', () => {
    expect(validationErrorsEqual(undefined, undefined)).toBe(true);
  });

  it('returns false for one undefined one defined', () => {
    expect(validationErrorsEqual(undefined, [])).toBe(false);
    expect(validationErrorsEqual([], undefined)).toBe(false);
  });

  it('returns false for different lengths', () => {
    const left: ValidationError[] = [{ path: 'a', rule: 'required', message: 'Required' }];
    const right: ValidationError[] = [];
    expect(validationErrorsEqual(left, right)).toBe(false);
  });

  it('returns true for structurally equal errors', () => {
    const left: ValidationError[] = [
      { path: 'name', rule: 'required', message: 'Name is required' },
    ];
    const right: ValidationError[] = [
      { path: 'name', rule: 'required', message: 'Name is required' },
    ];
    expect(validationErrorsEqual(left, right)).toBe(true);
  });

  it('returns false when path differs', () => {
    const left: ValidationError[] = [
      { path: 'name', rule: 'required', message: 'Required' },
    ];
    const right: ValidationError[] = [
      { path: 'email', rule: 'required', message: 'Required' },
    ];
    expect(validationErrorsEqual(left, right)).toBe(false);
  });

  it('returns false when message differs', () => {
    const left: ValidationError[] = [
      { path: 'name', rule: 'required', message: 'Required' },
    ];
    const right: ValidationError[] = [
      { path: 'name', rule: 'required', message: 'Different' },
    ];
    expect(validationErrorsEqual(left, right)).toBe(false);
  });

  it('compares relatedPaths', () => {
    const left: ValidationError[] = [
      { path: 'a', rule: 'allOrNone', message: 'm', relatedPaths: ['b', 'c'] },
    ];
    const right: ValidationError[] = [
      { path: 'a', rule: 'allOrNone', message: 'm', relatedPaths: ['b', 'c'] },
    ];
    expect(validationErrorsEqual(left, right)).toBe(true);
  });

  it('returns false for different relatedPaths', () => {
    const left: ValidationError[] = [
      { path: 'a', rule: 'allOrNone', message: 'm', relatedPaths: ['b'] },
    ];
    const right: ValidationError[] = [
      { path: 'a', rule: 'allOrNone', message: 'm', relatedPaths: ['c'] },
    ];
    expect(validationErrorsEqual(left, right)).toBe(false);
  });
});
