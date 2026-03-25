import type { SyncValidationRuleKind, SyncValidator } from './validators';
import { builtInValidators } from './validators';

export interface ValidationRegistry {
  get(ruleKind: SyncValidationRuleKind): SyncValidator | undefined;
  has(ruleKind: SyncValidationRuleKind): boolean;
  register(ruleKind: SyncValidationRuleKind, validator: SyncValidator): void;
  list(): SyncValidationRuleKind[];
}

export function createValidationRegistry(): ValidationRegistry {
  const validators = new Map<SyncValidationRuleKind, SyncValidator>();

  return {
    get(ruleKind) {
      return validators.get(ruleKind);
    },
    has(ruleKind) {
      return validators.has(ruleKind);
    },
    register(ruleKind, validator) {
      if (validators.has(ruleKind)) {
        throw new Error(`Validation rule ${ruleKind} is already registered.`);
      }

      validators.set(ruleKind, validator);
    },
    list() {
      return Array.from(validators.keys());
    }
  };
}

export function registerBuiltInValidators(registry: ValidationRegistry): ValidationRegistry {
  for (const [ruleKind, validator] of Object.entries(builtInValidators) as Array<[SyncValidationRuleKind, SyncValidator]>) {
    registry.register(ruleKind, validator);
  }

  return registry;
}

export function createBuiltInValidationRegistry(): ValidationRegistry {
  return registerBuiltInValidators(createValidationRegistry());
}
