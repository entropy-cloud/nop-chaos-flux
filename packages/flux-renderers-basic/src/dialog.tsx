import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, cn } from '@nop-chaos/ui';
import type { DialogSchema } from './schemas';
import { useSurfaceRenderer } from './use-surface-renderer';

export function DialogRenderer(props: RendererComponentProps<DialogSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const bodyContent = props.regions.body?.render();
  const actionsContent = props.regions.actions?.render();
  const showMask = props.props.showMask !== false;
  const { summary, containerElement, handleOpenChange } = useSurfaceRenderer(props, 'dialog');

  return (
    <Dialog open={summary.open} onOpenChange={handleOpenChange} closeOnOutsideClick={props.props.closeOnOutsideClick !== false} containerElement={containerElement} noOverlay={!showMask}>
      <DialogContent className={cn('nop-dialog', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined}>
        {titleContent ? (
          <DialogHeader>
            <DialogTitle>{titleContent}</DialogTitle>
          </DialogHeader>
        ) : null}
        <DialogBody>{bodyContent}</DialogBody>
        {actionsContent ? <DialogFooter>{actionsContent}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
