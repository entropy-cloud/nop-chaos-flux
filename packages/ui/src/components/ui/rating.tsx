import * as React from 'react';
import { Star } from 'lucide-react';

import { cn } from '../../lib/utils.js';

interface RatingProps {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number | undefined) => void;
  min?: number;
  max?: number;
  /** Star count (>= 1, default 5). */
  count?: number;
  /** Allow half-star steps (0.5 granularity). */
  allowHalf?: boolean;
  /** Clicking the current value again clears it (commits undefined). */
  allowClear?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
  className?: string;
}

/**
 * shadcn-style star rating primitive (missing-components L1): radiogroup of
 * count star buttons with roving tabindex, half-star granularity via
 * `allowHalf` (pointer side or Arrow keys with Shift for 0.5 steps), and a
 * hover preview. Fully controlled or uncontrolled via `defaultValue`.
 */
function Rating({
  value: valueProp,
  defaultValue,
  onValueChange,
  min = 0,
  max = 5,
  count = 5,
  allowHalf = false,
  allowClear = false,
  disabled = false,
  readOnly = false,
  name,
  className,
}: RatingProps) {
  const starCount = Math.max(1, Math.floor(count));
  const [uncontrolled, setUncontrolled] = React.useState<number | undefined>(defaultValue);
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : uncontrolled;

  const commit = (next: number | undefined) => {
    const clamped = next === undefined ? undefined : Math.min(Math.max(next, min), Math.min(max, starCount));
    if (!isControlled) {
      setUncontrolled(clamped);
    }
    onValueChange?.(clamped);
  };

  const displayed = hoverValue ?? value;

  const handleStarClick = (starIndex: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || readOnly) return;
    let next = starIndex + 1;
    if (allowHalf) {
      const rect = event.currentTarget.getBoundingClientRect();
      const half = event.clientX - rect.left < rect.width / 2;
      next = starIndex + (half ? 0.5 : 1);
    }
    if (allowClear && value !== undefined && next === value) {
      commit(undefined);
      return;
    }
    commit(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || readOnly) return;
    const delta = event.shiftKey && allowHalf ? 0.5 : 1;
    let handled = true;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      commit(Math.min((value ?? min) + delta, starCount));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      const next = (value ?? min) - delta;
      if (next <= min) {
        commit(min === 0 ? undefined : min);
      } else {
        commit(next);
      }
    } else if (event.key === 'Home') {
      commit(min === 0 ? undefined : min);
    } else if (event.key === 'End') {
      commit(starCount);
    } else {
      handled = false;
    }
    if (handled) event.preventDefault();
  };

  const fillLevel = (starIndex: number): 'full' | 'half' | 'empty' => {
    if (displayed === undefined || displayed === null) return 'empty';
    if (displayed >= starIndex + 1) return 'full';
    if (allowHalf && displayed >= starIndex + 0.5) return 'half';
    return 'empty';
  };

  return (
    <div
      role="radiogroup"
      aria-label={name ?? 'rating'}
      data-slot="rating"
      data-allow-half={allowHalf || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'inline-flex items-center gap-0.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm',
        disabled && 'pointer-events-none opacity-50',
        readOnly && 'pointer-events-none',
        className,
      )}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: starCount }, (_, index) => {
        const level = fillLevel(index);
        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={value !== undefined && value >= index + (allowHalf ? 0.5 : 1)}
            aria-label={`${index + 1} / ${starCount}`}
            tabIndex={-1}
            disabled={disabled || readOnly}
            data-slot="rating-star"
            data-level={level}
            className={cn(
              'relative rounded-sm p-0.5 transition-colors hover:bg-muted/60',
            )}
            onMouseEnter={() => setHoverValue(index + (allowHalf ? 0.5 : 1))}
            onClick={(event) => handleStarClick(index, event)}
          >
            {level === 'half' ? (
              <span className="relative block size-4">
                <Star className="absolute inset-0 size-4 text-muted-foreground/40" />
                <span className="absolute inset-0 overflow-hidden w-1/2">
                  <Star className="size-4 fill-primary text-primary" />
                </span>
              </span>
            ) : (
              <Star
                className={cn(
                  'size-4',
                  level === 'full' ? 'fill-primary text-primary' : 'text-muted-foreground/40',
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export { Rating };
