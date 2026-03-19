import type {
  CompiledFormValidationField,
  CompiledValidationRule,
  ScopeRef,
  ValidationError,
  ValidationRule
} from '@nop-chaos/amis-schema';
import { getIn } from '@nop-chaos/amis-schema';

function buildValidationMessage(rule: ValidationRule, field: CompiledFormValidationField): string {
  const label = field.label ?? field.path;

  switch (rule.kind) {
    case 'required':
      return `${label} is required`;
    case 'minLength':
      return `${label} must be at least ${rule.value} characters`;
    case 'maxLength':
      return `${label} must be at most ${rule.value} characters`;
    case 'minItems':
      return rule.message ?? `${label} must contain at least ${rule.value} item${rule.value === 1 ? '' : 's'}`;
    case 'maxItems':
      return rule.message ?? `${label} must contain at most ${rule.value} item${rule.value === 1 ? '' : 's'}`;
    case 'atLeastOneFilled':
      return rule.message ?? `${label} must contain at least one filled item`;
    case 'allOrNone':
      return rule.message ?? `${label} entries must fill all related fields or leave them all empty`;
    case 'uniqueBy':
      return rule.message ?? `${label} items must have unique ${rule.itemPath}`;
    case 'atLeastOneOf':
      return rule.message ?? `${label} must fill at least one related field`;
    case 'pattern':
      return rule.message ?? `${label} format is invalid`;
    case 'email':
      return rule.message ?? `${label} must be a valid email address`;
    case 'equalsField':
      return rule.message ?? `${label} must match ${rule.path}`;
    case 'notEqualsField':
      return rule.message ?? `${label} must not match ${rule.path}`;
    case 'requiredWhen':
      return rule.message ?? `${label} is required`;
    case 'requiredUnless':
      return rule.message ?? `${label} is required`;
    case 'async':
      return rule.message ?? `${label} failed async validation`;
  }
}

function isEmptyValue(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

function hasFilledArrayItem(value: unknown, itemPath?: string): boolean {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.some((item) => {
    const candidate = itemPath ? getIn(item, itemPath) : item;
    return !isEmptyValue(candidate);
  });
}

function violatesAllOrNone(value: unknown, itemPaths: string[]): boolean {
  if (itemPaths.length === 0) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => {
      const flags = itemPaths.map((itemPath) => !isEmptyValue(getIn(item, itemPath)));
      return flags.some(Boolean) && flags.some((flag) => !flag);
    });
  }

  if (value == null || typeof value !== 'object') {
    return false;
  }

  const flags = itemPaths.map((itemPath) => !isEmptyValue(getIn(value, itemPath)));
  return flags.some(Boolean) && flags.some((flag) => !flag);
}

function violatesUniqueBy(value: unknown, itemPath: string): boolean {
  if (!Array.isArray(value) || !itemPath) {
    return false;
  }

  const seen = new Set<unknown>();

  for (const item of value) {
    const candidate = getIn(item, itemPath);

    if (isEmptyValue(candidate)) {
      continue;
    }

    if (seen.has(candidate)) {
      return true;
    }

    seen.add(candidate);
  }

  return false;
}

function lacksAtLeastOneOf(value: unknown, paths: string[]): boolean {
  if (value == null || typeof value !== 'object' || paths.length === 0) {
    return true;
  }

  return !paths.some((path) => !isEmptyValue(getIn(value, path)));
}

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

export function validateRule(
  compiledRule: CompiledValidationRule,
  value: unknown,
  field: CompiledFormValidationField,
  scope: ScopeRef
): ValidationError | undefined {
  const rule = compiledRule.rule;

  switch (rule.kind) {
    case 'required':
      return isEmptyValue(value)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'minLength':
      return typeof value === 'string' && value.length < rule.value
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'maxLength':
      return typeof value === 'string' && value.length > rule.value
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'minItems':
      return Array.isArray(value) && value.length < rule.value
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'maxItems':
      return Array.isArray(value) && value.length > rule.value
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'atLeastOneFilled':
      return !hasFilledArrayItem(value, rule.itemPath)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: rule.itemPath ? [rule.itemPath] : undefined
          })
        : undefined;
    case 'allOrNone':
      return violatesAllOrNone(value, rule.itemPaths)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: rule.itemPaths
          })
        : undefined;
    case 'uniqueBy':
      return violatesUniqueBy(value, rule.itemPath)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: [rule.itemPath]
          })
        : undefined;
    case 'atLeastOneOf':
      return lacksAtLeastOneOf(value, rule.paths)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: rule.paths
          })
        : undefined;
    case 'pattern':
      return typeof value === 'string' && value !== '' && !new RegExp(rule.value).test(value)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    case 'email': {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return typeof value === 'string' && value !== '' && !emailPattern.test(value)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field))
        : undefined;
    }
    case 'equalsField': {
      const peerValue = scope.get(rule.path);

      if (isEmptyValue(value) && isEmptyValue(peerValue)) {
        return undefined;
      }

      return !Object.is(value, peerValue)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: [rule.path]
          })
        : undefined;
    }
    case 'notEqualsField': {
      const peerValue = scope.get(rule.path);

      if (isEmptyValue(value) && isEmptyValue(peerValue)) {
        return undefined;
      }

      return Object.is(value, peerValue)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: [rule.path]
          })
        : undefined;
    }
    case 'requiredWhen': {
      const dependencyValue = scope.get(rule.path);
      const shouldRequire = Object.is(dependencyValue, rule.equals);

      return shouldRequire && isEmptyValue(value)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: [rule.path]
          })
        : undefined;
    }
    case 'requiredUnless': {
      const dependencyValue = scope.get(rule.path);
      const shouldRequire = !Object.is(dependencyValue, rule.equals);

      return shouldRequire && isEmptyValue(value)
        ? createValidationError(field, compiledRule, buildValidationMessage(rule, field), {
            relatedPaths: [rule.path]
          })
        : undefined;
    }
    case 'async':
      return undefined;
  }
}
