import { useRef } from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle, type SourceTransientState } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { Checkbox, cn, Label, Spinner, useIsMobile } from '@nop-chaos/ui';
import { useFormFieldController } from '../field-utils.js';
import type { CheckboxGroupSchema } from '../schemas.js';
import {
  checkboxGroupAdapter,
  type ChoiceOption,
  getChoiceOptionKey,
  getSourceErrorMessage,
  sanitizeChoiceOptions,
} from './input-choice-renderers.js';
import { shouldStackChoicesVertically } from './mobile-touch-utils.js';

const FOCUS_ONLY_METHODS = ['focus'] as const;

export function CheckboxGroupRenderer(props: RendererComponentProps<CheckboxGroupSchema>) {
  const name = String(props.props.name ?? '');
  const isMobile = useIsMobile();
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: checkboxGroupAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const selectedValues = value as unknown[];
  const options = sanitizeChoiceOptions(props.props.options);
  const mobileStack = shouldStackChoicesVertically(isMobile, options.length);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);
  const errorId = name ? `${name}-source-error` : undefined;
  const groupLabel = String((props.props.label ?? name) || '') || undefined;
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'checkbox-group',
    cid: props.meta.cid,
    methods: FOCUS_ONLY_METHODS,
    getFocusTarget: () =>
      wrapperRef.current?.querySelector<HTMLElement>('button, [role="checkbox"], input') ?? null,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
  });

  const checkAllEnabled = props.props.checkAll === true;
  const maxSelected =
    typeof props.props.maxSelected === 'number' && props.props.maxSelected >= 0
      ? props.props.maxSelected
      : undefined;
  const minSelected =
    typeof props.props.minSelected === 'number' && props.props.minSelected >= 0
      ? props.props.minSelected
      : undefined;

  const groupDisabled = loading || presentation.effectiveDisabled;

  const selectableOptions = options.filter((option) => !option.disabled);
  const selectedCount = selectedValues.length;
  const maxReached = maxSelected !== undefined && selectedCount >= maxSelected;

  const isSelected = (option: ChoiceOption) =>
    selectedValues.some((candidate: unknown) => Object.is(candidate, option.value));

  function commit(nextValue: unknown[]) {
    handlers.onChange(nextValue);
  }

  function toggleOption(option: ChoiceOption, nextChecked: boolean) {
    if (!presentation.interactive) {
      return;
    }
    const currentlySelected = isSelected(option);
    if (nextChecked === currentlySelected) {
      return;
    }
    if (nextChecked) {
      if (maxSelected !== undefined && selectedValues.length >= maxSelected) {
        return;
      }
      commit([...selectedValues, option.value]);
    } else {
      if (minSelected !== undefined && selectedValues.length - 1 < minSelected) {
        return;
      }
      commit(selectedValues.filter((candidate: unknown) => !Object.is(candidate, option.value)));
    }
  }

  function handleCheckAllToggle(nextChecked: boolean) {
    if (!presentation.interactive) {
      return;
    }
    if (nextChecked) {
      const target = selectableOptions.map((option) => option.value);
      const clamped = maxSelected !== undefined ? target.slice(0, maxSelected) : target;
      commit(clamped);
    } else {
      commit([]);
    }
  }

  const checkAllState = (() => {
    if (!checkAllEnabled || selectableOptions.length === 0) {
      return { checked: false, indeterminate: false };
    }
    const selectableSelectedCount = selectableOptions.filter(isSelected).length;
    const fullySelected = selectableSelectedCount === selectableOptions.length;
    return {
      checked: fullySelected,
      indeterminate: selectableSelectedCount > 0 && !fullySelected,
    };
  })();

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'nop-checkbox-group-wrapper',
        mobileStack && 'flex flex-col gap-1',
        props.meta.className,
      )}
      data-slot="checkbox-group-wrapper"
      data-mobile-stack={mobileStack ? 'true' : undefined}
      role="group"
      aria-label={groupLabel}
      aria-required={props.props.required ? true : undefined}
      aria-readonly={presentation.readOnly ? true : undefined}
      aria-describedby={errorMessage ? errorId : undefined}
    >
      {loading ? (
        <span data-slot="checkbox-group-loading" role="status" aria-live="polite">
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
      {checkAllEnabled && (selectableOptions.length > 0 || loading) ? (
        <Label
          data-slot="checkbox-group-checkall-item"
          className={cn('nop-haptic', isMobile && 'min-h-11 py-2')}
        >
          <Checkbox
            data-slot="checkbox-group-checkall"
            checked={checkAllState.checked}
            indeterminate={checkAllState.indeterminate}
            disabled={groupDisabled}
            aria-label={t('flux.common.selectAll')}
            onFocus={handlers.onFocus}
            onCheckedChange={(nextChecked) => handleCheckAllToggle(Boolean(nextChecked))}
            onBlur={handlers.onBlur}
          />
          <span data-slot="checkbox-group-checkall-label">{t('flux.common.selectAll')}</span>
        </Label>
      ) : null}
      {options.map((option) => {
        const checked = isSelected(option);
        const optionDisabled = Boolean(option.disabled);
        const cappedDisabled = !checked && maxReached;
        const effectiveOptionDisabled = groupDisabled || optionDisabled || cappedDisabled;
        const disabledTip = optionDisabled ? option.disabledTip : undefined;

        return (
          <Label
            key={getChoiceOptionKey(option.value)}
            data-slot="checkbox-group-item"
            className={cn('nop-haptic', isMobile && 'min-h-11 py-2')}
            title={disabledTip}
            data-disabled-tip={disabledTip || undefined}
          >
            <Checkbox
              checked={checked}
              disabled={effectiveOptionDisabled}
              aria-invalid={presentation.showError ? true : undefined}
              aria-label={option.label}
              aria-describedby={errorMessage ? errorId : undefined}
              aria-errormessage={errorMessage ? errorId : undefined}
              onFocus={handlers.onFocus}
              onCheckedChange={(nextChecked) => {
                if (optionDisabled) {
                  return;
                }
                if (!checked && cappedDisabled) {
                  return;
                }
                toggleOption(option, Boolean(nextChecked));
              }}
              onBlur={handlers.onBlur}
            />
            <span data-slot="checkbox-group-item-label">{option.label}</span>
          </Label>
        );
      })}
      {errorMessage ? (
        <span id={errorId} data-slot="checkbox-group-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}
