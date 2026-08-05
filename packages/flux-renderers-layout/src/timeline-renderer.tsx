import React, { startTransition, useEffect, useRef, useState } from 'react';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { cn, resolveLucideIcon } from '@nop-chaos/ui';
import type {
  TimelineItemLevel,
  TimelineItemSchema,
  TimelineMode,
  TimelineSchema,
} from './schemas.js';

const UNUSED: unique symbol = Symbol('unused');

function warnScopeDegraded() {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(
      '[nop-timeline] valueOwnership=scope requires valueStatePath; falling back to local controlled.',
    );
  }
}

const LEVEL_DOT_CLASS: Record<TimelineItemLevel, string> = {
  default: 'bg-muted-foreground',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  info: 'bg-info',
};

function normalizeItems(value: unknown): TimelineItemSchema[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is TimelineItemSchema => {
    return item !== null && typeof item === 'object';
  });
}

function resolveLevel(level: unknown): TimelineItemLevel {
  if (
    level === 'default' ||
    level === 'primary' ||
    level === 'success' ||
    level === 'warning' ||
    level === 'error' ||
    level === 'info'
  ) {
    return level;
  }
  return 'primary';
}

function resolveMode(mode: unknown): TimelineMode {
  if (mode === 'right' || mode === 'alternate') return mode;
  return 'left';
}

function timelineItemKey(item: TimelineItemSchema, index: number): string {
  const time = typeof item.time === 'string' && item.time.length > 0 ? item.time : null;
  return time ? `timeline:${time}:${index}` : `timeline:${index}`;
}

function clampIndex(idx: number, count: number): number {
  if (count <= 0) return 0;
  if (idx < 0) return 0;
  if (idx > count - 1) return count - 1;
  return idx;
}

function asNumericIndex(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Resolve the current event index. Key match (`item.value`) takes precedence; a
 * numeric value is treated as a (clamped) index; an unmatched value returns -1
 * so the caller can fall back to defaultValue or render no active state.
 * Semantics mirror `resolveStepIndex` in steps-renderer.tsx (isomorphic, local
 * implementation — promote to a flux-core shared helper when a third sibling
 * consumer appears).
 */
function resolveEventIndex(value: unknown, items: TimelineItemSchema[]): number {
  if (items.length === 0) return -1;
  const target = String(value);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = item.value;
    if (key !== undefined && key !== null && String(key) === target) return i;
  }
  const numeric = asNumericIndex(value);
  if (numeric !== undefined) return clampIndex(numeric, items.length);
  return -1;
}

function useTimelineValue(props: RendererComponentProps<TimelineSchema>) {
  const schemaProps = props.props;
  const declaredOwnership = (schemaProps.valueOwnership as string) ?? 'local';
  const statePath =
    typeof schemaProps.valueStatePath === 'string' ? schemaProps.valueStatePath : undefined;

  // Effective ownership: scope without valueStatePath degrades to local controlled (+ dev warn).
  const scopeDegraded = declaredOwnership === 'scope' && !statePath;
  const ownership = scopeDegraded ? 'local' : (declaredOwnership as 'local' | 'controlled' | 'scope');

  const warnedRef = useRef(false);
  useEffect(() => {
    if (scopeDegraded && !warnedRef.current) {
      warnScopeDegraded();
      warnedRef.current = true;
    }
  }, [scopeDegraded]);

  const renderScope = useRenderScope();

  const scopeValue = useScopeSelector(
    ownership === 'scope' && statePath
      ? (scopeData) => getIn(scopeData, statePath) as unknown
      : () => UNUSED as unknown,
    Object.is,
    {
      enabled: ownership === 'scope' && Boolean(statePath),
      fallback: undefined,
      paths: ownership === 'scope' && statePath ? [statePath] : undefined,
    },
  );
  const effectiveScopeValue = scopeValue === (UNUSED as unknown) ? undefined : scopeValue;

  const computeInitial = (): string | number | undefined => {
    if (ownership === 'controlled') return schemaProps.value as string | number | undefined;
    if (ownership === 'scope') {
      return (
        (effectiveScopeValue as string | number | undefined) ??
        schemaProps.value ??
        schemaProps.defaultValue
      );
    }
    return (
      (schemaProps.value as string | number | undefined) ??
      (schemaProps.defaultValue as string | number | undefined)
    );
  };

  const [localValue, setLocalValue] = useState<string | number | undefined>(computeInitial);

  const currentValue =
    ownership === 'controlled'
      ? schemaProps.value
      : ownership === 'scope'
        ? effectiveScopeValue ?? schemaProps.value ?? localValue
        : localValue;

  const setValue = (next: string | number | undefined) => {
    if (ownership === 'local') {
      setLocalValue(next);
    } else if (ownership === 'scope' && statePath) {
      startTransition(() => {
        renderScope.update(statePath, next ?? null);
      });
      setLocalValue(next);
    }
    // controlled: clicks dispatch onChange but do NOT mutate (parent must update value).
  };

  return { ownership, currentValue, setValue };
}

export function TimelineRenderer(props: RendererComponentProps<TimelineSchema>) {
  const schemaProps = props.props;
  const items = normalizeItems(schemaProps.items);
  const mode = resolveMode(schemaProps.mode);
  const orientation = schemaProps.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  const reverse = schemaProps.reverse === true;
  const clickable = typeof props.events.onChange === 'function';
  const { ownership, currentValue, setValue } = useTimelineValue(props);

  // Render-layer adjudication (v2): current value -> key/index match; unmatched
  // falls back to defaultValue; still unmatched -> NO active state (explicitly
  // does NOT fall back to the first item, unlike steps' ->0 fallback chain).
  let activeIndex = resolveEventIndex(currentValue, items);
  if (activeIndex < 0) {
    activeIndex = resolveEventIndex(schemaProps.defaultValue, items);
  }

  const ordered = reverse ? [...items].reverse() : items;
  const rootDisabled = props.meta.disabled === true;

  if (ordered.length === 0) {
    return (
      <div
        className={cn('nop-timeline', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="timeline-root"
        data-orientation={orientation}
        data-mode={mode}
        data-ownership={ownership}
        data-empty="true"
      >
        <div data-slot="timeline-empty" className="py-4 text-sm text-muted-foreground">
          {t('flux.common.noData')}
        </div>
      </div>
    );
  }

  const sideFor = (index: number): 'left' | 'right' => {
    if (mode === 'left') return 'right';
    if (mode === 'right') return 'left';
    return index % 2 === 0 ? 'right' : 'left';
  };

  const handleSeek = (item: TimelineItemSchema, index: number) => {
    if (rootDisabled || !clickable) return;
    const eventValue = item.value ?? index;
    setValue(eventValue as string | number);
    const payload = {
      type: 'timeline:change',
      value: eventValue,
      index,
      item,
    };
    void props.events.onChange?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
  };

  return (
    <ol
      className={cn('nop-timeline', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="timeline-root"
      data-orientation={orientation}
      data-mode={mode}
      data-reverse={reverse || undefined}
      data-ownership={ownership}
      data-active-index={activeIndex >= 0 ? activeIndex : undefined}
    >
      {ordered.map((item, index) => {
        const logicalIndex = reverse ? items.length - 1 - index : index;
        const level = resolveLevel(item.level);
        const side = sideFor(logicalIndex);
        const isActive = logicalIndex === activeIndex;
        const IconComp = resolveLucideIcon(item.icon) as
          | React.ComponentType<Record<string, unknown>>
          | null;

        // Missing-field degradation: render only the fields that exist; never crash.
        const hasTime = typeof item.time === 'string' && item.time.length > 0;
        const hasTitle = typeof item.title === 'string' && item.title.length > 0;
        const hasDetail = typeof item.detail === 'string' && item.detail.length > 0;

        return (
          <li
            key={timelineItemKey(item, index)}
            data-slot="timeline-item"
            data-item-index={logicalIndex}
            data-level={level}
            data-side={side}
            data-state={isActive ? 'active' : undefined}
            data-clickable={clickable || undefined}
            tabIndex={clickable ? 0 : undefined}
            role={clickable ? 'button' : undefined}
            aria-current={isActive ? 'time' : undefined}
            onClick={clickable ? () => handleSeek(item, logicalIndex) : undefined}
            onKeyDown={
              clickable
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSeek(item, logicalIndex);
                    }
                  }
                : undefined
            }
            className={cn(
              'relative flex',
              orientation === 'vertical'
                ? 'w-full'
                : 'flex-col items-center',
              clickable && 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
          >
            {orientation === 'vertical' && (
              <span
                aria-hidden="true"
                data-slot="timeline-axis"
                className={cn(
                  'absolute top-0 bottom-0 w-px bg-border',
                  mode === 'left' ? 'left-3' : mode === 'right' ? 'right-3' : 'left-1/2',
                )}
              />
            )}
            {orientation === 'horizontal' && index > 0 && (
              <span
                aria-hidden="true"
                data-slot="timeline-axis"
                className="h-px self-center bg-border"
              />
            )}

            <span
              data-slot="timeline-dot"
              data-level={level}
              className={cn(
                'relative z-10 flex size-3 shrink-0 items-center justify-center rounded-full',
                LEVEL_DOT_CLASS[level],
                isActive && 'outline-2 outline-offset-2 outline-ring',
                orientation === 'vertical'
                  ? mode === 'left'
                    ? 'ml-[7px] mt-1'
                    : mode === 'right'
                      ? 'mr-[7px] mt-1'
                      : 'mt-1'
                  : 'mb-1',
              )}
            >
              {IconComp ? (
                <IconComp className="size-3 text-white" strokeWidth={2} aria-hidden="true" />
              ) : null}
            </span>

            <div
              data-slot="timeline-content"
              className={cn(
                'min-w-0 flex-1',
                orientation === 'vertical'
                  ? mode === 'alternate'
                    ? 'w-1/2 py-1'
                    : 'py-1'
                  : 'text-center',
                orientation === 'vertical' && mode === 'left' && 'pl-4',
                orientation === 'vertical' && mode === 'right' && 'pr-4 text-right',
                orientation === 'vertical' &&
                  mode === 'alternate' &&
                  (side === 'right' ? 'pl-4' : 'pr-4 text-right order-first'),
              )}
            >
              {hasTime ? (
                <span
                  data-slot="timeline-time"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  {item.time}
                </span>
              ) : null}
              {hasTitle ? (
                <span
                  data-slot="timeline-title"
                  className={cn(
                    'block text-sm font-semibold leading-tight',
                    isActive && 'text-foreground',
                  )}
                >
                  {item.title}
                </span>
              ) : null}
              {hasDetail ? (
                <span
                  data-slot="timeline-detail"
                  className="mt-0.5 block text-xs text-muted-foreground"
                >
                  {item.detail}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
