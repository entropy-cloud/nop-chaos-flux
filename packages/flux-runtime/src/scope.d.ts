import type { ScopeRef, ScopeStore } from '@nop-chaos/flux-core';
export declare function createScopeStore(initialData: Record<string, any>): ScopeStore<Record<string, any>>;
export declare function toRecord(value: unknown): Record<string, any>;
export declare function createScopeRef(input: {
    id: string;
    path: string;
    initialData?: Record<string, any>;
    parent?: ScopeRef;
    store?: ScopeStore<Record<string, any>>;
    isolate?: boolean;
    update?: (path: string, value: unknown) => void;
}): ScopeRef;
