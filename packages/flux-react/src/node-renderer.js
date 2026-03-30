import { jsx as _jsx } from "react/jsx-runtime";
import { useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { mergeClassAliases, resolveClassAliases } from '@nop-chaos/flux-core';
import { createFormComponentHandle } from '@nop-chaos/flux-runtime';
import { ActionScopeContext, ClassAliasesContext, ComponentRegistryContext, FormContext, NodeMetaContext, PageContext, ScopeContext } from './contexts';
import { useRendererRuntime } from './hooks';
import { createHelpers } from './helpers';
import { RenderNodes } from './render-nodes';
import { FieldFrame } from './field-frame';
function createNodeOwnedActionScope(runtime, parent, node) {
    return runtime.createActionScope({
        id: `${node.id}:action-scope`,
        parent
    });
}
function createNodeOwnedComponentRegistry(runtime, parent, node) {
    return runtime.createComponentHandleRegistry({
        id: `${node.id}:component-registry`,
        parent
    });
}
function getNodeImports(node) {
    return 'xui:imports' in node.schema
        ? (node.schema['xui:imports'])
        : undefined;
}
export function NodeRenderer(props) {
    const runtime = useRendererRuntime();
    const parentClassAliases = useContext(ClassAliasesContext);
    const stateRef = useRef(undefined);
    if (!stateRef.current || stateRef.current.nodeId !== props.node.id) {
        stateRef.current = {
            nodeId: props.node.id,
            state: props.node.createRuntimeState()
        };
    }
    const nodeState = stateRef.current.state;
    const renderStartedAtRef = useRef(0);
    renderStartedAtRef.current = Date.now();
    useSyncExternalStore(props.scope.store?.subscribe ?? (() => () => undefined), props.scope.store?.getSnapshot ?? (() => null));
    const meta = runtime.resolveNodeMeta(props.node, props.scope, nodeState);
    const resolvedProps = runtime.resolveNodeProps(props.node, props.scope, nodeState);
    const nodeClassAliases = props.node.schema.classAliases;
    const mergedClassAliases = mergeClassAliases(parentClassAliases, nodeClassAliases);
    const resolvedClassName = resolveClassAliases(meta.className, mergedClassAliases);
    const resolvedMeta = resolvedClassName !== meta.className
        ? { ...meta, className: resolvedClassName }
        : meta;
    const formRef = useRef(undefined);
    let activeForm = props.form;
    const nodeActionScopeRef = useRef(undefined);
    const nodeComponentRegistryRef = useRef(undefined);
    if (props.node.component.scopePolicy === 'form') {
        const formId = typeof resolvedProps.value.id === 'string' ? resolvedProps.value.id : props.node.id;
        const formName = typeof resolvedProps.value.name === 'string' ? resolvedProps.value.name : undefined;
        const initialValues = resolvedProps.value.data && typeof resolvedProps.value.data === 'object'
            ? resolvedProps.value.data
            : undefined;
        if (!formRef.current ||
            formRef.current.nodeId !== props.node.id ||
            formRef.current.formId !== formId ||
            formRef.current.formName !== formName ||
            formRef.current.parentScope !== props.scope ||
            formRef.current.page !== props.page ||
            formRef.current.validation !== props.node.validation) {
            formRef.current = {
                nodeId: props.node.id,
                formId,
                formName,
                parentScope: props.scope,
                page: props.page,
                validation: props.node.validation,
                form: runtime.createFormRuntime({
                    id: formId,
                    name: formName,
                    initialValues,
                    parentScope: props.scope,
                    page: props.page,
                    validation: props.node.validation
                })
            };
        }
        activeForm = formRef.current.form;
    }
    if (props.node.component.actionScopePolicy === 'new' &&
        (!nodeActionScopeRef.current || nodeActionScopeRef.current.nodeId !== props.node.id)) {
        nodeActionScopeRef.current = {
            nodeId: props.node.id,
            scope: createNodeOwnedActionScope(runtime, props.actionScope, props.node)
        };
    }
    if (props.node.component.componentRegistryPolicy === 'new' &&
        (!nodeComponentRegistryRef.current || nodeComponentRegistryRef.current.nodeId !== props.node.id)) {
        nodeComponentRegistryRef.current = {
            nodeId: props.node.id,
            registry: createNodeOwnedComponentRegistry(runtime, props.componentRegistry, props.node)
        };
    }
    const activeScope = activeForm?.scope ?? props.scope;
    const activeActionScope = props.node.component.actionScopePolicy === 'new'
        ? nodeActionScopeRef.current?.scope
        : props.actionScope;
    const activeComponentRegistry = props.node.component.componentRegistryPolicy === 'new'
        ? nodeComponentRegistryRef.current?.registry
        : props.componentRegistry;
    const nodeImports = getNodeImports(props.node);
    useEffect(() => {
        if (!activeForm || !activeComponentRegistry) {
            return;
        }
        const schemaWithCid = props.node.schema;
        const compiledCid = typeof schemaWithCid._cid === 'number'
            ? schemaWithCid._cid
            : undefined;
        const unregister = activeComponentRegistry.register(createFormComponentHandle(activeForm), {
            cid: compiledCid
        });
        return unregister;
    }, [activeComponentRegistry, activeForm]);
    useEffect(() => {
        void runtime.ensureImportedNamespaces({
            imports: nodeImports,
            actionScope: activeActionScope,
            componentRegistry: activeComponentRegistry,
            scope: activeScope,
            node: props.node
        }).catch(() => undefined);
        return () => {
            runtime.releaseImportedNamespaces({
                imports: nodeImports,
                actionScope: activeActionScope
            });
        };
    }, [runtime, nodeImports, activeActionScope, activeComponentRegistry, activeScope, props.node]);
    const helpers = useMemo(() => createHelpers({
        runtime,
        scope: activeScope,
        actionScope: activeActionScope,
        componentRegistry: activeComponentRegistry,
        form: activeForm,
        page: props.page,
        node: props.node
    }), [runtime, activeScope, activeActionScope, activeComponentRegistry, activeForm, props.page, props.node]);
    const events = useMemo(() => {
        return Object.fromEntries(props.node.eventKeys.map((key) => {
            const action = props.node.eventActions[key];
            if (!action) {
                return [key, undefined];
            }
            return [
                key,
                (event, eventContext) => helpers.dispatch(action, {
                    ...eventContext,
                    event
                })
            ];
        }));
    }, [helpers, props.node.eventActions, props.node.eventKeys]);
    const regions = useMemo(() => {
        return Object.fromEntries(Object.entries(props.node.regions).map(([key, region]) => [
            key,
            {
                key,
                path: region.path,
                node: region.node,
                render: (options) => _jsx(RenderNodes, { input: region.node, options: options })
            }
        ]));
    }, [props.node.regions]);
    const componentProps = {
        id: props.node.id,
        path: props.node.path,
        schema: props.node.schema,
        node: props.node,
        props: resolvedProps.value,
        meta: resolvedMeta,
        regions,
        events,
        helpers
    };
    const Comp = props.node.component.component;
    const cidFromSchema = props.node.schema._cid;
    const resolvedCid = typeof cidFromSchema === 'number' ? cidFromSchema : undefined;
    useEffect(() => {
        if (!resolvedMeta.visible || resolvedMeta.hidden) {
            return;
        }
        const payload = {
            nodeId: props.node.id,
            path: props.node.path,
            type: props.node.type
        };
        runtime.env.monitor?.onRenderStart?.(payload);
        runtime.env.monitor?.onRenderEnd?.({
            ...payload,
            durationMs: Math.max(0, Date.now() - renderStartedAtRef.current)
        });
    });
    if (!resolvedMeta.visible || resolvedMeta.hidden) {
        return null;
    }
    const renderComponent = () => {
        const element = _jsx(Comp, { ...componentProps });
        if (props.node.component.wrap) {
            const fieldName = typeof resolvedProps.value.name === 'string'
                ? resolvedProps.value.name
                : typeof props.node.schema.name === 'string'
                    ? props.node.schema.name
                    : undefined;
            const labelValue = resolvedMeta.label
                ?? (regions.label ? regions.label.render() : props.node.schema.label);
            return (_jsx(FieldFrame, { name: fieldName, label: labelValue, required: props.node.schema.required === true, className: resolvedMeta.className, testid: resolvedMeta.testid, cid: resolvedCid, children: element }));
        }
        if (resolvedCid != null) {
            return (_jsx("div", { "data-cid": resolvedCid, children: element }));
        }
        return element;
    };
    return (_jsx(NodeMetaContext.Provider, { value: { id: props.node.id, path: props.node.path, type: props.node.type }, children: _jsx(ActionScopeContext.Provider, { value: activeActionScope, children: _jsx(ComponentRegistryContext.Provider, { value: activeComponentRegistry, children: _jsx(ScopeContext.Provider, { value: activeScope, children: _jsx(FormContext.Provider, { value: activeForm, children: _jsx(PageContext.Provider, { value: props.page, children: _jsx(ClassAliasesContext.Provider, { value: mergedClassAliases, children: renderComponent() }) }) }) }) }) }) }));
}
