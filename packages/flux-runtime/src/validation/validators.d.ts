import type { CompiledFormValidationField, CompiledValidationRule, ScopeRef, ValidationError, ValidationRule } from '@nop-chaos/flux-core';
export type AsyncValidationRule = Extract<ValidationRule, {
    kind: 'async';
}>;
export type SyncValidationRule = Exclude<ValidationRule, AsyncValidationRule>;
export type SyncValidationRuleKind = SyncValidationRule['kind'];
export interface SyncValidationContext<R extends SyncValidationRule = SyncValidationRule> {
    compiledRule: CompiledValidationRule;
    value: unknown;
    field: CompiledFormValidationField;
    scope: ScopeRef;
    rule: R;
}
export type SyncValidator<R extends SyncValidationRule = SyncValidationRule> = (input: SyncValidationContext<R>) => ValidationError | undefined;
export declare function isEmptyValue(value: unknown): boolean;
export declare const builtInValidators: Record<SyncValidationRuleKind, SyncValidator<any>>;
