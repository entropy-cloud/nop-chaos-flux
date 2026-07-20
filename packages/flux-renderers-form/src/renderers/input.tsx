import type { ChangeEvent, ComponentProps, ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  type BaseSchema,
  stringAdapter,
  type RendererComponentProps,
  type RendererDefinition,
  type RendererSchemaValidationContext,
  type SchemaFieldRule,
  type ValidationRule,
} from '@nop-chaos/flux-core';
import {
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  cn,
  useIsMobile,
} from '@nop-chaos/ui';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { Eye, EyeOff, XIcon } from 'lucide-react';
import { formFieldRules, useFormFieldController } from '../field-utils.js';
import type {
  InputSchema,
} from '../schemas.js';
import { validateHiddenFieldPolicySchema } from './hidden-field-policy-schema.js';
import { useInputSuggest } from './input-suggest.js';
import { resolveInputMode, scrollRefIntoViewOnMobile } from './mobile-touch-utils.js';
import {
  CheckboxRenderer,
  RadioGroupRenderer,
  SelectRenderer,
  SwitchRenderer,
} from './input-choice-renderers.js';
import { CheckboxGroupRenderer } from './checkbox-group-renderer.js';
import { InputNumberRenderer } from './input-number-renderer.js';
import { TextareaRenderer } from './textarea-renderer.js';

export function validateInputFieldSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  validateHiddenFieldPolicySchema(context);
}

const INPUT_TEXT_METHODS = ['clear', 'reset', 'focus'] as const;

const SCALAR_INPUT_CAPABILITY_CONTRACTS = [
  {
    handle: 'clear',
    displayName: 'Clear',
    description: 'Clear the field value to its empty representation (empty string).',
  },
  {
    handle: 'reset',
    displayName: 'Reset',
    description: 'Restore the field to its initial value captured at mount.',
  },
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the underlying input element.',
  },
] as const;

const SELECT_CAPABILITY_CONTRACTS = [
  {
    handle: 'clear',
    displayName: 'Clear',
    description: 'Clear the selection (single-select to undefined, multi-select to []).',
  },
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the select trigger element.',
  },
  {
    handle: 'open',
    displayName: 'Open',
    description: 'Open the select dropdown menu.',
  },
] as const;

const FOCUS_ONLY_CAPABILITY_CONTRACTS = [
  {
    handle: 'focus',
    displayName: 'Focus',
    description: 'Focus the control.',
  },
] as const;

export const inputEnhancementFieldRules: SchemaFieldRule[] = [
  { key: 'prefix', kind: 'prop' },
  { key: 'suffix', kind: 'prop' },
  { key: 'clearable', kind: 'prop', valueType: 'boolean' },
  { key: 'trimContents', kind: 'prop', valueType: 'boolean' },
  { key: 'showCounter', kind: 'prop', valueType: 'boolean' },
  { key: 'nativeAutoComplete', kind: 'prop' },
  { key: 'inputMode', kind: 'prop' },
  { key: 'revealPassword', kind: 'prop', valueType: 'boolean' },
  { key: 'placeholder', kind: 'prop' },
  { key: 'minLength', kind: 'prop' },
  { key: 'maxLength', kind: 'prop' },
  { key: 'pattern', kind: 'prop' },
  { key: 'validate', kind: 'prop' },
  { key: 'hiddenFieldPolicy', kind: 'prop' },
  { key: 'suggestSource', kind: 'prop' },
  { key: 'suggestDebounce', kind: 'prop' },
  { key: 'suggestTrigger', kind: 'prop' },
  { key: 'suggestMinInputLength', kind: 'prop' },
  { key: 'suggestTemplate', kind: 'region', params: ['suggestion', 'index'] },
  { key: 'suggestEmpty', kind: 'prop' },
];

export const textareaEnhancementFieldRules: SchemaFieldRule[] = [
  { key: 'rows', kind: 'prop' },
  { key: 'minRows', kind: 'prop' },
  { key: 'maxRows', kind: 'prop' },
  { key: 'clearable', kind: 'prop', valueType: 'boolean' },
  { key: 'trimContents', kind: 'prop', valueType: 'boolean' },
  { key: 'showCounter', kind: 'prop', valueType: 'boolean' },
  { key: 'placeholder', kind: 'prop' },
  { key: 'minLength', kind: 'prop' },
  { key: 'maxLength', kind: 'prop' },
  { key: 'pattern', kind: 'prop' },
  { key: 'validate', kind: 'prop' },
  { key: 'hiddenFieldPolicy', kind: 'prop' },
];

function mergeAriaSpace(...values: Array<string | undefined | false>): string | undefined {
  const tokens = values.filter((v): v is string => Boolean(v && v.trim()));
  return tokens.length > 0 ? tokens.join(' ') : undefined;
}

type FrameInjectedAriaProps = {
  id?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-errormessage'?: string;
  'aria-invalid'?: boolean;
  onFocus?: (event: unknown) => void;
  onBlur?: (event: unknown) => void;
};

type InputGroupFieldControlProps = FrameInjectedAriaProps & {
  className?: string;
  inputProps: ComponentProps<typeof InputGroupInput>;
  prefix?: string;
  suffix?: string;
  counterText?: string;
  showClearButton?: boolean;
  onClear?: () => void;
  revealSlot?: ReactNode;
};

function InputGroupFieldControl(props: InputGroupFieldControlProps) {
  const {
    className,
    id: injectedId,
    'aria-labelledby': injectedLabelledBy,
    'aria-describedby': injectedDescribedBy,
    'aria-errormessage': injectedErrorMessage,
    'aria-invalid': injectedInvalid,
    onFocus: injectedFocus,
    onBlur: injectedBlur,
    inputProps,
    prefix,
    suffix,
    counterText,
    showClearButton,
    onClear,
    revealSlot,
  } = props;

  const ownId = inputProps.id;
  const ownLabelledBy = inputProps['aria-labelledby'];
  const ownDescribedBy = inputProps['aria-describedby'];
  const ownErrorMessage = inputProps['aria-errormessage'];
  const ownInvalid = inputProps['aria-invalid'];
  const ownFocus = inputProps.onFocus as ((event: unknown) => void) | undefined;
  const ownBlur = inputProps.onBlur as ((event: unknown) => void) | undefined;

  const mergedInputProps = {
    ...inputProps,
    id: ownId ?? injectedId,
    'aria-labelledby': mergeAriaSpace(ownLabelledBy, injectedLabelledBy),
    'aria-describedby': mergeAriaSpace(ownDescribedBy, injectedDescribedBy),
    'aria-errormessage': ownErrorMessage ?? injectedErrorMessage,
    'aria-invalid': ownInvalid ?? injectedInvalid,
    onFocus: (event: unknown) => {
      injectedFocus?.(event);
      ownFocus?.(event);
    },
    onBlur: (event: unknown) => {
      ownBlur?.(event);
      injectedBlur?.(event);
    },
  };

  return (
    <InputGroup className={className}>
      {prefix ? (
        <InputGroupAddon align="inline-start">
          <InputGroupText>{prefix}</InputGroupText>
        </InputGroupAddon>
      ) : null}
      <InputGroupInput {...mergedInputProps} />
      {suffix || counterText !== undefined || showClearButton || revealSlot ? (
        <InputGroupAddon align="inline-end">
          {suffix ? <InputGroupText>{suffix}</InputGroupText> : null}
          {counterText !== undefined ? (
            <span data-slot="input-counter" className="text-xs text-muted-foreground tabular-nums">
              {counterText}
            </span>
          ) : null}
          {showClearButton ? (
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              aria-label="Clear"
              onClick={onClear}
            >
              <XIcon className="pointer-events-none" />
            </InputGroupButton>
          ) : null}
          {revealSlot}
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

export function createInputRenderer(inputType: string) {
  return function InputRenderer(props: RendererComponentProps<InputSchema>) {
    const name = String(props.props.name ?? '');
    const isMobile = useIsMobile();
    const { value, handlers, presentation } = useFormFieldController(name, {
      adapter: stringAdapter(),
      disabled: props.props.disabled,
      required: props.props.required,
      readOnly: props.props.readOnly,
    });
    const inputValue = (value as string | undefined) ?? '';
    const errorId = name ? `${name}-error` : undefined;

    const inputRef = useRef<HTMLInputElement | null>(null);
    const initialValueRef = useRef(inputValue);

    useInputComponentHandle({
      id: props.id,
      name,
      type: inputType === 'text' ? 'input-text' : `input-${inputType}`,
      cid: props.meta.cid,
      methods: INPUT_TEXT_METHODS,
      getFocusTarget: () => inputRef.current,
      isInteractive: () => presentation.interactive,
      isVisible: () => props.meta.visible !== false,
      clearValue: () => handlers.onChange(''),
      resetValue: () => {
        const initial = initialValueRef.current;
        handlers.onChange(initial);
        return { fellBackToDefault: false };
      },
    });

    const revealEnabled = inputType === 'password' && props.props.revealPassword === true;
    const [revealed, setRevealed] = useState(false);
    const actualInputType = revealEnabled && revealed ? 'text' : inputType;

    const suggest = useInputSuggest({
      config: {
        suggestSource: typeof props.props.suggestSource === 'string' ? props.props.suggestSource : undefined,
        suggestDebounce: typeof props.props.suggestDebounce === 'number' ? props.props.suggestDebounce : undefined,
        suggestTrigger: props.props.suggestTrigger as 'input' | 'focus' | 'manual' | undefined,
        suggestMinInputLength: typeof props.props.suggestMinInputLength === 'number'
          ? props.props.suggestMinInputLength
          : undefined,
        suggestEmpty: typeof props.props.suggestEmpty === 'string' ? props.props.suggestEmpty : undefined,
      },
      regions: props.regions,
      helpers: props.helpers,
      interactive: presentation.interactive,
      inputValue,
      onChange: handlers.onChange,
    });

    const nativeAttrs: { minLength?: number; maxLength?: number; pattern?: string } = {};
    if (typeof props.props.minLength === 'number') {
      nativeAttrs.minLength = props.props.minLength;
    }
    const maxLength = typeof props.props.maxLength === 'number' ? props.props.maxLength : undefined;
    if (maxLength !== undefined) {
      nativeAttrs.maxLength = maxLength;
    }
    if (typeof props.props.pattern === 'string' && props.props.pattern) {
      nativeAttrs.pattern = props.props.pattern;
    }

    const prefix = typeof props.props.prefix === 'string' && props.props.prefix ? props.props.prefix : undefined;
    const suffix = typeof props.props.suffix === 'string' && props.props.suffix ? props.props.suffix : undefined;
    const clearable = props.props.clearable === true;
    const trimContents = props.props.trimContents === true;
    const showCounter = props.props.showCounter === true;
    const nativeAutoComplete =
      typeof props.props.nativeAutoComplete === 'string' && props.props.nativeAutoComplete
        ? props.props.nativeAutoComplete
        : undefined;

    const showClearButton =
      clearable && presentation.interactive && typeof inputValue === 'string' && inputValue.length > 0;

    function handleBlur() {
      if (trimContents && typeof inputValue === 'string' && inputValue.length > 0) {
        const trimmed = inputValue.trim();
        if (trimmed !== inputValue) {
          handlers.onChange(trimmed);
        }
      }
      handlers.onBlur();
    }

    function handleClear() {
      handlers.onChange('');
    }

    function handleRevealToggle() {
      setRevealed((prev) => !prev);
    }

    const counterText =
      showCounter && typeof inputValue === 'string'
        ? maxLength !== undefined
          ? `${inputValue.length} / ${maxLength}`
          : `${inputValue.length}`
        : undefined;

    const revealSlot = revealEnabled ? (
      <InputGroupButton
        size="icon-xs"
        variant="ghost"
        data-slot="input-password-reveal"
        aria-label={revealed ? 'Hide password' : 'Show password'}
        aria-pressed={revealed}
        disabled={!presentation.interactive}
        onClick={handleRevealToggle}
      >
        {revealed ? (
          <EyeOff className="pointer-events-none" />
        ) : (
          <Eye className="pointer-events-none" />
        )}
      </InputGroupButton>
    ) : null;

    const hasInlineEndSlot = Boolean(suffix) || clearable || showCounter || revealEnabled;
    const needsInputGroup = Boolean(prefix) || hasInlineEndSlot;

    const inputMode = resolveInputMode(inputType, props.props.inputMode);

    const sharedInputProps: ComponentProps<typeof InputGroupInput> = {
      ref: inputRef,
      type: actualInputType,
      id: name ? `${name}-control` : undefined,
      name: name || undefined,
      value: inputValue,
      inputMode,
      disabled: presentation.effectiveDisabled,
      readOnly: presentation.readOnly,
      'aria-label': String((props.props.label ?? name) || '') || undefined,
      'aria-required': props.props.required ? true : undefined,
      'aria-invalid': presentation.showError ? true : undefined,
      'aria-describedby': presentation.showError ? errorId : undefined,
      'aria-errormessage': presentation.showError ? errorId : undefined,
      placeholder: props.props.placeholder ? String(props.props.placeholder) : undefined,
      onFocus: (event) => {
        void event;
        handlers.onFocus();
        suggest.handleFocus();
        scrollRefIntoViewOnMobile(isMobile, inputRef);
      },
      onChange: (event: ChangeEvent<HTMLInputElement>) => handlers.onChange(event.target.value),
      onBlur: () => {
        handleBlur();
        suggest.handleBlur();
      },
      onKeyDown: (event) => {
        suggest.handleKeyDown(event);
      },
      ...(nativeAutoComplete ? { autoComplete: nativeAutoComplete } : {}),
      ...nativeAttrs,
    };

    if (!needsInputGroup) {
      return suggest.wrap(
        <Input {...sharedInputProps} className={props.meta.className} />,
      );
    }

    return suggest.wrap(
      <InputGroupFieldControl
        className={cn('nop-input-group', props.meta.className)}
        inputProps={sharedInputProps}
        prefix={prefix}
        suffix={suffix}
        counterText={counterText}
        showClearButton={showClearButton}
        onClear={handleClear}
        revealSlot={revealSlot}
      />,
    );
  };
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

/**
 * Field validation for delimited range fields (e.g. date-range). In addition to
 * the base field rules, when the schema is `required` it contributes a
 * range-aware `requiredRange` rule: a partial range (one bound filled, the other
 * empty — value shaped like `'2024-06-01,'`) must fail required, while the
 * generic `required` rule handles the fully-empty case. Both rules are
 * mutually exclusive in practice (partial → requiredRange, empty → required).
 */
export function createRangeFieldValidation() {
  const base = createFieldValidation();
  return {
    kind: 'field' as const,
    valueKind: 'scalar' as const,
    getFieldPath: base.getFieldPath,
    collectRules(schema: BaseSchema) {
      const rules: ValidationRule[] = [...(base.collectRules?.(schema as InputSchema) ?? [])];
      const rangeSchema = schema as { required?: boolean; delimiter?: string };
      if (rangeSchema.required) {
        rules.push({ kind: 'requiredRange', delimiter: rangeSchema.delimiter ?? ',' });
      }
      return rules;
    },
  };
}

export const inputRendererDefinitions: RendererDefinition[] = [
  {
    type: 'input-text',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    component: createInputRenderer('text'),
    fields: [...formFieldRules, ...inputEnhancementFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
  },
  {
    type: 'input-email',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    component: createInputRenderer('email'),
    fields: [...formFieldRules, ...inputEnhancementFieldRules],
    validation: createFieldValidation(undefined, true),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
  },
  {
    type: 'input-password',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    component: createInputRenderer('password'),
    fields: [...formFieldRules, ...inputEnhancementFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
  },
  {
    type: 'select',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
      { key: 'dict', kind: 'prop' },
      { key: 'groups', kind: 'prop' },
      { key: 'multiple', kind: 'prop', valueType: 'boolean' },
      { key: 'searchable', kind: 'prop', valueType: 'boolean' },
      { key: 'clearable', kind: 'prop', valueType: 'boolean' },
      { key: 'filterOption', kind: 'prop' },
      { key: 'searchPlaceholder', kind: 'prop' },
      { key: 'noResultsText', kind: 'prop' },
      { key: 'virtual', kind: 'prop', valueType: 'boolean' },
      { key: 'optionTemplate', kind: 'region', params: ['option', 'index'] },
      { key: 'searchSource', kind: 'prop' },
      { key: 'searchMergeMode', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SELECT_CAPABILITY_CONTRACTS,
    wrap: true,
    component: SelectRenderer,
  },
  {
    type: 'textarea',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [...formFieldRules, ...textareaEnhancementFieldRules],
    component: TextareaRenderer,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
  },
  {
    type: 'checkbox',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: CheckboxRenderer,
  },
  {
    type: 'switch',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_ONLY_CAPABILITY_CONTRACTS,
    wrap: true,
    component: SwitchRenderer,
  },
  {
    type: 'radio-group',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
      { key: 'direction', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_ONLY_CAPABILITY_CONTRACTS,
    wrap: true,
    component: RadioGroupRenderer,
  },
  {
    type: 'checkbox-group',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
      { key: 'checkAll', kind: 'prop', valueType: 'boolean' },
      { key: 'maxSelected', kind: 'prop' },
      { key: 'minSelected', kind: 'prop' },
      { key: 'direction', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_ONLY_CAPABILITY_CONTRACTS,
    wrap: true,
    component: CheckboxGroupRenderer,
  },
  {
    type: 'input-number',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: [
      {
        handle: 'clear',
        displayName: 'Clear',
        description: 'Clear the numeric value to undefined.',
      },
      {
        handle: 'reset',
        displayName: 'Reset',
        description: 'Restore the numeric value to its initial value captured at mount.',
      },
      {
        handle: 'focus',
        displayName: 'Focus',
        description: 'Focus the underlying number input element.',
      },
    ],
    wrap: true,
    component: InputNumberRenderer,
  },
];
