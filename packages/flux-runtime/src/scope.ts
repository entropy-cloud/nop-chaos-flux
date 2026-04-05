import { createStore } from 'zustand/vanilla';
import type { ScopeChange, ScopeRef, ScopeStore } from '@nop-chaos/flux-core';
import { getIn, isPlainObject, parsePath, setIn } from '@nop-chaos/flux-core';

function createDefaultChange(scopeId?: string): ScopeChange {
  return {
    paths: ['*'],
    sourceScopeId: scopeId,
    kind: 'replace'
  };
}

function normalizeScopeChange(change: ScopeChange | undefined, scopeId?: string): ScopeChange {
  return {
    paths: change?.paths?.length ? change.paths : ['*'],
    sourceScopeId: change?.sourceScopeId ?? scopeId,
    kind: change?.kind ?? 'replace'
  };
}

export function createScopeStore(initialData: Record<string, any>): ScopeStore<Record<string, any>> {
  let scopeId: string | undefined;
  const store = createStore<{
    snapshot: Record<string, any>;
    lastChange: ScopeChange;
  }>(() => ({
    snapshot: initialData,
    lastChange: createDefaultChange()
  }));

  const scopeStore: ScopeStore<Record<string, any>> & { __scopeId__?: string } = {
    getSnapshot() {
      return store.getState().snapshot;
    },
    getLastChange() {
      return store.getState().lastChange;
    },
    setSnapshot(next, change) {
      store.setState({
        snapshot: next,
        lastChange: normalizeScopeChange(change, scopeId)
      });
    },
    subscribe(listener) {
      return store.subscribe((state, previousState) => {
        if (state.snapshot === previousState.snapshot && state.lastChange === previousState.lastChange) {
          return;
        }

        listener(state.lastChange);
      });
    }
  };

  Object.defineProperty(scopeStore, '__scopeId__', {
    get() {
      return scopeId;
    },
    set(value: string | undefined) {
      scopeId = value;
      const current = store.getState();
      if (!current.lastChange.sourceScopeId) {
        store.setState({
          snapshot: current.snapshot,
          lastChange: normalizeScopeChange(current.lastChange, scopeId)
        });
      }
    },
    enumerable: false,
    configurable: true
  });

  return scopeStore;
}

function createScopeReader(parent: ScopeRef | undefined, store: ScopeStore<Record<string, any>>, isolate?: boolean) {
  let lastOwnSnapshot: Record<string, any> | undefined;
  let lastParentSnapshot: Record<string, any> | undefined;
  let lastMaterialized: Record<string, any> | undefined;

  return function read(): Record<string, any> {
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

function createCompositeScopeStore(
  ownStore: ScopeStore<Record<string, any>>,
  parent: ScopeRef,
  read: () => Record<string, any>,
  scopeId: string
): ScopeStore<Record<string, any>> {
  let lastChange = createDefaultChange(scopeId);

  return {
    getSnapshot: read,
    getLastChange() {
      return lastChange;
    },
    setSnapshot(next: Record<string, any>, change?: ScopeChange) {
      ownStore.setSnapshot(next, change);
    },
    subscribe(listener) {
      const unsubOwn = ownStore.subscribe((change) => {
        lastChange = change;
        listener(change);
      });
      const unsubParent = parent.store?.subscribe((change) => {
        lastChange = change;
        listener(change);
      }) ?? (() => {});

      return () => {
        unsubOwn();
        unsubParent();
      };
    }
  };
}

function hasOwnPathValue(input: Record<string, any>, path: string): boolean {
  const segments = parsePath(path);

  if (segments.length === 0) {
    return false;
  }

  let current: unknown = input;

  for (const segment of segments) {
    if (current == null || typeof current !== 'object') {
      return false;
    }

    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return false;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return true;
}

function resolveScopePath(scope: ScopeRef | undefined, path: string): unknown {
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

function hasScopePath(scope: ScopeRef | undefined, path: string): boolean {
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

export function toRecord(value: unknown): Record<string, any> {
  return isPlainObject(value) ? value : {};
}

export function createScopeRef(input: {
  id: string;
  path: string;
  initialData?: Record<string, any>;
  parent?: ScopeRef;
  store?: ScopeStore<Record<string, any>>;
  isolate?: boolean;
  update?: (path: string, value: unknown, scope: ScopeRef) => void;
}): ScopeRef {
  const ownStore = input.store ?? createScopeStore(input.initialData ?? {});
  (ownStore as ScopeStore<Record<string, any>> & { __scopeId__?: string }).__scopeId__ = input.id;
  const read = createScopeReader(input.parent, ownStore, input.isolate);

  const exposedStore = (input.parent && !input.isolate)
    ? createCompositeScopeStore(ownStore, input.parent, read, input.id)
    : ownStore;

  const scope: ScopeRef = {
    id: input.id,
    path: input.path,
    parent: input.parent,
    store: exposedStore,
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
      return ownStore.getSnapshot();
    },
    read,
    update(path, value) {
      if (input.update) {
        input.update(path, value, scope);
        return;
      }

      const snapshot = ownStore.getSnapshot();
      ownStore.setSnapshot(setIn(snapshot, path, value), {
        paths: [path || '*'],
        sourceScopeId: input.id,
        kind: 'update'
      });
    },
    merge(data) {
      const current = ownStore.getSnapshot();
      const keys = Object.keys(data);

      if (keys.length === 0) {
        return;
      }

      let changed = false;

      for (let i = 0; i < keys.length; i += 1) {
        if (!Object.is(current[keys[i]], data[keys[i]])) {
          changed = true;
          break;
        }
      }

      if (!changed) {
        return;
      }

      ownStore.setSnapshot({ ...current, ...data }, {
        paths: keys,
        sourceScopeId: input.id,
        kind: 'merge'
      });
    }
  };

  return scope;
}
