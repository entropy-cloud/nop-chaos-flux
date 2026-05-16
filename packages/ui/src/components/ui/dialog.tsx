'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { t } from '../../lib/i18n.js';

import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { XIcon } from 'lucide-react';
import { useDialogDrag } from './use-dialog-drag.js';

interface DialogContextValue {
  draggable: boolean;
  noOverlay: boolean;
  noCenter: boolean;
  closeOnOutsideClick: boolean;
  containerElement: HTMLElement | null;
}

const DialogContext = React.createContext<DialogContextValue>({
  draggable: false,
  noOverlay: false,
  noCenter: false,
  closeOnOutsideClick: true,
  containerElement: null,
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
  const isContained = containerElement != null;

  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        isContained ? 'absolute inset-0' : 'fixed inset-0',
        className,
      )}
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
  const isContained = containerElement != null;
  const effectiveBaseTransform = noCenter
    ? isContained
      ? ''
      : ''
    : isContained
      ? 'translate(-50%, -50%)'
      : (baseTransform ?? 'translate(-50%, -50%)');
  const { contentRef, handlePointerDown } = useDialogDrag(
    { enabled: draggable, offsetRef, baseTransform: effectiveBaseTransform },
    ref,
  );

  return (
    <DialogPortal data-slot="dialog-portal" container={containerElement ?? undefined}>
      {!noOverlay && <DialogOverlay />}
      <DialogPrimitive.Popup
        ref={contentRef}
        data-slot="dialog-content"
        data-size={size}
        className={cn(
          'z-50 flex w-full max-w-[calc(100%-2rem)] flex-col rounded-xl bg-popover text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
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
            ? { transform: noCenter ? undefined : effectiveBaseTransform, ...props.style }
            : props.style
        }
        onPointerDown={draggable ? handlePointerDown : props.onPointerDown}
      >
        {children}
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
    </DialogPortal>
  );
});

DialogContent.displayName = 'DialogContent';

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const { draggable } = React.useContext(DialogContext);

  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'flex flex-col gap-2 p-4 pb-0',
        draggable && 'cursor-grab select-none',
        className,
      )}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="dialog-body" className={cn('flex flex-col gap-4 p-4', className)} {...props} />
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
        'mt-auto flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:justify-end',
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
