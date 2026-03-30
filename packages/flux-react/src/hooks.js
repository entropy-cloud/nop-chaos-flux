import { useContext, useMemo } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { ActionScopeContext, ComponentRegistryContext, FormContext, NodeMetaContext, PageContext, RuntimeContext, ScopeContext, useRequiredContext } from './contexts';
import { EMPTY_FORM_STORE_STATE, selectCurrentFormErrors, selectCurrentFormFieldState } from './form-state';
export function useRendererRuntime() {
    return useRequiredContext(RuntimeContext, 'RendererRuntime');
}
export function useRenderScope() {
    return useRequiredContext(ScopeContext, 'RenderScope');
}
export function useCurrentActionScope() {
    return useContext(ActionScopeContext);
}
export function useCurrentComponentRegistry() {
    return useContext(ComponentRegistryContext);
}
export function useRendererEnv() {
    return useRendererRuntime().env;
}
export function useScopeSelector(selector, equalityFn = Object.is) {
    const scope = useRenderScope();
    const store = scope.store;
    const subscribe = store?.subscribe ?? (() => () => undefined);
    const getSnapshot = () => scope.readOwn();
    return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, equalityFn);
}
export function useCurrentForm() {
    return useContext(FormContext);
}
export function useCurrentFormState(selector, equalityFn = Object.is) {
    const form = useCurrentForm();
    const subscribe = form?.store.subscribe ?? (() => () => undefined);
    const getSnapshot = () => form?.store.getState() ?? EMPTY_FORM_STORE_STATE;
    return useSyncExternalStoreWithSelector(subscribe, getSnapshot, getSnapshot, selector, equalityFn);
}
export function useCurrentFormErrors(query) {
    return useCurrentFormState((state) => selectCurrentFormErrors(state, query));
}
export function useCurrentFormError(query) {
    return useCurrentFormState((state) => selectCurrentFormErrors(state, query)[0], Object.is);
}
export function useCurrentFormFieldState(path, query) {
    return useCurrentFormState((state) => selectCurrentFormFieldState(state, path, query), (left, right) => left.error === right.error &&
        left.validating === right.validating &&
        left.touched === right.touched &&
        left.dirty === right.dirty &&
        left.visited === right.visited &&
        left.submitting === right.submitting);
}
export function useValidationNodeState(path) {
    return useCurrentFormFieldState(path, { path });
}
export function useFieldError(path) {
    return useCurrentFormError({ path, sourceKinds: ['field', 'runtime-registration'] });
}
export function useOwnedFieldState(path) {
    return useCurrentFormFieldState(path, { path, ownerPath: path });
}
export function useChildFieldState(path) {
    return useCurrentFormFieldState(path, { path });
}
export function useAggregateError(path) {
    return useCurrentFormError({ path, ownerPath: path, sourceKinds: ['array', 'object', 'form', 'runtime-registration'] });
}
export function useCurrentPage() {
    return useContext(PageContext);
}
export function useCurrentNodeMeta() {
    return useRequiredContext(NodeMetaContext, 'NodeMeta');
}
export function useActionDispatcher() {
    return useRendererRuntime().dispatch;
}
export function useRenderFragment() {
    const runtime = useRendererRuntime();
    const scope = useRenderScope();
    const actionScope = useCurrentActionScope();
    const componentRegistry = useCurrentComponentRegistry();
    const form = useCurrentForm();
    const page = useCurrentPage();
    return useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createHelpers } = require('./helpers');
        return createHelpers({ runtime, scope, actionScope, componentRegistry, form, page }).render;
    }, [runtime, scope, actionScope, componentRegistry, form, page]);
}
export const rendererHooks = {
    useRendererRuntime,
    useRenderScope,
    useCurrentActionScope,
    useCurrentComponentRegistry,
    useScopeSelector,
    useRendererEnv,
    useActionDispatcher,
    useCurrentForm,
    useCurrentFormErrors,
    useCurrentFormError,
    useCurrentFormFieldState,
    useValidationNodeState,
    useFieldError,
    useOwnedFieldState,
    useChildFieldState,
    useAggregateError,
    useCurrentPage,
    useCurrentNodeMeta,
    useRenderFragment
};
