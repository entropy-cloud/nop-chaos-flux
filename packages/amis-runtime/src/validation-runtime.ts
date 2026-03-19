import type {
  CompiledFormValidationField,
  CompiledValidationRule,
  ScopeRef,
  ValidationError
} from '@nop-chaos/amis-schema';
import { createBuiltInValidationRegistry, type ValidationRegistry } from './validation';

export function validateRule(
  compiledRule: CompiledValidationRule,
  value: unknown,
  field: CompiledFormValidationField,
  scope: ScopeRef,
  registry: ValidationRegistry = createBuiltInValidationRegistry()
): ValidationError | undefined {
  const rule = compiledRule.rule;

  if (rule.kind === 'async') {
    return undefined;
  }

  const validator = registry.get(rule.kind);

  if (!validator) {
    return undefined;
  }

  return validator({
    compiledRule,
    value,
    field,
    scope,
    rule
  });
}
