import type { ManagedFormRuntimeSharedState } from './form-runtime-types';
export declare function collectSubtreePaths(sharedState: ManagedFormRuntimeSharedState, path: string): string[];
export declare function collectSubtreeNodePaths(sharedState: ManagedFormRuntimeSharedState, path: string): string[];
export declare function collectSubtreeValidationTargets(sharedState: ManagedFormRuntimeSharedState, path: string): string[];
