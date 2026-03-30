import React from 'react';
import { RenderNodes } from './render-nodes';
export { RenderNodes } from './render-nodes';
export function mergeActionContext(base, partial) {
    return {
        runtime: base.runtime,
        scope: partial?.scope ?? base.scope,
        actionScope: partial?.actionScope ?? base.actionScope,
        componentRegistry: partial?.componentRegistry ?? base.componentRegistry,
        node: partial?.node ?? base.node,
        form: partial?.form ?? base.form,
        page: partial?.page ?? base.page,
        event: partial?.event,
        dialogId: partial?.dialogId,
        prevResult: partial?.prevResult
    };
}
export const EMPTY_SCOPE_DATA = {};
export function createHelpers(input) {
    const dispatch = (action, ctx) => input.runtime.dispatch(action, mergeActionContext(input, ctx));
    dispatch.__actionScope = input.actionScope;
    dispatch.__componentRegistry = input.componentRegistry;
    return {
        render(renderInput, options) {
            return React.createElement(RenderNodes, { input: renderInput, options });
        },
        evaluate(target, scope) {
            return input.runtime.evaluate(target, scope ?? input.scope);
        },
        createScope(patch, options) {
            return input.runtime.createChildScope(input.scope, patch, options);
        },
        dispatch
    };
}
