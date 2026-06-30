import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { CompiledFormValidationField } from '@nop-chaos/flux-core';
import { setMessageFormatter } from '@nop-chaos/flux-core';
import { buildValidationMessage } from '../validation/message.js';

function makeField(
  overrides: Partial<CompiledFormValidationField> = {},
): CompiledFormValidationField {
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

describe('buildValidationMessage', () => {
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

  it('formats required message with label', () => {
    const result = buildValidationMessage({ kind: 'required' }, makeField());
    expect(result).toContain('validation.required');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });

  it('formats required message falling back to path when label is undefined', () => {
    buildValidationMessage({ kind: 'required' }, makeField({ label: undefined }));
    expect(calls[0].params).toEqual({ label: 'name' });
  });

  it('formats requiredRange with a dedicated validation.requiredRange key (range-aware required)', () => {
    const result = buildValidationMessage({ kind: 'requiredRange' }, makeField());
    expect(result).toContain('validation.requiredRange');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });

  it('requiredRange returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'requiredRange', delimiter: ',', message: 'Pick both ends' },
      makeField(),
    );
    expect(result).toBe('Pick both ends');
    expect(calls).toHaveLength(0);
  });

  it('formats required message falling back to path when label is null', () => {
    buildValidationMessage({ kind: 'required' }, makeField({ label: undefined as any }));
    expect(calls[0].params).toEqual({ label: 'name' });
  });

  it('required returns custom message when provided (G3)', () => {
    const result = buildValidationMessage({ kind: 'required', message: 'Must fill this' }, makeField());
    expect(result).toBe('Must fill this');
    expect(calls).toHaveLength(0);
  });

  it('minLength returns custom message when provided (G3)', () => {
    const result = buildValidationMessage(
      { kind: 'minLength', value: 5, message: 'Too short' },
      makeField(),
    );
    expect(result).toBe('Too short');
    expect(calls).toHaveLength(0);
  });

  it('maxLength returns custom message when provided (G3)', () => {
    const result = buildValidationMessage(
      { kind: 'maxLength', value: 100, message: 'Too long' },
      makeField(),
    );
    expect(result).toBe('Too long');
    expect(calls).toHaveLength(0);
  });

  it('formats minLength message with label and min', () => {
    const result = buildValidationMessage({ kind: 'minLength', value: 5 }, makeField());
    expect(result).toContain('validation.minLength');
    expect(calls[0].params).toEqual({ label: 'Name', min: 5 });
  });

  it('formats maxLength message with label and max', () => {
    const result = buildValidationMessage({ kind: 'maxLength', value: 100 }, makeField());
    expect(result).toContain('validation.maxLength');
    expect(calls[0].params).toEqual({ label: 'Name', max: 100 });
  });

  it('formats minItems with formatter', () => {
    const result = buildValidationMessage({ kind: 'minItems', value: 2 }, makeField());
    expect(result).toContain('validation.minItems');
    expect(calls[0].params).toEqual({ label: 'Name', min: 2 });
  });

  it('minItems returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'minItems', value: 2, message: 'Need at least 2' },
      makeField(),
    );
    expect(result).toBe('Need at least 2');
    expect(calls).toHaveLength(0);
  });

  it('formats maxItems with formatter', () => {
    const result = buildValidationMessage({ kind: 'maxItems', value: 10 }, makeField());
    expect(result).toContain('validation.maxItems');
    expect(calls[0].params).toEqual({ label: 'Name', max: 10 });
  });

  it('maxItems returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'maxItems', value: 10, message: 'Too many' },
      makeField(),
    );
    expect(result).toBe('Too many');
    expect(calls).toHaveLength(0);
  });

  it('formats atLeastOneFilled with formatter', () => {
    const result = buildValidationMessage({ kind: 'atLeastOneFilled' }, makeField());
    expect(result).toContain('validation.atLeastOneFilled');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });

  it('atLeastOneFilled returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'atLeastOneFilled', message: 'Fill one' },
      makeField(),
    );
    expect(result).toBe('Fill one');
    expect(calls).toHaveLength(0);
  });

  it('formats allOrNone with formatter', () => {
    const result = buildValidationMessage(
      { kind: 'allOrNone', itemPaths: ['a', 'b'] },
      makeField(),
    );
    expect(result).toContain('validation.allOrNone');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });

  it('allOrNone returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'allOrNone', itemPaths: ['a', 'b'], message: 'All or nothing' },
      makeField(),
    );
    expect(result).toBe('All or nothing');
    expect(calls).toHaveLength(0);
  });

  it('formats uniqueBy with label and field', () => {
    const result = buildValidationMessage({ kind: 'uniqueBy', itemPath: 'email' }, makeField());
    expect(result).toContain('validation.uniqueBy');
    expect(calls[0].params).toEqual({ label: 'Name', field: 'email' });
  });

  it('uniqueBy returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'uniqueBy', itemPath: 'email', message: 'Duplicate email' },
      makeField(),
    );
    expect(result).toBe('Duplicate email');
    expect(calls).toHaveLength(0);
  });

  it('formats atLeastOneOf with formatter', () => {
    const result = buildValidationMessage({ kind: 'atLeastOneOf', paths: ['x', 'y'] }, makeField());
    expect(result).toContain('validation.atLeastOneOf');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });

  it('atLeastOneOf returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'atLeastOneOf', paths: ['x', 'y'], message: 'Pick one' },
      makeField(),
    );
    expect(result).toBe('Pick one');
    expect(calls).toHaveLength(0);
  });

  it('formats pattern with formatter', () => {
    const result = buildValidationMessage({ kind: 'pattern', value: '^[a-z]+$' }, makeField());
    expect(result).toContain('validation.pattern');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });

  it('pattern returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'pattern', value: '^[a-z]+$', message: 'Invalid format' },
      makeField(),
    );
    expect(result).toBe('Invalid format');
    expect(calls).toHaveLength(0);
  });

  it('formats email with formatter', () => {
    const result = buildValidationMessage({ kind: 'email' }, makeField());
    expect(result).toContain('validation.email');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });

  it('email returns custom message when provided', () => {
    const result = buildValidationMessage({ kind: 'email', message: 'Bad email' }, makeField());
    expect(result).toBe('Bad email');
    expect(calls).toHaveLength(0);
  });

  it('formats equalsField with label and field', () => {
    const result = buildValidationMessage({ kind: 'equalsField', path: 'password' }, makeField());
    expect(result).toContain('validation.equalsField');
    expect(calls[0].params).toEqual({ label: 'Name', field: 'password' });
  });

  it('equalsField returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'equalsField', path: 'password', message: 'Passwords differ' },
      makeField(),
    );
    expect(result).toBe('Passwords differ');
    expect(calls).toHaveLength(0);
  });

  it('formats notEqualsField with label and field', () => {
    const result = buildValidationMessage(
      { kind: 'notEqualsField', path: 'oldPassword' },
      makeField(),
    );
    expect(result).toContain('validation.notEqualsField');
    expect(calls[0].params).toEqual({ label: 'Name', field: 'oldPassword' });
  });

  it('notEqualsField returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'notEqualsField', path: 'oldPassword', message: 'Must differ' },
      makeField(),
    );
    expect(result).toBe('Must differ');
    expect(calls).toHaveLength(0);
  });

  it('formats requiredWhen as validation.required', () => {
    const result = buildValidationMessage(
      { kind: 'requiredWhen', path: 'type', equals: 'business' },
      makeField(),
    );
    expect(result).toContain('validation.required');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });

  it('formats requiredUnless as validation.required', () => {
    const result = buildValidationMessage(
      { kind: 'requiredUnless', path: 'isGuest', equals: true },
      makeField(),
    );
    expect(result).toContain('validation.required');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });

  it('formats async with formatter', () => {
    const result = buildValidationMessage(
      { kind: 'async', action: { action: 'ajax', args: { url: '/check' } } },
      makeField(),
    );
    expect(result).toContain('validation.async');
    expect(calls[0].params).toEqual({ label: 'Name' });
  });

  it('async returns custom message when provided', () => {
    const result = buildValidationMessage(
      { kind: 'async', action: { action: 'ajax', args: { url: '/check' } }, message: 'Async fail' },
      makeField(),
    );
    expect(result).toBe('Async fail');
    expect(calls).toHaveLength(0);
  });

  it('empty string custom message is returned as-is (not nullish)', () => {
    const result = buildValidationMessage({ kind: 'minItems', value: 1, message: '' }, makeField());
    expect(result).toBe('');
    expect(calls).toHaveLength(0);
  });

  it('uses path as label when label is empty string', () => {
    buildValidationMessage({ kind: 'required' }, makeField({ label: '' }));
    expect(calls[0].params).toEqual({ label: '' });
  });
});
