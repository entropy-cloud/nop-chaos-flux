import type { KeyboardEvent } from 'react';
import { numberAdapter, type RendererComponentProps } from '@nop-chaos/flux-core';
import { Button, cn, Input } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useFormFieldController } from '../field-utils.js';
import type { InputNumberSchema } from '../schemas.js';

const numericAdapter = numberAdapter();

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

  function handleBlur() {
    if (numericValue !== undefined) {
      const clamped = clamp(numericValue, min, max);
      const withPrecision = applyPrecision(clamped, precision);
      if (withPrecision !== numericValue) {
        handlers.onChange(withPrecision);
      }
    }
    handlers.onBlur();
  }

  function handleStep(direction: 1 | -1) {
    if (!presentation.interactive) {
      return;
    }

    const current = numericValue ?? 0;
    let next = current + direction * step;
    next = clamp(next, min, max);
    next = applyPrecision(next, precision);
    handlers.onChange(next);
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
      data-testid={props.meta.testid}
      data-cid={props.meta.cid}
    >
      <div className="relative flex items-center">
        {prefix ? (
          <span data-slot="prefix" className="pointer-events-none absolute left-3 text-sm text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          type="number"
          id={name ? `${name}-control` : undefined}
          name={name || undefined}
          value={numericValue !== undefined ? numericValue : ''}
          disabled={presentation.effectiveDisabled}
          aria-label={String((props.props.label ?? name) || '') || undefined}
          aria-required={props.props.required ? true : undefined}
          aria-invalid={presentation.showError ? true : undefined}
          aria-errormessage={presentation.showError ? errorId : undefined}
          placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
          min={min}
          max={max}
          step={step}
          className={cn(prefix && 'pl-8', suffix && 'pr-8', showStepper && 'pr-16')}
          onFocus={handlers.onFocus}
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
          readOnly={props.props.readOnly}
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
              onClick={() => handleStep(1)}
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
              onClick={() => handleStep(-1)}
            >
              <ChevronDownIcon className="size-3" />
            </Button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
