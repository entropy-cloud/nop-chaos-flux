import { isPlainObject, setIn } from '@nop-chaos/flux-core';
function getPathValue(input, path) {
    if (!path || input == null || typeof input !== 'object') {
        return undefined;
    }
    return path.split('.').reduce((current, segment) => {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }
        return current[segment];
    }, input);
}
function normalizeAdaptorSource(source) {
    const trimmed = source.trim();
    if (trimmed.startsWith('return ')) {
        return trimmed.slice(7).replace(/;\s*$/, '').trim();
    }
    return trimmed.replace(/;\s*$/, '').trim();
}
function createAdaptorScopeView(scope) {
    let cachedKeys;
    return new Proxy({}, {
        get(_target, property) {
            if (typeof property !== 'string') {
                return undefined;
            }
            if (property === '__proto__') {
                return undefined;
            }
            return scope.get(property);
        },
        has(_target, property) {
            return typeof property === 'string' ? scope.has(property) : false;
        },
        ownKeys() {
            if (!cachedKeys) {
                const keys = new Set();
                let current = scope;
                while (current) {
                    for (const key of Reflect.ownKeys(current.readOwn())) {
                        if (typeof key === 'string' || typeof key === 'symbol') {
                            keys.add(key);
                        }
                    }
                    current = current.parent;
                }
                cachedKeys = Array.from(keys);
            }
            return cachedKeys;
        },
        getOwnPropertyDescriptor(_target, property) {
            if (typeof property !== 'string') {
                return undefined;
            }
            if (!scope.has(property)) {
                return undefined;
            }
            return {
                configurable: true,
                enumerable: true,
                value: scope.get(property),
                writable: false
            };
        }
    });
}
function createRequestKey(actionType, api, scope, form) {
    const owner = form?.id ?? scope.id;
    return `${owner}:${actionType}:${api.method ?? 'get'}:${api.url}`;
}
export function extractScopeData(scope, includeScope) {
    if (!includeScope) {
        return {};
    }
    if (includeScope === '*') {
        return scope.read();
    }
    const result = {};
    for (const key of includeScope) {
        if (scope.has(key)) {
            result[key] = scope.get(key);
        }
    }
    return result;
}
export function buildUrlWithParams(url, params) {
    if (!params || Object.keys(params).length === 0) {
        return url;
    }
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
        }
    }
    const queryString = searchParams.toString();
    if (!queryString) {
        return url;
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${queryString}`;
}
export function prepareApiData(api, scope) {
    const extractedData = extractScopeData(scope, api.includeScope);
    const explicitData = api.data;
    let mergedData;
    if (isPlainObject(explicitData)) {
        mergedData = { ...extractedData, ...explicitData };
    }
    else if (explicitData !== undefined) {
        mergedData = explicitData;
    }
    else if (Object.keys(extractedData).length > 0) {
        mergedData = extractedData;
    }
    const params = api.params && isPlainObject(api.params)
        ? api.params
        : undefined;
    return { data: mergedData, params };
}
export function applyResponseDataPath(currentData, dataPath, responseData) {
    const currentValue = getPathValue(responseData, dataPath);
    if (currentValue !== undefined) {
        return setIn(currentData, dataPath, currentValue);
    }
    if (isPlainObject(responseData)) {
        return {
            ...currentData,
            ...responseData
        };
    }
    return setIn(currentData, dataPath, responseData);
}
export function applyRequestAdaptor(expressionCompiler, api, scope, env) {
    if (!api.requestAdaptor) {
        return api;
    }
    const compiled = expressionCompiler.formulaCompiler.compileExpression(normalizeAdaptorSource(api.requestAdaptor));
    const adapted = compiled.exec({
        api,
        scope: createAdaptorScopeView(scope),
        data: api.data,
        headers: api.headers ?? {}
    }, env);
    return isPlainObject(adapted) ? { ...api, ...adapted } : api;
}
export function applyResponseAdaptor(expressionCompiler, api, responseData, scope, env) {
    if (!api.responseAdaptor) {
        return responseData;
    }
    const compiled = expressionCompiler.formulaCompiler.compileExpression(normalizeAdaptorSource(api.responseAdaptor));
    return compiled.exec({
        payload: responseData,
        response: responseData,
        api,
        scope: createAdaptorScopeView(scope)
    }, env);
}
export function createApiRequestExecutor(env) {
    const activeRequests = new Map();
    return async function executeApiRequest(actionType, api, scope, form) {
        const requestKey = createRequestKey(actionType, api, scope, form);
        const previous = activeRequests.get(requestKey);
        if (previous) {
            previous.abort();
        }
        const controller = new AbortController();
        activeRequests.set(requestKey, controller);
        env.monitor?.onApiRequest?.({
            api,
            nodeId: undefined,
            path: undefined
        });
        try {
            return await env.fetcher(api, {
                scope,
                env,
                signal: controller.signal
            });
        }
        finally {
            if (activeRequests.get(requestKey) === controller) {
                activeRequests.delete(requestKey);
            }
        }
    };
}
//# sourceMappingURL=request-runtime.js.map