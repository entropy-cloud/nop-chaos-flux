import React, { useEffect, useRef, startTransition, useState } from 'react';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { CheckIcon, XIcon } from 'lucide-react';
import { cn } from '@nop-chaos/ui';
import type { StepsItemSchema, StepsItemStatus, StepsSchema } from './schemas.js';

const UNUSED: unique symbol = Symbol('unused');

function warnScopeDegraded() {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(
      '[nop-steps] valueOwnership=scope requires valueStatePath; falling back to local controlled.',
    );
  }
}

function isItemDisabled(item: StepsItemSchema): boolean {
  return item.disabled === true;
}

function clampIndex(idx: number, count: number): number {
  if (count <= 0) return 0;
  if (idx < 0) return 0;
  if (idx > count - 1) return count - 1;
  return idx;
}

function matchKeyIndex(value: unknown, items: StepsItemSchema[]): number {
  if (value === undefined || value === null) return -1;
  const target = String(value);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = item.value ?? item.key;
    if (key !== undefined && key !== null && String(key) === target) return i;
  }
  return -1;
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
 * Resolve the current step index. Key match takes precedence; a numeric value is
 * treated as a (clamped) index; an unmatched non-numeric value returns -1 so the
 * caller can fall back to defaultValue or the first step.
 */
function resolveStepIndex(value: unknown, items: StepsItemSchema[]): number {
  if (items.length === 0) return -1;
  const keyIdx = matchKeyIndex(value, items);
  if (keyIdx >= 0) return keyIdx;
  const numeric = asNumericIndex(value);
  if (numeric !== undefined) return clampIndex(numeric, items.length);
  return -1;
}

function resolveFinalIndex(
  current: unknown,
  fallback: unknown,
  items: StepsItemSchema[],
): number {
  let idx = resolveStepIndex(current, items);
  if (idx < 0) idx = resolveStepIndex(fallback, items);
  if (idx < 0) idx = 0;
  return idx;
}

function deriveStatus(
  item: StepsItemSchema,
  index: number,
  currentIndex: number,
): StepsItemStatus {
  if (item.status === 'wait' || item.status === 'process' || item.status === 'finish' || item.status === 'error') {
    return item.status;
  }
  if (index < currentIndex) return 'finish';
  if (index === currentIndex) return 'process';
  return 'wait';
}

function useStepsValue(props: RendererComponentProps<StepsSchema>) {
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
      return (effectiveScopeValue as string | number | undefined) ?? schemaProps.value ?? schemaProps.defaultValue;
    }
    return (schemaProps.defaultValue as string | number | undefined) ?? schemaProps.value;
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

const STATUS_INDICATOR_CLASS: Record<StepsItemStatus, string> = {
  wait: 'border-border bg-background text-muted-foreground',
  process: 'border-primary bg-primary text-primary-foreground',
  finish: 'border-primary bg-primary text-primary-foreground',
  error: 'border-destructive bg-destructive text-destructive-foreground',
};

export function StepsRenderer(props: RendererComponentProps<StepsSchema>) {
  const schemaProps = props.props;
  const rawItems = Array.isArray(schemaProps.items)
    ? (schemaProps.items as unknown as StepsItemSchema[])
    : [];
  const orientation = schemaProps.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const { ownership, currentValue, setValue } = useStepsValue(props);

  const currentIndex = resolveFinalIndex(currentValue, schemaProps.defaultValue, rawItems);
  const rootDisabled = props.meta.disabled === true;

  if (rawItems.length === 0) {
    return (
      <div
        className={cn('nop-steps', props.meta.className)}
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="steps-root"
        data-orientation={orientation}
        data-empty="true"
        data-ownership={ownership}
      >
        <div data-slot="steps-empty" className="py-4 text-sm text-muted-foreground">
          {t('flux.common.noData')}
        </div>
      </div>
    );
  }

  const handleClick = (item: StepsItemSchema, index: number) => {
    if (rootDisabled || isItemDisabled(item)) return;
    const stepValue = item.value ?? item.key ?? index;
    setValue(stepValue as string | number);
    const payload = {
      type: 'steps:change',
      value: stepValue,
      stepIndex: index,
      stepKey: stepValue,
    };
    void props.events.onChange?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
  };

  return (
    <ol
      className={cn(
        'nop-steps',
        orientation === 'vertical' ? 'flex flex-col' : 'flex flex-row items-start',
        props.meta.className,
      )}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="steps-root"
      data-orientation={orientation}
      data-ownership={ownership}
      data-current-index={currentIndex}
    >
      {rawItems.map((item, index) => {
        const status = deriveStatus(item, index, currentIndex);
        const disabled = rootDisabled || isItemDisabled(item);
        const isCurrent = index === currentIndex;

        return (
          <li
            key={item.value ?? item.key ?? index}
            data-slot="steps-item"
            data-item-index={index}
            data-item-key={String(item.value ?? item.key ?? index)}
            data-status={status}
            data-current={isCurrent || undefined}
            data-disabled={disabled || undefined}
            className={cn(
              'flex',
              orientation === 'vertical'
                ? 'flex-row gap-3 pb-6 last:pb-0'
                : 'flex-1 flex-col items-center text-center',
            )}
          >
            {orientation === 'horizontal' && index > 0 && (
              <span
                aria-hidden="true"
                data-slot="steps-connector"
                className={cn(
                  'absolute top-3 h-px w-full',
                  status === 'finish' ? 'bg-primary' : 'bg-border',
                )}
                style={
                  orientation === 'horizontal'
                    ? { transform: 'translateX(-50%)', width: '100%', left: '50%' }
                    : undefined
                }
              />
            )}
            {orientation === 'vertical' && index > 0 && (
              <span
                aria-hidden="true"
                data-slot="steps-connector"
                className={cn(
                  'ml-[15px] w-px self-stretch',
                  status === 'finish' ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            <button
              type="button"
              data-slot="steps-indicator"
              data-status={status}
              disabled={disabled}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => handleClick(item, index)}
              className={cn(
                'nop-steps-indicator relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                STATUS_INDICATOR_CLASS[status],
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              {status === 'finish' ? (
                <CheckIcon className="size-4" />
              ) : status === 'error' ? (
                <XIcon className="size-4" />
              ) : (
                index + 1
              )}
            </button>
            <div
              className={cn(
                'min-w-0',
                orientation === 'vertical' ? 'flex flex-col pt-1' : 'flex flex-col',
              )}
            >
              <span
                data-slot="steps-title"
                className={cn(
                  'text-sm font-medium leading-tight',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {item.title ?? item.value ?? item.key ?? index + 1}
              </span>
              {item.description ? (
                <span
                  data-slot="steps-description"
                  className="mt-0.5 text-xs text-muted-foreground"
                >
                  {item.description}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
