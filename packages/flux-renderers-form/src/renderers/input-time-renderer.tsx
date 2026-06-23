import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { Input, Button, cn } from '@nop-chaos/ui';
import { useFormFieldController } from '../field-utils.js';
import type { InputTimeSchema } from '../schemas.js';
import {
  DEFAULT_TIME_FORMAT,
  DEFAULT_TIME_SECONDS_FORMAT,
  convertValueFormat,
  formatDate,
  isWithinRange,
  parseDate,
} from './date/date-utils.js';

const INPUT_TIME_METHODS = ['clear', 'focus'] as const;

function resolveTimeInputFormat(formats: string[]): string {
  return formats.some((fmt) => fmt.includes('ss'))
    ? DEFAULT_TIME_SECONDS_FORMAT
    : DEFAULT_TIME_FORMAT;
}

export function InputTimeRenderer(props: RendererComponentProps<InputTimeSchema>) {
  const name = String(props.props.name ?? '');
  const valueFormat =
    typeof props.props.valueFormat === 'string' && props.props.valueFormat
      ? props.props.valueFormat
      : DEFAULT_TIME_FORMAT;
  const displayFormat =
    typeof props.props.displayFormat === 'string' && props.props.displayFormat
      ? props.props.displayFormat
      : valueFormat;
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const timeInputFormat = resolveTimeInputFormat([valueFormat, displayFormat]);

  // Convert the stored valueFormat into the native input's HH:mm(:ss) form.
  const inputValue = convertValueFormat(storedValue, valueFormat, timeInputFormat) ?? '';

  const minDate = parseDate(
    typeof props.props.minTime === 'string' ? props.props.minTime : undefined,
    valueFormat,
  );
  const maxDate = parseDate(
    typeof props.props.maxTime === 'string' ? props.props.maxTime : undefined,
    valueFormat,
  );

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'input-time',
    cid: props.meta.cid,
    methods: INPUT_TIME_METHODS,
    getFocusTarget: () => inputRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
  });

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const native = event.target.value;
    if (native === '') {
      handlers.onChange(undefined);
      return;
    }
    // Normalize the native HH:mm(:ss) selection into the field's valueFormat,
    // clamping into the [minTime, maxTime] window when bounds are declared.
    let next = convertValueFormat(native, timeInputFormat, valueFormat);
    if (next) {
      const parsed = parseDate(next, valueFormat);
      if (parsed && !isWithinRange(parsed, minDate, maxDate)) {
        if (minDate && parsed.getTime() < minDate.getTime()) {
          next = formatDate(minDate, valueFormat);
        } else if (maxDate) {
          next = formatDate(maxDate, valueFormat);
        }
      }
    }
    handlers.onChange(next ?? native);
  }

  return (
    <div
      className={cn('nop-input-time', 'relative flex items-center', props.meta.className)}
      data-slot="field-control"
    >
      <Input
        ref={inputRef}
        type="time"
        step={timeInputFormat.includes('ss') ? 1 : undefined}
        id={name ? `${name}-control` : undefined}
        name={name || undefined}
        value={inputValue}
        disabled={presentation.effectiveDisabled}
        readOnly={presentation.readOnly}
        aria-label={String((props.props.label ?? name) || '') || undefined}
        aria-required={props.props.required ? true : undefined}
        aria-invalid={presentation.showError ? true : undefined}
        aria-describedby={presentation.showError ? errorId : undefined}
        aria-errormessage={presentation.showError ? errorId : undefined}
        placeholder={placeholder}
        className={cn(clearable && inputValue && 'pr-8')}
        onFocus={handlers.onFocus}
        onChange={handleChange}
        onBlur={handlers.onBlur}
      />
      {clearable && inputValue && presentation.interactive ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="Clear"
          data-testid="time-clear"
          className="absolute right-1"
          onClick={() => handlers.onChange(undefined)}
        >
          ✕
        </Button>
      ) : null}
    </div>
  );
}
