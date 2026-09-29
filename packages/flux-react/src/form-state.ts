import { getCompiledValidationField, getIn } from '@nop-chaos/flux-core';
import type {
  CompiledFormValidationModel,
  FormErrorQuery,
  FormFieldPresentationSnapshot,
  FormFieldStateSnapshot,
  FormStoreState,
  ValidationError,
} from '@nop-chaos/flux-core';
import { resolveShowErrorTriggers, shouldShowFieldError } from './field-error-visibility.js';

type CompiledValidationField = ReturnType<typeof getCompiledValidationField>;

export const EMPTY_FORM_STORE_STATE: FormStoreState = {
  values: {},
  fieldStates: {},
  submitting: false,
  submitAttempted: false,
};

export const EMPTY_FORM_FIELD_STATE: FormFieldStateSnapshot = {
  error: undefined,
  validating: false,
  touched: false,
  dirty: false,
  visited: false,
  submitting: false,
  submitAttempted: false,
};

function matchesFormErrorQuery(error: ValidationError, query?: FormErrorQuery): boolean {
  if (!query) {
    return true;
  }

  if (query.path && error.path !== query.path) {
    return false;
  }

  if (query.ownerPath && (error.ownerPath ?? error.path) !== query.ownerPath) {
    return false;
  }

  if (query.rule && error.rule !== query.rule) {
    return false;
  }

  if (
    query.sourceKinds?.length &&
    (!error.sourceKind || !query.sourceKinds.includes(error.sourceKind))
  ) {
    return false;
  }

  return true;
}

export function selectCurrentFormErrors(
  state: FormStoreState,
  query?: FormErrorQuery,
): ValidationError[] {
  const matches: ValidationError[] = [];

  if (query?.path) {
    const fieldState = state.fieldStates[query.path];
    const errors = fieldState?.errors ?? [];
    return errors.filter((error) => matchesFormErrorQuery(error, query));
  }

  for (const fieldState of Object.values(state.fieldStates)) {
    if (!fieldState.errors) continue;
    for (const error of fieldState.errors) {
      if (matchesFormErrorQuery(error, query)) {
        matches.push(error);
      }
    }
  }

  return matches;
}

export function selectCurrentFormFieldState(
  state: FormStoreState,
  path: string,
  query?: FormErrorQuery,
): FormFieldStateSnapshot {
  const fieldState = state.fieldStates[path];
  return {
    error: selectCurrentFormErrors(state, query ?? { path })[0],
    validating: fieldState?.validating === true,
    touched: fieldState?.touched === true,
    dirty: fieldState?.dirty === true,
    visited: fieldState?.visited === true,
    submitting: state.submitting,
    submitAttempted: state.submitAttempted,
  };
}

export function isFieldEffectivelyRequired(
  validation: CompiledFormValidationModel | undefined,
  path: string,
  values: Record<string, any>,
): boolean {
  const field = getCompiledValidationField(validation, path);

  return isValidationFieldEffectivelyRequired(field, values);
}

export function getDynamicRequiredDependencyPaths(
  field: CompiledValidationField | undefined,
): readonly string[] {
  if (!field) {
    return [];
  }

  const dependencies = new Set<string>();

  for (const { rule } of field.rules) {
    if ((rule.kind === 'requiredWhen' || rule.kind === 'requiredUnless') && rule.path) {
      dependencies.add(rule.path);
    }
  }

  return [...dependencies];
}

export function isValidationFieldEffectivelyRequired(
  field: CompiledValidationField | undefined,
  values: Record<string, any>,
): boolean {
  if (!field) {
    return false;
  }

  return Boolean(
    field.rules.some(({ rule }) => {
      if (rule.kind === 'required') {
        return true;
      }

      if (rule.kind === 'requiredWhen') {
        return Object.is(getIn(values, rule.path), rule.equals);
      }

      if (rule.kind === 'requiredUnless') {
        return !Object.is(getIn(values, rule.path), rule.equals);
      }

      return false;
    }),
  );
}

const PRESENTATION_AGGREGATE_SOURCE_KINDS: readonly ValidationError['sourceKind'][] = [
  'array',
  'object',
  'form',
  'runtime-registration',
  'external',
];

function matchesPathOwnerError(error: ValidationError, path: string): boolean {
  return error.path === path && (error.ownerPath ?? error.path) === path;
}

function isAggregatePresentationError(error: ValidationError, path: string): boolean {
  return (
    matchesPathOwnerError(error, path) &&
    error.sourceKind !== undefined &&
    PRESENTATION_AGGREGATE_SOURCE_KINDS.includes(error.sourceKind)
  );
}

function findFirstError(
  errors: readonly ValidationError[] | undefined,
  isMatch: (error: ValidationError) => boolean,
): ValidationError | undefined {
  if (!errors) {
    return undefined;
  }

  for (const error of errors) {
    if (isMatch(error)) {
      return error;
    }
  }

  return undefined;
}

export function selectCurrentFormFieldPresentation(
  state: FormStoreState,
  input: {
    path: string;
    validation?: CompiledFormValidationModel;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    query?: FormErrorQuery;
  },
): FormFieldPresentationSnapshot {
  const fieldState = state.fieldStates[input.path];
  const errors = fieldState?.errors;
  const query = input.query;
  const pathError = findFirstError(errors, (error) =>
    query ? matchesFormErrorQuery(error, query) : matchesPathOwnerError(error, input.path),
  );
  const error =
    findFirstError(errors, (error) => isAggregatePresentationError(error, input.path)) ??
    pathError;
  const showErrorOn = resolveShowErrorTriggers(
    getCompiledValidationField(input.validation, input.path)?.behavior ?? input.validation?.behavior,
  );
  const showError = Boolean(
    error &&
    shouldShowFieldError(
      { showErrorOn },
      {
        touched: fieldState?.touched === true,
        dirty: fieldState?.dirty === true,
        visited: fieldState?.visited === true,
        submitting: state.submitting,
        submitAttempted: state.submitAttempted,
      },
    ),
  );
  const effectiveDisabled = Boolean(input.disabled);
  const readOnly = Boolean(input.readOnly);

  return {
    error,
    validating: fieldState?.validating === true,
    touched: fieldState?.touched === true,
    dirty: fieldState?.dirty === true,
    visited: fieldState?.visited === true,
    submitting: state.submitting,
    submitAttempted: state.submitAttempted,
    effectiveDisabled,
    effectiveRequired:
      Boolean(input.required) ||
      isFieldEffectivelyRequired(input.validation, input.path, state.values),
    showError,
    interactive: !effectiveDisabled && !readOnly,
    readOnly,
  };
}
