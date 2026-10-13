import React from 'react';
import { Button } from '@nop-chaos/ui';
import { SurfaceScopeProviders, type SurfaceRenderContext } from './dialog-host-surface.js';
import { NodeErrorBoundary } from './node-error-boundary.js';

type SurfaceChromeKind = 'dialog' | 'drawer';

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

function SurfaceBodyBoundary(props: { surfaceId: string; children: React.ReactNode }) {
  return <NodeErrorBoundary nodeId={`${props.surfaceId}:body`}>{props.children}</NodeErrorBoundary>;
}

export interface SurfaceConfirmButtons {
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

interface SurfaceChromeShellProps {
  kind: SurfaceChromeKind;
  chrome: {
    Header: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
    Title: React.ComponentType<React.PropsWithChildren>;
    Body: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
    Footer: React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
  };
  surfaceId: string;
  surfaceContext: SurfaceRenderContext;
  titleNode: React.ReactNode;
  headerNode: React.ReactNode;
  bodyNode: React.ReactNode;
  actionsNode: React.ReactNode;
  footerNode: React.ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  closeSlotName: string;
  confirmBarClass: string;
  closeOnOutside: boolean;
  closeOnEsc: boolean;
  handleClose: () => void;
  shouldClose?: (reason: OpenChangeReason) => boolean;
  confirmButtons: SurfaceConfirmButtons | null;
  children: (parts: {
    handleOpenChange: (open: boolean, eventDetails: unknown) => void;
    handleCaptureCloseClick: (event: React.MouseEvent<HTMLElement>) => void;
    content: React.ReactNode;
  }) => React.ReactNode;
}

export function SurfaceChromeShell(props: SurfaceChromeShellProps) {
  const { shouldClose } = props;
  const { Header, Title, Body, Footer } = props.chrome;

  const handleOpenChange = (open: boolean, eventDetails: unknown) => {
    if (open) {
      return;
    }
    const reason = (eventDetails as { reason?: OpenChangeReason } | null)?.reason;
    if (
      shouldSuppressClose(reason, {
        closeOnOutside: props.closeOnOutside,
        closeOnEsc: props.closeOnEsc,
      })
    ) {
      return;
    }
    if (shouldClose && !shouldClose(reason)) {
      return;
    }
    props.handleClose();
  };

  const handleCaptureCloseClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(`[data-slot="${props.closeSlotName}"]`)) {
      props.handleClose();
    }
  };

  const content = (
    <SurfaceScopeProviders {...props.surfaceContext}>
      {(props.titleNode || props.headerNode) && (
        <Header className={props.headerClassName}>
          {props.titleNode && (
            <Title>
              <SurfaceBodyBoundary surfaceId={props.surfaceId}>{props.titleNode}</SurfaceBodyBoundary>
            </Title>
          )}
          {props.headerNode && (
            <SurfaceBodyBoundary surfaceId={props.surfaceId}>{props.headerNode}</SurfaceBodyBoundary>
          )}
        </Header>
      )}
      <Body className={props.bodyClassName}>
        <SurfaceBodyBoundary surfaceId={props.surfaceId}>{props.bodyNode}</SurfaceBodyBoundary>
      </Body>
      {props.actionsNode || props.footerNode || props.confirmButtons ? (
        <Footer className={props.footerClassName}>
          {props.footerNode && (
            <SurfaceBodyBoundary surfaceId={props.surfaceId}>{props.footerNode}</SurfaceBodyBoundary>
          )}
          {props.actionsNode && (
            <SurfaceBodyBoundary surfaceId={props.surfaceId}>{props.actionsNode}</SurfaceBodyBoundary>
          )}
          {props.confirmButtons && !props.actionsNode && (
            <div className={props.confirmBarClass} data-slot={`${props.kind}-confirm-bar`}>
              <Button
                type="button"
                variant="ghost"
                data-testid="surface-confirm-cancel"
                data-slot="surface-confirm-cancel"
                onClick={props.confirmButtons.onCancel}
              >
                {props.confirmButtons.cancelLabel}
              </Button>
              <Button
                type="button"
                variant="default"
                data-testid="surface-confirm-submit"
                data-slot="surface-confirm-submit"
                onClick={props.confirmButtons.onConfirm}
              >
                {props.confirmButtons.confirmLabel}
              </Button>
            </div>
          )}
        </Footer>
      ) : null}
    </SurfaceScopeProviders>
  );

  return <>{props.children({ handleOpenChange, handleCaptureCloseClick, content })}</>;
}
