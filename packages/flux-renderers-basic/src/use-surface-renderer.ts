import React from 'react';
import type {
  ActionScope,
  ComponentHandleRegistry,
  RendererComponentProps,
  ScopeRef,
  SurfaceEntry,
  SurfaceStatusSummary,
} from '@nop-chaos/flux-core';
import { useCurrentSurfaceRuntime, useRendererRuntime } from '@nop-chaos/flux-react';
import type { DialogSchema, DrawerSchema } from './schemas.js';

type DispatchMetadataCarrier = typeof import('@nop-chaos/flux-core') extends infer _T
  ? {
      __actionScope?: ActionScope;
      __componentRegistry?: ComponentHandleRegistry;
    }
  : never;

function readDispatchMetadata(dispatch: RendererComponentProps<DialogSchema>['helpers']['dispatch']) {
  const carrier = dispatch as typeof dispatch & DispatchMetadataCarrier;
  return {
    actionScope: carrier.__actionScope,
    componentRegistry: carrier.__componentRegistry,
  };
}

function getSurfaceScopeId(
  surfaceId: string,
  kind: 'dialog' | 'drawer',
) {
  return `${surfaceId}:${kind}-scope`;
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
  const { id, node, templateNode, props: resolvedProps, meta: resolvedMeta, regions, events, helpers } = props;
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
  const effectiveOpen = controlledOpen !== undefined ? Boolean(controlledOpen) : uncontrolledOpen;
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
    }),
    [events.onClose, events.onOpen],
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
      },
    );

    const current = declarativeScopeRef.current;
    if (current === nextScope) {
      return;
    };

    declarativeScopeRef.current = nextScope;
    disposeSurfaceScope(runtime, current);
    setDeclarativeScope(nextScope);
  }, [effectiveOpen, id, kind, node.scope, openRevision, openingData, runtime]);
  const cleanupRef = React.useRef({
    surfaceRuntime,
    id,
    kind,
    statusPath,
    ownerScope: node.scope,
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
      ownerScope: node.scope,
      declarativeScope,
    };
  }, [declarativeScope, id, kind, node.scope, statusPath, surfaceRuntime]);

  const dispatchMetadata = readDispatchMetadata(helpers.dispatch);
  const actionScope = dispatchMetadata.actionScope;
  const componentRegistry = dispatchMetadata.componentRegistry;
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
        void eventHandlers.onClose?.();
        return;
      }

      closeHandledRef.current = false;
      void eventHandlers.onOpen?.();
    },
    [controlledOpen, eventHandlers, id, surfaceRuntime],
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
      onOpen: () => eventHandlers.onOpen?.(),
      onClose: () => eventHandlers.onClose?.(),
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
      },
    });
  }, [
    actionScope,
    actionsNode,
    bodyNode,
    componentRegistry,
    controlledOpen,
    declarativeScope,
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
          scope: current.declarativeScope ?? current.ownerScope,
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

  return {
    summary,
  };
}
