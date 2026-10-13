import React from 'react';
import type { SurfaceEntry, SurfaceRuntime } from '@nop-chaos/flux-core';
import { useCurrentPage, useCurrentSurfaceRuntime } from './hooks.js';
import { renderSurfaceNode } from './dialog-host-surface.js';
import {
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
import { useSyncExternalStoreWithSelector } from './use-sync-external-store-with-selector.js';
import {
  SurfaceChromeShell,
  type SurfaceConfirmButtons,
} from './surface-chrome-shell.js';

type FluxSurfaceSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

type PrimitiveDialogSize = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | 'full' | undefined;

function resolveDialogPrimitiveSize(size: FluxSurfaceSize | undefined): PrimitiveDialogSize {
  if (!size) {
    return undefined;
  }
  if (size === 'xs') return 'xs';
  if (size === 'sm') return 'sm';
  if (size === 'md') return 'base';
  if (size === 'lg') return 'md';
  if (size === 'xl') return 'lg';
  // Plan 552 / IS-lab-dialog-001: forward `full` so the primitive drops its
  // 1rem-edge max-width clamp (previously 100vw was clamped to 100%-2rem).
  if (size === 'full') return 'full';
  return undefined;
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

interface ConfirmButtonOptions {
  confirm: boolean | string | undefined;
  hasExplicitActions: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function resolveConfirmButtons(options: ConfirmButtonOptions): SurfaceConfirmButtons | null {
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

  let topmostDialogId: string | undefined;
  for (let i = surfaces.length - 1; i >= 0; i--) {
    if (surfaces[i].kind === 'dialog') {
      topmostDialogId = surfaces[i].id;
      break;
    }
  }

  return (
    <>
      {surfaces.map((surface, surfaceIndex) =>
        surface.kind === 'dialog' ? (
          <DialogView
            key={surface.id}
            surface={surface}
            surfaceRuntime={surfaceRuntime}
            modalContainer={modalContainer}
            isTopmost={surface.id === topmostDialogId}
            stackIndex={surfaces.slice(0, surfaceIndex).filter((s) => s.kind === 'dialog').length}
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

/**
 * Shared surface-view orchestration (cq-3 Phase 1): handleClose, surface
 * context memo, title/actions/header/footer nodes, container resolution and
 * confirm buttons are container-agnostic — DialogView/DrawerView keep only
 * their layout shells and container-specific close fields
 * (`closeOnOutsideClick` vs `closeOnOutside`) and suppression rules.
 */
function useSurfaceView(props: {
  surface: SurfaceEntry;
  surfaceRuntime: SurfaceRuntime;
  modalContainer?: string;
  closeOutsideField: 'closeOnOutsideClick' | 'closeOnOutside';
}) {
  const { surface, surfaceRuntime, modalContainer, closeOutsideField } = props;
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
      surfaceRuntime,
    }),
    [
      surface.scope,
      surface.validationOwner,
      surface.actionScope,
      surface.componentRegistry,
      surface.ownerNodeInstance,
      surfaceRuntime,
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
      : modalContainer;
  const containerElement = resolveContainerElement(containerId, surface.componentRegistry);
  const showMask = surface.surface.showMask !== false;
  const closeOnEsc = surface.surface.closeOnEsc !== false;
  const showCloseButton = surface.surface.showCloseButton !== false;
  const closeOnOutside =
    closeOutsideField === 'closeOnOutsideClick'
      ? surface.surface.closeOnOutsideClick !== false
      : surface.surface.closeOnOutside !== false;
  const confirmButtons = resolveConfirmButtons({
    confirm: surface.surface.confirm as string | boolean | undefined,
    hasExplicitActions: Boolean(surface.actions),
    onCancel: handleClose,
    onConfirm: () => {
      void surface.onConfirm?.();
      handleClose();
    },
  });

  return {
    handleClose,
    surfaceContext,
    titleNode,
    actionsNode,
    headerNode,
    footerNode,
    containerElement,
    showMask,
    closeOnEsc,
    showCloseButton,
    closeOnOutside,
    confirmButtons,
  };
}

function DialogView(props: {
  surface: SurfaceEntry;
  surfaceRuntime: SurfaceRuntime;
  modalContainer?: string;
  isTopmost: boolean;
  stackIndex: number;
}) {
  const { surface, surfaceRuntime, isTopmost, stackIndex } = props;
  const isMobile = useIsMobile();
  const {
    handleClose,
    surfaceContext,
    titleNode,
    actionsNode,
    headerNode,
    footerNode,
    containerElement,
    showMask,
    closeOnEsc,
    showCloseButton,
    closeOnOutside: closeOnOutsideClick,
    confirmButtons,
  } = useSurfaceView({
    surface,
    surfaceRuntime,
    modalContainer: props.modalContainer,
    closeOutsideField: 'closeOnOutsideClick',
  });
  const size = surface.surface.size as FluxSurfaceSize | undefined;
  const hasExplicitSize = typeof size === 'string' && size.length > 0;
  const effectiveSize: FluxSurfaceSize | undefined =
    isMobile && !hasExplicitSize ? 'full' : size;
  const primitiveSize = resolveDialogPrimitiveSize(effectiveSize);
  const inlineStyle = buildSurfaceInlineStyle({
    size: effectiveSize,
    width: surface.surface.width as string | number | undefined,
    height: surface.surface.height as string | number | undefined,
    fullSize: 'viewport',
  });
  const isMobileFullscreen = isMobile && !hasExplicitSize;
  const applyTopAnchored = !isMobileFullscreen && effectiveSize !== 'full';
  const surfaceStyle: React.CSSProperties = { ...inlineStyle };
  if (applyTopAnchored) {
    surfaceStyle.top = `calc(var(--dialog-top-offset) + ${stackIndex} * var(--dialog-stack-step))`;
  }
  const headerClassName = surface.surface.headerClassName as string | undefined;
  const bodyClassName = surface.surface.bodyClassName as string | undefined;
  const footerClassName = surface.surface.footerClassName as string | undefined;

  return (
    <SurfaceChromeShell
      kind="dialog"
      chrome={{
        Header: DialogHeader,
        Title: DialogTitle,
        Body: DialogBody,
        Footer: DialogFooter,
      }}
      surfaceId={surface.id}
      surfaceContext={surfaceContext}
      titleNode={titleNode}
      headerNode={headerNode}
      bodyNode={renderSurfaceNode(surface.body ?? surface.surface.body, surfaceContext)}
      actionsNode={actionsNode}
      footerNode={footerNode}
      headerClassName={headerClassName}
      bodyClassName={bodyClassName}
      footerClassName={footerClassName}
      closeSlotName="dialog-close"
      confirmBarClass="nop-dialog-confirm-bar"
      closeOnOutside={closeOnOutsideClick}
      closeOnEsc={closeOnEsc}
      handleClose={handleClose}
      shouldClose={(reason) => {
        // Stacked-dialog fix: a dialog that is not the topmost one is interactionally
        // inert — the user is interacting with whatever is on top of it (a nested
        // openDialog, a picker, etc.). The Base UI click-outside and Esc detectors
        // fire on every dialog that has them enabled, regardless of stacking, so an
        // inner click reaches the outer's outside-press listener and the outer's
        // controlled dialog then writes `openPath = false` into the page scope,
        // closing the parent the user never asked to close. Suppress outside-press
        // and Esc for any non-topmost dialog; surface close paths (closeDialog,
        // closeOnSubmit, etc.) still work because they call surfaceRuntime.close
        // directly without going through onOpenChange.
        if (!isTopmost && (reason === 'outside-press' || reason === 'escape-key')) {
          return false;
        }
        return true;
      }}
      confirmButtons={confirmButtons}
    >
      {({ handleOpenChange, handleCaptureCloseClick, content }) => (
        <Dialog
          open
          onOpenChange={handleOpenChange}
          containerElement={containerElement}
          noOverlay={!showMask}
          closeOnOutsideClick={closeOnOutsideClick}
          modal={isTopmost}
        >
          <DialogContent
            className={cn('nop-dialog', surface.meta?.className)}
            data-testid={surface.meta?.testid || undefined}
            data-cid={surface.meta?.cid || undefined}
            data-renderer={surface.kind}
            data-slot="dialog-surface"
            data-close-on-outside={closeOnOutsideClick ? 'true' : 'false'}
            data-close-on-esc={closeOnEsc ? 'true' : 'false'}
            data-mobile-fullscreen={isMobile && !hasExplicitSize ? 'true' : undefined}
            size={primitiveSize}
            topAnchored={applyTopAnchored}
            showCloseButton={showCloseButton}
            style={surfaceStyle}
            onClickCapture={handleCaptureCloseClick}
          >
            {content}
          </DialogContent>
        </Dialog>
      )}
    </SurfaceChromeShell>
  );
}

function DrawerView(props: {
  surface: SurfaceEntry;
  surfaceRuntime: SurfaceRuntime;
  modalContainer?: string;
}) {
  const { surface, surfaceRuntime } = props;
  const isMobile = useIsMobile();
  const {
    handleClose,
    surfaceContext,
    titleNode,
    actionsNode,
    headerNode,
    footerNode,
    containerElement,
    showMask,
    closeOnEsc,
    showCloseButton,
    closeOnOutside,
    confirmButtons,
  } = useSurfaceView({
    surface,
    surfaceRuntime,
    modalContainer: props.modalContainer,
    closeOutsideField: 'closeOnOutside',
  });
  const size = surface.surface.size as FluxSurfaceSize | undefined;
  const resizable = surface.surface.resizable === true;
  const schemaSide = surface.surface.side as string | undefined;
  const effectiveSide =
    isMobile && schemaSide !== 'bottom' ? 'bottom' : schemaSide;
  const inlineStyle = buildSurfaceInlineStyle({
    size,
    width: surface.surface.width as string | number | undefined,
    height: surface.surface.height as string | number | undefined,
    fullSize: 'percent',
  });
  const headerClassName = surface.surface.headerClassName as string | undefined;
  const bodyClassName = surface.surface.bodyClassName as string | undefined;
  const footerClassName = surface.surface.footerClassName as string | undefined;

  return (
    <SurfaceChromeShell
      kind="drawer"
      chrome={{
        Header: DrawerHeader,
        Title: DrawerTitle,
        Body: DrawerBody,
        Footer: DrawerFooter,
      }}
      surfaceId={surface.id}
      surfaceContext={surfaceContext}
      titleNode={titleNode}
      headerNode={headerNode}
      bodyNode={renderSurfaceNode(surface.body ?? surface.surface.body, surfaceContext)}
      actionsNode={actionsNode}
      footerNode={footerNode}
      headerClassName={headerClassName}
      bodyClassName={bodyClassName}
      footerClassName={footerClassName}
      closeSlotName="drawer-close"
      confirmBarClass="nop-drawer-confirm-bar"
      closeOnOutside={closeOnOutside}
      closeOnEsc={closeOnEsc}
      handleClose={handleClose}
      confirmButtons={confirmButtons}
    >
      {({ handleOpenChange, handleCaptureCloseClick, content }) => (
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
            data-renderer={surface.kind}
            data-slot="drawer-surface"
            data-close-on-outside={closeOnOutside ? 'true' : 'false'}
            data-close-on-esc={closeOnEsc ? 'true' : 'false'}
            data-mobile-side-overridden={isMobile && schemaSide !== 'bottom' ? 'true' : undefined}
            showMask={showMask}
            showCloseButton={showCloseButton}
            resizable={resizable}
            style={inlineStyle}
            onClickCapture={handleCaptureCloseClick}
          >
            {content}
          </DrawerContent>
        </Drawer>
      )}
    </SurfaceChromeShell>
  );
}
