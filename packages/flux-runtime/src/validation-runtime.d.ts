import type { CompiledFormValidationField, CompiledValidationRule, ScopeRef, ValidationError } from '@nop-chaos/flux-core';
import { type ValidationRegistry } from './validation';
export declare function validateRule(compiledRule: CompiledValidationRule, value: unknown, field: CompiledFormValidationField, scope: ScopeRef, registry?: ValidationRegistry): ValidationError | undefined;
