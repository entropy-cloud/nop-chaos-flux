'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { t } from '../../lib/i18n.js';

import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { GripHorizontalIcon, XIcon } from 'lucide-react';
import { useDialogDrag } from './use-dialog-drag.js';
import { useGlobalZIndex } from '../../hooks/use-global-z-index.js';

interface DialogContextValue {
  draggable: boolean;
  noOverlay: boolean;
  noCenter: boolean;
  closeOnOutsideClick: boolean;
  containerElement: HTMLElement | null;
}

interface DialogDragContextValue {
  enabled: boolean;
  descriptionId?: string;
  moveBy: (deltaX: number, deltaY: number) => void;
  resetPosition: () => void;
}

const DialogContext = React.createContext<DialogContextValue>({
  draggable: false,
  noOverlay: false,
  noCenter: false,
  closeOnOutsideClick: true,
  containerElement: null,
});

const DialogZIndexContext = React.createContext<number | undefined>(undefined);

const DialogDragContext = React.createContext<DialogDragContextValue>({
  enabled: false,
  moveBy: () => {},
  resetPosition: () => {},
});

function Dialog({
  draggable = true,
  noOverlay = false,
  noCenter = false,
  closeOnOutsideClick = true,
  containerElement,
  ...props
}: DialogPrimitive.Root.Props & {
  draggable?: boolean;
  noOverlay?: boolean;
  noCenter?: boolean;
  closeOnOutsideClick?: boolean;
  containerElement?: HTMLElement | null;
}) {
  const contextValue = React.useMemo(
    () => ({
      draggable,
      noOverlay,
      noCenter,
      closeOnOutsideClick,
      containerElement: containerElement ?? null,
    }),
    [draggable, noOverlay, noCenter, closeOnOutsideClick, containerElement],
  );

  return (
    <DialogContext.Provider value={contextValue}>
      <DialogPrimitive.Root data-slot="dialog" {...props} />
    </DialogContext.Provider>
  );
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  const { containerElement } = React.useContext(DialogContext);
  const zIndex = React.useContext(DialogZIndexContext);
  const isContained = containerElement != null;

  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'isolate bg-surface-overlay duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        isContained ? 'absolute inset-0' : 'fixed inset-0',
        className,
      )}
      style={zIndex === undefined ? undefined : { zIndex }}
      {...props}
    />
  );
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Popup>,
  DialogPrimitive.Popup.Props & {
    showCloseButton?: boolean;
    offsetRef?: React.MutableRefObject<{ x: number; y: number }>;
    baseTransform?: string;
    size?: 'sm' | 'default' | 'lg';
  }
>(function DialogContent(
  {
    className,
    children,
    showCloseButton = true,
    offsetRef,
    baseTransform,
    size = 'default',
    ...props
  },
  ref,
) {
  const { draggable, noOverlay, noCenter, containerElement } = React.useContext(DialogContext);
  const descriptionId = React.useId();
  const isContained = containerElement != null;
  const zIndex = useGlobalZIndex();
  const effectiveBaseTransform = noCenter
    ? isContained
      ? ''
      : ''
    : isContained
      ? 'translate(-50%, -50%)'
      : (baseTransform ?? 'translate(-50%, -50%)');
  const { contentRef, handlePointerDown, moveBy, resetPosition } = useDialogDrag(
    { enabled: draggable, offsetRef, baseTransform: effectiveBaseTransform },
    ref,
  );
  const dragContextValue = React.useMemo(
    () => ({
      enabled: draggable,
      descriptionId,
      moveBy,
      resetPosition,
    }),
    [descriptionId, draggable, moveBy, resetPosition],
  );

  return (
    <DialogPortal data-slot="dialog-portal" container={containerElement ?? undefined}>
      <DialogZIndexContext.Provider value={zIndex}>
        {!noOverlay && <DialogOverlay />}
        <DialogPrimitive.Popup
          ref={contentRef}
          data-slot="dialog-content"
          data-size={size}
          className={cn(
            'flex w-full max-w-[calc(100%-2rem)] flex-col rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
            'max-h-[calc(100dvh-2rem)]',
            'data-[size=sm]:sm:max-w-sm data-[size=default]:sm:max-w-lg data-[size=lg]:sm:max-w-2xl',
            isContained ? 'absolute' : 'fixed',
            noCenter ? '' : 'top-[50%] left-[50%]',
            !draggable &&
              !noCenter &&
              '-translate-x-1/2 -translate-y-1/2 data-open:zoom-in-95 data-closed:zoom-out-95',
            className,
          )}
          {...props}
          style={
            draggable
              ? { transform: noCenter ? undefined : effectiveBaseTransform, zIndex, ...props.style }
              : { zIndex, ...props.style }
          }
          onPointerDown={draggable ? handlePointerDown : props.onPointerDown}
        >
          <DialogDragContext.Provider value={dragContextValue}>
            {children}
            {draggable ? (
              <p id={descriptionId} className="sr-only">
                {t('flux.dialog.moveDialogInstructions')}
              </p>
            ) : null}
          </DialogDragContext.Provider>
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={<Button variant="ghost" className="absolute top-2 right-2" size="icon-sm" />}
            >
              <XIcon />
              <span className="sr-only">{t('flux.dialog.close')}</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogZIndexContext.Provider>
    </DialogPortal>
  );
});

DialogContent.displayName = 'DialogContent';

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const { draggable } = React.useContext(DialogContext);
  const dragContext = React.useContext(DialogDragContext);
  const { onKeyDown, ...restProps } = props;
  const forwardedOnKeyDown = onKeyDown as ((event: React.KeyboardEvent<HTMLElement>) => void) | undefined;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    forwardedOnKeyDown?.(event);
    if (event.defaultPrevented || !dragContext.enabled) {
      return;
    }

    const step = event.shiftKey ? 48 : 16;
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        dragContext.moveBy(-step, 0);
        break;
      case 'ArrowRight':
        event.preventDefault();
        dragContext.moveBy(step, 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        dragContext.moveBy(0, -step);
        break;
      case 'ArrowDown':
        event.preventDefault();
        dragContext.moveBy(0, step);
        break;
      case 'Home':
        event.preventDefault();
        dragContext.resetPosition();
        break;
      default:
        break;
    }
  };

  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'relative flex shrink-0 flex-col gap-2 p-4 pb-0',
        draggable && 'pl-12',
        draggable && 'cursor-grab select-none',
        className,
      )}
      {...restProps}
    >
      {dragContext.enabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-3 left-3 cursor-grab"
          data-slot="dialog-drag-handle"
          aria-roledescription={t('flux.dialog.dragHandleRoleDescription')}
          aria-label={t('flux.dialog.moveDialog')}
          aria-describedby={dragContext.descriptionId}
          aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home"
          onKeyDown={handleKeyDown}
        >
          <GripHorizontalIcon />
        </Button>
      ) : null}
      {props.children}
    </div>
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="dialog-body" className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4', className)} {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'mt-auto flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          {t('flux.common.close')}
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-heading text-base leading-none font-medium', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
