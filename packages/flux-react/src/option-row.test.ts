import { describe, expect, it } from 'vitest';
import {
  getOptionRowStateAttributes,
  getOptionRowStateTokens,
  optionRowBindingEquals,
  optionRowValueMatches,
} from './option-row.js';

describe('getOptionRowStateTokens', () => {
  it('returns undefined when no state is active', () => {
    expect(getOptionRowStateTokens({})).toBeUndefined();
    expect(getOptionRowStateTokens({ selected: false, disabled: false })).toBeUndefined();
  });

  it('emits the selected token', () => {
    expect(getOptionRowStateTokens({ selected: true })).toBe('selected');
  });

  it('emits the disabled token and joins multiple tokens', () => {
    expect(getOptionRowStateTokens({ disabled: true })).toBe('disabled');
    expect(getOptionRowStateTokens({ selected: true, disabled: true })).toBe('selected disabled');
  });
});

describe('getOptionRowStateAttributes', () => {
  it('emits the full selected marker set', () => {
    expect(getOptionRowStateAttributes({ selected: true })).toEqual({
      'data-state': 'selected',
      'data-selected': 'true',
      'aria-selected': 'true',
      'aria-disabled': undefined,
    });
  });

  it('marks unselected rows with aria-selected="false" and no data attributes', () => {
    expect(getOptionRowStateAttributes({ selected: false })).toEqual({
      'data-state': undefined,
      'data-selected': undefined,
      'aria-selected': 'false',
      'aria-disabled': undefined,
    });
  });

  it('adds the disabled token and aria-disabled', () => {
    const attrs = getOptionRowStateAttributes({ selected: true, disabled: true });
    expect(attrs['data-state']).toBe('selected disabled');
    expect(attrs['aria-disabled']).toBe('true');
    expect(attrs['data-selected']).toBe('true');
  });
});

describe('optionRowValueMatches', () => {
  it('matches scalar equality with string coercion', () => {
    expect(optionRowValueMatches('a', 'a')).toBe(true);
    expect(optionRowValueMatches(2, '2')).toBe(true);
    expect(optionRowValueMatches('a', 'b')).toBe(false);
  });

  it('returns false for empty/missing bindings (opt-row-value-invalid fallback)', () => {
    expect(optionRowValueMatches('a', undefined)).toBe(false);
    expect(optionRowValueMatches('a', null)).toBe(false);
    expect(optionRowValueMatches('a', '')).toBe(false);
  });

  it('returns false for null/undefined item values', () => {
    expect(optionRowValueMatches(undefined, 'a')).toBe(false);
    expect(optionRowValueMatches(null, 'a')).toBe(false);
  });

  it('array bindings use any-match semantics', () => {
    expect(optionRowValueMatches('a', ['x', 'a'])).toBe(true);
    expect(optionRowValueMatches('b', ['x', 'a'])).toBe(false);
    expect(optionRowValueMatches('a', [])).toBe(false);
  });
});

describe('optionRowBindingEquals', () => {
  it('compares primitives strictly and arrays element-wise', () => {
    expect(optionRowBindingEquals('a', 'a')).toBe(true);
    expect(optionRowBindingEquals('a', 'b')).toBe(false);
    expect(optionRowBindingEquals(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(optionRowBindingEquals(['a'], ['a', 'b'])).toBe(false);
    expect(optionRowBindingEquals(undefined, undefined)).toBe(true);
  });
});
