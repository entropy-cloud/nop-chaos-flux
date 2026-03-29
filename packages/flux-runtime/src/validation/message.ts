import type { CompiledFormValidationField, ValidationRule } from '@nop-chaos/flux-core';

export function buildValidationMessage(rule: ValidationRule, field: CompiledFormValidationField): string {
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

