import { createStore } from 'zustand/vanilla';
import { getIn, isPlainObject, parsePath, setIn } from '@nop-chaos/flux-core';
export function createScopeStore(initialData) {
    const store = createStore(() => ({ snapshot: initialData }));
    return {
        getSnapshot() {
            return store.getState().snapshot;
        },
        setSnapshot(next) {
            store.setState({ snapshot: next });
        },
        subscribe(listener) {
            return store.subscribe(listener);
        }
    };
}
function createScopeReader(parent, store, isolate) {
    let lastOwnSnapshot;
    let lastParentSnapshot;
    let lastMaterialized;
    return function read() {
        const ownSnapshot = store.getSnapshot();
        if (!parent || isolate) {
            return ownSnapshot;
        }
        const parentSnapshot = parent.read();
        if (lastMaterialized && lastOwnSnapshot === ownSnapshot && lastParentSnapshot === parentSnapshot) {
            return lastMaterialized;
        }
        lastOwnSnapshot = ownSnapshot;
        lastParentSnapshot = parentSnapshot;
        lastMaterialized = {
            ...parentSnapshot,
            ...ownSnapshot
        };
        return lastMaterialized;
    };
}
function hasOwnPathValue(input, path) {
    const segments = parsePath(path);
    if (segments.length === 0) {
        return false;
    }
    let current = input;
    for (const segment of segments) {
        if (current == null || typeof current !== 'object') {
            return false;
        }
        if (!Object.prototype.hasOwnProperty.call(current, segment)) {
            return false;
        }
        current = current[segment];
    }
    return true;
}
function resolveScopePath(scope, path) {
    if (!scope) {
        return undefined;
    }
    const segments = parsePath(path);
    if (segments.length === 0) {
        return undefined;
    }
    const [head, ...rest] = segments;
    const own = scope.readOwn();
    if (Object.prototype.hasOwnProperty.call(own, head)) {
        if (rest.length === 0) {
            return own[head];
        }
        return getIn(own[head], rest.join('.'));
    }
    return resolveScopePath(scope.parent, path);
}
function hasScopePath(scope, path) {
    if (!scope) {
        return false;
    }
    const segments = parsePath(path);
    if (segments.length === 0) {
        return false;
    }
    const [head, ...rest] = segments;
    const own = scope.readOwn();
    if (Object.prototype.hasOwnProperty.call(own, head)) {
        if (rest.length === 0) {
            return true;
        }
        return hasOwnPathValue(own, path);
    }
    return hasScopePath(scope.parent, path);
}
export function toRecord(value) {
    return isPlainObject(value) ? value : {};
}
export function createScopeRef(input) {
    const store = input.store ?? createScopeStore(input.initialData ?? {});
    const read = createScopeReader(input.parent, store, input.isolate);
    return {
        id: input.id,
        path: input.path,
        parent: input.parent,
        store,
        get value() {
            return read();
        },
        get(path) {
            return resolveScopePath(this, path);
        },
        has(path) {
            return hasScopePath(this, path);
        },
        readOwn() {
            return store.getSnapshot();
        },
        read,
        update(path, value) {
            if (input.update) {
                input.update(path, value);
                return;
            }
            const snapshot = store.getSnapshot();
            store.setSnapshot(setIn(snapshot, path, value));
        }
    };
}
//# sourceMappingURL=scope.js.map