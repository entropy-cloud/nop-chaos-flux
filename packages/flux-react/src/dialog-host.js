import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { ActionScopeContext, ComponentRegistryContext, ScopeContext } from './contexts';
import { useCurrentPage } from './hooks';
import { RenderNodes } from './render-nodes';
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
function isCompiledNodeArray(input) {
    return Array.isArray(input) && input.every((item) => isCompiledNode(item));
}
export function DialogHost() {
    const page = useCurrentPage();
    const dialogs = useSyncExternalStoreWithSelector(page?.store.subscribe ?? (() => () => undefined), () => page?.store.getState().dialogs ?? [], () => page?.store.getState().dialogs ?? [], (state) => state, Object.is);
    if (!page || dialogs.length === 0) {
        return null;
    }
    return (_jsx(_Fragment, { children: dialogs.map((dialog) => (_jsx(DialogView, { dialog: dialog, page: page }, dialog.id))) }));
}
function DialogView(props) {
    useSyncExternalStoreWithSelector(props.dialog.scope.store?.subscribe ?? (() => () => undefined), () => props.dialog.scope.readOwn(), () => props.dialog.scope.readOwn(), (state) => state, Object.is);
    const { dialog, page } = props;
    const titleNode = dialog.title
        ? (_jsx(ActionScopeContext.Provider, { value: dialog.actionScope, children: _jsx(ComponentRegistryContext.Provider, { value: dialog.componentRegistry, children: _jsx(ScopeContext.Provider, { value: dialog.scope, children: typeof dialog.title === 'string'
                        ? dialog.title
                        : isCompiledNode(dialog.title) || isCompiledNodeArray(dialog.title)
                            ? _jsx(RenderNodes, { input: dialog.title, options: { scope: dialog.scope, actionScope: dialog.actionScope, componentRegistry: dialog.componentRegistry } })
                            : String(dialog.title) }) }) }))
        : null;
    return (_jsx(Dialog, { open: true, onOpenChange: (open) => { if (!open)
            page.closeDialog(dialog.id); }, children: _jsx(DialogContent, { className: "nop-dialog-card", children: _jsx(ActionScopeContext.Provider, { value: dialog.actionScope, children: _jsx(ComponentRegistryContext.Provider, { value: dialog.componentRegistry, children: _jsxs(ScopeContext.Provider, { value: dialog.scope, children: [titleNode && (_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: titleNode }) })), _jsx(RenderNodes, { input: (dialog.body ?? dialog.dialog.body), options: { scope: dialog.scope, actionScope: dialog.actionScope, componentRegistry: dialog.componentRegistry } })] }) }) }) }) }));
}
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@nop-chaos/ui';
