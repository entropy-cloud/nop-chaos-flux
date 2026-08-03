import React from 'react';
import type { FormRuntime } from '@nop-chaos/flux-core';
import { FormContext, FormLayoutContext, ScopeContext, ValidationContext } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Spinner,
} from '@nop-chaos/ui';
import { XIcon } from 'lucide-react';

export interface DetailSurfaceProps {
  open: boolean;
  mode?: string;
  title?: React.ReactNode;
  bodySlot: string;
  readOnly?: boolean;
  /** P1-2: dialog size ('sm' | 'default' | 'lg' | 'xl'), unknown values fall back to 'default'. */
  size?: string;
  /** P1-2: drawer placement ('left' | 'right' | 'top' | 'bottom'), unknown values fall back to 'bottom'. */
  placement?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export interface DetailDraftBodyProps {
  form: FormRuntime | undefined;
  bodySlot: string;
  children: React.ReactNode;
  /** P1-3/CX-8: present draft fields read-only when the detail component is readOnly. */
  staticReadOnly?: boolean;
}

export interface DetailDraftFooterProps {
  error: string | undefined;
  errorSlot: string;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DetailDraftBody(props: DetailDraftBodyProps) {
  const draftScope = props.form?.scope;
  const draftLayout = React.useMemo(
    () => (props.staticReadOnly ? { staticReadOnly: true } : undefined),
    [props.staticReadOnly],
  );

  if (!props.form || !draftScope) {
    return null;
  }

  return (
    <FormContext.Provider value={props.form}>
      <ValidationContext.Provider value={props.form}>
        <ScopeContext.Provider value={draftScope}>
          <FormLayoutContext.Provider value={draftLayout}>
            <div data-slot={props.bodySlot}>{props.children}</div>
          </FormLayoutContext.Provider>
        </ScopeContext.Provider>
      </ValidationContext.Provider>
    </FormContext.Provider>
  );
}

export function DetailDraftFooter(props: DetailDraftFooterProps) {
  return (
    <>
      {props.error && (
        <p data-slot={props.errorSlot} role="status" aria-live="assertive">
          {props.error}
        </p>
      )}
      <Button type="button" variant="outline" onClick={props.onCancel} disabled={props.confirming}>
        {t('flux.common.cancel')}
      </Button>
      <Button
        type="button"
        onClick={props.onConfirm}
        disabled={props.confirming}
        aria-label={props.confirming ? t('flux.form.confirming') : t('flux.common.confirm')}
      >
        {props.confirming ? <Spinner className="size-4" aria-hidden="true" /> : null}
        {props.confirming ? t('flux.form.confirming') : t('flux.common.confirm')}
      </Button>
    </>
  );
}

export function DetailReadonlyFooter(props: { onClose: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={props.onClose}>
      {t('flux.common.close')}
    </Button>
  );
}

const DIALOG_SIZES = ['sm', 'default', 'lg', 'xl'] as const;
const DRAWER_DIRECTIONS = ['left', 'right', 'top', 'bottom'] as const;

export function DetailSurface(props: DetailSurfaceProps) {
  const mode = props.mode ?? 'dialog';
  const footer = props.readOnly ? <DetailReadonlyFooter onClose={props.onClose} /> : props.footer;

  if (mode === 'drawer') {
    const direction = DRAWER_DIRECTIONS.includes(props.placement as (typeof DRAWER_DIRECTIONS)[number])
      ? (props.placement as (typeof DRAWER_DIRECTIONS)[number])
      : 'bottom';

    return (
      <Drawer
        open={props.open}
        onOpenChange={(next) => {
          if (!next) props.onClose();
        }}
        direction={direction}
      >
        <DrawerContent showCloseButton={false}>
          <DrawerHeader className="flex-row items-start justify-between gap-3">
            <DrawerTitle>{props.title}</DrawerTitle>
            <DrawerClose
              render={
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t('flux.common.close')} />
              }
            >
              <XIcon className="size-4" />
            </DrawerClose>
          </DrawerHeader>
          <DrawerBody>
            <div data-slot={props.bodySlot}>{props.children}</div>
          </DrawerBody>
          <DrawerFooter>{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  const dialogSize = DIALOG_SIZES.includes(props.size as (typeof DIALOG_SIZES)[number])
    ? (props.size as (typeof DIALOG_SIZES)[number])
    : 'default';

  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        if (!next) props.onClose();
      }}
    >
      <DialogContent size={dialogSize}>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div data-slot={props.bodySlot}>{props.children}</div>
        </DialogBody>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
