import { useRef } from 'react';
import { numberAdapter, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Rating, cn } from '@nop-chaos/ui';
import { useFormFieldFromProps } from '../field-utils.js';
import type { RatingSchema } from '../schemas.js';

const numericAdapter = numberAdapter();
const RATING_METHODS = ['clear', 'reset', 'focus'] as const;

export function RatingRenderer(props: RendererComponentProps<RatingSchema>) {
  const name = String(props.props.name ?? '');
  const count = typeof props.props.count === 'number' && props.props.count >= 1 ? Math.floor(props.props.count) : 5;
  const allowHalf = props.props.allowHalf === true;
  const allowClear = props.props.allowClear === true;

  const { value, handlers, presentation } = useFormFieldFromProps(props, {
    adapter: numericAdapter,
  });
  const numericValue = typeof value === 'number' ? value : undefined;
  const rootRef = useRef<HTMLDivElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'rating',
    cid: props.meta.cid,
    methods: RATING_METHODS,
    getFocusTarget: () => rootRef.current?.querySelector<HTMLElement>('[data-slot="rating-star"]') ?? rootRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
    resetValue: () => {
      handlers.onChange(numericValue);
      return { fellBackToDefault: false };
    },
  });

  return (
    <div className={cn('nop-rating-field', props.meta.className)} ref={rootRef} data-invalid={presentation.showError ? true : undefined}>
      <Rating
        value={numericValue}
        count={count}
        allowHalf={allowHalf}
        allowClear={allowClear}
        readOnly={presentation.readOnly}
        disabled={presentation.effectiveDisabled}
        name={String(props.props.label ?? name) || t('flux.common.ratingAriaLabel')}
        onValueChange={(next) => {
          handlers.onChange(next);
        }}
      />
      <span className="ml-2 inline-block min-w-8 text-sm tabular-nums text-muted-foreground" data-slot="rating-value">
        {numericValue ?? ''}
      </span>
    </div>
  );
}
