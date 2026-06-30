import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { cn, resolveLucideIcon } from '@nop-chaos/ui';
import type {
  TimelineItemLevel,
  TimelineItemSchema,
  TimelineMode,
  TimelineSchema,
} from './schemas.js';

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

export function TimelineRenderer(props: RendererComponentProps<TimelineSchema>) {
  const schemaProps = props.props;
  const items = normalizeItems(schemaProps.items);
  const mode = resolveMode(schemaProps.mode);
  const orientation = schemaProps.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  const reverse = schemaProps.reverse === true;

  const ordered = reverse ? [...items].reverse() : items;

  if (ordered.length === 0) {
    return (
      <div
        className={cn('nop-timeline', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="timeline-root"
        data-orientation={orientation}
        data-mode={mode}
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

  return (
    <ol
      className={cn(
        'nop-timeline',
        orientation === 'horizontal'
          ? 'flex flex-row items-stretch gap-4 overflow-x-auto'
          : 'flex flex-col',
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="timeline-root"
      data-orientation={orientation}
      data-mode={mode}
      data-reverse={reverse || undefined}
    >
      {ordered.map((item, index) => {
        const level = resolveLevel(item.level);
        const side = sideFor(index);
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
            data-item-index={index}
            data-level={level}
            data-side={side}
            className={cn(
              'relative flex',
              orientation === 'vertical'
                ? mode === 'alternate'
                  ? 'w-full'
                  : 'w-full'
                : 'flex-col items-center',
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
                  className="block text-sm font-semibold leading-tight"
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
