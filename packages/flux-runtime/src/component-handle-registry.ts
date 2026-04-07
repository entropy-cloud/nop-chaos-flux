import {
  normalizeNodeLocator,
  serializeNodeLocator,
  type ComponentHandle,
  type ComponentHandleDebugData,
  type ComponentHandleRegistry,
  type ComponentTarget,
  type NodeLocator,
  type ResolutionResult
} from '@nop-chaos/flux-core';

export function createComponentHandleRegistry(input: { id: string; parent?: ComponentHandleRegistry }): ComponentHandleRegistry {
  const nodeEnv = 'process' in globalThis
    ? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV
    : undefined;
  const DEBUG_MODE = nodeEnv !== 'production';
  let staticCidCounter = 0;
  let dynamicLoadedCidCounter = -1;
  const handles = new Set<ComponentHandle>();
  const handlesByCid = new Map<number, ComponentHandle>();
  const handlesByLocator = new Map<string, ComponentHandle>();
  const debugDataByCid = new Map<number, ComponentHandleDebugData>();
  const handlesById = new Map<string, ComponentHandle>();
  const handlesByName = new Map<string, ComponentHandle>();
  const dynamicHandles = new Map<string, Map<string, ComponentHandle>>();
  const nameIndex = new Map<string, Set<number>>();

  function allocateCid(isDynamicLoaded?: boolean): number {
    if (isDynamicLoaded) {
      dynamicLoadedCidCounter -= 1;
      return dynamicLoadedCidCounter + 1;
    }

    staticCidCounter += 1;
    return staticCidCounter;
  }

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

    if (handle._locator) {
      handlesByLocator.set(serializeNodeLocator(handle._locator), handle);
    }

    if (handle.id) {
      handlesById.set(handle.id, handle);
    }

    if (handle.name) {
      handlesByName.set(handle.name, handle);
      if (typeof handle._cid === 'number') {
        checkDuplicateName(handle.name, handle._cid);
      }
    }

    if (handle._templateId && handle._instanceKey) {
      const byTemplate = dynamicHandles.get(handle._templateId) ?? new Map<string, ComponentHandle>();
      byTemplate.set(handle._instanceKey, handle);
      dynamicHandles.set(handle._templateId, byTemplate);
    }
  }

  function unindexHandle(handle: ComponentHandle) {
    if (typeof handle._cid === 'number' && handlesByCid.get(handle._cid) === handle) {
      handlesByCid.delete(handle._cid);
      debugDataByCid.delete(handle._cid);
    }

    if (handle._locator) {
      const serializedLocator = serializeNodeLocator(handle._locator);
      if (handlesByLocator.get(serializedLocator) === handle) {
        handlesByLocator.delete(serializedLocator);
      }
    }

    if (handle.id && handlesById.get(handle.id) === handle) {
      handlesById.delete(handle.id);
    }

    if (handle.name && handlesByName.get(handle.name) === handle) {
      handlesByName.delete(handle.name);
      if (typeof handle._cid === 'number') {
        clearNameIndex(handle.name, handle._cid);
      }
    }

    if (handle._templateId && handle._instanceKey) {
      const byTemplate = dynamicHandles.get(handle._templateId);
      if (!byTemplate) {
        return;
      }

      if (byTemplate.get(handle._instanceKey) === handle) {
        byTemplate.delete(handle._instanceKey);
      }

      if (byTemplate.size === 0) {
        dynamicHandles.delete(handle._templateId);
      }
    }
  }

  function resolveInScope(target: ComponentTarget): ComponentHandle | undefined {
    if (target.locator) {
      const byLocator = handlesByLocator.get(serializeNodeLocator(normalizeNodeLocator(target.locator)));
      if (byLocator && byLocator._mounted !== false) {
        return byLocator;
      }
    }

    if (typeof target._targetCid === 'number') {
      const byCid = handlesByCid.get(target._targetCid);
      if (byCid && byCid._mounted !== false) {
        return byCid;
      }
    }

    if (target._targetTemplateId) {
      const instanceKey = target.componentInstanceKey;
      if (instanceKey) {
        const byTemplate = dynamicHandles.get(target._targetTemplateId);
        const dynamicHandle = byTemplate?.get(instanceKey);
        if (dynamicHandle && dynamicHandle._mounted !== false) {
          return dynamicHandle;
        }
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
      const byName = handlesByName.get(target.componentName);

      if (byName) {
        return byName;
      }
    }

    return input.parent?.resolve(target);
  }

  function resolveHandle(locator: NodeLocator): ComponentHandle | undefined {
    const byLocator = handlesByLocator.get(serializeNodeLocator(normalizeNodeLocator(locator)));

    if (byLocator && byLocator._mounted !== false) {
      return byLocator;
    }

    return input.parent?.resolveHandle?.(locator);
  }

  function getLocatorByCid(cid: number): NodeLocator | undefined {
    const handle = handlesByCid.get(cid);

    if (handle?._mounted !== false && handle?._locator) {
      return handle._locator;
    }

    return input.parent?.getLocatorByCid?.(cid);
  }

  function getHandleLocator(handle: ComponentHandle): NodeLocator | undefined {
    if (handle._locator) {
      return handle._locator;
    }

    return input.parent?.getHandleLocator?.(handle);
  }

  function resolveTarget(target: ComponentTarget): ResolutionResult {
    if (target.locator) {
      const handle = resolveHandle(target.locator);

      if (handle) {
        return {
          kind: 'resolved',
          locator: target.locator,
          handle
        };
      }

      return {
        kind: 'notMaterialized',
        locator: target.locator
      };
    }

    const handle = resolveInScope(target);
    if (handle?._locator) {
      return {
        kind: 'resolved',
        locator: handle._locator,
        handle
      };
    }

    if (handle) {
      return {
        kind: 'resolved',
        locator: {
          runtimeId: 'runtime',
          templateGraphId: handle._templateId ?? 'legacy:component-registry',
          templateNodeId: handle._cid ?? -1,
          instancePath: handle._instanceKey
            ? [{ repeatedTemplateId: handle._templateId ?? 'legacy:component-registry', instanceKey: handle._instanceKey }]
            : undefined
        },
        handle
      };
    }

    return {
      kind: 'notFound'
    };
  }

  return {
    id: input.id,
    parent: input.parent,
    register(handle, options) {
      const nextCid = options?.cid ?? handle._cid ?? allocateCid(options?.dynamicLoaded);
      handle._cid = nextCid;
      handle._locator = options?.locator ? normalizeNodeLocator(options.locator) : handle._locator ? normalizeNodeLocator(handle._locator) : handle._locator;
      handle._templateId = options?.templateId ?? handle._templateId;
      handle._instanceKey = options?.instanceKey ?? handle._instanceKey;
      handle._mounted = true;

      if (handle.id) {
        const existingById = handlesById.get(handle.id);

        if (existingById && existingById !== handle) {
          handles.delete(existingById);
          unindexHandle(existingById);
        }
      }

      if (handle.name) {
        const existingByName = handlesByName.get(handle.name);

        if (existingByName && existingByName !== handle) {
          handles.delete(existingByName);
          unindexHandle(existingByName);
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
    cleanupDynamic(templateId) {
      const byTemplate = dynamicHandles.get(templateId);
      if (!byTemplate) {
        return;
      }

      const toRemove = Array.from(byTemplate.values());
      for (const handle of toRemove) {
        if (!handles.has(handle)) {
          continue;
        }

        handles.delete(handle);
        handle._mounted = false;
        unindexHandle(handle);
      }
    },
    resolve: resolveInScope,
    resolveHandle,
    getHandleLocator,
    getLocatorByCid,
    inspectCid(cid) {
      const handle = handlesByCid.get(cid) ?? input.parent?.getHandleByCid?.(cid);
      const debugData = debugDataByCid.get(cid) ?? input.parent?.getHandleDebugData?.(cid);
      const locator = debugData?.locator ?? handle?._locator ?? getLocatorByCid(cid);

      if (!handle && !debugData && !locator) {
        return { kind: 'notFound' };
      }

      if ((handle && handle._mounted === false) || (!handle && locator)) {
        return {
          kind: 'notMaterialized',
          locator
        };
      }

      return {
        kind: 'resolved',
        payload: {
          cid,
          locator: locator ?? {
            runtimeId: 'runtime',
            templateGraphId: handle?._templateId ?? 'legacy:component-registry',
            templateNodeId: handle?._cid ?? cid,
            instancePath: handle?._instanceKey
              ? [{ repeatedTemplateId: handle._templateId ?? 'legacy:component-registry', instanceKey: handle._instanceKey }]
              : undefined
          },
          scopeChain: undefined,
          resolvedMeta: debugData?.resolvedMeta,
          resolvedProps: debugData?.resolvedProps,
          state: debugData?.nodeInstance?.state
        }
      };
    },
    resolveTarget,
    getHandleByCid(cid) {
      const handle = handlesByCid.get(cid);

      if (handle && handle._mounted !== false) {
        return handle;
      }

      return input.parent?.getHandleByCid?.(cid);
    },
    setHandleDebugData(cid, data) {
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
          locator: handle._locator,
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
