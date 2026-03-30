function normalizeImportSpec(spec) {
    return {
        ...spec,
        from: spec.from.trim(),
        as: spec.as.trim()
    };
}
function createImportKey(spec) {
    return JSON.stringify({
        from: spec.from,
        as: spec.as,
        options: spec.options ?? null
    });
}
function createModuleKey(spec) {
    return JSON.stringify({
        from: spec.from,
        options: spec.options ?? null
    });
}
function createImportError(message, cause) {
    const error = new Error(message);
    if (cause !== undefined) {
        error.cause = cause;
    }
    return error;
}
function toErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
export function createImportManager(input) {
    const moduleLoads = new Map();
    const scopeRegistrations = new WeakMap();
    function reportImportError(error, node) {
        input.env.notify('error', error.message);
        input.env.monitor?.onError?.({
            phase: 'render',
            error,
            nodeId: node?.id,
            path: node?.path
        });
    }
    function createPlaceholderProvider(spec, entry) {
        return {
            kind: 'import',
            invoke(method, payload, ctx) {
                if (entry.state === 'ready' && entry.provider) {
                    return entry.provider.invoke(method, payload, ctx);
                }
                if (entry.state === 'loading') {
                    return {
                        ok: false,
                        error: createImportError(`Imported namespace ${spec.as} is still loading`)
                    };
                }
                return {
                    ok: false,
                    error: entry.error ?? createImportError(`Imported namespace ${spec.as} failed to load`)
                };
            },
            listMethods() {
                return entry.state === 'ready' ? entry.provider?.listMethods?.() ?? [] : [];
            },
            dispose() {
                entry.provider?.dispose?.();
            }
        };
    }
    async function loadModule(spec) {
        if (!input.loader) {
            throw new Error(`No import loader configured for namespace ${spec.as}`);
        }
        const key = createModuleKey(spec);
        const existing = moduleLoads.get(key);
        if (existing) {
            return existing;
        }
        const pending = input.loader.load(spec);
        moduleLoads.set(key, pending);
        return pending;
    }
    async function ensureImportedNamespaces(args) {
        const imports = args.imports?.map(normalizeImportSpec).filter((spec) => spec.from && spec.as) ?? [];
        if (!args.actionScope || imports.length === 0) {
            return;
        }
        let registrations = scopeRegistrations.get(args.actionScope);
        if (!registrations) {
            registrations = new Map();
            scopeRegistrations.set(args.actionScope, registrations);
        }
        for (const spec of imports) {
            const key = createImportKey(spec);
            const existing = registrations.get(key);
            if (existing) {
                existing.refCount += 1;
                await existing.pending;
                if (existing.state === 'error' && existing.error) {
                    throw existing.error;
                }
                continue;
            }
            const entry = {
                pending: Promise.resolve(),
                release: undefined,
                refCount: 1,
                provider: undefined,
                state: 'loading',
                error: undefined
            };
            if (args.actionScope.listNamespaces().includes(spec.as)) {
                entry.state = 'error';
                entry.error = createImportError(`Namespace collision for import alias: ${spec.as}`);
                reportImportError(entry.error, args.node);
                throw entry.error;
            }
            entry.release = args.actionScope.registerNamespace(spec.as, createPlaceholderProvider(spec, entry));
            const readyPromise = (async () => {
                try {
                    const module = await loadModule(spec);
                    const context = {
                        runtime: input.getRuntime(),
                        env: input.env,
                        actionScope: args.actionScope,
                        componentRegistry: args.componentRegistry,
                        scope: args.scope,
                        spec,
                        node: args.node
                    };
                    const provider = await module.createNamespace(context);
                    entry.provider = {
                        ...provider,
                        kind: provider.kind ?? 'import'
                    };
                    entry.state = 'ready';
                }
                catch (error) {
                    entry.state = 'error';
                    entry.error = createImportError(`Imported namespace ${spec.as} failed to load: ${toErrorMessage(error)}`, error);
                    reportImportError(entry.error, args.node);
                    throw entry.error;
                }
            })();
            entry.pending = readyPromise.catch(() => undefined);
            registrations.set(key, entry);
            await readyPromise;
        }
    }
    function releaseImportedNamespaces(args) {
        const imports = args.imports?.map(normalizeImportSpec).filter((spec) => spec.from && spec.as) ?? [];
        if (!args.actionScope || imports.length === 0) {
            return;
        }
        const registrations = scopeRegistrations.get(args.actionScope);
        if (!registrations) {
            return;
        }
        for (const spec of imports) {
            const key = createImportKey(spec);
            const entry = registrations.get(key);
            if (!entry) {
                continue;
            }
            entry.refCount -= 1;
            if (entry.refCount > 0) {
                continue;
            }
            registrations.delete(key);
            void entry.pending.finally(() => {
                entry.release?.();
            });
        }
    }
    return {
        ensureImportedNamespaces,
        releaseImportedNamespaces
    };
}
//# sourceMappingURL=imports.js.map