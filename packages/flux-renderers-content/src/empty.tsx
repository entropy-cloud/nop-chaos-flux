import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type React from 'react';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
  Empty as EmptyPrimitive,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  cn,
  resolveLucideIconStrict,
} from '@nop-chaos/ui';
import type { EmptySchema } from './schemas.js';

const DefaultEmptyIcon = resolveLucideIconStrict('inbox');

function renderEmptyIcon(image: string | undefined): React.ReactNode {
  const IconComp = image ? resolveLucideIconStrict(image) : DefaultEmptyIcon;
  return IconComp ? <IconComp className="size-4" aria-hidden="true" /> : null;
}

export function EmptyRenderer(props: RendererComponentProps<EmptySchema>) {
  const slotProps = props.props;
  const titleContent = resolveRendererSlotContent(props, 'title', {
    fallback: t('flux.common.noData'),
  });
  const descriptionContent = resolveRendererSlotContent(props, 'description');
  const hasDescription = hasRendererSlotContent(descriptionContent);
  const actionsContent = resolveRendererSlotContent(props, 'actions');
  const hasActions = hasRendererSlotContent(actionsContent);

  const image =
    typeof slotProps.image === 'string' && slotProps.image.length > 0 ? slotProps.image : undefined;

  return (
    <EmptyPrimitive
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="empty"
      className={cn('nop-empty', props.meta.className)}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">{renderEmptyIcon(image)}</EmptyMedia>
        <EmptyTitle>{titleContent}</EmptyTitle>
        {hasDescription ? <EmptyDescription>{descriptionContent}</EmptyDescription> : null}
      </EmptyHeader>
      {hasActions ? <EmptyContent>{actionsContent}</EmptyContent> : null}
    </EmptyPrimitive>
  );
}
