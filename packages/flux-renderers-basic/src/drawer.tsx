import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, cn } from '@nop-chaos/ui';
import type { DrawerSchema } from './schemas';
import { useSurfaceRenderer } from './use-surface-renderer';

export function DrawerRenderer(props: RendererComponentProps<DrawerSchema>) {
  const titleContent = resolveRendererSlotContent(props, 'title');
  const bodyContent = props.regions.body?.render();
  const actionsContent = props.regions.actions?.render();
  const showMask = props.props.showMask !== false;
  const { summary, containerElement, handleOpenChange } = useSurfaceRenderer(props, 'drawer');

  const direction = props.props.side === 'left' ? 'left' : props.props.side === 'top' ? 'top' : props.props.side === 'bottom' ? 'bottom' : props.props.side === 'right' ? 'right' : 'bottom';

  return (
    <Drawer open={summary.open} onOpenChange={handleOpenChange} direction={direction} containerElement={containerElement}>
      <DrawerContent className={cn('nop-drawer', props.meta.className)} data-testid={props.meta.testid || undefined} data-cid={props.meta.cid || undefined} showMask={showMask}>
        {titleContent ? (
          <DrawerHeader>
            <DrawerTitle>{titleContent}</DrawerTitle>
          </DrawerHeader>
        ) : null}
        <DrawerBody>{bodyContent}</DrawerBody>
        {actionsContent ? <DrawerFooter>{actionsContent}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  );
}
