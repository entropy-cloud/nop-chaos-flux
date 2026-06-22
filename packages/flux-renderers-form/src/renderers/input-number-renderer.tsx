import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { numberAdapter, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { Button, cn, Input, useIsMobile } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useFormFieldController } from '../field-utils.js';
import type { InputNumberSchema } from '../schemas.js';
import { scrollRefIntoViewOnMobile, type InputModeValue } from './mobile-touch-utils.js';

const numericAdapter = numberAdapter();
const INPUT_NUMBER_METHODS = ['clear', 'reset', 'focus'] as const;

const LONG_PRESS_INITIAL_DELAY_MS = 400;
const LONG_PRESS_REPEAT_INTERVAL_MS = 80;

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  let result = value;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}

function applyPrecision(value: number, precision: number | undefined): number {
  if (precision === undefined || precision < 0) return value;
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

export function InputNumberRenderer(props: RendererComponentProps<InputNumberSchema>) {
  const name = String(props.props.name ?? '');
  const isMobile = useIsMobile();
  const min = typeof props.props.min === 'number' ? props.props.min : undefined;
  const max = typeof props.props.max === 'number' ? props.props.max : undefined;
  const step = typeof props.props.step === 'number' ? props.props.step : 1;
  const precision = typeof props.props.precision === 'number' ? props.props.precision : undefined;
  const prefix = typeof props.props.prefix === 'string' ? props.props.prefix : undefined;
  const suffix = typeof props.props.suffix === 'string' ? props.props.suffix : undefined;
  const showStepper = props.props.showStepper !== false;
  const keyboard = props.props.keyboard !== false;

  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: numericAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });

  const numericValue = value as number | undefined;
  const errorId = name ? `${name}-error` : undefined;
  const inputMode: InputModeValue =
    typeof props.props.inputMode === 'string' && props.props.inputMode.length > 0
      ? (props.props.inputMode as InputModeValue)
      : 'decimal';

  const inputRef = useRef<HTMLInputElement | null>(null);
  const initialValueRef = useRef<number | undefined>(numericValue);
  const latestValueRef = useRef<number | undefined>(numericValue);

  useEffect(() => {
    latestValueRef.current = numericValue;
  }, [numericValue]);

  const longPressInitialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressIntervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const steppedViaLongPressRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressInitialTimerRef.current) {
        clearTimeout(longPressInitialTimerRef.current);
        longPressInitialTimerRef.current = null;
      }
      if (longPressIntervalTimerRef.current) {
        clearInterval(longPressIntervalTimerRef.current);
        longPressIntervalTimerRef.current = null;
      }
    };
  }, []);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'input-number',
    cid: props.meta.cid,
    methods: INPUT_NUMBER_METHODS,
    getFocusTarget: () => inputRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
    resetValue: () => {
      handlers.onChange(initialValueRef.current);
      return { fellBackToDefault: initialValueRef.current === undefined };
    },
  });

  function handleBlur() {
    cancelLongPress();
    if (numericValue !== undefined) {
      const clamped = clamp(numericValue, min, max);
      const withPrecision = applyPrecision(clamped, precision);
      if (withPrecision !== numericValue) {
        handlers.onChange(withPrecision);
      }
    }
    handlers.onBlur();
  }

  function commitStep(direction: 1 | -1): boolean {
    if (!presentation.interactive) {
      return false;
    }

    const current = latestValueRef.current ?? 0;
    let next = current + direction * step;
    next = clamp(next, min, max);
    next = applyPrecision(next, precision);

    if (next === current) {
      return false;
    }

    latestValueRef.current = next;
    handlers.onChange(next);
    return true;
  }

  function handleStep(direction: 1 | -1) {
    commitStep(direction);
  }

  function cancelLongPress() {
    if (longPressInitialTimerRef.current) {
      clearTimeout(longPressInitialTimerRef.current);
      longPressInitialTimerRef.current = null;
    }
    if (longPressIntervalTimerRef.current) {
      clearInterval(longPressIntervalTimerRef.current);
      longPressIntervalTimerRef.current = null;
    }
  }

  function startLongPress(direction: 1 | -1) {
    steppedViaLongPressRef.current = false;
    cancelLongPress();

    longPressInitialTimerRef.current = setTimeout(() => {
      longPressInitialTimerRef.current = null;
      if (!commitStep(direction)) {
        return;
      }
      steppedViaLongPressRef.current = true;

      longPressIntervalTimerRef.current = setInterval(() => {
        if (!commitStep(direction)) {
          if (longPressIntervalTimerRef.current) {
            clearInterval(longPressIntervalTimerRef.current);
            longPressIntervalTimerRef.current = null;
          }
        }
      }, LONG_PRESS_REPEAT_INTERVAL_MS);
    }, LONG_PRESS_INITIAL_DELAY_MS);
  }

  function handleStepperPointerDown(direction: 1 | -1, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!presentation.interactive) {
      return;
    }
    event.preventDefault();
    startLongPress(direction);
  }

  function handleStepperPointerUp() {
    cancelLongPress();
  }

  function handleStepperClick(direction: 1 | -1) {
    if (steppedViaLongPressRef.current) {
      steppedViaLongPressRef.current = false;
      return;
    }
    handleStep(direction);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!keyboard) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      handleStep(1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      handleStep(-1);
    }
  }

  return (
    <div
      className={cn('nop-input-number', props.meta.className)}
      data-slot="field-control"
    >
      <div className="relative flex items-center">
        {prefix ? (
          <span data-slot="prefix" className="pointer-events-none absolute left-3 text-sm text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          ref={inputRef}
          type="number"
          inputMode={inputMode}
          id={name ? `${name}-control` : undefined}
          name={name || undefined}
          value={numericValue !== undefined ? numericValue : ''}
          disabled={presentation.effectiveDisabled}
          readOnly={presentation.readOnly}
          aria-label={String((props.props.label ?? name) || '') || undefined}
          aria-required={props.props.required ? true : undefined}
          aria-invalid={presentation.showError ? true : undefined}
          aria-describedby={presentation.showError ? errorId : undefined}
          aria-errormessage={presentation.showError ? errorId : undefined}
          placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
          min={min}
          max={max}
          step={step}
          className={cn(prefix && 'pl-8', suffix && 'pr-8', showStepper && 'pr-16')}
          onFocus={() => {
            handlers.onFocus();
            scrollRefIntoViewOnMobile(isMobile, inputRef);
          }}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') {
              handlers.onChange(undefined);
              return;
            }
            const parsed = Number(raw);
            if (!Number.isNaN(parsed)) {
              handlers.onChange(parsed);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {suffix ? (
          <span data-slot="suffix" className="pointer-events-none absolute right-3 text-sm text-muted-foreground">
            {suffix}
          </span>
        ) : null}
        {showStepper ? (
          <span data-slot="stepper" className="absolute right-1 flex flex-col">
            <Button
              type="button"
              data-slot="stepper-increase"
              aria-label="Increase"
              variant="ghost"
              size="icon-xs"
              className="h-4 w-6 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              disabled={!presentation.interactive}
              onPointerDown={(event) => handleStepperPointerDown(1, event)}
              onPointerUp={handleStepperPointerUp}
              onPointerLeave={handleStepperPointerUp}
              onClick={() => handleStepperClick(1)}
            >
              <ChevronUpIcon className="size-3" />
            </Button>
            <Button
              type="button"
              data-slot="stepper-decrease"
              aria-label="Decrease"
              variant="ghost"
              size="icon-xs"
              className="h-4 w-6 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              disabled={!presentation.interactive}
              onPointerDown={(event) => handleStepperPointerDown(-1, event)}
              onPointerUp={handleStepperPointerUp}
              onPointerLeave={handleStepperPointerUp}
              onClick={() => handleStepperClick(-1)}
            >
              <ChevronDownIcon className="size-3" />
            </Button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
