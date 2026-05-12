import {
  booleanStringAdapter,
  type BaseSchema,
  numberAdapter,
  stringAdapter,
  type RendererComponentProps,
  type RendererDefinition,
  type RendererSchemaValidationContext,
  type ValueAdapter,
} from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Checkbox,
  cn,
  Input,
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
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { formLabelFieldRule, useFormFieldController } from '../field-utils.js';
import type {
  CheckboxGroupSchema,
  CheckboxSchema,
  InputNumberSchema,
  InputSchema,
  RadioGroupSchema,
  SelectSchema,
  SwitchSchema,
  TextareaSchema,
} from '../schemas.js';
import { validateHiddenFieldPolicySchema } from './hidden-field-policy-schema.js';

export function validateInputFieldSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  validateHiddenFieldPolicySchema(context);
}

export function createInputRenderer(inputType: string) {
  return function InputRenderer(props: RendererComponentProps<InputSchema>) {
    const name = String(props.props.name ?? '');
    const { value, handlers, presentation } = useFormFieldController(name, {
      adapter: stringAdapter(),
      disabled: props.meta.disabled,
      required: Boolean(props.props.required),
      readOnly: Boolean(props.props.readOnly),
    });
    const inputValue = value as string;

    return (
      <Input
        type={inputType}
        id={name ? `${name}-control` : undefined}
        name={name || undefined}
        value={inputValue}
        disabled={presentation.effectiveDisabled}
        aria-label={String((props.props.label ?? name) || '') || undefined}
        aria-required={props.props.required ? true : undefined}
        aria-invalid={presentation.showError ? true : undefined}
        placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
        className={props.meta.className}
        onFocus={handlers.onFocus}
        onChange={(event) => handlers.onChange(event.target.value)}
        onBlur={handlers.onBlur}
      />
    );
  };
}

const stringValueAdapter = stringAdapter();
const booleanValueAdapter = booleanStringAdapter();
const checkboxGroupAdapter: ValueAdapter<unknown, unknown[]> & { __syncIn: true; __syncOut: true } =
  {
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

export function createFieldValidation(
  nameResolver?: (schema: InputSchema) => string | undefined,
  email?: boolean,
) {
  return {
    kind: 'field' as const,
    valueKind: 'scalar' as const,
    getFieldPath(schema: InputSchema) {
      return nameResolver ? nameResolver(schema) : schema.name;
    },
    collectRules(schema: InputSchema) {
      const rules: Array<
        | { kind: 'email' }
        | {
            kind: 'async';
            action: import('@nop-chaos/flux-core').ActionSchema;
            debounce?: number;
            message?: string;
          }
      > = email ? [{ kind: 'email' }] : [];

      if (schema.validate?.action) {
        rules.push({
          kind: 'async',
          action: schema.validate.action,
          debounce: schema.validate.debounce,
          message: schema.validate.message,
        });
      }

      return rules;
    },
  };
}

function SelectRenderer(props: RendererComponentProps<SelectSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: stringValueAdapter,
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
  });
  const options = Array.isArray(props.props.options) ? props.props.options : [];
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const ariaLabel = String(props.props.label ?? name);
  const loading = optionsSourceState?.loading === true;
  const placeholder = loading ? 'Loading...' : undefined;
  const errorMessage = getSourceErrorMessage(optionsSourceState);
  const selectedValue = value as string;
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label;

  return (
    <div className={cn('nop-select-wrapper', props.meta.className)} data-slot="select-wrapper">
      <Select
        value={selectedValue}
        onValueChange={(nextValue) => handlers.onChange(nextValue)}
        disabled={loading || presentation.effectiveDisabled}
      >
        <SelectTrigger
          id={name ? `${name}-control` : undefined}
          data-slot="select-trigger"
          aria-label={ariaLabel}
          aria-required={props.props.required ? true : undefined}
          aria-invalid={presentation.showError ? true : undefined}
          aria-describedby={errorMessage && name ? `${name}-source-error` : undefined}
          aria-errormessage={errorMessage && name ? `${name}-source-error` : undefined}
          onFocus={handlers.onFocus}
          onBlur={handlers.onBlur}
        >
          {loading ? <Spinner className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
          <SelectValue placeholder={placeholder}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errorMessage ? (
        <span data-slot="select-error" id={name ? `${name}-source-error` : undefined} role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

function TextareaRenderer(props: RendererComponentProps<TextareaSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: stringValueAdapter,
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
  });
  const textareaValue = value as string;

  return (
    <Textarea
      id={name ? `${name}-control` : undefined}
      name={name || undefined}
      value={textareaValue}
      rows={typeof props.props.rows === 'number' ? props.props.rows : 4}
      disabled={presentation.effectiveDisabled}
      aria-label={String((props.props.label ?? name) || '') || undefined}
      aria-required={props.props.required ? true : undefined}
      aria-invalid={presentation.showError ? true : undefined}
      placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
      className={props.meta.className}
      onFocus={handlers.onFocus}
      onChange={(event) => handlers.onChange(event.target.value)}
      onBlur={handlers.onBlur}
    />
  );
}

function CheckboxRenderer(props: RendererComponentProps<CheckboxSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: booleanValueAdapter,
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
  });
  const option = props.props.option as CheckboxSchema['option'] | undefined;
  const optionLabel = option?.label;
  const checked = value as boolean;

  return (
    <span className={cn('nop-checkbox-wrapper', props.meta.className)} data-slot="checkbox-wrapper">
      <Checkbox
        id={name ? `${name}-control` : undefined}
        checked={checked}
        disabled={presentation.effectiveDisabled}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={optionLabel}
        onFocus={handlers.onFocus}
        onCheckedChange={(checked) => handlers.onChange(Boolean(checked))}
        onBlur={handlers.onBlur}
      />
      {optionLabel ? <span data-slot="checkbox-label">{optionLabel}</span> : null}
    </span>
  );
}

function SwitchRenderer(props: RendererComponentProps<SwitchSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: booleanValueAdapter,
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
  });
  const option = props.props.option as SwitchSchema['option'] | undefined;
  const checked = value as boolean;

  return (
    <span className={cn('nop-switch-wrapper', props.meta.className)} data-slot="switch-wrapper">
      <Switch
        id={name ? `${name}-control` : undefined}
        checked={checked}
        disabled={presentation.effectiveDisabled}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={String(props.props.label ?? name)}
        onFocus={handlers.onFocus}
        onCheckedChange={(nextChecked) => handlers.onChange(Boolean(nextChecked))}
        onBlur={handlers.onBlur}
      />
      <span data-slot="switch-label">
        {checked ? (option?.onLabel ?? 'On') : (option?.offLabel ?? 'Off')}
      </span>
    </span>
  );
}

function RadioGroupRenderer(props: RendererComponentProps<RadioGroupSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: stringValueAdapter,
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
  });
  const options = Array.isArray(props.props.options) ? props.props.options : [];
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);
  const selectedValue = value as string;

  return (
    <div
      className={cn('nop-radio-group-wrapper', props.meta.className)}
      data-slot="radio-group-wrapper"
    >
      {loading ? (
        <span data-slot="radio-group-loading">
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
      <RadioGroup
        data-slot="radio-group-options"
        value={selectedValue}
        disabled={loading || presentation.effectiveDisabled}
        aria-required={props.props.required ? true : undefined}
        aria-invalid={presentation.showError ? true : undefined}
        onFocus={handlers.onFocus}
        onValueChange={(nextValue) => handlers.onChange(nextValue)}
        onBlur={handlers.onBlur}
      >
        {options?.map((option) => (
          <Label key={option.value} data-slot="radio-group-item">
            <RadioGroupItem value={option.value} aria-label={option.label} disabled={loading} />
            <span data-slot="radio-group-item-label">{option.label}</span>
          </Label>
        ))}
      </RadioGroup>
      {errorMessage ? (
        <span data-slot="radio-group-error" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

function CheckboxGroupRenderer(props: RendererComponentProps<CheckboxGroupSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: checkboxGroupAdapter,
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
  });
  const selectedValues = value as unknown[];
  const options = Array.isArray(props.props.options) ? props.props.options : [];
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);
  const errorId = name ? `${name}-source-error` : undefined;

  return (
    <div
      className={cn('nop-checkbox-group-wrapper', props.meta.className)}
      data-slot="checkbox-group-wrapper"
      role="group"
      aria-required={props.props.required ? true : undefined}
      aria-describedby={errorMessage ? errorId : undefined}
    >
      {loading ? (
        <span data-slot="checkbox-group-loading">
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
      {options?.map((option) => {
        const checked = selectedValues.some((candidate: unknown) =>
          Object.is(candidate, option.value),
        );

        return (
          <Label key={option.value} data-slot="checkbox-group-item">
            <Checkbox
              checked={checked}
              disabled={loading || presentation.effectiveDisabled}
              aria-invalid={presentation.showError ? true : undefined}
              aria-label={option.label}
              aria-describedby={errorMessage ? errorId : undefined}
              aria-errormessage={errorMessage ? errorId : undefined}
              onFocus={handlers.onFocus}
              onCheckedChange={(nextChecked) => {
                const checkedValue = Boolean(nextChecked);
                const nextValue = checkedValue
                  ? [...selectedValues, option.value]
                  : selectedValues.filter(
                      (candidate: unknown) => !Object.is(candidate, option.value),
                    );
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

const numericAdapter = numberAdapter();

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  let result = value;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}

function applyPrecision(value: number, precision: number | undefined): number {
  if (precision === undefined || precision < 0) return value;
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function InputNumberRenderer(props: RendererComponentProps<InputNumberSchema>) {
  const name = String(props.props.name ?? '');
  const min = typeof props.props.min === 'number' ? props.props.min : undefined;
  const max = typeof props.props.max === 'number' ? props.props.max : undefined;
  const step = typeof props.props.step === 'number' ? props.props.step : 1;
  const precision = typeof props.props.precision === 'number' ? props.props.precision : undefined;
  const prefix = typeof props.props.prefix === 'string' ? props.props.prefix : undefined;
  const suffix = typeof props.props.suffix === 'string' ? props.props.suffix : undefined;
  const showStepper = props.props.showStepper !== false;
  const keyboard = props.props.keyboard !== false;

  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: numericAdapter,
    disabled: props.meta.disabled,
    required: Boolean(props.props.required),
    readOnly: Boolean(props.props.readOnly),
  });

  const numericValue = value as number | undefined;

  function handleBlur() {
    if (numericValue !== undefined) {
      const clamped = clamp(numericValue, min, max);
      const withPrecision = applyPrecision(clamped, precision);
      if (withPrecision !== numericValue) {
        handlers.onChange(withPrecision);
      }
    }
    handlers.onBlur();
  }

  function handleStep(direction: 1 | -1) {
    if (!presentation.interactive) {
      return;
    }

    const current = numericValue ?? 0;
    let next = current + direction * step;
    next = clamp(next, min, max);
    next = applyPrecision(next, precision);
    handlers.onChange(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!keyboard) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStep(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStep(-1);
    }
  }

  return (
    <div
      className={cn('nop-input-number', props.meta.className)}
      data-slot="field-control"
      data-testid={props.meta.testid}
      data-cid={props.meta.cid}
    >
      <div className="relative flex items-center">
        {prefix ? (
          <span data-slot="prefix" className="pointer-events-none absolute left-3 text-sm text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <Input
          type="number"
          id={name ? `${name}-control` : undefined}
          name={name || undefined}
          value={numericValue !== undefined ? numericValue : ''}
          disabled={presentation.effectiveDisabled}
          aria-label={String((props.props.label ?? name) || '') || undefined}
          aria-required={props.props.required ? true : undefined}
          aria-invalid={presentation.showError ? true : undefined}
          placeholder={props.props.placeholder ? String(props.props.placeholder) : undefined}
          min={min}
          max={max}
          step={step}
          className={cn(prefix && 'pl-8', suffix && 'pr-8', showStepper && 'pr-16')}
          onFocus={handlers.onFocus}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') {
              handlers.onChange(undefined);
              return;
            }
            const parsed = Number(raw);
            if (!Number.isNaN(parsed)) {
              handlers.onChange(parsed);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          readOnly={Boolean(props.props.readOnly)}
        />
        {suffix ? (
          <span data-slot="suffix" className="pointer-events-none absolute right-3 text-sm text-muted-foreground">
            {suffix}
          </span>
        ) : null}
        {showStepper ? (
          <span data-slot="stepper" className="absolute right-1 flex flex-col">
            <Button
              type="button"
              data-slot="stepper-increase"
              aria-label="Increase"
              variant="ghost"
              size="icon-xs"
              className="h-4 w-6 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              disabled={!presentation.interactive}
              onClick={() => handleStep(1)}
              tabIndex={-1}
            >
              <ChevronUpIcon className="size-3" />
            </Button>
            <Button
              type="button"
              data-slot="stepper-decrease"
              aria-label="Decrease"
              variant="ghost"
              size="icon-xs"
              className="h-4 w-6 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              disabled={!presentation.interactive}
              onClick={() => handleStep(-1)}
              tabIndex={-1}
            >
              <ChevronDownIcon className="size-3" />
            </Button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const inputRendererDefinitions: RendererDefinition[] = [
  {
    type: 'input-text',
    component: createInputRenderer('text'),
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
  },
  {
    type: 'input-email',
    component: createInputRenderer('email'),
    fields: [formLabelFieldRule],
    validation: createFieldValidation(undefined, true),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
  },
  {
    type: 'input-password',
    component: createInputRenderer('password'),
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
  },
  {
    type: 'select',
    fields: [
      formLabelFieldRule,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: SelectRenderer,
  },
  {
    type: 'textarea',
    fields: [formLabelFieldRule],
    component: TextareaRenderer,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
  },
  {
    type: 'checkbox',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: CheckboxRenderer,
  },
  {
    type: 'switch',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: SwitchRenderer,
  },
  {
    type: 'radio-group',
    fields: [
      formLabelFieldRule,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: RadioGroupRenderer,
  },
  {
    type: 'checkbox-group',
    fields: [
      formLabelFieldRule,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: CheckboxGroupRenderer,
  },
  {
    type: 'input-number',
    fields: [formLabelFieldRule],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: InputNumberRenderer,
  },
];
