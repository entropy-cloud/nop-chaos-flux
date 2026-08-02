import { useRef } from 'react';
import { type RendererComponentProps } from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { useDictOptions } from './use-dict-options.js';
import { t } from '@nop-chaos/flux-i18n';
import { Button, ButtonGroup, Spinner, cn } from '@nop-chaos/ui';
import { useFormFieldController } from '../field-utils.js';
import type { ButtonGroupSelectSchema } from '../schemas.js';
import {
  checkboxGroupAdapter,
  choiceSingleAdapter,
  type ChoiceOption,
  getChoiceOptionKey,
  getSourceErrorMessage,
  sanitizeChoiceOptions,
} from './input-choice-renderers.js';

const FOCUS_ONLY_METHODS = ['focus'] as const;

/**
 * button-group-select：按钮组形态的单选/多选字段（AMIS button-group-select 的 flux 实现）。
 * single 模式等价 radio-group（按钮形态），multiple 模式等价 checkbox-group（按钮形态）。
 * 选项来源：inline `options` 或 `dict`。
 *
 * DOM 契约见 `__tests__/button-group-select-dom-contract.test.tsx`：
 *  - .nop-button-group-select[data-slot="button-group-select-wrapper"]
 *  - [data-slot="button-group-select-options"][role="group"]
 *  - [data-slot="button-group-select-item"][data-selected][aria-pressed]，文本 = option.label
 */
export function ButtonGroupSelectRenderer(
  props: RendererComponentProps<ButtonGroupSelectSchema>,
) {
  const name = String(props.props.name ?? '');
  const multiple = Boolean(props.props.multiple);
  const dictName = props.props.dict as string | undefined;
  const adapter = multiple ? checkboxGroupAdapter : choiceSingleAdapter;
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
    defaultValue: props.props.value,
  });
  const dictState = useDictOptions(dictName);
  const hasDict = !!dictName;
  const options = hasDict ? dictState.options : sanitizeChoiceOptions(props.props.options);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = hasDict ? dictState.loading : optionsSourceState?.loading === true;
  const errorMessage = dictState.errorMessage ?? getSourceErrorMessage(optionsSourceState);
  const errorId = errorMessage && name ? `${name}-source-error` : undefined;
  const groupRef = useRef<HTMLDivElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'button-group-select',
    cid: props.meta.cid,
    methods: FOCUS_ONLY_METHODS,
    getFocusTarget: () =>
      groupRef.current?.querySelector<HTMLElement>('button[data-slot="button-group-select-item"]') ??
      null,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
  });

  const isSelected = (optionValue: ChoiceOption['value']): boolean => {
    if (multiple) {
      return Array.isArray(value) ? value.some((v) => Object.is(v, optionValue)) : false;
    }
    return Object.is(value, optionValue);
  };

  const handleToggle = (option: ChoiceOption) => {
    if (!presentation.interactive || option.disabled || loading) return;
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      const exists = arr.some((v) => Object.is(v, option.value));
      handlers.onChange(
        exists ? arr.filter((v) => !Object.is(v, option.value)) : [...arr, option.value],
      );
    } else {
      handlers.onChange(option.value);
    }
  };

  return (
    <div
      ref={groupRef}
      className={cn('nop-button-group-select', props.meta.className)}
      data-slot="button-group-select-wrapper"
    >
      {loading ? (
        <span data-slot="button-group-select-loading" role="status" aria-live="polite">
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
      <ButtonGroup
        data-slot="button-group-select-options"
        role="group"
        aria-label={String((props.props.label ?? name) || '') || undefined}
        aria-required={props.props.required ? true : undefined}
        aria-invalid={presentation.showError ? true : undefined}
        aria-disabled={presentation.effectiveDisabled ? true : undefined}
        aria-readonly={presentation.readOnly ? true : undefined}
        onFocus={handlers.onFocus}
        onBlur={handlers.onBlur}
      >
        {options.map((option) => {
          const selected = isSelected(option.value);
          const disabled = loading || presentation.effectiveDisabled || option.disabled;
          return (
            <Button
              key={getChoiceOptionKey(option.value)}
              type="button"
              variant={selected ? 'default' : 'outline'}
              disabled={disabled}
              data-slot="button-group-select-item"
              data-selected={selected || undefined}
              aria-pressed={selected}
              onClick={() => handleToggle(option)}
            >
              {option.label}
            </Button>
          );
        })}
      </ButtonGroup>
      {errorMessage ? (
        <span id={errorId} data-slot="button-group-select-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
