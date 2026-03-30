import type { CompiledFormValidationField, CompiledValidationRule, RuntimeFieldRegistration, ValidationError } from '@nop-chaos/flux-core';
export declare function createValidationError(field: CompiledFormValidationField, compiledRule: CompiledValidationRule, message: string, overrides?: Partial<ValidationError>): ValidationError;
export declare function normalizeRuntimeValidationErrors(errors: ValidationError[] | undefined, registration: RuntimeFieldRegistration, path: string, childPath?: string): ValidationError[];
