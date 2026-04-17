import React from 'react';
import type { FormRuntime } from '@nop-chaos/flux-core';
import { FormContext, ScopeContext } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@nop-chaos/ui';

export interface DetailSurfaceProps {
  open: boolean;
  mode?: string;
  title?: React.ReactNode;
  bodySlot: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export interface DetailDraftBodyProps {
  form: FormRuntime | undefined;
  bodySlot: string;
  children: React.ReactNode;
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

  if (!props.form || !draftScope) {
    return null;
  }

  return (
    <FormContext.Provider value={props.form}>
      <ScopeContext.Provider value={draftScope}>
        <div data-slot={props.bodySlot}>{props.children}</div>
      </ScopeContext.Provider>
    </FormContext.Provider>
  );
}

export function DetailDraftFooter(props: DetailDraftFooterProps) {
  return (
    <>
      {props.error && <p data-slot={props.errorSlot}>{props.error}</p>}
      <Button type="button" variant="outline" onClick={props.onCancel} disabled={props.confirming}>
        {t('flux.common.cancel')}
      </Button>
      <Button type="button" onClick={props.onConfirm} disabled={props.confirming}>
        {props.confirming ? t('flux.form.confirming') : t('flux.common.confirm')}
      </Button>
    </>
  );
}

export function DetailSurface(props: DetailSurfaceProps) {
  const mode = props.mode ?? 'dialog';

  if (mode === 'drawer') {
    return (
      <Drawer open={props.open} onOpenChange={(next) => { if (!next) props.onClose(); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{props.title}</DrawerTitle>
          </DrawerHeader>
          <div data-slot={props.bodySlot}>{props.children}</div>
          <DrawerFooter>{props.footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={(next) => { if (!next) props.onClose(); }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        <div data-slot={props.bodySlot}>{props.children}</div>
        <DialogFooter>{props.footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
