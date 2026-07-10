import { useRef } from 'react';
import { XIcon } from 'lucide-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { Button, Input, NativeSelect, NativeSelectOption, cn } from '@nop-chaos/ui';
import { useFormFieldController } from '../field-utils.js';
import type { InputPeriodSchema } from '../schemas.js';
import {
  type PeriodKind,
  compareDates,
  defaultFormatForRangeKind,
  formatPeriod,
  joinDateRange,
  monthToQuarter,
  normalizePeriodRange,
  parsePeriod,
  parsePeriodRange,
} from './date/date-utils.js';

const PERIOD_METHODS = ['clear', 'focus'] as const;

const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

function periodMarker(kind: PeriodKind): string {
  switch (kind) {
    case 'month':
      return 'nop-input-month';
    case 'quarter':
      return 'nop-input-quarter';
    case 'year':
      return 'nop-input-year';
  }
}

function periodFieldType(kind: PeriodKind): string {
  return `input-${kind}`;
}

/**
 * Shared control for the period family (month/quarter/year). Each kind renders
 * the appropriate native/simple inputs; range mode emits a delimiter-joined
 * pair. The stored value uses the period valueFormat (YYYY-MM / YYYY-Qq / YYYY).
 *
 * The `kind` is supplied by the thin type-specific wrapper (M-07) instead of a
 * runtime `schema.type` switch, so this component is fully kind-driven.
 */
export function PeriodRenderer(
  props: RendererComponentProps<InputPeriodSchema>,
  kind: PeriodKind,
) {
  const name = String(props.props.name ?? '');
  const selectionMode = props.props.selectionMode === 'range' ? 'range' : 'single';
  const delimiter =
    typeof props.props.delimiter === 'string' && props.props.delimiter
      ? props.props.delimiter
      : ',';
  const valueFormat =
    typeof props.props.valueFormat === 'string' && props.props.valueFormat
      ? props.props.valueFormat
      : defaultFormatForRangeKind(kind);
  const displayFormat =
    typeof props.props.displayFormat === 'string' && props.props.displayFormat
      ? props.props.displayFormat
      : valueFormat;
  const clearable = props.props.clearable === true;
  const placeholder =
    typeof props.props.placeholder === 'string' && props.props.placeholder
      ? props.props.placeholder
      : undefined;
  const ariaLabel = String((props.props.label ?? name) || '') || undefined;

  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });

  const storedValue = typeof value === 'string' ? value : undefined;
  const errorId = name ? `${name}-error` : undefined;
  const triggerRef = useRef<HTMLElement | null>(null);

  const minPeriod = parsePeriod(
    typeof props.props.minDate === 'string' ? props.props.minDate : undefined,
    kind,
    valueFormat,
  );
  const maxPeriod = parsePeriod(
    typeof props.props.maxDate === 'string' ? props.props.maxDate : undefined,
    kind,
    valueFormat,
  );

  useInputComponentHandle({
    id: props.id,
    name,
    type: periodFieldType(kind),
    cid: props.meta.cid,
    methods: PERIOD_METHODS,
    getFocusTarget: () => triggerRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
  });

  const interactive = presentation.interactive;

  function commitSingle(next: string | undefined) {
    if (!next) {
      handlers.onChange(undefined);
      return;
    }
    if (minPeriod && parsePeriod(next, kind, valueFormat) && compareDates(parsePeriod(next, kind, valueFormat), minPeriod) < 0) {
      next = formatPeriod(minPeriod, kind, valueFormat) ?? next;
    }
    if (maxPeriod && parsePeriod(next, kind, valueFormat) && compareDates(parsePeriod(next, kind, valueFormat), maxPeriod) > 0) {
      next = formatPeriod(maxPeriod, kind, valueFormat) ?? next;
    }
    handlers.onChange(next);
  }

  function commitRange(nextStart: string | undefined, nextEnd: string | undefined) {
    const normalized = normalizePeriodRange(nextStart, nextEnd, kind, valueFormat);
    if (!normalized.start && !normalized.end) {
      handlers.onChange(undefined);
      return;
    }
    handlers.onChange(joinDateRange(normalized.start, normalized.end, delimiter));
  }

  const parsedRange =
    selectionMode === 'range'
      ? parsePeriodRange(storedValue, delimiter, kind, valueFormat)
      : { start: undefined, end: undefined };
  const reversed =
    selectionMode === 'range' &&
    Boolean(parsedRange.start && parsedRange.end && compareDates(parsedRange.start, parsedRange.end) > 0);
  const startVal = reversed ? parsedRange.end : parsedRange.start;
  const endVal = reversed ? parsedRange.start : parsedRange.end;
  const singleVal = selectionMode === 'single' ? storedValue : undefined;

  const hasValue = Boolean(storedValue);

  return (
    <div
      className={cn(periodMarker(kind), 'flex items-center gap-2', props.meta.className)}
      data-slot="period-control"
      data-period-kind={kind}
      data-selection-mode={selectionMode}
      data-has-value={hasValue ? '' : undefined}
      data-invalid={presentation.showError ? '' : undefined}
    >
      {selectionMode === 'single' ? (
        <PeriodPicker
          kind={kind}
          value={singleVal}
          valueFormat={valueFormat}
          displayFormat={displayFormat}
          placeholder={placeholder}
          ariaLabel={ariaLabel}
          interactive={interactive}
          showError={presentation.showError}
          errorId={errorId}
          attachRef={(node) => {
            triggerRef.current = node;
          }}
          onFocus={handlers.onFocus}
          onBlur={handlers.onBlur}
          onChange={commitSingle}
        />
      ) : (
        <>
          <PeriodPicker
            kind={kind}
            value={formatPeriod(startVal, kind, valueFormat)}
            valueFormat={valueFormat}
            displayFormat={displayFormat}
            placeholder="Start"
            ariaLabel={ariaLabel ? `${ariaLabel} start` : 'Range start'}
            interactive={interactive}
            showError={presentation.showError}
            errorId={errorId}
            attachRef={(node) => {
              triggerRef.current = node;
            }}
            onFocus={handlers.onFocus}
            onBlur={handlers.onBlur}
            onChange={(next) => commitRange(next, formatPeriod(endVal, kind, valueFormat))}
          />
          <span className="text-muted-foreground" aria-hidden="true">
            {delimiter}
          </span>
          <PeriodPicker
            kind={kind}
            value={formatPeriod(endVal, kind, valueFormat)}
            valueFormat={valueFormat}
            displayFormat={displayFormat}
            placeholder="End"
            ariaLabel={ariaLabel ? `${ariaLabel} end` : 'Range end'}
            interactive={interactive}
            showError={presentation.showError}
            errorId={errorId}
            attachRef={() => {}}
            onFocus={handlers.onFocus}
            onBlur={handlers.onBlur}
            onChange={(next) => commitRange(formatPeriod(startVal, kind, valueFormat), next)}
          />
        </>
      )}
      {clearable && hasValue && interactive ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="Clear"
          data-testid={`period-clear-${kind}`}
          onClick={() => handlers.onChange(undefined)}
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}

interface PeriodPickerProps {
  kind: PeriodKind;
  value: string | undefined;
  valueFormat: string;
  displayFormat: string;
  placeholder: string | undefined;
  ariaLabel: string | undefined;
  interactive: boolean;
  showError: boolean;
  errorId: string | undefined;
  attachRef: (node: HTMLElement | null) => void;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (next: string | undefined) => void;
}

function PeriodPicker(props: PeriodPickerProps) {
  const {
    kind,
    value,
    placeholder,
    ariaLabel,
    interactive,
    showError,
    errorId,
    attachRef,
    onFocus,
    onBlur,
    onChange,
  } = props;

  // Extract year for the composite (quarter) and fallback year controls.
  const parsed = parsePeriod(value, kind, props.valueFormat);
  const yearValue = parsed ? String(parsed.getFullYear()) : '';

  if (kind === 'month') {
    return (
      <Input
        ref={(node: HTMLInputElement | null) => {
          attachRef(node);
        }}
        type="month"
        value={value ?? ''}
        disabled={!interactive}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={showError ? true : undefined}
        aria-describedby={showError ? errorId : undefined}
        data-testid={`period-input-${kind}`}
        className="w-auto"
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value || undefined)}
      />
    );
  }

  if (kind === 'year') {
    return (
      <Input
        ref={(node: HTMLInputElement | null) => {
          attachRef(node);
        }}
        type="text"
        inputMode="numeric"
        value={value ?? ''}
        disabled={!interactive}
        maxLength={4}
        placeholder={placeholder ?? 'YYYY'}
        aria-label={ariaLabel}
        aria-invalid={showError ? true : undefined}
        aria-describedby={showError ? errorId : undefined}
        data-testid={`period-input-${kind}`}
        className="w-24"
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
          if (!digits) {
            onChange(undefined);
            return;
          }
          onChange(digits);
        }}
      />
    );
  }

  // quarter: year number + quarter select
  const currentQuarter = parsed ? monthToQuarter(parsed.getMonth() + 1) : 0;
  return (
    <div className="flex items-center gap-1.5" data-testid={`period-input-${kind}`}>
      <Input
        ref={(node: HTMLInputElement | null) => {
          attachRef(node);
        }}
        type="text"
        inputMode="numeric"
        value={yearValue}
        disabled={!interactive}
        maxLength={4}
        placeholder={placeholder ?? 'YYYY'}
        aria-label={ariaLabel ? `${ariaLabel} year` : 'Quarter year'}
        aria-invalid={showError ? true : undefined}
        aria-describedby={showError ? errorId : undefined}
        className="w-24"
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
          if (!digits || currentQuarter === 0) {
            onChange(undefined);
            return;
          }
          onChange(`${digits}-Q${currentQuarter}`);
        }}
      />
      <NativeSelect
        value={currentQuarter ? String(currentQuarter) : ''}
        disabled={!interactive}
        aria-label={ariaLabel ? `${ariaLabel} quarter` : 'Quarter'}
        onChange={(event) => {
          const q = Number(event.target.value);
          const yr = yearValue ? Number(yearValue) : 0;
          if (!yr || !q) {
            onChange(undefined);
            return;
          }
          onChange(`${yr}-Q${q}`);
        }}
      >
        <NativeSelectOption value="" disabled>
          Q
        </NativeSelectOption>
        {QUARTER_LABELS.map((label, index) => (
          <NativeSelectOption key={label} value={String(index + 1)}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

export { monthToQuarter };

// M-07: thin type-specific wrappers. Each renderer type maps to its own wrapper
// that supplies the period kind directly, removing any runtime `schema.type`
// dispatch from the renderer family.
export function MonthPeriodRenderer(props: RendererComponentProps<InputPeriodSchema>) {
  return PeriodRenderer(props, 'month');
}

export function QuarterPeriodRenderer(props: RendererComponentProps<InputPeriodSchema>) {
  return PeriodRenderer(props, 'quarter');
}

export function YearPeriodRenderer(props: RendererComponentProps<InputPeriodSchema>) {
  return PeriodRenderer(props, 'year');
}
