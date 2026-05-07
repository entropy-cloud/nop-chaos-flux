import { describe, expect, it } from 'vitest';
import type { CompiledFormValidationModel, FormStoreState } from '@nop-chaos/flux-core';
import {
  EMPTY_FORM_STORE_STATE,
  EMPTY_FORM_FIELD_STATE,
  selectCurrentFormErrors,
  selectCurrentFormFieldState,
  selectCurrentFormFieldPresentation,
  isFieldEffectivelyRequired,
} from '../form-state.js';

function makeError(
  overrides: Partial<import('@nop-chaos/flux-core').ValidationError> = {},
): import('@nop-chaos/flux-core').ValidationError {
  return {
    path: 'name',
    rule: 'required',
    message: 'Name is required',
    sourceKind: 'field',
    ...overrides,
  };
}

function makeState(overrides: Partial<FormStoreState> = {}): FormStoreState {
  return {
    values: {},
    fieldStates: {},
    submitting: false,
    submitAttempted: false,
    ...overrides,
  };
}

describe('EMPTY_FORM_STORE_STATE', () => {
  it('has empty values and fieldStates', () => {
    expect(EMPTY_FORM_STORE_STATE.values).toEqual({});
    expect(EMPTY_FORM_STORE_STATE.fieldStates).toEqual({});
    expect(EMPTY_FORM_STORE_STATE.submitting).toBe(false);
    expect(EMPTY_FORM_STORE_STATE.submitAttempted).toBe(false);
  });
});

describe('EMPTY_FORM_FIELD_STATE', () => {
  it('has all flags off and no error', () => {
    expect(EMPTY_FORM_FIELD_STATE.error).toBeUndefined();
    expect(EMPTY_FORM_FIELD_STATE.validating).toBe(false);
    expect(EMPTY_FORM_FIELD_STATE.touched).toBe(false);
    expect(EMPTY_FORM_FIELD_STATE.dirty).toBe(false);
    expect(EMPTY_FORM_FIELD_STATE.visited).toBe(false);
    expect(EMPTY_FORM_FIELD_STATE.submitting).toBe(false);
    expect(EMPTY_FORM_FIELD_STATE.submitAttempted).toBe(false);
  });
});

describe('selectCurrentFormErrors', () => {
  it('returns empty array when no errors exist', () => {
    expect(selectCurrentFormErrors(makeState())).toEqual([]);
  });

  it('returns all errors when no query is provided', () => {
    const error = makeError();
    const state = makeState({
      fieldStates: {
        name: { errors: [error] },
      },
    });
    expect(selectCurrentFormErrors(state)).toEqual([error]);
  });

  it('filters by path', () => {
    const nameError = makeError({ path: 'name' });
    const emailError = makeError({ path: 'email' });
    const state = makeState({
      fieldStates: {
        name: { errors: [nameError] },
        email: { errors: [emailError] },
      },
    });
    const result = selectCurrentFormErrors(state, { path: 'name' });
    expect(result).toEqual([nameError]);
  });

  it('filters by ownerPath using error path as fallback', () => {
    const error = makeError({ path: 'items.0', ownerPath: 'items' });
    const state = makeState({
      fieldStates: {
        'items.0': { errors: [error] },
      },
    });
    const result = selectCurrentFormErrors(state, { ownerPath: 'items' });
    expect(result).toEqual([error]);
  });

  it('excludes errors with wrong ownerPath', () => {
    const error = makeError({ path: 'name', ownerPath: 'other' });
    const state = makeState({
      fieldStates: {
        name: { errors: [error] },
      },
    });
    const result = selectCurrentFormErrors(state, { ownerPath: 'items' });
    expect(result).toEqual([]);
  });

  it('filters by rule', () => {
    const requiredError = makeError({ rule: 'required' });
    const patternError = makeError({ rule: 'pattern' });
    const state = makeState({
      fieldStates: {
        name: { errors: [requiredError, patternError] },
      },
    });
    const result = selectCurrentFormErrors(state, { rule: 'pattern' });
    expect(result).toEqual([patternError]);
  });

  it('filters by sourceKinds', () => {
    const fieldError = makeError({ sourceKind: 'field' });
    const arrayError = makeError({ sourceKind: 'array' });
    const state = makeState({
      fieldStates: {
        name: { errors: [fieldError, arrayError] },
      },
    });
    const result = selectCurrentFormErrors(state, { sourceKinds: ['array'] });
    expect(result).toEqual([arrayError]);
  });

  it('excludes errors without sourceKind when sourceKinds filter is set', () => {
    const errorNoSource = makeError({ sourceKind: undefined });
    const state = makeState({
      fieldStates: {
        name: { errors: [errorNoSource] },
      },
    });
    const result = selectCurrentFormErrors(state, { sourceKinds: ['array'] });
    expect(result).toEqual([]);
  });

  it('returns path-specific errors via fast path when query has path', () => {
    const nameError = makeError({ path: 'name' });
    const state = makeState({
      fieldStates: {
        name: { errors: [nameError] },
        email: { errors: [makeError({ path: 'email' })] },
      },
    });
    const result = selectCurrentFormErrors(state, { path: 'name' });
    expect(result).toEqual([nameError]);
    expect(result).toHaveLength(1);
  });

  it('returns empty for nonexistent path', () => {
    const state = makeState({
      fieldStates: {
        name: { errors: [makeError()] },
      },
    });
    expect(selectCurrentFormErrors(state, { path: 'nonexistent' })).toEqual([]);
  });

  it('skips field states with no errors array', () => {
    const state = makeState({
      fieldStates: {
        name: {},
      },
    });
    expect(selectCurrentFormErrors(state)).toEqual([]);
  });

  it('combines multiple filters', () => {
    const error1 = makeError({ path: 'items', rule: 'required', sourceKind: 'array' });
    const error2 = makeError({ path: 'items', rule: 'minItems', sourceKind: 'array' });
    const error3 = makeError({ path: 'items', rule: 'required', sourceKind: 'field' });
    const state = makeState({
      fieldStates: {
        items: { errors: [error1, error2, error3] },
      },
    });
    const result = selectCurrentFormErrors(state, { ownerPath: 'items', sourceKinds: ['array'] });
    expect(result).toEqual([error1, error2]);
  });
});

describe('selectCurrentFormFieldState', () => {
  it('returns empty state when field does not exist', () => {
    const result = selectCurrentFormFieldState(makeState(), 'name');
    expect(result.error).toBeUndefined();
    expect(result.touched).toBe(false);
    expect(result.dirty).toBe(false);
    expect(result.visited).toBe(false);
    expect(result.validating).toBe(false);
    expect(result.submitting).toBe(false);
    expect(result.submitAttempted).toBe(false);
  });

  it('returns field state with error', () => {
    const error = makeError();
    const state = makeState({
      fieldStates: {
        name: { errors: [error], touched: true, dirty: true, visited: true, validating: true },
      },
      submitting: true,
      submitAttempted: true,
    });
    const result = selectCurrentFormFieldState(state, 'name');
    expect(result.error).toBe(error);
    expect(result.touched).toBe(true);
    expect(result.dirty).toBe(true);
    expect(result.visited).toBe(true);
    expect(result.validating).toBe(true);
    expect(result.submitting).toBe(true);
    expect(result.submitAttempted).toBe(true);
  });

  it('uses query for error filtering', () => {
    const error1 = makeError({ rule: 'required' });
    const error2 = makeError({ rule: 'pattern' });
    const state = makeState({
      fieldStates: {
        name: { errors: [error1, error2] },
      },
    });
    const result = selectCurrentFormFieldState(state, 'name', { path: 'name', rule: 'pattern' });
    expect(result.error).toBe(error2);
  });

  it('returns first error as the default when no query', () => {
    const error = makeError();
    const state = makeState({
      fieldStates: {
        name: { errors: [error] },
      },
    });
    const result = selectCurrentFormFieldState(state, 'name');
    expect(result.error).toBe(error);
  });
});

describe('isFieldEffectivelyRequired', () => {
  it('returns false for undefined validation', () => {
    expect(isFieldEffectivelyRequired(undefined, 'name', {})).toBe(false);
  });

  it('returns false for path with no matching field', () => {
    const validation = {
      fields: [],
      behavior: { showErrorOn: ['touched'] },
    } as unknown as CompiledFormValidationModel;
    expect(isFieldEffectivelyRequired(validation, 'name', {})).toBe(false);
  });

  it('returns true for required rule', () => {
    const validation = {
      order: ['name'],
      behavior: { showErrorOn: ['touched'] },
      dependents: {},
      nodes: {
        name: {
          path: 'name',
          kind: 'field',
          controlType: 'text',
          rules: [
            { id: 'r1', rule: { kind: 'required', message: 'Required' }, dependencyPaths: [] },
          ],
          behavior: { showErrorOn: ['touched'] },
          children: [],
        },
      },
    } as unknown as CompiledFormValidationModel;
    expect(isFieldEffectivelyRequired(validation, 'name', {})).toBe(true);
  });

  it('returns true for requiredWhen when condition matches', () => {
    const validation = {
      order: ['email'],
      behavior: { showErrorOn: ['touched'] },
      dependents: {},
      nodes: {
        email: {
          path: 'email',
          kind: 'field',
          controlType: 'text',
          rules: [
            {
              id: 'r1',
              rule: {
                kind: 'requiredWhen',
                path: 'contactMethod',
                equals: 'email',
                message: 'Required',
              },
              dependencyPaths: ['contactMethod'],
            },
          ],
          behavior: { showErrorOn: ['touched'] },
          children: [],
        },
      },
    } as unknown as CompiledFormValidationModel;
    expect(isFieldEffectivelyRequired(validation, 'email', { contactMethod: 'email' })).toBe(true);
  });

  it('returns false for requiredWhen when condition does not match', () => {
    const validation = {
      order: ['email'],
      behavior: { showErrorOn: ['touched'] },
      dependents: {},
      nodes: {
        email: {
          path: 'email',
          kind: 'field',
          controlType: 'text',
          rules: [
            {
              id: 'r1',
              rule: {
                kind: 'requiredWhen',
                path: 'contactMethod',
                equals: 'email',
                message: 'Required',
              },
              dependencyPaths: ['contactMethod'],
            },
          ],
          behavior: { showErrorOn: ['touched'] },
          children: [],
        },
      },
    } as unknown as CompiledFormValidationModel;
    expect(isFieldEffectivelyRequired(validation, 'email', { contactMethod: 'phone' })).toBe(false);
  });

  it('returns true for requiredUnless when condition does not match', () => {
    const validation = {
      order: ['phone'],
      behavior: { showErrorOn: ['touched'] },
      dependents: {},
      nodes: {
        phone: {
          path: 'phone',
          kind: 'field',
          controlType: 'text',
          rules: [
            {
              id: 'r1',
              rule: { kind: 'requiredUnless', path: 'hasEmail', equals: true, message: 'Required' },
              dependencyPaths: ['hasEmail'],
            },
          ],
          behavior: { showErrorOn: ['touched'] },
          children: [],
        },
      },
    } as unknown as CompiledFormValidationModel;
    expect(isFieldEffectivelyRequired(validation, 'phone', { hasEmail: false })).toBe(true);
  });

  it('returns false for requiredUnless when condition matches', () => {
    const validation = {
      order: ['phone'],
      behavior: { showErrorOn: ['touched'] },
      dependents: {},
      nodes: {
        phone: {
          path: 'phone',
          kind: 'field',
          controlType: 'text',
          rules: [
            {
              id: 'r1',
              rule: { kind: 'requiredUnless', path: 'hasEmail', equals: true, message: 'Required' },
              dependencyPaths: ['hasEmail'],
            },
          ],
          behavior: { showErrorOn: ['touched'] },
          children: [],
        },
      },
    } as unknown as CompiledFormValidationModel;
    expect(isFieldEffectivelyRequired(validation, 'phone', { hasEmail: true })).toBe(false);
  });

  it('returns false for non-required rules', () => {
    const validation = {
      order: ['name'],
      behavior: { showErrorOn: ['touched'] },
      dependents: {},
      nodes: {
        name: {
          path: 'name',
          kind: 'field',
          controlType: 'text',
          rules: [
            {
              id: 'r1',
              rule: { kind: 'pattern', pattern: '.*', message: 'Invalid' },
              dependencyPaths: [],
            },
          ],
          behavior: { showErrorOn: ['touched'] },
          children: [],
        },
      },
    } as unknown as CompiledFormValidationModel;
    expect(isFieldEffectivelyRequired(validation, 'name', {})).toBe(false);
  });
});

describe('selectCurrentFormFieldPresentation', () => {
  it('returns basic presentation for simple field', () => {
    const state = makeState();
    const result = selectCurrentFormFieldPresentation(state, { path: 'name' });
    expect(result.effectiveDisabled).toBe(false);
    expect(result.effectiveRequired).toBe(false);
    expect(result.interactive).toBe(true);
    expect(result.readOnly).toBe(false);
    expect(result.showError).toBe(false);
  });

  it('marks disabled and readOnly correctly', () => {
    const state = makeState();
    const result = selectCurrentFormFieldPresentation(state, {
      path: 'name',
      disabled: true,
      readOnly: true,
    });
    expect(result.effectiveDisabled).toBe(true);
    expect(result.interactive).toBe(false);
    expect(result.readOnly).toBe(true);
  });

  it('shows error when touched and error exists', () => {
    const error = makeError();
    const state = makeState({
      fieldStates: {
        name: { errors: [error], touched: true },
      },
    });
    const result = selectCurrentFormFieldPresentation(state, { path: 'name' });
    expect(result.showError).toBe(true);
    expect(result.error).toBe(error);
  });

  it('does not show error when not touched', () => {
    const error = makeError();
    const state = makeState({
      fieldStates: {
        name: { errors: [error] },
      },
    });
    const result = selectCurrentFormFieldPresentation(state, { path: 'name' });
    expect(result.showError).toBe(false);
  });

  it('shows error on submitAttempted even without touch', () => {
    const error = makeError();
    const state = makeState({
      fieldStates: {
        name: { errors: [error] },
      },
      submitAttempted: true,
    });
    const result = selectCurrentFormFieldPresentation(state, { path: 'name' });
    expect(result.showError).toBe(true);
  });

  it('prefers owner-scoped error over direct field error', () => {
    const ownerError = makeError({ path: 'name', sourceKind: 'array', message: 'Owner error' });
    const directError = makeError({ path: 'name', sourceKind: 'field', message: 'Direct error' });
    const state = makeState({
      fieldStates: {
        name: { errors: [ownerError, directError], touched: true },
      },
    });
    const result = selectCurrentFormFieldPresentation(state, { path: 'name' });
    expect(result.error).toBe(ownerError);
  });

  it('falls back to direct field error when no owner-scoped error', () => {
    const directError = makeError({ path: 'name', sourceKind: 'field', message: 'Direct error' });
    const state = makeState({
      fieldStates: {
        name: { errors: [directError], touched: true },
      },
    });
    const result = selectCurrentFormFieldPresentation(state, { path: 'name' });
    expect(result.error).toBe(directError);
  });

  it('marks effectiveRequired from prop', () => {
    const state = makeState();
    const result = selectCurrentFormFieldPresentation(state, { path: 'name', required: true });
    expect(result.effectiveRequired).toBe(true);
  });

  it('marks effectiveRequired from validation model', () => {
    const validation = {
      order: ['name'],
      behavior: { showErrorOn: ['touched'] },
      dependents: {},
      nodes: {
        name: {
          path: 'name',
          kind: 'field',
          controlType: 'text',
          rules: [
            { id: 'r1', rule: { kind: 'required', message: 'Required' }, dependencyPaths: [] },
          ],
          behavior: { showErrorOn: ['touched'] },
          children: [],
        },
      },
    } as unknown as CompiledFormValidationModel;
    const state = makeState();
    const result = selectCurrentFormFieldPresentation(state, { path: 'name', validation });
    expect(result.effectiveRequired).toBe(true);
  });

  it('shows error on dirty trigger with custom behavior', () => {
    const error = makeError();
    const state = makeState({
      fieldStates: {
        name: { errors: [error], dirty: true },
      },
    });
    const validation = {
      fields: [],
      behavior: { showErrorOn: ['dirty'] },
    } as unknown as CompiledFormValidationModel;
    const result = selectCurrentFormFieldPresentation(state, { path: 'name', validation });
    expect(result.showError).toBe(true);
  });

  it('shows error on visited trigger', () => {
    const error = makeError();
    const state = makeState({
      fieldStates: {
        name: { errors: [error], visited: true },
      },
    });
    const validation = {
      fields: [],
      behavior: { showErrorOn: ['visited'] },
    } as unknown as CompiledFormValidationModel;
    const result = selectCurrentFormFieldPresentation(state, { path: 'name', validation });
    expect(result.showError).toBe(true);
  });
});
