import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createRendererRegistry, createRendererRuntime } from '@nop-chaos/flux-runtime';
import { ActionScopeContext, ComponentRegistryContext, PageContext, RuntimeContext, ScopeContext } from './contexts';
import { RenderNodes, EMPTY_SCOPE_DATA } from './helpers';
import { DialogHost } from './dialog-host';
let lastRootComponentRegistry;
export function getSchemaRendererRegistry() {
    return lastRootComponentRegistry;
}
export function createSchemaRenderer(registryDefinitions = []) {
    const registry = createRendererRegistry(registryDefinitions);
    return function SchemaRenderer(props) {
        const runtime = useMemo(() => {
            const resolvedRegistry = props.registry ?? registry;
            const expressionCompiler = createExpressionCompiler(props.formulaCompiler ?? createFormulaCompiler());
            return createRendererRuntime({
                registry: resolvedRegistry,
                env: props.env,
                expressionCompiler,
                plugins: props.plugins,
                pageStore: props.pageStore,
                onActionError: props.onActionError
            });
        }, [props.env, props.formulaCompiler, props.plugins, props.registry, props.pageStore, props.onActionError]);
        const pageData = props.data ?? EMPTY_SCOPE_DATA;
        const page = useMemo(() => runtime.createPageRuntime(), [runtime]);
        if (page.store.getState().data !== pageData) {
            page.store.setData(pageData);
        }
        const rootScope = props.parentScope ?? page.scope;
        const rootActionScope = useMemo(() => props.actionScope ?? runtime.createActionScope({ id: 'root-action-scope' }), [props.actionScope, runtime]);
        const rootComponentRegistry = useMemo(() => props.componentRegistry ?? runtime.createComponentHandleRegistry({ id: 'root-component-registry' }), [props.componentRegistry, runtime]);
        lastRootComponentRegistry = rootComponentRegistry;
        return (_jsx(RuntimeContext.Provider, { value: runtime, children: _jsx(ActionScopeContext.Provider, { value: rootActionScope, children: _jsx(ComponentRegistryContext.Provider, { value: rootComponentRegistry, children: _jsx(ScopeContext.Provider, { value: rootScope, children: _jsxs(PageContext.Provider, { value: page, children: [_jsx(RenderNodes, { input: props.schema, options: { actionScope: rootActionScope, componentRegistry: rootComponentRegistry } }), _jsx(DialogHost, {})] }) }) }) }) }));
    };
}
