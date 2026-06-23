import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { Separator, cn } from '@nop-chaos/ui';
import type { SeparatorSchema } from './schemas.js';

export function SeparatorRenderer(props: RendererComponentProps<SeparatorSchema>) {
  const slotProps = props.props;
  const orientation = slotProps.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const decorative = slotProps.decorative === true;
  const labelContent = resolveRendererSlotContent(props, 'label');
  // base-ui Separator has no `decorative` prop; map it to aria-hidden so a
  // decorative divider is removed from the accessibility tree.
  const decorativeProps = decorative ? { 'aria-hidden': true as const, role: 'none' as const } : null;
  // A labelled divider is inherently horizontal (text reads left-to-right); a
  // vertical orientation + label is incoherent, so a label forces the labelled
  // horizontal layout regardless of the requested orientation.
  const showLabel = hasRendererSlotContent(labelContent);

  if (showLabel) {
    return (
      <div
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="separator"
        data-orientation="horizontal"
        className={cn('nop-separator flex items-center gap-3 w-full', props.meta.className)}
      >
        <Separator className="flex-1" />
        <span data-slot="separator-label" className="text-xs text-muted-foreground whitespace-nowrap">
          {labelContent}
        </span>
        <Separator className="flex-1" />
      </div>
    );
  }

  return (
    <Separator
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="separator"
      orientation={orientation}
      className={cn('nop-separator', props.meta.className)}
      {...decorativeProps}
    />
  );
}
