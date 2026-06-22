import React from 'react';
import type { SurfaceEntry, SurfaceRuntime } from '@nop-chaos/flux-core';
import { useCurrentPage, useCurrentSurfaceRuntime } from './hooks.js';
import {
  renderSurfaceNode,
  SurfaceScopeProviders,
} from './dialog-host-surface.js';
import {
  Button,
  cn,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  t,
  useIsMobile,
} from '@nop-chaos/ui';
import { resolveContainerElement } from './container-hooks.js';
import { NodeErrorBoundary } from './node-error-boundary.js';
import { useSyncExternalStoreWithSelector } from './use-sync-external-store-with-selector.js';

type FluxSurfaceSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

function resolveDialogPrimitiveSize(size: FluxSurfaceSize | undefined): 'sm' | 'default' | 'lg' | undefined {
  if (!size) {
    return undefined;
  }
  if (size === 'xs') return 'sm';
  if (size === 'sm' || size === 'md') return 'default';
  return 'lg';
}

function normalizeCssLength(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'number') {
    return `${value}px`;
  }
  return String(value);
}

function buildSurfaceInlineStyle(options: {
  size: FluxSurfaceSize | undefined;
  width?: number | string;
  height?: number | string;
  fullSize: 'viewport' | 'percent';
}): React.CSSProperties {
  const style: React.CSSProperties = {};

  if (options.size === 'full') {
    if (options.fullSize === 'viewport') {
      style.width = '100vw';
      style.height = '100vh';
    } else {
      style.width = '100%';
      style.height = '100%';
    }
    return style;
  }

  const width = normalizeCssLength(options.width);
  const height = normalizeCssLength(options.height);
  if (width) {
    style.width = width;
  }
  if (height) {
    style.height = height;
  }

  return style;
}

type OpenChangeReason = 'outside-press' | 'escape-key' | string | undefined;

function shouldSuppressClose(
  reason: OpenChangeReason,
  options: { closeOnOutside: boolean | undefined; closeOnEsc: boolean | undefined },
): boolean {
  if (reason === 'outside-press' && options.closeOnOutside === false) {
    return true;
  }
  if (reason === 'escape-key' && options.closeOnEsc === false) {
    return true;
  }
  return false;
}

interface ConfirmButtonOptions {
  confirm: boolean | string | undefined;
  hasExplicitActions: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

interface ConfirmButtonDescriptor {
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function resolveConfirmButtons(options: ConfirmButtonOptions): ConfirmButtonDescriptor | null {
  if (!options.confirm || options.hasExplicitActions) {
    return null;
  }
  const confirmLabel =
    typeof options.confirm === 'string' && options.confirm.length > 0
      ? options.confirm
      : t('flux.common.confirm');
  return {
    cancelLabel: t('flux.common.cancel'),
    confirmLabel,
    onCancel: options.onCancel,
    onConfirm: options.onConfirm,
  };
}

function SurfaceBodyBoundary(props: { surfaceId: string; children: React.ReactNode }) {
  return <NodeErrorBoundary nodeId={`${props.surfaceId}:body`}>{props.children}</NodeErrorBoundary>;
}

function sameSurfaces(left: SurfaceEntry[], right: SurfaceEntry[]) {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((surface, index) => surface === right[index]);
}

export function DialogHost() {
  const page = useCurrentPage();
  const surfaceRuntime = useCurrentSurfaceRuntime();
  const modalContainer = (page as { modalContainer?: string } | undefined)?.modalContainer;

  const surfaces = useSyncExternalStoreWithSelector(
    surfaceRuntime?.store.subscribe ?? (() => () => undefined),
    () => surfaceRuntime?.store.getState().entries ?? [],
    () => surfaceRuntime?.store.getState().entries ?? [],
    (state: SurfaceEntry[]) => state,
    sameSurfaces,
  );

  if (!surfaceRuntime || surfaces.length === 0) {
    return null;
  }

  return (
    <>
      {surfaces.map((surface: SurfaceEntry) =>
        surface.kind === 'dialog' ? (
          <DialogView
            key={surface.id}
            surface={surface}
            surfaceRuntime={surfaceRuntime}
            modalContainer={modalContainer}
          />
        ) : (
          <DrawerView
            key={surface.id}
            surface={surface}
            surfaceRuntime={surfaceRuntime}
            modalContainer={modalContainer}
          />
        ),
      )}
    </>
  );
}

function DialogView(props: {
  surface: SurfaceEntry;
  surfaceRuntime: SurfaceRuntime;
  modalContainer?: string;
}) {
  const { surface, surfaceRuntime } = props;
  const isMobile = useIsMobile();
  const handleDeclarativeOpenChange = surface.surface.__handleOpenChange as
    | ((nextOpen: boolean) => void)
    | undefined;
  const handleClose = React.useCallback(() => {
    if (handleDeclarativeOpenChange) {
      handleDeclarativeOpenChange(false);
      return;
    }

    surfaceRuntime.close(surface.id);
  }, [handleDeclarativeOpenChange, surface.id, surfaceRuntime]);

  const surfaceContext = React.useMemo(
    () => ({
      scope: surface.scope,
      validationOwner: surface.validationOwner,
      actionScope: surface.actionScope,
      componentRegistry: surface.componentRegistry,
      ownerNodeInstance: surface.ownerNodeInstance,
    }),
    [
      surface.scope,
      surface.validationOwner,
      surface.actionScope,
      surface.componentRegistry,
      surface.ownerNodeInstance,
    ],
  );
  const titleNode = surface.title ? renderSurfaceNode(surface.title, surfaceContext) : null;
  const actionsNode = surface.actions ? renderSurfaceNode(surface.actions, surfaceContext) : null;
  const headerRegion = surface.regionHandles?.header?.templateNode ?? surface.surface.header;
  const footerRegion = surface.regionHandles?.footer?.templateNode ?? surface.surface.footer;
  const headerNode = headerRegion ? renderSurfaceNode(headerRegion, surfaceContext) : null;
  const footerNode = footerRegion ? renderSurfaceNode(footerRegion, surfaceContext) : null;

  const containerId =
    typeof surface.surface.container === 'string'
      ? surface.surface.container
      : props.modalContainer;
  const containerElement = resolveContainerElement(containerId, surface.componentRegistry);
  const showMask = surface.surface.showMask !== false;
  const closeOnOutsideClick = surface.surface.closeOnOutsideClick !== false;
  const closeOnEsc = surface.surface.closeOnEsc !== false;
  const showCloseButton = surface.surface.showCloseButton !== false;
  const size = surface.surface.size as FluxSurfaceSize | undefined;
  const hasExplicitSize = typeof size === 'string' && size.length > 0;
  const effectiveSize: FluxSurfaceSize | undefined =
    isMobile && !hasExplicitSize ? 'full' : size;
  const primitiveSize = resolveDialogPrimitiveSize(effectiveSize);
  const inlineStyle = buildSurfaceInlineStyle({
    size: effectiveSize,
    width: surface.surface.width,
    height: surface.surface.height,
    fullSize: 'viewport',
  });
  const headerClassName = surface.surface.headerClassName as string | undefined;
  const bodyClassName = surface.surface.bodyClassName as string | undefined;
  const footerClassName = surface.surface.footerClassName as string | undefined;
  const confirmButtons = resolveConfirmButtons({
    confirm: surface.surface.confirm,
    hasExplicitActions: Boolean(surface.actions),
    onCancel: handleClose,
    onConfirm: () => {
      void surface.onConfirm?.();
      handleClose();
    },
  });

  const handleOpenChange = (open: boolean, eventDetails: unknown) => {
    if (open) {
      return;
    }
    const reason = (eventDetails as { reason?: OpenChangeReason } | null)?.reason;
    if (
      shouldSuppressClose(reason, {
        closeOnOutside: closeOnOutsideClick,
        closeOnEsc,
      })
    ) {
      return;
    }
    handleClose();
  };

  return (
    <Dialog
      open
      onOpenChange={handleOpenChange}
      containerElement={containerElement}
      noOverlay={!showMask}
      closeOnOutsideClick={closeOnOutsideClick}
    >
      <DialogContent
        className={cn('nop-dialog', surface.meta?.className)}
        data-testid={surface.meta?.testid || undefined}
        data-cid={surface.meta?.cid || undefined}
        data-slot="dialog-surface"
        data-close-on-outside={closeOnOutsideClick ? 'true' : 'false'}
        data-close-on-esc={closeOnEsc ? 'true' : 'false'}
        data-mobile-fullscreen={isMobile && !hasExplicitSize ? 'true' : undefined}
        size={primitiveSize}
        showCloseButton={showCloseButton}
        style={inlineStyle}
        onClickCapture={(event) => {
          const target = event.target;

          if (!(target instanceof Element)) {
            return;
          }

          if (target.closest('[data-slot="dialog-close"]')) {
            handleClose();
          }
        }}
      >
        <SurfaceScopeProviders {...surfaceContext}>
          {(titleNode || headerNode) && (
            <DialogHeader className={headerClassName}>
              {titleNode && (
                <DialogTitle>
                  <SurfaceBodyBoundary surfaceId={surface.id}>{titleNode}</SurfaceBodyBoundary>
                </DialogTitle>
              )}
              {headerNode && (
                <SurfaceBodyBoundary surfaceId={surface.id}>{headerNode}</SurfaceBodyBoundary>
              )}
            </DialogHeader>
          )}
          <DialogBody className={bodyClassName}>
            <SurfaceBodyBoundary surfaceId={surface.id}>
              {renderSurfaceNode(surface.body ?? surface.surface.body, surfaceContext)}
            </SurfaceBodyBoundary>
          </DialogBody>
          {actionsNode || footerNode || confirmButtons ? (
            <DialogFooter className={footerClassName}>
              {footerNode && (
                <SurfaceBodyBoundary surfaceId={surface.id}>{footerNode}</SurfaceBodyBoundary>
              )}
              {actionsNode && (
                <SurfaceBodyBoundary surfaceId={surface.id}>{actionsNode}</SurfaceBodyBoundary>
              )}
              {confirmButtons && !actionsNode && (
                <div className="nop-dialog-confirm-bar" data-slot="dialog-confirm-bar">
                  <Button
                    type="button"
                    variant="ghost"
                    data-testid="surface-confirm-cancel"
                    data-slot="surface-confirm-cancel"
                    onClick={confirmButtons.onCancel}
                  >
                    {confirmButtons.cancelLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    data-testid="surface-confirm-submit"
                    data-slot="surface-confirm-submit"
                    onClick={confirmButtons.onConfirm}
                  >
                    {confirmButtons.confirmLabel}
                  </Button>
                </div>
              )}
            </DialogFooter>
          ) : null}
        </SurfaceScopeProviders>
      </DialogContent>
    </Dialog>
  );
}

function DrawerView(props: {
  surface: SurfaceEntry;
  surfaceRuntime: SurfaceRuntime;
  modalContainer?: string;
}) {
  const { surface, surfaceRuntime } = props;
  const isMobile = useIsMobile();
  const handleDeclarativeOpenChange = surface.surface.__handleOpenChange as
    | ((nextOpen: boolean) => void)
    | undefined;
  const handleClose = React.useCallback(() => {
    if (handleDeclarativeOpenChange) {
      handleDeclarativeOpenChange(false);
      return;
    }

    surfaceRuntime.close(surface.id);
  }, [handleDeclarativeOpenChange, surface.id, surfaceRuntime]);

  const surfaceContext = React.useMemo(
    () => ({
      scope: surface.scope,
      validationOwner: surface.validationOwner,
      actionScope: surface.actionScope,
      componentRegistry: surface.componentRegistry,
      ownerNodeInstance: surface.ownerNodeInstance,
    }),
    [
      surface.scope,
      surface.validationOwner,
      surface.actionScope,
      surface.componentRegistry,
      surface.ownerNodeInstance,
    ],
  );
  const titleNode = surface.title ? renderSurfaceNode(surface.title, surfaceContext) : null;
  const actionsNode = surface.actions ? renderSurfaceNode(surface.actions, surfaceContext) : null;
  const headerRegion = surface.regionHandles?.header?.templateNode ?? surface.surface.header;
  const footerRegion = surface.regionHandles?.footer?.templateNode ?? surface.surface.footer;
  const headerNode = headerRegion ? renderSurfaceNode(headerRegion, surfaceContext) : null;
  const footerNode = footerRegion ? renderSurfaceNode(footerRegion, surfaceContext) : null;

  const containerId =
    typeof surface.surface.container === 'string'
      ? surface.surface.container
      : props.modalContainer;
  const containerElement = resolveContainerElement(containerId, surface.componentRegistry);
  const showMask = surface.surface.showMask !== false;
  const closeOnOutside = surface.surface.closeOnOutside !== false;
  const closeOnEsc = surface.surface.closeOnEsc !== false;
  const showCloseButton = surface.surface.showCloseButton !== false;
  const size = surface.surface.size as FluxSurfaceSize | undefined;
  const resizable = surface.surface.resizable === true;
  const schemaSide = surface.surface.side;
  const effectiveSide =
    isMobile && schemaSide !== 'bottom' ? 'bottom' : schemaSide;
  const inlineStyle = buildSurfaceInlineStyle({
    size,
    width: surface.surface.width,
    height: surface.surface.height,
    fullSize: 'percent',
  });
  const headerClassName = surface.surface.headerClassName as string | undefined;
  const bodyClassName = surface.surface.bodyClassName as string | undefined;
  const footerClassName = surface.surface.footerClassName as string | undefined;
  const confirmButtons = resolveConfirmButtons({
    confirm: surface.surface.confirm,
    hasExplicitActions: Boolean(surface.actions),
    onCancel: handleClose,
    onConfirm: () => {
      void surface.onConfirm?.();
      handleClose();
    },
  });

  const handleOpenChange = (open: boolean, eventDetails: unknown) => {
    if (open) {
      return;
    }
    const reason = (eventDetails as { reason?: OpenChangeReason } | null)?.reason;
    if (
      shouldSuppressClose(reason, {
        closeOnOutside,
        closeOnEsc,
      })
    ) {
      return;
    }
    handleClose();
  };

  return (
    <Drawer
      open
      onOpenChange={handleOpenChange}
      direction={
        effectiveSide === 'left'
          ? 'left'
          : effectiveSide === 'top'
            ? 'top'
            : effectiveSide === 'bottom'
              ? 'bottom'
              : 'right'
      }
      containerElement={containerElement}
    >
      <DrawerContent
        className={cn('nop-drawer', surface.meta?.className)}
        data-testid={surface.meta?.testid || undefined}
        data-cid={surface.meta?.cid || undefined}
        data-slot="drawer-surface"
        data-close-on-outside={closeOnOutside ? 'true' : 'false'}
        data-close-on-esc={closeOnEsc ? 'true' : 'false'}
        data-mobile-side-overridden={isMobile && schemaSide !== 'bottom' ? 'true' : undefined}
        showMask={showMask}
        showCloseButton={showCloseButton}
        resizable={resizable}
        style={inlineStyle}
        onClickCapture={(event) => {
          const target = event.target;

          if (!(target instanceof Element)) {
            return;
          }

          if (target.closest('[data-slot="drawer-close"]')) {
            handleClose();
          }
        }}
      >
        <SurfaceScopeProviders {...surfaceContext}>
          {(titleNode || headerNode) && (
            <DrawerHeader className={headerClassName}>
              {titleNode && (
                <DrawerTitle>
                  <SurfaceBodyBoundary surfaceId={surface.id}>{titleNode}</SurfaceBodyBoundary>
                </DrawerTitle>
              )}
              {headerNode && (
                <SurfaceBodyBoundary surfaceId={surface.id}>{headerNode}</SurfaceBodyBoundary>
              )}
            </DrawerHeader>
          )}
          <DrawerBody className={bodyClassName}>
            <SurfaceBodyBoundary surfaceId={surface.id}>
              {renderSurfaceNode(surface.body ?? surface.surface.body, surfaceContext)}
            </SurfaceBodyBoundary>
          </DrawerBody>
          {actionsNode || footerNode || confirmButtons ? (
            <DrawerFooter className={footerClassName}>
              {footerNode && (
                <SurfaceBodyBoundary surfaceId={surface.id}>{footerNode}</SurfaceBodyBoundary>
              )}
              {actionsNode && (
                <SurfaceBodyBoundary surfaceId={surface.id}>{actionsNode}</SurfaceBodyBoundary>
              )}
              {confirmButtons && !actionsNode && (
                <div className="nop-drawer-confirm-bar" data-slot="drawer-confirm-bar">
                  <Button
                    type="button"
                    variant="ghost"
                    data-testid="surface-confirm-cancel"
                    data-slot="surface-confirm-cancel"
                    onClick={confirmButtons.onCancel}
                  >
                    {confirmButtons.cancelLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    data-testid="surface-confirm-submit"
                    data-slot="surface-confirm-submit"
                    onClick={confirmButtons.onConfirm}
                  >
                    {confirmButtons.confirmLabel}
                  </Button>
                </div>
              )}
            </DrawerFooter>
          ) : null}
        </SurfaceScopeProviders>
      </DrawerContent>
    </Drawer>
  );
}
