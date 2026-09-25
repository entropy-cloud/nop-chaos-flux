import { useRef } from 'react';
import { numberAdapter, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { Slider, cn } from '@nop-chaos/ui';
import { useFormFieldFromProps } from '../field-utils.js';
import type { SliderSchema } from '../schemas.js';

const numericAdapter = numberAdapter();
const SLIDER_METHODS = ['clear', 'reset', 'focus'] as const;

export function SliderRenderer(props: RendererComponentProps<SliderSchema>) {
  const name = String(props.props.name ?? '');
  const min = typeof props.props.min === 'number' ? props.props.min : 0;
  const max = typeof props.props.max === 'number' ? props.props.max : 100;
  const step = typeof props.props.step === 'number' && props.props.step > 0 ? props.props.step : 1;

  const { value, handlers, presentation } = useFormFieldFromProps(props, {
    adapter: numericAdapter,
  });
  const numericValue = typeof value === 'number' ? value : undefined;
  const rootRef = useRef<HTMLDivElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'slider',
    cid: props.meta.cid,
    methods: SLIDER_METHODS,
    getFocusTarget: () =>
      rootRef.current?.querySelector<HTMLElement>('[data-slot="slider-thumb"]') ?? rootRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
    resetValue: () => {
      handlers.onChange(numericValue);
      return { fellBackToDefault: false };
    },
  });

  return (
    <div className={cn('nop-slider-field', props.meta.className)} ref={rootRef}>
      <Slider
        value={[numericValue ?? min]}
        min={min}
        max={max}
        step={step}
        disabled={presentation.effectiveDisabled || presentation.readOnly}
        aria-label={String((props.props.label ?? name) || '') || undefined}
        aria-required={props.props.required ? true : undefined}
        data-invalid={presentation.showError ? true : undefined}
        onValueChange={(next) => {
          const nextValue = Array.isArray(next) ? next[0] : next;
          if (typeof nextValue === 'number') {
            handlers.onChange(nextValue);
          }
        }}
      />
      <output className="ml-2 inline-block min-w-8 text-sm tabular-nums text-muted-foreground" data-slot="slider-value">
        {numericValue ?? ''}
      </output>
    </div>
  );
}
