import type {
  ComponentHandle,
  ComponentHandleDebugData,
  ComponentHandleRegistry,
  ComponentTarget,
} from '@nop-chaos/flux-core';

export function createComponentHandleRegistry(input: { id: string; parent?: ComponentHandleRegistry }): ComponentHandleRegistry {
  const nodeEnv = 'process' in globalThis
    ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV
    : undefined;
  const DEBUG_MODE = nodeEnv !== 'production';
  let debugEnabled = false;
  const handles = new Set<ComponentHandle>();
  const handlesByCid = new Map<number, ComponentHandle>();
  const debugDataByCid = new Map<number, ComponentHandleDebugData>();
  const handlesById = new Map<string, ComponentHandle>();
  const handlesByName = new Map<string, Set<ComponentHandle>>();
  const nameIndex = new Map<string, Set<number>>();

  function checkDuplicateName(name: string, cid: number) {
    if (!DEBUG_MODE) {
      return;
    }

    const existing = nameIndex.get(name);
    if (existing && existing.size > 0) {
      console.warn(
        `[ComponentRegistry] Duplicate component name "${name}" in scope "${input.id}". Existing cids: [${Array.from(existing).join(', ')}], new cid: ${cid}`
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
      handlesById.set(handle.id, handle);
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

    if (handle.id && handlesById.get(handle.id) === handle) {
      handlesById.delete(handle.id);
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

  function resolveInScope(target: ComponentTarget): ComponentHandle | undefined {
    if (typeof target._targetCid === 'number') {
      const byCid = handlesByCid.get(target._targetCid);
      if (byCid && byCid._mounted !== false) {
        return byCid;
      }
    }

    if (target.componentId) {
      const byId = handlesById.get(target.componentId);

      if (byId) {
        if (target.componentName && byId.name && byId.name !== target.componentName) {
          return undefined;
        }

        return byId;
      }

      return input.parent?.resolve(target);
    }

    if (target.componentName) {
      const byName = Array.from(handlesByName.get(target.componentName) ?? []).filter((handle) => handle._mounted !== false);

      if (byName.length === 1) {
        return byName[0];
      }

      if (byName.length > 1) {
        const err = new Error(`Ambiguous component target: ${target.componentName}`) as Error & { _ambiguous?: boolean };
        err._ambiguous = true;
        throw err;
      }
    }

    return input.parent?.resolve(target);
  }

  return {
    id: input.id,
    parent: input.parent,
    get debugEnabled() {
      return debugEnabled;
    },
    setDebugEnabled(enabled: boolean) {
      debugEnabled = enabled;
      if (!enabled) {
        debugDataByCid.clear();
      }
    },
    register(handle, options) {
      const nextCid = options?.cid ?? handle._cid;
      if (typeof nextCid === 'number') {
        handle._cid = nextCid;
      }
      handle._mounted = true;

      if (handle.id) {
        const existingById = handlesById.get(handle.id);

        if (existingById && existingById !== handle) {
          handles.delete(existingById);
          unindexHandle(existingById);
        }
      }

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
      const handle = handlesByCid.get(cid) ?? input.parent?.getHandleByCid?.(cid);
      const debugData = debugDataByCid.get(cid) ?? input.parent?.getHandleDebugData?.(cid);

      if (!handle && !debugData) {
        return { kind: 'notFound' };
      }

      if (handle && handle._mounted === false) {
        return {
          kind: 'notMaterialized',
          cid
        };
      }

      return {
        kind: 'resolved',
        payload: {
          cid,
          scopeChain: undefined,
          resolvedMeta: debugData?.resolvedMeta,
          resolvedProps: debugData?.resolvedProps,
          state: debugData?.nodeInstance?.state
        }
      };
    },
    getHandleByCid(cid) {
      const handle = handlesByCid.get(cid);

      if (handle && handle._mounted !== false) {
        return handle;
      }

      return input.parent?.getHandleByCid?.(cid);
    },
    setHandleDebugData(cid, data) {
      if (!debugEnabled) {
        return;
      }

      if (data) {
        debugDataByCid.set(cid, data);
        return;
      }

      debugDataByCid.delete(cid);
    },
    getHandleDebugData(cid) {
      return debugDataByCid.get(cid) ?? input.parent?.getHandleDebugData?.(cid);
    },
    getDebugSnapshot() {
      return {
        handles: Array.from(handles).map((handle) => ({
          cid: handle._cid,
          id: handle.id,
          name: handle.name,
          type: handle.type,
          mounted: handle._mounted !== false,
          capabilities: handle.capabilities,
        }))
      };
    }
  };
}
