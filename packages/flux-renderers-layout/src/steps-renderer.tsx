import React, { useEffect, useRef, startTransition, useState } from 'react';
import { resolveFinalIndex } from './step-index.js';
import { getIn, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { CheckIcon, XIcon } from 'lucide-react';
import { Button, cn } from '@nop-chaos/ui';
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

const stepsItemKey = (item: StepsItemSchema) => item.value ?? item.key;

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
    return (schemaProps.value as string | number | undefined) ?? (schemaProps.defaultValue as string | number | undefined);
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

  const currentIndex = resolveFinalIndex(currentValue, schemaProps.defaultValue, rawItems, stepsItemKey);
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
      className={cn('nop-steps', props.meta.className)}
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
              // [G1-R2-视角8-01] `relative` makes the li the containing block for
              // the absolutely-positioned horizontal connector — without it the
              // line resolves against the nearest positioned ancestor.
              'relative flex',
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
            <Button
              variant="ghost"
              data-slot="steps-indicator"
              data-status={status}
              disabled={disabled}
              aria-current={isCurrent ? 'step' : undefined}
              // 20-04 (WCAG 4.1.2): finish/error indicators contain only a lucide
              // icon (auto aria-hidden), so the focusable button must carry its
              // accessible name explicitly, tied to the step title.
              aria-label={`${t('flux.steps.step')} ${index + 1}: ${item.title ?? item.value ?? item.key ?? index + 1}`}
              onClick={() => handleClick(item, index)}
              className={cn(
                // [G1-R4-视角8-02] one interactive stop per step: the indicator
                // button owns the whole step row (circle + title/description) so
                // the click hot zone is not limited to the 28px indicator.
                // Keyboard focus lands here, exactly once per step.
                'nop-steps-indicator relative z-10 h-auto shrink whitespace-normal rounded-md py-0',
                orientation === 'vertical'
                  ? 'flex flex-row items-start gap-3 px-0 text-left'
                  : 'flex flex-col items-center gap-1 px-1 text-center',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span
                data-slot="steps-indicator-circle"
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                  STATUS_INDICATOR_CLASS[status],
                )}
              >
                {status === 'finish' ? (
                  <CheckIcon className="size-4" />
                ) : status === 'error' ? (
                  <XIcon className="size-4" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn('flex min-w-0 flex-col', orientation === 'vertical' && 'pt-1')}
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
              </span>
            </Button>
          </li>
        );
      })}
    </ol>
  );
}
