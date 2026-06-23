import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { useFormFieldController } from '../field-utils.js';
import type { InputDatetimeSchema } from '../schemas.js';
import { DEFAULT_DATETIME_FORMAT, parseDate, toCalendarDate } from './date/date-utils.js';
import { DateFieldControl } from './date/date-field-control.js';

export function InputDatetimeRenderer(props: RendererComponentProps<InputDatetimeSchema>) {
  const name = String(props.props.name ?? '');
  const valueFormat =
    typeof props.props.valueFormat === 'string' && props.props.valueFormat
      ? props.props.valueFormat
      : DEFAULT_DATETIME_FORMAT;
  const displayFormat =
    typeof props.props.displayFormat === 'string' && props.props.displayFormat
      ? props.props.displayFormat
      : valueFormat;
  const utc = props.props.utc === true;
  const clearable = props.props.clearable === true;
  const placeholder =
    typeof props.props.placeholder === 'string' && props.props.placeholder
      ? props.props.placeholder
      : undefined;

  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });

  const storedValue = typeof value === 'string' ? value : undefined;
  const errorId = name ? `${name}-error` : undefined;

  const minDate = toCalendarDate(
    parseDate(
      typeof props.props.minDate === 'string' ? props.props.minDate : undefined,
      valueFormat,
      { utc },
    ),
    utc,
  );
  const maxDate = toCalendarDate(
    parseDate(
      typeof props.props.maxDate === 'string' ? props.props.maxDate : undefined,
      valueFormat,
      { utc },
    ),
    utc,
  );

  return (
    <div className={cn('nop-input-datetime', props.meta.className)} data-slot="field-control">
      <DateFieldControl
        id={props.id}
        cid={props.meta.cid}
        fieldType="input-datetime"
        name={name}
        storedValue={storedValue}
        valueFormat={valueFormat}
        displayFormat={displayFormat}
        utc={utc}
        withTime={true}
        minDate={minDate}
        maxDate={maxDate}
        clearable={clearable}
        interactive={presentation.interactive}
        visible={props.meta.visible !== false}
        showError={presentation.showError}
        errorId={errorId}
        placeholder={placeholder}
        ariaLabel={String((props.props.label ?? name) || '') || undefined}
        onChange={(next) => handlers.onChange(next)}
        onFocus={handlers.onFocus}
        onBlur={handlers.onBlur}
      />
    </div>
  );
}
