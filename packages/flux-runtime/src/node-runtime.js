import { shallowEqual } from '@nop-chaos/flux-core';
function evaluateCompiledValue(compiler, value, scope, env, state) {
    if (!value) {
        return undefined;
    }
    return compiler.evaluateValue(value, scope, env, state);
}
export function createNodeRuntime(input) {
    function resolveNodeMeta(node, scope, state) {
        const resolved = {
            id: evaluateCompiledValue(input.expressionCompiler, node.meta.id, scope, input.env, state?.meta.id),
            name: evaluateCompiledValue(input.expressionCompiler, node.meta.name, scope, input.env, state?.meta.name),
            label: evaluateCompiledValue(input.expressionCompiler, node.meta.label, scope, input.env, state?.meta.label),
            title: evaluateCompiledValue(input.expressionCompiler, node.meta.title, scope, input.env, state?.meta.title),
            className: evaluateCompiledValue(input.expressionCompiler, node.meta.className, scope, input.env, state?.meta.className),
            visible: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.visible, scope, input.env, state?.meta.visible) ?? true),
            hidden: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.hidden, scope, input.env, state?.meta.hidden) ?? false),
            disabled: Boolean(evaluateCompiledValue(input.expressionCompiler, node.meta.disabled, scope, input.env, state?.meta.disabled) ?? false),
            testid: evaluateCompiledValue(input.expressionCompiler, node.meta.testid, scope, input.env, state?.meta.testid),
            changed: true
        };
        if (state?.resolvedMeta && shallowEqual(state.resolvedMeta, resolved)) {
            return {
                ...state.resolvedMeta,
                changed: false
            };
        }
        if (state) {
            state.resolvedMeta = resolved;
        }
        return resolved;
    }
    function resolveNodeProps(node, scope, state) {
        if (node.props.kind === 'static') {
            return {
                value: node.props.value,
                changed: false,
                reusedReference: true
            };
        }
        const execution = input.expressionCompiler.evaluateWithState(node.props, scope, input.env, state?.props ?? node.props.createState());
        if (state) {
            state.resolvedProps = execution.value;
        }
        return execution;
    }
    return {
        resolveNodeMeta,
        resolveNodeProps
    };
}
//# sourceMappingURL=node-runtime.js.map