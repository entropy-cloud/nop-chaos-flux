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

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function safeCreate(parent: Record<string, any>): Record<string, any> {
  return Object.create(parent) as Record<string, any>;
}

function createVisibleViewHelpers(parent: ScopeRef | undefined, store: ScopeStore<Record<string, any>>, isolate?: boolean) {
  let lastOwnSnapshotForView: Record<string, any> | undefined;
  let lastParentSnapshotForView: Record<string, any> | undefined;
  let lastVisibleView: Record<string, any> | undefined;

  let lastOwnSnapshotForMat: Record<string, any> | undefined;
  let lastParentSnapshotForMat: Record<string, any> | undefined;
  let lastMaterialized: Record<string, any> | undefined;

  function readVisible(): Record<string, any> {
    const ownSnapshot = store.getSnapshot();

    if (!parent || isolate) {
      return ownSnapshot;
    }

    const parentVisible = parent.readVisible();

    if (lastVisibleView && lastOwnSnapshotForView === ownSnapshot && lastParentSnapshotForView === parentVisible) {
      return lastVisibleView;
    }

    lastOwnSnapshotForView = ownSnapshot;
    lastParentSnapshotForView = parentVisible;
    lastVisibleView = Object.assign(safeCreate(parentVisible), ownSnapshot);

    return lastVisibleView;
  }

  function materializeVisible(): Record<string, any> {
    const ownSnapshot = store.getSnapshot();

    if (!parent || isolate) {
      return ownSnapshot;
    }

    const parentMat = parent.materializeVisible();

    if (lastMaterialized && lastOwnSnapshotForMat === ownSnapshot && lastParentSnapshotForMat === parentMat) {
      return lastMaterialized;
    }

    lastOwnSnapshotForMat = ownSnapshot;
    lastParentSnapshotForMat = parentMat;

    const result: Record<string, any> = {};
    for (const key of Object.keys(parentMat)) {
      if (!DANGEROUS_KEYS.has(key)) {
        result[key] = parentMat[key];
      }
    }
    for (const key of Object.keys(ownSnapshot)) {
      if (!DANGEROUS_KEYS.has(key)) {
        result[key] = ownSnapshot[key];
      }
    }
    lastMaterialized = result;

    return lastMaterialized;
  }

  return { readVisible, materializeVisible };
}

function createCompositeScopeStore(
  ownStore: ScopeStore<Record<string, any>>,
  parent: ScopeRef,
  readVisible: () => Record<string, any>,
  scopeId: string
): ScopeStore<Record<string, any>> {
  let lastChange = createDefaultChange(scopeId);

  return {
    getSnapshot: readVisible,
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
  const { readVisible, materializeVisible } = createVisibleViewHelpers(input.parent, ownStore, input.isolate);

  const exposedStore = (input.parent && !input.isolate)
    ? createCompositeScopeStore(ownStore, input.parent, readVisible, input.id)
    : ownStore;

  const scope: ScopeRef = {
    id: input.id,
    path: input.path,
    parent: input.parent,
    store: exposedStore,
    get value() {
      return readVisible();
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
    readVisible,
    materializeVisible,
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
    },
    replace(data) {
      const next = toRecord(data);
      const current = ownStore.getSnapshot();

      if (current === next) {
        return;
      }

      const changedPaths = new Set<string>();

      for (const key of Object.keys(current)) {
        if (!Object.prototype.hasOwnProperty.call(next, key) || !Object.is(current[key], next[key])) {
          changedPaths.add(key);
        }
      }

      for (const key of Object.keys(next)) {
        if (!Object.prototype.hasOwnProperty.call(current, key) || !Object.is(current[key], next[key])) {
          changedPaths.add(key);
        }
      }

      if (changedPaths.size === 0) {
        return;
      }

      ownStore.setSnapshot(next, {
        paths: Array.from(changedPaths).sort(),
        sourceScopeId: input.id,
        kind: 'replace'
      });
    }
  };

  return scope;
}
