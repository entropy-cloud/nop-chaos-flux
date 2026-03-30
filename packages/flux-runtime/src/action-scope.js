function parseActionName(actionName) {
    const separatorIndex = actionName.indexOf(':');
    if (separatorIndex <= 0 || separatorIndex >= actionName.length - 1) {
        return undefined;
    }
    return {
        namespace: actionName.slice(0, separatorIndex),
        method: actionName.slice(separatorIndex + 1)
    };
}
export function createActionScope(input) {
    const namespaces = new Map();
    function resolveInScope(actionName) {
        const parsed = parseActionName(actionName);
        if (!parsed) {
            return undefined;
        }
        const provider = namespaces.get(parsed.namespace);
        if (provider) {
            return {
                namespace: parsed.namespace,
                method: parsed.method,
                provider,
                sourceScopeId: input.id
            };
        }
        return input.parent?.resolve(actionName);
    }
    return {
        id: input.id,
        parent: input.parent,
        resolve: resolveInScope,
        registerNamespace(namespace, provider) {
            const existing = namespaces.get(namespace);
            if (existing && existing !== provider) {
                existing.dispose?.();
            }
            namespaces.set(namespace, provider);
            return () => {
                if (namespaces.get(namespace) === provider) {
                    namespaces.delete(namespace);
                    provider.dispose?.();
                }
            };
        },
        unregisterNamespace(namespace) {
            const provider = namespaces.get(namespace);
            if (!provider) {
                return;
            }
            namespaces.delete(namespace);
            provider.dispose?.();
        },
        listNamespaces() {
            return Array.from(namespaces.keys());
        }
    };
}
export function isNamespacedAction(actionName) {
    return parseActionName(actionName) !== undefined;
}
//# sourceMappingURL=action-scope.js.map