import { createPageStore } from './form-store';
import { createScopeRef } from './scope';
let dialogCounter = 0;
function createDialogId(nodeId) {
    dialogCounter += 1;
    return `${nodeId}-dialog-${dialogCounter}`;
}
export function createManagedPageRuntime(input = {}) {
    const data = input.data ?? {};
    const store = input.pageStore ?? createPageStore(data);
    store.setData(data);
    const scope = createScopeRef({
        id: 'page',
        path: '$page',
        initialData: store.getState().data,
        store: {
            getSnapshot: () => store.getState().data,
            setSnapshot: (next) => store.setData(next),
            subscribe: (listener) => store.subscribe(listener)
        },
        update: (path, value) => store.updateData(path, value)
    });
    return {
        store,
        scope,
        openDialog(dialog, dialogScope, runtime, options) {
            const id = createDialogId(dialogScope.id);
            store.openDialog({
                id,
                dialog,
                scope: dialogScope,
                actionScope: options?.actionScope,
                componentRegistry: options?.componentRegistry,
                title: typeof dialog.title === 'string' ? dialog.title : dialog.title ? runtime.compile(dialog.title) : undefined,
                body: dialog.body ? runtime.compile(dialog.body) : undefined
            });
            return id;
        },
        closeDialog(dialogId) {
            store.closeDialog(dialogId);
        },
        refresh() {
            store.refresh();
        }
    };
}
//# sourceMappingURL=page-runtime.js.map