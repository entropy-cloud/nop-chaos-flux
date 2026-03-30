import type { ManagedFormRuntimeSharedState } from './form-runtime-types';
export declare function remapValidationRunState(sharedState: ManagedFormRuntimeSharedState, arrayPath: string, transformIndex: (index: number) => number | undefined, cancelValidationDebounce: (path: string) => void): void;
export declare function remapInitialFieldState(sharedState: ManagedFormRuntimeSharedState, arrayPath: string, transformIndex: (index: number) => number | undefined): void;
export declare function remapArrayFieldState(sharedState: ManagedFormRuntimeSharedState, arrayPath: string, transformIndex: (index: number) => number | undefined, cancelValidationDebounce: (path: string) => void): void;
export declare function replaceManagedArrayValue(input: {
    sharedState: ManagedFormRuntimeSharedState;
    arrayPath: string;
    nextValue: unknown[];
    cancelValidationDebounce: (path: string) => void;
    clearErrors: (path?: string) => void;
    revalidateDependents: (path: string) => Promise<void>;
}): void;
