import { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  booleanMappingAdapter,
  stringAdapter,
  type RendererComponentProps,
  type ValueAdapter,
} from '@nop-chaos/flux-core';
import type { SourceTransientState } from '@nop-chaos/flux-react';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
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
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  Label,
  RadioGroup,
  RadioGroupItem,
  Spinner,
  Switch,
} from '@nop-chaos/ui';
import { useFormFieldController } from '../field-utils.js';
import type {
  CheckboxSchema,
  RadioGroupSchema,
  SelectOptionGroup,
  SelectSchema,
  SwitchSchema,
} from '../schemas.js';

export type ChoiceOption = {
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

const VIRTUAL_ITEM_ESTIMATE = 32;
const VIRTUAL_OVERSCAN = 6;

function renderComboboxItem(option: ChoiceOption) {
  return (
    <ComboboxItem
      key={getChoiceOptionKey(option.value)}
      value={option}
      disabled={option.disabled}
    >
      {option.label}
    </ComboboxItem>
  );
}

function StaticComboboxList(props: {
  renderGroups: boolean;
  groups: SelectOptionGroup[];
  flatOptions: ChoiceOption[];
}) {
  if (props.renderGroups) {
    return (
      <ComboboxList>
        {props.groups.map((group) => (
          <ComboboxGroup key={group.label}>
            <ComboboxLabel>{group.label}</ComboboxLabel>
            {group.options.map(renderComboboxItem)}
          </ComboboxGroup>
        ))}
      </ComboboxList>
    );
  }

  return <ComboboxList>{props.flatOptions.map(renderComboboxItem)}</ComboboxList>;
}

function VirtualizedComboboxList(props: {
  renderGroups: boolean;
  groups: SelectOptionGroup[];
  flatOptions: ChoiceOption[];
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const flatItems: ChoiceOption[] = props.renderGroups
    ? props.groups.flatMap((group) => group.options)
    : props.flatOptions;
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => VIRTUAL_ITEM_ESTIMATE,
    overscan: VIRTUAL_OVERSCAN,
    getItemKey: (index) => getChoiceOptionKey(flatItems[index]?.value ?? index),
  });

  return (
    <ComboboxList ref={scrollRef} data-slot="combobox-list">
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const option = flatItems[virtualItem.index];
          if (!option) {
            return null;
          }
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderComboboxItem(option)}
            </div>
          );
        })}
      </div>
    </ComboboxList>
  );
}

export function SelectRenderer(props: RendererComponentProps<SelectSchema>) {
  const name = String(props.props.name ?? '');
  const multiple = Boolean(props.props.multiple);
  const { value, handlers, presentation } = useFormFieldController(name, {
    adapter: multiple ? selectMultipleAdapter : stringValueAdapter,
    disabled: props.props.disabled,
    required: props.props.required,
    readOnly: props.props.readOnly,
  });
  const rawOptions = sanitizeChoiceOptions(props.props.options);
  const groups = sanitizeChoiceGroups(props.props.groups);
  const useGroups = groups.length > 0;
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
  const loading = optionsSourceState?.loading === true;
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

  const [inputValue, setInputValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const selectWrapperRef = useRef<HTMLDivElement | null>(null);
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

  const comboboxValue = multiple
    ? allOptions.filter((option) => {
        const arr = Array.isArray(value) ? value : [];
        return arr.some((candidate) => Object.is(candidate, option.value));
      })
    : (allOptions.find((option) => Object.is(option.value, value)) ?? null);

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
        '[data-slot="combobox-trigger"], [data-slot="combobox-input"], input',
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
    openMenu: () => setMenuOpen(true),
  });

  return (
    <div
      ref={selectWrapperRef}
      className={cn('nop-select-wrapper', props.meta.className)}
      data-slot="select-wrapper"
    >
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
            />
          ) : (
            <StaticComboboxList
              renderGroups={useGroups}
              groups={visibleGroups}
              flatOptions={visibleOptions}
            />
          )}
        </ComboboxContent>
      </Combobox>
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
    <Label className={cn('nop-checkbox-wrapper', props.meta.className)} data-slot="checkbox-wrapper">
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
      className={cn('nop-switch-wrapper', props.meta.className)}
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

