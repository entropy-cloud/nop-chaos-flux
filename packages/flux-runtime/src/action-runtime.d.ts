import type { ActionContext, ActionResult, ActionSchema, ApiObject, RendererEnv, RendererPlugin, ScopeRef } from '@nop-chaos/flux-core';
interface ActionDispatcherInput {
    env: RendererEnv;
    plugins?: RendererPlugin[];
    onActionError?: (error: unknown, ctx: ActionContext) => void;
    evaluate: <T = unknown>(target: unknown, scope: ScopeRef) => T;
    executeAjaxAction: (api: ApiObject, action: ActionSchema, ctx: ActionContext) => Promise<ActionResult>;
    submitFormAction: (api: ApiObject | undefined, action: ActionSchema, ctx: ActionContext) => Promise<ActionResult>;
    createDialogScope: (ctx: ActionContext) => ScopeRef;
    getDialogActionScope?: (ctx: ActionContext) => ActionContext['actionScope'];
    getDialogComponentRegistry?: (ctx: ActionContext) => ActionContext['componentRegistry'];
    runtime: {
        compile(schema: any): any;
    };
}
export declare function createActionDispatcher(input: ActionDispatcherInput): {
    dispatch: (action: ActionSchema | ActionSchema[], ctx: ActionContext) => Promise<ActionResult>;
};
export {};
