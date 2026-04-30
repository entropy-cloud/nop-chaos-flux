import React, { useMemo } from 'react';
import type { RendererComponentProps, SurfaceStatusSummary } from '@nop-chaos/flux-core';
import {
  publishOwnerStatus,
  useCurrentComponentRegistry,
  useResolvedContainer,
} from '@nop-chaos/flux-react';
import type { DialogSchema, DrawerSchema } from './schemas';
import {
  getDeclarativeSurfaceStackSnapshot,
  isDeclarativeSurfaceActiveInSnapshot,
  registerDeclarativeSurface,
  subscribeDeclarativeSurfaceStack,
  unregisterDeclarativeSurface,
} from './declarative-surface-stack';

export function useSurfaceRenderer(
  props: RendererComponentProps<DialogSchema>,
  kind: 'dialog',
): {
  summary: SurfaceStatusSummary;
  containerElement: ReturnType<typeof useResolvedContainer>;
  handleOpenChange: (nextOpen: boolean) => void;
};
export function useSurfaceRenderer(
  props: RendererComponentProps<DrawerSchema>,
  kind: 'drawer',
): {
  summary: SurfaceStatusSummary;
  containerElement: ReturnType<typeof useResolvedContainer>;
  handleOpenChange: (nextOpen: boolean) => void;
};
export function useSurfaceRenderer(
  props: RendererComponentProps<DialogSchema> | RendererComponentProps<DrawerSchema>,
  kind: 'dialog' | 'drawer',
) {
  const controlledOpen = props.props.open;
  const [localOpen, setLocalOpen] = React.useState(Boolean(props.props.defaultOpen ?? false));
  const effectiveOpen = controlledOpen !== undefined ? Boolean(controlledOpen) : localOpen;
  const [surfaceStackSnapshot, setSurfaceStackSnapshot] = React.useState(
    getDeclarativeSurfaceStackSnapshot(),
  );
  const summary = useMemo<SurfaceStatusSummary>(
    () => ({
      id: props.id,
      kind,
      open: effectiveOpen,
      active: effectiveOpen && isDeclarativeSurfaceActiveInSnapshot(props.id, surfaceStackSnapshot),
      opening: false,
      closing: false,
    }),
    [effectiveOpen, kind, props.id, surfaceStackSnapshot],
  );

  const containerId = typeof props.props.container === 'string' ? props.props.container : undefined;
  const componentRegistry = useCurrentComponentRegistry();
  const containerElement = useResolvedContainer(containerId, componentRegistry);
  const statusPath =
    typeof props.props.statusPath === 'string' ? props.props.statusPath : undefined;
  const ownerScope = props.node.scope.parent ?? props.node.scope;

  React.useEffect(() => {
    setSurfaceStackSnapshot(getDeclarativeSurfaceStackSnapshot());
    return subscribeDeclarativeSurfaceStack(() => {
      setSurfaceStackSnapshot(getDeclarativeSurfaceStackSnapshot());
    });
  }, []);

  React.useEffect(() => {
    if (effectiveOpen) {
      registerDeclarativeSurface(props.id);
    } else {
      unregisterDeclarativeSurface(props.id);
    }

    return () => {
      unregisterDeclarativeSurface(props.id);
    };
  }, [effectiveOpen, props.id]);

  React.useEffect(() => {
    publishOwnerStatus(ownerScope, statusPath, summary);
    return undefined;
  }, [ownerScope, statusPath, summary]);

  React.useEffect(() => {
    return () => {
      publishOwnerStatus(ownerScope, statusPath, {
        id: props.id,
        kind,
        open: false,
        active: false,
        opening: false,
        closing: false,
      });
    };
  }, [kind, ownerScope, props.id, statusPath]);

  function handleOpenChange(nextOpen: boolean) {
    if (controlledOpen === undefined) {
      setLocalOpen(nextOpen);
    }

    if (!nextOpen) {
      void props.events.onClose?.();
      return;
    }

    void props.events.onOpen?.();
  }

  return {
    summary,
    containerElement,
    handleOpenChange,
  };
}
