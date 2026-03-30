import type { SyncValidationRuleKind, SyncValidator } from './validators';
export interface ValidationRegistry {
    get(ruleKind: SyncValidationRuleKind): SyncValidator | undefined;
    has(ruleKind: SyncValidationRuleKind): boolean;
    register(ruleKind: SyncValidationRuleKind, validator: SyncValidator): void;
    list(): SyncValidationRuleKind[];
}
export declare function createValidationRegistry(): ValidationRegistry;
export declare function registerBuiltInValidators(registry: ValidationRegistry): ValidationRegistry;
export declare function createBuiltInValidationRegistry(): ValidationRegistry;
