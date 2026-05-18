import type { ValidationRule } from '@nop-chaos/flux-core';

export function collectValidationDependencyPaths(
  rule: ValidationRule,
  extraDependencyPaths?: readonly string[],
): string[] {
  const explicitDependencies = extraDependencyPaths ? [...extraDependencyPaths] : [];

  switch (rule.kind) {
    case 'equalsField':
    case 'notEqualsField':
    case 'requiredWhen':
    case 'requiredUnless':
      return Array.from(new Set([...explicitDependencies, rule.path]));
    default:
      return explicitDependencies;
  }
}
