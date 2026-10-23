import type { ChangeEvent, ComponentProps } from 'react';
import { useRef, useState } from 'react';
import {
  type BaseSchema,
  stringAdapter,
  type RendererComponentProps,
  type RegisteredRendererDefinition,
  type RendererSchemaValidationContext,
  type SchemaFieldRule,
  type ValidationRule,
} from '@nop-chaos/flux-core';
import {
  Input,
  InputGroupButton,
  InputGroupInput,
  cn,
  useIsMobile,
} from '@nop-chaos/ui';
import { resolveFieldFrameErrorRefs } from '@nop-chaos/flux-react';
import { useStandardFieldHandle } from '../use-standard-field-handle.js';
import { t } from '@nop-chaos/flux-i18n';
import { Eye, EyeOff } from 'lucide-react';
import { formFieldContractRules, useFormFieldFromProps } from '../field-utils.js';
import {
  buttonGroupSelectSpecificContracts,
  checkboxGroupSpecificContracts,
  checkboxSpecificContracts,
  inputNumberSpecificContracts,
  radioGroupSpecificContracts,
  selectSpecificContracts,
} from './input-contracts.js';
import { InputGroupFieldControl, mergeAriaSpace } from './input-group-field-control.js';
import { computePasswordStrength, PasswordStrengthMeter } from './input-password-strength.js';
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
import { ButtonGroupSelectRenderer } from './button-group-select-renderer.js';
import { InputNumberRenderer } from './input-number-renderer.js';
import { TextareaRenderer } from './textarea-renderer.js';
import {
  FOCUS_ONLY_CAPABILITY_CONTRACTS,
  SCALAR_INPUT_CAPABILITY_CONTRACTS,
  SELECT_CAPABILITY_CONTRACTS,
  searchSourcePropContract,
  validatePropContract,
} from './input-shared.js';

export function validateInputFieldSchema(context: RendererSchemaValidationContext<BaseSchema>) {
  validateHiddenFieldPolicySchema(context);
}

const INPUT_TEXT_METHODS = ['clear', 'reset', 'focus'] as const;

export const inputEnhancementFieldRules: SchemaFieldRule[] = [
  { key: 'prefix', kind: 'prop' },
  { key: 'suffix', kind: 'prop' },
  { key: 'clearable', kind: 'prop', valueType: 'boolean' },
  { key: 'trimContents', kind: 'prop', valueType: 'boolean' },
  { key: 'showCounter', kind: 'prop', valueType: 'boolean' },
  { key: 'nativeAutoComplete', kind: 'prop' },
  { key: 'inputMode', kind: 'prop' },
  { key: 'revealPassword', kind: 'prop', valueType: 'boolean' },
  { key: 'showStrength', kind: 'prop', valueType: 'boolean' },
  { key: 'placeholder', kind: 'prop' },
  { key: 'minLength', kind: 'prop' },
  { key: 'maxLength', kind: 'prop' },
  { key: 'pattern', kind: 'prop' },
  { key: 'validate', kind: 'prop', contract: validatePropContract },
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
  { key: 'validate', kind: 'prop', contract: validatePropContract },
  { key: 'hiddenFieldPolicy', kind: 'prop' },
];


export function createInputRenderer(inputType: string) {
  return function InputRenderer(props: RendererComponentProps<InputSchema>) {
    const name = String(props.props.name ?? '');
    const isMobile = useIsMobile();
    const { value, handlers, presentation } = useFormFieldFromProps(props, {
      adapter: stringAdapter(),
    });
    const inputValue = (value as string | undefined) ?? '';
    const errorId = name ? `${name}-error` : undefined;
    // FieldFrame injects the instance-unique error reference chain (its error
    // element id is cid-suffixed, not `${name}-error`); local id is the bare
    // harness fallback.
    const { describedBy, errorMessageId } = resolveFieldFrameErrorRefs(props, {
      errorId,
      showError: presentation.showError,
    });

    const inputRef = useRef<HTMLInputElement | null>(null);
    const initialValueRef = useRef(inputValue);

    useStandardFieldHandle({
      id: props.id,
      name,
      type: inputType === 'text' ? 'input-text' : `input-${inputType}`,
      cid: props.meta.cid,
      methods: INPUT_TEXT_METHODS,
      getFocusTarget: () => inputRef.current,
      interactive: presentation.interactive,
      visible: props.meta.visible !== false,
      clearValue: () => handlers.onChange(''),
      resetValue: () => {
        const initial = initialValueRef.current;
        handlers.onChange(initial);
        return { fellBackToDefault: false };
      },
    });

    const revealEnabled = inputType === 'password' && props.props.revealPassword === true;
    const strengthEnabled = inputType === 'password' && props.props.showStrength === true;
    const strengthLevel = strengthEnabled ? computePasswordStrength(inputValue) : null;
    const strengthLabelId = strengthEnabled && strengthLevel && name ? `${name}-strength` : undefined;
    const strengthSlot =
      strengthEnabled && strengthLevel ? (
        <PasswordStrengthMeter level={strengthLevel} describedById={strengthLabelId} />
      ) : null;
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
        aria-label={t(revealed ? 'flux.common.hidePassword' : 'flux.common.showPassword')}
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
    const needsInputGroup = Boolean(prefix) || hasInlineEndSlot || strengthEnabled;

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
      'aria-describedby': mergeAriaSpace(describedBy, strengthLabelId),
      'aria-errormessage': errorMessageId,
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
      ...suggest.comboboxAria,
      ...(nativeAutoComplete ? { autoComplete: nativeAutoComplete } : {}),
      ...nativeAttrs,
    };

    const rootMarker = `nop-input-${inputType}`;

    if (!needsInputGroup) {
      return suggest.wrap(
        <Input {...sharedInputProps} className={cn(rootMarker, props.meta.className)} />,
      );
    }

    return suggest.wrap(
      <InputGroupFieldControl
        className={cn('nop-input-group', rootMarker, props.meta.className)}
        inputProps={sharedInputProps}
        prefix={prefix}
        suffix={suffix}
        counterText={counterText}
        showClearButton={showClearButton}
        onClear={handleClear}
        revealSlot={revealSlot}
        strengthSlot={strengthSlot}
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
        | { kind: 'url' }
        | { kind: 'integer' }
        | { kind: 'format'; value: string }
        | {
            kind: 'async';
            action: import('@nop-chaos/flux-core').ActionSchema;
            debounce?: number;
            message?: string;
          }
      > = email ? [{ kind: 'email' }] : [];

      // Support format property for validation
      const format = (schema as { format?: string }).format;
      if (format) {
        rules.push({ kind: 'format', value: format });
      }

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

export const inputRendererDefinitions: RegisteredRendererDefinition[] = [
  {
    type: 'input-text',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    component: createInputRenderer('text'),
    fields: [...formFieldContractRules, ...inputEnhancementFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
  },
  {
    type: 'input-email',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    component: createInputRenderer('email'),
    fields: [...formFieldContractRules, ...inputEnhancementFieldRules],
    validation: createFieldValidation(undefined, true),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
  },
  {
    type: 'input-password',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    component: createInputRenderer('password'),
    fields: [...formFieldContractRules, ...inputEnhancementFieldRules],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
  },
  {
    type: 'select',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldContractRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
      // Runtime-injected source transient state (node-source-prop-controller
      // publishes loading/error under this prop when `options` uses a source).
      { key: 'optionsSourceState', kind: 'prop' },
      { key: 'dict', kind: 'prop' },
      { key: 'groups', kind: 'prop' },
      { key: 'multiple', kind: 'prop', valueType: 'boolean', contract: selectSpecificContracts.multiple },
      { key: 'searchable', kind: 'prop', valueType: 'boolean', contract: selectSpecificContracts.searchable },
      { key: 'clearable', kind: 'prop', valueType: 'boolean', contract: selectSpecificContracts.clearable },
      { key: 'filterOption', kind: 'prop' },
      { key: 'searchPlaceholder', kind: 'prop' },
      { key: 'noResultsText', kind: 'prop' },
      { key: 'noMatchText', kind: 'prop' },
      { key: 'virtual', kind: 'prop', valueType: 'boolean', contract: selectSpecificContracts.virtual },
      { key: 'optionTemplate', kind: 'region', params: ['option', 'index'] },
      { key: 'searchSource', kind: 'prop', contract: searchSourcePropContract },
      { key: 'searchMergeMode', kind: 'prop', contract: selectSpecificContracts.searchMergeMode },
      { key: 'placeholder', kind: 'prop' },
      { key: 'defaultValue', kind: 'prop' },
      { key: 'validate', kind: 'prop', contract: validatePropContract },
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
    fields: [...formFieldContractRules, ...textareaEnhancementFieldRules],
    component: TextareaRenderer,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: SCALAR_INPUT_CAPABILITY_CONTRACTS,
    wrap: true,
  },
  {
    type: 'checkbox',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldContractRules,
      { key: 'option', kind: 'prop' },
      { key: 'trueValue', kind: 'prop' },
      { key: 'falseValue', kind: 'prop' },
      { key: 'shape', kind: 'prop', contract: checkboxSpecificContracts.shape },
      { key: 'defaultValue', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: CheckboxRenderer,
  },
  {
    type: 'switch',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldContractRules,
      { key: 'option', kind: 'prop' },
      { key: 'trueValue', kind: 'prop' },
      { key: 'falseValue', kind: 'prop' },
      { key: 'defaultValue', kind: 'prop' },
    ],
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
      ...formFieldContractRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
      // Runtime-injected source transient state (node-source-prop-controller
      // publishes loading/error under this prop when `options` uses a source).
      { key: 'optionsSourceState', kind: 'prop' },
      { key: 'direction', kind: 'prop', contract: radioGroupSpecificContracts.direction },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_ONLY_CAPABILITY_CONTRACTS,
    wrap: true,
    // plan 460 B3: fieldset frame — a <label> wrapper forwards gap clicks to the first option.
    frameWrap: 'group',
    component: RadioGroupRenderer,
  },
  {
    type: 'checkbox-group',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldContractRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
      { key: 'optionsSourceState', kind: 'prop' },
      { key: 'checkAll', kind: 'prop', valueType: 'boolean', contract: checkboxGroupSpecificContracts.checkAll },
      { key: 'maxSelected', kind: 'prop' },
      { key: 'minSelected', kind: 'prop' },
      { key: 'direction', kind: 'prop', contract: checkboxGroupSpecificContracts.direction },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_ONLY_CAPABILITY_CONTRACTS,
    wrap: true,
    frameWrap: 'group', // plan 460 B3: same rationale as radio-group
    component: CheckboxGroupRenderer,
  },
  {
    type: 'button-group-select',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldContractRules,
      { key: 'options', kind: 'prop', allowSource: true, sourceStateKey: 'optionsSourceState' },
      { key: 'optionsSourceState', kind: 'prop' },
      { key: 'multiple', kind: 'prop', valueType: 'boolean', contract: buttonGroupSelectSpecificContracts.multiple },
      { key: 'direction', kind: 'prop', contract: buttonGroupSelectSpecificContracts.direction },
      { key: 'dict', kind: 'prop' },
    ],
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    componentCapabilityContracts: FOCUS_ONLY_CAPABILITY_CONTRACTS,
    wrap: true,
    component: ButtonGroupSelectRenderer,
  },
  {
    type: 'input-number',
    sourcePackage: '@nop-chaos/flux-renderers-form',
    fields: [
      ...formFieldContractRules,
      { key: 'precision', kind: 'prop', contract: inputNumberSpecificContracts.precision },
      { key: 'precisionMode', kind: 'prop', contract: inputNumberSpecificContracts.precisionMode },
      { key: 'placeholder', kind: 'prop' },
      { key: 'prefix', kind: 'prop' },
      { key: 'suffix', kind: 'prop' },
      { key: 'showStepper', kind: 'prop', valueType: 'boolean' },
      { key: 'inputMode', kind: 'prop' },
      { key: 'min', kind: 'prop' },
      { key: 'max', kind: 'prop' },
      { key: 'step', kind: 'prop' },
      { key: 'defaultValue', kind: 'prop' },
    ],
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
