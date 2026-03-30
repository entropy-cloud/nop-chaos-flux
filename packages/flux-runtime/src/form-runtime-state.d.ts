import type { CompiledFormValidationModel } from '@nop-chaos/flux-core';
import type { InitialFieldState } from './form-runtime-types';
export declare function buildInitialFieldState(values: Record<string, any>, validation?: CompiledFormValidationModel): InitialFieldState;
