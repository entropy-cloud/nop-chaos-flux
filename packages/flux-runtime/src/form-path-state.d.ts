import type { ValidationError } from '@nop-chaos/flux-core';
export declare function transformArrayIndexedPath(path: string, arrayPath: string, transformIndex: (index: number) => number | undefined): string | undefined;
export declare function remapBooleanState(input: Record<string, boolean>, arrayPath: string, transformIndex: (index: number) => number | undefined): Record<string, boolean>;
export declare function remapErrorState(input: Record<string, ValidationError[]>, arrayPath: string, transformIndex: (index: number) => number | undefined): Record<string, ValidationError[]>;
