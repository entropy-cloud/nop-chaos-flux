import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useRef } from 'react';
import { shallowEqual, isSchema, isSchemaArray } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope, useCurrentActionScope, useCurrentComponentRegistry, useCurrentForm, useCurrentPage } from './hooks';
import { NodeRenderer } from './node-renderer';
function isCompiledNode(input) {
    if (!input || typeof input !== 'object') {
        return false;
    }
    const candidate = input;
    return (typeof candidate.id === 'string' &&
        typeof candidate.path === 'string' &&
        typeof candidate.type === 'string' &&
        !!candidate.component &&
        !!candidate.schema &&
        !!candidate.regions);
}
export function normalizeNodeInput(runtime, input) {
    if (!input) {
        return null;
    }
    if (Array.isArray(input)) {
        if (input.length === 0) {
            return [];
        }
        if (input.every((item) => isCompiledNode(item))) {
            return input;
        }
        if (isSchemaArray(input)) {
            return runtime.compile(input);
        }
        return input;
    }
    if (isCompiledNode(input)) {
        return input;
    }
    if (isSchema(input)) {
        return runtime.compile(input);
    }
    return input;
}
export function resolveRendererSlotContent(props, slotKey, options) {
    const regionContent = props.regions[slotKey]?.render();
    if (regionContent !== undefined && regionContent !== null) {
        return regionContent;
    }
    const propValue = props.props[slotKey];
    if (propValue !== undefined && propValue !== null) {
        return propValue;
    }
    if (options?.metaKey) {
        const metaValue = props.meta[options.metaKey];
        if (metaValue !== undefined && metaValue !== null) {
            return metaValue;
        }
    }
    return options?.fallback;
}
export function hasRendererSlotContent(content) {
    if (content === null || content === undefined || content === false) {
        return false;
    }
    if (Array.isArray(content)) {
        return content.some((item) => hasRendererSlotContent(item));
    }
    return true;
}
export function RenderNodes(props) {
    const runtime = useRendererRuntime();
    const currentScope = useRenderScope();
    const currentActionScope = useCurrentActionScope();
    const currentComponentRegistry = useCurrentComponentRegistry();
    const currentForm = useCurrentForm();
    const currentPage = useCurrentPage();
    const compiled = useMemo(() => normalizeNodeInput(runtime, props.input), [runtime, props.input]);
    const fragmentScopeRef = React.useRef(undefined);
    const pendingDataRef = useRef(null);
    let scope = currentScope;
    const actionScope = props.options?.actionScope ?? currentActionScope;
    const componentRegistry = props.options?.componentRegistry ?? currentComponentRegistry;
    if (!compiled) {
        return null;
    }
    if (props.options?.scope) {
        scope = props.options.scope;
    }
    else if (props.options?.data) {
        const nextData = props.options.data;
        const cached = fragmentScopeRef.current;
        if (!cached ||
            cached.parentScope !== currentScope ||
            cached.isolate !== props.options.isolate ||
            cached.pathSuffix !== props.options.pathSuffix ||
            cached.scopeKey !== props.options.scopeKey) {
            scope = runtime.createChildScope(currentScope, nextData, {
                isolate: props.options.isolate,
                pathSuffix: props.options.pathSuffix,
                scopeKey: props.options.scopeKey,
                source: 'fragment'
            });
            fragmentScopeRef.current = {
                parentScope: currentScope,
                isolate: props.options.isolate,
                pathSuffix: props.options.pathSuffix,
                scopeKey: props.options.scopeKey,
                data: nextData,
                scope
            };
        }
        else {
            scope = cached.scope;
            if (!shallowEqual(cached.data, nextData)) {
                pendingDataRef.current = nextData;
                cached.data = nextData;
            }
        }
    }
    useEffect(() => {
        if (pendingDataRef.current && scope?.store) {
            scope.store.setSnapshot(pendingDataRef.current);
            pendingDataRef.current = null;
        }
    });
    if (Array.isArray(compiled)) {
        return (_jsx(_Fragment, { children: compiled.map((node) => (_jsx(NodeRenderer, { node: node, scope: scope, actionScope: actionScope, componentRegistry: componentRegistry, form: currentForm, page: currentPage }, node.id))) }));
    }
    return (_jsx(NodeRenderer, { node: compiled, scope: scope, actionScope: actionScope, componentRegistry: componentRegistry, form: currentForm, page: currentPage }));
}
