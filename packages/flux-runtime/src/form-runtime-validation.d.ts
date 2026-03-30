import type { FormValidationResult, ValidationResult } from '@nop-chaos/flux-core';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';
export declare function cancelValidationDebounce(sharedState: ManagedFormRuntimeSharedState, path: string): void;
export declare function cancelAllValidationDebounces(sharedState: ManagedFormRuntimeSharedState): void;
export declare function waitForValidationDebounce(sharedState: ManagedFormRuntimeSharedState, path: string, debounce: number | undefined, runId: number): Promise<boolean>;
export declare function validatePath(sharedState: ManagedFormRuntimeSharedState, path: string): Promise<ValidationResult>;
export declare function validateSubtreeByNode(sharedState: ManagedFormRuntimeSharedState, path: string): Promise<FormValidationResult | undefined>;
