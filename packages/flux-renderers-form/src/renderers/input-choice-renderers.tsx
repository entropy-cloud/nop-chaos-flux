import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  booleanMappingAdapter,
  stringAdapter,
  type RendererComponentProps,
  type RenderRegionHandle,
  type SchemaValue,
  type ValueAdapter,
} from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { useDictOptions } from './use-dict-options.js';
import { t } from '@nop-chaos/flux-i18n';
import {
  Checkbox,
  cn,
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxValue,
  Label,
  RadioGroup,
  RadioGroupItem,
  Spinner,
  Switch,
  useIsMobile,
} from '@nop-chaos/ui';
import { useFormFieldController } from '../field-utils.js';
import type {
  CheckboxSchema,
  RadioGroupSchema,
  SelectOptionGroup,
  SelectSchema,
  SwitchSchema,
} from '../schemas.js';
import { SelectMobile } from './select-mobile-renderer.js';
import { StaticComboboxList, VirtualizedComboboxList } from './select-combobox-lists.js';
import { shouldStackChoicesVertically } from './mobile-touch-utils.js';

export type ChoiceOption = {
  [key: string]: SchemaValue;
  label: string;
  value: string | number | boolean;
  disabled?: boolean;
  disabledTip?: string;
};

const stringValueAdapter = stringAdapter();

const SELECT_METHODS = ['clear', 'focus', 'open'] as const;
const FOCUS_ONLY_METHODS = ['focus'] as const;
const selectMultipleAdapter: ValueAdapter<unknown, unknown[]> & { __syncIn: true; __syncOut: true } = {
  __syncIn: true,
  __syncOut: true,
  in(value) {
    return Array.isArray(value) ? value : [];
  },
  out(value) {
    return Array.isArray(value) ? value : [];
  },
};
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
export { checkboxGroupAdapter };

export function getSourceErrorMessage(sourceState: SourceTransientState | undefined) {
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

export function getChoiceOptionKey(value: ChoiceOption['value']): string {
  return String(value);
}

export function sanitizeChoiceOptions(value: unknown): ChoiceOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as {
      label?: unknown;
      value?: unknown;
      disabled?: unknown;
      disabledTip?: unknown;
    };
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

    return [
      {
        ...(entry as Record<string, unknown>),
        label: candidate.label,
        value: candidate.value,
        disabled: candidate.disabled === true ? true : undefined,
        disabledTip: typeof candidate.disabledTip === 'string' ? candidate.disabledTip : undefined,
      },
    ];
  });
}

function sanitizeChoiceGroups(value: unknown): SelectOptionGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const candidate = entry as { label?: unknown; options?: unknown };
    if (typeof candidate.label !== 'string' || !Array.isArray(candidate.options)) {
      return [];
    }

    const options = sanitizeChoiceOptions(candidate.options);
    if (options.length === 0) {
      return [];
    }

    return [{ label: candidate.label, options }];
  });
}

function matchChoiceLabel(label: string, query: string, ignoreCase: boolean): boolean {
  if (!query) {
    return true;
  }
  return ignoreCase
    ? label.toLowerCase().includes(query.toLowerCase())
    : label.includes(query);
}

export type OptionTemplateRenderer = (
  option: ChoiceOption,
  index: number,
) => ReactNode | undefined;

export function SelectRenderer(props: RendererComponentProps<SelectSchema>) {
  const name = String(props.props.name ?? '');
  const multiple = Boolean(props.props.multiple);
  const dictName = props.props.dict as string | undefined;
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: multiple ? selectMultipleAdapter : stringValueAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const dictState = useDictOptions(dictName);
  const hasDict = !!dictName;
  const rawOptions = hasDict
    ? dictState.options
    : sanitizeChoiceOptions(props.props.options);
  const groups = sanitizeChoiceGroups(props.props.groups);
  const useGroups = groups.length > 0 && !hasDict;
  const allOptions = useGroups ? groups.flatMap((group) => group.options) : rawOptions;

  const searchable = Boolean(props.props.searchable);
  const clearable = Boolean(props.props.clearable);
  const filterOptionSpec = props.props.filterOption;
  const filterEnabled = searchable && filterOptionSpec !== false;
  const ignoreCase =
    typeof filterOptionSpec === 'object' ? filterOptionSpec.ignoreCase !== false : true;
  const virtual = Boolean(props.props.virtual);
  const virtualThreshold = 100;

  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const ariaLabel = String(props.props.label ?? name);
  const loading = hasDict ? dictState.loading : optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);
  const errorId = errorMessage && name ? `${name}-source-error` : undefined;
  const placeholder = props.props.placeholder ? String(props.props.placeholder) : undefined;
  const searchPlaceholder = props.props.searchPlaceholder
    ? String(props.props.searchPlaceholder)
    : placeholder;
  const noResultsText = props.props.noResultsText
    ? String(props.props.noResultsText)
    : t('flux.common.noResults');
  const loadingText = t('flux.common.loading');
  const effectiveDisabled = loading || presentation.effectiveDisabled;
  const interactive = presentation.interactive && !loading;
  const virtualEnabled = virtual && allOptions.length > virtualThreshold;

  const optionTemplateRegion = props.regions.optionTemplate as
    | RenderRegionHandle<ReactNode>
    | undefined;
  const hasOptionTemplate = Boolean(optionTemplateRegion?.templateNode);
  const renderOptionTemplate: OptionTemplateRenderer | undefined = hasOptionTemplate
    ? (option, index) =>
        optionTemplateRegion!.render({
          bindings: { option, index },
        }) as ReactNode
    : undefined;

  const [inputValue, setInputValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const selectWrapperRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const query = filterEnabled ? inputValue : '';
  const visibleOptions = query
    ? rawOptions.filter((option) => matchChoiceLabel(option.label, query, ignoreCase))
    : rawOptions;
  const visibleGroups = useGroups
    ? (query
        ? groups
            .map((group) => ({
              label: group.label,
              options: group.options.filter((option) =>
                matchChoiceLabel(option.label, query, ignoreCase),
              ),
            }))
            .filter((group) => group.options.length > 0)
        : groups)
    : [];

  const noMatchText = props.props.noMatchText ? String(props.props.noMatchText) : undefined;
  const valueArray = Array.isArray(value) ? (value as unknown[]) : [];
  const hasEchoValue = value !== undefined && value !== null && value !== '';
  const comboboxValue = multiple
    ? [
        ...allOptions.filter((option) =>
          valueArray.some((candidate) => Object.is(candidate, option.value)),
        ),
        ...valueArray
          .filter(
            (candidate) => !allOptions.some((option) => Object.is(option.value, candidate)),
          )
          .map((primitive) => ({
            label: String(primitive),
            value: primitive as ChoiceOption['value'],
          })),
      ]
    : (allOptions.find((option) => Object.is(option.value, value)) ??
        (hasEchoValue
          ? { label: noMatchText ?? String(value), value: value as ChoiceOption['value'] }
          : null));

  const handleValueChange = (next: unknown) => {
    if (!interactive) {
      return;
    }
    if (multiple) {
      handlers.onChange((next as ChoiceOption[]).map((option) => option.value));
    } else {
      const option = next as ChoiceOption | null;
      handlers.onChange(option ? option.value : undefined);
    }
  };

  const mobileTriggerText = multiple
    ? valueArray
        .map(
          (candidate) =>
            allOptions.find((option) => Object.is(option.value, candidate))?.label ??
            String(candidate),
        )
        .join(', ')
    : (allOptions.find((option) => Object.is(option.value, value))?.label ??
        (hasEchoValue ? noMatchText ?? String(value) : ''));
  const mobileHasSelection = multiple ? valueArray.length > 0 : hasEchoValue;

  const toggleMobileOption = (option: ChoiceOption) => {
    if (!interactive || option.disabled) {
      return;
    }
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      const exists = arr.some((candidate) => Object.is(candidate, option.value));
      handlers.onChange(
        exists ? arr.filter((candidate) => !Object.is(candidate, option.value)) : [...arr, option.value],
      );
    } else {
      handlers.onChange(option.value);
      setSheetOpen(false);
    }
  };

  const mobileClear = () => {
    if (!interactive) {
      return;
    }
    if (multiple) {
      handlers.onChange([]);
    } else {
      handlers.onChange(undefined);
    }
  };

  const controlProps = {
    id: name ? `${name}-control` : undefined,
    'aria-label': ariaLabel,
    'aria-required': (props.props.required ? true : undefined) as boolean | undefined,
    'aria-invalid': (presentation.showError ? true : undefined) as boolean | undefined,
    'aria-describedby': errorId,
    'aria-errormessage': errorId,
    onFocus: handlers.onFocus,
    onBlur: handlers.onBlur,
  };

  const triggerPlaceholder = loading ? loadingText : placeholder;

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'select',
    cid: props.meta.cid,
    methods: SELECT_METHODS,
    getFocusTarget: () =>
      selectWrapperRef.current?.querySelector<HTMLElement>(
        '[data-slot="combobox-trigger"], [data-slot="combobox-input"], [data-slot="select-mobile-trigger"], input',
      ) ?? null,
    isInteractive: () => interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => {
      if (multiple) {
        handlers.onChange([]);
      } else {
        handlers.onChange(undefined);
      }
    },
    openMenu: () => {
      if (isMobile) {
        setSheetOpen(true);
      } else {
        setMenuOpen(true);
      }
    },
  });

  return (
    <div
      ref={selectWrapperRef}
      className={cn('nop-select-wrapper', props.meta.className)}
      data-slot="select-wrapper"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      {isMobile ? (
        <SelectMobile
          ariaLabel={ariaLabel}
          triggerPlaceholder={triggerPlaceholder}
          searchPlaceholder={searchPlaceholder}
          placeholder={placeholder}
          mobileTriggerText={mobileTriggerText}
          mobileHasSelection={mobileHasSelection}
          effectiveDisabled={effectiveDisabled}
          interactive={interactive}
          sheetOpen={sheetOpen}
          setSheetOpen={setSheetOpen}
          searchable={searchable}
          inputValue={inputValue}
          setInputValue={setInputValue}
          useGroups={useGroups}
          visibleGroups={visibleGroups}
          visibleOptions={visibleOptions}
          loading={loading}
          loadingText={loadingText}
          errorMessage={errorMessage}
          noResultsText={noResultsText}
          renderOptionTemplate={renderOptionTemplate}
          multiple={multiple}
          value={value}
          onToggleOption={toggleMobileOption}
          onClear={mobileClear}
          clearable={clearable}
          controlProps={controlProps}
          errorId={errorId}
          handlers={handlers}
        />
      ) : (
        <Combobox
          open={menuOpen}
          onOpenChange={setMenuOpen}
          value={comboboxValue as ChoiceOption | ChoiceOption[] | null}
          onValueChange={interactive ? handleValueChange : undefined}
          multiple={multiple}
          disabled={effectiveDisabled}
          itemToStringLabel={(option: ChoiceOption) => option.label}
          isItemEqualToValue={(a: ChoiceOption, b: ChoiceOption) => Object.is(a.value, b.value)}
          onInputValueChange={(nextQuery: string) => setInputValue(nextQuery)}
        >
          {multiple ? (
            <ComboboxChips className="w-full min-h-9">
              {(comboboxValue as ChoiceOption[]).map((option) => (
                <ComboboxChip key={getChoiceOptionKey(option.value)}>
                  {option.label}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput
                {...controlProps}
                placeholder={searchable ? (searchPlaceholder ?? '') : ''}
                readOnly={!searchable}
              />
            </ComboboxChips>
          ) : searchable ? (
            <ComboboxInput
              {...controlProps}
              className="w-full"
              placeholder={loading ? loadingText : (searchPlaceholder ?? triggerPlaceholder)}
              showClear={clearable}
              disabled={effectiveDisabled}
            />
          ) : (
            <div className="flex w-full items-center gap-1">
              <ComboboxTrigger
                {...controlProps}
                className="flex-1 justify-between"
                disabled={effectiveDisabled}
              >
                <ComboboxValue placeholder={triggerPlaceholder} />
              </ComboboxTrigger>
              {clearable && comboboxValue ? (
                <ComboboxClear disabled={effectiveDisabled} aria-label={t('flux.common.clear')} />
              ) : null}
            </div>
          )}
          <ComboboxContent>
            <ComboboxEmpty>{noResultsText}</ComboboxEmpty>
            {virtualEnabled ? (
              <VirtualizedComboboxList
                renderGroups={useGroups}
                groups={visibleGroups}
                flatOptions={visibleOptions}
                renderOptionTemplate={renderOptionTemplate}
              />
            ) : (
              <StaticComboboxList
                renderGroups={useGroups}
                groups={visibleGroups}
                flatOptions={visibleOptions}
                renderOptionTemplate={renderOptionTemplate}
              />
            )}
          </ComboboxContent>
        </Combobox>
      )}
      {loading ? (
        <span
          data-slot="select-loading"
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5"
        >
          <Spinner className="size-4" aria-hidden="true" />
          <span>{loadingText}</span>
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

export function CheckboxRenderer(props: RendererComponentProps<CheckboxSchema>) {
  const name = String(props.props.name ?? '');
  const isMobile = useIsMobile();
  const trueValue = (props.props as CheckboxSchema).trueValue ?? true;
  const falseValue = (props.props as CheckboxSchema).falseValue ?? false;
  const adapter = booleanMappingAdapter(trueValue, falseValue);
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const option = props.props.option as CheckboxSchema['option'] | undefined;
  const optionLabel = option?.label;
  const checked = value as boolean;

  return (
    <Label
      className={cn(
        'nop-checkbox-wrapper',
        'nop-haptic',
        isMobile && 'min-h-11 py-2',
        props.meta.className,
      )}
      data-slot="checkbox-wrapper">
      <Checkbox
        id={name ? `${name}-control` : undefined}
        checked={checked}
        disabled={presentation.effectiveDisabled}
        aria-readonly={presentation.readOnly ? true : undefined}
        aria-invalid={presentation.showError ? true : undefined}
        aria-label={optionLabel ?? name}
        onFocus={handlers.onFocus}
        onCheckedChange={(nextChecked) => handlers.onChange(Boolean(nextChecked))}
        onBlur={handlers.onBlur}
      />
      {optionLabel ? <span data-slot="checkbox-label">{optionLabel}</span> : null}
    </Label>
  );
}

export function SwitchRenderer(props: RendererComponentProps<SwitchSchema>) {
  const name = String(props.props.name ?? '');
  const isMobile = useIsMobile();
  const trueValue = (props.props as SwitchSchema).trueValue ?? true;
  const falseValue = (props.props as SwitchSchema).falseValue ?? false;
  const adapter = booleanMappingAdapter(trueValue, falseValue);
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const option = props.props.option as SwitchSchema['option'] | undefined;
  const checked = value as boolean;
  const switchRef = useRef<HTMLLabelElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'switch',
    cid: props.meta.cid,
    methods: FOCUS_ONLY_METHODS,
    getFocusTarget: () =>
      switchRef.current?.querySelector<HTMLElement>('button, [role="switch"], input') ?? null,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
  });

  return (
    <Label
      ref={switchRef}
      className={cn(
        'nop-switch-wrapper',
        'nop-haptic',
        isMobile && 'min-h-11 py-2',
        props.meta.className,
      )}
      data-slot="switch-wrapper">
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
  const isMobile = useIsMobile();
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: stringValueAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const options = sanitizeChoiceOptions(props.props.options);
  const mobileStack = shouldStackChoicesVertically(isMobile, options.length);
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  const loading = optionsSourceState?.loading === true;
  const errorMessage = getSourceErrorMessage(optionsSourceState);
  const selectedValue = value as string;
  const errorId = name ? `${name}-source-error` : undefined;
  const groupLabel = String((props.props.label ?? name) || '') || undefined;
  const radioRef = useRef<HTMLDivElement | null>(null);

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'radio-group',
    cid: props.meta.cid,
    methods: FOCUS_ONLY_METHODS,
    getFocusTarget: () =>
      radioRef.current?.querySelector<HTMLElement>('button, [role="radio"], input') ?? null,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
  });

  return (
    <div
      ref={radioRef}
      className={cn('nop-radio-group-wrapper', props.meta.className)}
      data-slot="radio-group-wrapper"
      data-mobile-stack={mobileStack ? 'true' : undefined}
    >
      {loading ? (
        <span data-slot="radio-group-loading" role="status" aria-live="polite">
          <Spinner className="size-4" aria-hidden="true" />
          <span>{t('flux.common.loading')}</span>
        </span>
      ) : null}
      <RadioGroup
        data-slot="radio-group-options"
        className={mobileStack ? 'flex flex-col gap-1' : undefined}
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
          <Label
            key={getChoiceOptionKey(option.value)}
            data-slot="radio-group-item"
            className={cn('nop-haptic', isMobile && 'min-h-11 py-2')}
          >
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

