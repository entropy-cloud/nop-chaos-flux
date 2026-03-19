import type { CompiledValidationRule, ValidationRule } from '@nop-chaos/amis-schema';
import { collectValidationDependencyPaths, normalizeRuntimeValidationErrors } from './validation';

function isCompiledValidationRule(rule: CompiledValidationRule | ValidationRule): rule is CompiledValidationRule {
  return 'rule' in rule;
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
          dependencyPaths: collectValidationDependencyPaths(rule)
        }
  );
}

export { normalizeRuntimeValidationErrors };
