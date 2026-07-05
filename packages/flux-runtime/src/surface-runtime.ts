import type {
  CompiledFormValidationModel,
  ScopeRef,
  SurfaceEntry,
  SurfaceRuntime,
  SurfaceStoreApi,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import { publishOwnerStatus } from './status-owner.js';
import { createSurfaceStore } from './surface-store.js';

export function createManagedSurfaceRuntime(
  input: {
    surfaceStore?: SurfaceStoreApi;
    disposeScope?: (scopeId: string) => void;
    createValidationOwner?: (input: {
      id?: string;
      parentScope?: ScopeRef;
      scopePath?: string;
      initialValues?: Record<string, any>;
      existingScope?: ScopeRef;
      validation?: CompiledFormValidationModel;
      initialLifecycleState?: import('@nop-chaos/flux-core').ValidationOwnerLifecycleState;
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

  function publishSurfaceStatus(entry: SurfaceEntry, active: boolean) {
    const statusPath =
      typeof entry.surface.statusPath === 'string' ? entry.surface.statusPath : undefined;
    const ownerScope = entry.ownerScope ?? entry.scope.parent ?? entry.scope;
    publishOwnerStatus(ownerScope, statusPath, {
      id: entry.id,
      kind: entry.kind,
      open: true,
      active,
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
    const ownerScope = entry.ownerScope ?? entry.scope.parent ?? entry.scope;
    publishOwnerStatus(ownerScope, statusPath, {
      id: entry.id,
      kind: entry.kind,
      open: false,
      active: false,
      opening: false,
      closing: false,
    });
  }

  function publishClosedSummary(inputValue: {
    surfaceId: string;
    kind: SurfaceEntry['kind'];
    scope: ScopeRef;
    statusPath?: string;
  }) {
    const ownerScope = inputValue.scope.parent ?? inputValue.scope;
    publishOwnerStatus(ownerScope, inputValue.statusPath, {
      id: inputValue.surfaceId,
      kind: inputValue.kind,
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

  function republishActiveStatuses() {
    const entries = store.getState().entries;
    const activeId = entries[entries.length - 1]?.id;

    for (const entry of entries) {
      publishSurfaceStatus(entry, entry.id === activeId);
    }
  }

  function disposeEntry(entry: SurfaceEntry | undefined) {
    if (!entry) {
      return;
    }

    if (entry.controlledOpen === false) {
      store.setUncontrolledOpen(entry.id, false);
    }
    clearSurfaceStatus(entry);
    entry.validationOwner?.dispose();
    if (entry.validationOwner) {
      input.releaseValidationOwner?.(entry.validationOwner);
    }
    disposeOwnedScope(entry.scope.id);
  }

  return {
    store,
    open({ kind, surface, scope, surfaceId, options }) {
      const resolvedSurfaceId = surfaceId ?? createSurfaceId(scope, kind);
      const ownerValidationPlan = options?.validationPlan ?? options?.ownerTemplateNode?.validationPlan;
      const validationOwner = input.createValidationOwner?.({
        id: `${resolvedSurfaceId}-validation`,
        parentScope: scope,
        scopePath: scope.path,
        initialValues: scope.readOwn(),
        existingScope: scope,
        validation: ownerValidationPlan,
        initialLifecycleState: ownerValidationPlan ? 'active' : 'bootstrapping',
      });
      const entry: SurfaceEntry = {
        id: resolvedSurfaceId,
        kind,
        surface,
        scope,
        ownerScope: options?.ownerScope,
        validationOwner,
        actionScope: options?.actionScope,
        componentRegistry: options?.componentRegistry,
        ownerTemplateNode: options?.ownerTemplateNode,
        ownerNodeInstance: options?.ownerNodeInstance,
        title: options?.title ?? (typeof surface.title === 'string' ? surface.title : surface.title || undefined),
        body: options?.body ?? (surface.body || undefined),
        actions: options?.actions ?? (surface.actions || undefined),
        meta: options?.meta,
        regionHandles: options?.regionHandles,
        controlledOpen: options?.controlledOpen,
        onOpen: options?.onOpen,
        onClose: options?.onClose,
        onConfirm: options?.onConfirm,
      };

      store.push(entry);
      republishActiveStatuses();
      return entry.id;
    },
    upsert(entry) {
      store.upsert(entry);
      republishActiveStatuses();
    },
    publishStatus(surfaceId) {
      const entries = store.getState().entries;

      if (!surfaceId) {
        republishActiveStatuses();
        return;
      }

      const activeId = entries[entries.length - 1]?.id;
      const entry = entries.find((candidate) => candidate.id === surfaceId);

      if (!entry) {
        return;
      }

      publishSurfaceStatus(entry, entry.id === activeId);
    },
    publishClosed(inputValue) {
      publishClosedSummary(inputValue);
    },
    close(surfaceId) {
      const removed = store.remove(surfaceId);
      disposeEntry(removed);
      republishActiveStatuses();
    },
    closeTop() {
      const removed = store.remove();
      disposeEntry(removed);
      republishActiveStatuses();
    },
    dispose() {
      while (store.getState().entries.length > 0) {
        disposeEntry(store.remove());
      }
    },
  };
}
