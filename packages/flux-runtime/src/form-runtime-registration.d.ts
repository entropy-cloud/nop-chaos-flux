import type { RuntimeFieldRegistration } from '@nop-chaos/flux-core';
import type { ManagedFormRuntimeSharedState } from './form-runtime-types';
export declare function findRuntimeRegistration(runtimeFieldRegistrations: Map<string, RuntimeFieldRegistration>, path: string): {
    registration: RuntimeFieldRegistration | undefined;
    childPath: string | undefined;
};
export declare function syncRegisteredFieldValue(sharedState: ManagedFormRuntimeSharedState, path: string): unknown;
