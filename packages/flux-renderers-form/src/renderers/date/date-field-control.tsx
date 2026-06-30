import { useRef, useState } from 'react';
import { CalendarIcon, XIcon } from 'lucide-react';
import { Button, Calendar, Input, Popover, PopoverContent, PopoverTrigger, cn } from '@nop-chaos/ui';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import {
  DEFAULT_DATETIME_FORMAT,
  type DateOptions,
  formatDate,
  isWithinRange,
  parseDate,
  toCalendarDate,
  toStorageDate,
} from './date-utils.js';

/** Structurally compatible with react-day-picker's DateBefore / DateAfter matchers. */
type RangeMatcher = { before: Date } | { after: Date };

const DATE_FIELD_METHODS = ['clear', 'focus'] as const;

export interface DateFieldControlProps {
  id: string;
  cid?: number;
  fieldType: string;
  name: string;
  storedValue: string | undefined;
  valueFormat: string;
  displayFormat: string;
  utc: boolean;
  withTime: boolean;
  minDate: Date | undefined;
  maxDate: Date | undefined;
  clearable: boolean;
  interactive: boolean;
  visible: boolean;
  showError: boolean;
  errorId: string | undefined;
  placeholder: string | undefined;
  ariaLabel: string | undefined;
  onChange: (stored: string | undefined) => void;
  onBlur: () => void;
  onFocus: () => void;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function buildDisabledMatchers(
  minDate: Date | undefined,
  maxDate: Date | undefined,
): RangeMatcher[] | undefined {
  const matchers: RangeMatcher[] = [];
  if (minDate) matchers.push({ before: minDate });
  if (maxDate) matchers.push({ after: maxDate });
  return matchers.length > 0 ? matchers : undefined;
}

/**
 * Shared single-value date (and optional time) picker used by input-date and
 * input-datetime. Owns popover open-state + transient time inputs; converts the
 * stored string (valueFormat) to/from a `Date` via the shared date底层 and emits
 * the canonicalized stored string on every change.
 */
export function DateFieldControl(props: DateFieldControlProps) {
  const {
    id,
    cid,
    fieldType,
    name,
    storedValue,
    valueFormat,
    displayFormat,
    utc,
    withTime,
    minDate,
    maxDate,
    clearable,
    interactive,
    visible,
    showError,
    errorId,
    placeholder,
    ariaLabel,
    onChange,
    onBlur,
    onFocus,
  } = props;

  const options: DateOptions = { utc };
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  // The calendar always operates on local wall-clock Dates. `toCalendarDate`
  // undoes the UTC storage offset so display/selection stay on the right
  // calendar day in any host timezone.
  const selected = toCalendarDate(parseDate(storedValue, valueFormat, options), utc);
  const displayText = formatDate(selected, displayFormat) ?? '';
  const disabledMatchers = buildDisabledMatchers(minDate, maxDate);

  const hour = selected ? selected.getHours() : 0;
  const minute = selected ? selected.getMinutes() : 0;

  useInputComponentHandle({
    id,
    name,
    type: fieldType,
    cid,
    methods: DATE_FIELD_METHODS,
    getFocusTarget: () => triggerRef.current,
    isInteractive: () => interactive,
    isVisible: () => visible,
    clearValue: () => onChange(undefined),
  });

  function commitDate(next: Date | undefined) {
    if (!next) {
      onChange(undefined);
      return;
    }
    // Serialize the local wall-clock selection, bridging to UTC storage when utc.
    onChange(formatDate(toStorageDate(next, utc), valueFormat, options));
  }

  function handleSelect(day: Date | undefined) {
    if (!day) {
      commitDate(undefined);
      return;
    }
    // Preserve existing time when picking a date for datetime fields.
    const base = new Date(day);
    if (withTime && selected) {
      base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    commitDate(base);
    if (!withTime) {
      setOpen(false);
    }
  }

  function handleTimeChange(part: 'hour' | 'minute', raw: string) {
    if (raw === '') return;
    const numeric = clamp(Number(raw), 0, part === 'hour' ? 23 : 59);
    const base = selected ? new Date(selected) : new Date();
    base.setHours(
      part === 'hour' ? numeric : base.getHours(),
      part === 'minute' ? numeric : base.getMinutes(),
      0,
      0,
    );
    // Time-typing must not bypass minDate/maxDate. Clamp the resulting datetime
    // into [minDate, maxDate] (calendar path already constrains via disabled
    // matchers). Bounds are calendar-local, same frame as `selected`/`base`.
    commitDate(clampToRange(base));
  }

  function clampToRange(date: Date): Date {
    if (isWithinRange(date, minDate, maxDate)) {
      return date;
    }
    if (minDate && date.getTime() < minDate.getTime()) {
      return new Date(minDate);
    }
    if (maxDate && date.getTime() > maxDate.getTime()) {
      return new Date(maxDate);
    }
    return date;
  }

  function handleClear() {
    onChange(undefined);
    setOpen(false);
  }

  const hasValue = Boolean(displayText);

  return (
    <div
      className={cn('nop-date-control', 'relative flex items-center')}
      data-slot="field-control"
      data-has-value={hasValue ? '' : undefined}
      data-invalid={showError ? '' : undefined}
    >
      <Popover open={open && interactive} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              ref={(node: HTMLButtonElement | null) => {
                triggerRef.current = node;
              }}
              type="button"
              variant="outline"
              disabled={!interactive}
              aria-label={ariaLabel}
              aria-invalid={showError ? true : undefined}
              aria-describedby={showError ? errorId : undefined}
              aria-errormessage={showError ? errorId : undefined}
              data-testid="date-trigger"
              className="w-full justify-start text-left font-normal"
            />
          }
        >
          <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
          {hasValue ? (
            <span data-testid="date-display">{displayText}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder ?? ariaLabel}</span>
          )}
        </PopoverTrigger>
        <PopoverContent
          data-testid="date-popover"
          align="start"
          side="bottom"
          sideOffset={4}
          className="w-auto p-2"
          onFocus={onFocus}
          onBlur={onBlur}
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? new Date()}
            onSelect={(day) => handleSelect(day ?? undefined)}
            disabled={disabledMatchers}
            captionLayout="dropdown"
          />
          {withTime ? (
            <div className="flex items-center gap-2 px-1 pt-2">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={23}
                value={String(hour)}
                aria-label="Hour"
                disabled={!interactive}
                onChange={(event) => handleTimeChange('hour', event.target.value)}
                className="h-8 w-16"
              />
              <span className="text-muted-foreground" aria-hidden="true">:</span>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                value={String(minute)}
                aria-label="Minute"
                disabled={!interactive}
                onChange={(event) => handleTimeChange('minute', event.target.value)}
                className="h-8 w-16"
              />
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
                data-testid="date-clear"
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {clearable && hasValue && interactive ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label="Clear"
          className="pointer-events-auto absolute right-1"
          onClick={handleClear}
          data-testid="date-clear-inline"
        >
          <XIcon className="pointer-events-none" />
        </Button>
      ) : null}
    </div>
  );
}

export { DEFAULT_DATETIME_FORMAT };
