import type { CompiledValidationRule, RuntimeFieldRegistration, ValidationError, ValidationRule } from '@nop-chaos/amis-schema';

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

function isCompiledValidationRule(rule: CompiledValidationRule | ValidationRule): rule is CompiledValidationRule {
  return 'rule' in rule;
}

function collectDependencyPaths(rule: ValidationRule): string[] {
  return rule.kind === 'equalsField' ||
    rule.kind === 'notEqualsField' ||
    rule.kind === 'requiredWhen' ||
    rule.kind === 'requiredUnless'
    ? [rule.path]
    : [];
}

export function normalizeCompiledValidationRules(
  path: string,
  rules: Array<CompiledValidationRule | ValidationRule>
): CompiledValidationRule[] {
  return rules.map((rule, index) =>
    isCompiledValidationRule(rule)
      ? rule
      : {
          id: `${path}#${index}:${rule.kind}`,
          rule,
          dependencyPaths: collectDependencyPaths(rule)
        }
  );
}
