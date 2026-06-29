import { useRef, useState, type ChangeEvent } from 'react';
import { CalendarIcon, XIcon } from 'lucide-react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { Button, Calendar, Input, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { useFormFieldController } from '../field-utils.js';
import type { DateRangeSchema } from '../schemas.js';
import {
  DEFAULT_TIME_FORMAT,
  type DateOptions,
  type RangeKind,
  compareDates,
  convertValueFormat,
  defaultFormatForRangeKind,
  formatDate,
  joinDateRange,
  normalizeRange,
  parseDate,
  parseDateRange,
  toCalendarDate,
  toStorageDate,
} from './date/date-utils.js';

const DATE_RANGE_METHODS = ['clear', 'focus'] as const;

interface RangeShortcut {
  label: string;
  start: string;
  end: string;
}

function asRangeKind(value: unknown): RangeKind {
  return value === 'datetime' || value === 'time' ? value : 'date';
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function buildDisabledMatchers(
  minDate: Date | undefined,
  maxDate: Date | undefined,
): Array<{ before: Date } | { after: Date }> | undefined {
  const matchers: Array<{ before: Date } | { after: Date }> = [];
  if (minDate) matchers.push({ before: minDate });
  if (maxDate) matchers.push({ after: maxDate });
  return matchers.length > 0 ? matchers : undefined;
}

/**
 * Clamp a date into `[minDate, maxDate]` (calendar-local bounds, same frame as
 * `startDate`/`endDate`). Mirrors `date-field-control`'s `clampToRange` so a
 * time typed via `setTimeOn` (or any path through `commitRange`) cannot land
 * outside the declared bounds — the calendar path already constrains via
 * disabled matchers, but the time inputs bypass them.
 */
function clampDateToRange(
  date: Date | undefined,
  minDate: Date | undefined,
  maxDate: Date | undefined,
): Date | undefined {
  if (!date) return date;
  if (minDate && date.getTime() < minDate.getTime()) return new Date(minDate);
  if (maxDate && date.getTime() > maxDate.getTime()) return new Date(maxDate);
  return date;
}

export function DateRangeRenderer(props: RendererComponentProps<DateRangeSchema>) {
  const name = String(props.props.name ?? '');
  const rangeKind = asRangeKind(props.props.rangeKind);
  const delimiter =
    typeof props.props.delimiter === 'string' && props.props.delimiter
      ? props.props.delimiter
      : ',';
  const valueFormat =
    typeof props.props.valueFormat === 'string' && props.props.valueFormat
      ? props.props.valueFormat
      : defaultFormatForRangeKind(rangeKind);
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
  const options: DateOptions = { utc };

  const { value, handlers, presentation } = useFormFieldController(name, {
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });

  const storedValue = typeof value === 'string' ? value : undefined;
  const errorId = name ? `${name}-error` : undefined;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);

  const rawRange = parseDateRange(storedValue, delimiter, valueFormat, options);
  // Calendar operates on local wall-clock Dates; bridge UTC storage so the
  // selected/displayed day is correct in any host timezone.
  const parsed = {
    start: toCalendarDate(rawRange.start, utc),
    end: toCalendarDate(rawRange.end, utc),
  };
  // Normalize on read so a reversed stored value always presents well-ordered
  // (mirrors the write-time normalization in commitRange).
  const reversed = Boolean(parsed.start && parsed.end && compareDates(parsed.start, parsed.end) > 0);
  const startDate = reversed ? parsed.end : parsed.start;
  const endDate = reversed ? parsed.start : parsed.end;

  const minDate = toCalendarDate(
    parseDate(
      typeof props.props.minDate === 'string' ? props.props.minDate : undefined,
      valueFormat,
      options,
    ),
    utc,
  );
  const maxDate = toCalendarDate(
    parseDate(
      typeof props.props.maxDate === 'string' ? props.props.maxDate : undefined,
      valueFormat,
      options,
    ),
    utc,
  );
  const disabledMatchers = buildDisabledMatchers(minDate, maxDate);

  const shortcuts: RangeShortcut[] = Array.isArray(props.props.shortcuts)
    ? (props.props.shortcuts as RangeShortcut[]).filter(
        (s) => s && typeof s.label === 'string' && typeof s.start === 'string' && typeof s.end === 'string',
      )
    : [];

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'date-range',
    cid: props.meta.cid,
    methods: DATE_RANGE_METHODS,
    getFocusTarget: () => triggerRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
  });

  const startDisplay = formatDate(startDate, displayFormat);
  const endDisplay = formatDate(endDate, displayFormat);
  const hasValue = Boolean(startDate || endDate);
  const displayText =
    startDisplay || endDisplay
      ? joinDateRange(startDisplay ?? '', endDisplay ?? '', ` ${delimiter} `)
      : '';

  function commitRange(nextStart: Date | undefined, nextEnd: Date | undefined) {
    // Enforce minDate/maxDate on every write path (time inputs, native time
    // change, calendar select) so a value cannot be committed outside bounds —
    // consistent with the single-field date control.
    const clampedStart = clampDateToRange(nextStart, minDate, maxDate);
    const clampedEnd = clampDateToRange(nextEnd, minDate, maxDate);
    const startStr = formatDate(toStorageDate(clampedStart, utc), valueFormat, options);
    const endStr = formatDate(toStorageDate(clampedEnd, utc), valueFormat, options);
    // Normalize order so start <= end whenever both are present.
    const normalized = normalizeRange(startStr, endStr, valueFormat, options);
    if (!normalized.start && !normalized.end) {
      handlers.onChange(undefined);
      return;
    }
    handlers.onChange(joinDateRange(normalized.start, normalized.end, delimiter));
  }

  function handleCalendarSelect(range: { from?: Date; to?: Date } | undefined) {
    const from = range?.from;
    const to = range?.to;
    commitRange(from, to);
  }

  function setTimeOn(part: 'start' | 'end', component: 'hour' | 'minute', raw: string) {
    if (raw === '') return;
    const numeric = clamp(Number(raw), 0, component === 'hour' ? 23 : 59);
    const target = part === 'start' ? startDate : endDate;
    const base = target ? new Date(target) : new Date();
    base.setHours(
      component === 'hour' ? numeric : base.getHours(),
      component === 'minute' ? numeric : base.getMinutes(),
      0,
      0,
    );
    if (part === 'start') {
      commitRange(base, endDate);
    } else {
      commitRange(startDate, base);
    }
  }

  function handleNativeTimeChange(part: 'start' | 'end', event: ChangeEvent<HTMLInputElement>) {
    const native = event.target.value;
    if (native === '') return;
    const next = convertValueFormat(native, DEFAULT_TIME_FORMAT, valueFormat, options);
    const parsedDate = parseDate(next ?? native, valueFormat, options);
    if (!parsedDate) return;
    if (part === 'start') {
      commitRange(parsedDate, endDate);
    } else {
      commitRange(startDate, parsedDate);
    }
  }

  function applyShortcut(shortcut: RangeShortcut) {
    const normalized = normalizeRange(shortcut.start, shortcut.end, valueFormat, options);
    handlers.onChange(joinDateRange(normalized.start, normalized.end, delimiter));
  }

  function handleClear() {
    handlers.onChange(undefined);
    setOpen(false);
  }

  function timeComponent(part: 'start' | 'end', component: 'hour' | 'minute') {
    const target = part === 'start' ? startDate : endDate;
    const value = target
      ? component === 'hour'
        ? target.getHours()
        : target.getMinutes()
      : 0;
    return String(value);
  }

  function nativeTimeValue(part: 'start' | 'end') {
    const target = part === 'start' ? startDate : endDate;
    // Targets are calendar-local; format the wall-clock value directly.
    return formatDate(target, DEFAULT_TIME_FORMAT) ?? '';
  }

  return (
    <div className={cn('nop-date-range', 'relative flex items-center', props.meta.className)} data-slot="field-control">
      <Popover open={open && presentation.interactive} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              ref={(node: HTMLButtonElement | null) => {
                triggerRef.current = node;
              }}
              type="button"
              variant="outline"
              disabled={!presentation.interactive}
              aria-label={String((props.props.label ?? name) || '') || undefined}
              aria-invalid={presentation.showError ? true : undefined}
              aria-describedby={presentation.showError ? errorId : undefined}
              aria-errormessage={presentation.showError ? errorId : undefined}
              data-testid="range-trigger"
              className="w-full justify-start text-left font-normal"
            />
          }
        >
          <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
          {hasValue ? (
            <span data-testid="range-display">{displayText}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder ?? 'Select range'}</span>
          )}
        </PopoverTrigger>
        <PopoverContent
          data-testid="range-popover"
          align="start"
          side="bottom"
          sideOffset={4}
          className="w-auto p-2"
          onFocus={handlers.onFocus}
          onBlur={handlers.onBlur}
        >
          {rangeKind === 'date' || rangeKind === 'datetime' ? (
            <Calendar
              mode="range"
              selected={
                startDate || endDate
                  ? { from: startDate, to: endDate }
                  : undefined
              }
              defaultMonth={startDate ?? new Date()}
              onSelect={(range) =>
                handleCalendarSelect(
                  range
                    ? { from: range.from, to: range.to }
                    : undefined,
                )
              }
              disabled={disabledMatchers}
              numberOfMonths={1}
            />
          ) : null}

          {rangeKind === 'datetime' ? (
            <div className="flex flex-col gap-2 px-1 pt-2">
              <RangeTimeRow
                label="Start time"
                hour={timeComponent('start', 'hour')}
                minute={timeComponent('start', 'minute')}
                disabled={!presentation.interactive}
                onChange={(component, raw) => setTimeOn('start', component, raw)}
              />
              <RangeTimeRow
                label="End time"
                hour={timeComponent('end', 'hour')}
                minute={timeComponent('end', 'minute')}
                disabled={!presentation.interactive}
                onChange={(component, raw) => setTimeOn('end', component, raw)}
              />
            </div>
          ) : null}

          {rangeKind === 'time' ? (
            <div className="flex flex-col gap-2 p-1">
              <Input
                type="time"
                value={nativeTimeValue('start')}
                disabled={!presentation.interactive}
                aria-label="Range start time"
                onChange={(event) => handleNativeTimeChange('start', event)}
                className="h-8"
              />
              <Input
                type="time"
                value={nativeTimeValue('end')}
                disabled={!presentation.interactive}
                aria-label="Range end time"
                onChange={(event) => handleNativeTimeChange('end', event)}
                className="h-8"
              />
            </div>
          ) : null}

          {shortcuts.length > 0 ? (
            <div className="flex flex-wrap gap-1 px-1 pt-2" data-testid="range-shortcuts">
              {shortcuts.map((shortcut) => (
                <Button
                  key={shortcut.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyShortcut(shortcut)}
                >
                  {shortcut.label}
                </Button>
              ))}
            </div>
          ) : null}

          {clearable && hasValue ? (
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Clear"
                onClick={handleClear}
                data-testid="range-clear"
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {clearable && hasValue && presentation.interactive ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="Clear"
          className="pointer-events-auto absolute right-1"
          onClick={handleClear}
          data-testid="range-clear-inline"
        >
          <XIcon className="pointer-events-none" />
        </Button>
      ) : null}
      {/* Hidden semantic attribute exposing the resolved kind for assertions. */}
      <span data-range-kind={rangeKind} aria-hidden="true" className="sr-only" />
    </div>
  );
}

interface RangeTimeRowProps {
  label: string;
  hour: string;
  minute: string;
  disabled: boolean;
  onChange: (component: 'hour' | 'minute', raw: string) => void;
}

function RangeTimeRow(props: RangeTimeRowProps) {
  const { label, hour, minute, disabled, onChange } = props;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="w-16">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={23}
        value={hour}
        aria-label={`${label} hour`}
        disabled={disabled}
        onChange={(event) => onChange('hour', event.target.value)}
        className="h-8 w-16"
      />
      <span aria-hidden="true">:</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        value={minute}
        aria-label={`${label} minute`}
        disabled={disabled}
        onChange={(event) => onChange('minute', event.target.value)}
        className="h-8 w-16"
      />
    </div>
  );
}

// Re-export for symmetry; keeps the contract ordering comparison available.
export { compareDates };
