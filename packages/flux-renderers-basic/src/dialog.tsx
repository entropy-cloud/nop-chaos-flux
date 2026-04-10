import React, { useMemo } from 'react';
import type { RendererComponentProps, SurfaceStatusSummary } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, cn } from '@nop-chaos/ui';
import type { DialogSchema } from './schemas';
import { useStatusPathPublication } from './status-hooks';

export function DialogRenderer(props: RendererComponentProps<DialogSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const bodyContent = props.regions.body?.instantiate();
  const actionsContent = props.regions.actions?.instantiate();
  const statusPath = typeof props.schema.statusPath === 'string' ? props.schema.statusPath : undefined;
  const summary = useMemo<SurfaceStatusSummary>(() => ({
    id: props.id,
    kind: 'dialog',
    open: Boolean(props.props.open ?? props.props.defaultOpen ?? true),
    active: Boolean(props.props.open ?? props.props.defaultOpen ?? true),
    opening: false,
    closing: false,
  }), [props.id, props.props.defaultOpen, props.props.open]);

  useStatusPathPublication(props.node.scope.parent ?? props.node.scope, statusPath, summary);

  return (
    <Dialog open={summary.open} onOpenChange={(open) => { if (!open) void props.events.onClose?.(); else void props.events.onOpen?.(); }} closeOnOutsideClick={props.props.closeOnOutsideClick !== false}>
      <DialogContent className={cn('nop-dialog', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
        {titleContent ? (
          <DialogHeader>
            <DialogTitle>{titleContent}</DialogTitle>
          </DialogHeader>
        ) : null}
        {bodyContent}
        {actionsContent ? <DialogFooter>{actionsContent}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
