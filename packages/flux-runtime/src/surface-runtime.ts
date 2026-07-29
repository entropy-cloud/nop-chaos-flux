import type {
  ActionSchema,
  CompiledFormValidationModel,
  FormRuntime,
  RenderNodeInput,
  RendererEnv,
  ScopeRef,
  SurfaceEntry,
  SurfaceRuntime,
  SurfaceStoreApi,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import { reportRuntimeHostIssue } from '@nop-chaos/flux-core';
import { dispatchInOwner, type HookPayload } from './surface-hooks.js';
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
        title: options?.title ?? (typeof surface.title === 'string' ? surface.title : (surface.title as RenderNodeInput | string | undefined) || undefined),
        body: options?.body ?? (surface.body as RenderNodeInput | undefined),
        actions: options?.actions ?? (surface.actions as RenderNodeInput | undefined),
        meta: options?.meta,
        regionHandles: options?.regionHandles,
        controlledOpen: options?.controlledOpen,
        onOpen: options?.onOpen,
        onClose: options?.onClose,
        onConfirm: options?.onConfirm,
        onCloseNodes: options?.onCloseNodes,
        onSubmitSuccessNodes: options?.onSubmitSuccessNodes,
        onSubmitErrorNodes: options?.onSubmitErrorNodes,
        ownerActionCtx: options?.ownerActionCtx,
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
      if (!removed) return;

      // Snapshot hook info before disposeEntry clears the entry.
      const closeNodes: ActionSchema | ActionSchema[] | undefined = removed.onCloseNodes;
      const ownerActionCtx = removed.ownerActionCtx;

      disposeEntry(removed);
      republishActiveStatuses();

      // Fire onCloseNodes (action-style openDialog/openDrawer only).
      // Declarative surfaces use function-based `entry.onClose` via use-surface-renderer.ts.
      // Fire-and-forget: close() stays sync; hook errors are warned, not thrown.
      if (closeNodes && ownerActionCtx) {
        dispatchInOwner(
          { ...removed, ownerActionCtx },
          closeNodes,
          { hookName: 'close' },
        ).catch((err) => {
          reportRuntimeHostIssue({
            env: ownerActionCtx.runtime.env as RendererEnv,
            level: 'warning',
            message: 'Surface onClose hook failed',
            error: err,
            phase: 'action',
            details: { surfaceId, hookName: 'close' },
          });
        });
      }
    },
    closeTop() {
      const removed = store.remove();
      if (!removed) return;

      const closeNodes = removed.onCloseNodes;
      const ownerActionCtx = removed.ownerActionCtx;

      disposeEntry(removed);
      republishActiveStatuses();

      if (closeNodes && ownerActionCtx) {
        dispatchInOwner(
          { ...removed, ownerActionCtx },
          closeNodes,
          { hookName: 'close' },
        ).catch((err) => {
          reportRuntimeHostIssue({
            env: ownerActionCtx.runtime.env as RendererEnv,
            level: 'warning',
            message: 'Surface onClose hook failed',
            error: err,
            phase: 'action',
            details: { surfaceId: removed.id, hookName: 'close' },
          });
        });
      }
    },
    /**
     * Trigger a lifecycle hook on the given entry. Called by form submit flow
     * (see form.tsx) when a `submitScope: 'surface'` form completes ajax and
     * the entry has matching hook schema nodes.
     *
     * Resolves with the hook dispatch result. Errors propagate; callers
     * should wrap in try/catch when triggering hooks from non-blocking flows.
     */
    async triggerHook(entry: SurfaceEntry, hookName: 'submit:success' | 'submit:error' | 'close', payload: HookPayload) {
      let nodes: ActionSchema | ActionSchema[] | undefined;
      if (hookName === 'submit:success') nodes = entry.onSubmitSuccessNodes;
      else if (hookName === 'submit:error') nodes = entry.onSubmitErrorNodes;
      else nodes = entry.onCloseNodes;

      if (!nodes || !entry.ownerActionCtx) {
        return { ok: true, data: { skipped: true } };
      }

      try {
        return await dispatchInOwner(entry, nodes, payload);
      } catch (err) {
        console.warn(`[surface] ${hookName} hook failed:`, err);
        return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    setSurfaceForm(surfaceId: string, form: FormRuntime | undefined) {
      const entries = store.getState().entries;
      const entry = entries.find((e) => e.id === surfaceId);
      if (!entry) return;
      store.upsert({ ...entry, surfaceForm: form });
    },
    getSurfaceForm(surfaceId: string): FormRuntime | undefined {
      const entries = store.getState().entries;
      const entry = entries.find((e) => e.id === surfaceId);
      return entry?.surfaceForm;
    },
    dispose() {
      while (store.getState().entries.length > 0) {
        disposeEntry(store.remove());
      }
    },
  };
}
