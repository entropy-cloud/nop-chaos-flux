import type {
  ComponentHandle,
  ComponentHandleDebugData,
  ComponentHandleRegistry,
  ComponentTarget,
} from '@nop-chaos/flux-core';
import { buildScopeChain } from '@nop-chaos/flux-core';

export function createComponentHandleRegistry(input: {
  id: string;
  parent?: ComponentHandleRegistry;
}): ComponentHandleRegistry {
  const nodeEnv =
    'process' in globalThis
      ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV
      : undefined;
  const DEBUG_MODE = nodeEnv !== 'production';
  let debugEnabled = false;
  const handles = new Set<ComponentHandle>();
  const handlesByCid = new Map<number, ComponentHandle>();
  const debugDataByCid = new Map<number, ComponentHandleDebugData>();
  const handlesById = new Map<string, Set<ComponentHandle>>();
  const handlesByName = new Map<string, Set<ComponentHandle>>();
  const nameIndex = new Map<string, Set<number>>();
  const childRegistries = new Set<ComponentHandleRegistry>();
  const debugEnabledListeners = new Set<() => void>();

  type RegistryWithChildren = ComponentHandleRegistry & {
    __childRegistries?: Set<ComponentHandleRegistry>;
  };
  type RegistryWithResolveTraversal = ComponentHandleRegistry & {
    resolve?: (
      target: ComponentTarget,
      visited?: Set<ComponentHandleRegistry>,
    ) => ComponentHandle | undefined;
  };

  function resolveHandleByCid(
    cid: number,
    includeParent = true,
    visited: Set<ComponentHandleRegistry> = new Set(),
  ): ComponentHandle | undefined {
    if (visited.has(registry)) {
      return undefined;
    }

    visited.add(registry);
    const local = handlesByCid.get(cid);
    if (local && local._mounted !== false) {
      return local;
    }

    for (const child of childRegistries) {
      const nested = (
        child as ComponentHandleRegistry & {
          __resolveHandleByCid?: (
            cid: number,
            includeParent?: boolean,
            visited?: Set<ComponentHandleRegistry>,
          ) => ComponentHandle | undefined;
        }
      ).__resolveHandleByCid?.(cid, false, visited);
      if (nested && nested._mounted !== false) {
        return nested;
      }
    }

    return includeParent
      ? (
          input.parent as
            | (ComponentHandleRegistry & {
                __resolveHandleByCid?: (
                  cid: number,
                  includeParent?: boolean,
                  visited?: Set<ComponentHandleRegistry>,
                ) => ComponentHandle | undefined;
              })
            | undefined
        )?.__resolveHandleByCid?.(cid, true, visited)
      : undefined;
  }

  function resolveDebugDataByCid(
    cid: number,
    includeParent = true,
    visited: Set<ComponentHandleRegistry> = new Set(),
  ): ComponentHandleDebugData | undefined {
    if (visited.has(registry)) {
      return undefined;
    }

    visited.add(registry);
    const local = debugDataByCid.get(cid);
    if (local) {
      return local;
    }

    for (const child of childRegistries) {
      const nested = (
        child as ComponentHandleRegistry & {
          __resolveDebugDataByCid?: (
            cid: number,
            includeParent?: boolean,
            visited?: Set<ComponentHandleRegistry>,
          ) => ComponentHandleDebugData | undefined;
        }
      ).__resolveDebugDataByCid?.(cid, false, visited);
      if (nested) {
        return nested;
      }
    }

    return includeParent
      ? (
          input.parent as
            | (ComponentHandleRegistry & {
                __resolveDebugDataByCid?: (
                  cid: number,
                  includeParent?: boolean,
                  visited?: Set<ComponentHandleRegistry>,
                ) => ComponentHandleDebugData | undefined;
              })
            | undefined
        )?.__resolveDebugDataByCid?.(cid, true, visited)
      : undefined;
  }

  function checkDuplicateName(name: string, cid: number) {
    if (!DEBUG_MODE) {
      return;
    }

    const existing = nameIndex.get(name);
    if (existing && existing.size > 0) {
      console.warn(
        `[ComponentRegistry] Duplicate component name "${name}" in scope "${input.id}". Existing cids: [${Array.from(existing).join(', ')}], new cid: ${cid}`,
      );
    }

    if (existing) {
      existing.add(cid);
      return;
    }

    nameIndex.set(name, new Set([cid]));
  }

  function clearNameIndex(name: string, cid: number) {
    const indexed = nameIndex.get(name);
    if (!indexed) {
      return;
    }

    indexed.delete(cid);
    if (indexed.size === 0) {
      nameIndex.delete(name);
    }
  }

  function indexHandle(handle: ComponentHandle) {
    if (typeof handle._cid === 'number') {
      handlesByCid.set(handle._cid, handle);
    }

    if (handle.id) {
      const existingById = handlesById.get(handle.id) ?? new Set<ComponentHandle>();
      existingById.add(handle);
      handlesById.set(handle.id, existingById);
    }

    if (handle.name) {
      if (typeof handle._cid === 'number') {
        checkDuplicateName(handle.name, handle._cid);
      }

      const existingByName = handlesByName.get(handle.name) ?? new Set<ComponentHandle>();
      existingByName.add(handle);
      handlesByName.set(handle.name, existingByName);
    }
  }

  function unindexHandle(handle: ComponentHandle) {
    if (typeof handle._cid === 'number' && handlesByCid.get(handle._cid) === handle) {
      handlesByCid.delete(handle._cid);
    }

    if (handle.id) {
      const indexedById = handlesById.get(handle.id);
      indexedById?.delete(handle);
      if (indexedById && indexedById.size === 0) {
        handlesById.delete(handle.id);
      }
    }

    if (handle.name) {
      const indexedByName = handlesByName.get(handle.name);
      indexedByName?.delete(handle);
      if (indexedByName && indexedByName.size === 0) {
        handlesByName.delete(handle.name);
      }

      if (typeof handle._cid === 'number') {
        clearNameIndex(handle.name, handle._cid);
      }
    }
  }

  function resolveInScope(
    target: ComponentTarget,
    visited: Set<ComponentHandleRegistry> = new Set(),
  ): ComponentHandle | undefined {
    if (visited.has(registry)) {
      return undefined;
    }

    visited.add(registry);

    if (typeof target._targetCid === 'number') {
      const byCid = handlesByCid.get(target._targetCid);
      if (byCid && byCid._mounted !== false) {
        return byCid;
      }
    }

    if (target.componentId) {
      const byId = Array.from(handlesById.get(target.componentId) ?? []).filter(
        (handle) => handle._mounted !== false,
      );

      if (byId.length === 1) {
        if (target.componentName && byId[0].name && byId[0].name !== target.componentName) {
          return undefined;
        }

        return byId[0];
      }

      if (byId.length > 1) {
        const err = new Error(`Ambiguous component target: ${target.componentId}`) as Error & {
          _ambiguous?: boolean;
        };
        err._ambiguous = true;
        throw err;
      }

      for (const child of childRegistries) {
        const nested = (child as RegistryWithResolveTraversal).resolve?.(target, visited);
        if (nested) {
          return nested;
        }
      }

      return (input.parent as RegistryWithResolveTraversal | undefined)?.resolve?.(target, visited);
    }

    if (target.componentName) {
      const byName = Array.from(handlesByName.get(target.componentName) ?? []).filter(
        (handle) => handle._mounted !== false,
      );

      if (byName.length === 1) {
        return byName[0];
      }

      if (byName.length > 1) {
        const err = new Error(`Ambiguous component target: ${target.componentName}`) as Error & {
          _ambiguous?: boolean;
        };
        err._ambiguous = true;
        throw err;
      }
    }

    return (input.parent as RegistryWithResolveTraversal | undefined)?.resolve?.(target, visited);
  }

  const registry = {
    id: input.id,
    parent: input.parent,
    get debugEnabled() {
      return debugEnabled;
    },
    setDebugEnabled(enabled: boolean) {
      debugEnabled = enabled;
      for (const listener of debugEnabledListeners) {
        listener();
      }
      for (const child of childRegistries) {
        child.setDebugEnabled?.(enabled);
      }
      if (!enabled) {
        debugDataByCid.clear();
      }
    },
    subscribeDebugEnabled(listener: () => void) {
      debugEnabledListeners.add(listener);

      return () => {
        debugEnabledListeners.delete(listener);
      };
    },
    register(handle, options) {
      const nextCid = options?.cid ?? handle._cid;
      if (typeof nextCid === 'number') {
        handle._cid = nextCid;
      }
      handle._mounted = true;

      handles.add(handle);
      indexHandle(handle);

      return () => {
        if (handles.has(handle)) {
          handles.delete(handle);
          handle._mounted = false;
          unindexHandle(handle);
        }
      };
    },
    unregister(handle) {
      if (!handles.has(handle)) {
        return;
      }

      handles.delete(handle);
      handle._mounted = false;
      unindexHandle(handle);
    },
    resolve: resolveInScope,
    inspectCid(cid) {
      const handle = resolveHandleByCid(cid);
      const debugData = resolveDebugDataByCid(cid);

      if (!handle && !debugData) {
        return { kind: 'notFound' };
      }

      if (handle && handle._mounted === false) {
        return {
          kind: 'notMaterialized',
          cid,
          instancePath: debugData?.nodeInstance?.instancePath,
        };
      }

      return {
        kind: 'resolved',
        payload: {
          cid,
          instancePath: debugData?.nodeInstance?.instancePath,
          scopeChain: buildScopeChain(debugData?.scope),
          resolvedMeta: debugData?.resolvedMeta,
          resolvedProps: debugData?.resolvedProps,
          state: debugData?.nodeInstance?.state,
        },
      };
    },
    getHandleByCid(cid) {
      return resolveHandleByCid(cid);
    },
    setHandleDebugData(cid, data) {
      if (!debugEnabled) {
        if (data == null) {
          debugDataByCid.delete(cid);
        }
        return;
      }

      if (data) {
        debugDataByCid.set(cid, data);
        return;
      }

      debugDataByCid.delete(cid);
    },
    getHandleDebugData(cid) {
      return resolveDebugDataByCid(cid);
    },
    getDebugSnapshot() {
      return {
        handles: [
          ...Array.from(handles).map((handle) => ({
            cid: handle._cid,
            id: handle.id,
            name: handle.name,
            type: handle.type,
            mounted: handle._mounted !== false,
            capabilities: handle.capabilities,
          })),
          ...Array.from(childRegistries).flatMap(
            (child) => child.getDebugSnapshot?.().handles ?? [],
          ),
        ],
      };
    },
    dispose() {
      for (const child of childRegistries) {
        child.dispose?.();
      }
      childRegistries.clear();
      // remove from parent
      if (input.parent) {
        (input.parent as RegistryWithChildren).__childRegistries?.delete(registry);
      }
      // clear own state
      handles.clear();
      handlesByCid.clear();
      debugDataByCid.clear();
      handlesById.clear();
      handlesByName.clear();
      nameIndex.clear();
      debugEnabledListeners.clear();
    },
  } satisfies ComponentHandleRegistry;

  (registry as RegistryWithChildren).__childRegistries = childRegistries;
  (
    registry as ComponentHandleRegistry & { __resolveHandleByCid?: typeof resolveHandleByCid }
  ).__resolveHandleByCid = resolveHandleByCid;
  (
    registry as ComponentHandleRegistry & { __resolveDebugDataByCid?: typeof resolveDebugDataByCid }
  ).__resolveDebugDataByCid = resolveDebugDataByCid;

  if (input.parent) {
    const parentWithChildren = input.parent as RegistryWithChildren;
    if (!parentWithChildren.__childRegistries) {
      parentWithChildren.__childRegistries = new Set<ComponentHandleRegistry>();
    }
    parentWithChildren.__childRegistries.add(registry);
    if (input.parent.debugEnabled) {
      registry.setDebugEnabled(true);
    }
  }

  return registry;
}
