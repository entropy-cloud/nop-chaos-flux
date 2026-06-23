import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { hasRendererSlotContent, resolveRendererSlotContent } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Spinner, cn } from '@nop-chaos/ui';
import type { SpinnerSchema, SpinnerSize } from './schemas.js';

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-6',
};

export function SpinnerRenderer(props: RendererComponentProps<SpinnerSchema>) {
  // `visible` is a frozen META_FIELD: the runtime hides the node when
  // meta.visible is false. Mirror that here so focused unit tests (which mount
  // the renderer directly, bypassing the runtime wrapper) observe the hide too.
  if (props.meta.visible === false) {
    return null;
  }

  const slotProps = props.props;
  const size: SpinnerSize =
    slotProps.size === 'sm' || slotProps.size === 'lg' ? slotProps.size : 'md';
  const labelContent = resolveRendererSlotContent(props, 'label');
  const hasLabel = hasRendererSlotContent(labelContent);
  const ariaLabel = t('flux.common.loading');

  return (
    <div
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="spinner"
      data-size={size}
      className={cn('nop-spinner inline-flex items-center gap-2', props.meta.className)}
    >
      <Spinner className={SIZE_CLASS[size]} aria-label={ariaLabel} />
      {hasLabel ? <span data-slot="spinner-label">{labelContent}</span> : null}
    </div>
  );
}
