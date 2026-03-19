import type { CompiledFormValidationField, CompiledValidationRule, RuntimeFieldRegistration, ValidationError, ValidationRule } from '@nop-chaos/amis-schema';

function resolveValidationErrorSourceKind(
  field: CompiledFormValidationField,
  rule: ValidationRule
): ValidationError['sourceKind'] {
  switch (rule.kind) {
    case 'minItems':
    case 'maxItems':
    case 'atLeastOneFilled':
    case 'uniqueBy':
      return 'array';
    case 'atLeastOneOf':
      return 'object';
    case 'allOrNone': {
      const value = field.controlType?.toLowerCase() ?? '';

      if (value.includes('array') || value.includes('list') || value.includes('key-value')) {
        return 'array';
      }

      return 'object';
    }
    default:
      return 'field';
  }
}

export function createValidationError(
  field: CompiledFormValidationField,
  compiledRule: CompiledValidationRule,
  message: string,
  overrides?: Partial<ValidationError>
): ValidationError {
  const rule = compiledRule.rule;

  return {
    path: field.path,
    message,
    rule: rule.kind,
    ruleId: compiledRule.id,
    ownerPath: field.path,
    sourceKind: resolveValidationErrorSourceKind(field, rule),
    ...overrides
  };
}

function normalizeRuntimeValidationError(
  error: ValidationError,
  registration: RuntimeFieldRegistration,
  path: string,
  childPath?: string
): ValidationError {
  const ownerPath = error.ownerPath ?? registration.path;
  const normalizedPath = childPath ?? error.path ?? path;

  return {
    ...error,
    path: normalizedPath,
    ownerPath,
    sourceKind: error.sourceKind ?? 'runtime-registration'
  };
}

export function normalizeRuntimeValidationErrors(
  errors: ValidationError[] | undefined,
  registration: RuntimeFieldRegistration,
  path: string,
  childPath?: string
): ValidationError[] {
  return (errors ?? []).map((error) => normalizeRuntimeValidationError(error, registration, path, childPath));
}
