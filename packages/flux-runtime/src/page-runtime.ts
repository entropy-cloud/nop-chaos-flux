import type {
  DialogState,
  PageRuntime,
  PageStoreApi,
  RendererRuntime,
  ScopeChange,
  SurfaceState,
  SurfaceStoreApi
} from '@nop-chaos/flux-core';
import { createPageStore, createSurfaceStore } from './form-store';
import { createScopeRef } from './scope';
import { publishOwnerStatus } from './status-owner';

export function createManagedPageRuntime(input: {
  data?: Record<string, any>;
  pageStore?: PageStoreApi;
  surfaceStore?: SurfaceStoreApi;
  disposeScope?: (scopeId: string) => void;
} = {}): PageRuntime {
  const data = input.data ?? {};
  const store = input.pageStore ?? createPageStore(data);
  const surfaceStore = input.surfaceStore ?? createSurfaceStore();
  store.setData(data);
  let lastChange: ScopeChange = {
    paths: ['*'],
    sourceScopeId: 'page',
    kind: 'replace'
  };

  function setLastChange(change: ScopeChange) {
    lastChange = change;
  }

  const scope = createScopeRef({
    id: 'page',
    path: '$page',
    initialData: store.getState().data,
    store: {
      getSnapshot: () => store.getState().data,
      getLastChange: () => lastChange,
      setSnapshot: (next, change) => {
        setLastChange(change ?? {
          paths: ['*'],
          sourceScopeId: 'page',
          kind: 'replace'
        });
        store.setData(next);
      },
      subscribe: (listener) => store.subscribe(() => listener(lastChange))
    },
    update: (path, value) => {
      setLastChange({
        paths: [path || '*'],
        sourceScopeId: 'page',
        kind: 'update'
      });
      store.updateData(path, value);
    }
  });
  let surfaceCounter = 0;

  function createSurfaceId(nodeId: string, kind: 'dialog' | 'drawer') {
    surfaceCounter += 1;
    return `${nodeId}-${kind}-${surfaceCounter}`;
  }

  function buildSurfaceState(
    kind: 'dialog' | 'drawer',
    surface: Record<string, any>,
    surfaceScope: typeof scope,
    _runtime: RendererRuntime,
    options?: {
      actionScope?: import('@nop-chaos/flux-core').ActionScope;
      componentRegistry?: import('@nop-chaos/flux-core').ComponentHandleRegistry;
      ownerTemplateNode?: import('@nop-chaos/flux-core').TemplateNode;
      ownerNodeInstance?: import('@nop-chaos/flux-core').NodeInstance;
    }
  ): SurfaceState {
    const id = createSurfaceId(surfaceScope.id, kind);

    return {
      id,
      kind,
      surface,
      scope: surfaceScope,
      actionScope: options?.actionScope,
      componentRegistry: options?.componentRegistry,
      ownerTemplateNode: options?.ownerTemplateNode,
      ownerNodeInstance: options?.ownerNodeInstance,
      title: typeof surface.title === 'string'
        ? surface.title
        : surface.title || undefined,
      body: surface.body || undefined
    };
  }

  function publishSurfaceStatus(surface: SurfaceState) {
    const statusPath = typeof surface.surface.statusPath === 'string' ? surface.surface.statusPath : undefined;
    publishOwnerStatus(scope, statusPath, {
      id: surface.id,
      kind: surface.kind,
      open: true,
      active: true,
      opening: false,
      closing: false
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
    surfaceStore,
    scope,
    openDialog(dialog, dialogScope, runtime: RendererRuntime, options) {
      const surface = buildSurfaceState('dialog', dialog, dialogScope, runtime, options);
      surfaceStore.openSurface(surface);
      const dialogState: DialogState = {
        id: surface.id,
        kind: 'dialog',
        dialog,
        scope: surface.scope,
        actionScope: surface.actionScope,
        componentRegistry: surface.componentRegistry,
        ownerTemplateNode: surface.ownerTemplateNode,
        ownerNodeInstance: surface.ownerNodeInstance,
        title: surface.title,
        body: surface.body
      };
      surfaceStore.openDialog(dialogState);
      publishSurfaceStatus(surface);
      return surface.id;
    },
    closeDialog(dialogId) {
      const dialogs = surfaceStore.getState().dialogs;
      const targetDialog = dialogId
        ? dialogs.find((dialog) => dialog.id === dialogId)
        : dialogs[dialogs.length - 1];

      if (!targetDialog) {
        return;
      }

      surfaceStore.closeDialog(targetDialog.id);
      surfaceStore.closeSurface(targetDialog.id);
      disposeOwnedScope(targetDialog.scope.id);
    },
    openSurface(kind, surface, surfaceScope, runtime, options) {
      const nextSurface = buildSurfaceState(kind, surface, surfaceScope, runtime, options);
      surfaceStore.openSurface(nextSurface);
      publishSurfaceStatus(nextSurface);
      return nextSurface.id;
    },
    closeSurface(surfaceId) {
      const surfaces = surfaceStore.getState().surfaces;
      const targetSurface = surfaceId
        ? surfaces.find((surface) => surface.id === surfaceId)
        : surfaces[surfaces.length - 1];

      if (!targetSurface) {
        return;
      }

      surfaceStore.closeSurface(targetSurface.id);

      if (targetSurface.kind === 'dialog') {
        surfaceStore.closeDialog(targetSurface.id);
      }

      disposeOwnedScope(targetSurface.scope.id);
    },
    refresh() {
      store.refresh();
    }
  };
}
