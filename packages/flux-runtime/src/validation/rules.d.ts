import type { BaseSchema, CompiledValidationRule, ValidationRule, ValidationTrigger, ValidationVisibilityTrigger } from '@nop-chaos/flux-core';
export declare function collectSchemaValidationRules(schema: BaseSchema): ValidationRule[];
export declare function mergeValidationRules(...groups: Array<ValidationRule[] | undefined>): ValidationRule[];
export declare function normalizeValidationTriggers(input: unknown, fallback?: ValidationTrigger[]): ValidationTrigger[];
export declare function normalizeValidationVisibilityTriggers(input: unknown, fallback?: ValidationVisibilityTrigger[]): ValidationVisibilityTrigger[];
export declare function collectValidationDependencyPaths(rule: ValidationRule): string[];
export declare function compileValidationRules(path: string, rules: ValidationRule[]): CompiledValidationRule[];
