import { createStore } from 'zustand/vanilla';
import type { ScopeRef, ScopeStore } from '@nop-chaos/flux-core';
import { getIn, isPlainObject, parsePath, setIn } from '@nop-chaos/flux-core';

export function createScopeStore(initialData: Record<string, any>): ScopeStore<Record<string, any>> {
  const store = createStore<{ snapshot: Record<string, any> }>(() => ({ snapshot: initialData }));

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
  update?: (path: string, value: unknown) => void;
}): ScopeRef {
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

