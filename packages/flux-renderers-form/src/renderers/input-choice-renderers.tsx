import {
  booleanStringAdapter,
  stringAdapter,
  type RendererComponentProps,
  type ValueAdapter,
} from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
  Checkbox,
  cn,
  Label,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Switch,
  Textarea,
} from '@nop-chaos/ui';
import { useFormFieldController } from '../field-utils.js';
import type {
  CheckboxGroupSchema,
  CheckboxSchema,
  RadioGroupSchema,
  SelectSchema,
  SwitchSchema,
  TextareaSchema,
} from '../schemas.js';

type ChoiceOption = { label: string; value: string | number | boolean };

const stringValueAdapter = stringAdapter();
const booleanValueAdapter = booleanStringAdapter();
const checkboxGroupAdapter: ValueAdapter<unknown, unknown[]> & { __syncIn: true; __syncOut: true } = {
  __syncIn: true,
  __syncOut: true,
  in(value) {
    return Array.isArray(value) ? value : [];
  },
  out(value) {
    return Array.isArray(value) ? value : [];
  },
};

function getSourceErrorMessage(sourceState: SourceTransientState | undefined) {
  if (sourceState?.status !== 'error') {
    return undefined;
  }

  if (typeof sourceState.error === 'string' && sourceState.error) {
    return sourceState.error;
  }

  if (
    sourceState.error &&
    typeof sourceState.error === 'object' &&
    'message' in sourceState.error &&
    typeof (sourceState.error as { message?: unknown }).message === 'string'
  ) {
    return (sourceState.error as { message: string }).message;
  }

  return t('flux.form.failedToLoadOptions');
}

function getChoiceOptionKey(value: ChoiceOption['value']): string {
  return String(value);
}

function sanitizeChoiceOptions(value: unknown): ChoiceOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as { label?: unknown; value?: unknown };
    if (
      typeof candidate.label !== 'string' ||
      !(
        typeof candidate.value === 'string' ||
        typeof candidate.value === 'number' ||
        typeof candidate.value === 'boolean'
      )
    ) {
      return [];
    }

    return [{ label: candidate.label, value: candidate.value }];
  });
}

export function SelectRenderer(props: RendererComponentProps<SelectSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: stringValueAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const options = sanitizeChoiceOptions(props.props.options);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const ariaLabel = String(props.props.label ?? name);
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);
  const selectedValue = value as string;
  const errorId = errorMessage && name ? `${name}-source-error` : undefined;
  const placeholder = props.props.placeholder ? String(props.props.placeholder) : undefined;

  return (
    <div className={cn('nop-select-wrapper', props.meta.className)} data-slot="select-wrapper">
      <Select
        value={selectedValue}
        disabled={loading || presentation.effectiveDisabled}
        onValueChange={presentation.interactive ? (nextValue) => handlers.onChange(nextValue) : undefined}
      >
        <SelectTrigger
          id={name ? `${name}-control` : undefined}
          aria-label={ariaLabel}
          aria-required={props.props.required ? true : undefined}
          aria-invalid={presentation.showError ? true : undefined}
          aria-describedby={errorId}
          aria-errormessage={errorId}
          className="w-full"
          disabled={loading || presentation.effectiveDisabled}
          onFocus={handlers.onFocus}
          onBlur={handlers.onBlur}
        >
          <SelectValue placeholder={loading ? t('flux.common.loading') : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={getChoiceOptionKey(option.value)} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading ? (
        <span
          data-slot="select-loading"
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5"
        >
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
      {errorMessage ? (
        <span data-slot="select-error" id={errorId} role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

export function TextareaRenderer(props: RendererComponentProps<TextareaSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: stringValueAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const textareaValue = value as string;
  const errorId = name ? `${name}-error` : undefined;

  return (
    <Textarea
      id={name ? `${name}-control` : undefined}
      name={name || undefined}
      value={textareaValue}
      rows={typeof props.props.rows === 'number' ? props.props.rows : 4}
      disabled={presentation.effectiveDisabled}
      readOnly={presentation.readOnly}
      aria-label={String((props.props.label ?? name) || '') || undefined}
      aria-required={props.props.required ? true : undefined}
      aria-invalid={presentation.showError ? true : undefined}
      aria-describedby={presentation.showError ? errorId : undefined}
      aria-errormessage={presentation.showError ? errorId : undefined}
      placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
      className={props.meta.className}
      onFocus={handlers.onFocus}
      onChange={(event) => handlers.onChange(event.target.value)}
      onBlur={handlers.onBlur}
    />
  );
}

export function CheckboxRenderer(props: RendererComponentProps<CheckboxSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: booleanValueAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const option = props.props.option as CheckboxSchema['option'] | undefined;
  const optionLabel = option?.label;
  const checked = value as boolean;

  return (
    <Label className={cn('nop-checkbox-wrapper', props.meta.className)} data-slot="checkbox-wrapper">
      <Checkbox
        id={name ? `${name}-control` : undefined}
        checked={checked}
        disabled={presentation.effectiveDisabled}
        aria-readonly={presentation.readOnly ? true : undefined}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={optionLabel ?? name}
        onFocus={handlers.onFocus}
        onCheckedChange={(checked) => handlers.onChange(Boolean(checked))}
        onBlur={handlers.onBlur}
      />
      {optionLabel ? <span data-slot="checkbox-label">{optionLabel}</span> : null}
    </Label>
  );
}

export function SwitchRenderer(props: RendererComponentProps<SwitchSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: booleanValueAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const option = props.props.option as SwitchSchema['option'] | undefined;
  const checked = value as boolean;

  return (
    <Label className={cn('nop-switch-wrapper', props.meta.className)} data-slot="switch-wrapper">
      <Switch
        id={name ? `${name}-control` : undefined}
        checked={checked}
        disabled={presentation.effectiveDisabled}
        aria-readonly={presentation.readOnly ? true : undefined}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={String(props.props.label ?? name)}
        onFocus={handlers.onFocus}
        onCheckedChange={(nextChecked) => handlers.onChange(Boolean(nextChecked))}
        onBlur={handlers.onBlur}
      />
      <span data-slot="switch-label">
        {checked ? (option?.onLabel ?? 'On') : (option?.offLabel ?? 'Off')}
      </span>
    </Label>
  );
}

export function RadioGroupRenderer(props: RendererComponentProps<RadioGroupSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: stringValueAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const options = sanitizeChoiceOptions(props.props.options);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);
  const selectedValue = value as string;
  const errorId = name ? `${name}-source-error` : undefined;
  const groupLabel = String((props.props.label ?? name) || '') || undefined;

  return (
    <div
      className={cn('nop-radio-group-wrapper', props.meta.className)}
      data-slot="radio-group-wrapper"
    >
      {loading ? (
        <span data-slot="radio-group-loading" role="status" aria-live="polite">
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
      <RadioGroup
        data-slot="radio-group-options"
        value={selectedValue}
        disabled={loading || presentation.effectiveDisabled}
        aria-readonly={presentation.readOnly ? true : undefined}
        aria-label={groupLabel}
        aria-required={props.props.required ? true : undefined}
        aria-invalid={presentation.showError ? true : undefined}
        aria-describedby={errorMessage ? errorId : undefined}
        aria-errormessage={errorMessage ? errorId : undefined}
        onFocus={handlers.onFocus}
        onValueChange={presentation.interactive ? (nextValue) => handlers.onChange(nextValue) : undefined}
        onBlur={handlers.onBlur}
      >
        {options.map((option) => (
          <Label key={getChoiceOptionKey(option.value)} data-slot="radio-group-item">
            <RadioGroupItem
              value={option.value}
              aria-label={option.label}
              disabled={loading || presentation.effectiveDisabled}
            />
            <span data-slot="radio-group-item-label">{option.label}</span>
          </Label>
        ))}
      </RadioGroup>
      {errorMessage ? (
        <span id={errorId} data-slot="radio-group-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

export function CheckboxGroupRenderer(props: RendererComponentProps<CheckboxGroupSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: checkboxGroupAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const selectedValues = value as unknown[];
  const options = sanitizeChoiceOptions(props.props.options);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);
  const errorId = name ? `${name}-source-error` : undefined;
  const groupLabel = String((props.props.label ?? name) || '') || undefined;

  return (
    <div
      className={cn('nop-checkbox-group-wrapper', props.meta.className)}
      data-slot="checkbox-group-wrapper"
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
      {options.map((option) => {
        const checked = selectedValues.some((candidate: unknown) => Object.is(candidate, option.value));

        return (
          <Label key={getChoiceOptionKey(option.value)} data-slot="checkbox-group-item">
            <Checkbox
              checked={checked}
              disabled={loading || presentation.effectiveDisabled}
              aria-invalid={presentation.showError ? true : undefined}
              aria-label={option.label}
              aria-describedby={errorMessage ? errorId : undefined}
              aria-errormessage={errorMessage ? errorId : undefined}
              onFocus={handlers.onFocus}
              onCheckedChange={(nextChecked) => {
                if (!presentation.interactive) {
                  return;
                }

                const checkedValue = Boolean(nextChecked);
                const nextValue = checkedValue
                  ? [...selectedValues, option.value]
                  : selectedValues.filter((candidate: unknown) => !Object.is(candidate, option.value));
                handlers.onChange(nextValue);
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
