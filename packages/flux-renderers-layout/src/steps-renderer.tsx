import { resolveFinalIndex } from './step-index.js';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { CheckIcon, XIcon } from 'lucide-react';
import { Button, cn } from '@nop-chaos/ui';
import type { StepsItemSchema, StepsItemStatus, StepsSchema } from './schemas.js';
import { compiledItems } from './compiled-items.js';
import { useValueOwnershipValue } from './value-axis.js';

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

export function StepsRenderer(props: RendererComponentProps<StepsSchema>) {
  const schemaProps = props.props;
  const rawItems = compiledItems<StepsItemSchema>(schemaProps.items);
  const orientation = schemaProps.orientation === 'vertical' ? 'vertical' : 'horizontal';
  const { ownership, currentValue, setValue } = useValueOwnershipValue(schemaProps, 'nop-steps');

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
        <div data-slot="steps-empty">
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
          >
            {orientation === 'horizontal' && index > 0 && (
              <span
                aria-hidden="true"
                data-slot="steps-connector"
                style={
                  orientation === 'horizontal'
                    ? { transform: 'translateX(-50%)', width: '100%', left: '50%' }
                    : undefined
                }
              />
            )}
            {orientation === 'vertical' && index > 0 && (
              <span aria-hidden="true" data-slot="steps-connector" />
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
              className='nop-steps-indicator'
              // [G1-R4-视角8-02] one interactive stop per step: the indicator
              // button owns the whole step row (circle + title/description) so
              // the click hot zone is not limited to the 28px indicator.
              // Keyboard focus lands here, exactly once per step.
            >
              <span data-slot="steps-indicator-circle" data-status={status}>
                {status === 'finish' ? (
                  <CheckIcon />
                ) : status === 'error' ? (
                  <XIcon />
                ) : (
                  index + 1
                )}
              </span>
              <span data-slot="steps-text">
                <span data-slot="steps-title">
                  {item.title ?? item.value ?? item.key ?? index + 1}
                </span>
                {item.description ? (
                  <span data-slot="steps-description">
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
