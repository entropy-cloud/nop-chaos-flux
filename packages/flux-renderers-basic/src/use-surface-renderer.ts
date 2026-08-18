import React from 'react';
import type {
  RendererComponentProps,
  ScopeRef,
  SurfaceEntry,
  SurfaceStatusSummary,
} from '@nop-chaos/flux-core';
import { useCurrentActionScope, useCurrentComponentRegistry, useCurrentSurfaceRuntime, useRendererRuntime, useSurfaceComponentHandle } from '@nop-chaos/flux-react';
import type { DialogSchema, DrawerSchema } from './schemas.js';

function getSurfaceScopeId(
  surfaceId: string,
  kind: 'dialog' | 'drawer',
) {
  return `${surfaceId}:${kind}-scope`;
}

/**
 * Extract a simple scope path from a controlled-open expression like
 * `"${todoDialogOpen}"` or `"${panel.open}"`. Returns undefined for booleans
 * or arbitrary expressions (those keep the pure-latch semantics).
 */
function extractControlledOpenPath(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  const match = trimmed.match(/^\$\{([a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*)\}$/);
  return match?.[1];
}

function disposeSurfaceScope(runtime: { disposeScope: (scopeId: string) => void }, scope: ScopeRef | undefined) {
  if (!scope) {
    return;
  }

  runtime.disposeScope(scope.id);
}

export function useSurfaceRenderer(
  props: RendererComponentProps<DialogSchema>,
  kind: 'dialog',
): {
  summary: SurfaceStatusSummary;
};
export function useSurfaceRenderer(
  props: RendererComponentProps<DrawerSchema>,
  kind: 'drawer',
): {
  summary: SurfaceStatusSummary;
};
export function useSurfaceRenderer(
  props: RendererComponentProps<DialogSchema> | RendererComponentProps<DrawerSchema>,
  kind: 'dialog' | 'drawer',
) {
  const { id, node, templateNode, props: resolvedProps, meta: resolvedMeta, regions, events } = props;
  const runtime = useRendererRuntime();
  const surfaceRuntime = useCurrentSurfaceRuntime();
  const controlledOpen = resolvedProps.open;
  const defaultOpen = Boolean(resolvedProps.defaultOpen ?? false);
  const closedPublishedRef = React.useRef(false);
  const statusPath = typeof resolvedProps.statusPath === 'string' ? resolvedProps.statusPath : undefined;
  const resolvedData =
    resolvedProps.data && typeof resolvedProps.data === 'object'
      ? (resolvedProps.data as Record<string, unknown>)
      : undefined;
  const resolvedIsolate = resolvedProps.isolate === true;
  const [openRevision, setOpenRevision] = React.useState(0);
  const uncontrolledOpen = React.useSyncExternalStore(
    surfaceRuntime?.store.subscribe ?? (() => () => undefined),
    () => {
      if (!surfaceRuntime) {
        return defaultOpen;
      }

      return surfaceRuntime.store.getUncontrolledOpen(id) ?? defaultOpen;
    },
    () => defaultOpen,
  );
  // Plan 459 B1: when a controlled dialog's surface entry is closed by the
  // user (X / outside / Esc) the controlled expression stays true, so a
  // subsequent idempotent setValue(openPath, true) never flips and the
  // dialog can never reopen. Add a userClosed latch that the X-close path
  // sets to true and the schema-open path resets to false on a real false→true
  // flip. Scope variables also need sync so the user close is observable by
  // the schema's `open` expression.
  const [userClosed, setUserClosed] = React.useState(false);
  const effectiveOpen =
    (controlledOpen !== undefined ? Boolean(controlledOpen) : uncontrolledOpen) && !userClosed;
  const [openingData, setOpeningData] = React.useState<Record<string, unknown> | undefined>(() =>
    effectiveOpen ? resolvedData : undefined,
  );
  const [declarativeScope, setDeclarativeScope] = React.useState<ScopeRef | undefined>(undefined);
  const declarativeScopeRef = React.useRef<ScopeRef | undefined>(undefined);
  const lastOpenRef = React.useRef(effectiveOpen);
  const closeHandledRef = React.useRef(false);
  const eventHandlers = React.useMemo(
    () => ({
    onOpen: events.onOpen,
    onClose: events.onClose,
    onConfirm: events.onConfirm,
    }),
    [events.onClose, events.onConfirm, events.onOpen],
  );

  React.useEffect(() => {
    if (!surfaceRuntime || controlledOpen !== undefined) {
      return;
    }

    surfaceRuntime.store.setUncontrolledOpen(id, defaultOpen);

    return () => {
      surfaceRuntime.store.clearUncontrolledOpen(id);
    };
  }, [controlledOpen, defaultOpen, id, surfaceRuntime]);

  React.useLayoutEffect(() => {
    if (effectiveOpen && !lastOpenRef.current) {
      setOpeningData(resolvedData);
      setOpenRevision((value) => value + 1);
    } else if (!effectiveOpen && lastOpenRef.current) {
      setOpeningData(undefined);
    }

    lastOpenRef.current = effectiveOpen;
  }, [effectiveOpen, resolvedData]);

  React.useLayoutEffect(() => {
    if (!effectiveOpen) {
      const current = declarativeScopeRef.current;
      declarativeScopeRef.current = undefined;
      disposeSurfaceScope(runtime, current);
      setDeclarativeScope(undefined);
      return;
    }

    const nextScope = runtime.createChildScope(
      node.scope,
      {
        dialogId: id,
        ...(openingData ?? {}),
        ...(kind === 'drawer' ? { drawerId: id } : {}),
      },
      {
        scopeKey: `${getSurfaceScopeId(id, kind)}:${openRevision}`,
        pathSuffix: kind,
        isolate: resolvedIsolate,
      },
    );

    const current = declarativeScopeRef.current;
    if (current === nextScope) {
      return;
    };

    declarativeScopeRef.current = nextScope;
    disposeSurfaceScope(runtime, current);
    setDeclarativeScope(nextScope);
  }, [effectiveOpen, id, kind, node.scope, openRevision, openingData, resolvedIsolate, runtime]);
  const cleanupRef = React.useRef({
    surfaceRuntime,
    id,
    kind,
    statusPath,
    nodeScope: node.scope,
    declarativeScope,
  });

  React.useEffect(() => {
    declarativeScopeRef.current = declarativeScope;
  }, [declarativeScope]);

  React.useEffect(() => {
    cleanupRef.current = {
      surfaceRuntime,
      id,
      kind,
      statusPath,
      nodeScope: node.scope,
      declarativeScope,
    };
  }, [declarativeScope, id, kind, node.scope, statusPath, surfaceRuntime]);

  const actionScope = useCurrentActionScope();
  const componentRegistry = useCurrentComponentRegistry();
  // CX-10 / bug-83 family convention: schema event dispatches carry a second
  // dispatch-arg ctx { event, evaluationBindings, scope } so action args
  // templates can read payload keys (${surfaceId}) as bare bindings.
  const eventCtx = React.useCallback(
    (payload: { surfaceId: string; kind: 'dialog' | 'drawer'; open: boolean }) => ({
      event: { ...payload, type: 'custom' },
      evaluationBindings: payload,
      scope: node.scope,
    }),
    [node.scope],
  );
  const handleSurfaceOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        surfaceRuntime?.store.setUncontrolledOpen(id, nextOpen);
      }

      if (!nextOpen) {
        if (closeHandledRef.current) {
          return;
        }

        closeHandledRef.current = true;
        const payload = { surfaceId: id, kind, open: false };
        void eventHandlers.onClose?.(payload, eventCtx(payload));
        // Plan 459 fix: controlled dialog X / outside / Esc — also tear down the
        // surface and sync the controlled scope variable so the schema's
        // next open intent (setValue(openPath, true)) can flip false→true.
        surfaceRuntime?.close(id);
        if (controlledOpen !== undefined) {
          setUserClosed(true);
          const rawOpen = (templateNode.schema as { open?: unknown } | undefined)?.open;
          const openPath = extractControlledOpenPath(rawOpen);
          if (openPath) {
            node.scope.update(openPath, false);
          }
        }
        return;
      }

      closeHandledRef.current = false;
      const payload = { surfaceId: id, kind, open: true };
      void eventHandlers.onOpen?.(payload, eventCtx(payload));
    },
    [controlledOpen, eventCtx, eventHandlers, id, kind, node.scope, surfaceRuntime, templateNode],
  );
  const surfacePayload = React.useMemo(
    () => ({
      ...resolvedProps,
      __handleOpenChange: handleSurfaceOpenChange,
    }),
    [handleSurfaceOpenChange, resolvedProps],
  );
  const meta = React.useMemo(
    () => ({
      className: resolvedMeta.className,
      testid: resolvedMeta.testid,
      cid: resolvedMeta.cid,
    }),
    [resolvedMeta.cid, resolvedMeta.className, resolvedMeta.testid],
  );
  const titleNode = regions.title?.templateNode ?? resolvedProps.title;
  const bodyNode = regions.body?.templateNode ?? resolvedProps.body;
  const actionsNode = regions.actions?.templateNode ?? resolvedProps.actions;

  const openSurface = React.useCallback(() => {
    if (!surfaceRuntime || !declarativeScope) {
      return;
    }

    const entry: SurfaceEntry = {
      id,
      kind,
      surface: surfacePayload,
      scope: declarativeScope,
      actionScope,
      componentRegistry,
      ownerTemplateNode: templateNode,
      ownerNodeInstance: node,
      title: titleNode,
      body: bodyNode,
      actions: actionsNode,
      meta,
      regionHandles: regions,
      controlledOpen: controlledOpen !== undefined,
      onOpen: () => {
        const payload = { surfaceId: id, kind, open: true };
        void eventHandlers.onOpen?.(payload, eventCtx(payload));
      },
      onClose: () => {
        const payload = { surfaceId: id, kind, open: false };
        void eventHandlers.onClose?.(payload, eventCtx(payload));
      },
      onConfirm: () => {
        const payload = { surfaceId: id, kind, open: true };
        void eventHandlers.onConfirm?.(payload, eventCtx(payload));
      },
    };

    const existing = surfaceRuntime.store.getState().entries.find((candidate) => candidate.id === id);
    if (existing) {
      if (
        existing.surface === surfacePayload &&
        existing.scope === declarativeScope &&
        existing.actionScope === actionScope &&
        existing.componentRegistry === componentRegistry &&
        existing.ownerTemplateNode === templateNode &&
        existing.ownerNodeInstance === node &&
        existing.title === titleNode &&
        existing.body === bodyNode &&
        existing.actions === actionsNode &&
        existing.meta === meta &&
        existing.regionHandles === regions &&
        existing.controlledOpen === (controlledOpen !== undefined)
      ) {
        return;
      }

      surfaceRuntime.upsert({
        ...existing,
        ...entry,
        validationOwner: existing.validationOwner,
      });
      return;
    }

    surfaceRuntime.open({
      kind,
      surface: entry.surface,
      scope: entry.scope,
      surfaceId: entry.id,
      options: {
        actionScope: entry.actionScope,
        componentRegistry: entry.componentRegistry,
        ownerTemplateNode: entry.ownerTemplateNode,
        ownerNodeInstance: entry.ownerNodeInstance,
        title: entry.title,
        body: entry.body,
        actions: entry.actions,
        meta: entry.meta,
        regionHandles: entry.regionHandles,
        controlledOpen: entry.controlledOpen,
        onOpen: entry.onOpen,
        onClose: entry.onClose,
        onConfirm: entry.onConfirm,
      },
    });
  }, [
    actionScope,
    actionsNode,
    bodyNode,
    componentRegistry,
    controlledOpen,
    declarativeScope,
    eventCtx,
    eventHandlers,
    id,
    kind,
    meta,
    node,
    regions,
    surfacePayload,
    surfaceRuntime,
    templateNode,
    titleNode,
  ]);

  React.useEffect(() => {
    if (!surfaceRuntime) {
      return;
    }

    if (effectiveOpen) {
      if (!declarativeScope) {
        return;
      }
      closedPublishedRef.current = false;
      closeHandledRef.current = false;
      openSurface();
      return;
    }

    const existing = surfaceRuntime.store.getState().entries.find((candidate) => candidate.id === id);
    if (!existing) {
      if (!closedPublishedRef.current) {
        surfaceRuntime.publishClosed({
          surfaceId: id,
          kind,
          scope: declarativeScope ?? node.scope,
          statusPath,
        });
        closedPublishedRef.current = true;
      }
      return;
    }

    if (!closeHandledRef.current) {
      closeHandledRef.current = true;
      void existing.onClose?.();
    }

    surfaceRuntime.close(id);
    if (!closedPublishedRef.current) {
      surfaceRuntime.publishClosed({
        surfaceId: id,
        kind,
        scope: declarativeScope ?? node.scope,
        statusPath,
      });
      closedPublishedRef.current = true;
    }
  }, [declarativeScope, effectiveOpen, id, kind, node.scope, openSurface, statusPath, surfaceRuntime]);

  React.useEffect(() => {
    return () => {
      const current = cleanupRef.current;
      const existing = current.surfaceRuntime?.store
        .getState()
        .entries.find((candidate) => candidate.id === current.id);
      if (existing && !closeHandledRef.current) {
        closeHandledRef.current = true;
        void existing.onClose?.();
      }
      current.surfaceRuntime?.close(current.id);
      if (!closedPublishedRef.current) {
        current.surfaceRuntime?.publishClosed({
          surfaceId: current.id,
          kind: current.kind,
          scope: current.declarativeScope ?? current.nodeScope,
          statusPath: current.statusPath,
        });
        closedPublishedRef.current = true;
      }

      declarativeScopeRef.current = undefined;
      disposeSurfaceScope(runtime, current.declarativeScope);
    };
  }, [runtime]);

  const lastEntriesRef = React.useRef<SurfaceEntry[] | undefined>(undefined);
  const lastSummaryRef = React.useRef<SurfaceStatusSummary | undefined>(undefined);

  const summary = React.useSyncExternalStore(
    surfaceRuntime?.store.subscribe ?? (() => () => undefined),
    () => {
      const entries = surfaceRuntime?.store.getState().entries ?? [];
      if (lastEntriesRef.current === entries && lastSummaryRef.current) {
        return lastSummaryRef.current;
      }

      const runtimeEntry = entries.find((entry) => entry.id === id);
      const activeId = entries.at(-1)?.id;
      const nextSummary: SurfaceStatusSummary = {
        id,
        kind,
        open: Boolean(runtimeEntry),
        active: runtimeEntry?.id === activeId,
        opening: false,
        closing: false,
      };

      if (
        lastSummaryRef.current &&
        lastSummaryRef.current.open === nextSummary.open &&
        lastSummaryRef.current.active === nextSummary.active &&
        lastSummaryRef.current.opening === nextSummary.opening &&
        lastSummaryRef.current.closing === nextSummary.closing
      ) {
        lastEntriesRef.current = entries;
        return lastSummaryRef.current;
      }

      lastEntriesRef.current = entries;
      lastSummaryRef.current = nextSummary;
      return nextSummary;
    },
    () => ({
      id,
      kind,
      open: false,
      active: false,
      opening: false,
      closing: false,
    }),
  );

  useSurfaceComponentHandle({
    id,
    kind,
    cid: resolvedMeta.cid,
    methods: ['open', 'close', 'toggle'],
    isControlled: () => controlledOpen !== undefined,
    isOpen: () => {
      if (!surfaceRuntime) {
        return false;
      }
      return Boolean(
        surfaceRuntime.store.getState().entries.find((entry) => entry.id === id),
      );
    },
    setOpen: (nextOpen) => {
      if (controlledOpen !== undefined) {
        return;
      }
      surfaceRuntime?.store.setUncontrolledOpen(id, nextOpen);
    },
  });

  // Plan 459 B1 reopen: when the controlled expression flips false → true
  // again (the schema-author reopen path), clear the userClosed latch so the
  // surface can re-surface. handleSurfaceOpenChange(true) is never invoked
  // by base-ui (only close is reported), so an effect is the canonical hook.
  const prevControlledOpenRef = React.useRef(controlledOpen);
  React.useEffect(() => {
    const prev = prevControlledOpenRef.current;
    prevControlledOpenRef.current = controlledOpen;
    if (
      controlledOpen !== undefined &&
      Boolean(controlledOpen) &&
      !prev
    ) {
      setUserClosed(false);
    }
  }, [controlledOpen]);

  // Plan 460 B1: when a controlled dialog's surface entry is removed by an
  // external path (closeSurface action, surfaceRuntime.close) instead of the
  // X/outside/Esc route in handleSurfaceOpenChange, the scope variable driving
  // the open expression stays true. If the schema's open expression was
  // already true when the entry vanished, write the variable back to false so
  // the schema's idempotent setValue(openPath, true) can reopen it. The
  // X-close path already wrote the scope to false — but calling update again
  // on the same value is a no-op so the latch-less code path is safe.
  // Track a 'saw-open' latch so the first effect run (entry appearing on mount)
  // is not mistaken for an external removal.
  const sawSummaryOpenRef = React.useRef(false);
  const wasSummaryOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (!surfaceRuntime || controlledOpen === undefined) {
      wasSummaryOpenRef.current = summary.open;
      sawSummaryOpenRef.current = summary.open;
      return;
    }
    const wasOpen = wasSummaryOpenRef.current;
    wasSummaryOpenRef.current = summary.open;
    if (!sawSummaryOpenRef.current && summary.open) {
      sawSummaryOpenRef.current = true;
      return;
    }
    if (!wasOpen || summary.open || !controlledOpen) {
      return;
    }
    const rawOpen = (templateNode.schema as { open?: unknown } | undefined)?.open;
    const openPath = extractControlledOpenPath(rawOpen);
    if (openPath) {
      node.scope.update(openPath, false);
    }
  }, [controlledOpen, id, node.scope, summary.open, surfaceRuntime, templateNode]);

  return {
    summary,
  };
}
