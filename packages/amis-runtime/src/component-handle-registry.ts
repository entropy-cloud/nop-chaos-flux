import type { ComponentHandle, ComponentHandleRegistry, ComponentTarget } from '@nop-chaos/amis-schema';

export function createComponentHandleRegistry(input: { id: string; parent?: ComponentHandleRegistry }): ComponentHandleRegistry {
  const handles = new Set<ComponentHandle>();
  const handlesById = new Map<string, ComponentHandle>();
  const handlesByName = new Map<string, ComponentHandle>();

  function indexHandle(handle: ComponentHandle) {
    if (handle.id) {
      handlesById.set(handle.id, handle);
    }

    if (handle.name) {
      handlesByName.set(handle.name, handle);
    }
  }

  function unindexHandle(handle: ComponentHandle) {
    if (handle.id && handlesById.get(handle.id) === handle) {
      handlesById.delete(handle.id);
    }

    if (handle.name && handlesByName.get(handle.name) === handle) {
      handlesByName.delete(handle.name);
    }
  }

  function resolveInScope(target: ComponentTarget): ComponentHandle | undefined {
    if (target.componentId) {
      const byId = handlesById.get(target.componentId);

      if (byId) {
        return byId;
      }
    }

    if (target.componentName) {
      const byName = handlesByName.get(target.componentName);

      if (byName) {
        return byName;
      }
    }

    return input.parent?.resolve(target);
  }

  return {
    id: input.id,
    parent: input.parent,
    register(handle) {
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
          unindexHandle(handle);
        }
      };
    },
    unregister(handle) {
      if (!handles.has(handle)) {
        return;
      }

      handles.delete(handle);
      unindexHandle(handle);
    },
    resolve: resolveInScope
  };
}
