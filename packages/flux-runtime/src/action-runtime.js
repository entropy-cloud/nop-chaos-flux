import { isNamespacedAction } from './action-scope';
function createCancelledResult(error) {
    return {
        ok: false,
        cancelled: true,
        error
    };
}
function isAbortError(error) {
    if (!error || typeof error !== 'object') {
        return false;
    }
    const candidate = error;
    return candidate.name === 'AbortError' || candidate.code === 'ABORT_ERR';
}
function createActionKey(action, ctx) {
    const owner = ctx.node?.id ?? ctx.form?.id ?? ctx.scope.id;
    const target = action.componentPath ?? action.componentId ?? action.formId ?? action.dialogId ?? action.api?.url ?? '';
    return `${owner}:${action.action}:${target}`;
}
function buildActionMonitorPayload(action, ctx) {
    return {
        actionType: action.action,
        nodeId: ctx.node?.id,
        path: ctx.node?.path
    };
}
const ACTION_PAYLOAD_RESERVED_KEYS = new Set([
    'action',
    'componentId',
    'componentName',
    'componentPath',
    'formId',
    'dialogId',
    'api',
    'dialog',
    'dataPath',
    'value',
    'debounce',
    'continueOnError',
    'then',
    'args'
]);
function extractTopLevelActionPayload(action) {
    const payloadEntries = Object.entries(action).filter(([key]) => !ACTION_PAYLOAD_RESERVED_KEYS.has(key));
    if (payloadEntries.length === 0) {
        return undefined;
    }
    return Object.fromEntries(payloadEntries);
}
function evaluateActionArgs(action, ctx, evaluate) {
    const payload = action.args ?? extractTopLevelActionPayload(action);
    return payload ? evaluate(payload, ctx.scope) : undefined;
}
function normalizeActionResult(result) {
    if (result && typeof result === 'object' && 'ok' in result) {
        return result;
    }
    return {
        ok: true,
        data: result
    };
}
function canInvokeHandleMethod(handle, method) {
    if (handle.capabilities.hasMethod) {
        return handle.capabilities.hasMethod(method);
    }
    const methods = handle.capabilities.listMethods?.();
    return methods ? methods.includes(method) : true;
}
function finishAction(input, actionPayload, startedAt, result) {
    input.env.monitor?.onActionEnd?.({
        ...actionPayload,
        durationMs: Date.now() - startedAt,
        result
    });
    return result;
}
export function createActionDispatcher(input) {
    const pendingDebounces = new Map();
    async function runBuiltInAction(action, ctx, startedAt, actionPayload) {
        switch (action.action) {
            case 'setValue': {
                const targetPath = action.componentPath ?? action.componentId ?? '';
                const evaluated = action.value === undefined ? undefined : input.evaluate(action.value, ctx.scope);
                if (ctx.form && action.formId && ctx.form.id === action.formId) {
                    ctx.form.setValue(targetPath, evaluated);
                }
                else {
                    ctx.scope.update(targetPath, evaluated);
                }
                return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: evaluated });
            }
            case 'ajax': {
                if (!action.api) {
                    return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: false, error: new Error('Missing api in ajax action') });
                }
                const api = input.evaluate(action.api, ctx.scope);
                input.env.monitor?.onApiRequest?.({
                    api,
                    nodeId: ctx.node?.id,
                    path: ctx.node?.path
                });
                const result = await input.executeAjaxAction(api, action, ctx);
                return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, result);
            }
            case 'dialog': {
                if (!ctx.page || !action.dialog) {
                    return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: false, error: new Error('Dialog action requires page runtime and dialog config') });
                }
                const dialogScope = input.createDialogScope(ctx);
                const dialogId = ctx.page.openDialog(action.dialog, dialogScope, input.runtime, {
                    actionScope: input.getDialogActionScope?.(ctx) ?? ctx.actionScope,
                    componentRegistry: input.getDialogComponentRegistry?.(ctx) ?? ctx.componentRegistry
                });
                dialogScope.update('dialogId', dialogId);
                return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true, data: { dialogId } });
            }
            case 'closeDialog': {
                if (ctx.page) {
                    if (action.dialogId) {
                        ctx.page.closeDialog(String(input.evaluate(action.dialogId, ctx.scope)));
                    }
                    else {
                        ctx.page.closeDialog(ctx.dialogId);
                    }
                }
                return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: true });
            }
            case 'refreshTable': {
                ctx.page?.refresh();
                return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, {
                    ok: true,
                    data: ctx.page?.store.getState().refreshTick
                });
            }
            case 'submitForm': {
                if (!ctx.form) {
                    return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, { ok: false, error: new Error('submitForm requires form runtime') });
                }
                const api = action.api ? input.evaluate(action.api, ctx.scope) : undefined;
                if (api) {
                    input.env.monitor?.onApiRequest?.({
                        api,
                        nodeId: ctx.node?.id,
                        path: ctx.node?.path
                    });
                }
                const result = await input.submitFormAction(api, action, ctx);
                return finishAction(input, { ...actionPayload, dispatchMode: 'built-in' }, startedAt, result);
            }
            default:
                return undefined;
        }
    }
    const COMPONENT_ACTION_PREFIX = 'component:';
    function isComponentAction(actionName) {
        return actionName.startsWith(COMPONENT_ACTION_PREFIX);
    }
    function extractComponentMethod(actionName) {
        return actionName.slice(COMPONENT_ACTION_PREFIX.length);
    }
    async function runComponentAction(action, ctx, startedAt, actionPayload) {
        if (!isComponentAction(action.action)) {
            return undefined;
        }
        const method = extractComponentMethod(action.action);
        if (!method) {
            return finishAction(input, { ...actionPayload, dispatchMode: 'component' }, startedAt, {
                ok: false,
                error: new Error('component:<method> requires a method name after the colon')
            });
        }
        const target = {
            _targetCid: typeof action._targetCid === 'number' ? action._targetCid : undefined,
            _targetTemplateId: typeof action._targetTemplateId === 'string' ? action._targetTemplateId : undefined,
            componentInstanceKey: ctx.getInstanceKey?.(),
            componentId: action.componentId,
            componentName: action.componentName
        };
        if (!target.componentId && !target.componentName && target._targetCid === undefined && !target._targetTemplateId) {
            return finishAction(input, { ...actionPayload, dispatchMode: 'component', method }, startedAt, {
                ok: false,
                error: new Error('component:<method> requires _targetCid, _targetTemplateId, componentId or componentName')
            });
        }
        const handle = ctx.componentRegistry?.resolve(target);
        if (!handle) {
            return finishAction(input, {
                ...actionPayload,
                dispatchMode: 'component',
                method,
                componentId: target.componentId,
                componentName: target.componentName
            }, startedAt, { ok: false, error: new Error('Component handle not found') });
        }
        if (!canInvokeHandleMethod(handle, method)) {
            return finishAction(input, {
                ...actionPayload,
                dispatchMode: 'component',
                method,
                componentId: handle.id,
                componentName: handle.name,
                componentType: handle.type
            }, startedAt, { ok: false, error: new Error(`Unsupported component method: ${method}`) });
        }
        const payload = evaluateActionArgs(action, ctx, input.evaluate);
        const result = normalizeActionResult(await handle.capabilities.invoke(method, payload, ctx));
        return finishAction(input, {
            ...actionPayload,
            dispatchMode: 'component',
            method,
            componentId: handle.id,
            componentName: handle.name,
            componentType: handle.type
        }, startedAt, result);
    }
    async function runNamespacedAction(action, ctx, startedAt, actionPayload) {
        if (!isNamespacedAction(action.action)) {
            return undefined;
        }
        const resolved = ctx.actionScope?.resolve(action.action);
        if (!resolved) {
            return finishAction(input, { ...actionPayload, dispatchMode: 'namespace' }, startedAt, {
                ok: false,
                error: new Error(`Unsupported action: ${action.action}`)
            });
        }
        const payload = evaluateActionArgs(action, ctx, input.evaluate);
        const result = normalizeActionResult(await resolved.provider.invoke(resolved.method, payload, ctx));
        return finishAction(input, {
            ...actionPayload,
            dispatchMode: 'namespace',
            namespace: resolved.namespace,
            method: resolved.method,
            sourceScopeId: resolved.sourceScopeId,
            providerKind: resolved.provider.kind ?? 'host'
        }, startedAt, result);
    }
    async function runSingleAction(action, ctx) {
        const startedAt = Date.now();
        const actionPayload = buildActionMonitorPayload(action, ctx);
        input.env.monitor?.onActionStart?.(actionPayload);
        try {
            const processedAction = await (input.plugins ?? []).reduce(async (currentPromise, plugin) => {
                const current = await currentPromise;
                return plugin.beforeAction ? plugin.beforeAction(current, ctx) : current;
            }, Promise.resolve(action));
            const builtInResult = await runBuiltInAction(processedAction, ctx, startedAt, actionPayload);
            if (builtInResult) {
                return builtInResult;
            }
            const componentResult = await runComponentAction(processedAction, ctx, startedAt, actionPayload);
            if (componentResult) {
                return componentResult;
            }
            const namespacedResult = await runNamespacedAction(processedAction, ctx, startedAt, actionPayload);
            if (namespacedResult) {
                return namespacedResult;
            }
            return finishAction(input, actionPayload, startedAt, {
                ok: false,
                error: new Error(`Unsupported action: ${processedAction.action}`)
            });
        }
        catch (error) {
            if (isAbortError(error)) {
                const result = createCancelledResult(error);
                input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
                return result;
            }
            input.onActionError?.(error, ctx);
            for (const plugin of input.plugins ?? []) {
                plugin.onError?.(error, {
                    phase: 'action',
                    error,
                    nodeId: ctx.node?.id,
                    path: ctx.node?.path
                });
            }
            const result = {
                ok: false,
                error
            };
            input.env.monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
            return result;
        }
    }
    function runActionWithDebounce(action, ctx) {
        if (!action.debounce || action.debounce <= 0) {
            return runSingleAction(action, ctx);
        }
        const key = createActionKey(action, ctx);
        const previous = pendingDebounces.get(key);
        if (previous) {
            clearTimeout(previous.timer);
            const cancelledResult = createCancelledResult();
            input.env.monitor?.onActionEnd?.({
                ...buildActionMonitorPayload(action, ctx),
                durationMs: 0,
                result: cancelledResult
            });
            previous.resolve(cancelledResult);
            pendingDebounces.delete(key);
        }
        return new Promise((resolve) => {
            const timer = setTimeout(async () => {
                pendingDebounces.delete(key);
                resolve(await runSingleAction(action, ctx));
            }, action.debounce);
            pendingDebounces.set(key, { timer, resolve });
        });
    }
    async function dispatch(action, ctx) {
        const actions = Array.isArray(action) ? action : [action];
        let previous = { ok: true };
        for (const current of actions) {
            const actionContext = {
                ...ctx,
                prevResult: previous
            };
            const result = await runActionWithDebounce(current, actionContext);
            previous = result;
            if (!result.ok && !current.continueOnError) {
                return result;
            }
            if (current.then) {
                previous = await dispatch(current.then, {
                    ...ctx,
                    prevResult: result
                });
            }
        }
        return previous;
    }
    return { dispatch };
}
//# sourceMappingURL=action-runtime.js.map