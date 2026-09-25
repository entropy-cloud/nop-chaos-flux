import { useRef } from 'react';
import { stringAdapter, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { ColorPicker, cn } from '@nop-chaos/ui';
import { useFormFieldFromProps } from '../field-utils.js';
import type { InputColorSchema } from '../schemas.js';

const textAdapter = stringAdapter();
const INPUT_COLOR_METHODS = ['clear', 'reset', 'focus'] as const;

export function InputColorRenderer(props: RendererComponentProps<InputColorSchema>) {
  const name = String(props.props.name ?? '');
  const format = props.props.valueFormat === 'rgba' ? 'rgba' : 'hex';
  const presetColors = Array.isArray(props.props.presetColors)
    ? props.props.presetColors.filter((color): color is string => typeof color === 'string')
    : undefined;

  const { value, handlers, presentation } = useFormFieldFromProps(props, {
    adapter: textAdapter,
  });
  const colorValue = typeof value === 'string' && value.trim() !== '' ? value : undefined;
  const rootRef = useRef<HTMLDivElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'input-color',
    cid: props.meta.cid,
    methods: INPUT_COLOR_METHODS,
    getFocusTarget: () =>
      rootRef.current?.querySelector<HTMLElement>('[data-slot="color-picker"] button') ?? rootRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
    resetValue: () => {
      handlers.onChange(colorValue);
      return { fellBackToDefault: false };
    },
  });

  return (
    <div className={cn('nop-input-color', props.meta.className)} ref={rootRef} data-invalid={presentation.showError ? true : undefined}>
      <ColorPicker
        value={colorValue}
        format={format}
        presetColors={presetColors}
        readOnly={presentation.readOnly}
        disabled={presentation.effectiveDisabled}
        placeholder={typeof props.props.placeholder === 'string' ? props.props.placeholder : undefined}
        ariaLabel={String(props.props.label ?? name) || t('flux.common.colorPickerAriaLabel')}
        onValueChange={(next) => {
          handlers.onChange(next);
        }}
      />
    </div>
  );
}
