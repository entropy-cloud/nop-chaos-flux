import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Input, cn } from '@nop-chaos/ui';
import { useFormFieldFromProps } from '../field-utils.js';
import type { InputTimeSchema } from '../schemas.js';
import {
  DEFAULT_TIME_FORMAT,
  DEFAULT_TIME_SECONDS_FORMAT,
  convertValueFormat,
  formatDate,
  isWithinRange,
  parseDate,
} from './date/date-utils.js';
import { StepperButton } from './date/stepper-button.js';

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
  const steppers = props.props.steppers === true;
  const hourStep =
    typeof props.props.hourStep === 'number' && Number.isFinite(props.props.hourStep)
      ? props.props.hourStep
      : 1;
  const minuteStep =
    typeof props.props.minuteStep === 'number' && Number.isFinite(props.props.minuteStep)
      ? props.props.minuteStep
      : 5;

  const { value, handlers, presentation } = useFormFieldFromProps(props);

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

  function clampIntoWindow(date: Date): Date {
    if (isWithinRange(date, minDate, maxDate)) {
      return date;
    }
    if (minDate && date.getTime() < minDate.getTime()) {
      return new Date(minDate);
    }
    if (maxDate) {
      return new Date(maxDate);
    }
    return date;
  }

  function commitDate(date: Date) {
    handlers.onChange(formatDate(clampIntoWindow(date), valueFormat));
  }

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

  function stepField(field: 'hours' | 'minutes', delta: number) {
    // [G2-R2-视角3-01] entry guard (double layer with the button disabled attr,
    // same contract as input-number's commitStep guard): a locked field cannot
    // be rewritten through the stepper channels.
    if (!presentation.interactive) return;
    const current = parseDate(storedValue, valueFormat) ?? new Date(2000, 0, 1, 0, 0, 0);
    const next = new Date(current);
    if (field === 'hours') {
      next.setHours((current.getHours() + delta + 24) % 24, current.getMinutes(), 0, 0);
    } else {
      // Minute stepping carries into the hour and wraps around midnight.
      const totalMinutes = current.getHours() * 60 + current.getMinutes() + delta;
      const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
      next.setHours(Math.floor(wrapped / 60), wrapped % 60, 0, 0);
    }
    commitDate(next);
  }

  const stepHourUp = () => stepField('hours', hourStep);
  const stepHourDown = () => stepField('hours', -hourStep);
  const stepMinuteUp = () => stepField('minutes', minuteStep);
  const stepMinuteDown = () => stepField('minutes', -minuteStep);

  if (steppers) {
    // Sundial-style stepper layout: [hour -/+] HH : MM [+/- minute].
    // [G2-R2-视角3-01] all four steppers consume the disabled/readOnly gate.
    const stepperLocked = !presentation.interactive;
    const displayValue = storedValue
      ? convertValueFormat(storedValue, valueFormat, timeInputFormat)
      : undefined;
    const [h, m] = displayValue ? displayValue.split(':') : ['00', '00'];
    const baseTestId = props.meta.testid ? `${props.meta.testid}-` : name ? `${name}-` : 'time-';
    return (
      <div
        className={cn('nop-input-time', 'flex items-center gap-1', props.meta.className)}
        data-steppers="true"
        data-disabled={stepperLocked || undefined}
        aria-disabled={stepperLocked || undefined}
      >
        <div className="flex flex-col">
          <StepperButton
            direction="up"
            label={`+${hourStep} ${t('flux.date.hour')}`}
            testid={`${baseTestId}hour-up`}
            onClick={stepHourUp}
            disabled={stepperLocked}
          />
          <StepperButton
            direction="down"
            label={`-${hourStep} ${t('flux.date.hour')}`}
            testid={`${baseTestId}hour-down`}
            onClick={stepHourDown}
            disabled={stepperLocked}
          />
        </div>
        <span
          data-testid={`${baseTestId}display`}
          className="px-1 font-mono text-base text-foreground"
        >
          {h} : {m}
        </span>
        <div className="flex flex-col">
          <StepperButton
            direction="up"
            label={`+${minuteStep} ${t('flux.date.minute')}`}
            testid={`${baseTestId}minute-up`}
            onClick={stepMinuteUp}
            disabled={stepperLocked}
          />
          <StepperButton
            direction="down"
            label={`-${minuteStep} ${t('flux.date.minute')}`}
            testid={`${baseTestId}minute-down`}
            onClick={stepMinuteDown}
            disabled={stepperLocked}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('nop-input-time', 'relative flex items-center', props.meta.className)}
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
          aria-label={t('flux.common.clear')}
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
