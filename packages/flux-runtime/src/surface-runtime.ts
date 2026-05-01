import type {
  ScopeRef,
  SurfaceEntry,
  SurfaceRuntime,
  SurfaceStoreApi,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import { publishOwnerStatus } from './status-owner';
import { createSurfaceStore } from './form-store';

export function createManagedSurfaceRuntime(
  input: {
    surfaceStore?: SurfaceStoreApi;
    disposeScope?: (scopeId: string) => void;
    createValidationOwner?: (input: {
      id?: string;
      parentScope?: ScopeRef;
      scopePath?: string;
      initialValues?: Record<string, any>;
    }) => ValidationScopeRuntime;
    releaseValidationOwner?: (owner: ValidationScopeRuntime) => void;
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
      const surfaceId = createSurfaceId(scope, kind);
      const validationOwner = input.createValidationOwner?.({
        id: `${surfaceId}-validation`,
        parentScope: scope,
        scopePath: scope.path,
        initialValues: scope.readOwn(),
      });
      const entry: SurfaceEntry = {
        id: surfaceId,
        kind,
        surface,
        scope,
        validationOwner,
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
      removed?.validationOwner?.dispose();
      if (removed?.validationOwner) {
        input.releaseValidationOwner?.(removed.validationOwner);
      }
      disposeOwnedScope(removed?.scope.id);
    },
    closeTop() {
      const removed = store.remove();
      clearSurfaceStatus(removed);
      removed?.validationOwner?.dispose();
      if (removed?.validationOwner) {
        input.releaseValidationOwner?.(removed.validationOwner);
      }
      disposeOwnedScope(removed?.scope.id);
    },
  };
}
