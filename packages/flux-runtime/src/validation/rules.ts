import type {
  ValidationRule
} from '@nop-chaos/flux-core';

export function collectValidationDependencyPaths(rule: ValidationRule): string[] {
  switch (rule.kind) {
    case 'equalsField':
    case 'notEqualsField':
    case 'requiredWhen':
    case 'requiredUnless':
      return [rule.path];
    default:
      return [];
  }
}
