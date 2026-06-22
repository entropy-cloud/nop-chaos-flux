import type { ReactNode } from 'react';
import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner,
  cn,
  t,
} from '@nop-chaos/ui';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import type { OptionTemplateRenderer, ChoiceOption } from './input-choice-renderers.js';
import type { SelectOptionGroup } from '../schemas.js';
import { getChoiceOptionKey } from './input-choice-renderers.js';

export function isMobileOptionSelected(
  option: ChoiceOption,
  value: unknown,
  multiple: boolean,
): boolean {
  if (multiple) {
    const arr = Array.isArray(value) ? value : [];
    return arr.some((candidate) => Object.is(candidate, option.value));
  }
  return Object.is(value, option.value);
}

export function renderMobileOptionRow(
  option: ChoiceOption,
  index: number,
  ctx: {
    multiple: boolean;
    selected: boolean;
    renderOptionTemplate?: OptionTemplateRenderer;
    onSelect: (option: ChoiceOption) => void;
  },
) {
  let content: ReactNode = option.label;
  if (ctx.renderOptionTemplate) {
    try {
      const custom = ctx.renderOptionTemplate(option, index);
      if (custom !== undefined && custom !== null && custom !== false) {
        content = custom;
      }
    } catch (error) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(
          '[flux-select] mobile optionTemplate region render failed; falling back to option.label',
          error,
        );
      }
    }
  }
  const optionId = `select-mobile-option-${getChoiceOptionKey(option.value)}`;
  return (
    <button
      key={getChoiceOptionKey(option.value)}
      type="button"
      id={optionId}
      role="option"
      aria-selected={ctx.selected}
      aria-disabled={option.disabled || undefined}
      disabled={option.disabled}
      data-slot="select-mobile-option"
      data-selected={ctx.selected ? 'true' : undefined}
      className="flex min-h-touch items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
      onClick={() => ctx.onSelect(option)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border',
          ctx.selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
        )}
      >
        {ctx.selected ? <CheckIcon className="size-3.5" /> : null}
      </span>
      <span className="flex-1 truncate">{content}</span>
    </button>
  );
}

export interface SelectMobileSheetProps {
  ariaLabel: string;
  triggerPlaceholder?: string;
  searchPlaceholder?: string;
  placeholder?: string;
  mobileTriggerText: string;
  mobileHasSelection: boolean;
  effectiveDisabled: boolean;
  interactive: boolean;
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  searchable: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  useGroups: boolean;
  visibleGroups: SelectOptionGroup[];
  visibleOptions: ChoiceOption[];
  loading: boolean;
  loadingText: string;
  errorMessage?: string;
  noResultsText: string;
  renderOptionTemplate?: OptionTemplateRenderer;
  multiple: boolean;
  value: unknown;
  onToggleOption: (option: ChoiceOption) => void;
  onClear: () => void;
  clearable: boolean;
  controlProps: Record<string, unknown>;
  errorId?: string;
  handlers: {
    onFocus: () => void;
    onBlur: () => void;
  };
}

export function SelectMobileTrigger(props: {
  ariaLabel: string;
  mobileTriggerText: string;
  triggerPlaceholder?: string;
  effectiveDisabled: boolean;
  interactive: boolean;
  sheetOpen: boolean;
  errorId?: string;
  controlProps: Record<string, unknown>;
  handlers: { onFocus: () => void; onBlur: () => void };
  onOpen: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-1">
      <Button
        type="button"
        variant="outline"
        data-slot="select-mobile-trigger"
        className="flex-1 justify-between font-normal"
        disabled={props.effectiveDisabled}
        aria-haspopup="dialog"
        aria-expanded={props.sheetOpen}
        aria-label={props.ariaLabel}
        aria-required={props.controlProps['aria-required'] as boolean | undefined}
        aria-invalid={props.controlProps['aria-invalid'] as boolean | undefined}
        aria-describedby={props.errorId}
        aria-errormessage={props.errorId}
        onFocus={props.handlers.onFocus}
        onBlur={props.handlers.onBlur}
        onClick={() => props.interactive && props.onOpen()}
      >
        <span
          className={cn(
            'truncate',
            props.mobileTriggerText ? undefined : 'text-muted-foreground',
          )}
        >
          {props.mobileTriggerText || props.triggerPlaceholder}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </Button>
      {props.children}
    </div>
  );
}

export function SelectMobileClearButton(props: {
  effectiveDisabled: boolean;
  onClear: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={t('flux.common.clear')}
      data-slot="select-mobile-clear"
      disabled={props.effectiveDisabled}
      onClick={props.onClear}
    >
      <XIcon className="size-4" />
    </Button>
  );
}

export function SelectMobileSheet(props: SelectMobileSheetProps) {
  return (
    <Sheet open={props.sheetOpen} onOpenChange={props.setSheetOpen}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="nop-safe-bottom max-h-[80vh] gap-0"
        data-testid="select-mobile-sheet"
      >
        <SheetHeader className="nop-hairline nop-hairline--bottom">
          <SheetTitle className="truncate">{props.ariaLabel}</SheetTitle>
          {props.searchable ? (
            <Input
              value={props.inputValue}
              onChange={(event) =>
                props.setInputValue((event.target as HTMLInputElement).value)
              }
              placeholder={props.searchPlaceholder ?? props.placeholder}
              className="mt-2"
              aria-label={t('flux.common.search')}
              data-slot="select-mobile-search"
            />
          ) : null}
        </SheetHeader>
        <div
          className="flex max-h-[55vh] flex-col overflow-y-auto p-2"
          data-slot="select-mobile-options"
        >
          {props.loading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Spinner className="size-4" aria-hidden="true" />
              <span>{props.loadingText}</span>
            </div>
          ) : props.errorMessage ? (
            <div role="alert" className="p-3 text-sm text-destructive">
              {props.errorMessage}
            </div>
          ) : props.useGroups ? (
            props.visibleGroups.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">{props.noResultsText}</div>
            ) : (
              props.visibleGroups.map((group) => (
                <div key={group.label} data-slot="select-mobile-group">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </div>
                  {group.options.map((option, index) =>
                    renderMobileOptionRow(option, index, {
                      multiple: props.multiple,
                      selected: isMobileOptionSelected(option, props.value, props.multiple),
                      renderOptionTemplate: props.renderOptionTemplate,
                      onSelect: props.onToggleOption,
                    }),
                  )}
                </div>
              ))
            )
          ) : props.visibleOptions.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">{props.noResultsText}</div>
          ) : (
            props.visibleOptions.map((option, index) =>
              renderMobileOptionRow(option, index, {
                multiple: props.multiple,
                selected: isMobileOptionSelected(option, props.value, props.multiple),
                renderOptionTemplate: props.renderOptionTemplate,
                onSelect: props.onToggleOption,
              }),
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SelectMobile(props: SelectMobileSheetProps) {
  const clearVisible =
    props.clearable && props.mobileHasSelection && !props.effectiveDisabled;
  return (
    <>
      <SelectMobileTrigger
        ariaLabel={props.ariaLabel}
        mobileTriggerText={props.mobileTriggerText}
        triggerPlaceholder={props.triggerPlaceholder}
        effectiveDisabled={props.effectiveDisabled}
        interactive={props.interactive}
        sheetOpen={props.sheetOpen}
        errorId={props.errorId}
        controlProps={props.controlProps}
        handlers={props.handlers}
        onOpen={() => props.setSheetOpen(true)}
      >
        {clearVisible ? (
          <SelectMobileClearButton
            effectiveDisabled={props.effectiveDisabled}
            onClear={props.onClear}
          />
        ) : null}
      </SelectMobileTrigger>
      <SelectMobileSheet {...props} />
    </>
  );
}
