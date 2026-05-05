import React from 'react';
import type {
  RendererComponentProps,
  SurfaceEntry,
  SurfaceStatusSummary,
} from '@nop-chaos/flux-core';
import { useCurrentSurfaceRuntime, useRendererRuntime } from '@nop-chaos/flux-react';
import type { DialogSchema, DrawerSchema } from './schemas';

function getSurfaceScopeId(
  surfaceId: string,
  kind: 'dialog' | 'drawer',
) {
  return `${surfaceId}:${kind}-scope`;
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
  const [localOpen, setLocalOpen] = React.useState(Boolean(resolvedProps.defaultOpen ?? false));
  const effectiveOpen = controlledOpen !== undefined ? Boolean(controlledOpen) : localOpen;
  const statusPath = typeof resolvedProps.statusPath === 'string' ? resolvedProps.statusPath : undefined;
  const declarativeScope = React.useMemo(
    () =>
      runtime.createChildScope(
        node.scope,
        {
          dialogId: id,
          ...(resolvedProps.data && typeof resolvedProps.data === 'object'
            ? (resolvedProps.data as Record<string, unknown>)
            : {}),
          ...(kind === 'drawer' ? { drawerId: id } : {}),
        },
        {
          scopeKey: getSurfaceScopeId(id, kind),
          pathSuffix: kind,
        },
      ),
    [id, kind, node.scope, resolvedProps.data, runtime],
  );

  const actionScope = (
    helpers.dispatch as typeof helpers.dispatch & { __actionScope?: any }
  ).__actionScope;
  const componentRegistry = (
    helpers.dispatch as typeof helpers.dispatch & { __componentRegistry?: any }
  ).__componentRegistry;
  const surfacePayload = React.useMemo(
    () => ({
      ...resolvedProps,
      __handleOpenChange: (nextOpen: boolean) => {
        if (controlledOpen === undefined) {
          setLocalOpen(nextOpen);
        }

        if (!nextOpen) {
          void events.onClose?.();
          return;
        }

        void events.onOpen?.();
      },
    }),
    [controlledOpen, events, resolvedProps],
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
    if (!surfaceRuntime) {
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
      onOpen: () => events.onOpen?.(),
      onClose: () => events.onClose?.(),
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
      runtime,
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
    events,
    id,
    kind,
    meta,
    node,
    regions,
    runtime,
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
      openSurface();
      return;
    }

    surfaceRuntime.close(id);
    surfaceRuntime.publishClosed({
      surfaceId: id,
      kind,
      scope: declarativeScope,
      statusPath,
    });
  }, [declarativeScope, effectiveOpen, id, kind, openSurface, statusPath, surfaceRuntime]);

  React.useEffect(() => {
    return () => {
      surfaceRuntime?.close(id);
      surfaceRuntime?.publishClosed({
        surfaceId: id,
        kind,
        scope: declarativeScope,
        statusPath,
      });
    };
  }, [declarativeScope, id, kind, statusPath, surfaceRuntime]);

  const entries = React.useSyncExternalStore(
    surfaceRuntime?.store.subscribe ?? (() => () => undefined),
    () => surfaceRuntime?.store.getState().entries ?? [],
    () => surfaceRuntime?.store.getState().entries ?? [],
  );

  const runtimeEntry = entries.find((entry) => entry.id === id);
  const activeId = entries.at(-1)?.id;

  const summary: SurfaceStatusSummary = {
    id,
    kind,
    open: Boolean(runtimeEntry),
    active: runtimeEntry?.id === activeId,
    opening: false,
    closing: false,
  };

  return {
    summary,
  };
}
