import type { ScopeRef, SurfaceEntry, SurfaceRuntime, SurfaceStoreApi } from '@nop-chaos/flux-core';
import { publishOwnerStatus } from './status-owner';
import { createSurfaceStore } from './form-store';

export function createManagedSurfaceRuntime(
  input: {
    surfaceStore?: SurfaceStoreApi;
    disposeScope?: (scopeId: string) => void;
  } = {},
): SurfaceRuntime {
  const store = input.surfaceStore ?? createSurfaceStore();
  let surfaceCounter = 0;

  function createSurfaceId(scope: ScopeRef, kind: SurfaceEntry['kind']) {
    surfaceCounter += 1;
    return `${scope.id}-${kind}-${surfaceCounter}`;
  }

  function publishSurfaceStatus(entry: SurfaceEntry) {
    const statusPath =
      typeof entry.surface.statusPath === 'string' ? entry.surface.statusPath : undefined;
    const ownerScope = entry.scope.parent ?? entry.scope;
    publishOwnerStatus(ownerScope, statusPath, {
      id: entry.id,
      kind: entry.kind,
      open: true,
      active: true,
      opening: false,
      closing: false,
    });
  }

  function clearSurfaceStatus(entry: SurfaceEntry | undefined) {
    if (!entry) {
      return;
    }

    const statusPath =
      typeof entry.surface.statusPath === 'string' ? entry.surface.statusPath : undefined;
    const ownerScope = entry.scope.parent ?? entry.scope;
    publishOwnerStatus(ownerScope, statusPath, {
      id: entry.id,
      kind: entry.kind,
      open: false,
      active: false,
      opening: false,
      closing: false,
    });
  }

  function disposeOwnedScope(scopeId: string | undefined) {
    if (!scopeId) {
      return;
    }

    input.disposeScope?.(scopeId);
  }

  return {
    store,
    open({ kind, surface, scope, options }) {
      const entry: SurfaceEntry = {
        id: createSurfaceId(scope, kind),
        kind,
        surface,
        scope,
        actionScope: options?.actionScope,
        componentRegistry: options?.componentRegistry,
        ownerTemplateNode: options?.ownerTemplateNode,
        ownerNodeInstance: options?.ownerNodeInstance,
        title: typeof surface.title === 'string' ? surface.title : surface.title || undefined,
        body: surface.body || undefined,
      };

      store.push(entry);
      publishSurfaceStatus(entry);
      return entry.id;
    },
    close(surfaceId) {
      const removed = store.remove(surfaceId);
      clearSurfaceStatus(removed);
      disposeOwnedScope(removed?.scope.id);
    },
    closeTop() {
      const removed = store.remove();
      clearSurfaceStatus(removed);
      disposeOwnedScope(removed?.scope.id);
    },
  };
}
