import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { Input } from './input.js';
import { Popover, PopoverContent, PopoverTrigger } from './popover.js';

export type ColorValueFormat = 'hex' | 'rgba';

interface ColorPickerProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string | undefined) => void;
  /** Commit format: `#rrggbb` (alpha dropped, default) or `rgba(r, g, b, a)`. */
  format?: ColorValueFormat;
  /** Preset swatches (hex/rgba strings) rendered above the free-form input. */
  presetColors?: string[];
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  /** Accessible name for the trigger button (defaults to placeholder). */
  ariaLabel?: string;
  className?: string;
}

const DEFAULT_PRESET_COLORS = [
  '#0f172a',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0d9488',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#78716c',
];

/** Commit-format normalization. Invalid input returns `null` (no commit). */
export function normalizeColorValue(raw: string, format: ColorValueFormat): string | null {
  const text = raw.trim().toLowerCase();

  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text);
  const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+)\s*)?\)$/.exec(text);

  let r: number;
  let g: number;
  let b: number;
  let alpha: number | null = null;

  if (hexMatch) {
    const hex = hexMatch[1];
    const expanded = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    r = parseInt(expanded.slice(0, 2), 16);
    g = parseInt(expanded.slice(2, 4), 16);
    b = parseInt(expanded.slice(4, 6), 16);
  } else if (rgbMatch) {
    r = Math.min(255, Number(rgbMatch[1]));
    g = Math.min(255, Number(rgbMatch[2]));
    b = Math.min(255, Number(rgbMatch[3]));
    alpha = rgbMatch[4] === undefined ? null : Number(rgbMatch[4]);
  } else {
    return null;
  }

  if (format === 'rgba') {
    const a = alpha ?? 1;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  const channel = (n: number) => n.toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * shadcn-style color picker primitive (missing-components L1): swatch trigger
 * button opening a popover with preset swatches + a free-form hex/rgba input.
 * Values commit normalized per `format` (`#rrggbb` default, alpha dropped);
 * invalid input never commits.
 */
function ColorPicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  format = 'hex',
  presetColors,
  disabled = false,
  readOnly = false,
  placeholder,
  ariaLabel,
  className,
}: ColorPickerProps) {
  const [uncontrolled, setUncontrolled] = React.useState<string | undefined>(defaultValue);
  const [draft, setDraft] = React.useState<string | null>(null);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : uncontrolled;
  const swatches = presetColors ?? DEFAULT_PRESET_COLORS;

  const commit = (next: string | undefined) => {
    if (!isControlled) {
      setUncontrolled(next);
    }
    onValueChange?.(next);
  };

  const commitDraft = () => {
    if (draft === null) return;
    if (draft.trim() === '') {
      commit(undefined);
      setDraft(null);
      return;
    }
    const normalized = normalizeColorValue(draft, format);
    if (normalized !== null) {
      commit(normalized);
    }
    setDraft(null);
  };

  return (
    <div className={cn('inline-flex items-center', className)} data-slot="color-picker">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="w-full justify-between gap-2 font-normal"
              aria-label={ariaLabel ?? placeholder ?? 'color picker'}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  data-slot="color-picker-swatch"
                  className="size-4 shrink-0 rounded-sm border border-input"
                  style={{ backgroundColor: value ?? 'transparent' }}
                />
                <span className="truncate text-sm text-muted-foreground">
                  {value ?? placeholder ?? ''}
                </span>
              </span>
              <ChevronDown className="size-4 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex flex-col gap-2.5" data-slot="color-picker-panel">
            <div className="grid grid-cols-10 gap-1">
              {swatches.map((color) => (
                <button
                  key={color}
                  type="button"
                  data-slot="color-picker-preset"
                  data-color={color}
                  aria-label={color}
                  disabled={disabled || readOnly}
                  className={cn(
                    'size-4 rounded-sm border border-input transition-transform hover:scale-110',
                    value && normalizeColorValue(value, 'hex') === normalizeColorValue(color, 'hex')
                      ? 'ring-2 ring-ring'
                      : '',
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    if (readOnly) return;
                    const normalized = normalizeColorValue(color, format);
                    if (normalized !== null) commit(normalized);
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                value={draft ?? value ?? ''}
                disabled={disabled || readOnly}
                placeholder="#rrggbb 或 rgba(…)"
                className="h-7 font-mono text-xs"
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitDraft}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitDraft();
                  }
                }}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { ColorPicker };
