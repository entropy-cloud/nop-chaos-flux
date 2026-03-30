import type { ActionScope } from '@nop-chaos/flux-core';
export declare function createActionScope(input: {
    id: string;
    parent?: ActionScope;
}): ActionScope;
export declare function isNamespacedAction(actionName: string): boolean;
